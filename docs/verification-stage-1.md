# 第一阶段验收记录

日期：2026-09-30。变更：training-management-mvp。范围：任务 1.1–1.4。

## 实现

- frontend/：Vue 3、TypeScript、Element Plus、Axios、Pinia、Vue Router 和 Vite；中文概览页显示实际服务连接状态，支持重新检查及窄屏布局。
- backend/：FastAPI、SQLAlchemy、SQLite、环境配置；健康接口执行 SELECT 1 检查数据库连接。
- 提供锁定依赖、环境示例、Git 忽略规则和 README 启动说明。
- 课程、学员、用户模块显示为待开发；未实现认证或业务 CRUD。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| npm run build（包含 vue-tsc --noEmit） | 通过；生成生产构建 |
| Python 虚拟环境 pip check | 通过，无依赖冲突 |
| 独立进程运行 uvicorn 与 npm run dev | 两端启动成功，端口 8000 / 5173 |
| GET http://127.0.0.1:8000/api/health | 200；status=ok、database=ok、service=training |
| GET http://127.0.0.1:5173/api/health | 200；同一响应，开发代理正常 |
| 浏览器实际页面 | 标题与模块显示正常，服务连接显示“连接正常” |
| 点击“重新检查” | 经过加载状态后回到连接正常，检查时间更新 |
| 1440×1000 桌面与 390×844 窄屏 | 已查看截图，布局正常；窄屏 scrollWidth=390，无水平溢出 |
| git check-ignore | .env、SQLite 数据目录、虚拟环境、node_modules 和 dist 被忽略 |
| git ls-remote origin | 公开仓库可访问，无远端提交 |

## 兼容性处理

首次安装解析到 TypeScript 7.0.2，与 vue-tsc 3.3.11 的 tsc 入口不兼容。已将 TypeScript 固定为 5.9.3 并重新构建通过；版本记录于 package.json 和 package-lock.json。

当前验证环境：Windows、Node.js 26.4.0、Python 3.11.9。生产部署、登录和业务权限尚不属于本阶段验收范围。Vite 构建产物本身不提供 /api 生产代理。
