# 在线演示

地址：[打开培训管理系统演示](https://guangfubill-crypto.github.io/trainingmanagement/)。

打开后选择“以管理员体验”或“以普通用户体验”，无需注册或输入密码。演示沿用正式系统的页面与字段；管理员可以搜索、分页、查看详情、新增、编辑和删除课程、学员及用户，普通用户只能查看课程和学员。

演示预置 12 门虚构课程、6 位虚构学员和两个角色。修改仅保存到当前浏览器，其他访客不会看到；点击“重置演示数据”并确认可恢复初始状态。可先新增一门课程，刷新确认保存，再退出后以普通用户体验查看只读权限。

演示没有真实身份验证、服务端数据库和多人同步。用户管理只体验账号及角色维护，不展示初始密码和重置密码控件，不保存密码。不要填入真实个人资料。正式 Web 与桌面版继续使用 FastAPI、服务端会话与真实密码管理。

## 本地验证

在 `frontend` 运行：

```sh
npm ci
npm run build:demo
npm run preview -- --mode demo --port 5175
```

打开 `http://127.0.0.1:5175/trainingmanagement/`。演示使用 hash 路由，课程页面地址为 `#/courses`，刷新不会请求静态服务器上的同名目录。

浏览器回归：

```sh
npx playwright install chromium
npm run test:demo
```

有本机 Chromium/Edge 时，可设置 `BROWSER_EXECUTABLE` 指定其可执行文件。测试使用独立浏览器上下文，不读取日常浏览器数据；覆盖 CRUD、唯一性、持久化、角色、管理员保护、重置、子路径、移动端和无真实 API 请求。

## 发布

仓库 Settings → Pages 使用 GitHub Actions。推送 `main` 中前端或 Pages 工作流的变更后，工作流先验证正式构建，再构建与验收演示，全部成功才发布 `frontend/dist`。也可手动运行 `Publish online demo`。

`npm run build` 保持正式版本，`npm run build:demo` 才开启模拟 API。构建模式在 Vite 中固定，演示数据不会作为正式后端的数据或身份验证实现。
