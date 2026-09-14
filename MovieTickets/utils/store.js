// utils/store.js — 本地存储（城市 / 登录态 / 订单 / 搜索历史）
// 纯前端实现，接口层预留后端替换点。
const util = require('./util.js');

const K_CITY = 'mt_city';
const K_USER = 'mt_user';
const K_ORDER = 'mt_orders';
const K_HISTORY = 'mt_search_history';

// 订单状态字典
const ORDER_STATUS = {
  unpaid: { text: '待付款', color: '#FF7A33', desc: '请在 15 分钟内完成支付' },
  ticketing: { text: '出票中', color: '#2F7BFF', desc: '正在为你出票，请稍候' },
  ticketed: { text: '已出票', color: '#22A45D', desc: '凭取票码到影院自助机取票' },
  refund: { text: '退款/售后', color: '#999999', desc: '退款申请已受理' }
};

// 出票耗时（毫秒）：超过该时长，「出票中」自动变为「已出票」
const TICKETING_MS = 5000;

function read(key, def) {
  try {
    const v = wx.getStorageSync(key);
    if (v === '' || v === null || v === undefined) return def;
    return v;
  } catch (e) {
    return def;
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val);
  } catch (e) {
    // 忽略写入失败（如存储空间不足）
  }
}

/* ---------------- 城市 ---------------- */
function getCity() {
  return read(K_CITY, '北京');
}
function setCity(city) {
  write(K_CITY, city);
}

/* ---------------- 登录态 ---------------- */
// 演示账号：首次启动自动写入，保证「个人中心」有初始内容（与设计稿一致）
const DEFAULT_USER = {
  nickName: '微信用户',
  avatarEmoji: '👤',
  isMember: true,
  memberLevel: '影迷会员'
};
// 退出登录后的哨兵值：用于区分「从未登录过」和「主动退出」
const LOGGED_OUT = { loggedOut: true };

function getUser() {
  const v = read(K_USER, null);
  if (v === null) {
    write(K_USER, DEFAULT_USER);
    return DEFAULT_USER;
  }
  if (v && v.loggedOut) return null;
  return v;
}
function setUser(user) {
  write(K_USER, user || LOGGED_OUT);
}

/* ---------------- 搜索历史 ---------------- */
function getSearchHistory() {
  const list = read(K_HISTORY, []);
  return list instanceof Array ? list : [];
}
function addSearchHistory(word) {
  const w = String(word || '').trim();
  if (!w) return getSearchHistory();
  let list = getSearchHistory().filter(function (item) {
    return item !== w;
  });
  list.unshift(w);
  if (list.length > 10) list = list.slice(0, 10);
  write(K_HISTORY, list);
  return list;
}
function clearSearchHistory() {
  write(K_HISTORY, []);
}

/* ---------------- 订单 ---------------- */
function getOrders() {
  const list = read(K_ORDER, []);
  return list instanceof Array ? list : [];
}

function saveOrders(list) {
  write(K_ORDER, list);
}

function getOrderById(id) {
  const list = getOrders();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function addOrder(order) {
  const list = getOrders();
  list.unshift(order);
  saveOrders(list);
  return order;
}

function updateOrder(id, patch) {
  const list = getOrders();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i] = Object.assign({}, list[i], patch);
      saveOrders(list);
      return list[i];
    }
  }
  return null;
}

function removeOrder(id) {
  const list = getOrders().filter(function (o) {
    return o.id !== id;
  });
  saveOrders(list);
}

/** 按状态筛选订单，status 传 'all' 返回全部 */
function getOrdersByStatus(status) {
  const list = getOrders();
  if (!status || status === 'all') return list;
  return list.filter(function (o) {
    return o.status === status;
  });
}

/** 各状态数量，用于「我的订单」角标 */
function getOrderCounts() {
  const list = getOrders();
  const counts = { all: list.length, unpaid: 0, ticketing: 0, ticketed: 0, refund: 0 };
  list.forEach(function (o) {
    if (counts[o.status] !== undefined) counts[o.status] += 1;
  });
  return counts;
}

/** 把停留超时的「出票中」订单推进为「已出票」 */
function advanceTicketingOrders() {
  const list = getOrders();
  const now = Date.now();
  let changed = false;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o.status === 'ticketing' && o.ticketingAt && now - o.ticketingAt > TICKETING_MS) {
      o.status = 'ticketed';
      o.statusText = ORDER_STATUS.ticketed.text;
      o.ticketedAt = now;
      o.ticketCode = o.ticketCode || util.makeTicketCode();
      changed = true;
    }
  }
  if (changed) saveOrders(list);
  return changed;
}

/** 距离自动出票还剩多少毫秒（用于页面倒计时提示） */
function ticketingRemain(o) {
  if (!o || o.status !== 'ticketing' || !o.ticketingAt) return 0;
  return Math.max(0, TICKETING_MS - (Date.now() - o.ticketingAt));
}

module.exports = {
  ORDER_STATUS: ORDER_STATUS,
  TICKETING_MS: TICKETING_MS,
  DEFAULT_USER: DEFAULT_USER,
  getCity: getCity,
  setCity: setCity,
  getUser: getUser,
  setUser: setUser,
  getSearchHistory: getSearchHistory,
  addSearchHistory: addSearchHistory,
  clearSearchHistory: clearSearchHistory,
  getOrders: getOrders,
  saveOrders: saveOrders,
  getOrderById: getOrderById,
  addOrder: addOrder,
  updateOrder: updateOrder,
  removeOrder: removeOrder,
  getOrdersByStatus: getOrdersByStatus,
  getOrderCounts: getOrderCounts,
  advanceTicketingOrders: advanceTicketingOrders,
  ticketingRemain: ticketingRemain
};
