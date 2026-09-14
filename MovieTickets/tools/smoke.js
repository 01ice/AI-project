// tools/smoke.js — 运行期冒烟测试（Node 环境模拟 wx API）
// 运行：node tools/smoke.js
const path = require('path');

// ---- 模拟小程序运行环境 ----
const storage = {};
global.wx = {
  getStorageSync(k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : ''; },
  setStorageSync(k, v) { storage[k] = v; },
  removeStorageSync(k) { delete storage[k]; },
  showToast() {},
  showModal() {}
};

const util = require(path.join(__dirname, '..', 'utils', 'util.js'));
const mock = require(path.join(__dirname, '..', 'utils', 'mock.js'));
const store = require(path.join(__dirname, '..', 'utils', 'store.js'));

let pass = 0;
let fail = 0;

function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + msg); }
}
function section(name) { console.log('\n[' + name + ']'); }

// ---------- util ----------
section('util');
ok(util.money(32.8, 2) === '32.80', 'money(32.8,2) = ' + util.money(32.8, 2));
ok(util.addMinutes('23:50', 30) === '00:20', 'addMinutes 跨天 = ' + util.addMinutes('23:50', 30));
ok(util.addMinutes('19:10', 140) === '21:30', 'addMinutes 140min = ' + util.addMinutes('19:10', 140));
ok(/^TK\d{17}$/.test(util.makeOrderNo()), 'makeOrderNo = ' + util.makeOrderNo());
ok(/^\d{4} \d{4} \d{4}$/.test(util.makeTicketCode()), 'makeTicketCode = ' + util.makeTicketCode());
ok(util.maskPhone('13800138000') === '138****8000', 'maskPhone = ' + util.maskPhone('13800138000'));
const r1 = util.rngFrom('seed-a'), r2 = util.rngFrom('seed-a');
ok(r1() === r2(), 'rngFrom 同 seed 结果一致');

// ---------- mock：影片 ----------
section('mock / movies');
const showing = mock.getMovies('showing');
const upcoming = mock.getMovies('upcoming');
ok(showing.length >= 4, '正在热映 ' + showing.length + ' 部');
ok(upcoming.length >= 2, '即将上映 ' + upcoming.length + ' 部');
ok(mock.getMovies('all').length === showing.length + upcoming.length, '全部影片数量一致');
ok(mock.getMovieById('m1001') !== null, 'getMovieById 命中');
ok(mock.getMovieById('nope') === null, 'getMovieById 未命中返回 null');
ok(mock.BANNERS.length === 3, '轮播 3 条');
ok(mock.BANNERS.every(b => b.posterBg && b.tagline), '轮播字段完整');

// ---------- mock：场次 ----------
section('mock / showtimes');
let slotCount = 0;
let slotBad = 0;
mock.getCinemas().forEach(function (c) {
  for (let d = 0; d < 3; d++) {
    showing.forEach(function (m) {
      const list = mock.getShowtimes(c.id, m.id, d);
      slotCount += list.length;
      list.forEach(function (s) {
        if (!s.time || !s.hall || !(s.price > 0) || !s.endTime || !s.priceText) slotBad++;
      });
    });
  }
});
ok(slotCount > 0, '生成场次总数 = ' + slotCount);
ok(slotBad === 0, '场次字段异常数 = ' + slotBad);

const t1 = mock.getShowtimes('c1', 'm1001', 0);
const t2 = mock.getShowtimes('c1', 'm1001', 0);
ok(JSON.stringify(t1) === JSON.stringify(t2), '同参数场次结果稳定（确定性）');
ok(t1[0].date === mock.getShowDates()[0].date, '场次日期与排片日期一致');
ok(mock.getShowtimes('bad', 'm1001', 0).length === 0, '非法影院返回空数组');

// ---------- mock：日期 ----------
section('mock / dates');
const dates = mock.getShowDates();
ok(dates.length === 3 && dates[0].label === '今天' && dates[2].label === '后天', '3 天排片日期');
ok(/^\d{2}-\d{2}$/.test(dates[0].mmdd), 'mmdd 格式 = ' + dates[0].mmdd);

// ---------- mock：座位 ----------
section('mock / seats');
const show = t1[0];
const sm1 = mock.getSeatMap('c1', 'm1001', show.id);
const sm2 = mock.getSeatMap('c1', 'm1001', show.id);
ok(sm1.rowCount >= 8 && sm1.rowCount <= 10, '排数 = ' + sm1.rowCount);
ok(sm1.colCount >= 10 && sm1.colCount <= 12, '列数 = ' + sm1.colCount);
ok(sm1.rows.length === sm1.rowCount, 'rows 长度 = rowCount');
ok(sm1.rows.every(r => r.seats.length === sm1.colCount), '每排座位数 = colCount');
ok(sm1.total === sm1.rowCount * sm1.colCount, '总座位数 = ' + sm1.total);
ok(sm1.soldCount > 0 && sm1.soldCount < sm1.total, '已售 = ' + sm1.soldCount);
ok(JSON.stringify(sm1.rows) === JSON.stringify(sm2.rows), '座位图结果稳定');
ok(sm1.aisleAfter.every(i => i > 0 && i < sm1.colCount), '过道索引合法 ' + JSON.stringify(sm1.aisleAfter));

// 座位宽度自适应公式（与 pages/seat/seat.js 保持一致）
// 卡片可用宽度 670rpx = 左右外边距 48 + 卡片内边距 32 + 排号列 44 + 座位区 626
[10, 11, 12].forEach(function (cols) {
  const aisles = cols >= 12 ? 2 : 1;
  let size = Math.floor((600 - cols * 6 - aisles * 24) / cols);
  size = Math.max(38, Math.min(56, size));
  const seatArea = cols * (size + 6) + aisles * 24;
  ok(seatArea + 44 <= 670, 'cols=' + cols + ' size=' + size + ' 排号+座位=' + (seatArea + 44) + ' <= 670');
  ok(size >= 38, 'cols=' + cols + ' 座椅最小尺寸 ' + size + 'rpx >= 38rpx');
});

// ---------- mock：搜索 ----------
section('mock / search');
ok(mock.search('空枪').movies.length === 1, '片名搜索命中 1 部');
ok(mock.search('IMAX').movies.length > 0, '格式关键词搜索命中');
ok(mock.search('金宝汇').cinemas.length === 1, '影院地址搜索命中 1 家');
ok(mock.search('').movies.length === 0, '空关键词返回空');
ok(mock.search('zzzz').movies.length === 0, '无结果返回空');

// ---------- mock：影院 ----------
section('mock / cinemas');
ok(mock.getCinemas().length === 6, '影院数量 = ' + mock.getCinemas().length);
const cm = mock.getCinemaMovies('c1');
ok(cm.length > 0 && cm[0].minPriceText !== '--', '影院在映影片最低价 = ' + cm[0].minPriceText);
ok(mock.getCinemaById('c1').name.indexOf('新影联') > -1, '影院查询命中');

// 坐标完整性：openLocation 依赖这两个字段
const allCinemas = mock.getCinemas();
const badCoord = allCinemas.filter(function (c) {
  return typeof c.latitude !== 'number' || typeof c.longitude !== 'number';
});
ok(badCoord.length === 0, '6 家影院均有数值型经纬度');
const outOfRange = allCinemas.filter(function (c) {
  return c.latitude < -90 || c.latitude > 90 ||
    c.longitude < -180 || c.longitude > 180;
});
ok(outOfRange.length === 0, '经纬度均在合法范围内');
// 本项目影院集中在北京，粗校验 city 坐落在合理纬度
const notBeijing = allCinemas.filter(function (c) {
  return !(c.latitude > 39.7 && c.latitude < 40.2 &&
    c.longitude > 116.2 && c.longitude < 116.6);
});
ok(notBeijing.length === 0, '影院坐标落在北京范围内');
ok(typeof allCinemas[0].address === 'string' && allCinemas[0].address.length > 0,
  '影院含地址（openLocation 需要）');

// ---------- store：用户 / 城市 ----------
section('store / user & city');
ok(store.getCity() === '北京', '默认城市 = ' + store.getCity());
store.setCity('上海');
ok(store.getCity() === '上海', '城市写入成功');
const u = store.getUser();
ok(u && u.nickName === '微信用户' && u.isMember === true, '首次启动写入演示账号');
store.setUser(null);
ok(store.getUser() === null, '退出登录后 getUser 返回 null');
store.setUser({ nickName: '微信用户', isMember: true });
ok(store.getUser().isMember === true, '重新登录成功');

// ---------- store：搜索历史 ----------
section('store / history');
store.clearSearchHistory();
store.addSearchHistory('空枪');
store.addSearchHistory('绝壁之上');
store.addSearchHistory('空枪');
const h = store.getSearchHistory();
ok(h.length === 2 && h[0] === '空枪', '历史去重且最近在前 ' + JSON.stringify(h));
for (let i = 0; i < 15; i++) store.addSearchHistory('w' + i);
ok(store.getSearchHistory().length === 10, '历史上限 10 条');
store.clearSearchHistory();
ok(store.getSearchHistory().length === 0, '清空历史');

// ---------- store：订单全流程 ----------
section('store / order flow');
store.saveOrders([]);
const order = {
  id: util.makeOrderNo(),
  createdAt: util.dateTimeStr(new Date()),
  status: 'unpaid',
  statusText: store.ORDER_STATUS.unpaid.text,
  movieTitle: '欢迎来龙餐馆',
  cinemaName: '新影联金宝影城',
  seatCount: 2,
  totalText: '68.60',
  ticketCode: ''
};
store.addOrder(order);
ok(store.getOrders().length === 1, '下单成功');
ok(store.getOrdersByStatus('unpaid').length === 1, '待付款筛选 = 1');
ok(store.getOrdersByStatus('all').length === 1, '全部筛选 = 1');

let counts = store.getOrderCounts();
ok(counts.unpaid === 1 && counts.all === 1, '状态计数正确 ' + JSON.stringify(counts));

// 支付 → 出票中
store.updateOrder(order.id, {
  status: 'ticketing',
  statusText: store.ORDER_STATUS.ticketing.text,
  ticketingAt: Date.now()
});
ok(store.getOrderById(order.id).status === 'ticketing', '状态 → 出票中');
ok(store.ticketingRemain(store.getOrderById(order.id)) > 0, '出票倒计时 > 0');

// 未超时不会自动出票
ok(store.advanceTicketingOrders() === false, '未超时不推进状态');

// 伪造 6 秒前的支付时间 → 应自动出票
store.updateOrder(order.id, { ticketingAt: Date.now() - 6000 });
ok(store.advanceTicketingOrders() === true, '超时后推进状态');
const ticketed = store.getOrderById(order.id);
ok(ticketed.status === 'ticketed', '状态 → 已出票');
ok(/^\d{4} \d{4} \d{4}$/.test(ticketed.ticketCode), '自动生成取票码 = ' + ticketed.ticketCode);

store.updateOrder(order.id, { status: 'refund', statusText: '退款/售后' });
ok(store.getOrderById(order.id).status === 'refund', '状态 → 退款/售后');
store.removeOrder(order.id);
ok(store.getOrders().length === 0, '删除订单');

// ---------- 结果 ----------
console.log('\n' + '='.repeat(52));
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
console.log('='.repeat(52));
process.exit(fail ? 1 : 0);
