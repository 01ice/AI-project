pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // ---- 腾讯云 SDK 仓库（TRTC / IM / LiteAV / tuicore 等都在这三个里）----
        maven { url = uri("https://mirrors.tencent.com/nexus/repository/maven-public/") }
        maven { url = uri("https://mirrors.tencent.com/repository/maven/liteavsdk") }
        maven { url = uri("https://mirrors.tencent.com/repository/maven/thirdparty") }
        // 国内网络加速（可选）
        maven { url = uri("https://maven.aliyun.com/repository/public") }
    }
}

rootProject.name = "TongPingHui"

include(":app")

// ---------------------------------------------------------------------------
// 【TUIRoomKit（含 UI 低代码集成）不是 Maven 依赖】
// 官方给的是「源码组件」，必须把仓库里的 room/、atomic_x/、chat/uikit/ 三个目录
// 放到本工程根目录下（与 app/ 同级）。
//   仓库地址：https://github.com/Tencent-RTC/TUIKit_Android
//   一键拉取：bash tools/fetch_tuikit.sh   （Windows 下用 Git Bash 执行）
// 判断目录是否存在，保证「还没拉 SDK 时工程也能 Sync 通过」。
// ---------------------------------------------------------------------------
fun includeModule(moduleName: String, relativePath: String) {
    val dir = file(relativePath)
    if (dir.isDirectory) {
        include(":$moduleName")
        project(":$moduleName").projectDir = dir
    } else {
        logger.lifecycle("[TUIRoomKit] 缺少目录 $relativePath —— 已跳过 :$moduleName，App 将无法进房")
    }
}

includeModule("atomic_x", "atomic_x")
includeModule("tuiroomkit", "room/tuiroomkit")
// tuiroomkit 内部 api project(':chatuikit')，聊天/成员列表 UI 依赖它
includeModule("chatuikit", "chat/uikit")
