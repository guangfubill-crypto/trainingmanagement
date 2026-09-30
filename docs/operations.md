# 启动、备份与恢复

## 首次启动

从项目根目录打开两个 PowerShell 终端。要求 Python 3.11+、Node.js 22.12+。

终端一：

```powershell
cd backend
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
./.venv/Scripts/python.exe -m app.cli init-admin --username admin
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

初始化会提示输入两次密码；不存在默认密码。数据库已有任何用户时初始化拒绝执行，不会覆盖。若此工作区已由开发过程创建本地管理员，凭据保存在被 Git 忽略的 backend/data/local-admin.txt，无需再次初始化。

终端二：

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

打开 http://127.0.0.1:5173。后端文档位于 http://127.0.0.1:8000/docs。首次安装后，再次启动只需最后一条服务启动命令；已有 .env 时跳过 Copy-Item。Ctrl+C 可停止各自服务。

## 配置

后端读取 backend/.env；数据库相对路径相对于 backend/，不随启动目录变化。

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| DATABASE_URL | sqlite:///./data/training.db | SQLite 文件 |
| ALLOWED_ORIGINS | 两种本地主机的 5173 和 8000 地址 | JSON 数组；必须为精确可信来源 |
| COOKIE_SECURE | false | 本地 HTTP 使用 false，HTTPS 设置 true |
| SESSION_SECONDS | 28800 | 会话有效秒数 |
| APP_NAME | training | 健康响应中的服务名 |

前端 .env 中 API_PROXY_TARGET 指向后端地址。Vite 仅开发时代理 /api；生产需由反向代理将 /api 转发给 FastAPI，并托管 dist/，非 API 路由回退到 index.html。生产需 HTTPS 及对应 ALLOWED_ORIGINS。本项目未自动部署到公网。

## 一致性备份

在 backend/ 执行：

```powershell
./.venv/Scripts/python.exe -m app.cli backup --output ./data/backups/training-backup.db
```

使用 SQLite backup API，可在服务运行时生成一致备份。目标必须是新文件；后续备份请改用带日期的不同文件名。备份包含账号哈希、业务数据和会话，按数据库同等权限保存，不提交 Git。

## 恢复与升级回滚

1. 在后端终端 Ctrl+C 停止服务。
2. 先为当前数据库再生成一个不同文件名的备份。
3. 确认目标与 .env 中 DATABASE_URL 一致，再恢复备份：

```powershell
# 在 backend/ 中；请替换成实际备份文件
Copy-Item -LiteralPath ./data/backups/training-backup.db -Destination ./data/training.db -Force
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

4. 登录并检查课程、学员、用户数据。恢复会使备份时的会话状态一并恢复；需要注销会话时由管理员重置相关账号密码。
5. 升级前保存代码版本与数据库备份；升级失败时恢复配套代码和数据库。首版 create_all 仅创建缺失表，不清空既有表，也不承担未来结构迁移。

测试在独立数据库执行了备份、恢复、PRAGMA integrity_check 和数据核对。不要在仍运行的后端上直接覆盖数据库文件。

## 检查与测试

```powershell
# backend/
./.venv/Scripts/python.exe -m pytest -q
./.venv/Scripts/python.exe -m pip check
# frontend/
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试自行启动 8010/5174 两个测试服务并使用临时数据库，不接触开发数据库；执行前确保这两个端口空闲。测试账号仅存在于临时数据库。
