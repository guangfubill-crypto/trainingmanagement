# Windows 桌面版

适用 Windows 10/11 x64。运行时无需安装 Python、Node.js，安装后可离线使用。

## 安装使用

1. 运行 `TrainingManagement-Setup-1.0.0.exe`，按向导选择安装位置。
2. 从桌面或开始菜单打开“培训管理系统”。
3. 首次启动设置管理员用户名和密码，随后登录。没有固定默认密码。

免安装版：完整解压 `TrainingManagement-1.0.0-x64.zip`，运行其中的 `TrainingManagement.exe`，不要单独移动 exe。

当前安装包未购买代码签名证书，Windows 可能显示未知发布者。仅使用可信来源提供的安装文件。

## 数据和备份

默认数据库：`%APPDATA%\TrainingManagement\data\training.db`。日志：`%APPDATA%\TrainingManagement\desktop.log`。

桌面版数据与 Web/云端数据库独立，不自动同步。关闭全部应用窗口后，复制整个 `data` 文件夹到备份位置；恢复时关闭应用，再用备份替换该文件夹。请保留恢复前的副本。

安装目录不存业务数据库。卸载保留用户数据，重新安装后可以继续使用。电脑之间迁移时也可采用上述备份恢复方式。

## 开发者构建

构建机器需要 Node.js 22.12+、Python 3.11+，首次下载依赖需要网络。在项目根目录运行：

```powershell
python -m venv backend/.venv
./desktop/build.ps1
```

安装包和 zip 输出到 `release/`。构建产物不提交 Git。构建完成后，可运行 `node desktop/smoke.cjs` 验证打包程序，测试使用临时数据目录。
