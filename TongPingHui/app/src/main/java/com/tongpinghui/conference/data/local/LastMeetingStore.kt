package com.tongpinghui.conference.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.lastMeetingDataStore: DataStore<Preferences> by preferencesDataStore(name = "tp_last_meeting")

/**
 * 最近一次进过的会议（只留一条）。
 *
 * 用途：被拉进会议的人不小心退出后，不用再手输房间号 —— 会议列表页会显示一张
 * 「上次的会议」卡片，点一下就回来。
 *
 * ⚠️ 故意用**独立**的 DataStore：`TokenStore.clear()`（退出登录）是 `edit { it.clear() }`，
 * 会把同一个库里的数据一起清掉；而「上次的会议」不该因为退出登录就丢。
 */
data class LastMeeting(
    val roomId: String,
    val title: String,
    val isCreator: Boolean,
    val joinedAt: Long
)

class LastMeetingStore(private val context: Context) {

    private val keyRoomId = stringPreferencesKey("roomId")
    private val keyTitle = stringPreferencesKey("title")
    private val keyIsCreator = booleanPreferencesKey("isCreator")
    private val keyJoinedAt = longPreferencesKey("joinedAt")

    /** 界面直接 collect，这样从会议页退出回到列表时能自动拿到最新值 */
    val flow: Flow<LastMeeting?> = context.lastMeetingDataStore.data.map { p ->
        val roomId = p[keyRoomId]
        if (roomId.isNullOrEmpty()) {
            null
        } else {
            LastMeeting(
                roomId = roomId,
                title = p[keyTitle].orEmpty(),
                isCreator = p[keyIsCreator] ?: false,
                joinedAt = p[keyJoinedAt] ?: 0L
            )
        }
    }

    suspend fun current(): LastMeeting? = flow.first()

    suspend fun save(meeting: LastMeeting) {
        context.lastMeetingDataStore.edit { p ->
            p[keyRoomId] = meeting.roomId
            p[keyTitle] = meeting.title
            p[keyIsCreator] = meeting.isCreator
            p[keyJoinedAt] = meeting.joinedAt
        }
    }

    suspend fun clear() {
        context.lastMeetingDataStore.edit { it.clear() }
    }
}
