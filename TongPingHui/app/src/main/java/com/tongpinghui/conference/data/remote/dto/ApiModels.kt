package com.tongpinghui.conference.data.remote.dto

/**
 * 后端统一返回结构：{ "code": 0, "message": "ok", "data": {...} }
 * code == 0 表示成功，其它值表示业务错误（message 可直接展示）。
 */
data class ApiEnvelope<T>(
    val code: Int = 0,
    val message: String = "",
    val data: T? = null
)

// ---------------------------- 登录 / 注册 ----------------------------

data class LoginRequest(
    val account: String,
    val password: String
)

data class RegisterRequest(
    val account: String,
    val password: String,
    val nickname: String,
    val department: String = ""
)

data class LoginResponse(
    val token: String,
    val expiresIn: Long = 0,
    val user: UserDto
)

// ---------------------------- 用户 ----------------------------

data class UserDto(
    val id: String,
    val account: String,
    val nickname: String,
    val avatarUrl: String = "",
    val department: String = "",
    val updatedAt: Long = 0
)

data class UpdateProfileRequest(
    val nickname: String,
    val avatarUrl: String = "",
    val department: String = ""
)

data class ChangePasswordRequest(
    val oldPassword: String,
    val newPassword: String
)

// ---------------------------- 会议 ----------------------------

data class MeetingDto(
    val id: String,
    val roomId: String,
    val title: String,
    val ownerId: String,
    val ownerName: String = "",
    val startTime: Long = 0,
    val endTime: Long = 0,
    val status: String = "scheduled", // scheduled | ongoing | ended
    val password: String = ""
)

data class CreateMeetingRequest(
    val title: String,
    val startTime: Long = 0,
    val endTime: Long = 0,
    val password: String = ""
)

// ---------------------------- 腾讯云票据 ----------------------------

data class UserSigDto(
    val sdkAppId: Int,
    val userId: String,
    val userSig: String,
    val expireAt: Long = 0
)
