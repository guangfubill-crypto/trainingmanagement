# Design
## Context
当前代码已有完整 CRUD、角色授权、Cookie 会话和 SQLite。main.py 尚未托管生产静态资源，首个管理员通过 cli.init_admin 创建。复用这些实现，新增桌面与容器入口。
## Goals / Non-Goals
Goals: Windows 10/11 x64 离线桌面安装、独立数据、保留服务器部署。
Non-Goals: macOS/Linux 桌面、云端自动同步、自动更新、远程服务器开通。
## Decisions
- Electron 打包 Chromium，避免依赖用户另装 WebView2；代价是安装包较大。窗口禁用 Node 集成、启用 sandbox/contextIsolation，阻止外部导航与新窗口。
- PyInstaller onedir 打包 Python/FastAPI，Electron 将其作为受控子进程。Python 绑定 127.0.0.1 的系统分配端口并发送 ready 端口；Electron 健康检查成功才展示页面。
- 主进程生成一次性高熵密钥，通过子进程环境传入；Electron 仅向精确本地源注入请求头，后端 desktop 模式对所有请求校验密钥。桌面凭证不进入 URL、前端脚本或日志。
- Desktop 入口在导入 app 之前设置数据库为 Electron userData/data/training.db、可信来源为实际回环端口、静态目录为打包资源。开发/Web 默认配置不变。
- GET /api/runtime 返回模式及是否需要桌面配置；POST /api/setup 仅桌面可用，使用现有输入校验、哈希与 BEGIN IMMEDIATE 事务检查用户为空。
- Electron 单实例锁；主窗口关闭时停止后端，后端监测父进程管道结束，异常退出也不会永久遗留服务。
- Windows NSIS 按用户安装，生成桌面快捷方式，卸载不删除 userData。另交付 zip 免安装目录包。
- 新增可选 STATIC_DIR 为 FastAPI 提供同源静态托管；明确保留 /api 未命中 404，使用解析后路径边界检查防止目录穿越。
- Docker 多阶段编译前端并复制到 Python 运行镜像；数据库挂载 /data，CLI 初始化保持显式操作。现有 Web 源码和开发方式不删除。
## Risks / Trade-offs
- 未提供签名证书 → 交付未签名安装包并说明 Windows 可能显示未知发布者。
- 共享业务升级可能改变表结构 → 本次不修改业务表，后续迁移先备份。
- 桌面启动依赖打包资源齐全 → 对冻结后的后端与实际 Electron 包做启动、初始化、重启及退出检查。
## Migration Plan
新增入口不移动现有 Web 数据。桌面首次运行创建自己的空数据库；容器使用单独持久卷。发布前运行原有回归测试、桌面测试与构建检查；安装包留在 release/，源码推送 GitHub。
