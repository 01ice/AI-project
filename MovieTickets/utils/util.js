// utils/util.js — 通用工具方法
// 约定：所有展示文案（金额、日期、余票…）都在 JS 层算好，
//       WXML 的 {{}} 里禁止出现函数调用。

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 金额格式化，默认两位小数 */
function money(n, digits) {
  const d = (digits === undefined || digits === null) ? 2 : digits;
  let num = Number(n);
  if (isNaN(num)) num = 0;
  return num.toFixed(d);
}

/** 数字补零 */
function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** Date → 'YYYY-MM-DD' */
function dateStr(d) {
  const dt = d || new Date();
  return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
}

/** Date → 'YYYY-MM-DD HH:mm' */
function dateTimeStr(d) {
  const dt = d || new Date();
  return dateStr(dt) + ' ' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
}

/** 'HH:mm' + 分钟数 → 'HH:mm'（跨天按 24 小时取模） */
function addMinutes(hhmm, minutes) {
  const parts = String(hhmm).split(':');
  let total = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + minutes;
  total = ((total % 1440) + 1440) % 1440;
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60);
}

/** 订单号：TK + yyyyMMddHHmmss + 3 位随机 */
function makeOrderNo() {
  const d = new Date();
  const stamp = '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
    pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  return 'TK' + stamp + Math.floor(Math.random() * 900 + 100);
}

/** 取票码：4 位一组，共 3 组 */
function makeTicketCode() {
  let s = '';
  for (let i = 0; i < 3; i++) {
    if (i > 0) s += ' ';
    s += String(Math.floor(Math.random() * 9000 + 1000));
  }
  return s;
}

/** 手机号脱敏 138****8888 */
function maskPhone(phone) {
  const p = String(phone || '');
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}

/** 简易 toast */
function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none', duration: 1800 });
}

/** 字符串哈希（FNV-1a） */
function hashCode(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 确定性伪随机数生成器（mulberry32）。
 * 同一个 seed 永远产出同一串随机数 —— 用于生成「每次进入都一致」的
 * 场次余票、座位图等模拟数据。
 */
function rngFrom(seed) {
  let t = hashCode(seed);
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 取数组中第 n 个（循环），用于按 seed 稳定取色 */
function pick(arr, r) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(r * arr.length) % arr.length];
}

module.exports = {
  WEEK: WEEK,
  money: money,
  pad2: pad2,
  dateStr: dateStr,
  dateTimeStr: dateTimeStr,
  addMinutes: addMinutes,
  makeOrderNo: makeOrderNo,
  makeTicketCode: makeTicketCode,
  maskPhone: maskPhone,
  toast: toast,
  hashCode: hashCode,
  rngFrom: rngFrom,
  pick: pick
};
