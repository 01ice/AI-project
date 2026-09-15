package com.tongpinghui.conference.trtc

import com.tongpinghui.conference.BuildConfig

/**
 * 腾讯云 TRTC 参数集中管理。
 * 值通过 local.properties → app/build.gradle.kts 的 buildConfigField 注入，
 * 源码里不出现任何明文密钥，也不会被提交到 Git。
 *
 * 需要填到 local.properties 的项：
 *   TRTC_SDK_APP_ID=1600162594                （已有）
 *   TRTC_SDK_SECRET_KEY=xxxxx                 （⚠️ 还没生成，去控制台生成后填上）
 *   TRTC_USER_SIG_EXPIRE=604800               （可选，默认 7 天）
 *   TRTC_TEST_USER_SIG=                       （可选，控制台临时票据，仅本地调试兜底）
 */
object TrtcConfig {

    /** 腾讯云控制台 SDKAppID：1600162594 */
    val sdkAppId: Int get() = BuildConfig.TRTC_SDK_APP_ID

    /**
     * SDKSecretKey。
     * ⚠️ 只允许在「本地调试」时用它现算 UserSig；
     * 正式分发前应该由自己的后端下发 UserSig（见 server/src/utils/userSig.js）。
     */
    val secretKey: String get() = BuildConfig.TRTC_SDK_SECRET_KEY

    /** UserSig 有效期（秒） */
    val userSigExpireSeconds: Int get() = BuildConfig.TRTC_USER_SIG_EXPIRE

    /** 本地是否具备现算 UserSig 的条件 */
    val hasSecretKey: Boolean get() = secretKey.isNotBlank()

    /**
     * 控制台临时票据（https://console.cloud.tencent.com/im/tool-usersig）。
     * 只在「后端没起来 + 没配 SDKSecretKey」时兜底，线上不需要。
     */
    val testUserSig: String get() = BuildConfig.TRTC_TEST_USER_SIG

    /** 本地能自己搞出 UserSig 的任意一条路是否可用 */
    val canProduceUserSigLocally: Boolean
        get() = hasSecretKey || testUserSig.isNotBlank()

    /**
     * 腾讯云的 userId 只允许「英文字母、数字、连字符、下划线」。
     * 我们把后端账号做一次净化，避免登录失败。
     */
    fun toTrtcUserId(account: String): String {
        val sanitized = account.trim().map { c ->
            if (c.isLetterOrDigit() && c.code < 128) c else '_'
        }.joinToString("")
        return if (sanitized.isEmpty()) "user_unknown" else "u_$sanitized"
    }

    /**
     * 会议房间号（ROOM_ID）规则：0-48 字节，建议只用数字、字母、下划线、连字符。
     * 这里用 "1" + 时间戳后 9 位，保证房主/参会人输入同一串数字就能进同一个房间。
     */
    fun newRoomId(): String = (System.currentTimeMillis() % 1_000_000_000L).toString()
}
