// 顶层构建文件：只声明插件版本，不在这里配置具体模块
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}

// ---------------------------------------------------------------------------
// TUIRoomKit 的组件会读取 rootProject 上的这些属性来锁定底层 SDK 版本
// （见 atomic_x/build.gradle、room/tuiroomkit/build.gradle）。
// 这里必须写死成同一套版本，否则 atomic_x 与 tuiroomkit 会各拉一个版本，
// 运行期容易出现 NoSuchMethodError。
// 版本号来源：腾讯云 TUIKit_Android 官方默认值。
// ---------------------------------------------------------------------------
extra["roomEngineSdk"] = "io.trtc.uikit:rtc_room_engine:4.3.0.25"
extra["atomicxCoreSdk"] = "io.trtc.uikit:atomicx-core:4.3.0.25"
extra["liteavSdk"] = "com.tencent.liteav:LiteAVSDK_Professional:13.2.0.20058"

// ---------------------------------------------------------------------------
// 统一 build-tools 版本。
// AGP 8.7.3 的默认 build-tools 是 34.0.0；腾讯那三个组件模块（tuiroomkit /
// atomic_x / chatuikit）自己没写 buildToolsVersion，于是会去找 34.0.0，
// 本机只装了 36.0.0，就报：
//   Failed to find Build Tools revision 34.0.0
// 在这里统一顶成已安装的版本。写在根脚本里，所以 tools/fetch_tuikit.sh 重新
// 拉取组件源码后依然生效（不用去改腾讯的源码）。
// 换机器时改这一行，与 sdk/build-tools 下已安装的目录名保持一致即可。
// ---------------------------------------------------------------------------
val buildTools = "36.0.0"

subprojects {
    plugins.withId("com.android.library") {
        extensions.configure<com.android.build.gradle.LibraryExtension> {
            buildToolsVersion = buildTools
        }
    }
}
