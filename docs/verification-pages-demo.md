# GitHub Pages 演示验收

日期：2026-10-20。

## 已完成
- `npm ci --no-audit --no-fund`：133 个依赖安装成功，锁文件未改变。
- `npm run build:demo`：TypeScript 检查及演示构建通过。
- 设置本机 `BROWSER_EXECUTABLE` 后 `npm run test:demo`：4 组真实浏览器验收全部通过，覆盖课程增改查删、取消删除、重复编号、刷新保存、重置、学员新增、用户新增、最后管理员保护、普通用户只读、受限路由、退出、深链接刷新、分页及390px手机布局。检查未出现脚本错误或真实 `/api` 请求。
- `npm run build`：正式构建通过；检查产物不含演示 adapter 或虚构数据种子。
- 正式后端 `python -m pytest -q`：27项通过（既有依赖的2条弃用警告）。
- 正式前端 `npm run test:e2e`：6组通过，包含真实后端登录、密码重置、权限及会话失效回归。
- `openspec validate --all --strict --no-interactive`：7项通过，包括新增变更和6个既有规格。
- GitHub Pages 配置已创建，使用 GitHub Actions 构建源。

## 修复记录
- 初次本地浏览器验收发现 preview 默认使用正式模式的根路径，与演示子路径不符，导致资源404；已将预览命令固定为 `--mode demo`，重新验收通过。
- 角色选择输入被 Element Plus 占位层覆盖，测试改用标准键盘操作；分页使用组件自身的下一页控件。未强制点击遮挡层。

演示是浏览器本地模拟，不验证真实服务端认证或多人同步；这些由正式后端测试覆盖。发布状态与入口需等待 Actions 部署完成后确认。
