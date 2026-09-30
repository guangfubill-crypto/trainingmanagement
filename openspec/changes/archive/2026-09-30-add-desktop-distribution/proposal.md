# Proposal

## Why
用户需要无需安装开发环境的本地桌面版，同时保留现有云端/Web 使用方式。通过共享业务代码、独立运行入口和持久数据目录提供两种交付方式。

## What Changes
- 新增 Windows x64 桌面窗口、安装包和免安装包，内置前后端运行资源。
- 首次打开桌面版通过页面创建管理员，之后直接登录，退出窗口关闭本地服务。
- 桌面数据独立存储于用户数据目录，升级/卸载默认保留。
- 保留 Web 入口、权限和数据库，补充容器构建及部署说明。
- 本地与云端数据独立，不包含自动同步或已部署云服务器。

## Capabilities
### New Capabilities
- `desktop-distribution`: 本地启动、初始化、安装和数据保留。
- `web-distribution`: 生产静态页面托管及持久化容器部署。
### Modified Capabilities
无；已有认证与业务权限保持原契约，桌面首次配置是独立、受本地启动凭证保护的入口。

## Impact
新增 desktop/、打包脚本、桌面后端入口和首次配置页面；复用现有 Vue/FastAPI 业务。安装工具使用 Electron、electron-builder NSIS、PyInstaller。首版目标 Windows 10/11 x64；未配置代码签名证书时交付未签名安装包并说明。
