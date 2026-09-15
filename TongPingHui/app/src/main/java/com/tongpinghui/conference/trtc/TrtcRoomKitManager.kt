package com.tongpinghui.conference.trtc

import android.content.Context
import android.util.Log
import com.tongpinghui.conference.core.ServiceLocator
import io.trtc.tuikit.atomicxcore.api.CompletionHandler
import io.trtc.tuikit.atomicxcore.api.login.LoginStatus
import io.trtc.tuikit.atomicxcore.api.login.LoginStore
import io.trtc.tuikit.atomicxcore.api.login.UserProfile
import io.trtc.tuikit.atomicxcore.api.room.RoomStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * 腾讯云 TRTC / TUIRoomKit 的登录态管理。
 *
 * 顺序很重要：**必须先 LoginStore.shared.login 成功，才能进房**。
 * 我们把它挂在「进入会议」这一步（自己的账号鉴权早已通过），
 * 这样既不会过早登录，也不用把腾讯云的账号体系暴露给业务层。
 *
 * UserSig 的取法（按优先级）：
 *  1) 自己的后端签发：GET /api/v1/trtc/usersig（正式方案，客户端不留密钥）
 *  2) 本地用 SDKSecretKey 现算（仅本地调试，local.properties 里配了才会有）
 *  3) 控制台复制的临时票据（TRTC_TEST_USER_SIG，最后兜底）
 */
object TrtcRoomKitManager {

    private const val TAG = "TrtcRoomKit"

    private val loginStore: LoginStore get() = LoginStore.shared

    private val loginInfo get() = loginStore.loginState.loginUserInfo.value

    /** 是否已经登录腾讯云（同一进程内登录一次即可，重复进房不用再登） */
    val isLoggedIn: Boolean get() = !loginInfo?.userID.isNullOrEmpty()

    val currentUserId: String? get() = loginInfo?.userID

    /**
     * 登录腾讯云。已用同一个 userId 登录过就直接更新资料返回。
     * @param context 用当前 Activity 的 context（SDK 内部要弹权限/引导页）
     */
    suspend fun login(
        context: Context,
        account: String,
        nickname: String,
        avatarUrl: String
    ): Result<Unit> = runCatching {
        val userId = TrtcConfig.toTrtcUserId(account)

        if (loginInfo?.userID == userId) {
            Log.d(TAG, "已登录 $userId，跳过重复登录")
            awaitLoggedIn()
            updateSelfInfo(nickname, avatarUrl)
            return@runCatching
        }

        val userSig = fetchUserSig(account, userId).getOrThrow()
        Log.d(TAG, "开始登录腾讯云 sdkAppId=${TrtcConfig.sdkAppId} userId=$userId")

        awaitCompletion { handler ->
            loginStore.login(context, TrtcConfig.sdkAppId, userId, userSig, handler)
        }

        // ⚠️ 登录回调返回 ≠ 引擎可用：SDK 内部把 loginStatus 切成 LOGINED 还要一小会儿，
        // 此时立刻进房会拿到 -1002（SDK_NOT_INITIALIZED，"not logged in"），
        // 表现就是「第一次进房必失败、手动重试才进得去」。这里显式等就绪。
        if (!awaitLoggedIn()) {
            Log.w(TAG, "等待 LOGINED 超时，先继续（进房时还有自动重试兜底）")
        }

        updateSelfInfo(nickname, avatarUrl)
        Log.d(TAG, "腾讯云登录成功")
    }

    /**
     * 等 SDK 真正进入「已登录」态（`loginState.loginStatus == LOGINED`）。
     * @return 是否在超时前等到
     */
    suspend fun awaitLoggedIn(timeoutMs: Long = 3000): Boolean =
        withTimeoutOrNull(timeoutMs) {
            loginStore.loginState.loginStatus.first { it == LoginStatus.LOGINED }
            true
        } ?: false

    /** 设置昵称和头像，会议里其他人看到的就是这两个值 */
    suspend fun updateSelfInfo(nickname: String, avatarUrl: String): Result<Unit> = runCatching {
        val userId = loginInfo?.userID ?: throw IllegalStateException("尚未登录腾讯云")
        val profile = UserProfile(
            userID = userId,
            nickname = nickname,
            avatarURL = avatarUrl
        )
        awaitCompletion { handler -> loginStore.setSelfInfo(profile, handler) }
    }

    // -----------------------------------------------------------------------
    // 说明：SDK 里还有 LoginStore.shared.logout(...)，官方文档提到「建议把 login/logout
    // 跟自己的登录业务绑定」，但文档没给签名。退出我们自己的账号时如果想同时退出腾讯云，
    // 在 IDE 里输入 LoginStore.shared. 让自动补全给出准确签名后补一行即可。
    // 目前 App 退出登录只清本地会话，不影响云端（下次 login 会用新 userId 覆盖）。
    // -----------------------------------------------------------------------

    /**
     * 兜底退房：用户按系统返回键、或 Activity 异常销毁时调用。
     * 本来就不在房间里时调用会失败，属正常情况，忽略即可。
     */
    fun leaveRoomQuietly() {
        runCatching {
            RoomStore.shared().leaveRoom(object : CompletionHandler {
                override fun onSuccess() {
                    Log.d(TAG, "leaveRoomQuietly 成功")
                }

                override fun onFailure(code: Int, desc: String) {
                    Log.d(TAG, "leaveRoomQuietly 忽略错误 code=$code desc=$desc")
                }
            })
        }
    }

    /** 按优先级取一张可用的 UserSig */
    private suspend fun fetchUserSig(account: String, trtcUserId: String): Result<String> {
        // 1) 后端签发
        val fromServer = ServiceLocator.meetingRepository.userSig(trtcUserId)
        fromServer.onSuccess { dto ->
            Log.d(TAG, "UserSig 来自后端，过期时间 ${dto.expireAt}")
            return Result.success(dto.userSig)
        }

        // 2) 本地兜底（调试用）
        if (TrtcConfig.hasSecretKey) {
            Log.w(TAG, "后端未返回 UserSig，改用本地 SDKSecretKey 现算（仅调试）")
            return runCatching {
                TrtcUserSig.generate(
                    sdkAppId = TrtcConfig.sdkAppId,
                    userId = trtcUserId,
                    expireSeconds = TrtcConfig.userSigExpireSeconds,
                    secretKey = TrtcConfig.secretKey
                )
            }
        }

        // 3) 控制台临时票据
        if (TrtcConfig.testUserSig.isNotBlank()) {
            Log.w(TAG, "使用 local.properties 里的 TRTC_TEST_USER_SIG 临时票据")
            return Result.success(TrtcConfig.testUserSig)
        }

        val reason = fromServer.exceptionOrNull()?.message ?: "未知错误"
        return Result.failure(
            IllegalStateException(
                "无法获取 UserSig（后端未启动且未配置 SDKSecretKey）：$reason\n" +
                    "account=$account"
            )
        )
    }

    /** 把 SDK 的回调风格转成协程 */
    private suspend fun awaitCompletion(block: (CompletionHandler) -> Unit) =
        suspendCancellableCoroutine { continuation ->
            var finished = false
            block(object : CompletionHandler {
                override fun onSuccess() {
                    if (!finished) {
                        finished = true
                        continuation.resume(Unit)
                    }
                }

                override fun onFailure(code: Int, desc: String) {
                    if (!finished) {
                        finished = true
                        Log.e(TAG, "SDK 调用失败 code=$code desc=$desc")
                        continuation.resumeWithException(
                            IllegalStateException("腾讯云返回错误 $code：$desc")
                        )
                    }
                }
            })
        }
}
