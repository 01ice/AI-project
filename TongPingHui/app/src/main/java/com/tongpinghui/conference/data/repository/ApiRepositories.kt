package com.tongpinghui.conference.data.repository

import com.tongpinghui.conference.data.local.Session
import com.tongpinghui.conference.data.local.TokenStore
import com.tongpinghui.conference.data.remote.ApiService
import com.tongpinghui.conference.data.remote.dto.ChangePasswordRequest
import com.tongpinghui.conference.data.remote.dto.CreateMeetingRequest
import com.tongpinghui.conference.data.remote.dto.LoginRequest
import com.tongpinghui.conference.data.remote.dto.MeetingDto
import com.tongpinghui.conference.data.remote.dto.RegisterRequest
import com.tongpinghui.conference.data.remote.dto.UpdateProfileRequest
import com.tongpinghui.conference.data.remote.dto.UserDto
import com.tongpinghui.conference.data.remote.dto.UserSigDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * 统一把「网络异常 / 业务 code != 0」收敛成 Result.failure(IllegalStateException(msg))，
 * UI 层只需要读 exception.message 就能直接弹提示。
 */
private inline fun <T> envelope(
    code: Int,
    message: String,
    data: T?
): T {
    if (code != 0) throw IllegalStateException(message.ifEmpty { "请求失败（code=$code）" })
    return data ?: throw IllegalStateException("服务端返回数据为空")
}

// ===========================================================================
// 鉴权
// ===========================================================================
class AuthRepository(
    private val api: ApiService,
    private val tokenStore: TokenStore
) {

    suspend fun login(account: String, password: String): Result<Session> = runCatching {
        val resp = api.login(LoginRequest(account.trim(), password))
        val payload = envelope(resp.code, resp.message, resp.data)
        val session = Session(
            token = payload.token,
            userId = payload.user.id,
            account = payload.user.account,
            nickname = payload.user.nickname,
            avatarUrl = payload.user.avatarUrl,
            department = payload.user.department
        )
        tokenStore.save(session)
        session
    }

    suspend fun register(
        account: String,
        password: String,
        nickname: String,
        department: String
    ): Result<Session> = runCatching {
        val resp = api.register(RegisterRequest(account.trim(), password, nickname, department))
        val payload = envelope(resp.code, resp.message, resp.data)
        val session = Session(
            token = payload.token,
            userId = payload.user.id,
            account = payload.user.account,
            nickname = payload.user.nickname,
            avatarUrl = payload.user.avatarUrl,
            department = payload.user.department
        )
        tokenStore.save(session)
        session
    }

    suspend fun logout() {
        runCatching { api.logout() }
        tokenStore.clear()
    }

    suspend fun currentSession(): Session? = tokenStore.current()
}

// ===========================================================================
// 个人信息
// ===========================================================================
class UserRepository(private val api: ApiService) {

    suspend fun me(): Result<UserDto> = runCatching {
        val resp = api.me()
        envelope(resp.code, resp.message, resp.data)
    }

    suspend fun updateProfile(
        nickname: String,
        avatarUrl: String,
        department: String
    ): Result<UserDto> = runCatching {
        val resp = api.updateMe(UpdateProfileRequest(nickname, avatarUrl, department))
        envelope(resp.code, resp.message, resp.data)
    }

    suspend fun changePassword(old: String, new: String): Result<Unit> = runCatching {
        val resp = api.changePassword(ChangePasswordRequest(old, new))
        envelope(resp.code, resp.message, resp.data ?: Unit)
    }

    /** 上传头像，成功后服务端返回带 avatarUrl 的用户信息 */
    suspend fun uploadAvatar(
        bytes: ByteArray,
        fileName: String,
        mimeType: String
    ): Result<UserDto> = runCatching {
        val body = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", fileName, body)
        val resp = api.uploadAvatar(part)
        envelope(resp.code, resp.message, resp.data)
    }
}

// ===========================================================================
// 会议
// ===========================================================================
class MeetingRepository(private val api: ApiService) {

    suspend fun list(): Result<List<MeetingDto>> = runCatching {
        val resp = api.listMeetings()
        envelope(resp.code, resp.message, resp.data)
    }

    suspend fun create(
        title: String,
        startTime: Long = System.currentTimeMillis(),
        endTime: Long = 0L,
        password: String = ""
    ): Result<MeetingDto> = runCatching {
        val resp = api.createMeeting(CreateMeetingRequest(title, startTime, endTime, password))
        envelope(resp.code, resp.message, resp.data)
    }

    suspend fun delete(id: String): Result<Unit> = runCatching {
        val resp = api.deleteMeeting(id)
        envelope(resp.code, resp.message, resp.data ?: Unit)
    }

    /**
     * 取腾讯云 UserSig。
     * 优先走自建后端；后端还没部署时（或本地调试）由 TrtcUserSig 本地算，见 trtc 包。
     */
    suspend fun userSig(userId: String): Result<UserSigDto> = runCatching {
        val resp = api.fetchUserSig(userId)
        envelope(resp.code, resp.message, resp.data)
    }
}
