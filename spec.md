# 特价电影票 小程序 · 开发规格

> 依据 3 张参考截图（电影首页 / 影院列表 / 个人中心）复刻，并补齐完整购票链路。

## 一、需求还原范围

**明确在截图中的（1:1 还原）**
- 顶部：原生红色导航栏（`#E8403A`），标题分别为「特价电影票 / 影院列表 / 个人中心」
- 城市选择器 `北京 ▾` + 圆角搜索框（占位文案「搜索电影」/「搜索附近的影院」）
- 首页轮播：3 张海报，中间放大、两侧溢出裁切（`previous-margin` / `next-margin`）
- 公告条：粉底 `#FDEBEA` + 喇叭图标 + 红字「温馨提示：…」（跑马灯滚动）
- Tab：`正在热映`（红色加粗 + 短下划线）/ `即将上映`
- 影片卡片：海报 + `9.9分`（橙 `#FF8A00`）+ 片名 + 格式标签（`IMAX 2D` 橙框 / `CINITY 3D` 红框）
  + 时长/类型/语言 + 导演/主演 + 三行简介 + 右侧悬浮「购票」按钮
- 影院卡片：影院名 + 地址（两行）+ 右侧 `¥32.8起` / `0.72km` / `原价¥41`
- 个人中心：红色渐变头图 + 白色用户卡（头像 / 微信用户 / 影迷会员标签 / 右箭头）
  + `我的订单` 左侧红条标题 + `全部订单 ›` + 四宫格（待付款/出票中/已出票/退款售后）
  + `常用功能` 四宫格（隐私协议/在线客服/电话客服/微信客服）+ `退出登录`
- tabBar：电影 / 影院 / 我的，选中色橙 `#FF9A1E`

**截图之外、按购票产品常规流程补齐的**
影片详情 → 选择影院与场次 → 选座 → 确认订单 → 支付 → 订单列表 → 订单详情。

## 二、设计令牌（Design Tokens）

| 用途 | 值 |
| --- | --- |
| 品牌红（导航栏 / 强调） | `#E8403A` |
| 品牌红渐变（个人中心头图） | `linear-gradient(135deg,#F2675C,#E23A2F 58%,#D62C23)` |
| 购票橙（按钮） | `linear-gradient(135deg,#FF9440,#FF7A33)` |
| 评分橙 / 标签橙 | `#FF8A00` |
| 公告粉底 | `#FDEBEA` |
| 页面背景 | `#F5F5F5` |
| 卡片 | `#FFFFFF` / 圆角 `16rpx` / 阴影 `0 2rpx 10rpx rgba(0,0,0,.04)` |
| 主文字 / 次文字 / 弱文字 | `#222222` / `#888888` / `#AAAAAA` |
| tabBar 选中 / 未选中 | `#FF9A1E` / `#9B9B9B` |
| 订单状态色 | 待付款 `#FF7A33`、出票中 `#2F7BFF`、已出票 `#22A45D`、退款 `#999999` |

字号：卡片标题 `32rpx`、正文 `25-28rpx`、辅助信息 `22-24rpx`、标签 `20rpx`。

## 三、关键决策记录（DR）

### DR-001 纯前端 + 本地存储，不引入任何后端
需求是「输出可直接运行的代码」。云开发需要 AppID 与云环境，会把「可直接运行」变成
「先配置环境」。因此全量数据走 `utils/mock.js`，订单落 `wx.setStorageSync`。
替换点集中在 `utils/mock.js` 与 `utils/store.js` 两个文件，页面层零改动。

### DR-002 海报用「渐变 + emoji + 片名」占位
真实电影海报有版权风险且无法内置。占位方案同时满足：不引入二进制资源、任意分辨率不失真、
片名可读。数据结构预留 `poster` 字段，填入真实地址后 `wx:if="{{item.poster}}"`
自动切到 `<image mode="aspectFill">`，无需改样式。

### DR-003 模拟数据必须「确定性」
若用 `Math.random()` 生成场次余票和座位图，用户每次进出选座页座位都会变，体验像 bug。
改用 `util.rngFrom(seed)`（mulberry32 + FNV-1a 哈希），以
`影院ID + 影片ID + 日期索引` 为种子，保证同一场次永远同一张座位图。
订单号、取票码仍用随机数，因为它们本来就该每次不同。

### DR-004 出票用「时间推进」而非定时器
「出票中 → 已出票」如果靠页面 `setInterval`，一旦退出页面就永远卡在出票中。
改为记录 `ticketingAt` 时间戳，`store.advanceTicketingOrders()` 在 `app.onShow`
和订单页 `onShow` 时判断是否已超过 5 秒。列表页另有 1.5s 轮询仅用于刷新界面，
不承担状态推进职责。

### DR-005 tabBar 图标用脚本生成 PNG
小程序 tabBar 只接受图片，不接受字体图标或 emoji。手绘 6 张 81×81 PNG 不现实，
改用 `tools/gen_tabbar_icons.py`（Pillow，4 倍超采样后 LANCZOS 缩放）
程序化生成「电影 / 影院 / 我的」两套配色，需要改风格时改脚本即可。

### DR-006 座位尺寸按列数动态计算
不同影厅 10~12 列、1~2 条过道。固定尺寸必然在某一档溢出。改为在 `seat.js` 里按
`可用宽度 600rpx` 反算单座边长（钳制在 `38~56rpx`），并把过道额外的 `24rpx`
计入。`tools/smoke.js` 中对 10/11/12 列三档做断言，保证「排号列 + 座位区 ≤ 670rpx」。

### DR-007 忽略 `tools/` 打包
`project.config.json` 的 `packOptions.ignore` 排除 `tools/`，开发脚本不进代码包。

### DR-008 影院导航用 `wx.openLocation`，坐标为 WGS-84/GCJ-02 实测值
影院详情页提供「导航」入口，调用 `wx.openLocation` 拉起系统地图展示影院位置并规划路线。
- 6 家影院在 `mock.js` 中补齐 `latitude` / `longitude`，取自地图服务实测坐标
  （GCJ-02，腾讯/高德口径一致），精度到小数点后 5~6 位。
- `app.json` 声明 `permission.scope.userLocation.desc`（17 字符，上限 30）。
  **注意：`openLocation` 不需要、也不能写进 `requiredPrivateInfos`** ——
  该字段只接受 8 个地理位置接口（`chooseAddress` / `chooseLocation` / `choosePoi` /
  `getFuzzyLocation` / `getLocation` / `onLocationChange` / `startLocationUpdate` /
  `startLocationUpdateBackground`）。写入 `openLocation` 会让开发者工具直接报
  `requiredPrivateInfos[0] 字段需为 ...` 并无法编译。
  `wx.openLocation` 属于「查看位置」而非「获取位置」，无需隐私声明，仅传坐标即可。
  若后续要做「按距离排序」，需改用 `getLocation` 并同步声明。
- `tools/check_project.py` 新增两项校验防止复发：
  (a) `requiredPrivateInfos` 取值白名单 —— 非法值直接报错，已声明但代码未调用则给警告；
  (b) `permission.scope.userLocation.desc` 存在性 + 30 字符上限。
  两项均已用「注入错误 → 检出错 → 还原」反向验证。
- `openLocation` 需要**数值型**经纬度，代码里用 `Number()` 显式转换，避免字符串导致静默失败。
- 缺坐标时降级提示「暂无该影院位置信息」，不抛异常。
- 导航按钮的向上箭头用 **CSS 三角形**绘制（`border` 技巧），不用 emoji —— emoji 在多端
  配色不可控，无法保证与主题红一致。
- `tools/smoke.js` 增加 4 项断言：坐标均为数值型、落在合法经纬度范围、
  落在北京城区范围内、含非空 `address`。

### DR-009 `openLocation` 不写入 `requiredPrivateInfos`（对 DR-008 的修正）

DR-008 初次实现时误把 `openLocation` 写进了 `requiredPrivateInfos`，导致开发者工具报
`requiredPrivateInfos[0] 字段需为 chooseAddress,...` 并无法编译。
根因是把「**查看**位置」与「**获取**位置」混为一谈：

| 能力 | 接口 | 是否需要 `requiredPrivateInfos` | 是否需要用户授权 |
| --- | --- | --- | --- |
| 查看/导航到指定坐标 | `wx.openLocation` | **不需要**（写了反而报错） | 不需要 |
| 读取用户当前定位 | `wx.getLocation` 等 8 个 | 需要，且值必须在白名单内 | 需要 |

结论：`openLocation` 只传 `latitude`/`longitude` 即可；`app.json` 里保留
`permission.scope.userLocation.desc` 作为兜底文案即可（当前用不到，但为「按距离排序」预留）。
`check_project.py` 已加白名单校验防复发，并做过反向注入验证。

### DR-010 影院详情页改造为「影院选片页」，完整还原参考图

用户提供第二张参考图后，确认按图 1:1 改造现有影院详情页（非新建页面）。

**页面新结构（自上而下）**
1. 海报轮播 `<swiper previous-margin="60rpx" next-margin="60rpx" circular="{{false}}">`
   —— 当前影片居中、左右相邻海报各露出 30px；非当前项 `scale(0.94)`，当前项 `scale(1)`。
2. 影片信息：片名 + 橙色评分徽章（同行居中）；下一行「时长 · 类型」+ 红色「展开」；
   点「展开」显示剧情简介（`m-intro`）。
3. 日期条：今天 / 明天 / 后天，选中项红色加粗，今天额外显示 `mmdd`。
4. 场次概览：「N场 ¥最低-最高元」左对齐，「原价¥X起」右对齐。
5. 场次横向行：左（开始时间 / 语言·制式标签 / 影厅名）+ 中（价格 / 折扣徽章 + 原价划线）+
   右（购票按钮 / 已停售灰按钮）+ 卡片底部整宽「M月D日 HH:MM:SS 停止售票」提示条。

**原影院信息头（名称 / 地址 / 电话 / 标签 / 导航按钮）已按新参考图移除**，
`openLocation()` 与 `callPhone()` 方法保留在 js 中（后续可能移回或在别处复用）。

**新增数据字段**（`mock.getShowtimes` 输出）
- `langShort`：`汉语普通话` → `国语`，其余取括号前主语言。
- `fmtShort`：去掉 `IMAX/CINITY/杜比全景声/中国巨幕` 前缀后的制式，如 `2D`。
- `tagText`：`langShort + ' ' + fmtShort`，如 `国语 2D`。
- `stopped`：仅 `dayIndex === 0`（今天）且开场时间 ≤ 当前时间 + 5 分钟时为 `true`。
  **明天/后天的场次永不停售**。
- `stopSellText`：开场前 5 分钟的时刻，如 `18:25:00`，用于卡片底部提示条。

**交互拦截**：`goSeat` 首行判断 `if (slot.stopped) { util.toast('该场次已停止售票'); return; }`，
停售行整行 `opacity: 0.55`、价格变灰、按钮变「已停售」灰底且不显示提示条。

**渲染自查补充**：`build_preview.js` 的 `SHELL_CSS` 新增
`.poster-swiper { overflow: hidden }` + `.poster-track { display: flex }` +
`.poster-slide { flex: 0 0 315px; width: 315px }`，并在 JS 侧用
`translateX(187.5 - (i*323 + 4 + 157.5))` 把当前项顶到容器中心
（slide 315px + 左右 margin 各 4px = 步进 323px，容器 375px）。
> 踩坑：最初只写 `justify-content: center`，6 张 slide 总宽 1938px 远超容器，
> flex 居中的是**整行中点**而非当前项，截图里显示的是第 2、3 张的交界。
> 必须显式算 translateX 才能等价于 swiper 的「当前项居中」。

## 四、验证记录

| 验证方式 | 覆盖内容 | 结果 |
| --- | --- | --- |
| `tools/check_project.py` | JSON 可解析、JS 语法（node --check）、WXML 标签闭合与属性重复、13 个页面四件套齐全、6 张 tabBar 图标存在、插值内无函数调用 | ✓ 无错误 |
| `tools/smoke.js` | util 格式化/跨天时间/订单号；影片与场次数量、场次字段完整性、确定性；座位图行列/总数/已售数/过道索引；搜索命中；影院最低价与**坐标完整性（数值型 / 合法范围 / 北京城区 / 非空地址）**；城市与登录态读写；历史去重与 10 条上限；订单全状态流转与自动出票 | ✓ 67/67 |
| `tools/build_preview.js` + 无头 Chrome | 以 375px 视口把 WXSS/WXML 等价渲染成 HTML，逐屏截图与参考图比对（含影院选片屏，验证海报轮播 / 影片信息 / 日期条 / 场次横向行） | 见 `tools/shot-*.png` |

渲染自查中定位并修复的真实问题：
1. 影片卡片右侧留给「购票」按钮的空间过宽，导致「时长/类型/语言」提前换行 → 收紧 `padding-right`、缩小 `.meta` 间距。
2. 导演名被主演挤掉出现省略号 → 新增 `.v-dir { flex-shrink: 0 }`。
3. 选座页图例一行放不下被压成竖排 → 图例改为可换行、提示文案独占一行。
4. 座位区存在越界风险 → 可用宽度从 626rpx 收紧到 600rpx 留安全余量。
5. 影院选片页「展开」被挤到独立一行 → 改为 `.m-meta-row` 包住「时长·类型」+「展开」，同行居中。
6. 影院选片页海报只露出 1.8 张（应为当前项居中 + 左右各露 30px）→ 见 DR-010 的 translateX 方案。
7. 海报过扁（340rpx 容器 / 300rpx 卡）→ 提到 400rpx / 360rpx，比例更接近参考图。

> 注意：`tools/build_preview.js` 把多个页面的 WXSS 合并进同一份样式表，
> 因此出现过 `.screen` 类名互相覆盖（选座页的银幕指示条 vs 预览外壳）。
> 小程序里每个页面的 WXSS 是**页面级隔离**的，不存在这个问题。

## 五、迭代日志

- **2026-09-14 / 迭代 1（本次）**：完成 13 个页面、完整购票链路、订单状态机、
  本地存储、确定性问题数据源、tabBar 图标生成、静态自检与冒烟测试、四屏渲染自查。
- **2026-09-14 / 迭代 2**：影院详情页新增**导航功能**（DR-008）。补齐 6 家影院经纬度、
  接入 `wx.openLocation`、声明 `requiredPrivateInfos`、导航按钮按参考图还原
  （浅红底 + 红字 + CSS 三角箭头）。冒烟测试 63 → 67 项，新增影院详情屏渲染自查。
  > 后续修正：`openLocation` 不属于 `requiredPrivateInfos` 的合法值（该字段只接受 8 个
  > **获取**位置类接口），已移除该字段，改用 `permission.scope.userLocation.desc`。详见 DR-009。
- **2026-09-14 / 迭代 2.1**：`app.json` 移除非法 `requiredPrivateInfos`，修复编译报错；
  `check_project.py` 新增该字段白名单与 `permission` 描述长度（≤30 字符）校验，
  并做反向注入验证。
- **2026-09-14 / 迭代 2.2**：按参考图把影院详情页整体改造为**影院选片页**（DR-010）。
  页面结构改为「海报轮播 swiper → 影片信息 → 日期条 → 场次概览 → 场次横向行」，
  移除原影院信息头（名称/地址/电话/导航按钮）。

## 六、已知取舍

- 微信登录为演示实现：首次启动写入演示账号「微信用户」，`退出登录` 可切到未登录态
  并验证登录弹窗；未接 `wx.login` + 后端换取 OpenID。
- 支付为 `wx.showModal` 模拟，未接 `wx.requestPayment`。
- 在线客服需在小程序后台配置客服会话，当前以弹窗 + 客服电话兜底。
- 影院与影片为演示数据，非真实排片。
