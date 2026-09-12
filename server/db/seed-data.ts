import type { RevenueModel } from '../../shared/types.ts'

export const seedCategories = [
  { name: 'AI 工具', slug: 'ai', description: '模型、Agent 与智能化产品', sortOrder: 1 },
  { name: '开发者工具', slug: 'devtools', description: '提升开发效率的工具链', sortOrder: 2 },
  { name: 'Web 应用', slug: 'web', description: '跑在浏览器里的产品与服务', sortOrder: 3 },
  { name: '移动应用', slug: 'mobile', description: 'iOS、Android 与小程序', sortOrder: 4 },
  { name: '开源库', slug: 'library', description: '可以被别人引用的代码', sortOrder: 5 },
  { name: '硬件与嵌入式', slug: 'hardware', description: '电路、传感器与机器人', sortOrder: 6 },
]

export type TagGroup = 'stack' | 'ai_model' | 'ai_tech' | 'ai_domain'

export const seedTags: { name: string, slug: string, group: TagGroup }[] = [
  // 技术栈
  { name: 'TypeScript', slug: 'typescript', group: 'stack' },
  { name: 'Vue 3', slug: 'vue3', group: 'stack' },
  { name: 'React', slug: 'react', group: 'stack' },
  { name: 'Node.js', slug: 'nodejs', group: 'stack' },
  { name: 'Python', slug: 'python', group: 'stack' },
  { name: 'Go', slug: 'go', group: 'stack' },
  { name: 'Rust', slug: 'rust', group: 'stack' },
  { name: 'PostgreSQL', slug: 'postgresql', group: 'stack' },
  { name: 'Redis', slug: 'redis', group: 'stack' },
  { name: 'Docker', slug: 'docker', group: 'stack' },
  { name: 'Tailwind CSS', slug: 'tailwindcss', group: 'stack' },
  { name: '微信小程序', slug: 'weapp', group: 'stack' },
  { name: 'Electron', slug: 'electron', group: 'stack' },
  { name: 'WebAssembly', slug: 'wasm', group: 'stack' },

  // 模型与供应商
  { name: 'OpenAI', slug: 'openai', group: 'ai_model' },
  { name: 'Claude', slug: 'claude', group: 'ai_model' },
  { name: 'DeepSeek', slug: 'deepseek', group: 'ai_model' },
  { name: '通义千问', slug: 'qwen', group: 'ai_model' },
  { name: '智谱 GLM', slug: 'glm', group: 'ai_model' },
  { name: 'Llama', slug: 'llama', group: 'ai_model' },
  { name: 'Whisper', slug: 'whisper', group: 'ai_model' },
  { name: 'Stable Diffusion', slug: 'stable-diffusion', group: 'ai_model' },
  { name: '本地模型', slug: 'local-model', group: 'ai_model' },

  // AI 技术
  { name: 'RAG', slug: 'rag', group: 'ai_tech' },
  { name: 'Agent', slug: 'agent', group: 'ai_tech' },
  { name: '提示词工程', slug: 'prompt-engineering', group: 'ai_tech' },
  { name: '向量数据库', slug: 'vector-db', group: 'ai_tech' },
  { name: '图像生成', slug: 'image-generation', group: 'ai_tech' },
  { name: '语音识别', slug: 'speech-recognition', group: 'ai_tech' },
  { name: '微调', slug: 'fine-tuning', group: 'ai_tech' },
  { name: 'MCP', slug: 'mcp', group: 'ai_tech' },

  // 应用领域
  { name: 'AI 编程', slug: 'ai-coding', group: 'ai_domain' },
  { name: 'AI 写作', slug: 'ai-writing', group: 'ai_domain' },
  { name: '知识管理', slug: 'knowledge-base', group: 'ai_domain' },
  { name: '客服问答', slug: 'chatbot', group: 'ai_domain' },
  { name: '内容创作', slug: 'content-creation', group: 'ai_domain' },
  { name: '数据分析', slug: 'data-analysis', group: 'ai_domain' },
  { name: '图像处理', slug: 'image-tools', group: 'ai_domain' },
  { name: '效率工具', slug: 'productivity', group: 'ai_domain' },
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
    bio: '前端工程师，最近在用 AI 做翻译工具，边做边算账。',
  },
  {
    username: 'chenmo',
    nickname: '陈默',
    email: 'chenmo@example.com',
    role: 'user' as const,
    bio: '全栈开发，做 AI 知识库和自托管服务，喜欢把成本公开出来。',
  },
  {
    username: 'yuhang',
    nickname: '宇航',
    email: 'yuhang@example.com',
    role: 'user' as const,
    bio: '后端工程师，研究模型本地化和推理成本优化。',
  },
]

export interface SeedMetrics {
  /** 有 models 或 hosting 的项目会被标记为 AI 项目 */
  models?: string[]
  hosting?: 'api' | 'self_hosted' | 'hybrid'
  /** 以下成本与收益字段所有项目均可选填 */
  cost?: number | null
  revenue?: number | null
  total?: number | null
  revenueModel?: RevenueModel
  costNote?: string
  revenueNote?: string
}

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
  metrics?: SeedMetrics
}

export const seedProjects: SeedProject[] = [
  {
    slug: 'star-map',
    title: '星图',
    summary: '把 GitHub Star 整理成可检索的 AI 知识库，自动生成标签与摘要，并按调用成本做了缓存。',
    categorySlug: 'ai',
    authorUsername: 'chenmo',
    tags: ['TypeScript', 'Node.js', 'PostgreSQL', 'DeepSeek', 'RAG', '向量数据库', '知识管理'],
    featured: true,
    repoUrl: 'https://github.com/example/star-map',
    daysAgo: 4,
    viewCount: 3260,
    likeCount: 226,
    favoriteCount: 138,
    metrics: {
      models: ['deepseek-chat', 'bge-m3'],
      hosting: 'hybrid',
      cost: 260,
      revenue: 0,
      total: 0,
      revenueModel: 'free',
      costNote: '向量库服务器 150 元 + 模型调用约 110 元，摘要只在首次抓取时生成',
      revenueNote: '目前完全免费，纯自用加开源',
    },
    body: `## 问题

我的 GitHub Star 有两千多个，真正要找的时候一个都找不到。星图把这些仓库拉下来，
生成摘要和标签，变成一个能搜索的库。

## 怎么控制成本

摘要只在**首次抓取**时生成，之后命中缓存不再调用模型；向量只对摘要做一次嵌入，
仓库更新时按需重算。这样两千个仓库的一次性成本大约 12 元，之后每月只有向量库服务器
的固定开销。

\`\`\`ts
const cached = await cache.get(repo.fullName)
if (cached?.readmeSha === repo.readmeSha) return cached
const summary = await llm.chat({ model: 'deepseek-chat', prompt: buildPrompt(repo) })
\`\`\`

## 成本构成

| 项目 | 每月 |
| --- | --- |
| 向量库服务器（2 核 2G） | 150 元 |
| 模型调用 | 约 110 元 |
| 对象存储与域名 | 少量 |

> 检索完全免费，不打算做付费，因为这东西我自己每天都要用。`,
  },
  {
    slug: 'yidian-translate',
    title: '译点',
    summary: '面向技术文档的中英翻译工具，保留代码块与术语表，按 token 计价所以把成本摊开算给用户看。',
    categorySlug: 'ai',
    authorUsername: 'linzhi',
    tags: ['Vue 3', 'Node.js', 'TypeScript', 'OpenAI', 'DeepSeek', '提示词工程', 'AI 写作'],
    featured: true,
    demoUrl: 'https://yidian.example.com',
    daysAgo: 8,
    viewCount: 2840,
    likeCount: 198,
    favoriteCount: 121,
    metrics: {
      models: ['gpt-4o-mini', 'deepseek-chat'],
      hosting: 'api',
      cost: 420,
      revenue: 1680,
      total: 6720,
      revenueModel: 'subscription',
      costNote: '按 token 计费，长文档翻译高峰集中在晚上，平均 420 元/月',
      revenueNote: '订阅制，目前 120 位付费用户，月收入约 1680 元',
    },
    body: `## 为什么做翻译工具

技术文档最难翻译的是**代码块和专有名词**。译点会把代码、命令、变量名保护起来，
只翻译正文，术语表可以自己维护。

## 成本与定价

翻译一万字技术文档大约消耗 3 万 token，成本在 0.6 元上下。免费额度给到每月 5 万字，
超出的部分走订阅。这个定价是倒推出来的：

\`\`\`
平均成本 420 元/月 ÷ 订阅用户 120 人 ≈ 3.5 元/人
定价 14 元/月，毛利率约 75%
\`\`\`

## 收益情况

上线四个月，目前月收入 1680 元，已经覆盖成本。我没有做推广，用户主要来自
在文档仓库里看到翻译结果后找过来的。

> 收入数据由作者自行提供，仅供参考。`,
  },
  {
    slug: 'wenmai-codebase-qa',
    title: '问脉',
    summary: '面向私有代码库的问答机器人，把仓库索引、权限和部署都打包成一套可交付方案。',
    categorySlug: 'ai',
    authorUsername: 'yuhang',
    tags: ['Python', 'PostgreSQL', '通义千问', 'RAG', '向量数据库', 'Agent', 'AI 编程'],
    featured: true,
    daysAgo: 12,
    viewCount: 1980,
    likeCount: 152,
    favoriteCount: 97,
    metrics: {
      models: ['qwen-max', 'bge-large-zh'],
      hosting: 'hybrid',
      cost: 900,
      revenue: 3600,
      total: 10800,
      revenueModel: 'service',
      costNote: '模型调用约 500 元，向量库服务器 400 元，合计 900 元/月',
      revenueNote: '按项目交付收费，近三个月平均 3600 元/月',
    },
    body: `## 做的是什么

企业代码库不方便传到公网模型，问脉支持把索引跑在内网，只把最必要的片段送到模型，
也可以整体切到本地模型。

## 成本结构

客户越多，成本主要花在**索引重建**和**向量检索**上。索引只在代码变更时增量重建，
单次全量重建一个十万文件的仓库大约 30 分钟、成本 8 元左右。

## 收益

目前是接单交付：一次性实施费加每月维护费。月均 3600 元，成本 900 元，
但真正贵的是我自己的时间。

> 收入数据由作者自行提供，仅供参考。`,
  },
  {
    slug: 'huazhong-sdxl',
    title: '画钟',
    summary: '基于 SDXL 与 ControlNet 的插画工作流，把提示词模板、批处理和放大串成一条流水线。',
    categorySlug: 'ai',
    authorUsername: 'yuhang',
    tags: ['Python', 'Docker', 'Stable Diffusion', '图像生成', '内容创作'],
    daysAgo: 16,
    viewCount: 2460,
    likeCount: 176,
    favoriteCount: 112,
    metrics: {
      models: ['SDXL 1.0', 'ControlNet'],
      hosting: 'self_hosted',
      cost: 1500,
      revenue: 2400,
      total: 15600,
      revenueModel: 'one_time',
      costNote: 'GPU 租用是大头，A10 按小时计费，跑满约 1500 元/月',
      revenueNote: '卖工作流与配套教程，一次性买断，平均月收入 2400 元',
    },
    body: `## 为什么不用在线服务

插画需要反复微调同一个角色，在线服务按张计费很难受。自己租一张卡跑，
出图不要钱，只付 GPU 时间。

## 成本明细

| 项目 | 每月 |
| --- | --- |
| GPU 租用（A10） | 1400 元 |
| 对象存储 | 60 元 |
| 其他 | 40 元 |

按每天出图 200 张算，单张成本大概 0.25 元，比按张付费便宜一个数量级，
前提是卡不能闲着。

## 收益

把工作流和教程打包卖，一次性买断 199 元，目前卖出 60 多份。这属于
「做完一次卖很久」的模式，和订阅的现金流完全不同。`,
  },
  {
    slug: 'boboke-podcast',
    title: '播客剪',
    summary: '长音频自动转写、分段、生成摘要与章节，适合访谈类播客的后期整理。',
    categorySlug: 'ai',
    authorUsername: 'linzhi',
    tags: ['Node.js', 'TypeScript', 'Claude', 'Whisper', '语音识别', '内容创作'],
    daysAgo: 20,
    viewCount: 1420,
    likeCount: 98,
    favoriteCount: 54,
    metrics: {
      models: ['whisper-large-v3', 'claude-sonnet'],
      hosting: 'api',
      cost: 310,
      revenue: 0,
      total: 0,
      revenueModel: 'not_yet',
      costNote: '转写按音频时长计费，一小时节目约 3.5 元，平均每月 310 元',
      revenueNote: '还没想好怎么收费，先给自己用',
    },
    body: `## 用在哪

我做播客剪辑时最烦的是找「那句话在第几分钟」。播客剪会输出带时间戳的转写稿，
并按话题切段，直接生成章节信息。

## 成本

一小时的音频转写约 3.5 元，摘要和章节生成不到 0.2 元。每月处理 80 多小时，
总成本 310 元左右。

\`\`\`bash
podcastcut ./episode-42.mp3 --summary --chapters
\`\`\`

## 还没解决的

说话人分离还不稳定，两人对谈时经常把话混到一起，这是下一步要处理的。`,
  },
  {
    slug: 'jianli-cat',
    title: '简历猫',
    summary: 'AI 简历优化工具：对着岗位描述改写项目经历，明确标出改了哪几句。',
    categorySlug: 'ai',
    authorUsername: 'linzhi',
    tags: ['Vue 3', 'Node.js', 'DeepSeek', '提示词工程', '效率工具'],
    demoUrl: 'https://jianlimao.example.com',
    daysAgo: 26,
    viewCount: 3120,
    likeCount: 214,
    favoriteCount: 143,
    metrics: {
      models: ['deepseek-chat'],
      hosting: 'api',
      cost: 150,
      revenue: 780,
      total: 2340,
      revenueModel: 'freemium',
      costNote: '单次优化约 0.02 元，每月 150 元左右',
      revenueNote: '免费 3 次后付费，9.9 元解锁，月收入约 780 元',
    },
    body: `## 做对的一件事

很多简历工具会整段重写，用户不敢用。简历猫只做**逐句改写**，每处修改都标出理由，
你可以逐条接受或拒绝。

## 成本与收入

一次完整的简历优化大概消耗 4000 token，成本 0.02 元。免费三次后收费 9.9 元，
毛利基本等于定价。目前每月成本 150 元，收入 780 元。

## 数据与隐私

简历是敏感信息。默认不落库，处理完立即丢弃，只有用户主动保存的版本才会留存。`,
  },
  {
    slug: 'pocket-ml',
    title: '掌上机器学习',
    summary: '把常用模型量化后编译成 WebAssembly，在浏览器里做图像分类和文本相似度，推理零服务器成本。',
    categorySlug: 'ai',
    authorUsername: 'yuhang',
    tags: ['WebAssembly', 'Python', 'TypeScript', '本地模型', '效率工具'],
    daysAgo: 32,
    viewCount: 1680,
    likeCount: 128,
    favoriteCount: 72,
    metrics: {
      models: ['MobileNetV3（量化）', 'MiniLM'],
      hosting: 'self_hosted',
      cost: 80,
      revenue: 0,
      total: 0,
      revenueModel: 'free',
      costNote: '只有对象存储与域名开销，推理全在用户浏览器里，约 80 元/月',
      revenueNote: '开源免费',
    },
    body: `## 思路

很多场景不需要把图片传到服务器再等结果。掌上机器学习把模型量化后编译成 WebAssembly，
推理全部在浏览器完成，数据不出本机。

## 成本的优势

因为推理在客户端，服务器只负责分发静态文件，所以**没有按调用量增长的成本**。
每月固定开销不到 100 元，这正是把模型搬到端上的最大收益。

## 体积控制

模型按需加载，首屏 JS 控制在 60KB 以内。首次加载约 4MB 模型文件，之后走浏览器缓存。

\`\`\`ts
const model = await loadModel('mobilenet-v3', { quantized: true })
const result = await model.predict(imageElement)
\`\`\``,
  },
  {
    slug: 'moji-note',
    title: '墨记',
    summary: '本地优先的 Markdown 笔记应用，支持双向链接、全文搜索和纯文本存储。',
    categorySlug: 'devtools',
    authorUsername: 'linzhi',
    tags: ['Vue 3', 'TypeScript', 'Electron', '效率工具'],
    repoUrl: 'https://github.com/example/moji-note',
    metrics: {
      cost: 60,
      revenue: 0,
      total: 0,
      revenueModel: 'free',
      costNote: '只有域名与对象存储开销，几乎所有计算都在用户本机',
      revenueNote: '开源免费，没有商业化计划',
    },
    daysAgo: 38,
    viewCount: 2210,
    likeCount: 164,
    favoriteCount: 96,
    body: `## 为什么做墨记

我用了三年云端笔记，最大的不安是「我的文字不在我手里」。墨记把所有内容存成本地
Markdown 文件，一个文件夹就是全部数据，随时能用别的工具打开。

## 核心特性

- **双向链接**：输入 \`[[\` 就能链接到另一篇笔记，反向链接面板自动汇总
- **全文搜索**：基于 SQLite FTS5，几万篇笔记也是毫秒级
- **纯文本存储**：所有笔记就是 \`.md\` 文件，不锁定格式

\`\`\`bash
git clone https://github.com/example/moji-note.git
cd moji-note && npm install && npm run dev
\`\`\`

> 没做云同步的账号体系，是因为不想让一个本地工具依赖服务器。`,
  },
  {
    slug: 'lighthouse-panel',
    title: '灯塔监控面板',
    summary: '给个人服务器用的轻量监控：CPU、内存、磁盘、进程与自定义探针，单二进制部署。',
    categorySlug: 'devtools',
    authorUsername: 'yuhang',
    tags: ['Go', 'Docker', 'PostgreSQL'],
    repoUrl: 'https://github.com/example/lighthouse-panel',
    demoUrl: 'https://lighthouse.example.com',
    metrics: {
      cost: 120,
      revenue: 0,
      total: 0,
      revenueModel: 'free',
      costNote: '一台 2 核 2G 服务器分摊下来约 120 元/月',
    },
    daysAgo: 44,
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

支持 Webhook 和邮件两种通知方式，阈值可按指标单独设置。`,
  },
  {
    slug: 'tunnel',
    title: '隧道',
    summary: '一条命令把本地服务暴露到公网，自带二级域名、HTTPS 和访问密码。',
    categorySlug: 'devtools',
    authorUsername: 'chenmo',
    tags: ['Go', 'Docker'],
    repoUrl: 'https://github.com/example/tunnel',
    metrics: {
      cost: 200,
      revenue: 300,
      total: 900,
      revenueModel: 'service',
      costNote: '中转服务器带宽是大头，约 200 元/月',
      revenueNote: '给几家小团队做自建部署和维护，每月 300 元左右',
    },
    daysAgo: 52,
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

\`\`\`bash
tunnel server --domain tunnel.example.com
\`\`\``,
  },
]

export interface SeedComment {
  projectSlug: string
  authorUsername: string
  content: string
  /** 回复目标：留空表示一级评论，否则指向同一项目下某条评论的作者用户名 */
  replyToUsername?: string
  hoursAgo: number
}

export const seedComments: SeedComment[] = [
  {
    projectSlug: 'star-map',
    authorUsername: 'linzhi',
    content: '把摘要缓存在 readmeSha 上这个思路很省，我也去改一下自己的抓取脚本。',
    hoursAgo: 70,
  },
  {
    projectSlug: 'star-map',
    authorUsername: 'chenmo',
    content: '对，README 没变就不用重新摘要，两千个仓库跑完只花了十几块。',
    replyToUsername: 'linzhi',
    hoursAgo: 62,
  },
  {
    projectSlug: 'star-map',
    authorUsername: 'yuhang',
    content: '向量库那 150 元是固定开销吗？如果换成 pgvector 是不是可以省掉。',
    replyToUsername: 'chenmo',
    hoursAgo: 40,
  },
  {
    projectSlug: 'yidian-translate',
    authorUsername: 'chenmo',
    content: '把成本结构和毛利都写出来，这种坦诚很难得。技术文档的术语表能导入吗？',
    hoursAgo: 30,
  },
  {
    projectSlug: 'yidian-translate',
    authorUsername: 'linzhi',
    content: '可以，支持 CSV 导入术语表，也可以直接读仓库里的 glossary 文件。',
    replyToUsername: 'chenmo',
    hoursAgo: 26,
  },
  {
    projectSlug: 'huazhong-sdxl',
    authorUsername: 'yuhang',
    content: 'GPU 一千五、收入两千四，等于给自己发了份零花钱，但成本结构很清楚。',
    hoursAgo: 18,
  },
  {
    projectSlug: 'moji-note',
    authorUsername: 'chenmo',
    content: '本地优先这一点很戳我。请问同步到 WebDAV 之后，多端同时编辑会冲突吗？',
    hoursAgo: 58,
  },
  {
    projectSlug: 'moji-note',
    authorUsername: 'linzhi',
    content: '目前是文件级 last-write-wins，有冲突会保留一份带时间戳的副本，不会直接覆盖。',
    replyToUsername: 'chenmo',
    hoursAgo: 52,
  },
  {
    projectSlug: 'tunnel',
    authorUsername: 'yuhang',
    content: '自建服务端那段文档能再详细点吗，我卡在证书自动签发那里了。',
    hoursAgo: 12,
  },
]
