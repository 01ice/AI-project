'use strict';

const express = require('express');
const { randomUUID } = require('crypto');

const store = require('../store/jsonStore');
const { ok, fail } = require('../utils/response');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

/** 生成 9 位数字房间号（腾讯云 ROOM_ID 只允许数字/字母/_/-） */
function newRoomId() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

function toMeetingDto(m, ownerName) {
  return {
    id: m.id,
    roomId: m.roomId,
    title: m.title,
    ownerId: m.ownerId,
    ownerName: ownerName || '',
    startTime: m.startTime || 0,
    endTime: m.endTime || 0,
    status: m.status || 'scheduled',
    password: ''
  };
}

/** GET /api/v1/meetings —— 我参与/我发起的会议 */
router.get('/', authRequired, (req, res) => {
  const list = store.listMeetingsByUser(req.user.id).map((m) => {
    const owner = store.findUserById(m.ownerId);
    return toMeetingDto(m, owner ? owner.nickname : '');
  });
  return ok(res, list);
});

/** POST /api/v1/meetings  { title, startTime, endTime, password } */
router.post('/', authRequired, (req, res) => {
  const { title, startTime, endTime, password } = req.body || {};
  const now = Date.now();

  const meeting = store.insertMeeting({
    id: randomUUID(),
    roomId: newRoomId(),
    title: String(title || '临时会议').trim(),
    ownerId: req.user.id,
    memberIds: [req.user.id],
    startTime: startTime || now,
    endTime: endTime || 0,
    status: 'scheduled',
    // 房间密码：这里只存哈希，客户端进房时用 SDK 的密码校验
    passwordHash: password ? require('bcryptjs').hashSync(String(password), 8) : '',
    createdAt: now
  });

  const owner = store.findUserById(req.user.id);
  return ok(res, toMeetingDto(meeting, owner ? owner.nickname : ''));
});

/** GET /api/v1/meetings/:id */
router.get('/:id', authRequired, (req, res) => {
  const meeting = store.findMeetingById(req.params.id);
  if (!meeting) return fail(res, 404, '会议不存在');
  return ok(res, toMeetingDto(meeting));
});

/** DELETE /api/v1/meetings/:id —— 只有发起人能删 */
router.delete('/:id', authRequired, (req, res) => {
  const meeting = store.findMeetingById(req.params.id);
  if (!meeting) return fail(res, 404, '会议不存在');
  if (meeting.ownerId !== req.user.id) return fail(res, 403, '只有发起人可以删除会议');

  store.removeMeeting(meeting.id);
  return ok(res, null, '已删除');
});

module.exports = router;
