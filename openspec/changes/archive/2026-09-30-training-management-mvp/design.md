# Design

## Context
本地原目录为空，无应用和测试；远端暂不可访问，不能假设远端同样为空。需求和动机见 proposal.md。技术栈遵循用户图片。

## Goals / Non-Goals
**Goals:** 建立可本地运行、可验证权限、SQLite 持久化的前后端应用；每阶段完成相应测试后进入下一阶段。
**Non-Goals:** 首版不设计多租户、分布式部署、选课关系或复杂权限配置。

## Decisions
1. 使用 frontend/ 与 backend/ 单仓目录。Vue 3 + TypeScript + Element Plus 负责中文界面；Pinia 保存当前用户，Router 控制页面导航，Axios 封装接口。相较多仓，单仓更便于联调和规格同步。
2. FastAPI 按 auth、courses、students、users 划分路由，SQLAlchemy 管理请求级数据库会话，Pydantic 验证输入和输出。授权依赖从数据库读取当前角色，不能只隐藏前端按钮。
3. 使用服务端不透明会话：高熵随机令牌仅在 HttpOnly、SameSite=Lax Cookie 传输，数据库保存令牌哈希、user_id、expires_at；默认 8 小时过期。相比纯 JWT，可立即撤销退出或重置密码后的会话。生产启用 Secure Cookie，写请求核验允许的 Origin，开发通过 Vite 代理实现同源 /api。密码使用 Argon2 哈希。
4. 数据表：users(id, username 唯一, password_hash, role, created_at)、courses(id, code 唯一, name, instructor, hours, description, created_at)、students(id, student_no 唯一, name, phone, notes, created_at)、sessions(id, token_hash 唯一, user_id 外键, expires_at)。学员档案独立于账号；首版无课程学员关联。
5. REST 路由统一前缀 /api；auth/login、auth/logout、auth/me；三类资源均提供 GET 列表、GET /{id}、POST、PATCH /{id}、DELETE /{id}。重置密码使用 POST /users/{id}/password。列表使用 q、page、page_size，按 id 稳定排序。创建 201、删除 204、认证 401、越权 403、不存在 404、唯一性或保护冲突 409、校验 422。
6. 最小字段是提案默认值：编号/学号 1–32、名称/姓名/用户名 1–100、讲师最多 100、电话最多 32、描述/备注最多 2000 字符；字符串去除首尾空白。数据库唯一约束处理并发冲突；管理员保护检查与写入使用串行写事务。
7. 页面为登录、课程、学员和仅管理员可见的用户管理；列表提供搜索分页，弹窗提供新增编辑，删除二次确认；统一处理加载、空结果、校验错误和会话过期。
8. 用临时 SQLite 数据库测试真实 HTTP 权限和持久化；前端执行类型检查、构建和双角色浏览器验收。相较只测内部函数，这能直接验证规格中的外部行为。

## Risks / Trade-offs
- SQLite 并发写入有限 → 适用于本地或小规模单实例，后续再评估数据库迁移。
- 本地与远端可能存在不同历史 → 恢复访问后先 fetch 和比较，再整合；不强制推送。
- 图片未指定字段和业务关联 → 最小字段见本设计，新增报名等功能另建 change。
- 删除为物理删除 → 界面确认，部署前提供备份说明；后续如需审计另行定义。

## Migration Plan
先建立工程及依赖锁定，再实现认证、课程、学员、用户管理，最后联调。首版在空数据库创建表，通过显式 CLI 输入创建首个管理员，不提交数据库、凭据或会话。已有数据时不得自动重建表。每阶段记录验证结果，全部验收后才归档 OpenSpec；后续升级先备份 SQLite，失败时恢复配套代码和数据库备份。
