'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const config = require('../config');
const store = require('../store/jsonStore');
const { ok, fail } = require('../utils/response');
const { toUserDto } = require('./users');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, account: user.account },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/** POST /api/v1/auth/login  { account, password } */
router.post('/login', (req, res) => {
  const { account, password } = req.body || {};
  if (!account || !password) {
    return fail(res, 400, '账号和密码不能为空');
  }

  const user = store.findUserByAccount(String(account).trim());
  if (!user) {
    return fail(res, 401, '账号或密码错误');
  }

  const matched = bcrypt.compareSync(password, user.passwordHash);
  if (!matched) {
    return fail(res, 401, '账号或密码错误');
  }

  return ok(res, {
    token: signToken(user),
    expiresIn: 7 * 24 * 3600,
    user: toUserDto(user, req)
  });
});

/** POST /api/v1/auth/register  { account, password, nickname, department } */
router.post('/register', (req, res) => {
  const { account, password, nickname, department } = req.body || {};
  if (!account || !password || !nickname) {
    return fail(res, 400, '账号、密码、昵称不能为空');
  }
  if (String(password).length < 6) {
    return fail(res, 400, '密码至少 6 位');
  }
  if (store.findUserByAccount(String(account).trim())) {
    return fail(res, 409, '该账号已存在');
  }

  const now = Date.now();
  const user = store.insertUser({
    id: randomUUID(),
    account: String(account).trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    nickname: String(nickname).trim(),
    avatarUrl: '',
    department: String(department || '').trim(),
    createdAt: now,
    updatedAt: now
  });

  return ok(res, {
    token: signToken(user),
    expiresIn: 7 * 24 * 3600,
    user: toUserDto(user, req)
  });
});

/**
 * POST /api/v1/auth/logout
 * JWT 无状态，服务端只需返回成功；如果以后要支持强制下线，
 * 在这里把 token 加入黑名单（Redis）即可。
 */
router.post('/logout', (req, res) => ok(res, null, '已退出'));

module.exports = router;
module.exports.signToken = signToken;
