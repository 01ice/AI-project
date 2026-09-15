import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// ---------------------------------------------------------------------------
// 从 local.properties 读取敏感配置（腾讯云密钥、后端地址、签名信息）
// 模板见项目根目录 local.properties.template
// ---------------------------------------------------------------------------
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

fun localProp(key: String, def: String = ""): String =
    localProps.getProperty(key)?.trim().orEmpty().ifEmpty { def }

val hasRoomKit = rootProject.file("room/tuiroomkit").isDirectory

android {
    namespace = "com.tongpinghui.conference"
    compileSdk = 34

    // 本机只装了 build-tools 36.0.0（AGP 8.7 允许用更新版本），
    // 显式指定可以少下载一个 50MB 的 34.0.0 包。
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.tongpinghui.conference"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // 腾讯 TRTC 只提供 arm 架构 so 库，打包时只保留这两种 ABI
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }

        // ---- 腾讯云 TRTC 参数注入（代码里用 BuildConfig.xxx 读取，不硬编码）----
        buildConfigField("int", "TRTC_SDK_APP_ID", localProp("TRTC_SDK_APP_ID", "1600162594"))
        buildConfigField("String", "TRTC_SDK_SECRET_KEY", "\"${localProp("TRTC_SDK_SECRET_KEY")}\"")
        // 控制台「UserSig 辅助工具」生成的临时票据，仅当后端不可用且没配密钥时兜底
        buildConfigField("String", "TRTC_TEST_USER_SIG", "\"${localProp("TRTC_TEST_USER_SIG")}\"")
        buildConfigField("int", "TRTC_USER_SIG_EXPIRE", localProp("TRTC_USER_SIG_EXPIRE", "604800"))
        // ---- 后端地址 ----
        buildConfigField("String", "API_BASE_URL", "\"${localProp("API_BASE_URL", "http://10.0.2.2:8080/")}\"")
        // ---- TUIRoomKit 组件是否已拉取 ----
        buildConfigField("boolean", "HAS_ROOMKIT", hasRoomKit.toString())
    }

    signingConfigs {
        create("release") {
            val storePath = localProp("RELEASE_STORE_FILE")
            if (storePath.isNotEmpty()) {
                storeFile = file(storePath)
                storePassword = localProp("RELEASE_STORE_PASSWORD")
                keyAlias = localProp("RELEASE_KEY_ALIAS")
                keyPassword = localProp("RELEASE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // 内部自用，先关混淆（开了就要认真维护 proguard 规则，见 proguard-rules.pro）
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // 配了签名就用正式签名，没配就退回 debug 签名，保证随时能出 APK
            if (localProp("RELEASE_STORE_FILE").isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                signingConfig = signingConfigs.getByName("debug")
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/license.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/notice.txt",
                "META-INF/AL2.0",
                "META-INF/LGPL2.1",
                "META-INF/ASL2.0"
            )
        }
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    // -----------------------------------------------------------------------
    // 腾讯云 TUIRoomKit（含 UI 低代码集成）
    // 组件已放在工程根目录：room/tuiroomkit、atomic_x、chat/uikit
    // 组件内部已经 api 依赖了 TRTC SDK / IM SDK / LiteAV，App 不用再单独声明
    // -----------------------------------------------------------------------
    if (hasRoomKit) {
        api(project(":tuiroomkit"))
    }

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.google.material)
    implementation(libs.kotlinx.coroutines.android)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    implementation(libs.coil.compose)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
}
