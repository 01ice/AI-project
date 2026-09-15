package com.tongpinghui.conference.trtc

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.trtc.uikit.roomkit.base.event.RoomEventNotifier
import com.trtc.uikit.roomkit.base.operator.DeviceOperator
import io.trtc.tuikit.atomicxcore.api.CompletionHandler
import io.trtc.tuikit.atomicxcore.api.device.DeviceStore
import io.trtc.tuikit.atomicxcore.api.room.CreateRoomOptions
import io.trtc.tuikit.atomicxcore.api.room.RoomParticipant
import io.trtc.tuikit.atomicxcore.api.room.RoomParticipantStore
import io.trtc.tuikit.atomicxcore.api.room.RoomStore
import io.trtc.tuikit.atomicxcore.api.room.RoomType
import kotlinx.coroutines.flow.Flow

/**
 * 一次会议会话：进房 / 退房 / 成员与设备状态 / 屏幕共享。
 *
 * 这是「自定义 Compose 界面 + TUIRoomKit 内核」的关键桥梁：
 * 界面只认 [RoomParticipant] 这类模型和几个开关方法，底层是腾讯云的
 * RoomStore / RoomParticipantStore / DeviceStore。
 *
 * ⚠️ 如果改用 SDK 自带的 RoomMainView（见 RoomKitHost），就不要再用这个类去进房，
 *    否则会重复进房 —— 两套界面二选一。
 */
class RoomSession(
    context: Context,
    val roomId: String,
    private val roomName: String
) {

    companion object {
        private const val TAG = "RoomSession"

        /** -1002 = SDK_NOT_INITIALIZED，SDK 自带说明是 "Not logged in, please call login api" */
        private const val ERR_SDK_NOT_INITIALIZED = -1002
        private const val SDK_READY_MAX_ATTEMPTS = 4
        private const val SDK_READY_RETRY_DELAY_MS = 400L
    }

    /** 房间操作失败：把 SDK 返回码带上，好让上层区分「SDK 还没就绪」和真正的失败 */
    class RoomOpException(val code: Int, message: String) : IllegalStateException(message) {
        val isSdkNotReady: Boolean get() = code == ERR_SDK_NOT_INITIALIZED
    }

    private val roomStore: RoomStore = RoomStore.shared()
    private val deviceStore: DeviceStore = DeviceStore.shared()
    private val deviceOperator = DeviceOperator(context)
    private val participantStore: RoomParticipantStore = RoomParticipantStore.create(roomId)

    // -----------------------------------------------------------------------
    // 状态流（界面直接 collect）
    // -----------------------------------------------------------------------

    /** 全部成员（含自己），已按进房顺序排序 */
    val participants: Flow<List<RoomParticipant>> get() = participantStore.state.participantList

    /** 正在共享屏幕的人（没有则为 null） */
    val screenSharer: Flow<RoomParticipant?> get() = participantStore.state.participantWithScreen

    /** 音量表：userId -> 音量(0-100)，用来做「谁在说话」高亮 */
    val speakingVolumes: Flow<Map<String, Int>> get() = participantStore.state.speakingUsers

    /** 自己（麦克风/摄像头/共享状态都从这里读） */
    val localParticipant: Flow<RoomParticipant?> get() = participantStore.state.localParticipant

    /** 房主 userId */
    val ownerUserId: String? get() = roomStore.state.currentRoom.value?.roomOwner?.userID

    val isOwner: Boolean
        get() = ownerUserId != null && ownerUserId == TrtcRoomKitManager.currentUserId

    // -----------------------------------------------------------------------
    // 进房 / 退房
    // -----------------------------------------------------------------------

    /** 房主身份：创建并加入房间 */
    fun createRoom(
        password: String = "",
        onResult: (Result<Unit>) -> Unit
    ) {
        val options = CreateRoomOptions(roomName = roomName, password = password)
        Log.d(TAG, "createAndJoinRoom roomId=$roomId roomName=$roomName")
        withSdkReadyRetry(onResult) { cb ->
            roomStore.createAndJoinRoom(roomId, RoomType.STANDARD, options, callback(cb))
        }
    }

    /** 参会人身份：加入房间（房间有密码时要传 password） */
    fun joinRoom(
        password: String = "",
        onResult: (Result<Unit>) -> Unit
    ) {
        Log.d(TAG, "joinRoom roomId=$roomId")
        withSdkReadyRetry(onResult) { cb ->
            roomStore.joinRoom(roomId, RoomType.STANDARD, password, callback(cb))
        }
    }

    /**
     * 进房时自动重试「SDK 还没就绪」。
     *
     * 背景：`LoginStore.login` 的 onSuccess 只说明登录请求成功了，SDK 内部把
     * `loginState.loginStatus` 切到 LOGINED 还差一拍；此时立刻进房就会拿到
     * **-1002（SDK_NOT_INITIALIZED，SDK 原文 "Not logged in, please call login api"）**，
     * 表现正是「第一次进房必失败、手动点重试才进得去」。这里兜一层：遇到未就绪就
     * 自己等一会儿重试，用户不会再看到这个错误。
     */
    private fun withSdkReadyRetry(
        onResult: (Result<Unit>) -> Unit,
        start: (onFinished: (Result<Unit>) -> Unit) -> Unit
    ) {
        var attemptsLeft = SDK_READY_MAX_ATTEMPTS
        fun attempt() {
            start { result ->
                val error = result.exceptionOrNull()
                val notReady = (error as? RoomOpException)?.isSdkNotReady == true
                if (result.isFailure && notReady && attemptsLeft > 1) {
                    attemptsLeft--
                    Log.w(
                        TAG,
                        "SDK 尚未就绪，${SDK_READY_RETRY_DELAY_MS}ms 后自动重试（剩余 $attemptsLeft 次）：${error?.message}"
                    )
                    Handler(Looper.getMainLooper()).postDelayed({ attempt() }, SDK_READY_RETRY_DELAY_MS)
                } else {
                    onResult(result)
                }
            }
        }
        attempt()
    }

    /** 离开房间；房主调用 endRoom 才会真正终止会议（其他人也被请出） */
    fun leaveRoom(alsoEndRoom: Boolean = false, onDone: (() -> Unit)? = null) {
        RoomEventNotifier.notifyWillLeaveRoom()
        stopScreenShare()

        // 显式标注成 () -> Unit：否则推断成 () -> Unit?（onDone?.invoke() 是可空的），
        // 用它当 onSuccess() 的表达式体时会报“返回类型不是 Unit 的子类型”。
        val finish: () -> Unit = {
            Log.d(TAG, "已退出房间 roomId=$roomId")
            onDone?.invoke()
        }
        val handler = object : CompletionHandler {
            override fun onSuccess() = finish()
            override fun onFailure(code: Int, desc: String) {
                Log.w(TAG, "leaveRoom 失败 code=$code desc=$desc（忽略，直接本地清理）")
                finish()
            }
        }
        if (alsoEndRoom && isOwner) {
            roomStore.endRoom(handler)
        } else {
            roomStore.leaveRoom(handler)
        }
    }

    // -----------------------------------------------------------------------
    // 设备控制（界面上的麦/摄/共享按钮调这些）
    // -----------------------------------------------------------------------

    /** 开/关麦克风。开会带上权限申请与成员状态同步 */
    suspend fun setMicrophoneOn(on: Boolean): Result<Unit> = runCatching {
        if (on) {
            deviceOperator.unmuteMicrophone(participantStore)
        } else {
            deviceOperator.muteMicrophone(participantStore)
        }
    }

    /** 开/关摄像头 */
    suspend fun setCameraOn(on: Boolean): Result<Unit> = runCatching {
        if (on) {
            deviceOperator.openCamera()
        } else {
            deviceOperator.closeCamera()
        }
    }

    /**
     * 前后摄像头切换。
     * SDK 的签名是 switchCamera(isFront: Boolean)（官方 RoomTopBarView 也是这样调的：
     * 读当前状态再取反），所以这里自己去读 deviceState，界面上不必关心。
     */
    fun switchCamera(): Result<Unit> = runCatching {
        deviceStore.switchCamera(!deviceStore.deviceState.isFrontCamera.value)
    }

    /**
     * 开始共享屏幕。
     * TUIRoomKit 内部会弹系统的「开始录制或投放」授权框，并用它自己的前台服务
     * 持有 MediaProjection；若没有悬浮窗权限，SDK 会先跳去设置页申请。
     * 共享状态请以 [localParticipant] 的 screenShareStatus 为准（异步生效）。
     */
    fun startScreenShare(): Result<Unit> = runCatching { deviceOperator.startScreenShare() }

    fun stopScreenShare(): Result<Unit> = runCatching { deviceOperator.stopScreenShare() }

    private fun callback(onResult: (Result<Unit>) -> Unit): CompletionHandler =
        object : CompletionHandler {
            override fun onSuccess() = onResult(Result.success(Unit))
            override fun onFailure(code: Int, desc: String) {
                Log.e(TAG, "房间操作失败 code=$code desc=$desc")
                onResult(Result.failure(RoomOpException(code, describeRoomError(code, desc))))
            }
        }

    private fun describeRoomError(code: Int, desc: String): String = when (code) {
        100018 -> "该房间需要密码"
        100019 -> "房间密码不正确"
        ERR_SDK_NOT_INITIALIZED -> "SDK 尚未就绪（登录还没完成）：$desc"
        else -> "进入会议失败（$code）：$desc"
    }
}
