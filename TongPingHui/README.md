# 同屏会（TongPingHui）

![项目状态](https://img.shields.io/badge/项目状态-开发中-orange)
![平台](https://img.shields.io/badge/平台-Android-3DDC84)
![用途](https://img.shields.io/badge/用途-公司内部会议-blue)

> **状态：开发中（WIP）** —— 功能仍在快速迭代，接口与行为可能变化，请勿用于生产环境。

公司内部多人视频会议 App（仅 Android，内部打包 APK 分发）。

## 功能进度

### 已完成

- 登录 / 注册（JWT 会话，后端签发；本地持久化）
- 个人信息：相册选头像并上传、昵称/部门编辑、修改密码
- 会议列表：搜索、状态标签、删除（仅发起人）、「上次的会议」一键重进
- 视频会议房间：自适应九宫格、焦点布局、发言高亮、成员列表、会议计时
- 屏幕共享（TUIRoomKit 内置实现，含 Android 14 前台服务适配）
- 后端：登录鉴权、会议、UserSig 签发（官方 TLS-SHA256 算法，已逐字节比对验证）、头像上传
- 自检脚本 15 项全通过；构建脚本一键出 APK

### 进行中 / 未完成

- 真机双人 / 多人联调（音视频质量、断线重连、回声抑制等实际效果）
- 会议密码入会、邀请入会（二维码/链接）、会中文字聊天
- 成员管理（禁麦、踢人）、AI 纪要 / 实时字幕（官方组件待接入）
- 内部分发与版本更新检查、崩溃上报、release 混淆验证
- TRTC 体验版 **2026-09-22 到期**，需续期或转正式版

---

- 语言/UI：Kotlin + Jetpack Compose
- 音视频：腾讯云 TRTC / TUIRoomKit（含 UI 低代码集成）
- 屏幕共享：Android 原生 MediaProjection + 前台服务
- 后端：Node.js + Express（登录鉴权、个人信息、会议、UserSig 签发）

---

## 〇、当前状态：**已编译通过，APK 可安装**

```
> Task :app:assembleDebug
BUILD SUCCESSFUL in 14s
97 actionable tasks: 9 executed, 88 up-to-date
```

产物：`app/build/outputs/apk/debug/app-debug.apk`（约 **85 MB**，debug 未混淆 + 两个 arm ABI）

```
package: com.tongpinghui.conference  versionName='1.0.0'
application-label: 同屏会
compileSdkVersion 34 / targetSdkVersion 34
权限: INTERNET · CAMERA · RECORD_AUDIO · FOREGROUND_SERVICE_MEDIA_PROJECTION
内含: 31 个 dex，arm64-v8a / armeabi-v7a 的 libliteavsdk.so、libtxffmpeg.so
```

装到真机：

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
# 或直接双击 tools\build-apk.bat 重新构建（会自动钉好 JDK 17 并留全量日志）
```

> ⚠️ 构建时若环境里设过 `GRADLE_USER_HOME`（本机是 `D:\Android\.gradle`），
> 依赖缓存就在那里，不在 `~/.gradle`。排查“明明下过却报找不到”时先确认这一点。

---

## 一、目录结构

```
Multi-userMeetingApp/
├── app/                          业务 App（Compose）
│   └── src/main/java/com/tongpinghui/conference/
│       ├── App.kt                      Application
│       ├── MainActivity.kt             登录 / 会议列表 / 个人信息（单 Activity + Compose 导航）
│       ├── core/ServiceLocator.kt      极简依赖容器（未用 Hilt，避免 KSP 版本坑）
│       ├── data/remote/                Retrofit 接口 + OkHttp + DTO
│       ├── data/local/TokenStore.kt    会话持久化（DataStore）
│       ├── data/local/LastMeetingStore.kt  「上次的会议」（独立 DataStore，退出登录不清除）
│       ├── data/repository/            仓储层（统一 Result 收敛）
│       ├── trtc/                       TRTC 配置 + UserSig 本地调试生成
│       ├── service/ScreenShareService.kt  屏幕共享前台服务（mediaProjection 类型）
│       └── ui/                         theme / component / login / meeting / profile / room
├── room/tuiroomkit/              ← TUIRoomKit 组件（腾讯官方源码，拉取而来）
├── atomic_x/                     ← AtomicXCore 组件（腾讯官方源码）
├── chat/uikit/                   ← 聊天/成员列表 UI（tuiroomkit 内部依赖）
├── server/                       后端模板（Node + Express）
├── tools/fetch_tuikit.sh         一键拉取上面三个组件（末尾自动调用 patch_tuikit.sh）
├── tools/patch_tuikit.sh         修补 tuiroomkit 源码与 atomicx-core 4.3.x 的 8 处类型问题
├── tools/build-apk.bat           双击即构建（钉 JDK 17，全量日志写 tools/build-log.txt）
├── local.properties.template     ← 复制成 local.properties 后填真实值
└── gradle/libs.versions.toml     版本清单
```

## 二、四步跑起来

### 1. 拉取 TUIRoomKit 组件（必须，官方不走 Maven）

```bash
bash tools/fetch_tuikit.sh
```

> 已经拉好了（本仓库当前就带着这三个目录）。换机器/重装时才需要重跑。

### 2. 配置 `local.properties`

复制 `local.properties.template` 为 `local.properties`，至少改这几项：

```properties
sdk.dir=D\:\\Android\\Sdk
TRTC_SDK_APP_ID=1600162594
TRTC_SDK_SECRET_KEY=      # ⚠️ 见下方「待办」
API_BASE_URL=http://192.168.1.100:8080/   # 换成你电脑的局域网 IP
```

### 3. SDKSecretKey 与 UserSig：已配置 ✅（格式已对齐官方）

`server/.env` 里已填好 `TRTC_SDK_SECRET_KEY`，服务端签发链路实测可用：

```
GET /api/v1/trtc/config          → {"sdkAppId":1600162594,"secretKeyConfigured":true,...}
GET /api/v1/trtc/usersig?userId=u_zhangsan → code=0，userSig 长度 200
GET /api/v1/trtc/usersig?userId=u_someoneelse → 403（归属校验生效）
node tools/smoke-test.js         → 15/15 通过（含「UserSig 可解码」断言）
```

**⚠️ UserSig 的算法有三个必须照抄的点**（`server/src/utils/userSig.js`）：

1. HMAC-SHA256 的输入是**明文键值块**（不是 JSON），四行、顺序固定、每行以 `\n` 结尾：
   `TLS.identifier:<uid>` / `TLS.sdkappid:<appid>` / `TLS.time:<秒>` / `TLS.expire:<秒>`
2. 把 5 个字段 + `TLS.sig` 组成 JSON（字段顺序也对齐官方：`time` 在 `expire` 之前）
3. **先 zlib deflate 压缩再 base64**，最后把 `+`→`*`、`/`→`-`、`=`→`_`

> 漏掉第 3 步的压缩，会得到一张"看着像 base64"但腾讯云判为非法的票据 ——
> 进房时报 **70003 The UserSig in use is illegal**。本项目就这么踩过，现在已修好，
> 并且用官方库 `tls-sig-api-v2` 做了**逐字节比对**（固定时间戳下输出完全一致）。
> 换实现或换语言时，请照样跑一遍这个比对，别凭感觉。

客户端 `local.properties` 的 `TRTC_SDK_SECRET_KEY` **保持留空**（正式方案就是客户端不留密钥，
服务端签发；留空时 App 走服务端那一级，不会报错）。`trtc/TrtcUserSig.kt` 里的本地生成器
也是同一套算法，仅调试兜底用。

同时确认体验版有效期：**2026-09-22 到期**，到期前记得续或转正式版。

### 4. 启动 / 停止后端

| 操作 | 做法 |
| --- | --- |
| **启动** | 双击 `server\tools\start-server.bat`（node 不在 PATH 时会自动回退到系统安装目录；`node_modules` 缺失会自动 `npm install`）。窗口保持开着就是在服务 |
| **停止** | ①在那个窗口按 `Ctrl+C` 或直接关窗口；②或双击 `server\tools\stop-server.bat` —— 它只杀占用 8080 的那个进程，**不会**误伤其它 node 程序（VS Code 等） |
| 验证 | 浏览器开 `http://127.0.0.1:8080/health`，返回 `{"code":0,...}` 即在服务 |

命令行方式（等价）：

```bash
cd server
node src/index.js        # 启动；Ctrl+C 停止
npm start                # 同上
```

首次启动会自动创建账号 `admin / admin123`。
在**任意目录**下执行 `node server/src/index.js` 也可以 —— `.env` 和数据文件都按 server 目录定位，不依赖当前目录。

**手机要能连上**：App 里的地址是 `local.properties` 的 `API_BASE_URL`，本机当前是
`http://192.168.31.87:8080/`（电脑与手机必须同一个 WiFi，换网络要改这个值）。
验证方式：手机浏览器打开 `http://192.168.31.87:8080/health`，应返回
`{"code":0,"message":"ok","data":"alive"}`。
若打不开 → 让 `node.exe` 通过 Windows 防火墙（专用网络），或为 TCP 8080 加一条入站规则。

#### 内部账号

| 账号 | 密码 | 昵称 / 部门 | 腾讯云 userId |
| --- | --- | --- | --- |
| `admin` | `admin123` | 管理员 / IT 部 | `u_admin` |
| `zhangsan` | `123456` | 张三 / 产品部 | `u_zhangsan` |
| `lisi` | `123456` | 李四 / 技术部 | `u_lisi` |

给同事开账号（走 HTTP 接口，幂等：已存在则只刷新昵称/部门，不改密码）：

```bash
cd server
node tools/create-user.js wangwu 123456 王五 市场部
```

> 别用脚本直接改 `server/data/db.json`：服务端把库缓存在内存里，直接改文件会被下一次写入覆盖。
> 数据文件路径由 `.env` 的 `DATA_FILE` 决定（默认 `./data/db.json`）。

### 5. 编译安装

Android Studio 打开工程 → Sync → 选真机 → Run。
出 APK：`./gradlew assembleDebug`，产物在 `app/build/outputs/apk/debug/`。

---

## 三、接口一览（后端已实现）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/login` | 登录，返回 JWT |
| POST | `/api/v1/auth/logout` | 退出 |
| GET | `/api/v1/users/me` | 我的资料 |
| PUT | `/api/v1/users/me` | 改昵称/头像/部门 |
| PUT | `/api/v1/users/me/password` | 改密码 |
| POST | `/api/v1/users/me/avatar` | 上传头像（multipart，字段名 `file`，≤5MB） |
| GET | `/uploads/xxx.jpg` | 头像静态访问（用户信息里返回绝对地址） |
| GET | `/api/v1/meetings` | 会议列表 |
| POST | `/api/v1/meetings` | 新建会议（服务端生成 9 位房间号） |
| GET | `/api/v1/meetings/{id}` | 会议详情 |
| DELETE | `/api/v1/meetings/{id}` | 删除（仅发起人） |
| GET | `/api/v1/trtc/usersig?userId=` | 签发腾讯云 UserSig |
| GET | `/api/v1/trtc/config` | 自检密钥是否已配置 |

## 四、界面骨架（第 2 步）

| 界面 | 文件 | 已实现 |
| --- | --- | --- |
| 登录 | `ui/login/LoginScreen.kt` | 品牌头、账号/密码校验、密码明文切换、回车登录、密钥未配置自检提示 |
| 会议列表 | `ui/meeting/MeetingListScreen.kt` | 搜索（会议名/房号/发起人）、**「上次的会议」一键重进**、状态标签（进行中/待开始/已结束）、加入/新建会议、复制房间号、删除（仅发起人）、空态与错误重试 |
| 个人信息 | `ui/profile/ProfileScreen.kt` | 相册选头像并上传（Coil 加载 + 首字回退）、昵称/部门编辑、修改密码弹窗、退出登录二次确认；TRTC userId 属实现细节，只在 debug 包显示 |
| 会议房间 | `ui/room/MeetingRoomScreen.kt` | **九宫格自适应（1/2/3/4 列）**、点击放大为焦点布局 + 下方缩略条、发言者绿色描边高亮、静音/关摄像头角标、房主标记、共享中标记、计时、成员列表弹窗、底部控制栏（麦克风 / 摄像头 / **共享屏幕** / 成员 / 离开）、离开二次确认 |
| 屏幕共享 | `service/ScreenShareService.kt` + `MeetingRoomActivity` | MediaProjection 授权 → 前台服务（`mediaProjection` 类型）→ 常驻通知 → 一键停止；共享中顶部红条提示 |

数据来源：第 3 步接上 TUIRoomKit 之后，会议房间的成员、音量、麦摄、共享状态**全部来自 SDK 真实数据**
（见下一节）；只有在没连上房间时（DEBUG 预览）才退回一份演示数据，并在界面右上角标「演示数据」。

### UI 约定：系统栏内边距与触摸目标（踩过坑，新页面请照做）

`MainActivity` / `MeetingRoomActivity` 都调了 `enableEdgeToEdge()`，内容会画到状态栏/导航栏底下。
**所以每个界面都要自己处理 insets**，否则会出现「按钮被状态栏压住、点不动」：

| 位置 | 做法 |
| --- | --- |
| 顶部 | 统一由 `AppTopBar` 负责：`windowInsetsPadding(WindowInsets.statusBars)` + 56dp 高。新页面别自己写裸 `Row` 当顶栏 |
| 底部 | 悬浮按钮 / 底部控制栏 / 可滚动内容的最后一项：`navigationBarsPadding()`；列表用 `contentPadding` 给悬浮按钮留 96dp |
| 键盘 | 登录这类带输入框的页面加 `imePadding()`，否则「登录」按钮会被输入法盖住 |
| 深色页面 | 会议页是深色底，`enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(...))` 把状态栏图标换成浅色，否则看不见 |
| 应用图标 | `ic_launcher_foreground.xml` 是 108×108 画布，**所有元素都要以 x=54 为中轴**。改图标时别凭眼睛看，用脚本量一遍（本项目踩过：屏幕元素中轴在 x=50、底座在 54，整体偏左 4dp） |

**触摸目标不小于 48dp**（Material 的最小可点尺寸），"看得见的大小"和"可点范围"要分开控制：

- 顶栏返回键：`IconButton(Modifier.size(48.dp))`，图标本身 26dp，好按也好看；
- 右上角头像：用 `AvatarButton`（触摸区 48dp，头像可见 34dp）—— 之前把 30dp 的 `Avatar` 直接塞进
  `IconButton` 且贴着屏幕右上角，实测很难点中。

## 五、TUIRoomKit 集成（第 3 步）

### 进房链路（`MeetingRoomActivity.prepare()`）

```
1. 取 UserSig   后端 /api/v1/trtc/usersig 签发
                ↓ 失败则本地兜底：SDKSecretKey 现算 → TRTC_TEST_USER_SIG 临时票据
2. 登录腾讯云   LoginStore.shared.login(context, sdkAppId, userId, userSig, handler)
                成功后 LoginStore.shared.setSelfInfo(UserProfile(userID, nickname, avatarURL))
3. 进房        RoomStore.shared().createAndJoinRoom(roomId, RoomType.STANDARD, CreateRoomOptions(roomName))
              或 RoomStore.shared().joinRoom(roomId, RoomType.STANDARD, password, completion)
4. 数据订阅    RoomParticipantStore.create(roomId)
                ├─ state.participantList      全部成员
                ├─ state.localParticipant     自己的麦/摄/共享状态
                ├─ state.participantWithScreen 谁在共享屏幕
                └─ state.speakingUsers        音量表（>25 判定为「正在说话」）
5. 退出        leaveRoom（房主可选 endRoom 直接结束会议）
```

对应代码：
- `trtc/TrtcRoomKitManager.kt` —— 登录态、UserSig 三级兜底、设置昵称头像、兜底退房
- `trtc/RoomSession.kt` —— 进房/退房/成员流/麦克风/摄像头/屏幕共享的统一封装
- `ui/room/MeetingRoomViewModel.kt` —— 把 SDK 数据流映射成界面模型（含「谁在说话」高亮）
- `ui/room/ParticipantVideoView.kt` —— 一路视频画面（`RoomParticipantView` 的薄封装）

### 两种房间界面，二选一

| 模式 | 怎么开 | 说明 |
| --- | --- | --- |
| **CUSTOM**（默认） | 不用改，默认就是 | 第 2 步那套 Compose 九宫格 + TUIRoomKit 内核，画面走 `RoomParticipantView`，界面完全自定义 |
| **SDK** | `MeetingRoomActivity.uiMode = UiMode.SDK` | 直接嵌腾讯官方的 `RoomMainView`（含 UI 低代码集成），成员管理/聊天/邀请全都有 |

> 两种模式**不能同时用**：`RoomMainView` 内部自己会 createAndJoin，走 SDK 模式时不要再调 `RoomSession` 进房。

### 屏幕共享的两条路

| 方式 | 开关 | 说明 |
| --- | --- | --- |
| **SDK 实现**（默认） | `MeetingRoomActivity.USE_SDK_SCREEN_SHARE = true` | `DeviceOperator(context).startScreenShare()`。SDK 内部就是 **MediaProjection + 前台服务**，还会处理悬浮窗权限申请，`FOREGROUND_SERVICE_MEDIA_PROJECTION` 权限已由组件声明 |
| 自研实现 | 置为 `false` | 用工程里的 `ScreenShareService`（`mediaProjection` 类型前台服务）+ 自己的 MediaProjection 授权流程；把投影交给引擎推流那一步留了 TODO（接口签名以 `rtc_room_engine` 的 AAR 为准） |

无论哪条路，`AndroidManifest.xml` 里的权限/服务声明都已齐备，共享状态统一从 `localParticipant.screenShareStatus` 读。

### 进房失败排查

| 错误码 | 含义 |
| --- | --- |
| `100018` | 房间需要密码（会弹密码框） |
| `100019` | 房间密码不正确 |
| `70003` | **UserSig 非法**（格式/签名不对）。最常见原因：签发时漏了 zlib deflate，或 HMAC 签的是 JSON 而不是明文块，或 SDKSecretKey 不对 —— 见第 3 节的三个要点。`node tools/smoke-test.js` 的「UserSig 可解码」用例能提前抓到 |
| `70001 / 70002` | 请求被限频 / 参数非法；票据过期也会落在这个区间 —— 检查后端密钥与 `userId` 是否一致（我们统一用 `u_<账号>`） |
| **`-1002`（`SDK_NOT_INITIALIZED`，desc 里是 "not inited" / "not logged in"）** | **登录回调返回 ≠ SDK 就绪**：`LoginStore.login` 的 onSuccess 之后，SDK 内部把 `loginState.loginStatus` 切到 `LOGINED` 还要一小会儿；此时立刻进房就会拿到 -1002，表现为「第一次进房必失败，手动重试才进得去」。**已修**：①`TrtcRoomKitManager.login` 登录后用 `awaitLoggedIn()` 等 `loginStatus == LOGINED`（3s 超时）；②`RoomSession` 对 -1002 自动重试（最多 4 次 × 400ms）。 |
| 进房后看不到画面 | 摄像头权限没给；或对方摄像头关着（此时显示头像属正常） |

## 六、在 IDE 里预览界面（不用真机）

前提只有一个：**工程 Sync 成功**（Gradle JDK 必须选 17，见上面的 JDK 报错那一节）。

### 步骤

1. 打开 `app/src/main/java/com/tongpinghui/conference/ui/PreviewGallery.kt`
2. 编辑器右上角把视图从 **Code** 切到 **Split** 或 **Design** —— 右侧会列出全部 13 个预览：
   - 房间：九宫格 5 人 / 2 人 / 9 人、焦点放大、别人共享中、我在共享、演示数据
   - 登录页、登录页报错
   - 会议列表、会议列表空态
   - 个人信息、个人信息同步失败
   - 组件库：头像、按钮与状态标签、加载/空态/错误条
3. 也可以点单个 `@Preview` 函数左边的图标单独渲染；改代码后点工具栏的 ⟳ **Refresh** 刷新
4. 想看成深色：Design 面板右上角切换，或给 `@Preview` 加 `uiMode = UI_MODE_NIGHT_YES`

### 预览看不到什么（重要）

| 看不到 | 原因 / 替代 |
| --- | --- |
| 会议里的**真实视频画面** | `RoomParticipantView` 需要真实房间与音视频流，预览是静态渲染，所以画面位显示头像。要看真画面必须真机跑 |
| 真实数据（会议列表、个人资料） | 预览不会执行 `Application.onCreate`，也不会发网络请求。所以页面都拆成了 `XxxRoute`（有状态，连 ViewModel）+ `XxxScreen`（纯界面，接受 state）——预览的是后者，用假数据 |
| SDK 弹窗、授权框 | 系统级交互，只能真机验证 |

### 为什么页面拆成了两个函数

```kotlin
MeetingListRoute(onOpenProfile, viewModel = viewModel())   // 有状态：连 VM、拿网络数据、发射副作用
MeetingListScreen(state, 一堆回调)                          // 纯界面：@Preview 直接调它
```

这是 Compose 的标准做法，好处是预览不需要 ViewModel/网络/Context，坏处是多一层转发。四个页面里
登录、会议列表、个人信息都按这个方式拆了；会议房间页本来就是纯界面（`MeetingRoomScreen`）。

### 其它比预览更「真」的方式

| 方式 | 命令/入口 | 适合 |
| --- | --- | --- |
| 真机 Run | Android Studio ▶（USB 调试） | 唯一能验证音视频/共享的方式 |
| 模拟器 | Device Manager | 只适合看 UI 流程。**TRTC 没有 x86 so，进会议会崩**，别用来测会议 |
| Live Edit | AS 2024+，真机/模拟器上改代码即时生效 | 调间距、颜色最快 |
| Layout Inspector | 连设备后 Tools → Layout Inspector | 看运行中界面的层级与真实视频网格 |

## 七、首次编译自检清单

我已经能在这里验的都验过了：资源引用（5/5 解析）、XML 格式（8/8）、Manifest 类名（4/4）、
26 个 Kotlin 文件的 package 与目录一致性。

**配置阶段也在本机实测跑通了**（Gradle 8.11.1 + JDK 17，离线）：

```
$ ./gradlew.bat projects --offline
> Task :projects
Root project 'TongPingHui'
+--- Project ':app'
+--- Project ':atomic_x'
+--- Project ':chatuikit'
\--- Project ':tuiroomkit'
BUILD SUCCESSFUL in 1s
```

| 检查项 | 状态 |
| --- | --- |
| Gradle 8.11.1 / JDK 17 / wrapper | ✅ `--version` 正常（Launcher JVM 17.0.9） |
| 四个模块（app + 三个腾讯组件） | ✅ `projects` 全部列出 |
| AGP 8.7.3 / Kotlin 2.1.21 插件解析 | ✅ 配置阶段跑通 |
| platform 34 / 35 | ✅ 已装（19:15 由 SDK Manager 补装） |
| build-tools 34.0.0 缺失 | ✅ 已修（根脚本统一顶到 36.0.0），实测报错已推进到依赖解析 |
| **依赖下载** | ✅ 已全部下载（约 35 个模块，35MB+，腾讯侧走 mirrors.tencent.com） |
| **腾讯组件源码编译** | ✅ `atomic_x` / `chatuikit` 原样通过；`tuiroomkit` 需要 8 处类型修补（见下） |
| **完整 assembleDebug + APK** | ✅ `BUILD SUCCESSFUL in 14s`，产物 85MB 已验证 |

### 按顺序做

0. **装齐两个 SDK 平台包**（原先 `D:\Android\Sdk` 里只有 `android-37.0`，缺 34 和 35）
   `Settings → Languages & Frameworks → Android SDK → SDK Platforms` 勾上：
   - **Android 14.0 (API 34)** —— `app` / `atomic_x` / `tuiroomkit` 用
   - **Android 15.0 (API 35)** —— `chatuikit` 用（官方就是 35）

   不装会报 `Failed to find target with hash string 'android-34' in: D:\Android\Sdk`。
1. **确认 Gradle JDK = 17**
   `Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK` → 选 `C:\Program Files\Java\jdk-17`
2. **Sync**（第一次会下载不少东西，耐心等；下载清单见下）
3. Sync 成功后 → `Build → Make Project`（或直接 Run 到真机）
4. 然后在真机上按顺序验：登录 → 会议列表 → 新建会议 → 进房看画面/共享

> 命令行党直接双击 `tools\build-apk.bat`：它会把 `JAVA_HOME` 钉到 JDK 17，依次打印
> `--version` 与 `projects` 结果、执行 `:app:assembleDebug`，最后给出 APK 路径。
> **完整日志固定写在 `tools\build-log.txt`**（每一步 + 全部报错），失败时脚本还会把日志尾部
> 45 行打到屏幕上 —— 排查时看这个文件就够，不用复制粘贴。

### 首次 Sync 会下载什么（大约 500MB+）

| 内容 | 说明 |
| --- | --- |
| Gradle 8.11.1 | ~130MB，来自 services.gradle.org |
| Android platform **34** | `app` / `atomic_x` / `tuiroomkit` 用（**必装，见第 0 步**） |
| Android platform **35** | `chatuikit` 用的是 35（官方这么写），**也要装** |
| build-tools **36.0.0** | 已装在机器上；根 `build.gradle.kts` 里把三个腾讯模块也统一顶到 36.0.0（否则 AGP 会去找 34.0.0） |
| AGP 8.7.3 + Kotlin 2.1.21 插件 | 来自 google() / mavenCentral() |
| 腾讯 SDK | `rtc_room_engine`、`atomicx-core`、`LiteAVSDK_Professional`（~100MB）、`imsdk-plus`、`tuicore`、`albumpicker` —— 走 **mirrors.tencent.com** |

> 公司网络如果拦了腾讯镜像，会在依赖解析阶段报 `Could not resolve com.tencent...`。
> 处理：换网络 / 配公司代理（`gradle.properties` 里加 `systemProp.https.proxyHost` 等），
> 或把 `settings.gradle.kts` 里的腾讯仓库换成公司内网 Nexus 代理地址。

### 报错对症表

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `Found invalid Gradle JVM configuration` | Gradle JDK 还是 25 | 回到第 1 步，选 17 |
| `Could not find or load main class org.gradle.wrapper.GradleWrapperMain` | wrapper 文件被清掉了 | 重新生成（见文末命令） |
| `Failed to find target with hash string 'android-34'` | platform 34 没装（你机器上只有 `android-37.0`） | 装 Android 14 (API 34) + Android 15 (API 35)，见第 0 步 |
| `This version only understands SDK XML versions up to 3 but ... version 4 was encountered` | SDK 里的 `android-37.0` 包由新版工具写入（API 37 那套带小版本号的命名），AGP 8.7.3 的 sdklib 读不了它 | **通常无害**——34/35 是老格式。但若装完 34 仍报「找不到 target」，说明 AGP 太旧，把 `libs.versions.toml` 里的 AGP 升到 8.9+（Kotlin 保持 2.1.21 不动） |
| `Attribute application@usesCleartextTraffic ... also present at ...` | Manifest 合并冲突（腾讯 SDK 的 AAR 也声明了同名属性） | 在 `app/src/main/AndroidManifest.xml` 的 `<application>` 上加 `tools:replace="android:allowBackup,android:usesCleartextTraffic"`（按报错里的属性名加） |
| `Could not resolve com.tencent.*` / `io.trtc.uikit:*` | 腾讯镜像不通 | 见上面的网络处理 |
| `Dependency ... requires compileSdk 35` | 某个依赖被我写高了 | 把 `gradle/libs.versions.toml` 里对应库降档（`coil 2.7.0`、`compose BOM 2024.12.01`、`activity 1.9.3`、`core-ktx 1.13.1`、`lifecycle 2.8.7` 都是 34 能用的上限，别升） |
| `kotlinOptions` 报 error | Kotlin 被升到 2.2+ | 改回 `2.1.21`（腾讯组件源码用了这个废弃 DSL） |
| `Unresolved reference: RoomParticipantView` 之类 | `atomic_x` / `tuiroomkit` / `chatuikit` 没被 include | 确认三个目录在工程根、`settings.gradle.kts` 里 include 命中 |
| `Java heap space` | 内存不够 | `gradle.properties` 里 `-Xmx4096m` 调到 `-Xmx6144m` |
| `Failed to find Build Tools revision 34.0.0` | 腾讯那三个模块没写 `buildToolsVersion`，AGP 8.7.3 默认去找 34.0.0，而机器上只装了 36.0.0 | **已修**：根 `build.gradle.kts` 用 `subprojects { plugins.withId("com.android.library") { … buildToolsVersion = "36.0.0" } }` 统一顶掉。换机器时改根脚本里的 `val buildTools`，与 `sdk/build-tools` 下的目录名一致 |
| `Task '--Sync' not found in root project ...` | 把 IDE 的 Sync 当成命令行任务了 | 用 `gradlew :app:assembleDebug`，或直接双击 `tools\build-apk.bat` |

### 贴报错给我时，带这两样最快定位

```
1) 最省事的：双击一次 tools\build-apk.bat，然后说一句"失败了" ——
   完整日志在 tools\build-log.txt，直接看这个文件就行
2) 或者在 IDE 里：Build 窗口第一条 Error（不是 Warning）的完整文字
3) 或者命令行跑一次，把最后的 20 行发我：
   ./gradlew :app:assembleDebug --stacktrace
```

### （备用）重新生成 wrapper

```bash
mkdir -p /tmp/wrapgen && cd /tmp/wrapgen
echo 'rootProject.name = "wrapgen"' > settings.gradle.kts
JAVA_HOME='C:\Program Files\Java\jdk-17' \
  "$HOME/.gradle/wrapper/dists/gradle-8.5-bin/5t9huq95ubn472n8rpzujfbqh/gradle-8.5/bin/gradle.bat" wrapper
# 然后把 gradlew / gradlew.bat / gradle/wrapper/gradle-wrapper.jar 拷回工程
```

## 八、几个必须知道的坑

1. **腾讯组件的引擎版本别乱统一**（踩过）：
   `atomic_x` 自己写的默认是 `rtc_room_engine / atomicx-core:4.3.0.25`，而 `tuiroomkit`
   写的是 `4.2.0.28`；官方 demo 的做法是两边都用 `latest.release`，即**必须同一套版本**。
   Gradle 取最高版本后是 4.3.0.25，而这个版本把「预约会议」的
   `RoomInfo.scheduledStartTime` / `ScheduleRoomOptions.scheduleStartTime` 从 `Int` 改成了
   `Long`，tuiroomkit 的源码还是旧的 `Int` 写法，于是编译失败：

   ```
   e: RoomHomeActivity.kt:33:34 Argument type mismatch: actual type is 'Int', but 'Long' was expected.
   e: RoomScheduleView.kt:389:33 Assignment type mismatch: actual type is 'Int', but 'Long' was expected.
   ```

   处理：`tools/patch_tuikit.sh` 把这两个文件的 8 处对齐成 `Long`（顺带修掉一个真 bug ——
   写入用 `putExtra(..., Long)`、读取却用 `getIntExtra`，改成 `getLongExtra` 才配对）。
   该脚本已挂到 `tools/fetch_tuikit.sh` 末尾，**重新拉取组件后会自动重新打补丁**。
   版本相关代码只碰这两处，不影响其它功能。
2. **Kotlin 不要升到 2.2.x**：TUIRoomKit 源码里用了 `kotlinOptions {}`，Kotlin 2.2 起该 DSL 直接报错。当前锁在 `2.1.21`。
3. **compileSdk 保持 34**：与腾讯组件、`LiteAVSDK_Professional` 对齐。官方 demo 也是 34。
4. **abiFilters 只留 arm**：TRTC 不提供 x86 so，别用 x86 模拟器跑会议。
5. `AndroidManifest` 里 `tools:replace="android:allowBackup"` 是腾讯官方要求的，删了会合并冲突。
6. 屏幕共享在 Android 14+ 必须：声明 `FOREGROUND_SERVICE_MEDIA_PROJECTION` → Service 写 `foregroundServiceType="mediaProjection"` → **先** `startForeground` **再** `getMediaProjection`。
7. 房间号只能用数字/字母/`_`/`-`；TRTC userId 同样限制，代码里 `TrtcConfig.toTrtcUserId()` 已做净化。


### 报 "JDK 25.0.2 isn't compatible with Gradle 8.13" 怎么办

本机 `JAVA_HOME` 指向了 IntelliJ 自带的 JBR（`D:\IntelliJ IDEA 2026.1.1\jbr` = JDK 25），Gradle 8.x 最高只支持 Java 23。三处任选，建议都做前两条：

1. **Android Studio 里指定 Gradle JDK**（最直接，能消掉顶部那条黄色横幅）：
   `File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK` → 选 **17**（`C:\Program Files\Java\jdk-17`）→ Apply → 重新 Sync。
2. **工程里已经写死了 JDK 17**：`gradle.properties` 的 `org.gradle.java.home=C:\Program Files\Java\jdk-17`，命令行构建也不受影响。换机器时改这一行。
3. 可选：把系统环境变量 `JAVA_HOME` 改成 `C:\Program Files\Java\jdk-17`
   （IntelliJ 用自己的 JBR，不受影响；改完重开终端/IDE）。

> `gradlew`、`gradlew.bat`、`gradle/wrapper/gradle-wrapper.jar` 已补齐（wrapper 指向 Gradle 8.11.1，AGP 8.7.3 要求 ≥ 8.9）。
> 首次 Sync 会联网下载这个发行版；公司网络慢的话可以手动下 `gradle-8.11.1-bin.zip` 放到
> `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.11.1-bin\<hash>\` 下，或改 `gradle-wrapper.properties` 的 `distributionUrl` 为内网镜像。
