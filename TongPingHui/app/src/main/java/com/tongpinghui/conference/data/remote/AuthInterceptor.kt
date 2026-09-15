package com.tongpinghui.conference.data.remote

import com.tongpinghui.conference.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * 自动带上 Bearer token。
 * 这里用 runBlocking 是刻意的：拦截器跑在 OkHttp 的工作线程上，
 * DataStore 首次读取也就几毫秒，不会卡主线程。
 */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = runBlocking { tokenStore.current()?.token }

        val request = if (token.isNullOrEmpty()) {
            original
        } else {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Accept", "application/json")
                .build()
        }
        return chain.proceed(request)
    }
}
