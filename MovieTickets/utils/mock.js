// utils/mock.js — 模拟数据源（电影 / 影院 / 场次 / 座位 / 城市）
// 纯前端 Demo：所有数据在此处生成，后续接后端时只需替换本文件的导出方法。
const util = require('./util.js');

/* ============================ 城市 ============================ */
const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安',
  '南京', '重庆', '天津', '苏州', '长沙', '郑州', '青岛', '宁波'];

const CITY_GROUPS = [
  { letter: 'A', cities: ['鞍山', '安庆'] },
  { letter: 'B', cities: ['北京', '包头', '保定'] },
  { letter: 'C', cities: ['成都', '重庆', '长沙', '长春'] },
  { letter: 'D', cities: ['大连', '东莞'] },
  { letter: 'F', cities: ['福州', '佛山'] },
  { letter: 'G', cities: ['广州', '贵阳'] },
  { letter: 'H', cities: ['杭州', '哈尔滨', '合肥', '海口'] },
  { letter: 'J', cities: ['济南', '嘉兴'] },
  { letter: 'K', cities: ['昆明'] },
  { letter: 'L', cities: ['兰州', '洛阳'] },
  { letter: 'N', cities: ['南京', '南昌', '宁波', '南宁'] },
  { letter: 'Q', cities: ['青岛', '泉州'] },
  { letter: 'S', cities: ['上海', '深圳', '沈阳', '石家庄', '苏州'] },
  { letter: 'T', cities: ['天津', '太原', '唐山'] },
  { letter: 'W', cities: ['武汉', '无锡', '温州', '乌鲁木齐'] },
  { letter: 'X', cities: ['西安', '厦门', '徐州'] },
  { letter: 'Y', cities: ['烟台'] },
  { letter: 'Z', cities: ['郑州', '珠海', '中山'] }
];

/* ============================ 电影 ============================ */
// 海报说明：poster 为空时用 posterBg(渐变) + posterEmoji(emoji) + 片名 组合成占位海报；
//          若填入真实图片地址（网络图 / 本地图），页面会自动改用 <image> 渲染。
const MOVIES = [
  {
    id: 'm1001',
    title: '欢迎来龙餐馆',
    score: '9.9',
    scoreText: '9.9分',
    duration: 140,
    durationText: '140分钟',
    genres: '剧情 犯罪',
    genreList: ['剧情', '犯罪'],
    language: '汉语普通话',
    formatText: 'IMAX 2D',
    formatClass: 'tag-orange',
    director: '文牧野',
    actorText: '沈腾 章宇 王砚辉',
    actors: ['沈腾', '章宇', '王砚辉'],
    synopsis: '含腾量100%！是熟悉的沈腾，也是从未见过的沈腾。颠覆式演绎东北大厨闯荡乱世，一口热汤里煮着家国与人心。',
    status: 'showing',
    releaseDate: '2026-09-30',
    posterEmoji: '🍜',
    posterBg: 'linear-gradient(160deg, #F7CB4B 0%, #EE8B33 42%, #B33B27 100%)',
    poster: '',
    tagline: '全家看',
    taglineSub: '有笑有泪有后劲',
    wanted: 123456
  },
  {
    id: 'm1002',
    title: '空枪',
    score: '9.8',
    scoreText: '9.8分',
    duration: 160,
    durationText: '160分钟',
    genres: '剧情 犯罪',
    genreList: ['剧情', '犯罪'],
    language: '汉语普通话',
    formatText: 'CINITY 3D',
    formatClass: 'tag-red',
    director: '韩延',
    actorText: '朱一龙 倪妮 王传君',
    actors: ['朱一龙', '倪妮', '王传君'],
    synopsis: '最"狠"的时代！最"黄金"的阵容！明暗交锋，强势上头。一声空枪，打穿了一个时代的体面。',
    status: 'showing',
    releaseDate: '2026-09-27',
    posterEmoji: '🎯',
    posterBg: 'linear-gradient(160deg, #4A5A6A 0%, #25313D 48%, #10161C 100%)',
    poster: '',
    tagline: '一声空枪',
    taglineSub: '打穿时代体面',
    wanted: 98120
  },
  {
    id: 'm1003',
    title: '绝壁之上',
    score: '9.6',
    scoreText: '9.6分',
    duration: 126,
    durationText: '126分钟',
    genres: '动作 灾难',
    genreList: ['动作', '灾难'],
    language: '汉语普通话',
    formatText: 'IMAX 2D',
    formatClass: 'tag-orange',
    director: '林超贤',
    actorText: '张译 杜江 李沁',
    actors: ['张译', '杜江', '李沁'],
    synopsis: '海拔七千米的雪崩现场，一支民间救援队逆着人潮往上走。沉浸刺激，组团练胆。',
    status: 'showing',
    releaseDate: '2026-09-21',
    posterEmoji: '🧗',
    posterBg: 'linear-gradient(160deg, #8FA6B8 0%, #4C6580 45%, #1E2A38 100%)',
    poster: '',
    tagline: '沉浸刺激',
    taglineSub: '组团练胆',
    wanted: 76540
  },
  {
    id: 'm1004',
    title: '小小的我',
    score: '9.4',
    scoreText: '9.4分',
    duration: 118,
    durationText: '118分钟',
    genres: '剧情 家庭',
    genreList: ['剧情', '家庭'],
    language: '汉语普通话',
    formatText: '2D',
    formatClass: 'tag',
    director: '杨荔钠',
    actorText: '易烊千玺 林晓杰 蒋勤勤',
    actors: ['易烊千玺', '林晓杰', '蒋勤勤'],
    synopsis: '一个摇摇晃晃的少年，把二十岁的夏天走成了一条笔直的路。小小的我，也想被世界认真看见。',
    status: 'showing',
    releaseDate: '2026-09-12',
    posterEmoji: '🌻',
    posterBg: 'linear-gradient(160deg, #FFD979 0%, #F0A64A 45%, #8C5B2B 100%)',
    poster: '',
    tagline: '小小的我',
    taglineSub: '认真活一次',
    wanted: 65210
  },
  {
    id: 'm1005',
    title: '深海回声',
    score: '9.2',
    scoreText: '9.2分',
    duration: 132,
    durationText: '132分钟',
    genres: '悬疑 惊悚',
    genreList: ['悬疑', '惊悚'],
    language: '英语',
    formatText: 'IMAX 3D',
    formatClass: 'tag-orange',
    director: '克里斯托弗·诺兰',
    actorText: '汤姆·哈迪 玛格特·罗比',
    actors: ['汤姆·哈迪', '玛格特·罗比'],
    synopsis: '三千米以下没有光，只有一段被录错了方向的声音。它每隔四十七分钟响一次。',
    status: 'showing',
    releaseDate: '2026-09-05',
    posterEmoji: '🌊',
    posterBg: 'linear-gradient(160deg, #3FA6C8 0%, #1B5F85 45%, #08243B 100%)',
    poster: '',
    tagline: '深海之下',
    taglineSub: '别听那段回声',
    wanted: 53280
  },
  {
    id: 'm1006',
    title: '春日告白',
    score: '9.0',
    scoreText: '9.0分',
    duration: 105,
    durationText: '105分钟',
    genres: '爱情 剧情',
    genreList: ['爱情', '剧情'],
    language: '汉语普通话',
    formatText: '2D',
    formatClass: 'tag',
    director: '陈哲艺',
    actorText: '周冬雨 刘昊然',
    actors: ['周冬雨', '刘昊然'],
    synopsis: '她把三年的信一次性寄了出去，收件人却在同一天搬走了。',
    status: 'showing',
    releaseDate: '2026-08-29',
    posterEmoji: '🌸',
    posterBg: 'linear-gradient(160deg, #FFC2D6 0%, #F0859F 45%, #8E3F5C 100%)',
    poster: '',
    tagline: '春日告白',
    taglineSub: '信寄晚了三年',
    wanted: 41230
  },
  {
    id: 'm1007',
    title: '熊出没·逆转时空',
    score: '',
    scoreText: '',
    duration: 96,
    durationText: '96分钟',
    genres: '动画 冒险',
    genreList: ['动画', '冒险'],
    language: '汉语普通话',
    formatText: '2D',
    formatClass: 'tag',
    director: '林汇达',
    actorText: '张伟 张秉君 谭笑',
    actors: ['张伟', '张秉君', '谭笑'],
    synopsis: '熊大熊二误入时空裂缝，要在人类世界的第 100 个春天之前把年味找回来。',
    status: 'upcoming',
    releaseDate: '2026-10-01',
    posterEmoji: '🐻',
    posterBg: 'linear-gradient(160deg, #A8DF8E 0%, #4CAF50 45%, #1E5B3A 100%)',
    poster: '',
    tagline: '逆转时空',
    taglineSub: '把年味找回来',
    wanted: 30210
  },
  {
    id: 'm1008',
    title: '星海纪元',
    score: '',
    scoreText: '',
    duration: 148,
    durationText: '148分钟',
    genres: '科幻 冒险',
    genreList: ['科幻', '冒险'],
    language: '英语',
    formatText: 'IMAX 3D',
    formatClass: 'tag-orange',
    director: '丹尼斯·维伦纽瓦',
    actorText: '提莫西·查拉梅 赞达亚',
    actors: ['提莫西·查拉梅', '赞达亚'],
    synopsis: '人类第一次把发动机装在了星球上，也是第一次发现星球会自己掉头。',
    status: 'upcoming',
    releaseDate: '2026-10-16',
    posterEmoji: '🚀',
    posterBg: 'linear-gradient(160deg, #8E7BFF 0%, #4A3AB8 45%, #191238 100%)',
    poster: '',
    tagline: '星海纪元',
    taglineSub: '星球开始掉头',
    wanted: 88760
  },
  {
    id: 'm1009',
    title: '长安夜行',
    score: '',
    scoreText: '',
    duration: 138,
    durationText: '138分钟',
    genres: '古装 悬疑',
    genreList: ['古装', '悬疑'],
    language: '汉语普通话',
    formatText: 'IMAX 2D',
    formatClass: 'tag-orange',
    director: '曹盾',
    actorText: '雷佳音 易烊千玺',
    actors: ['雷佳音', '易烊千玺'],
    synopsis: '上元夜，一百零八坊的灯一齐亮了，只有一盏该亮的没有亮。',
    status: 'upcoming',
    releaseDate: '2026-11-06',
    posterEmoji: '🏮',
    posterBg: 'linear-gradient(160deg, #E05A4A 0%, #9C2A22 45%, #3A0E0B 100%)',
    poster: '',
    tagline: '长安夜行',
    taglineSub: '一盏灯没亮',
    wanted: 47120
  },
  {
    id: 'm1010',
    title: '无声告白',
    score: '',
    scoreText: '',
    duration: 112,
    durationText: '112分钟',
    genres: '剧情 悬疑',
    genreList: ['剧情', '悬疑'],
    language: '汉语普通话',
    formatText: '2D',
    formatClass: 'tag',
    director: '白雪',
    actorText: '谭卓 王砚辉',
    actors: ['谭卓', '王砚辉'],
    synopsis: '整栋楼的人都听见了那声呼救，但监控里只有她一个人在笑。',
    status: 'upcoming',
    releaseDate: '2026-11-20',
    posterEmoji: '🎧',
    posterBg: 'linear-gradient(160deg, #9AA8B5 0%, #55636F 45%, #222B33 100%)',
    poster: '',
    tagline: '无声告白',
    taglineSub: '监控里只有她在笑',
    wanted: 26480
  }
];

/* ============================ 影院 ============================ */
const CINEMAS = [
  {
    id: 'c1',
    name: '新影联金宝影城',
    address: '东城区金宝街88号金宝汇购物中心一期7层',
    district: '东城区',
    latitude: 39.915367,
    longitude: 116.421340,
    distance: 0.42,
    distanceText: '0.42km',
    price: 32.80,
    priceText: '32.8',
    originPrice: 41,
    originText: '41',
    phone: '010-85221888',
    openTime: '09:00 - 24:00',
    tags: ['退改签', '儿童优惠', '3D眼镜免费'],
    hasCard: true
  },
  {
    id: 'c2',
    name: '北京横店电影城北京王府井店',
    address: '王府井大街255号北京市百货大楼F8',
    district: '东城区',
    latitude: 39.913961,
    longitude: 116.410491,
    distance: 0.61,
    distanceText: '0.61km',
    price: 31.20,
    priceText: '31.2',
    originPrice: 39,
    originText: '39',
    phone: '010-65281166',
    openTime: '09:30 - 23:30',
    tags: ['退改签', '儿童优惠'],
    hasCard: true
  },
  {
    id: 'c3',
    name: '中影国际影城（东方新天地CINITY店）',
    address: '东城区东长安街1号东方新天地LG层第五区BB65',
    district: '东城区',
    latitude: 39.909954,
    longitude: 116.416970,
    distance: 0.75,
    distanceText: '0.75km',
    price: 27.20,
    priceText: '27.2',
    originPrice: 34,
    originText: '34',
    phone: '010-85186688',
    openTime: '10:00 - 24:00',
    tags: ['CINITY', '退改签', '会员日'],
    hasCard: true
  },
  {
    id: 'c4',
    name: '幕秀影院（哈德门中心店）',
    address: '东城区崇文门外大街哈德门广场西塔1号楼B1层1001号',
    district: '东城区',
    latitude: 39.899621,
    longitude: 116.420052,
    distance: 1.91,
    distanceText: '1.91km',
    price: 28.64,
    priceText: '28.64',
    originPrice: 35.8,
    originText: '35.8',
    phone: '010-67139900',
    openTime: '10:00 - 23:00',
    tags: ['退改签', '停车场优惠'],
    hasCard: false
  },
  {
    id: 'c5',
    name: '博纳国际影城（朝阳门IMAX店）',
    address: '朝阳区三丰路悠唐购物中心二期B1层',
    district: '朝阳区',
    latitude: 39.921890,
    longitude: 116.438520,
    distance: 2.12,
    distanceText: '2.12km',
    price: 29.52,
    priceText: '29.52',
    originPrice: 36.9,
    originText: '36.9',
    phone: '010-58790088',
    openTime: '09:30 - 24:00',
    tags: ['IMAX', '退改签', '会员日'],
    hasCard: true
  },
  {
    id: 'c6',
    name: '万达影城（CBD国贸店）',
    address: '朝阳区建国路87号SKP-S 4层',
    district: '朝阳区',
    latitude: 39.908300,
    longitude: 116.451900,
    distance: 3.05,
    distanceText: '3.05km',
    price: 33.00,
    priceText: '33.0',
    originPrice: 42,
    originText: '42',
    phone: '010-59001888',
    openTime: '10:00 - 24:00',
    tags: ['杜比全景声', '退改签', '儿童优惠'],
    hasCard: true
  }
];

/* ============================ 场次 ============================ */
const SLOT_POOL = ['09:40', '10:20', '11:30', '13:10', '14:20', '15:40',
  '16:50', '18:30', '19:10', '20:20', '21:30', '22:40'];
const HALL_POOL = ['1号厅', '2号厅', '3号IMAX厅', '4号CINITY厅', '5号杜比全景声厅', '6号VIP厅'];
const DAY_LABELS = ['今天', '明天', '后天'];

/* ---------- 查询类接口 ---------- */

function getMovies(status) {
  if (!status || status === 'all') return MOVIES.slice();
  return MOVIES.filter(function (m) {
    return m.status === status;
  });
}

function getMovieById(id) {
  for (let i = 0; i < MOVIES.length; i++) {
    if (MOVIES[i].id === id) return MOVIES[i];
  }
  return null;
}

function getCinemaById(id) {
  for (let i = 0; i < CINEMAS.length; i++) {
    if (CINEMAS[i].id === id) return CINEMAS[i];
  }
  return null;
}

function getCinemas() {
  return CINEMAS.slice();
}

/** 按关键词搜索电影 / 影院 */
function search(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return { movies: [], cinemas: [] };
  const movies = MOVIES.filter(function (m) {
    return m.title.toLowerCase().indexOf(w) > -1 ||
      m.genres.toLowerCase().indexOf(w) > -1 ||
      m.director.toLowerCase().indexOf(w) > -1 ||
      m.actorText.toLowerCase().indexOf(w) > -1 ||
      m.formatText.toLowerCase().indexOf(w) > -1 ||
      m.language.toLowerCase().indexOf(w) > -1;
  });
  const cinemas = CINEMAS.filter(function (c) {
    return c.name.toLowerCase().indexOf(w) > -1 ||
      c.address.toLowerCase().indexOf(w) > -1 ||
      c.district.toLowerCase().indexOf(w) > -1;
  });
  return { movies: movies, cinemas: cinemas };
}

/** 未来 3 天的排片日期 */
function getShowDates() {
  const list = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    list.push({
      index: i,
      label: DAY_LABELS[i],
      week: util.WEEK[d.getDay()],
      date: util.dateStr(d),
      mmdd: util.pad2(d.getMonth() + 1) + '-' + util.pad2(d.getDate())
    });
  }
  return list;
}

/**
 * 某影院某电影某天的场次（确定性生成，重复进入结果一致）
 * @param {string} cinemaId
 * @param {string} movieId
 * @param {number} dayIndex 0=今天
 */
function getShowtimes(cinemaId, movieId, dayIndex) {
  const cinema = getCinemaById(cinemaId);
  const movie = getMovieById(movieId);
  if (!cinema || !movie) return [];
  const rng = util.rngFrom(cinemaId + '|' + movieId + '|' + dayIndex);
  const count = 5 + Math.floor(rng() * 3); // 5 ~ 7 场
  const startAt = Math.floor(rng() * 4);   // 从时间池的第几场开始
  const dates = getShowDates();
  const dateRow = dates[dayIndex] || dates[0];
  const list = [];
  for (let i = 0; i < count; i++) {
    const slotIndex = Math.min(startAt + i, SLOT_POOL.length - 1);
    const time = SLOT_POOL[slotIndex];
    const hour = parseInt(time.split(':')[0], 10);
    // 黄金时段溢价
    let price = cinema.price + (hour >= 18 ? 8 : (hour >= 14 ? 3 : 0));
    if (movie.formatText.indexOf('IMAX') > -1) price += 10;
    if (movie.formatText.indexOf('CINITY') > -1) price += 8;
    if (movie.formatText.indexOf('3D') > -1) price += 4;
    price = Math.round(price * 100) / 100;
    const originPrice = Math.round((price * (1.28 + rng() * 0.2)) * 10) / 10;
    const seatsLeft = 4 + Math.floor(rng() * 90);
    const hall = util.pick(HALL_POOL, rng());
    // 语言简称：汉语普通话 → 国语，英语 → 英语，其余取首段
    const langShort = movie.language === '汉语普通话' ? '国语'
      : (movie.language || '').split(/[（(]/)[0];
    // 放映制式简称：从 "IMAX 2D" / "CINITY 3D" 等里提取维度部分
    const fmtShort = (movie.formatText || '').replace(/^(IMAX|CINITY|杜比全景声|中国巨幕)\s*/, '');
    // 停售判定：场次开始时间早于「当前时间 + 5 分钟」即停售；
    // dayIndex > 0（明天/后天）永不停售
    let stopped = false;
    if (dayIndex === 0) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const parts = time.split(':');
      const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      stopped = startMin <= nowMin + 5;
    }
    list.push({
      id: cinemaId + '_' + movieId + '_' + dayIndex + '_' + i,
      index: i,
      cinemaId: cinemaId,
      movieId: movieId,
      dayIndex: dayIndex,
      date: dateRow.date,
      time: time,
      endTime: util.addMinutes(time, movie.duration),
      hall: hall,
      language: movie.language,
      langShort: langShort,
      formatText: movie.formatText,
      fmtShort: fmtShort,
      // 场次标签，如「国语 2D」
      tagText: (langShort ? langShort + ' ' : '') + (fmtShort || ''),
      stopped: stopped,
      // 停止售票时间：开场前 5 分钟，形如 "17:35:00"
      stopSellText: util.addMinutes(time, -5) + ':00',
      price: price,
      priceText: util.money(price, 2),
      originPrice: originPrice,
      originText: util.money(originPrice, 2).replace(/\.00$/, ''),
      discountText: (price / originPrice * 10).toFixed(1) + '折',
      seatsLeft: seatsLeft,
      seatsLeftText: seatsLeft > 20 ? '余票充足' : ('余 ' + seatsLeft + ' 张')
    });
  }
  return list;
}

/**
 * 座位图（确定性生成）
 * @returns {object} { hallName, rowCount, colCount, aisleAfter, rows, soldCount, total }
 */
function getSeatMap(cinemaId, movieId, showtimeId) {
  const rng = util.rngFrom('seat|' + showtimeId);
  const rowCount = 8 + Math.floor(rng() * 3);   // 8 ~ 10 排
  const colCount = 10 + Math.floor(rng() * 3);  // 10 ~ 12 列
  const aisleAfter = colCount >= 12 ? [2, colCount - 2] : [2];
  const rows = [];
  let soldCount = 0;
  for (let r = 0; r < rowCount; r++) {
    const seats = [];
    for (let c = 0; c < colCount; c++) {
      const sold = rng() < 0.24;
      if (sold) soldCount++;
      seats.push({
        key: (r + 1) + '-' + (c + 1),
        row: r + 1,
        col: c + 1,
        sold: sold,
        chosen: false
      });
    }
    rows.push({ rowNo: r + 1, label: (r + 1) + '排', seats: seats });
  }
  return {
    rowCount: rowCount,
    colCount: colCount,
    aisleAfter: aisleAfter,
    rows: rows,
    soldCount: soldCount,
    total: rowCount * colCount
  };
}

/** 影院详情页：该影院今日在映的影片 + 最低价 */
function getCinemaMovies(cinemaId) {
  const showing = getMovies('showing');
  const dates = getShowDates();
  return showing.map(function (m) {
    const times = getShowtimes(cinemaId, m.id, 0);
    let min = null;
    times.forEach(function (t) {
      if (min === null || t.price < min) min = t.price;
    });
    return {
      movie: m,
      showtimes: times,
      minPriceText: min === null ? '--' : util.money(min, 2),
      date: dates[0].date
    };
  });
}

/* ============================ 首页运营位 ============================ */
// 轮播：取前 3 部影片做运营位
const BANNERS = ['m1003', 'm1001', 'm1004'].map(function (id) {
  const m = getMovieById(id);
  return {
    id: m.id,
    title: m.title,
    tagline: m.tagline,
    taglineSub: m.taglineSub,
    posterBg: m.posterBg,
    posterEmoji: m.posterEmoji,
    poster: m.poster
  };
});

const NOTICE = '温馨提示：本平台为第三方特价票务平台，购票后不支持影院现场选座改签，请确认场次信息无误后再下单。';

const HOT_SEARCH = ['欢迎来龙餐馆', '空枪', '绝壁之上', '小小的我', '深海回声', 'IMAX'];

module.exports = {
  HOT_CITIES: HOT_CITIES,
  CITY_GROUPS: CITY_GROUPS,
  BANNERS: BANNERS,
  NOTICE: NOTICE,
  HOT_SEARCH: HOT_SEARCH,
  getMovies: getMovies,
  getMovieById: getMovieById,
  getCinemas: getCinemas,
  getCinemaById: getCinemaById,
  getCinemaMovies: getCinemaMovies,
  search: search,
  getShowDates: getShowDates,
  getShowtimes: getShowtimes,
  getSeatMap: getSeatMap
};
