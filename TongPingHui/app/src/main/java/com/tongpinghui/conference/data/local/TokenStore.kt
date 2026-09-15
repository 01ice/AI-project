package com.tongpinghui.conference.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore: DataStore<Preferences> by preferencesDataStore(name = "tp_session")

/**
 * 本地会话（登录票据 + 用户资料），DataStore 持久化。
 * token 由后端签发（JWT），同时用于：
 *  1) 调我们自己的 REST API
 *  2) 向自己后端换腾讯云 UserSig（正式环境，见 server/src/utils/userSig.js）
 */
data class Session(
    val token: String,
    val userId: String,
    val account: String,
    val nickname: String,
    val avatarUrl: String = "",
    val department: String = ""
)

class TokenStore(private val context: Context) {

    private val keyToken = stringPreferencesKey("token")
    private val keyUserId = stringPreferencesKey("userId")
    private val keyAccount = stringPreferencesKey("account")
    private val keyNickname = stringPreferencesKey("nickname")
    private val keyAvatar = stringPreferencesKey("avatarUrl")
    private val keyDepartment = stringPreferencesKey("department")

    val sessionFlow: Flow<Session?> = context.sessionDataStore.data.map { p ->
        val token = p[keyToken]
        if (token.isNullOrEmpty()) {
            null
        } else {
            Session(
                token = token,
                userId = p[keyUserId].orEmpty(),
                account = p[keyAccount].orEmpty(),
                nickname = p[keyNickname].orEmpty(),
                avatarUrl = p[keyAvatar].orEmpty(),
                department = p[keyDepartment].orEmpty()
            )
        }
    }

    suspend fun current(): Session? = context.sessionDataStore.data.first().let { p ->
        val token = p[keyToken]
        if (token.isNullOrEmpty()) {
            null
        } else {
            Session(
                token = token,
                userId = p[keyUserId].orEmpty(),
                account = p[keyAccount].orEmpty(),
                nickname = p[keyNickname].orEmpty(),
                avatarUrl = p[keyAvatar].orEmpty(),
                department = p[keyDepartment].orEmpty()
            )
        }
    }

    suspend fun save(session: Session) {
        context.sessionDataStore.edit { p ->
            p[keyToken] = session.token
            p[keyUserId] = session.userId
            p[keyAccount] = session.account
            p[keyNickname] = session.nickname
            p[keyAvatar] = session.avatarUrl
            p[keyDepartment] = session.department
        }
    }

    suspend fun updateProfile(nickname: String, avatarUrl: String, department: String) {
        context.sessionDataStore.edit { p ->
            p[keyNickname] = nickname
            p[keyAvatar] = avatarUrl
            p[keyDepartment] = department
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
    }
}
