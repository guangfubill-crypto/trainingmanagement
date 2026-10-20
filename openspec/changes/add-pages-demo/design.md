# Design
Vite demo 构建模式固定 VITE_DEMO_MODE=true，Axios 使用按需导入的本地 adapter；正式构建固定关闭演示并保留 HTTP adapter。两者共用页面及数据契约。演示选择角色时建立当前标签页会话，业务数据按部署路径隔离保存在 localStorage。新增、修改、删除后写入，失败时不提交状态。可以快速体验两种角色，不存储密码；用户管理只演示账号与角色编辑，隐藏初始密码和重置密码控件，正式版本保留全部密码管理能力。

演示使用 createWebHashHistory(BASE_URL)，Pages 构建 base 为 /trainingmanagement/，避免深链接刷新404。普通 Web/桌面继续 history 路由和后端。GitHub Actions 只上传演示 dist，不上传源码、数据库或认证信息。

验收覆盖管理员 CRUD、唯一性、刷新持久化、只读角色、会话退出、恢复种子数据、子路径深链接刷新以及无 /api 请求。分别构建正式版与演示版，确认正式包不包含模拟 adapter。
