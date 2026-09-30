# Web / 云端版本

原来的 Vite + FastAPI 开发方式继续保留，见 README。生产容器由 FastAPI 同时提供前端静态文件和 `/api`，数据库使用持久卷。

## 启动

需要运行中的 Docker Engine 和 Docker Compose。在项目根目录执行：

```sh
docker compose build
docker compose run --rm training python -m app.cli init-admin --username admin
docker compose up -d
```

初始化命令交互输入管理员密码。访问 `http://localhost:8080`。默认端口只绑定服务器回环地址；公网访问需要配置反向代理。

## HTTPS 部署

将 `deploy/cloud.env.example` 复制为项目根目录 `.env`，替换域名，设置 `COOKIE_SECURE=true`，由 HTTPS 反向代理转发到 `127.0.0.1:8080`，然后执行 `docker compose up -d`。可信来源必须与浏览器实际访问地址完全一致。

数据库位于容器 `/data/training.db`，由 `training-data` 持久卷保存。备份前停止服务，备份整个卷；不要使用 `docker compose down -v`，该命令会删除业务数据卷。

桌面与云端共用业务代码，数据库相互独立，本版本不提供双向同步。

本次已验证 Compose 配置、静态托管及 Web 回归。当前机器的 Docker Engine 未运行，尚未实际构建/启动镜像，也没有部署公网服务。
