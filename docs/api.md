# REST API 与权限

所有路径以 /api 为前缀。交互文档在 http://127.0.0.1:8000/docs。

## 认证

| 方法与路径 | 输入 | 成功结果 |
| --- | --- | --- |
| POST /auth/login | username、password | 200，当前用户；设置 HttpOnly 会话 Cookie |
| GET /auth/me | 无 | 200，当前用户 |
| POST /auth/logout | 无 | 204，撤销当前会话并清除 Cookie |

用户响应仅含 id、username、role、created_at，不含密码及哈希。错误用户名与错误密码统一返回 401。默认会话有效期 8 小时，退出、密码重置和账号删除立即撤销相应会话；角色变更在下一次请求生效。

所有写请求必须携带匹配 ALLOWED_ORIGINS 的 Origin 头，包括登录和退出。浏览器同源请求自动发送；CLI/API 客户端需显式设置。非法或缺失来源返回 403。Cookie 为 HttpOnly、SameSite=Lax；HTTPS 部署设置 COOKIE_SECURE=true。

## 资源与字段

| 资源 | 字段 | 约束 |
| --- | --- | --- |
| courses | code、name、instructor、hours、description | 编号唯一且 1–32 字符；名称、讲师 1–100；课时为 1–2147483647 整数；描述可空、最多 2000 |
| students | student_no、name、phone、notes | 学号唯一且 1–32；姓名 1–100；电话可空、最多 32；备注可空、最多 2000 |
| users | username、role、password | 用户名唯一且 1–100；角色 admin/user；创建密码 8–256 字符 |

字符串去除首尾空白，密码保留原样。字段不接受 null、未知字段被拒绝。学员与登录用户独立，新增学员不会产生账号；电话不要求唯一。所有资源包含 id 和 UTC created_at。

## CRUD 契约

以下约定适用于 courses、students、users：

| 方法与路径 | 成功结果 |
| --- | --- |
| GET /{resource}?q=&page=1&page_size=10 | 200，items、total、page、page_size |
| GET /{resource}/{id} | 200，资源详情 |
| POST /{resource} | 201，新增后的完整资源 |
| PATCH /{resource}/{id} | 200，更新后的完整资源 |
| DELETE /{resource}/{id} | 204，无响应体 |

按 id 升序排列；page >= 1，page_size 范围 1–100。课程按编号或名称、学员按学号或姓名、用户按用户名进行包含搜索。q 最多 100 字符，百分号和下划线按字面值处理。没有匹配时 items=[]、total=0；超出末页返回空 items，保留真实 total。

用户 PATCH 只接受 username、role。重置密码使用 POST /users/{id}/password，输入 password，成功 204，同时注销该用户所有会话。

## 权限与错误

| 操作 | 管理员 | 普通用户 | 未登录 |
| --- | --- | --- | --- |
| 课程、学员列表与详情 | 允许 | 允许 | 401 |
| 课程、学员新增修改删除 | 允许 | 403 | 401 |
| 用户管理任意接口 | 允许 | 403 | 401 |

管理员不能删除自己，不能删除或降级最后一个管理员（409）。检查与写入在同一个串行写事务中执行。界面隐藏普通用户写操作入口，服务端独立校验权限。

- 401：无效会话或错误登录凭据。
- 403：角色不允许或写请求来源不允许。
- 404：记录不存在。
- 409：唯一编号/用户名冲突，或管理员保护。
- 422：字段、类型、长度或分页参数不合法。校验响应不会回显密码输入。
- 503：健康检查无法连接数据库。

## PowerShell 请求示例

在交互终端输入凭据，避免将实际密码写进脚本：

```powershell
$trainingCredential = Get-Credential
$trainingHeaders = @{ Origin = 'http://127.0.0.1:5173' }
$trainingBody = @{
  username = $trainingCredential.UserName
  password = $trainingCredential.GetNetworkCredential().Password
} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8000/api/auth/login -Method Post -ContentType 'application/json' -Headers $trainingHeaders -Body $trainingBody -SessionVariable trainingSession
Invoke-RestMethod http://127.0.0.1:8000/api/courses -WebSession $trainingSession
Invoke-RestMethod http://127.0.0.1:8000/api/auth/logout -Method Post -Headers $trainingHeaders -WebSession $trainingSession
Remove-Variable trainingBody,trainingCredential
```
