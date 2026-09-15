package com.tongpinghui.conference.ui.room

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.data.local.LastMeeting
import com.tongpinghui.conference.service.ScreenShareService
import com.tongpinghui.conference.trtc.RoomSession
import com.tongpinghui.conference.trtc.TrtcRoomKitManager
import com.tongpinghui.conference.ui.component.ConfirmDialog
import com.tongpinghui.conference.ui.theme.TongPingHuiTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * 会议房间页。完整链路：
 *
 * ```
 * 进房 → 1) 取 UserSig（后端签发，失败则本地兜底）
 *        2) LoginStore.shared.login 登录腾讯云   ← 必须先登录才能进房
 *        3) RoomSession.createRoom / joinRoom     ← RoomStore 真正进房
 *        4) 把 RoomParticipantStore 的数据流交给界面（成员/音量/麦摄/共享）
 *        5) 退出时 leaveRoom（房主可选 endRoom 结束会议）
 * ```
 *
 * 界面有两种实现，二选一：
 *  - [UiMode.CUSTOM]（默认）自定义 Compose 界面（第 2 步那套九宫格）+ TUIRoomKit 内核
 *  - [UiMode.SDK]   直接用 TUIRoomKit 自带的 RoomMainView（含 UI 低代码集成）
 */
class MeetingRoomActivity : ComponentActivity() {

    /** 换界面实现只需要改这一行 */
    private val uiMode = UiMode.CUSTOM

    enum class UiMode { CUSTOM, SDK }

    private sealed interface EntryState {
        data class Preparing(val message: String) : EntryState
        data class Failed(val message: String) : EntryState
        data object Ready : EntryState
    }

    companion object {
        private const val EXTRA_ROOM_ID = "extra_room_id"
        private const val EXTRA_ROOM_TITLE = "extra_room_title"
        private const val EXTRA_IS_CREATOR = "extra_is_creator"
        private const val EXTRA_PASSWORD = "extra_password"

        /**
         * 屏幕共享实现方式：
         *  true  = 用 TUIRoomKit 自带实现（内部就是 MediaProjection + 前台服务，无需我们管）
         *  false = 用工程里自研的 ScreenShareService（保留给定制场景）
         */
        private const val USE_SDK_SCREEN_SHARE = true

        fun start(
            context: Context,
            roomId: String,
            roomTitle: String,
            isCreator: Boolean,
            password: String = ""
        ) {
            context.startActivity(
                Intent(context, MeetingRoomActivity::class.java).apply {
                    putExtra(EXTRA_ROOM_ID, roomId)
                    putExtra(EXTRA_ROOM_TITLE, roomTitle)
                    putExtra(EXTRA_IS_CREATOR, isCreator)
                    putExtra(EXTRA_PASSWORD, password)
                }
            )
        }
    }

    private val viewModel: MeetingRoomViewModel by viewModels()

    private var entry: EntryState by mutableStateOf(EntryState.Preparing("正在进入会议…"))
    private var shareRequesting by mutableStateOf(false)
    private var roomSession: RoomSession? = null

    private lateinit var roomId: String
    private lateinit var roomTitle: String
    private var isCreator = false
    private var password = ""

    /** 自研屏幕共享路径用的授权回调（USE_SDK_SCREEN_SHARE=false 时才走） */
    private val projectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data
        if (result.resultCode == Activity.RESULT_OK && data != null) {
            ScreenShareService.start(this, result.resultCode, data)
            shareRequesting = false
            // TODO 自研路径：把 ScreenShareService.projection 交给引擎推流
            //  （rtc_room_engine / TRTC 的屏幕采集接口，签名以 AAR 为准）
        } else {
            shareRequesting = false
            Toast.makeText(this, "已取消屏幕共享授权", Toast.LENGTH_SHORT).show()
        }
    }

    private val mediaPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { granted ->
        if (granted[Manifest.permission.CAMERA] != true ||
            granted[Manifest.permission.RECORD_AUDIO] != true
        ) {
            Toast.makeText(this, "未授权摄像头/麦克风，将只能看不能发言", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 会议页是深色底，状态栏/导航栏要配浅色（白）图标，否则图标看不见。
        // 默认的 enableEdgeToEdge() 在浅色主题下会给深色图标。
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        roomId = intent.getStringExtra(EXTRA_ROOM_ID).orEmpty()
        roomTitle = intent.getStringExtra(EXTRA_ROOM_TITLE).orEmpty().ifEmpty { "会议" }
        isCreator = intent.getBooleanExtra(EXTRA_IS_CREATOR, false)
        password = intent.getStringExtra(EXTRA_PASSWORD).orEmpty()

        if (roomId.isBlank()) {
            entry = EntryState.Failed("房间号为空，无法进入会议")
        }

        viewModel.bindRoom(roomId)
        requestMediaPermissionsIfNeeded()

        setContent {
            TongPingHuiTheme {
                when (val state = entry) {
                    is EntryState.Preparing -> PreparingScreen(roomTitle, roomId, state.message)

                    is EntryState.Failed -> MeetingFailedScreen(
                        message = state.message,
                        onRetry = { prepare() },
                        onBack = { finish() }
                    )

                    EntryState.Ready -> if (uiMode == UiMode.SDK) {
                        // SDK 自带界面：内部自己进房，所以我们这里不再调 RoomSession
                        RoomKitHost(
                            roomId = roomId,
                            roomName = roomTitle,
                            isCreator = isCreator
                        )
                    } else {
                        val uiState by viewModel.state.collectAsStateWithLifecycle()
                        MeetingRoomScreen(
                            roomTitle = roomTitle,
                            roomId = roomId,
                            isCreator = isCreator,
                            shareState = resolveShareState(uiState),
                            state = uiState,
                            onToggleMic = viewModel::toggleMic,
                            onToggleCamera = viewModel::toggleCamera,
                            onToggleScreenShare = ::onToggleScreenShare,
                            onTogglePin = viewModel::togglePin,
                            onShowMembers = viewModel::showMembers,
                            onLeave = viewModel::askLeave
                        )
                        if (uiState.showLeaveConfirm) {
                            ConfirmDialog(
                                title = "离开会议",
                                message = if (uiState.self.isSharingScreen) {
                                    "离开会结束屏幕共享，确定离开吗？"
                                } else {
                                    "确定离开当前会议吗？"
                                },
                                confirmText = "离开",
                                danger = true,
                                onConfirm = {
                                    viewModel.cancelLeave()
                                    viewModel.leave(alsoEndRoom = false) { finish() }
                                },
                                onDismiss = viewModel::cancelLeave
                            )
                        }
                    }
                }
            }
        }

        if (roomId.isNotBlank()) prepare()
    }

    // -----------------------------------------------------------------------
    // 进房流程
    // -----------------------------------------------------------------------

    private fun prepare() {
        entry = EntryState.Preparing("正在登录腾讯云…")
        lifecycleScope.launch {
            val session = ServiceLocator.tokenStore.current()
            if (session == null) {
                entry = EntryState.Failed("登录状态已失效，请返回重新登录")
                return@launch
            }

            // 1) 登录腾讯云（UserSig 由后端签发，失败时本地兜底）
            TrtcRoomKitManager.login(
                context = this@MeetingRoomActivity,
                account = session.account,
                nickname = session.nickname.ifEmpty { session.account },
                avatarUrl = session.avatarUrl
            ).onFailure { e ->
                entry = EntryState.Failed(e.message ?: "腾讯云登录失败")
                return@launch
            }

            // SDK 界面模式：RoomMainView 内部自己进房
            if (uiMode == UiMode.SDK) {
                rememberThisMeeting()
                entry = EntryState.Ready
                return@launch
            }

            // 2) 自定义界面模式：自己进房
            entry = EntryState.Preparing("正在进入房间 $roomId …")
            val room = RoomSession(ServiceLocator.appContext, roomId, roomTitle)

            val result = suspendCancellableCoroutine { continuation ->
                val callback: (Result<Unit>) -> Unit = { r ->
                    if (continuation.isActive) continuation.resume(r)
                }
                if (isCreator) {
                    room.createRoom(password, callback)
                } else {
                    room.joinRoom(password, callback)
                }
            }

            result.onSuccess {
                roomSession = room
                viewModel.attach(room)
                rememberThisMeeting()
                entry = EntryState.Ready
            }.onFailure { e ->
                room.leaveRoom()
                entry = EntryState.Failed(e.message ?: "进入会议失败")
            }
        }
    }

    /**
     * 记住这次进的会议（只留一条）。
     * 被拉进会议的人如果不小心退出了，回到列表页能看到「上次的会议」卡片，一键回来，
     * 不用再手输房间号。
     */
    private suspend fun rememberThisMeeting() {
        runCatching {
            ServiceLocator.lastMeetingStore.save(
                LastMeeting(
                    roomId = roomId,
                    title = roomTitle,
                    isCreator = isCreator,
                    joinedAt = System.currentTimeMillis()
                )
            )
        }
    }

    // -----------------------------------------------------------------------
    // 屏幕共享
    // -----------------------------------------------------------------------

    private fun resolveShareState(state: MeetingUiState): ScreenShareState = when {
        state.self.isSharingScreen -> ScreenShareState.Sharing
        shareRequesting -> ScreenShareState.Requesting
        else -> ScreenShareState.Idle
    }

    private fun onToggleScreenShare() {
        if (USE_SDK_SCREEN_SHARE) {
            val alreadySharing = viewModel.state.value.self.isSharingScreen
            if (!alreadySharing) {
                shareRequesting = true
                // SDK 会弹系统授权框，授权结果通过成员状态流回来；兜底 2 秒后复位按钮文案
                lifecycleScope.launch {
                    delay(2000)
                    shareRequesting = false
                }
            }
            viewModel.toggleScreenShare()
            return
        }

        // 自研路径：自己的 MediaProjection + 前台服务
        val sharing = ScreenShareService.isSharing()
        if (sharing) {
            ScreenShareService.stop(this)
        } else {
            val manager = getSystemService(MediaProjectionManager::class.java)
            if (manager == null) {
                Toast.makeText(this, "当前设备不支持屏幕共享", Toast.LENGTH_SHORT).show()
                return
            }
            shareRequesting = true
            projectionLauncher.launch(manager.createScreenCaptureIntent())
        }
    }

    /** 进会议前把摄像头/麦克风权限要到 */
    private fun requestMediaPermissionsIfNeeded() {
        val needed = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            needed += Manifest.permission.POST_NOTIFICATIONS
        }
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            mediaPermissionLauncher.launch(missing.toTypedArray())
        }
    }

    override fun onDestroy() {
        // 走自研共享路径时收尾；SDK 路径由 SDK 自己管理投影
        if (!USE_SDK_SCREEN_SHARE && ScreenShareService.isSharing()) {
            ScreenShareService.stop(this)
        }
        if (isFinishing && roomSession != null) {
            // 用户按系统返回键直接退出：这里兜底退房（正常点「离开」时 ViewModel 已经处理过）
            TrtcRoomKitManager.leaveRoomQuietly()
        }
        super.onDestroy()
    }
}
