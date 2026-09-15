package com.tongpinghui.conference

import android.app.Application
import android.util.Log
import com.tongpinghui.conference.core.ServiceLocator
import com.tongpinghui.conference.trtc.TrtcConfig

/**
 * 全局 Application。
 * 只做两件事：初始化依赖容器、检查腾讯云参数是否齐备。
 *
 * 说明：TUIRoomKit（AtomicXCore）不需要在这里手动初始化 SDK，
 * 登录（LoginStore.login）时会自动完成。屏幕共享同样是 SDK 内部接管 MediaProjection。
 */
class App : Application() {

    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)

        if (!TrtcConfig.hasSecretKey) {
            Log.w(
                TAG,
                "【待配置】local.properties 里的 TRTC_SDK_SECRET_KEY 还是空的。" +
                    "去 https://console.cloud.tencent.com/trtc 「应用管理 → 开发辅助」生成 SDKSecretKey 后填进去，" +
                    "否则本地用 GenerateTestUserSig 生成票据会失败（正式环境应由后端下发 UserSig）。"
            )
        }
    }

    companion object {
        const val TAG = "TongPingHui"
    }
}
