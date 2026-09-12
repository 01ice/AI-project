# 栈桥部署手册

目标：把本地跑通的这套应用部署到腾讯云 2 核 2G 的北京服务器上，通过 `http://服务器IP:8080` 访问。
域名与备案留到之后再做，届时换成 80/443 与 HTTPS。

## 0. 服务器系统

在控制台重装系统，选择 **使用容器镜像 → Ubuntu 24.04 LTS + Docker 29**。

- 「容器配置」这一步**留空**，不要在控制台里预先创建容器，我们统一用 docker compose 管理
- 重装会清空磁盘；包月实例的公网 IP 通常保留，重装后确认一下 IP 有没有变
- 记下 SSH 登录方式（root 密码或密钥）

## 1. 基础准备（登录服务器后执行）

```bash
# 2. 添加 2GB swap，避免 2G 内存下 OOM
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 确认 Docker 与 compose 都在
docker --version
docker compose version
```

腾讯云控制台的安全组需要放行：`22`（SSH）、`8080`（对外访问）。

## 2. 上传代码

在**本地**项目目录执行（会排除 `node_modules`、`.data`、`.env` 等）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-for-server.ps1 -ServerHost 你的服务器IP
```

如果服务器用非 root 用户登录，加上 `-User ubuntu -Port 22`。

## 3. 配置环境变量

在服务器上：

```bash
cd /opt/zhanqiao
cp .env.production.example .env
vi .env
```

至少要改这几项：

| 变量 | 说明 |
| --- | --- |
| `POSTGRES_PASSWORD` | 数据库密码，建议 16 位以上**字母数字**组合（含 `@ : / ?` 等字符会破坏连接串解析） |
| `NUXT_PUBLIC_SITE_URL` | `http://服务器公网IP:8080` |
| `NUXT_SMTP_USER` / `NUXT_SMTP_PASS` | QQ 邮箱与 16 位授权码（不填则邮件只打印在日志里） |
| `NUXT_DEEPSEEK_API_KEY` | 选填，配好后 AI 审核与文章摘要才能用 |

## 4. 启动

```bash
docker compose up -d --build
docker compose logs -f app
```

首次启动会自动执行数据库迁移（`NUXT_AUTO_MIGRATE=1`）并同步 `content/posts` 里的文章。
看到 `Listening on http://[::]:3000` 就成功了。

## 5. 验证

```bash
curl -I http://127.0.0.1:8080          # 服务器本机
```

然后在浏览器打开 `http://服务器IP:8080`，走一遍：注册（收验证码）→ 发布项目 → 后台审核。

把第一个账号设为管理员：

```bash
docker compose exec db psql -U zhanqiao -d zhanqiao \
  -c "update users set role='admin', email_verified_at=now() where email='你的邮箱';"
```

## 6. 日常运维

```bash
docker compose ps                    # 查看状态
docker compose logs -f app           # 看应用日志
docker compose restart app           # 重启应用
docker compose up -d --build         # 更新代码后重新部署

# 备份数据库（建议每天一次，写进 crontab）
docker compose exec -T db pg_dump -U zhanqiao zhanqiao | gzip > ~/backup-$(date +%F).sql.gz
```

> ⚠️ 不要执行 `docker compose down -v`：`-v` 会删除数据卷，数据库和上传的图片都会没。

更新代码的流程：本地改完提交 → 重新跑打包脚本 → 服务器上 `docker compose up -d --build`。

打包脚本在解压前会先删除由仓库管理的目录（`app`、`server`、`shared`、`content`、`public`、
`drizzle`、`deploy`、`scripts`），这样本地删掉的文件不会残留在服务器上。
`.env` 与 Docker 数据卷（数据库、上传图片）不在这些目录里，不会被影响。

## 7. 后续：域名与 HTTPS

1. 买域名（`.com` / `.cn` 等能备案的后缀），解析到服务器 IP
2. 提交 ICP 备案（1～4 周），期间继续用 `IP:8080` 访问
3. 备案通过后，把 `docker-compose.yml` 的端口改成 `80:3000`（或加一层 Nginx / Caddy 反代）
4. `NUXT_PUBLIC_SITE_URL` 改成 `https://你的域名`，配置证书

## 8. 图片存储切到 COS

服务器带宽只有 4Mbps，图片继续走服务器会很快吃满，代码里已经接好了 COS：

1. 腾讯云控制台 → 对象存储 → 创建存储桶：地域选**北京**（与服务器同地域），权限「公有读私有写」
2. 访问管理 → API 密钥管理 → 新建**子账号**密钥，只授予这个桶的读写权限（不要用主账号密钥）
3. 编辑 `/opt/zhanqiao/.env` 填入：

```bash
NUXT_COS_SECRET_ID=子账号 SecretId
NUXT_COS_SECRET_KEY=子账号 SecretKey
NUXT_COS_BUCKET=桶名-APPID        # 例如 zhanqiao-1250000000
NUXT_COS_REGION=ap-beijing
# NUXT_COS_PUBLIC_BASE_URL=      # 绑定 CDN 或自定义域名后再填
```

4. `sudo docker compose up -d app` 重启即生效，之后上传的图片 URL 会变成
   `https://桶名.cos.ap-beijing.myqcloud.com/uploads/...`

已经上传的历史图片仍在本机数据卷里（URL 形如 `/uploads/...`），可以正常显示；
需要迁移时把数据卷里的文件手动传到 COS 的 `uploads/` 前缀下即可。
如果 COS 配置有误，上传会自动退回本地磁盘并在日志里写明原因，站点不会不可用。

### 关于「公有读私有写」的计费提示

控制台在这个选项上会提示可能产生额外费用，说的是**外网下行流量费**，不是开放权限本身收费：

- 不开公有读：图片只能由你的服务器中转，等于每张图都消耗那 4Mbps 带宽，还会拖慢页面
- 开了公有读：图片由 COS 直出，按实际下行流量计费（小站通常每月几元，在你的预算内）

建议同时做两件事控制成本：

1. **开启防盗链**：存储桶 → 安全管理 → 防盗链设置，只允许你的站点地址访问，避免别人直接引用你的图片
2. **列表页用缩略图**：COS 支持图片处理参数，例如把 URL 拼上 `?imageMogr2/thumbnail/480x`，
   列表页加载的图能小一个数量级（后续可加，需要时告诉我）

如果暂时不想产生任何流量费，也可以不配 COS——继续用本机存储，代价是图片占用服务器带宽。

## 9. 常见问题

| 现象 | 排查 |
| --- | --- |
| 浏览器打不开 | 安全组是否放行 8080；`docker compose ps` 看 app 是否 running |
| 页面 502 / 空白 | `docker compose logs app` 看启动报错，多半是 `.env` 里连接串或密码不对 |
| 收不到验证码邮件 | `.env` 里 SMTP 授权码是否填对；`docker compose logs app` 会打印发送失败原因 |
| 数据库连接失败 | `docker compose logs db`；确认 healthcheck 通过后再启动 app |
| 内存吃紧 | `free -h` 看 swap 是否生效；`docker stats` 看哪个容器占用高 |
