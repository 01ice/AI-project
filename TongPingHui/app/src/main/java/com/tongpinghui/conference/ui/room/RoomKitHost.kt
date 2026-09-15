package com.tongpinghui.conference.ui.room

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tongpinghui.conference.ui.component.PrimaryButton
import com.tongpinghui.conference.ui.component.SecondaryButton
import com.trtc.uikit.roomkit.view.RoomMainView
import io.trtc.tuikit.atomicxcore.api.room.CreateRoomOptions
import io.trtc.tuikit.atomicxcore.api.room.RoomType
import androidx.compose.ui.viewinterop.AndroidView

/**
 * 直接使用 TUIRoomKit 自带的完整房间界面（含 UI 低代码集成）。
 *
 * 里面什么都有：九宫格/焦点布局、成员管理与禁麦、麦摄控制、屏幕共享、
 * 文字聊天、邀请、云端录制入口……不用自己写一行界面代码。
 *
 * 用法：把 MeetingRoomActivity 里的 [MeetingRoomActivity.UiMode] 改成 `SDK` 即可。
 *
 * ⚠️ 走这条路时不要再调 RoomSession 进房（RoomMainView 内部自己会 createAndJoin）：
 *   - behavior = Create → 房主身份创建并加入
 *   - behavior = Join   → 参会人身份加入（房间有密码时 SDK 会弹输入框）
 */
@Composable
fun RoomKitHost(
    roomId: String,
    roomName: String,
    isCreator: Boolean,
    autoEnableCamera: Boolean = true,
    autoEnableMicrophone: Boolean = true,
    modifier: Modifier = Modifier
) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            RoomMainView(context).apply {
                val behavior: RoomMainView.RoomBehavior = if (isCreator) {
                    RoomMainView.RoomBehavior.Create(CreateRoomOptions(roomName = roomName))
                } else {
                    RoomMainView.RoomBehavior.Join
                }
                val config = RoomMainView.ConnectConfig(
                    autoEnableMicrophone = autoEnableMicrophone,
                    autoEnableCamera = autoEnableCamera,
                    autoEnableSpeaker = true
                )
                init(roomId, RoomType.STANDARD, behavior, config)
            }
        }
    )
}

// ---------------------------------------------------------------------------
// 进入会议前的过渡/失败界面
// ---------------------------------------------------------------------------

@Composable
internal fun PreparingScreen(roomTitle: String, roomId: String, message: String) {
    Surface(color = Color(0xFF0B0F14), modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator(color = Color(0xFF1E6FFF))
            Spacer(Modifier.height(20.dp))
            Text(
                text = roomTitle,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(4.dp))
            Text(text = "房间号 $roomId", color = Color(0xFF9AA4B2), style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(16.dp))
            Text(text = message, color = Color(0xFFB8C0CC), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
internal fun MeetingFailedScreen(
    message: String,
    onRetry: () -> Unit,
    onBack: () -> Unit
) {
    Surface(color = Color(0xFF0B0F14), modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(28.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Filled.ErrorOutline,
                contentDescription = null,
                tint = Color(0xFFE5484D),
                modifier = Modifier.size(40.dp)
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text = "进入会议失败",
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = message,
                color = Color(0xFFB8C0CC),
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(24.dp))
            PrimaryButton(text = "重试", onClick = onRetry)
            Spacer(Modifier.height(10.dp))
            SecondaryButton(text = "返回", onClick = onBack)
        }
    }
}
