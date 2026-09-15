package com.tongpinghui.conference.ui.room

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tongpinghui.conference.BuildConfig
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.trtc.RoomSession
import com.tongpinghui.conference.trtc.TrtcRoomKitManager
import io.trtc.tuikit.atomicxcore.api.device.DeviceStatus
import io.trtc.tuikit.atomicxcore.api.room.RoomParticipant
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

/**
 * 会议里的一位成员。
 *
 * [sdkParticipant] 不为空时说明是真实的腾讯云成员，界面会用它渲染真实画面；
 * 为空则只显示头像（演示数据 / 摄像头未开）。
 */
data class MeetingParticipant(
    val userId: String,
    val name: String,
    val avatarUrl: String = "",
    val isMicOn: Boolean = true,
    val isCameraOn: Boolean = true,
    val isSpeaking: Boolean = false,
    val isSharingScreen: Boolean = false,
    val isLocal: Boolean = false,
    val isOwner: Boolean = false,
    val speakingVolume: Int = 0,
    val sdkParticipant: RoomParticipant? = null
)

data class MeetingUiState(
    val roomId: String = "",
    val self: MeetingParticipant = MeetingParticipant(userId = "", name = "", isLocal = true),
    val remote: List<MeetingParticipant> = emptyList(),
    val screenSharerId: String? = null,
    val pinnedId: String? = null,
    val elapsedSeconds: Long = 0,
    val showMembers: Boolean = false,
    val showLeaveConfirm: Boolean = false,
    val isDemoData: Boolean = false,
    val connected: Boolean = false
) {
    val all: List<MeetingParticipant> get() = listOf(self) + remote
    val memberCount: Int get() = all.size

    /** 正在共享屏幕的人（真实成员才有） */
    val screenSharer: MeetingParticipant? get() = all.firstOrNull { it.isSharingScreen }

    /** 共享者对应的 SDK 成员（用来渲染屏幕流） */
    val screenSharerSdk: RoomParticipant? get() = screenSharer?.sdkParticipant

    val elapsedText: String
        get() {
            val h = elapsedSeconds / 3600
            val m = (elapsedSeconds % 3600) / 60
            val s = elapsedSeconds % 60
            return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
        }
}

class MeetingRoomViewModel : ViewModel() {

    companion object {
        /** 与 RoomKit 内部一致：音量超过这个值算「正在说话」 */
        private const val SPEAKING_THRESHOLD = 25
    }

    private val _state = MutableStateFlow(MeetingUiState())
    val state: StateFlow<MeetingUiState> = _state.asStateFlow()

    private var session: RoomSession? = null
    private var collectJob: Job? = null
    private var timerJob: Job? = null
    private var demoJob: Job? = null

    // 成员原始数据：真实模式下来自 SDK，演示模式下是假数据
    private var rawParticipants: List<RoomParticipant> = emptyList()
    private var volumes: Map<String, Int> = emptyMap()
    private var demoRemote: List<MeetingParticipant> = emptyList()

    /** 房间号等信息由 Activity 传进来，先把界面立起来 */
    fun bindRoom(roomId: String) {
        _state.update { it.copy(roomId = roomId) }
        if (timerJob == null) startTimer()
    }

    /**
     * 接入真实房间（TUIRoomKit 已进房成功）。
     * 之后所有成员、音量、麦摄、共享状态都来自 SDK 的数据流。
     */
    fun attach(roomSession: RoomSession) {
        session = roomSession
        collectJob?.cancel()
        demoJob?.cancel()
        rawParticipants = emptyList()

        _state.update { it.copy(isDemoData = false, connected = true) }

        collectJob = viewModelScope.launch {
            launch {
                roomSession.participants.collect { list ->
                    rawParticipants = list
                    rebuildFromSdk()
                }
            }
            launch {
                roomSession.speakingVolumes.collect { map ->
                    volumes = map
                    rebuildFromSdk()
                }
            }
            launch {
                roomSession.screenSharer.collect { sharer ->
                    _state.update { it.copy(screenSharerId = sharer?.userID) }
                    rebuildFromSdk()
                }
            }
        }
    }

    /** 没连上真实房间时（预览/调试），给一份假数据把九宫格显示出来 */
    fun useDemoData() {
        if (session != null) return
        viewModelScope.launch {
            val s = ServiceLocator.tokenStore.current()
            val self = MeetingParticipant(
                userId = s?.userId.orEmpty(),
                name = s?.nickname?.ifEmpty { s.account } ?: "我",
                avatarUrl = s?.avatarUrl.orEmpty(),
                isLocal = true,
                isOwner = true
            )
            demoRemote = demoParticipants()
            _state.update { it.copy(isDemoData = true, connected = false, self = self, remote = demoRemote) }
            startDemoSpeaking()
        }
    }

    fun detach() {
        collectJob?.cancel()
        collectJob = null
        demoJob?.cancel()
        demoJob = null
        session = null
    }

    // -----------------------------------------------------------------------
    // 界面操作
    // -----------------------------------------------------------------------

    fun toggleMic() {
        val current = _state.value.self
        val target = !current.isMicOn
        if (session == null) {
            _state.update { it.copy(self = it.self.copy(isMicOn = target)) }
            return
        }
        viewModelScope.launch {
            // 真实模式：状态由 SDK 的 localParticipant 流回传，这里不做乐观更新
            session?.setMicrophoneOn(target)
        }
    }

    fun toggleCamera() {
        val current = _state.value.self
        val target = !current.isCameraOn
        if (session == null) {
            _state.update { it.copy(self = it.self.copy(isCameraOn = target)) }
            return
        }
        viewModelScope.launch { session?.setCameraOn(target) }
    }

    fun switchCamera() {
        session?.switchCamera()
    }

    /** 屏幕共享按钮：共享中 → 停止；否则请求开始（SDK 会弹系统授权框） */
    fun toggleScreenShare() {
        val sharing = _state.value.self.isSharingScreen
        val s = session
        if (s == null) {
            _state.update { it.copy(self = it.self.copy(isSharingScreen = !sharing)) }
            return
        }
        if (sharing) s.stopScreenShare() else s.startScreenShare()
    }

    fun togglePin(userId: String) = _state.update {
        it.copy(pinnedId = if (it.pinnedId == userId) null else userId)
    }

    fun showMembers(show: Boolean) = _state.update { it.copy(showMembers = show) }

    fun askLeave() = _state.update { it.copy(showLeaveConfirm = true) }

    fun cancelLeave() = _state.update { it.copy(showLeaveConfirm = false) }

    /** 房主离开时可选「结束会议」，其他人一律只是离开 */
    fun leave(alsoEndRoom: Boolean, onDone: () -> Unit) {
        detach()
        session?.leaveRoom(alsoEndRoom = alsoEndRoom, onDone = onDone) ?: onDone()
    }

    override fun onCleared() {
        detach()
        super.onCleared()
    }

    // -----------------------------------------------------------------------
    // 内部：把 SDK 数据映射成界面模型
    // -----------------------------------------------------------------------

    private fun rebuildFromSdk() {
        val localUserId = TrtcRoomKitManager.currentUserId
        val ownerId = session?.ownerUserId
        val sharerId = _state.value.screenSharerId

        val mapped = rawParticipants.map { p ->
            val volume = volumes[p.userID] ?: 0
            MeetingParticipant(
                userId = p.userID,
                name = p.userName.ifEmpty { p.userID },
                avatarUrl = p.avatarURL,
                isMicOn = p.microphoneStatus == DeviceStatus.ON,
                isCameraOn = p.cameraStatus == DeviceStatus.ON,
                isSpeaking = volume > SPEAKING_THRESHOLD && p.microphoneStatus == DeviceStatus.ON,
                isSharingScreen = p.userID == sharerId || p.screenShareStatus == DeviceStatus.ON,
                isLocal = p.userID == localUserId,
                isOwner = ownerId != null && p.userID == ownerId,
                speakingVolume = volume,
                sdkParticipant = p
            )
        }

        val self = mapped.firstOrNull { it.isLocal }
            ?: MeetingParticipant(
                userId = localUserId.orEmpty(),
                name = "我",
                isLocal = true,
                isOwner = ownerId != null && ownerId == localUserId
            )

        _state.update {
            it.copy(
                self = self,
                remote = mapped.filterNot { p -> p.isLocal },
                connected = true
            )
        }
    }

    // -----------------------------------------------------------------------
    // 内部：计时 + 演示数据
    // -----------------------------------------------------------------------

    private fun startTimer() {
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _state.update { it.copy(elapsedSeconds = it.elapsedSeconds + 1) }
            }
        }
    }

    private fun startDemoSpeaking() {
        if (demoJob != null) return
        demoJob = viewModelScope.launch {
            while (true) {
                delay(Random.nextLong(2500, 5000))
                val candidates = demoRemote
                if (candidates.isEmpty()) continue
                val speaker = candidates[Random.nextInt(candidates.size)].userId
                _state.update { s ->
                    s.copy(
                        remote = s.remote.map {
                            it.copy(isSpeaking = it.userId == speaker, speakingVolume = if (it.userId == speaker) 40 else 0)
                        }
                    )
                }
            }
        }
    }

    private fun demoParticipants(): List<MeetingParticipant> = listOf(
        MeetingParticipant("u_wang", "王工"),
        MeetingParticipant("u_li", "李经理", isMicOn = false),
        MeetingParticipant("u_zhang", "张小雨", isCameraOn = false),
        MeetingParticipant("u_chen", "陈工"),
        MeetingParticipant("u_zhao", "赵总", isMicOn = false, isCameraOn = false)
    )

    init {
        // 演示模式下如果开着 DEBUG，直接给数据；真实场景由 attach() 覆盖
        if (BuildConfig.DEBUG) {
            viewModelScope.launch {
                delay(600)
                if (session == null && !_state.value.connected) useDemoData()
            }
        }
    }
}
