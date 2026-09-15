package com.tongpinghui.conference.core

import android.content.Context
import com.tongpinghui.conference.data.local.LastMeetingStore
import com.tongpinghui.conference.data.local.TokenStore
import com.tongpinghui.conference.data.remote.ApiClient
import com.tongpinghui.conference.data.remote.ApiService
import com.tongpinghui.conference.data.repository.AuthRepository
import com.tongpinghui.conference.data.repository.MeetingRepository
import com.tongpinghui.conference.data.repository.UserRepository

/**
 * 极简依赖容器（没有引入 Hilt/KSP，编译更快、少一层注解处理器的坑）。
 * 需要换 Hilt 时，把这里替换成 @Module 即可，上层调用点不用动。
 */
object ServiceLocator {

    /** Application Context，方便 ViewModel 取 ContentResolver 等系统服务 */
    lateinit var appContext: Context
        private set

    val tokenStore: TokenStore by lazy { TokenStore(appContext) }

    /** 最近一次进过的会议（会议列表页的「上次的会议」卡片用它） */
    val lastMeetingStore: LastMeetingStore by lazy { LastMeetingStore(appContext) }

    val api: ApiService by lazy { ApiClient.create(tokenStore) }

    val authRepository: AuthRepository by lazy { AuthRepository(api, tokenStore) }

    val userRepository: UserRepository by lazy { UserRepository(api) }

    val meetingRepository: MeetingRepository by lazy { MeetingRepository(api) }

    fun init(context: Context) {
        appContext = context.applicationContext
    }
}
