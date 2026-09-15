package com.tongpinghui.conference.service

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.IntentCompat
import com.tongpinghui.conference.App
import com.tongpinghui.conference.MainActivity
import com.tongpinghui.conference.R

/**
 * 屏幕共享前台服务。
 *
 * 为什么必须是前台服务：
 *  - Android 10+ 起，后台应用无法启动「屏幕捕获」，必须有前台服务常驻；
 *  - Android 14 (API 34) 起，必须
 *      1) 声明权限 FOREGROUND_SERVICE_MEDIA_PROJECTION（已在 AndroidManifest 里）
 *      2) Service 上写 foregroundServiceType="mediaProjection"
 *      3) 先 startForeground(...) 再 getMediaProjection(...)，否则抛 SecurityException
 *
 * 调用姿势（Activity 里）：
 *   1. val mpm = getSystemService(MediaProjectionManager::class.java)
 *   2. startActivityForResult(mpm.createScreenCaptureIntent(), REQ)
 *   3. onActivityResult 里 resultCode==RESULT_OK →
 *        ScreenShareService.start(context, resultCode, data!!)
 *   4. 停止： ScreenShareService.stop(context)
 */
class ScreenShareService : Service() {

    companion object {
        private const val TAG = "ScreenShareService"

        const val ACTION_START = "com.tongpinghui.conference.action.START_SCREEN_SHARE"
        const val ACTION_STOP = "com.tongpinghui.conference.action.STOP_SCREEN_SHARE"
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"

        private const val CHANNEL_ID = "screen_share"
        private const val NOTIFICATION_ID = 0x1001

        /**
         * 当前有效的 MediaProjection 实例。
         * 第 3 步接入 TRTC 推流时，就是把它交给 SDK：
         *   TRTCCloud / RoomKit 的 startScreenCapture(mediaProjection)
         */
        @Volatile
        var projection: MediaProjection? = null
            private set

        fun isSharing(): Boolean = projection != null

        fun start(context: Context, resultCode: Int, data: Intent) {
            val intent = Intent(context, ScreenShareService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_RESULT_CODE, resultCode)
                putExtra(EXTRA_RESULT_DATA, data)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.startService(
                Intent(context, ScreenShareService::class.java).apply { action = ACTION_STOP }
            )
        }

        private fun createScreenCaptureIntent(context: Context): Intent? {
            val manager = context.getSystemService(MediaProjectionManager::class.java) ?: return null
            return manager.createScreenCaptureIntent()
        }

        /** 便捷方法：一行拉起系统「开始录制或投放」授权弹窗，返回是否成功发起 */
        fun requestPermission(activity: Activity, requestCode: Int): Boolean {
            val intent = createScreenCaptureIntent(activity) ?: return false
            activity.startActivityForResult(intent, requestCode)
            return true
        }
    }

    private var localProjection: MediaProjection? = null

    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            Log.i(TAG, "MediaProjection 已被系统或用户停止")
            releaseProjection()
            stopSelfSafely()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> handleStart(intent)
            ACTION_STOP -> {
                releaseProjection()
                stopSelfSafely()
            }

            else -> stopSelfSafely()
        }
        // 屏幕共享与会议强绑定，进程被杀就结束，不自动重启
        return START_NOT_STICKY
    }

    private fun handleStart(intent: Intent) {
        // ① 先成为前台服务（API 34 必须在 getMediaProjection 之前）
        startForegroundCompat()

        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        var resultData: Intent? = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA)
        }

        if (resultCode != Activity.RESULT_OK || resultData == null) {
            Log.w(TAG, "用户未授权屏幕捕获，服务退出")
            stopSelfSafely()
            return
        }

        // ② 拿到 MediaProjection（API 34 起必须在 registerCallback 之后才能建 VirtualDisplay）
        val manager = getSystemService(MediaProjectionManager::class.java)
        val mediaProjection = try {
            manager.getMediaProjection(resultCode, resultData)
        } catch (t: Throwable) {
            Log.e(TAG, "getMediaProjection 失败", t)
            null
        }

        if (mediaProjection == null) {
            stopSelfSafely()
            return
        }

        mediaProjection.registerCallback(projectionCallback, null)
        localProjection = mediaProjection
        projection = mediaProjection
        Log.i(TAG, "屏幕共享已开始，projection=$mediaProjection")
    }

    override fun onDestroy() {
        releaseProjection()
        super.onDestroy()
    }

    private fun releaseProjection() {
        runCatching { localProjection?.unregisterCallback(projectionCallback) }
        runCatching { localProjection?.stop() }
        localProjection = null
        projection = null
    }

    private fun stopSelfSafely() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startForegroundCompat() {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        } else {
            0
        }
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type)
        } catch (t: Throwable) {
            // Android 14 上如果缺少 FOREGROUND_SERVICE_MEDIA_PROJECTION 会抛 SecurityException
            Log.e(TAG, "startForeground 失败，请检查 manifest 权限声明", t)
            stopSelf()
        }
    }

    private fun buildNotification(): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, ScreenShareService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_screen_share)
            .setContentTitle(getString(R.string.screen_share_notification_title))
            .setContentText(getString(R.string.screen_share_notification_text))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .addAction(
                0,
                getString(R.string.screen_share_action_stop),
                stopIntent
            )
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.screen_share_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.screen_share_channel_desc)
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)
    }
}
