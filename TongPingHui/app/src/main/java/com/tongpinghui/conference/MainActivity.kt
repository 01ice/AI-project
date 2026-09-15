package com.tongpinghui.conference

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.tongpinghui.conference.ui.AppNavHost
import com.tongpinghui.conference.ui.theme.TongPingHuiTheme

/**
 * 唯一的主 Activity（Compose 单 Activity 架构）。
 * 会议房间是独立 Activity（MeetingRoomActivity），因为要横屏 + 承载原生 View。
 */
class MainActivity : ComponentActivity() {

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* 拒绝也不阻塞主流程 */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestNotificationIfNeeded()

        setContent {
            TongPingHuiTheme {
                AppNavHost()
            }
        }
    }

    /** Android 13+ 前台服务通知需要用户授权（屏幕共享常驻通知会用到） */
    private fun requestNotificationIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
