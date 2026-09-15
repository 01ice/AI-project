'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

/** 校验 Authorization: Bearer <token>，通过后把用户挂到 req.user */
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return fail(res, 401, '未登录或登录已过期');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, account: payload.account };
    return next();
  } catch (e) {
    return fail(res, 401, '登录状态无效，请重新登录');
  }
}

module.exports = { authRequired };
