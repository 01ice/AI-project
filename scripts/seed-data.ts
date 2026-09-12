export const seedCategories = [
  { name: 'Web 应用', slug: 'web', description: '跑在浏览器里的产品与服务', sortOrder: 1 },
  { name: '移动应用', slug: 'mobile', description: 'iOS、Android 与小程序', sortOrder: 2 },
  { name: 'AI 工具', slug: 'ai', description: '模型、Agent 与智能化工具', sortOrder: 3 },
  { name: '开发者工具', slug: 'devtools', description: '提升开发效率的工具链', sortOrder: 4 },
  { name: '开源库', slug: 'library', description: '可以被别人引用的代码', sortOrder: 5 },
  { name: '硬件与嵌入式', slug: 'hardware', description: '电路、传感器与机器人', sortOrder: 6 },
]

export const seedTags = [
  { name: 'Vue 3', slug: 'vue3' },
  { name: 'React', slug: 'react' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Node.js', slug: 'nodejs' },
  { name: 'Go', slug: 'go' },
  { name: 'Rust', slug: 'rust' },
  { name: 'Python', slug: 'python' },
  { name: 'PostgreSQL', slug: 'postgresql' },
  { name: 'Redis', slug: 'redis' },
  { name: 'Docker', slug: 'docker' },
  { name: 'Kubernetes', slug: 'kubernetes' },
  { name: 'Tailwind CSS', slug: 'tailwindcss' },
  { name: '微信小程序', slug: 'weapp' },
  { name: 'Flutter', slug: 'flutter' },
  { name: 'Electron', slug: 'electron' },
  { name: 'WebAssembly', slug: 'wasm' },
]

export const seedUsers = [
  {
    username: 'zhanqiao',
    nickname: '栈桥站长',
    email: 'admin@zhanqiao.dev',
    role: 'admin' as const,
    bio: '搭这座桥的人，喜欢把好东西收集起来。',
  },
  {
    username: 'linzhi',
    nickname: '林知',
    email: 'linzhi@example.com',
    role: 'user' as const,
    bio: '前端工程师，喜欢写小工具，也喜欢把工具写到没有为止。',
  },
  {
    username: 'chenmo',
    nickname: '陈默',
    email: 'chenmo@example.com',
    role: 'user' as const,
    bio: '全栈开发，最近在折腾自托管和 RSS。',
  },
  {
    username: 'yuhang',
    nickname: '宇航',
    email: 'yuhang@example.com',
    role: 'user' as const,
    bio: '后端工程师，业余研究怎么把模型塞进浏览器。',
  },
]

export interface SeedProject {
  slug: string
  title: string
  summary: string
  categorySlug: string
  authorUsername: string
  tags: string[]
  featured?: boolean
  repoUrl?: string
  demoUrl?: string
  daysAgo: number
  viewCount: number
  likeCount: number
  favoriteCount: number
  body: string
}

export const seedProjects: SeedProject[] = [
  {
    slug: 'moji-note',
    title: '墨记',
    summary: '本地优先的 Markdown 笔记应用，支持双向链接、全文搜索和纯文本存储。',
    categorySlug: 'devtools',
    authorUsername: 'linzhi',
    tags: ['Vue 3', 'TypeScript', 'Electron'],
    featured: true,
    repoUrl: 'https://github.com/example/moji-note',
    demoUrl: 'https://moji.example.com',
    daysAgo: 3,
    viewCount: 2841,
    likeCount: 186,
    favoriteCount: 94,
    body: `## 为什么做墨记

我用了三年云端笔记，最大的不安是「我的文字不在我手里」。墨记把所有内容存成本地 Markdown 文件，
一个文件夹就是全部数据，随时能用别的工具打开。

## 核心特性

- **双向链接**：输入 \`[[\` 就能链接到另一篇笔记，反向链接面板自动汇总
- **全文搜索**：基于 SQLite FTS5，几万篇笔记也是毫秒级
- **纯文本存储**：所有笔记就是 \`.md\` 文件，不锁定格式
- **可选同步**：接自己的 WebDAV 或对象存储，没有账号也能用

## 快速开始

\`\`\`bash
git clone https://github.com/example/moji-note.git
cd moji-note && npm install
npm run dev
\`\`\`

## 一些取舍

没有做云同步的账号体系，是因为不想让一个本地工具依赖服务器。如果你需要多端同步，
用 iCloud、坚果云这类共享文件夹就能解决。

> 目前还在早期阶段，欢迎提 Issue 说你的用法。`,
  },
  {
    slug: 'star-map',
    title: '星图',
    summary: '把 GitHub Star 整理成可检索的知识库，自动打标签、写摘要、生成索引。',
    categorySlug: 'devtools',
    authorUsername: 'chenmo',
    tags: ['TypeScript', 'Node.js', 'PostgreSQL'],
    featured: true,
    repoUrl: 'https://github.com/example/star-map',
    daysAgo: 6,
    viewCount: 1976,
    likeCount: 142,
    favoriteCount: 88,
    body: `## 问题

我的 GitHub Star 有 2000 多个，真正找的时候一个都找不到。星图做的事情很简单：
把这些仓库拉下来，加上标签和摘要，变成一个能搜索的库。

## 工作方式

1. 用 GitHub API 拉取你 Star 过的仓库
2. 抓取 README，用模型生成一句话摘要和候选标签
3. 全部存进 PostgreSQL，提供网页和 API 两种检索方式

## 检索示例

\`\`\`sql
select name, summary
from repositories
where tags @> array['cli']
order by starred_at desc
limit 20;
\`\`\`

## 部署

支持一条命令起服务，数据库和索引都在同一个容器里：

\`\`\`bash
docker compose up -d
\`\`\`

> 摘要生成是可选的，不配模型 Key 时只做标签提取。`,
  },
  {
    slug: 'lighthouse-panel',
    title: '灯塔监控面板',
    summary: '给个人服务器用的轻量监控：CPU、内存、磁盘、进程与自定义探针，单二进制部署。',
    categorySlug: 'devtools',
    authorUsername: 'yuhang',
    tags: ['Go', 'Docker', 'Kubernetes'],
    repoUrl: 'https://github.com/example/lighthouse-panel',
    demoUrl: 'https://lighthouse.example.com',
    daysAgo: 10,
    viewCount: 3420,
    likeCount: 254,
    favoriteCount: 130,
    body: `## 为什么不用现成的

Prometheus + Grafana 很强，但对一台 2 核 2G 的小服务器来说太重了。灯塔只有一个二进制，
常驻内存 20MB 左右。

## 采集项

| 指标 | 说明 |
| --- | --- |
| CPU / 内存 | 每秒采样，保留 30 天 |
| 磁盘 | 分区使用率与 IO |
| 进程 | 指定进程的内存与存活状态 |
| 探针 | HTTP / TCP 拨测，支持自定义间隔 |

## 告警

支持 Webhook 和邮件两种通知方式。阈值可以按指标单独设置，避免半夜被无关告警吵醒。`,
  },
  {
    slug: 'pocket-ml',
    title: '掌上机器学习',
    summary: '把常用模型编译成 WebAssembly，在浏览器里做图像分类和文本相似度计算。',
    categorySlug: 'ai',
    authorUsername: 'yuhang',
    tags: ['Python', 'WebAssembly', 'React'],
    repoUrl: 'https://github.com/example/pocket-ml',
    daysAgo: 14,
    viewCount: 1568,
    likeCount: 118,
    favoriteCount: 62,
    body: `## 思路

很多场景不需要把图片传到服务器再等结果。掌上机器学习把模型量化后编译成 WebAssembly，
推理全部在浏览器完成，数据不出本机。

## 已支持的模型

- 图像分类（MobileNet 系列）
- 文本相似度（轻量句向量）
- 手写数字识别（教学用）

## 体积控制

模型放在 CDN 上按需加载，首屏 JS 控制在 60KB 以内。

\`\`\`ts
const model = await loadModel('mobilenet-v3', { quantized: true })
const result = await model.predict(imageElement)
\`\`\`

> 首次加载需要下载 4MB 左右的模型文件，之后会走浏览器缓存。`,
  },
  {
    slug: 'yangpi-rss',
    title: '羊皮卷',
    summary: '自托管的 RSS 阅读器，支持全文抓取、规则过滤和多端同步。',
    categorySlug: 'web',
    authorUsername: 'linzhi',
    tags: ['Vue 3', 'Node.js', 'Redis'],
    repoUrl: 'https://github.com/example/yangpi-rss',
    demoUrl: 'https://yangpi.example.com',
    daysAgo: 18,
    viewCount: 2210,
    likeCount: 163,
    favoriteCount: 101,
    body: `## 特点

大部分阅读器的问题是要么太慢，要么把文章压在云端不能导出。羊皮卷用 Redis 做队列，
抓取和阅读互不阻塞，同时保留完整的 OPML 导入导出。

## 过滤规则

支持按标题、正文关键词、作者做黑白名单。规则写在一个 YAML 文件里：

\`\`\`yaml
rules:
  - match: title
    contains: 招聘
    action: hide
  - match: feed
    url: example.com
    action: mark_read
\`\`\`

## 同步

实现了 Fever API，可以和 Reeder、NetNewsWire 这类客户端配合使用。`,
  },
  {
    slug: 'tunnel',
    title: '隧道',
    summary: '一条命令把本地服务暴露到公网，自带二级域名、HTTPS 和访问密码。',
    categorySlug: 'devtools',
    authorUsername: 'chenmo',
    tags: ['Go', 'Docker'],
    repoUrl: 'https://github.com/example/tunnel',
    daysAgo: 24,
    viewCount: 4120,
    likeCount: 312,
    favoriteCount: 175,
    body: `## 用法

\`\`\`bash
tunnel 3000
# → https://swift-fox.tunnel.example.com 已就绪
\`\`\`

适合给同事演示本地开发环境，或者调试微信回调这类需要公网地址的场景。

## 安全

- 默认携带随机路径前缀，避免被扫到
- 支持给隧道加访问密码
- 连接和请求都会记录，方便排查

## 自建服务端

服务端也是同一个二进制，部署在你自己的服务器上：

\`\`\`bash
tunnel server --domain tunnel.example.com
\`\`\``,
  },
  {
    slug: 'codesnap',
    title: '代码快照',
    summary: '把代码片段渲染成漂亮的图片，支持主题、行号、窗口边框和水印。',
    categorySlug: 'web',
    authorUsername: 'linzhi',
    tags: ['TypeScript', 'React', 'Tailwind CSS'],
    demoUrl: 'https://codesnap.example.com',
    daysAgo: 30,
    viewCount: 1890,
    likeCount: 137,
    favoriteCount: 71,
    body: `## 使用场景

写文章、发推、做分享的时候，一张排版干净的代码图比截图体面得多。

## 支持

- 30 多种语法高亮主题
- 可切换的窗口标题栏样式
- 行号、高亮行、折行
- 导出 PNG 与 SVG，SVG 可以无损缩放

## 实现说明

渲染用 Canvas 而不是截图，所以在任何浏览器里结果都一致，也方便服务端渲染用于生成分享图。`,
  },
  {
    slug: 'micro-diary',
    title: '微日记',
    summary: '微信小程序里的日记本，支持日历回看、心情标签和图片记录。',
    categorySlug: 'mobile',
    authorUsername: 'chenmo',
    tags: ['微信小程序', 'TypeScript'],
    daysAgo: 38,
    viewCount: 980,
    likeCount: 64,
    favoriteCount: 35,
    body: `## 为什么做小程序

写日记最大的障碍是打开成本。小程序在微信里一点就开，比装一个 App 现实得多。

## 功能

- 日历视图，有记录的日期会标点
- 心情标签，支持自定义
- 图片最多 9 张，压缩后存云存储
- 全部内容支持导出为 Markdown

## 隐私

数据存在用户自己的云开发环境里，开发者看不到任何日记内容。`,
  },
]

export interface SeedComment {
  projectSlug: string
  authorUsername: string
  content: string
  /** 回复目标：留空表示一级评论，否则是同一项目下某条评论的作者用户名 */
  replyToUsername?: string
  hoursAgo: number
}

export const seedComments: SeedComment[] = [
  {
    projectSlug: 'moji-note',
    authorUsername: 'chenmo',
    content: '本地优先这一点很戳我。请问同步到 WebDAV 之后，多端同时编辑会冲突吗？',
    hoursAgo: 60,
  },
  {
    projectSlug: 'moji-note',
    authorUsername: 'linzhi',
    content: '目前是文件级 last-write-wins，有冲突会保留一份带时间戳的副本，不会直接覆盖。',
    replyToUsername: 'chenmo',
    hoursAgo: 52,
  },
  {
    projectSlug: 'moji-note',
    authorUsername: 'yuhang',
    content: '试了一下搜索确实快，一万多篇笔记没有卡顿。期待 Windows 客户端的安装包。',
    replyToUsername: 'linzhi',
    hoursAgo: 30,
  },
  {
    projectSlug: 'star-map',
    authorUsername: 'linzhi',
    content: '摘要生成的成本大概是多少？两千个仓库会不会一次性烧掉很多额度。',
    hoursAgo: 20,
  },
  {
    projectSlug: 'tunnel',
    authorUsername: 'yuhang',
    content: '自建服务端那段文档能再详细点吗，我卡在证书自动签发那里了。',
    hoursAgo: 12,
  },
]
