# ---------------------------------------------------------------------------
# 腾讯 TRTC / IM / LiteAV SDK 大量使用 Java 反射，必须保留
# （官方 TUIRoomKit 文档要求的规则，不要删）
# ---------------------------------------------------------------------------
-keep class com.tencent.** { *; }
-keep class com.tencent.beacon.** { *; }
-keep class com.tencent.cloud.iai.lib.** { *; }
-keep class com.tencent.qimei.** { *; }
-keep class com.tencent.xmagic.** { *; }
-keep class com.tcmediax.** { *; }
-keep class io.trtc.** { *; }
-keep class com.trtc.** { *; }

# Gson
-keep class com.google.gson.** { *; }

# 我们自己的 DTO：字段名要和后端 JSON 对齐，禁止混淆
-keep class com.tongpinghui.conference.data.remote.dto.** { *; }

# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keepattributes Signature
-keepattributes *Annotation*
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Kotlin 协程
-dontwarn kotlinx.coroutines.**

# 其它常见告警（腾讯 SDK 依赖里带的）
-dontwarn org.slf4j.**
-dontwarn org.bouncycastle.**
-dontwarn com.google.protobuf.**
-dontwarn org.apache.**
