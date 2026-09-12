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

改了数据库结构之后的标准流程：`npm run db:generate` → `npm run db:migrate`。

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
