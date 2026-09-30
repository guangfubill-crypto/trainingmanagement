const { _electron: electron, expect } = require('../frontend/node_modules/@playwright/test');
const { mkdtempSync, existsSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawn } = require('node:child_process');
const exe = process.env.TRAINING_SMOKE_EXE || resolve(__dirname, '../release/win-unpacked/TrainingManagement.exe');
const data = process.env.TRAINING_SMOKE_DATA || mkdtempSync(join(tmpdir(), 'training-desktop-check-'));
const env = { ...process.env, TRAINING_DESKTOP_DATA_DIR: data };
delete env.ELECTRON_RUN_AS_NODE;
let application;
async function launch() {
  application = await electron.launch({ executablePath: exe, env, timeout: 45000 });
  const page = await application.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return page;
}
async function login(page) {
  await page.waitForURL(/\/(login|courses)$/);
  if (new URL(page.url()).pathname === '/courses') return;
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill('owner');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('Desktop-test-123');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);
}
(async () => {
  try {
    let page = await launch();
    if (!(existsSync(join(data, 'initialized.marker')))) {
      await expect(page.getByRole('heading', { name: '设置你的工作空间' })).toBeVisible();
      await page.getByRole('textbox', { name: '管理员用户名', exact: true }).fill('owner');
      await page.getByRole('textbox', { name: '管理员密码', exact: true }).fill('Desktop-test-123');
      await page.getByRole('textbox', { name: '确认密码', exact: true }).fill('Desktop-test-123');
      await page.getByRole('button', { name: '创建管理员' }).click();
      await expect(page).toHaveURL(/\/login$/);
      writeFileSync(join(data, 'initialized.marker'), 'test');
    }
    await login(page);
    const base = new URL(page.url()).origin;
    const denied = await fetch(base + '/api/runtime');
    if (denied.status !== 403) throw new Error('External access not rejected');
    expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
    await page.getByRole('button', { name: '＋ 新增课程', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '课程编号', exact: true }).fill('DESKTOP-' + Date.now());
    await dialog.getByRole('textbox', { name: '课程名称', exact: true }).fill('桌面持久化验证');
    await dialog.getByRole('textbox', { name: '讲师', exact: true }).fill('本地讲师');
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('桌面持久化验证').first()).toBeVisible();
    await page.screenshot({ path: resolve(__dirname, '../release/desktop-preview.png'), fullPage: true });
    const second = spawn(exe, [], { env, windowsHide: true });
    await new Promise((ok, fail) => {
      const timer = setTimeout(() => { second.kill(); fail(new Error('Second instance did not exit')); }, 10000);
      second.on('error', fail);
      second.on('exit', code => { clearTimeout(timer); code === 0 ? ok() : fail(new Error('Second launch failed: ' + code)); });
    });
    await expect(page.getByRole('heading', { name: '课程管理', exact: true })).toBeVisible();
    await application.close(); application = null;
    try { await fetch(base + '/api/health'); throw new Error('Backend survived app exit'); }
    catch(e) { if (e.message === 'Backend survived app exit') throw e; }
    page = await launch();
    // Cookies are host-scoped, so an unexpired local session can survive a port change.
    await page.waitForURL(/\/(login|courses)$/);
    await login(page);
    await expect(page.getByText('桌面持久化验证').first()).toBeVisible();
    await application.close(); application = null;
    console.log('PASS: packaged setup, login, CRUD, sandbox, external denial, single-instance, shutdown and restart persistence');
    console.log('Test data: ' + data);
  } finally { if (application) await application.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
