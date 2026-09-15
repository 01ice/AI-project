'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 极简 JSON 文件存储：够内部几十人用。
 * 换数据库时只要保持 users / meetings 两个集合的读写语义即可。
 */
const empty = () => ({ users: [], meetings: [] });

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(config.dataFile)) {
      cache = JSON.parse(fs.readFileSync(config.dataFile, 'utf8'));
      cache.users = cache.users || [];
      cache.meetings = cache.meetings || [];
    } else {
      cache = empty();
      persist();
    }
  } catch (e) {
    console.error('[store] 读取数据文件失败，使用空库', e.message);
    cache = empty();
  }
  return cache;
}

function persist() {
  const dir = path.dirname(config.dataFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(config.dataFile, JSON.stringify(cache, null, 2), 'utf8');
}

const store = {
  users: () => load().users,
  meetings: () => load().meetings,

  findUserByAccount: (account) =>
    load().users.find((u) => u.account === account) || null,

  findUserById: (id) => load().users.find((u) => u.id === id) || null,

  insertUser: (user) => {
    load().users.push(user);
    persist();
    return user;
  },

  updateUser: (id, patch) => {
    const user = store.findUserById(id);
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: Date.now() });
    persist();
    return user;
  },

  listMeetingsByUser: (userId) =>
    load()
      .meetings.filter((m) => m.ownerId === userId || (m.memberIds || []).includes(userId))
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0)),

  findMeetingById: (id) => load().meetings.find((m) => m.id === id) || null,

  insertMeeting: (meeting) => {
    load().meetings.push(meeting);
    persist();
    return meeting;
  },

  removeMeeting: (id) => {
    const db = load();
    const idx = db.meetings.findIndex((m) => m.id === id);
    if (idx < 0) return false;
    db.meetings.splice(idx, 1);
    persist();
    return true;
  }
};

module.exports = store;
