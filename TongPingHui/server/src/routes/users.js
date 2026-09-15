'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const store = require('../store/jsonStore');
const { ok, fail } = require('../utils/response');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// 头像上传（multipart/form-data，字段名固定为 file）
// ---------------------------------------------------------------------------
const uploadDir = path.resolve(process.cwd(), 'data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${req.user.id}_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * 库里只存相对路径（/uploads/xxx.jpg），返回给客户端时拼成绝对地址，
 * 手机端 Coil 才能直接加载。
 */
function absoluteUrl(req, url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '') + url;
  }
  return `${req.protocol}://${req.get('host')}${url}`;
}

function toUserDto(user, req) {
  return {
    id: user.id,
    account: user.account,
    nickname: user.nickname,
    avatarUrl: absoluteUrl(req, user.avatarUrl),
    department: user.department || '',
    updatedAt: user.updatedAt || 0
  };
}

// ---------------------------------------------------------------------------
// 个人信息
// ---------------------------------------------------------------------------

/** GET /api/v1/users/me */
router.get('/me', authRequired, (req, res) => {
  const user = store.findUserById(req.user.id);
  if (!user) return fail(res, 404, '用户不存在');
  return ok(res, toUserDto(user, req));
});

/** PUT /api/v1/users/me  { nickname, avatarUrl, department } */
router.put('/me', authRequired, (req, res) => {
  const { nickname, avatarUrl, department } = req.body || {};

  if (nickname !== undefined && String(nickname).trim().length === 0) {
    return fail(res, 400, '昵称不能为空');
  }
  if (nickname !== undefined && String(nickname).trim().length > 24) {
    return fail(res, 400, '昵称最多 24 个字');
  }

  const patch = {};
  if (nickname !== undefined) patch.nickname = String(nickname).trim();
  if (department !== undefined) patch.department = String(department).trim();
  if (avatarUrl !== undefined) {
    // 只允许清空，或使用本站上传的头像，避免被塞外链
    const value = String(avatarUrl).trim();
    patch.avatarUrl = value === '' || value.startsWith('/uploads/') ? value : '';
  }

  const user = store.updateUser(req.user.id, patch);
  if (!user) return fail(res, 404, '用户不存在');
  return ok(res, toUserDto(user, req), '已保存');
});

/** PUT /api/v1/users/me/password  { oldPassword, newPassword } */
router.put('/me/password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return fail(res, 400, '请填写当前密码和新密码');
  if (String(newPassword).length < 6) return fail(res, 400, '新密码至少 6 位');

  const user = store.findUserById(req.user.id);
  if (!user) return fail(res, 404, '用户不存在');
  if (!bcrypt.compareSync(String(oldPassword), user.passwordHash)) {
    return fail(res, 400, '当前密码不正确');
  }

  store.updateUser(user.id, { passwordHash: bcrypt.hashSync(String(newPassword), 10) });
  return ok(res, null, '密码已修改');
});

/** POST /api/v1/users/me/avatar  表单字段：file */
router.post('/me/avatar', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return fail(res, 400, '没有收到文件（字段名必须是 file）');

  const user = store.updateUser(req.user.id, { avatarUrl: `/uploads/${req.file.filename}` });
  if (!user) return fail(res, 404, '用户不存在');
  return ok(res, toUserDto(user, req), '头像已更新');
});

/** multer 抛出的错误（文件过大等）转成友好提示 */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 5MB' : `上传失败：${err.message}`;
    return fail(res, 400, msg);
  }
  return next(err);
});

module.exports = router;
// 登录/注册接口也要用同一套 DTO（头像转绝对地址），所以导出出去
module.exports.toUserDto = toUserDto;
