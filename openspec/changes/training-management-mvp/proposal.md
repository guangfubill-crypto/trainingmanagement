# Proposal

## Why

建立培训管理系统 training，统一管理课程、学员和系统用户，并通过管理员与普通用户权限隔离避免越权操作。以用户提供的需求图片为依据，采用 OpenSpec 逐阶段实现和验收。

## What Changes

- 实现登录、退出及管理员/普通用户两种角色。
- 管理员可对课程、学员、用户执行增删改查。
- 普通用户只能查看课程与学员，不能新增、修改、删除，也不能访问用户管理。
- 提供中文管理界面、表单校验、列表分页与错误提示。
- 分阶段交付：工程基础 → 认证权限 → 课程 → 学员 → 用户管理 → 联调验收。

## Capabilities

### New Capabilities
- `authentication`: 登录、退出和服务端角色授权。
- `courses`: 课程的增删改查与只读访问。
- `students`: 学员的增删改查与只读访问。
- `users`: 管理员维护用户和保护最后一个管理员。

### Modified Capabilities
无；本地为空项目，无已有规格。

## Impact

- 新增 frontend/（Vite、Vue 3、TypeScript、Element Plus、Axios、Pinia、Vue Router）。
- 新增 backend/（Python、FastAPI、SQLAlchemy、SQLite），通过 RESTful API 交互。
- 新增持久化数据库、认证会话、后端权限测试和前端构建检查。
- Git 远端按用户后续决定改为 https://github.com/guangfubill-crypto/trainingmanagement（公开）；已确认远端为空，可推送本次实现。原 xjtulijiagui-max 地址不再作为当前目标。
- 首版不包含报名选课、考勤、考试、收费、文件上传或公开注册；图片未提出这些需求。
