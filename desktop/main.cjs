const { app, BrowserWindow, dialog, session } = require('electron');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { join } = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

app.setName('TrainingManagement');
app.setPath('userData', process.env.TRAINING_DESKTOP_DATA_DIR || join(app.getPath('appData'), 'TrainingManagement'));
let win, child, quitting = false, stopping = false;
const launchKey = randomBytes(32).toString('hex');
let origin = '';
const dataDir = app.getPath('userData');
fs.mkdirSync(dataDir, { recursive: true });
const log = fs.createWriteStream(join(dataDir, 'desktop.log'), { flags: 'a' });

function checkHealth() {
  return new Promise(resolve => {
    const req = http.get(origin + '/api/health', { headers: { 'X-Desktop-Key': launchKey }, timeout: 1000 }, res => {
      res.resume(); resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
async function start() {
  const resourceRoot = app.isPackaged ? process.resourcesPath : join(__dirname, '..');
  const exe = app.isPackaged ? join(resourceRoot, 'backend', 'training-server.exe') : join(resourceRoot, 'build', 'backend', 'training-server', 'training-server.exe');
  const web = app.isPackaged ? join(resourceRoot, 'web') : join(resourceRoot, 'frontend', 'dist');
  child = spawn(exe, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: {
    ...process.env, TRAINING_DATA_DIR: join(dataDir, 'data'), TRAINING_STATIC_DIR: web,
    DESKTOP_KEY: launchKey, PYTHONUTF8: '1',
  }});
  child.stderr.pipe(log, { end: false });
  child.on('exit', (code) => {
    if (!quitting && !stopping) {
      dialog.showErrorBox('服务已停止', '本地服务意外退出，请重新启动。错误记录：' + join(dataDir, 'desktop.log'));
      app.quit();
    }
  });
  const port = await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('本地服务启动超时')), 20000);
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('本地服务启动失败')); });
    child.stdout.on('data', chunk => {
      text += chunk.toString();
      const end = text.indexOf('\n');
      if (end !== -1) {
        try { const result = JSON.parse(text.slice(0, end)); if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65535) throw Error('Invalid port'); clearTimeout(timer); resolve(result.port); }
        catch(e) { clearTimeout(timer); reject(e); }
      }
    });
  });
  origin = 'http://127.0.0.1:' + port;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (await checkHealth()) { ready = true; break; }
    await new Promise(r => setTimeout(r, 150));
  }
  if (!ready) throw new Error('本地数据库服务未能就绪');
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (new URL(details.url).origin === origin) details.requestHeaders['X-Desktop-Key'] = launchKey;
    callback({ requestHeaders: details.requestHeaders });
  });
  session.defaultSession.setPermissionRequestHandler((_w, _permission, callback) => callback(false));
  win = new BrowserWindow({ width: 1280, height: 850, minWidth: 760, minHeight: 600, show: false,
    title: '培训管理系统', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  win.once('ready-to-show', () => win.show());
  await win.loadURL(origin);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if (quitting || !child || child.exitCode !== null) return;
    event.preventDefault();
    if (stopping) return;
    stopping = true;
    child.stdin.end();
    const timer = setTimeout(() => child.kill(), 4000);
    child.once('exit', () => { clearTimeout(timer); quitting = true; app.quit(); });
  });
  app.whenReady().then(start).catch(error => {
    log.write(String(error) + '\n');
    dialog.showErrorBox('无法启动培训管理系统', '请确认安装完整。' + error.message + '\n日志：' + join(dataDir, 'desktop.log'));
    app.quit();
  });
}
