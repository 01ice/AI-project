'use strict';

const express = require('express');

const config = require('../config');
const { ok, fail } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const { genUserSig } = require('../utils/userSig');

const router = express.Router();

/**
 * GET /api/v1/trtc/usersig?userId=u_xxx
 *
 * 客户端进房前拿票据。userId 必须是客户端登录用户的腾讯云 ID，
 * 这里做一次归属校验，避免任意用户冒领别人的票据。
 */
router.get('/usersig', authRequired, (req, res) => {
  const requested = String(req.query.userId || '').trim();
  if (!requested) return fail(res, 400, '缺少 userId');

  // 客户端用 TrtcConfig.toTrtcUserId(account) 生成，这里按同样规则核对
  const expected = `u_${req.user.account.replace(/[^0-9A-Za-z]/g, '_')}`;
  if (requested !== expected) {
    return fail(res, 403, 'userId 与当前登录账号不匹配');
  }

  try {
    const userSig = genUserSig({
      sdkAppId: config.trtc.sdkAppId,
      userId: requested,
      secretKey: config.trtc.secretKey,
      expireSeconds: config.trtc.userSigExpire
    });

    return ok(res, {
      sdkAppId: config.trtc.sdkAppId,
      userId: requested,
      userSig,
      expireAt: Math.floor(Date.now() / 1000) + config.trtc.userSigExpire
    });
  } catch (e) {
    return fail(res, 500, e.message);
  }
});

/** 自检接口：确认服务端是否已配置密钥（不会泄露密钥本身） */
router.get('/config', (req, res) =>
  ok(res, {
    sdkAppId: config.trtc.sdkAppId,
    secretKeyConfigured: Boolean(config.trtc.secretKey),
    userSigExpire: config.trtc.userSigExpire
  })
);

module.exports = router;
