package com.tongpinghui.conference.ui.meeting

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.VideoCall
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.data.local.LastMeeting
import com.tongpinghui.conference.data.remote.dto.MeetingDto
import com.tongpinghui.conference.trtc.TrtcConfig
import com.tongpinghui.conference.ui.component.AppTopBar
import com.tongpinghui.conference.ui.component.AvatarButton
import com.tongpinghui.conference.ui.component.ConfirmDialog
import com.tongpinghui.conference.ui.component.EmptyHint
import com.tongpinghui.conference.ui.component.ErrorBar
import com.tongpinghui.conference.ui.component.LoadingBox
import com.tongpinghui.conference.ui.component.SecondaryButton
import com.tongpinghui.conference.ui.component.StatusChip
import com.tongpinghui.conference.ui.room.MeetingRoomActivity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class MeetingListUiState(
    val loading: Boolean = true,
    val meetings: List<MeetingDto> = emptyList(),
    val error: String? = null,
    val query: String = "",
    val nickname: String = "",
    val avatarUrl: String = "",
    val myUserId: String = "",
    val showJoinDialog: Boolean = false,
    val joinRoomId: String = "",
    val showCreateDialog: Boolean = false,
    val newTitle: String = "",
    val deleteTarget: MeetingDto? = null,
    /** 上次进过的会议（不小心退出后从这里一键回来） */
    val lastMeeting: LastMeeting? = null
) {
    val filtered: List<MeetingDto>
        get() = if (query.isBlank()) meetings else meetings.filter { m ->
            m.title.contains(query, true) ||
                m.roomId.contains(query) ||
                m.ownerName.contains(query, true)
        }
}

class MeetingListViewModel : ViewModel() {

    private val _state = MutableStateFlow(MeetingListUiState())
    val state: StateFlow<MeetingListUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            ServiceLocator.tokenStore.current()?.let { s ->
                _state.update {
                    it.copy(
                        nickname = s.nickname.ifEmpty { s.account },
                        avatarUrl = s.avatarUrl,
                        myUserId = s.userId
                    )
                }
            }
        }
        // 上次的会议：直接 collect 存储流 —— 在会议页退出回到列表时，卡片会自动出现/更新
        viewModelScope.launch {
            ServiceLocator.lastMeetingStore.flow.collect { last ->
                _state.update { it.copy(lastMeeting = last) }
            }
        }
        refresh()
    }

    /** 手动清掉「上次的会议」卡片 */
    fun forgetLastMeeting() {
        viewModelScope.launch { ServiceLocator.lastMeetingStore.clear() }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            ServiceLocator.meetingRepository.list()
                .onSuccess { list -> _state.update { it.copy(loading = false, meetings = list) } }
                .onFailure { e ->
                    _state.update { it.copy(loading = false, error = "加载会议列表失败：${e.message}") }
                }
        }
    }

    fun onQueryChange(value: String) = _state.update { it.copy(query = value) }

    // ---------------- 加入会议 ----------------
    fun showJoinDialog(show: Boolean) = _state.update { it.copy(showJoinDialog = show) }

    fun onJoinRoomIdChange(value: String) = _state.update {
        it.copy(joinRoomId = value.filter { c -> c.isLetterOrDigit() })
    }

    fun enterByRoomId(onEnter: (MeetingDto) -> Unit) {
        val roomId = _state.value.joinRoomId
        _state.update { it.copy(showJoinDialog = false, joinRoomId = "") }
        if (roomId.isBlank()) return
        onEnter(
            MeetingDto(
                id = "join-$roomId",
                roomId = roomId,
                title = "会议 $roomId",
                ownerId = "",
                ownerName = "",
                startTime = System.currentTimeMillis(),
                status = "ongoing"
            )
        )
    }

    // ---------------- 新建会议 ----------------
    fun showCreateDialog(show: Boolean) = _state.update { it.copy(showCreateDialog = show) }

    fun onNewTitleChange(value: String) = _state.update { it.copy(newTitle = value) }

    fun createMeeting(onEnter: (MeetingDto) -> Unit) {
        val title = _state.value.newTitle.ifBlank { "临时会议" }
        viewModelScope.launch {
            _state.update { it.copy(showCreateDialog = false, newTitle = "") }
            ServiceLocator.meetingRepository.create(title = title, startTime = System.currentTimeMillis())
                .onSuccess { meeting ->
                    _state.update { it.copy(meetings = listOf(meeting) + it.meetings) }
                    onEnter(meeting)
                }
                .onFailure {
                    // 后端没部署时也要能开会：房间号本地生成
                    onEnter(
                        MeetingDto(
                            id = "local-${System.currentTimeMillis()}",
                            roomId = TrtcConfig.newRoomId(),
                            title = title,
                            ownerId = _state.value.myUserId,
                            ownerName = _state.value.nickname,
                            startTime = System.currentTimeMillis(),
                            status = "ongoing"
                        )
                    )
                }
        }
    }

    // ---------------- 删除 ----------------
    fun askDelete(meeting: MeetingDto?) = _state.update { it.copy(deleteTarget = meeting) }

    fun confirmDelete() {
        val target = _state.value.deleteTarget ?: return
        _state.update { it.copy(deleteTarget = null) }
        viewModelScope.launch {
            ServiceLocator.meetingRepository.delete(target.id)
                .onSuccess {
                    _state.update { s -> s.copy(meetings = s.meetings.filterNot { it.id == target.id }) }
                }
                .onFailure { e ->
                    _state.update { it.copy(error = "删除失败：${e.message}") }
                }
        }
    }
}

/** 有状态外壳：拿 ViewModel、把「进入会议」这种带副作用的事接过来 */
@Composable
fun MeetingListRoute(
    onOpenProfile: () -> Unit,
    viewModel: MeetingListViewModel = viewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    MeetingListScreen(
        state = state,
        onOpenProfile = onOpenProfile,
        onRefresh = viewModel::refresh,
        onQueryChange = viewModel::onQueryChange,
        onOpenMeeting = { openRoom(context, it, state.myUserId) },
        onShowJoinDialog = viewModel::showJoinDialog,
        onJoinRoomIdChange = viewModel::onJoinRoomIdChange,
        onJoinConfirmed = {
            viewModel.enterByRoomId { meeting ->
                MeetingRoomActivity.start(
                    context = context,
                    roomId = meeting.roomId,
                    roomTitle = meeting.title,
                    isCreator = false
                )
            }
        },
        onShowCreateDialog = viewModel::showCreateDialog,
        onNewTitleChange = viewModel::onNewTitleChange,
        onCreateConfirmed = {
            viewModel.createMeeting { meeting ->
                MeetingRoomActivity.start(
                    context = context,
                    roomId = meeting.roomId,
                    roomTitle = meeting.title,
                    isCreator = true
                )
            }
        },
        onAskDelete = viewModel::askDelete,
        onConfirmDelete = viewModel::confirmDelete,
        onRejoinLast = { last ->
            MeetingRoomActivity.start(
                context = context,
                roomId = last.roomId,
                roomTitle = last.title,
                isCreator = last.isCreator
            )
        },
        onForgetLast = viewModel::forgetLastMeeting
    )
}

/** 纯界面：只认状态和回调，可直接 @Preview */
@Composable
fun MeetingListScreen(
    state: MeetingListUiState,
    onOpenProfile: () -> Unit = {},
    onRefresh: () -> Unit = {},
    onQueryChange: (String) -> Unit = {},
    onOpenMeeting: (MeetingDto) -> Unit = {},
    onShowJoinDialog: (Boolean) -> Unit = {},
    onJoinRoomIdChange: (String) -> Unit = {},
    onJoinConfirmed: () -> Unit = {},
    onShowCreateDialog: (Boolean) -> Unit = {},
    onNewTitleChange: (String) -> Unit = {},
    onCreateConfirmed: () -> Unit = {},
    onAskDelete: (MeetingDto?) -> Unit = {},
    onConfirmDelete: () -> Unit = {},
    onRejoinLast: (LastMeeting) -> Unit = {},
    onForgetLast: () -> Unit = {}
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {

            AppTopBar(title = "我的会议") {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Filled.Refresh, contentDescription = "刷新")
                }
                AvatarButton(
                    name = state.nickname.ifEmpty { "同" },
                    avatarUrl = state.avatarUrl,
                    onClick = onOpenProfile
                )
            }

            // ---------------- 搜索 ----------------
            OutlinedTextField(
                value = state.query,
                onValueChange = onQueryChange,
                placeholder = { Text("搜索会议名 / 房间号 / 发起人") },
                singleLine = true,
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.query.isNotEmpty()) {
                        IconButton(onClick = { onQueryChange("") }) {
                            Icon(Icons.Filled.Close, contentDescription = "清空")
                        }
                    }
                },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // ---------------- 快捷操作 ----------------
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SecondaryButton(
                    text = "加入会议",
                    icon = Icons.Filled.VideoCall,
                    modifier = Modifier.weight(1f)
                ) { onShowJoinDialog(true) }
                SecondaryButton(
                    text = "新建会议",
                    icon = Icons.Filled.Add,
                    modifier = Modifier.weight(1f)
                ) { onShowCreateDialog(true) }
            }

            // ---------------- 上次的会议（不小心退出后一键回来） ----------------
            state.lastMeeting?.let { last ->
                LastMeetingCard(
                    last = last,
                    onRejoin = { onRejoinLast(last) },
                    onForget = onForgetLast,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }

            if (state.error != null) {
                ErrorBar(message = state.error.orEmpty(), onRetry = onRefresh)
            }

            when {
                state.loading -> LoadingBox()

                state.meetings.isEmpty() -> EmptyHint(
                    "还没有会议记录\n点「新建会议」立刻开始，或用房间号加入别人的会议"
                )

                state.filtered.isEmpty() -> EmptyHint("没有匹配「${state.query}」的会议")

                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    // 底部多留 96dp，别让最后一条被「开会」悬浮按钮压住
                    contentPadding = PaddingValues(
                        start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.filtered, key = { it.id }) { meeting ->
                        MeetingItem(
                            meeting = meeting,
                            isMine = meeting.ownerId.isNotEmpty() && meeting.ownerId == state.myUserId,
                            onEnter = { onOpenMeeting(meeting) },
                            onCopyRoomId = {
                                clipboard.setText(AnnotatedString(meeting.roomId))
                            },
                            onDelete = { onAskDelete(meeting) }
                        )
                    }
                }
            }
        }

        ExtendedFloatingActionButton(
            onClick = { onShowCreateDialog(true) },
            icon = { Icon(Icons.Filled.Add, contentDescription = null) },
            text = { Text("开会") },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                // 悬浮按钮要躲开手势条/导航栏，否则会压在系统区域里
                .navigationBarsPadding()
                .padding(20.dp)
        )
    }

    // ---------------- 加入会议 ----------------
    if (state.showJoinDialog) {
        AlertDialog(
            onDismissRequest = { onShowJoinDialog(false) },
            title = { Text("加入会议") },
            text = {
                Column {
                    Text("输入房主分享的房间号", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = state.joinRoomId,
                        onValueChange = onJoinRoomIdChange,
                        singleLine = true,
                        label = { Text("房间号") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = onJoinConfirmed) { Text("进入") }
            },
            dismissButton = {
                TextButton(onClick = { onShowJoinDialog(false) }) { Text("取消") }
            }
        )
    }

    // ---------------- 新建会议 ----------------
    if (state.showCreateDialog) {
        AlertDialog(
            onDismissRequest = { onShowCreateDialog(false) },
            title = { Text("新建会议") },
            text = {
                OutlinedTextField(
                    value = state.newTitle,
                    onValueChange = onNewTitleChange,
                    singleLine = true,
                    label = { Text("会议主题") },
                    placeholder = { Text("例如：周一产品例会") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = onCreateConfirmed) { Text("立即开会") }
            },
            dismissButton = {
                TextButton(onClick = { onShowCreateDialog(false) }) { Text("取消") }
            }
        )
    }

    // ---------------- 删除确认 ----------------
    state.deleteTarget?.let { target ->
        ConfirmDialog(
            title = "删除会议",
            message = "确定删除「${target.title.ifEmpty { target.roomId }}」吗？会议记录会一并移除。",
            confirmText = "删除",
            danger = true,
            onConfirm = onConfirmDelete,
            onDismiss = { onAskDelete(null) }
        )
    }
}

private fun openRoom(context: Context, meeting: MeetingDto, myUserId: String) {
    MeetingRoomActivity.start(
        context = context,
        roomId = meeting.roomId,
        roomTitle = meeting.title.ifEmpty { "会议 ${meeting.roomId}" },
        isCreator = meeting.ownerId.isNotEmpty() && meeting.ownerId == myUserId
    )
}

@Composable
private fun MeetingItem(
    meeting: MeetingDto,
    isMine: Boolean,
    onEnter: () -> Unit,
    onCopyRoomId: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }
    val (statusText, statusColor) = remember(meeting) { meetingStatus(meeting) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEnter),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(start = 14.dp, top = 12.dp, bottom = 12.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.MeetingRoom,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(26.dp)
            )
            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = meeting.title.ifEmpty { "会议 ${meeting.roomId}" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(Modifier.width(8.dp))
                    StatusChip(text = statusText, color = statusColor)
                }
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "房间号 ${meeting.roomId}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clickable(onClick = onCopyRoomId)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = formatTime(meeting.startTime),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (isMine) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Person,
                            contentDescription = null,
                            modifier = Modifier.size(13.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = "我发起的",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Box {
                IconButton(onClick = { menuExpanded = true }) {
                    Icon(Icons.Filled.MoreVert, contentDescription = "更多")
                }
                DropdownMenu(
                    expanded = menuExpanded,
                    onDismissRequest = { menuExpanded = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("复制房间号") },
                        leadingIcon = { Icon(Icons.Filled.ContentCopy, contentDescription = null) },
                        onClick = {
                            menuExpanded = false
                            onCopyRoomId()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("进入会议") },
                        leadingIcon = { Icon(Icons.Filled.VideoCall, contentDescription = null) },
                        onClick = {
                            menuExpanded = false
                            onEnter()
                        }
                    )
                    if (isMine) {
                        DropdownMenuItem(
                            text = {
                                Text("删除", color = MaterialTheme.colorScheme.error)
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Filled.Delete,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            },
                            onClick = {
                                menuExpanded = false
                                onDelete()
                            }
                        )
                    }
                }
            }
        }
    }
}

private val OngoingColor = Color(0xFF2F9E44)
private val ScheduledColor = Color(0xFF1E6FFF)
private val EndedColor = Color(0xFF8A93A0)

/** 用 startTime 推断展示状态（后端只存 scheduled/ongoing/ended 三态） */
private fun meetingStatus(meeting: MeetingDto): Pair<String, Color> {
    val now = System.currentTimeMillis()
    return when {
        meeting.status == "ended" -> "已结束" to EndedColor
        meeting.startTime <= 0L || meeting.startTime > now -> "待开始" to ScheduledColor
        now - meeting.startTime < 4 * 60 * 60 * 1000L -> "进行中" to OngoingColor
        else -> "已结束" to EndedColor
    }
}

private val timeFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MM-dd HH:mm").withZone(ZoneId.systemDefault())

private fun formatTime(millis: Long): String =
    if (millis <= 0L) "时间待定" else runCatching {
        timeFormatter.format(Instant.ofEpochMilli(millis))
    }.getOrDefault("时间待定")

/** 「上次的会议」卡片：不小心退出后，不用再手输房间号，点一下就回去 */
@Composable
private fun LastMeetingCard(
    last: LastMeeting,
    onRejoin: () -> Unit,
    onForget: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .clickable(onClick = onRejoin)
                .padding(start = 14.dp, end = 2.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.VideoCall,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = "上次的会议 · ${last.title.ifEmpty { "会议 ${last.roomId}" }}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "房间号 ${last.roomId} · ${relativeJoinedTime(last.joinedAt)}退出",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            TextButton(onClick = onRejoin) { Text("重新进入") }
            IconButton(onClick = onForget, modifier = Modifier.size(36.dp)) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "不再显示",
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/** 刚刚 / N 分钟前 / N 小时前 / 昨天 / 具体时间 */
private fun relativeJoinedTime(millis: Long): String {
    if (millis <= 0L) return "刚刚"
    val diff = System.currentTimeMillis() - millis
    val minute = 60 * 1000L
    return when {
        diff < minute -> "刚刚"
        diff < 60 * minute -> "${diff / minute} 分钟前"
        diff < 24 * 60 * minute -> "${diff / (60 * minute)} 小时前"
        diff < 48 * 60 * minute -> "昨天"
        else -> runCatching { timeFormatter.format(Instant.ofEpochMilli(millis)) }.getOrDefault("")
    }
}
