package com.tongpinghui.conference.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Login
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tongpinghui.conference.data.remote.dto.MeetingDto
import com.tongpinghui.conference.ui.component.Avatar
import com.tongpinghui.conference.ui.component.EmptyHint
import com.tongpinghui.conference.ui.component.ErrorBar
import com.tongpinghui.conference.ui.component.LoadingBox
import com.tongpinghui.conference.ui.component.PrimaryButton
import com.tongpinghui.conference.ui.component.SecondaryButton
import com.tongpinghui.conference.ui.component.SectionCard
import com.tongpinghui.conference.ui.component.StatusChip
import com.tongpinghui.conference.ui.login.LoginScreen
import com.tongpinghui.conference.ui.login.LoginUiState
import com.tongpinghui.conference.ui.meeting.MeetingListScreen
import com.tongpinghui.conference.ui.meeting.MeetingListUiState
import com.tongpinghui.conference.ui.profile.ProfileScreen
import com.tongpinghui.conference.ui.profile.ProfileUiState
import com.tongpinghui.conference.ui.room.MeetingParticipant
import com.tongpinghui.conference.ui.room.MeetingRoomScreen
import com.tongpinghui.conference.ui.room.MeetingUiState
import com.tongpinghui.conference.ui.room.ScreenShareState
import com.tongpinghui.conference.ui.theme.TongPingHuiTheme

/**
 * 所有设计时预览都集中在这里 —— Android Studio 里打开本文件，右侧 Design 面板即可看到。
 *
 * 注意：预览是「静态渲染」，不会真的连房间/网络，所以：
 *  - 会议房间预览用的是演示数据（没有腾讯云成员对象，画面位置显示头像，这是正常的）
 *  - 真实视频画面必须真机跑（RoomParticipantView 需要真实的房间与流）
 */

// ===========================================================================
// 会议房间
// ===========================================================================

private fun previewSelf(): MeetingParticipant = MeetingParticipant(
    userId = "u_admin",
    name = "我",
    isLocal = true,
    isOwner = true
)

private fun previewRemote(count: Int, shareIndex: Int = -1): List<MeetingParticipant> {
    val names = listOf("王工", "李经理", "张小雨", "陈工", "赵总", "孙工", "周工", "吴工")
    return List(count) { i ->
        MeetingParticipant(
            userId = "u_$i",
            name = names.getOrElse(i) { "同事${i + 1}" },
            isMicOn = i % 3 != 0,
            isCameraOn = i % 4 != 0,
            isSpeaking = i == 1,
            speakingVolume = if (i == 1) 42 else 0,
            isSharingScreen = i == shareIndex
        )
    }
}

private fun previewState(
    remoteCount: Int = 4,
    shareIndex: Int = -1,
    pinnedId: String? = null,
    demo: Boolean = false
) = MeetingUiState(
    roomId = "123456789",
    self = previewSelf(),
    remote = previewRemote(remoteCount, shareIndex),
    pinnedId = pinnedId,
    elapsedSeconds = 12 * 60 + 34,
    isDemoData = demo,
    connected = !demo,
    screenSharerId = if (shareIndex >= 0) "u_$shareIndex" else null
)

@Composable
private fun PreviewRoom(state: MeetingUiState, shareState: ScreenShareState = ScreenShareState.Idle) {
    TongPingHuiTheme {
        MeetingRoomScreen(
            roomTitle = "周一产品例会",
            roomId = "123456789",
            isCreator = true,
            shareState = shareState,
            state = state,
            onToggleMic = {},
            onToggleCamera = {},
            onToggleScreenShare = {},
            onTogglePin = {},
            onShowMembers = {},
            onLeave = {}
        )
    }
}

/** 5 人九宫格（默认布局，3 列） */
@Preview(name = "房间-九宫格5人", widthDp = 400, heightDp = 800)
@Composable
private fun PreviewRoomGrid() = PreviewRoom(previewState(remoteCount = 4))

/** 2 人时是 2 列 */
@Preview(name = "房间-2人", widthDp = 400, heightDp = 800)
@Composable
private fun PreviewRoomTwo() = PreviewRoom(previewState(remoteCount = 1))

/** 9 人（满格） */
@Preview(name = "房间-9人", widthDp = 400, heightDp = 860)
@Composable
private fun PreviewRoomNine() = PreviewRoom(previewState(remoteCount = 8))

/** 焦点布局：点某个画面放大 */
@Preview(name = "房间-焦点放大", widthDp = 400, heightDp = 800)
@Composable
private fun PreviewRoomFocus() = PreviewRoom(
    previewState(remoteCount = 4, pinnedId = "u_1")
)

/**
 * 有人在共享屏幕：出现红色提示条 + 那个人的画面位挂「共享中」角标。
 * 注意：预览里没有真实的腾讯云成员对象，所以顶部那块全宽的屏幕画面不会出现
 * （它需要真实的 RoomParticipant 才能订阅 SCREEN 流），真机上才有。
 */
@Preview(name = "房间-屏幕共享中", widthDp = 400, heightDp = 860)
@Composable
private fun PreviewRoomSharing() = PreviewRoom(
    state = previewState(remoteCount = 3, shareIndex = 0),
    shareState = ScreenShareState.Sharing
)

/** 自己正在共享（底部按钮变红 + 提示条带「停止共享」） */
@Preview(name = "房间-我在共享", widthDp = 400, heightDp = 860)
@Composable
private fun PreviewRoomSelfSharing() = PreviewRoom(
    state = previewState(remoteCount = 3, shareIndex = -1).let {
        it.copy(self = it.self.copy(isSharingScreen = true))
    },
    shareState = ScreenShareState.Sharing
)

/** 演示数据（右上角有「演示数据」小标） */
@Preview(name = "房间-演示数据", widthDp = 400, heightDp = 800)
@Composable
private fun PreviewRoomDemo() = PreviewRoom(
    previewState(remoteCount = 5, demo = true),
    shareState = ScreenShareState.Requesting
)

// ===========================================================================
// 组件库
// ===========================================================================

@Preview(name = "组件-头像", showBackground = true, widthDp = 360)
@Composable
private fun PreviewAvatars() {
    TongPingHuiTheme {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Avatar(name = "王工", size = 28.dp)
            Avatar(name = "李经理", size = 44.dp)
            Avatar(name = "张小雨", size = 56.dp)
            Avatar(name = "赵总", size = 72.dp)
            Text("← 没有头像时按昵称生成首字与配色")
        }
    }
}

@Preview(name = "组件-按钮与标签", showBackground = true, widthDp = 360)
@Composable
private fun PreviewButtons() {
    TongPingHuiTheme {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            PrimaryButton(text = "登录", icon = Icons.Filled.Login, onClick = {})
            PrimaryButton(text = "提交中…", loading = true, onClick = {})
            PrimaryButton(text = "不可点", enabled = false, onClick = {})
            SecondaryButton(text = "加入会议", icon = Icons.Filled.Add, onClick = {})
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip("进行中", Color(0xFF2F9E44))
                StatusChip("待开始", Color(0xFF1E6FFF))
                StatusChip("已结束", Color(0xFF8A93A0))
            }
            SectionCard(title = "分组卡片") {
                Text("卡片内容放这里", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Preview(name = "组件-状态占位", showBackground = true, widthDp = 360)
@Composable
private fun PreviewStates() {
    TongPingHuiTheme {
        Column(Modifier.fillMaxWidth()) {
            LoadingBox()
            EmptyHint("暂无会议，点下面的按钮新建一个")
            ErrorBar(message = "网络连接失败，请检查是否和电脑在同一 WiFi")
        }
    }
}

// ===========================================================================
// 登录 / 会议列表 / 个人信息
// 这三个页面已按「Route（有状态）+ Screen（纯界面）」拆开，所以能直接预览
// ===========================================================================

@Preview(name = "登录页", showBackground = true, widthDp = 380, heightDp = 860)
@Composable
private fun PreviewLogin() {
    TongPingHuiTheme {
        LoginScreen(
            state = LoginUiState(account = "10086", password = "123456")
        )
    }
}

@Preview(name = "登录页-报错", showBackground = true, widthDp = 380, heightDp = 860)
@Composable
private fun PreviewLoginError() {
    TongPingHuiTheme {
        LoginScreen(
            state = LoginUiState(
                account = "10086",
                password = "123",
                error = "账号或密码错误",
                passwordVisible = true
            )
        )
    }
}

@Preview(name = "会议列表", showBackground = true, widthDp = 380, heightDp = 860)
@Composable
private fun PreviewMeetingList() {
    TongPingHuiTheme {
        MeetingListScreen(state = previewMeetingListState())
    }
}

@Preview(name = "会议列表-空态", showBackground = true, widthDp = 380, heightDp = 860)
@Composable
private fun PreviewMeetingListEmpty() {
    TongPingHuiTheme {
        MeetingListScreen(
            state = MeetingListUiState(loading = false, nickname = "管理员")
        )
    }
}

@Preview(name = "个人信息", showBackground = true, widthDp = 380, heightDp = 900)
@Composable
private fun PreviewProfile() {
    TongPingHuiTheme {
        ProfileScreen(
            state = ProfileUiState(
                loading = false,
                account = "admin",
                nickname = "管理员",
                department = "IT 部",
                trtcUserId = "u_admin"
            )
        )
    }
}

@Preview(name = "个人信息-同步失败", showBackground = true, widthDp = 380, heightDp = 900)
@Composable
private fun PreviewProfileError() {
    TongPingHuiTheme {
        ProfileScreen(
            state = ProfileUiState(
                loading = false,
                account = "admin",
                nickname = "管理员",
                error = "资料同步失败：Failed to connect to /192.168.31.87:8080"
            )
        )
    }
}

private fun previewMeetingListState(): MeetingListUiState {
    val now = System.currentTimeMillis()
    return MeetingListUiState(
        loading = false,
        nickname = "管理员",
        myUserId = "u_admin",
        meetings = listOf(
            MeetingDto(
                id = "1", roomId = "123456789", title = "周一产品例会",
                ownerId = "u_admin", ownerName = "管理员",
                startTime = now, status = "ongoing"
            ),
            MeetingDto(
                id = "2", roomId = "987654321", title = "技术方案评审",
                ownerId = "u_wang", ownerName = "王工",
                startTime = now + 3_600_000, status = "scheduled"
            ),
            MeetingDto(
                id = "3", roomId = "555666777", title = "月度总结会",
                ownerId = "u_li", ownerName = "李经理",
                startTime = now - 2 * 86_400_000L, status = "ended"
            )
        )
    )
}

