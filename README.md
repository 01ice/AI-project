# 栈桥

面向中文开发者的项目收录与分享社区：注册用户可以发布自己的项目、评论互动，站主同步发布技术博客。

需求与规划见 [spec.md](./spec.md)。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 全栈框架 | Nuxt 4（Vue 3 + Nitro SSR） |
| 样式 | Tailwind CSS 4（GitHub 风格设计令牌） |
| 数据库 | PostgreSQL 16（本地用 PGlite，线上用真实 Postgres） |
| ORM | Drizzle ORM + drizzle-kit |
| Markdown | marked + sanitize-html（白名单过滤，防 XSS） |

## 环境要求

- Node.js 20 以上（开发机当前为 v24）
- 本地**不需要**安装 PostgreSQL 或 Docker：开发库使用 PGlite（编译为 WASM 的 PostgreSQL 16，数据存放在 `.data/pglite`）

## 快速开始

```bash
npm install
npm run db:setup   # 建库 + 应用迁移 + 写入示例数据
npm run dev        # http://localhost:3000
```

Windows 上如果 PowerShell 报「禁止运行脚本」，把 `npm` 换成 `npm.cmd` 即可。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建，产物在 `.output/` |
| `npm run preview` | 预览生产构建 |
| `npm run db:generate` | 按 `server/db/schema.ts` 生成迁移 SQL 到 `drizzle/` |
| `npm run db:migrate` | 应用未执行的迁移 |
| `npm run db:seed` | 清空业务数据并写入示例数据 |
| `npm run db:setup` | 迁移 + 种子数据 |
| `npm run user:create -- --email a@b.com --username name --nickname 昵称 --password 密码 [--admin]` | 创建账号（加 `--admin` 建管理员） |
| `npm run content:sync` | 把 `content/posts/` 的 Markdown 文章同步进数据库 |

改了数据库结构之后的标准流程：`npm run db:generate` → `npm run db:migrate`。

> **本地数据库注意事项**：PGlite 是文件型数据库，同一时刻只允许一个进程访问。
> 停止开发服务器请用 `Ctrl+C` 正常退出，**不要用 `taskkill` 强杀进程**，否则数据目录可能损坏。
> 真损坏了也不用心疼——删掉 `.data/pglite` 重新执行 `npm run db:setup` 即可，里面只有示例数据。
>
> 开发服务器启动时会**自动应用迁移**；需要重灌示例数据时不用重启，直接 `POST /api/dev/seed` 即可
> （PGlite 是单进程数据库，另开终端跑 `npm run db:seed` 会因为文件被占用而失败）。

## 注册登录（D2 已完成）

- 一期只做**邮箱 + 密码**：注册（6 位邮箱验证码）、登录、退出、邮箱验证、找回密码、会话管理
- 注册流程：填邮箱 → 点「获取验证码」→ 收到 6 位数字 → 填验证码 + 用户名 + 昵称 + 密码 → 注册即完成邮箱验证
- 验证码：10 分钟有效、同一邮箱 60 秒内只能发一次、最多输错 5 次、用过即失效，数据库只存哈希
- 密码使用 Node 内置 scrypt 哈希（N=32768, r=8, p=1），避免原生模块在服务器上的编译问题
- 会话用 HttpOnly + SameSite=Lax 的 Cookie，服务端可失效；改密码会踢掉所有登录设备
- 登录、注册、发信都有基于 IP / 用户的内存限流（单机够用，多实例部署时需换 Redis）
- 邮箱验证后才能发布项目（`requireVerifiedUser`），浏览与互动不受限制

**配置发信（QQ 邮箱）**：在 `.env` 里填 `NUXT_SMTP_USER` 与 `NUXT_SMTP_PASS`（16 位授权码，不是登录密码）。
未配置时邮件内容会打印到开发服务器控制台，接口还会在开发模式返回验证码与链接，方便本地走通流程。

> **改了 `.env` 必须重启开发服务器**，配置文件只在启动时读取一次。
> 重启请用 `POST /api/dev/shutdown` 让数据库正常关闭，再执行 `npm run dev`，不要直接强杀进程。
> 另外，发信需要能访问外网；在受限网络环境（比如容器或沙箱）里会报 `connect EACCES`。

**开发辅助接口**（仅开发环境，生产返回 404）：

- `POST /api/dev/seed`：重灌示例数据
- `GET /api/dev/outbox`：查看最近几个账号的邮箱验证与密码重置令牌
- `POST /api/dev/grant-admin`：把某个邮箱提升为管理员（本地 PGlite 被开发服务器占用，不方便另开终端跑脚本时用）
- `GET /api/dev/login?email=xxx&redirect=/projects/new`：直接以某个账号登录并跳转，方便在浏览器里预览需要登录的页面
- `POST /api/dev/migrate`：只应用迁移，不清数据
- `POST /api/dev/shutdown`：正常关闭数据库并退出进程（安全重启开发服务器用）
- `POST /api/dev/test-mail`：测试发信并返回失败原因
- `GET /api/dev/config`：查看 SMTP / DeepSeek / COS / 站点地址等配置是否已加载（只返回布尔值）

## 项目模型要点

- **AI 项目为主**：发布时勾选「这是 AI 项目」后填写模型、使用方式、每月成本、每月收益与商业模式
- 列表卡片显示 AI 徽章 + 模型 + 月成本 + 月收入 + 盈利状态
- 首页提供「AI 项目速览」表格，可横向对比模型与收支
- 详情页有独立的「AI 信息」区块，并标注「成本与收益由作者自行填写，栈桥不做审计」
- **标签分四组**：技术栈 / 模型与供应商 / AI 技术 / 应用领域，列表页侧边栏按组展示
- **正文与项目分离**：项目条目只保留一段 ≤300 字的「补充说明」，
  长效内容写成文章（见下一节），两者是多对多关系

## 文章与项目的关系（D4 已完成）

长内容（怎么做出来的、成本怎么算的、踩了什么坑）走文章系统，项目条目只留结构化信息与简短说明。

- 文章源码放在 `content/posts/*.md`，用 **Markdown + Git** 维护；社区成员通过 Pull Request 投稿
- 开发服务器会监听该目录，**保存 Markdown 即自动同步进数据库**；也可以手动跑 `npm run content:sync`
- 文章与项目是**多对多**关系：文章详情页显示「涉及的项目」，项目详情页显示「相关文章」
- 文件名以 `_` 开头的（如 `_template.md`）不会被同步；frontmatter 里 `draft: true` 的文章入库但不公开
- 同步只覆盖 `source = git` 的文章，将来网页编辑器写的文章（`source = editor`）不会被文件覆盖
- 投稿规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)

为什么文章存文件、却要同步进数据库？因为这站的核心是「项目与文章互相关联 + 排行榜 + 分页筛选」，
这些都要靠 SQL 关联查询；将来加网页编辑器时，写的也是同一张 `posts` 表。

## 审核后台（D5 手动审核部分已完成）

管理员登录后访问 `/admin`，或在右上角用户菜单点「管理后台」。

- **项目审核**：待审队列按提交时间正序展示，卡片里能看到封面、简介、补充说明、截图、
  标签（待审标签会标出来）、AI 模型、成本收益、作者邮箱是否已验证；可展开查看细节
- **操作**：通过并发布 / 驳回（可填意见，意见会显示在作者的「我的项目」里）；
  已发布项目可**下架**，已驳回/已下架的项目可**恢复发布**
- **标签审核**：用户申请的新标签进队列，通过后才会出现在公共标签与筛选里；
  审核时会按「只统计已发布项目」重算标签使用次数
- 权限：所有 `/api/admin/*` 接口都要求 `role = admin`，普通用户访问返回 403

> 通过后项目立即公开，驳回意见对作者可见。AI 自动审核（DeepSeek + 腾讯云内容安全）
> 会在 `.env` 填入 `NUXT_DEEPSEEK_API_KEY` 后接入，届时后台只需处理机器拿不准的内容。

## 发布项目（D3 已完成）

- 入口：页头「发布项目」、首页「发布我的项目」、`/projects/new`
- **邮箱验证后才能发布**（未验证会提示去验证）；登录与发帖均有频率限制
- 表单包含：标题、一句话简介、Markdown 正文（可实时预览）、封面、截图（最多 5 张）、
  分类、技术栈标签（最多 5 个）、新标签申请（最多 3 个，进管理员审核队列）、
  仓库 / 演示 / 其他链接、AI 开关（模型 + 使用方式）、成本与收益（每月成本 / 每月收入 / 总收入 / 商业模式 / 说明）
- 投稿方式：提交审核（普通用户进待审队列，管理员发布直接上线）或存草稿
- 管理入口：`/me/projects` 查看状态、编辑、查看；已发布项目被作者修改后会重新进入审核

**图片存储**：当前保存到 `public/uploads/年月/`（已加入 .gitignore）。服务器带宽只有 4Mbps，
正式上线前会在 `server/utils/storage.ts` 里接入腾讯云 COS + CDN，函数返回的 url 契约不变。

## 目录结构

```
app/                    前端代码（Nuxt 4 的 srcDir）
  components/           通用组件：页头、页脚、项目卡片、标签、头像、统计
  layouts/default.vue   整站布局
  pages/                路由页面：首页、项目列表、项目详情、关于、博客
  utils/                日期、数字、头像色相格式化
  assets/css/main.css   Tailwind 主题令牌 + Markdown 正文样式
server/
  api/                  Nitro 接口
  db/schema.ts          数据模型（11 张表）
  db/client.ts          数据库驱动选择（PGlite / postgres.js）
  db/migrate.ts         迁移执行器
  utils/                查询逻辑与 Markdown 渲染
shared/types.ts         前后端共用的接口类型
scripts/                迁移与种子数据脚本（Node 原生运行 TS）
drizzle/                迁移 SQL（由 drizzle-kit 生成，需提交到仓库）
.data/                  本地数据库与截图，已在 .gitignore 中忽略
```

## 数据库说明

默认连接逻辑在 `server/db/client.ts`：

- 未配置 `NUXT_DATABASE_URL` → 使用 PGlite，数据在 `.data/pglite`
- 配置了 `postgres://...` → 使用 postgres.js 连接真实 PostgreSQL

所以本地开发与线上部署用的是**同一套 schema 和查询代码**，切换数据库不需要改代码。

生产环境执行种子脚本会清空业务数据，因此需要显式加 `--force`：

```bash
npm run db:seed -- --force
```

## 当前进度

已完成（D1）：项目浏览全链路 + 数据模型 + 本地开发环境。
已完成（D1.5）：AI 项目信息（模型 / 成本 / 收益）与四组标签体系。

接下来：

- D2 邮箱注册登录、邮箱验证、找回密码、会话管理
- D3 筛选与搜索体验完善
- D4 发布项目（表单、图片上传到 COS、我的项目）
- D5 审核流水线（规则 + DeepSeek）与审核后台
- D6 点赞、收藏、评论、举报
- D7 博客与移动端打磨

## 部署计划（本地确认后执行）

1. 准备 CVM：2 核 2G / 4Mbps，建议重装 Ubuntu 22.04（CentOS 7.6 已 EOL，且 glibc 2.17 跑不了 Node 20+ 的官方二进制）
2. Docker Compose 运行应用与 PostgreSQL，加 2GB swap；图片走 COS，避免占用 4Mbps 带宽
3. 宿主机 Nginx 反代 `127.0.0.1:3000`，备案前先用高位端口对外访问
4. 后续买域名 → ICP 备案 → 配置 HTTPS 正式上线

## 注意事项

- `.env` 含密钥，已在 `.gitignore` 中忽略，只能提交 `.env.example`
- 用户提交的 Markdown 必须经过 `server/utils/markdown.ts` 的白名单过滤再渲染
- 示例账号的密码哈希是占位值，无法登录；D2 会提供正式的账号创建脚本
