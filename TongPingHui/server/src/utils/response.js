'use strict';

/** 统一响应结构，与客户端 ApiEnvelope 对应 */
function ok(res, data = null, message = 'ok') {
  return res.json({ code: 0, message, data });
}

function fail(res, httpStatus, message, code = httpStatus) {
  return res.status(httpStatus).json({ code, message, data: null });
}

module.exports = { ok, fail };
