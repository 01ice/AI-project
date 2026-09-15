package com.tongpinghui.conference.data.remote

import com.tongpinghui.conference.data.remote.dto.ApiEnvelope
import com.tongpinghui.conference.data.remote.dto.ChangePasswordRequest
import com.tongpinghui.conference.data.remote.dto.CreateMeetingRequest
import com.tongpinghui.conference.data.remote.dto.LoginRequest
import com.tongpinghui.conference.data.remote.dto.LoginResponse
import com.tongpinghui.conference.data.remote.dto.MeetingDto
import com.tongpinghui.conference.data.remote.dto.RegisterRequest
import com.tongpinghui.conference.data.remote.dto.UpdateProfileRequest
import com.tongpinghui.conference.data.remote.dto.UserDto
import com.tongpinghui.conference.data.remote.dto.UserSigDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import okhttp3.MultipartBody

/**
 * 后端 REST 接口（模板实现见项目根目录 server/）。
 * 所有接口都返回 ApiEnvelope<T>，业务码在 code 字段里。
 */
interface ApiService {

    // ------------------------- 鉴权 -------------------------

    @POST("api/v1/auth/login")
    suspend fun login(@Body body: LoginRequest): ApiEnvelope<LoginResponse>

    @POST("api/v1/auth/register")
    suspend fun register(@Body body: RegisterRequest): ApiEnvelope<LoginResponse>

    @POST("api/v1/auth/logout")
    suspend fun logout(): ApiEnvelope<Unit>

    // ------------------------- 个人信息 -------------------------

    @GET("api/v1/users/me")
    suspend fun me(): ApiEnvelope<UserDto>

    @PUT("api/v1/users/me")
    suspend fun updateMe(@Body body: UpdateProfileRequest): ApiEnvelope<UserDto>

    @PUT("api/v1/users/me/password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): ApiEnvelope<Unit>

    /** 头像上传（multipart/form-data，字段名必须叫 file） */
    @Multipart
    @POST("api/v1/users/me/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): ApiEnvelope<UserDto>

    // ------------------------- 会议 -------------------------

    @GET("api/v1/meetings")
    suspend fun listMeetings(): ApiEnvelope<List<MeetingDto>>

    @POST("api/v1/meetings")
    suspend fun createMeeting(@Body body: CreateMeetingRequest): ApiEnvelope<MeetingDto>

    @GET("api/v1/meetings/{id}")
    suspend fun meetingDetail(@Path("id") id: String): ApiEnvelope<MeetingDto>

    @DELETE("api/v1/meetings/{id}")
    suspend fun deleteMeeting(@Path("id") id: String): ApiEnvelope<Unit>

    // ------------------------- 腾讯云 UserSig -------------------------

    /**
     * 由我们自己的后端用 SDKSecretKey 计算 UserSig（正式环境的正确姿势，
     * 客户端永远不该出现 SDKSecretKey）。
     */
    @GET("api/v1/trtc/usersig")
    suspend fun fetchUserSig(@Query("userId") userId: String): ApiEnvelope<UserSigDto>
}
