// pages/movie/movie.js — 首页
const app = getApp();
const mock = require('../../utils/mock.js');
const util = require('../../utils/util.js');

Page({
  data: {
    city: '北京',
    banners: [],
    bannerIndex: 0,
    notice: '',
    tab: 'showing',
    list: []
  },

  onLoad() {
    this.setData({
      city: app.globalData.city,
      banners: mock.BANNERS,
      notice: mock.NOTICE
    });
    this.loadList();
  },

  onShow() {
    // 从「选择城市」页返回时同步城市
    if (this.data.city !== app.globalData.city) {
      this.setData({ city: app.globalData.city });
    }
  },

  onPullDownRefresh() {
    this.loadList();
    wx.stopPullDownRefresh();
  },

  // 加载影片列表（把展示用文案在 JS 层算好）
  loadList() {
    const raw = mock.getMovies(this.data.tab);
    const list = raw.map(function (m) {
      return Object.assign({}, m, {
        wantText: m.wanted >= 10000
          ? (m.wanted / 10000).toFixed(1) + '万人想看'
          : m.wanted + '人想看'
      });
    });
    this.setData({ list: list });
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab: tab });
    this.loadList();
  },

  onBannerChange(e) {
    this.setData({ bannerIndex: e.detail.current });
  },

  onBannerTap(e) {
    const index = e.currentTarget.dataset.index;
    const banner = this.data.banners[index];
    if (!banner) return;
    wx.navigateTo({
      url: '/pages/movie-detail/movie-detail?id=' + banner.id
    });
  },

  goCity() {
    wx.navigateTo({ url: '/pages/city/city' });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/movie-detail/movie-detail?id=' + e.currentTarget.dataset.id
    });
  },

  // 购票 / 想看
  goBuy(e) {
    const id = e.currentTarget.dataset.id;
    const movie = mock.getMovieById(id);
    if (!movie) return;
    if (movie.status !== 'showing') {
      util.toast('已加入想看，上映前会提醒你');
      return;
    }
    wx.navigateTo({ url: '/pages/schedule/schedule?movieId=' + id });
  },

  onShareAppMessage() {
    return {
      title: '特价电影票 · 全国影院低至 3 折',
      path: '/pages/movie/movie'
    };
  }
});
