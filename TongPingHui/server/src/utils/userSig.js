'use strict';

const crypto = require('crypto');
const zlib = require('zlib');

/**
 * 腾讯云 UserSig（TLS-SHA256 / TLSSigAPIv2）服务端实现。
 *
 * 与官方库 tls-sig-api-v2（Node 版 TLSSigAPIv2.js，各语言实现一致）逐字节对齐：
 *
 *   1) 用「明文键值块」做 HMAC-SHA256，base64 得到 TLS.sig（不是对 JSON 做签名！）：
 *        TLS.identifier:<userId>\n
 *        TLS.sdkappid:<sdkAppId>\n
 *        TLS.time:<unix 秒>\n
 *        TLS.expire:<秒>\n
 *      顺序和每行结尾的 \n 都不能改。
 *   2) 把 5 个字段 + TLS.sig 组成 JSON（字段顺序也对齐官方：time 在 expire 之前）。
 *   3) 用 zlib deflate 压缩这份 JSON，再 base64，最后把 + / = 替换成 * - _。
 *
 * 少了第 3 步的压缩会得到「看起来像 base64、但腾讯云判为非法的」票据，
 * 进房时报 70003 The UserSig in use is illegal —— 这就是曾经的坑。
 */
function genUserSig({ sdkAppId, userId, secretKey, expireSeconds, nowSeconds }) {
  if (!secretKey) {
    throw new Error('TRTC_SDK_SECRET_KEY 未配置：请在 server/.env 里填上控制台生成的密钥');
  }
  const uid = String(userId);
  if (!/^[A-Za-z0-9_\-]+$/.test(uid)) {
    throw new Error('userId 只能包含英文字母、数字、下划线和连字符');
  }

  const currTime = Math.floor(nowSeconds || Date.now() / 1000);
  const expire = expireSeconds || 604800;
  const appId = Number(sdkAppId);

  // 1) 签名内容：明文键值块（顺序 + 行尾换行都照官方来）
  const contentToBeSigned =
    `TLS.identifier:${uid}\n` +
    `TLS.sdkappid:${appId}\n` +
    `TLS.time:${currTime}\n` +
    `TLS.expire:${expire}\n`;

  const sig = crypto
    .createHmac('sha256', secretKey)
    .update(contentToBeSigned)
    .digest('base64');

  // 2) 票据载荷（字段顺序与官方库一致）
  const sigDoc = {
    'TLS.ver': '2.0',
    'TLS.identifier': uid,
    'TLS.sdkappid': appId,
    'TLS.time': currTime,
    'TLS.expire': expire,
    'TLS.sig': sig
  };

  // 3) deflate → base64 → 腾讯的 URL-Safe 字符替换
  return zlib
    .deflateSync(Buffer.from(JSON.stringify(sigDoc), 'utf8'))
    .toString('base64')
    .replace(/\+/g, '*')
    .replace(/\//g, '-')
    .replace(/=/g, '_');
}

/**
 * 反向解码，仅用于自检/排查（把 UserSig 还原成 JSON 字段）。
 * @returns {{json: object, bytes: number}}
 */
function decodeUserSig(userSig) {
  const normalized = String(userSig)
    .replace(/\*/g, '+')
    .replace(/-/g, '/')
    .replace(/_/g, '=');
  const raw = zlib.inflateSync(Buffer.from(normalized, 'base64'));
  return { json: JSON.parse(raw.toString('utf8')), bytes: raw.length };
}

module.exports = { genUserSig, decodeUserSig };
