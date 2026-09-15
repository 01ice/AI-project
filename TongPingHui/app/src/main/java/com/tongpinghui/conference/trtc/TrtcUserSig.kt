package com.tongpinghui.conference.trtc

import android.util.Base64
import java.io.ByteArrayOutputStream
import java.security.SecureRandom
import java.util.zip.Deflater
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * 本地生成腾讯云 UserSig（TLS-SHA256 / TLSSigAPIv2）。
 *
 * ⚠️ 只用于本地调试！正式环境必须由后端用 SDKSecretKey 计算后下发：
 *    1) 客户端里出现 SDKSecretKey = 密钥泄露
 *    2) 更稳妥的做法是让密钥只存在于服务端（见 server/src/utils/userSig.js）
 *
 * 算法与官方实现（TIMSDK 的 GenerateTestUserSig.java / tls-sig-api-v2）逐字节对齐，
 * 注意三处容易写错的点：
 *   1) HMAC 的输入是**明文键值块**（不是 JSON！），行序与行尾换行都不能改：
 *        TLS.identifier:<uid>\nTLS.sdkappid:<appid>\nTLS.time:<秒>\nTLS.expire:<秒>\n
 *   2) 把 5 个字段 + TLS.sig 组成 JSON
 *   3) **要先 zlib deflate 压缩再 base64**，最后把 + / = 替换成 * - _
 *      少了第 3 步的压缩，腾讯云会判为非法票据（进房报 70003
 *      The UserSig in use is illegal）——这正是踩过的坑。
 *
 * 如果这里生成的票据仍被拒绝，请改用控制台生成的临时票据：
 *   https://console.cloud.tencent.com/im/tool-usersig
 * 填到 local.properties 的 TRTC_TEST_USER_SIG。
 */
object TrtcUserSig {

    private const val MAC_ALGORITHM = "HmacSHA256"

    fun generate(
        sdkAppId: Int,
        userId: String,
        expireSeconds: Int,
        secretKey: String,
        nowSeconds: Long = System.currentTimeMillis() / 1000
    ): String {
        // 1) 签名内容：明文键值块（顺序 + 行尾换行照官方来）
        val contentToBeSigned = buildString {
            append("TLS.identifier:").append(userId).append('\n')
            append("TLS.sdkappid:").append(sdkAppId).append('\n')
            append("TLS.time:").append(nowSeconds).append('\n')
            append("TLS.expire:").append(expireSeconds).append('\n')
        }

        val signature = hmacSha256Base64(contentToBeSigned, secretKey)

        // 2) 票据载荷（字段顺序与官方库一致：time 在 expire 之前）
        val doc = buildString {
            append("{\"TLS.ver\":\"2.0\"")
            append(",\"TLS.identifier\":\"").append(userId).append('"')
            append(",\"TLS.sdkappid\":").append(sdkAppId)
            append(",\"TLS.time\":").append(nowSeconds)
            append(",\"TLS.expire\":").append(expireSeconds)
            append(",\"TLS.sig\":\"").append(signature).append('"')
            append('}')
        }

        // 3) deflate → base64 → 腾讯的 URL-Safe 替换：+ → *　/ → -　= → _
        return Base64.encodeToString(deflate(doc.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
            .replace('+', '*')
            .replace('/', '-')
            .replace('=', '_')
    }

    private fun hmacSha256Base64(data: String, key: String): String {
        val mac = Mac.getInstance(MAC_ALGORITHM)
        mac.init(SecretKeySpec(key.toByteArray(Charsets.UTF_8), MAC_ALGORITHM))
        return Base64.encodeToString(
            mac.doFinal(data.toByteArray(Charsets.UTF_8)),
            Base64.NO_WRAP
        )
    }

    /**
     * zlib deflate（带 zlib 头，等同 Node 的 zlib.deflateSync / Java 的 Deflater）。
     * 注意不能用 Deflater(level, true)（那是 raw deflate），腾讯云要的是 zlib 包装格式。
     */
    private fun deflate(data: ByteArray): ByteArray {
        val deflater = Deflater()
        deflater.setInput(data)
        deflater.finish()
        val out = ByteArrayOutputStream(data.size)
        val buffer = ByteArray(1024)
        while (!deflater.finished()) {
            val n = deflater.deflate(buffer)
            out.write(buffer, 0, n)
        }
        deflater.end()
        return out.toByteArray()
    }

    /** 随机 userId 后缀，避免多端登录冲突 */
    fun randomSuffix(): String {
        val bytes = ByteArray(4)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
