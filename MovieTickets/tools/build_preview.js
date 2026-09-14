// tools/build_preview.js — 渲染自查用：把 WXML/WXSS 的样式值按 375px 视口等价换算成 HTML
// 仅用于开发期视觉校验，不参与小程序打包。
// 运行：node tools/build_preview.js
const fs = require('fs');
const path = require('path');

// ---- 模拟 wx ----
const storage = {};
global.wx = {
  getStorageSync(k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : ''; },
  setStorageSync(k, v) { storage[k] = v; },
  removeStorageSync(k) { delete storage[k]; }
};

const ROOT = path.join(__dirname, '..');
const mock = require(path.join(ROOT, 'utils/mock.js'));
const util = require(path.join(ROOT, 'utils/util.js'));

// rpx → px（375px 视口下 1rpx = 0.5px）
function toPx(cssText) {
  return cssText
    .replace(/(-?\d*\.?\d+)rpx/g, function (m, n) {
      const v = parseFloat(n) * 0.5;
      return (Math.round(v * 100) / 100) + 'px';
    })
    .replace(/^page\s*\{/m, 'body {');
}

function readCss(rel) {
  return toPx(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

const APP_CSS = readCss('app.wxss');

// ---------- 页面外壳 ----------
function navBar(title) {
  return '<div class="nav"><span class="nav-title">' + title + '</span>' +
    '<div class="capsule"><i></i><i></i><i></i></div></div>';
}

function tabBar(active) {
  const items = [
    { key: 'movie', text: '电影', icon: 'tab-movie' },
    { key: 'cinema', text: '影院', icon: 'tab-cinema' },
    { key: 'mine', text: '我的', icon: 'tab-mine' }
  ];
  return '<div class="tabbar">' + items.map(function (it) {
    const on = it.key === active;
    return '<div class="tabbar-item' + (on ? ' on' : '') + '">' +
      '<img src="../images/' + it.icon + (on ? '-on' : '') + '.png" />' +
      '<span>' + it.text + '</span></div>';
  }).join('') + '</div>';
}

const SHELL_CSS = `
body { margin: 0; background: #DDD; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
.phone-wrap { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; align-items: flex-start; }
.phone { flex: 0 0 375px; width: 375px; background: #F5F5F5; position: relative; padding-top: 26px;
         box-shadow: 0 10px 30px rgba(0,0,0,.18); }
.phone .pv-screen { padding-bottom: 0; }
.phone .bottom-bar { position: static; box-shadow: none; border-top: 1px solid #F0F0F0; }
.phone .bar-space { height: 0; }
.nav { height: 44px; background: #E8403A; color: #fff; display: flex; align-items: center;
       justify-content: center; position: relative; }
.nav-title { font-size: 17px; font-weight: 500; }
.capsule { position: absolute; right: 8px; top: 6px; width: 88px; height: 32px; border-radius: 16px;
           background: rgba(255,255,255,.22); display: flex; align-items: center; justify-content: space-around;
           padding: 0 10px; box-sizing: border-box; }
.capsule i { width: 5px; height: 5px; border-radius: 50%; background: #fff; display: block; }
.capsule i:first-child { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff;
                         background: transparent; }
.capsule i:last-child { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff;
                        background: transparent; }
.tabbar { height: 50px; background: #fff; display: flex; border-top: 1px solid rgba(0,0,0,.06); }
.tabbar-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
               font-size: 10px; color: #9B9B9B; }
.tabbar-item.on { color: #FF9A1E; }
.tabbar-item img { width: 22px; height: 22px; margin-bottom: 2px; }
/* 模拟 swiper：previous/next margin 各 115px → 中间项 145px，整行居中溢出裁切 */
.preview-banner { display: flex; justify-content: center; overflow: hidden; background: #fff; }
.preview-banner-item { position: relative; width: 145px; height: 220px; flex-shrink: 0; border-radius: 8px;
                       overflow: hidden; display: flex; align-items: center; justify-content: center; }
.label { position: absolute; top: 4px; left: 8px; background: rgba(0,0,0,.72); color: #fff; font-size: 12px;
         padding: 2px 8px; border-radius: 4px; z-index: 99; }

/* 模拟影院选片页的 poster <swiper previous-margin="60rpx" next-margin="60rpx">
   真实 swiper 只把 current 项居中，左右各项仅露出 60rpx(30px) 边缘。
   HTML 等价做法：容器 overflow hidden，内部 track 用 translateX 把当前 slide 顶到中心。
   slide 宽 = 375 - 60 = 315px。 */
.poster-swiper { overflow: hidden; }
.poster-swiper .poster-track { display: flex; }
.poster-swiper .poster-slide { flex: 0 0 315px; width: 315px; }
`;

// ---------- 屏幕 1：电影首页 ----------
function screenMovie() {
  const banners = mock.BANNERS;
  const movies = mock.getMovies('showing').map(function (m) {
    return Object.assign({}, m, {
      wantText: m.wanted >= 10000 ? (m.wanted / 10000).toFixed(1) + '万人想看' : m.wanted + '人想看'
    });
  });

  const bannerHtml = banners.map(function (b, i) {
    return '<div class="preview-banner-item' + (i === 1 ? ' active' : '') + '" style="background:' + b.posterBg + '">' +
      '<span class="banner-emoji">' + b.posterEmoji + '</span>' +
      '<div class="banner-shade"></div>' +
      '<div class="banner-copy"><span class="banner-t1">' + b.tagline + '</span>' +
      '<span class="banner-t2">' + b.taglineSub + '</span></div></div>';
  }).join('');

  const cardHtml = movies.map(function (m) {
    return '<div class="movie-card">' +
      '<div class="poster poster-sm" style="background:' + m.posterBg + '">' +
      '<span class="poster-emoji">' + m.posterEmoji + '</span>' +
      '<div class="poster-shade"></div><span class="poster-name">' + m.title + '</span></div>' +
      '<div class="info">' +
      '<div class="row-title"><span class="score">' + m.score + '</span><span class="score-unit">分</span>' +
      '<span class="title">' + m.title + '</span>' +
      '<span class="tag ' + m.formatClass + '">' + m.formatText + '</span></div>' +
      '<div class="row-meta"><span class="meta">' + m.durationText + '</span>' +
      '<span class="meta">' + m.genres + '</span><span class="meta">' + m.language + '</span></div>' +
      '<div class="row-credit"><span class="k">导演</span><span class="v v-dir">' + m.director + '</span>' +
      '<span class="sep">|</span><span class="k">主演</span><span class="v">' + m.actorText + '</span></div>' +
      '<div class="row-desc">' + m.synopsis + '</div>' +
      '</div>' +
      '<div class="buy">购票</div></div>';
  }).join('');

  const body = '<div class="page">' +
    '<div class="topbar"><div class="city"><span class="city-name">北京</span><span class="city-arrow">▾</span></div>' +
    '<div class="search-box"><span class="search-icon">🔍</span><span class="search-ph">搜索电影</span></div></div>' +
    '<div class="banner preview-banner">' + bannerHtml + '</div>' +
    '<div class="notice"><span class="notice-icon">🔊</span><div class="notice-track">' +
    '<div class="notice-marquee"><span class="notice-text">' + mock.NOTICE + '</span></div></div></div>' +
    '<div class="tabs">' +
    '<div class="tab tab-on"><span>正在热映</span><div class="tab-line"></div></div>' +
    '<div class="tab"><span>即将上映</span></div></div>' +
    '<div class="list">' + cardHtml + '</div></div>';

  return '<div class="phone"><div class="label">电影首页</div>' +
    navBar('特价电影票') +
    '<div class="pv-screen">' + body + '</div>' + tabBar('movie') + '</div>';
}

// ---------- 屏幕 2：影院列表 ----------
function screenCinema() {
  const list = mock.getCinemas();
  const cardHtml = list.map(function (c) {
    return '<div class="cinema-card"><div class="cinema-main">' +
      '<div class="cinema-name">' + c.name + '</div>' +
      '<div class="cinema-addr">' + c.address + '</div></div>' +
      '<div class="cinema-side">' +
      '<div class="price-line"><span class="sym">¥</span><span class="num">' + c.priceText + '</span>' +
      '<span class="unit">起</span></div>' +
      '<div class="price-sub"><span class="dist">' + c.distanceText + '</span>' +
      '<span class="origin">原价¥' + c.originText + '</span></div>' +
      '</div></div>';
  }).join('');

  const body = '<div class="page">' +
    '<div class="topbar"><div class="city"><span class="city-name">北京</span><span class="city-arrow">▾</span></div>' +
    '<div class="search-box"><span class="search-icon">🔍</span><span class="search-ph">搜索附近的影院</span></div></div>' +
    '<div class="list">' + cardHtml + '</div>' +
    '<div class="list-bottom">— 已展示附近 ' + list.length + ' 家影院 —</div></div>';

  return '<div class="phone"><div class="label">影院列表</div>' +
    navBar('影院列表') +
    '<div class="pv-screen">' + body + '</div>' + tabBar('cinema') + '</div>';
}

// ---------- 屏幕 3：个人中心 ----------
function screenProfile() {
  const orderTabs = [
    { key: 'unpaid', label: '待付款', icon: '💳', bg: '#FDF0E4', count: 0 },
    { key: 'ticketing', label: '出票中', icon: '🔄', bg: '#E8F0FD', count: 0 },
    { key: 'ticketed', label: '已出票', icon: '🎟️', bg: '#E6F7EC', count: 0 },
    { key: 'refund', label: '退款/售后', icon: '🧾', bg: '#F2F2F2', count: 0 }
  ];
  const tools = [
    { label: '隐私协议', icon: '📄', bg: '#FDEBEA' },
    { label: '在线客服', icon: '💬', bg: '#E8F0FD' },
    { label: '电话客服', icon: '📞', bg: '#E6F7EC' },
    { label: '微信客服', icon: '💬', bg: '#E6F7EC' }
  ];

  function grid(items) {
    return '<div class="grid">' + items.map(function (it) {
      return '<div class="grid-item"><div class="circle" style="background:' + it.bg + '">' +
        '<span class="circle-icon">' + it.icon + '</span></div>' +
        '<span class="grid-label">' + it.label + '</span></div>';
    }).join('') + '</div>';
  }

  const body = '<div class="page">' +
    '<div class="header"></div>' +
    '<div class="user-card"><div class="avatar"><span class="avatar-icon">👤</span></div>' +
    '<div class="user-main"><div class="user-name">微信用户</div>' +
    '<div class="user-tag">影迷会员</div></div><span class="arrow">›</span></div>' +
    '<div class="mt-card order-card">' +
    '<div class="sec-title"><div class="sec-bar"></div><span class="sec-text">我的订单</span>' +
    '<div class="sec-more">全部订单 ›</div></div>' + grid(orderTabs) + '</div>' +
    '<div class="mt-card">' +
    '<div class="sec-title"><div class="sec-bar"></div><span class="sec-text">常用功能</span></div>' +
    grid(tools) + '</div>' +
    '<div class="logout">退出登录</div></div>';

  return '<div class="phone"><div class="label">个人中心</div>' +
    navBar('个人中心') +
    '<div class="pv-screen">' + body + '</div>' + tabBar('mine') + '</div>';
}

// ---------- 屏幕 4：选座 ----------
function screenSeat() {
  const cinemaId = 'c1', movieId = 'm1001', dayIndex = 0, slotIndex = 2;
  const cinema = mock.getCinemaById(cinemaId);
  const movie = mock.getMovieById(movieId);
  const show = mock.getShowtimes(cinemaId, movieId, dayIndex)[slotIndex];
  const map = mock.getSeatMap(cinemaId, movieId, show.id);
  const aisles = map.aisleAfter;

  // 注意：seat.js 里算出来的是 rpx，预览按 375px 视口换算成 px（1rpx = 0.5px）
  let sizeRpx = Math.floor((600 - map.colCount * 6 - aisles.length * 24) / map.colCount);
  sizeRpx = Math.max(38, Math.min(56, sizeRpx));
  const size = sizeRpx * 0.5;
  const rowH = (sizeRpx + 14) * 0.5;

  // 选两个座位做演示
  const chosen = { '5-6': true, '5-7': true };

  const rowsHtml = map.rows.map(function (r) {
    const seats = r.seats.map(function (s) {
      const key = s.row + '-' + s.col;
      const isChosen = !!chosen[key];
      const cls = 'seat' + (s.sold ? ' seat-sold' : '') + (isChosen ? ' seat-chosen' : '') +
        (aisles.indexOf(s.col) > -1 ? ' seat-aisle' : '');
      return '<div class="' + cls + '" style="width:' + size + 'px;height:' + size + 'px">' +
        (isChosen ? '<span class="seat-no">' + s.col + '</span>' : '') + '</div>';
    }).join('');
    return '<div class="seat-row" style="height:' + rowH + 'px">' + seats + '</div>';
  }).join('');

  const labelsHtml = map.rows.map(function (r) {
    return '<div class="row-label" style="height:' + rowH + 'px;line-height:' + rowH + 'px">' + r.rowNo + '</div>';
  }).join('');

  const dateRow = mock.getShowDates()[dayIndex];
  const total = 2 * show.price;

  const body = '<div class="page">' +
    '<div class="show-bar"><div class="sb-title">' + movie.title + '</div>' +
    '<div class="sb-sub">' + show.hall + ' · ' + dateRow.label + ' ' + dateRow.mmdd + ' ' + show.time +
    '（' + show.endTime + '散场）</div>' +
    '<div class="sb-sub">' + cinema.name + '</div></div>' +
    '<div class="hall"><div class="screen"><span class="screen-text">银幕中央</span></div>' +
    '<div class="seat-area"><div class="row-labels">' + labelsHtml + '</div>' +
    '<div class="seat-body">' + rowsHtml + '</div></div>' +
    '<div class="legend">' +
    '<div class="lg-item"><div class="lg-box lg-free"></div><span class="lg-text">可选</span></div>' +
    '<div class="lg-item"><div class="lg-box lg-chosen"></div><span class="lg-text">已选</span></div>' +
    '<div class="lg-item"><div class="lg-box lg-sold"></div><span class="lg-text">已售</span></div>' +
    '<span class="lg-tip">每单最多选 4 个座位</span></div></div>' +
    '<div class="chosen-box"><div class="chosen-head"><span class="chosen-title">已选座位</span>' +
    '<span class="chosen-clear">清空</span></div>' +
    '<div class="chosen-list"><div class="chosen-chip"><span>5排6座</span><span class="chip-x">×</span></div>' +
    '<div class="chosen-chip"><span>5排7座</span><span class="chip-x">×</span></div></div></div>' +
    '<div class="bar-space"></div>' +
    '<div class="bottom-bar"><div class="bb-row"><div class="bb-left">' +
    '<div class="bb-price"><span class="sym">¥</span><span class="num">' + util.money(total, 2) + '</span></div>' +
    '<div class="bb-count">已选 2 座 · ' + show.priceText + '/张</div></div>' +
    '<div class="bb-btn">确认选座</div></div></div>' +
    '</div>';

  return '<div class="phone"><div class="label">选座购票</div>' +
    navBar('选座购票') +
    '<div class="screen" style="top:44px">' + body + '</div></div>';
}

// ---------- 屏幕 5：影院选片 / 场次 ----------
function screenCinemaDetail() {
  const cinema = mock.getCinemaById('c1');
  const dates = mock.getShowDates();
  const dayIndex = 0;

  const movies = mock.getMovies('showing').filter(function (m) {
    return mock.getShowtimes('c1', m.id, 0).length > 0;
  });
  const movie = movies[0];
  const slots = mock.getShowtimes('c1', movie.id, dayIndex);

  // 海报轮播（真实 swiper 只居中 current 项，左右各露出 30px）
  // 每个 slide 宽 315px + 左右 margin 各 4px(8rpx)，步进 323px。
  // 容器宽 375px。要令第 i 项居中：offset = 187.5 - (i * 323 + 4 + 157.5)
  const POSTER_STEP = 323;   // 315 + 4 + 4
  const activeIdx = 0;
  const trackOffset = 187.5 - (activeIdx * POSTER_STEP + 4 + 157.5);

  const posterHtml = movies.map(function (m, i) {
    return '<div class="poster-slide ' + (i === activeIdx ? 'slide-on' : '') + '" ' +
      'style="background:' + (m.posterBg || '#E8403A') + '">' +
      '<div class="poster-title">' + m.title + '</div>' +
      '<div class="poster-emoji">' + (m.posterEmoji || '🎬') + '</div></div>';
  }).join('');

  const dateHtml = dates.map(function (d, i) {
    return '<div class="date-item ' + (i === dayIndex ? 'date-on' : '') + '">' +
      '<span class="date-label">' + d.label + '</span>' +
      (d.label === '今天' ? '<span class="date-mmdd">' + d.mmdd + '</span>' : '') +
      '</div>';
  }).join('');

  // 价格区间
  let min = slots[0].price, max = slots[0].price, originMin = slots[0].originPrice;
  slots.forEach(function (s) {
    if (s.price < min) min = s.price;
    if (s.price > max) max = s.price;
    if (s.originPrice < originMin) originMin = s.originPrice;
  });
  const priceRange = (min === max)
    ? util.money(min, 2) + '元'
    : util.money(min, 2) + '-' + util.money(max, 2) + '元';

  const slotHtml = slots.map(function (s) {
    const stopped = s.stopped;
    return '<div class="slot-row ' + (stopped ? 'row-stopped' : '') + '">' +
      '<div class="sr-left">' +
      '<div class="sr-time">' + s.time + '</div>' +
      '<div class="sr-tag">' + s.tagText + '</div>' +
      '<div class="sr-hall">' + s.hall + '</div></div>' +
      '<div class="sr-mid">' +
      '<div class="sr-price"><span class="sym">¥</span><span class="num">' + s.priceText + '</span></div>' +
      '<div class="sr-discount"><span class="disc-tag">' + s.discountText + '</span>' +
      '<span class="disc-origin">原价¥' + s.originText + '</span></div></div>' +
      '<div class="sr-right">' +
      (stopped
        ? '<div class="buy-btn buy-disabled">已停售</div>'
        : '<div class="buy-btn">购票</div>') +
      '</div>' +
      (stopped ? ''
        : '<div class="sr-warn"><span class="warn-icon">🕐</span>' +
          '<span class="warn-text">' + s.date + ' ' + s.stopSellText + ' 停止售票</span></div>') +
      '</div>';
  }).join('');

  const body = '<div class="page">' +
    '<div class="poster-swiper"><div class="poster-track" style="transform:translateX(' +
    (Math.round(trackOffset * 100) / 100) + 'px)">' + posterHtml + '</div></div>' +
    '<div class="m-head">' +
    '<div class="m-title-row"><span class="m-title">' + movie.title + '</span>' +
    '<span class="m-score">' + movie.scoreText + '</span></div>' +
    '<div class="m-meta-row"><span class="m-meta">' + movie.durationText + ' · ' + movie.genres + '</span>' +
    '<span class="m-expand">展开</span></div></div>' +
    '<div class="date-bar">' + dateHtml + '</div>' +
    '<div class="slot-summary"><span class="ss-left">' + slots.length + '场 ' + priceRange + '</span>' +
    '<span class="ss-right">原价' + util.money(originMin, 2).replace(/\.00$/, '') + '起</span></div>' +
    '<div class="slot-list">' + slotHtml + '</div></div>';

  return '<div class="phone"><div class="label">影院选片</div>' +
    navBar('选择影院') +
    '<div class="pv-screen" style="background:#F5F5F5">' + body + '</div></div>';
}

// ---------- 输出 ----------
const css = APP_CSS + readCss('pages/movie/movie.wxss') + readCss('pages/cinema/cinema.wxss') +
  readCss('pages/profile/profile.wxss') + readCss('pages/seat/seat.wxss') +
  readCss('pages/cinema-detail/cinema-detail.wxss') + SHELL_CSS;

const screens = [screenMovie(), screenCinema(), screenProfile(), screenSeat(), screenCinemaDetail()];
const names = ['movie', 'cinema', 'profile', 'seat', 'cinema-detail'];

function wrapHtml(bodyHtml) {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" />' +
    '<title>特价电影票 · 渲染自查</title><style>' + css + '</style></head><body>' +
    bodyHtml + '</body></html>';
}

// 单屏文件（每屏一个 HTML，便于逐屏 1:1 截图）
screens.forEach(function (s, i) {
  const one = '<div class="phone-wrap" style="padding:0">' + s + '</div>';
  fs.writeFileSync(path.join(__dirname, 'preview-' + i + '-' + names[i] + '.html'),
    wrapHtml(one), 'utf8');
});

// 汇总文件
fs.writeFileSync(path.join(__dirname, 'preview.html'),
  wrapHtml('<div class="phone-wrap">' + screens.join('') + '</div>'), 'utf8');
console.log('已生成 ' + screens.length + ' 个单屏 HTML + 1 个汇总 HTML');
console.log('屏幕尺寸参考高度：' + screens.map(function (s, i) {
  return names[i] + '=~' + (s.split('<div').length * 40) + 'px';
}).join('  '));
