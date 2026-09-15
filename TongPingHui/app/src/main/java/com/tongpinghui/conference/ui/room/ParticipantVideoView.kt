package com.tongpinghui.conference.ui.room

import android.content.Context
import android.util.AttributeSet
import android.widget.FrameLayout
import io.trtc.tuikit.atomicxcore.api.room.RoomParticipant
import io.trtc.tuikit.atomicxcore.api.view.FillMode
import io.trtc.tuikit.atomicxcore.api.view.RoomParticipantView
import io.trtc.tuikit.atomicxcore.api.view.VideoStreamType

/**
 * 一路视频画面（摄像头流或屏幕共享流）。
 *
 * TUIRoomKit 的订阅是「把 View 绑到参与者」：调用 [RoomParticipantView.init] 之后
 * SDK 自己负责订阅远端流、渲染、断流重连，我们只要在状态变化时调
 * [RoomParticipantView.updateParticipant] 即可。Compose 里配合 AndroidView 使用，见
 * [MeetingRoomScreen] 的 ParticipantTile。
 */
class ParticipantVideoView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val participantView = RoomParticipantView(context)
    private var boundKey: String? = null

    init {
        addView(
            participantView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
    }

    /**
     * @param streamType [VideoStreamType.CAMERA] 摄像头画面；[VideoStreamType.SCREEN] 屏幕共享画面
     * @param fill true = 裁剪填满（摄像头），false = 完整显示（共享屏幕用，别裁内容）
     */
    fun bind(participant: RoomParticipant, streamType: VideoStreamType, fill: Boolean = true) {
        val key = "${participant.userID}#$streamType"
        if (key != boundKey) {
            // 换人或换流类型才重新 init，否则只更新状态，避免画面闪烁
            boundKey = key
            participantView.init(streamType, participant)
        } else {
            participantView.updateParticipant(participant)
        }
        participantView.setFillMode(if (fill) FillMode.FILL else FillMode.FIT)
        participantView.setActive(true)
    }

    fun release() {
        participantView.setActive(false)
        boundKey = null
    }
}
