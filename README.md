# training 培训管理系统

基于 OpenSpec 开发的培训管理系统。支持课程、学员、用户增删改查，管理员拥有全部功能，普通用户只能查看课程和学员。

## 技术栈

- 前端：Vite、Vue 3、TypeScript、Element Plus、Axios、Pinia、Vue Router。
- 后端：Python、FastAPI、SQLAlchemy、SQLite；RESTful API。
- 认证：Argon2 密码哈希、HttpOnly Cookie、服务端会话、实时角色授权。

## 快速开始

要求 Node.js 22.12+、Python 3.11+。从项目根目录打开两个 PowerShell 终端。

终端一：

```powershell
cd backend
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
./.venv/Scripts/python.exe -m app.cli init-admin --username admin
./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

初始化会提示输入密码；没有固定默认密码。若已有账号，不必再次初始化；该命令不会覆盖现有用户。当前开发工作区的初始管理员凭据保存在被 Git 忽略的 `backend/data/local-admin.txt`。

终端二：

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

已有 `.env` 时跳过复制。后续启动只需运行两端最后一条启动命令。无需激活虚拟环境。

- 应用：http://127.0.0.1:5173
- API 文档：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/api/health

SQLite 默认位于 `backend/data/training.db`。数据库、凭据、依赖目录和构建产物均不提交 Git。

## 功能

| 模块 | 管理员 | 普通用户 |
| --- | --- | --- |
| 课程 | 新增、搜索分页、详情、编辑、删除 | 搜索分页、详情 |
| 学员 | 新增、搜索分页、详情、编辑、删除 | 搜索分页、详情 |
| 用户 | 新增、搜索分页、详情、编辑、删除、重置密码 | 无访问权限 |

最后一个管理员不能被删除或降级，当前登录账号不能删除自己。重置密码和删除账号会撤销相关会话。学员档案独立于登录账号。

## 验证

```powershell
# backend/
./.venv/Scripts/python.exe -m pytest -q
# frontend/
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试使用独立的 8010/5174 端口与临时数据库。前端依赖由 package-lock.json 锁定，后端依赖由 requirements.txt 锁定。TypeScript 固定为 5.9.3，与当前 vue-tsc 配套。

## 文档

- [接口、字段、权限及错误约定](docs/api.md)
- [初始化、配置、备份恢复与部署说明](docs/operations.md)
- [第一阶段验收记录](docs/verification-stage-1.md)
- [完整验收记录](docs/verification-mvp.md)
- [OpenSpec 主规格](openspec/specs)
- [OpenSpec 变更与归档](openspec/changes)

采用 proposal → specs/design/tasks → apply → 验收 → archive 的开发流程。后续功能另建 OpenSpec change。

## GitHub

公开仓库：https://github.com/guangfubill-crypto/trainingmanagement

首版面向本地或小规模单实例使用。生产部署需要 HTTPS、正确的可信来源配置及 /api 反向代理；本仓库不包含自动公网部署。
