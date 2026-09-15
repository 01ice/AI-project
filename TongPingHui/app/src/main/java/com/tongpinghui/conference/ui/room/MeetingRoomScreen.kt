package com.tongpinghui.conference.ui.room

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.ScreenShare
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StopScreenShare
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.tongpinghui.conference.ui.component.Avatar
import io.trtc.tuikit.atomicxcore.api.view.VideoStreamType

/** 屏幕共享的三种状态（由 Activity 持有 MediaProjection 后回传） */
enum class ScreenShareState { Idle, Requesting, Sharing }

private val StageBg = Color(0xFF0B0F14)
private val TileBg = Color(0xFF1A2029)
private val TileBgActive = Color(0xFF14263F)
private val BarBg = Color(0xFF141A22)
private val BrandBlue = Color(0xFF1E6FFF)
private val DangerRed = Color(0xFFE5484D)
private val SpeakingGreen = Color(0xFF37D67A)

/**
 * 会议房间界面：九宫格视频 + 底部控制栏（含屏幕共享）。
 *
 * 视频画面本身在第 3 步接入（TUIRoomKit 的 RoomMainView / TRTC 渲染视图）；
 * 这里给出的是完整的布局、状态与交互骨架：谁在说话高亮、点击放大、共享提示条、
 * 成员列表、计时。数据源换成 RoomStore 的成员列表即可。
 */
@Composable
fun MeetingRoomScreen(
    roomTitle: String,
    roomId: String,
    isCreator: Boolean,
    shareState: ScreenShareState,
    state: MeetingUiState,
    onToggleMic: () -> Unit,
    onToggleCamera: () -> Unit,
    onToggleScreenShare: () -> Unit,
    onTogglePin: (String) -> Unit,
    onShowMembers: (Boolean) -> Unit,
    onLeave: () -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    Surface(color = StageBg, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {

            // ---------------- 顶部信息条 ----------------
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    // edge-to-edge 下自己吃状态栏内边距，否则会议名/房间号会被状态栏压住
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = roomTitle,
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1
                    )
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "房间号 $roomId",
                            color = Color(0xFF9AA4B2),
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(Modifier.width(8.dp))
                        Icon(
                            Icons.Filled.ContentCopy,
                            contentDescription = "复制房间号",
                            tint = Color(0xFF9AA4B2),
                            modifier = Modifier
                                .size(14.dp)
                                .clickable {
                                    clipboard.setText(AnnotatedString(roomId))
                                    Toast.makeText(context, "房间号已复制", Toast.LENGTH_SHORT).show()
                                }
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (state.isDemoData) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(0x33FFB020))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "演示数据",
                                color = Color(0xFFFFB020),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(
                        text = state.elapsedText,
                        color = Color(0xFF9AA4B2),
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(Modifier.width(10.dp))
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0x1AFFFFFF))
                            .clickable { onShowMembers(true) }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Filled.People,
                            contentDescription = "成员",
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = state.memberCount.toString(),
                            color = Color.White,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }

            // ---------------- 谁在共享 ----------------
            state.screenSharer?.let { sharer ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0x26E5484D))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Filled.ScreenShare,
                        contentDescription = null,
                        tint = DangerRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = if (sharer.isLocal) "你正在共享屏幕" else "${sharer.name} 正在共享屏幕",
                        color = Color.White,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    if (sharer.isLocal) {
                        Text(
                            text = "停止共享",
                            color = DangerRed,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.clickable { onToggleScreenShare() }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            // ---------------- 视频区 ----------------
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp)
            ) {
                val pinned = state.all.firstOrNull { it.userId == state.pinnedId }
                if (pinned != null) {
                    PinnedLayout(
                        pinned = pinned,
                        others = state.all.filter { it.userId != pinned.userId },
                        screenSharer = state.screenSharer,
                        onTogglePin = onTogglePin
                    )
                } else {
                    ParticipantGrid(
                        participants = state.all,
                        screenSharer = state.screenSharer,
                        onTogglePin = onTogglePin
                    )
                }
            }

            // ---------------- 底部控制栏 ----------------
            ControlBar(
                isMicOn = state.self.isMicOn,
                isCameraOn = state.self.isCameraOn,
                shareState = shareState,
                memberCount = state.memberCount,
                onToggleMic = onToggleMic,
                onToggleCamera = onToggleCamera,
                onToggleScreenShare = onToggleScreenShare,
                onShowMembers = { onShowMembers(true) },
                onLeave = onLeave
            )
        }
    }

    // ---------------- 成员列表 ----------------
    if (state.showMembers) {
        AlertDialog(
            onDismissRequest = { onShowMembers(false) },
            title = { Text("参会成员（${state.memberCount}）") },
            text = {
                LazyColumn(Modifier.height(320.dp)) {
                    items(state.all, key = { it.userId }) { member ->
                        MemberRow(member)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { onShowMembers(false) }) { Text("关闭") }
            }
        )
    }
}

// ---------------------------------------------------------------------------
// 视频区
// ---------------------------------------------------------------------------

@Composable
private fun ParticipantGrid(
    participants: List<MeetingParticipant>,
    screenSharer: MeetingParticipant?,
    onTogglePin: (String) -> Unit
) {
    val columns = when {
        participants.size <= 1 -> 1
        participants.size <= 4 -> 2
        participants.size <= 9 -> 3
        else -> 4
    }
    LazyVerticalGrid(
        columns = GridCells.Fixed(columns),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // 有人在共享屏幕时，顶部单独给一块全宽画面（走 SDK 的 SCREEN 流）
        if (screenSharer != null && screenSharer.sdkParticipant != null) {
            item(key = "screen-share-tile", span = { GridItemSpan(maxLineSpan) }) {
                ParticipantTile(
                    participant = screenSharer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 10f),
                    onClick = { onTogglePin(screenSharer.userId) },
                    streamType = VideoStreamType.SCREEN,
                    label = "${screenSharer.name} 的屏幕"
                )
            }
        }
        gridItems(participants, key = { it.userId }) { participant ->
            ParticipantTile(
                participant = participant,
                modifier = Modifier.aspectRatio(if (columns == 1) 0.62f else 0.78f),
                onClick = { onTogglePin(participant.userId) }
            )
        }
    }
}

@Composable
private fun PinnedLayout(
    pinned: MeetingParticipant,
    others: List<MeetingParticipant>,
    screenSharer: MeetingParticipant?,
    onTogglePin: (String) -> Unit
) {
    // 焦点画面：如果焦点人就是共享者，那就显示屏幕流
    val pinnedIsSharer = screenSharer != null && screenSharer.userId == pinned.userId

    Column(Modifier.fillMaxSize()) {
        ParticipantTile(
            participant = pinned,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(4.dp),
            onClick = { onTogglePin(pinned.userId) },
            big = true,
            streamType = if (pinnedIsSharer) VideoStreamType.SCREEN else VideoStreamType.CAMERA,
            label = if (pinnedIsSharer) "${pinned.name} 的屏幕" else null
        )
        if (others.isNotEmpty()) {
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(104.dp)
                    .padding(vertical = 6.dp),
                contentPadding = PaddingValues(horizontal = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(others, key = { it.userId }) { participant ->
                    ParticipantTile(
                        participant = participant,
                        modifier = Modifier
                            .width(104.dp)
                            .fillMaxHeight(),
                        onClick = { onTogglePin(participant.userId) },
                        compact = true
                    )
                }
            }
        }
    }
}

@Composable
private fun ParticipantTile(
    participant: MeetingParticipant,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    big: Boolean = false,
    compact: Boolean = false,
    streamType: VideoStreamType = VideoStreamType.CAMERA,
    label: String? = null
) {
    val speaking = participant.isSpeaking
    val avatarSize = when {
        big -> 96.dp
        compact -> 36.dp
        else -> 54.dp
    }
    val sdk = participant.sdkParticipant
    // 屏幕共享流始终显示；摄像头流只在摄像头开着时显示（关了就看头像）
    val showVideo = sdk != null && (streamType == VideoStreamType.SCREEN || participant.isCameraOn)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (speaking) TileBgActive else TileBg)
            .border(
                width = if (speaking) 2.dp else 1.dp,
                color = if (speaking) SpeakingGreen else Color(0x14FFFFFF),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (showVideo) {
            // 真实画面：交给 TUIRoomKit 的 RoomParticipantView（订阅/渲染都由 SDK 负责）
            AndroidView(
                factory = { ctx -> ParticipantVideoView(ctx) },
                update = { view ->
                    view.bind(
                        participant = sdk,
                        streamType = streamType,
                        fill = streamType == VideoStreamType.CAMERA
                    )
                },
                onRelease = { view -> view.release() },
                modifier = Modifier.fillMaxSize()
            )
            // 画面上的名字/标识浮层
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0x88000000))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = label
                        ?: if (participant.isLocal) "${participant.name}（我）" else participant.name,
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 1
                )
                if (participant.isSpeaking) {
                    Spacer(Modifier.width(4.dp))
                    Text("•••", color = SpeakingGreen, style = MaterialTheme.typography.labelSmall)
                }
            }
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Avatar(
                    name = participant.name.ifEmpty { "?" },
                    avatarUrl = participant.avatarUrl,
                    size = avatarSize
                )
                if (!compact) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = label
                                ?: if (participant.isLocal) "${participant.name}（我）" else participant.name,
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                            fontSize = if (big) 16.sp else 13.sp,
                            maxLines = 1
                        )
                        if (participant.isSpeaking) {
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "•••",
                                color = SpeakingGreen,
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                }
            }
        }

        // 麦克风状态
        if (!participant.isMicOn) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(6.dp)
                    .clip(CircleShape)
                    .background(DangerRed)
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Filled.MicOff,
                    contentDescription = "已静音",
                    tint = Color.White,
                    modifier = Modifier.size(12.dp)
                )
            }
        }

        // 摄像头关闭提示
        if (!participant.isCameraOn && !compact) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(6.dp)
                    .clip(CircleShape)
                    .background(Color(0x66000000))
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Filled.VideocamOff,
                    contentDescription = "摄像头关闭",
                    tint = Color(0xFFB8C0CC),
                    modifier = Modifier.size(12.dp)
                )
            }
        }

        // 共享中
        if (participant.isSharingScreen) {
            Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(DangerRed)
                    .padding(horizontal = 5.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Filled.ScreenShare,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(3.dp))
                Text("共享中", color = Color.White, style = MaterialTheme.typography.labelSmall)
            }
        }

        // 房主
        if (participant.isOwner && !compact) {
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 6.dp, top = if (participant.isCameraOn) 6.dp else 34.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Filled.Star,
                    contentDescription = "房主",
                    tint = Color(0xFFFFC53D),
                    modifier = Modifier.size(11.dp)
                )
                Spacer(Modifier.width(3.dp))
                Text("房主", color = Color(0xFFFFC53D), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 底部控制栏
// ---------------------------------------------------------------------------

@Composable
private fun ControlBar(
    isMicOn: Boolean,
    isCameraOn: Boolean,
    shareState: ScreenShareState,
    memberCount: Int,
    onToggleMic: () -> Unit,
    onToggleCamera: () -> Unit,
    onToggleScreenShare: () -> Unit,
    onShowMembers: () -> Unit,
    onLeave: () -> Unit
) {
    Surface(color = BarBg, modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ControlButton(
                icon = if (isMicOn) Icons.Filled.Mic else Icons.Filled.MicOff,
                label = if (isMicOn) "静音" else "取消静音",
                warning = !isMicOn,
                onClick = onToggleMic
            )
            ControlButton(
                icon = if (isCameraOn) Icons.Filled.Videocam else Icons.Filled.VideocamOff,
                label = if (isCameraOn) "关摄像头" else "开摄像头",
                warning = !isCameraOn,
                onClick = onToggleCamera
            )
            ControlButton(
                icon = if (shareState == ScreenShareState.Sharing) Icons.Filled.StopScreenShare
                else Icons.Filled.ScreenShare,
                label = when (shareState) {
                    ScreenShareState.Sharing -> "停止共享"
                    ScreenShareState.Requesting -> "授权中…"
                    ScreenShareState.Idle -> "共享屏幕"
                },
                active = shareState != ScreenShareState.Idle,
                onClick = onToggleScreenShare
            )
            ControlButton(
                icon = Icons.Filled.People,
                label = "成员",
                badge = memberCount,
                onClick = onShowMembers
            )
            ControlButton(
                icon = Icons.Filled.CallEnd,
                label = "离开",
                danger = true,
                onClick = onLeave
            )
        }
    }
}

@Composable
private fun ControlButton(
    icon: ImageVector,
    label: String,
    active: Boolean = false,
    warning: Boolean = false,
    danger: Boolean = false,
    badge: Int? = null,
    onClick: () -> Unit
) {
    val bg = when {
        danger -> DangerRed
        warning -> Color(0x33E5484D)
        active -> BrandBlue
        else -> Color(0x1AFFFFFF)
    }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Box(contentAlignment = Alignment.TopEnd) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(bg),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(22.dp))
            }
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(BrandBlue)
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = badge.toString(),
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text = label,
            color = Color(0xFFB8C0CC),
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1
        )
    }
}

// ---------------------------------------------------------------------------
// 成员行
// ---------------------------------------------------------------------------

@Composable
private fun MemberRow(member: MeetingParticipant) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(name = member.name, avatarUrl = member.avatarUrl, size = 36.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (member.isLocal) "${member.name}（我）" else member.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                if (member.isOwner) {
                    Spacer(Modifier.width(6.dp))
                    Icon(
                        Icons.Filled.Star,
                        contentDescription = "房主",
                        tint = Color(0xFFFFB300),
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
            Text(
                text = buildString {
                    append(if (member.isMicOn) "麦克风开" else "麦克风关")
                    append(" · ")
                    append(if (member.isCameraOn) "摄像头开" else "摄像头关")
                    if (member.isSharingScreen) append(" · 共享屏幕中")
                },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            imageVector = if (member.isMicOn) Icons.Filled.Mic else Icons.Filled.MicOff,
            contentDescription = null,
            tint = if (member.isMicOn) Color(0xFF2F9E44) else Color(0xFFB0B7C3),
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(10.dp))
        Icon(
            imageVector = if (member.isCameraOn) Icons.Filled.Videocam else Icons.Filled.VideocamOff,
            contentDescription = null,
            tint = if (member.isCameraOn) Color(0xFF2F9E44) else Color(0xFFB0B7C3),
            modifier = Modifier.size(18.dp)
        )
    }
}
