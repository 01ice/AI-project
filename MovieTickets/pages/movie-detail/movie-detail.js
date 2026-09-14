// pages/movie-detail/movie-detail.js — 影片详情
const mock = require('../../utils/mock.js');
const util = require('../../utils/util.js');

// 演职人员头像占位（emoji 池 + 底色池）
const AVATAR_EMOJI = ['🎭', '🎬', '🌟', '🎤', '🎥', '🏆'];
const AVATAR_BG = ['#FDF0E4', '#E8F0FD', '#E6F7EC', '#FDEBEA', '#F1ECFD', '#F2F2F2'];
const STILL_BG = [
  'linear-gradient(135deg,#F7CB4B,#EE8B33)',
  'linear-gradient(135deg,#8FA6B8,#4C6580)',
  'linear-gradient(135deg,#9E8CFF,#5B45C8)',
  'linear-gradient(135deg,#7FD4A8,#3E9E6E)',
  'linear-gradient(135deg,#FFAFC5,#D1567A)',
  'linear-gradient(135deg,#8ED6E8,#2E7C99)'
];
const STILL_EMOJI = ['🎬', '🎞️', '📽️', '🍿', '🌟', '🎥'];

Page({
  data: {
    movie: null,
    castList: [],
    tips: [
      '本平台为第三方特价票务，出票后不支持影院现场换座、改签。',
      '每单最多可选 4 个座位，座位售出不退不换。',
      '影片开场前 30 分钟凭取票码到影院自助机取票。',
      '如遇场次取消，系统将自动发起全额退款。'
    ],
    descOpen: false,
    wanted: false
  },

  onLoad(options) {
    const id = options.id || 'm1001';
    const movie = mock.getMovieById(id);
    if (!movie) {
      this.setData({ movie: null });
      return;
    }
    this.setData({
      movie: this.shapeMovie(movie),
      castList: this.buildCast(movie)
    });
    wx.setNavigationBarTitle({ title: movie.title });
  },

  // 组装展示字段（WXML 内不做运算）
  shapeMovie(m) {
    const shaped = Object.assign({}, m, {
      wantText: m.wanted >= 10000
        ? (m.wanted / 10000).toFixed(1) + '万人想看'
        : m.wanted + '人想看',
      releaseText: m.status === 'showing'
        ? m.releaseDate + ' 已上映'
        : m.releaseDate + ' 上映',
      stills: STILL_EMOJI.map(function (e, i) {
        return { emoji: e, bg: STILL_BG[i % STILL_BG.length], index: i };
      })
    });
    return shaped;
  },

  // 演职人员：导演 + 主演
  buildCast(m) {
    const list = [{
      name: m.director,
      role: '导演',
      emoji: AVATAR_EMOJI[0],
      bg: AVATAR_BG[0]
    }];
    m.actors.forEach(function (name, i) {
      list.push({
        name: name,
        role: '主演',
        emoji: AVATAR_EMOJI[(i + 1) % AVATAR_EMOJI.length],
        bg: AVATAR_BG[(i + 1) % AVATAR_BG.length]
      });
    });
    return list;
  },

  toggleDesc() {
    this.setData({ descOpen: !this.data.descOpen });
  },

  onWant() {
    const wanted = !this.data.wanted;
    this.setData({ wanted: wanted });
    util.toast(wanted ? '已加入想看' : '已取消想看');
  },

  goBuy() {
    wx.navigateTo({
      url: '/pages/schedule/schedule?movieId=' + this.data.movie.id
    });
  },

  onShareAppMessage() {
    const m = this.data.movie;
    return {
      title: m ? (m.title + ' · 特价购票') : '特价电影票',
      path: '/pages/movie-detail/movie-detail?id=' + (m ? m.id : 'm1001')
    };
  }
});
