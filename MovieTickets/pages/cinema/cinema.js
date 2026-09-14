// pages/cinema/cinema.js — 影院列表
const app = getApp();
const mock = require('../../utils/mock.js');

Page({
  data: {
    city: '北京',
    list: []
  },

  onLoad() {
    this.setData({
      city: app.globalData.city,
      list: mock.getCinemas()
    });
  },

  onShow() {
    if (this.data.city !== app.globalData.city) {
      this.setData({ city: app.globalData.city });
    }
  },

  onPullDownRefresh() {
    this.setData({ list: mock.getCinemas() });
    wx.stopPullDownRefresh();
  },

  goCity() {
    wx.navigateTo({ url: '/pages/city/city' });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search?type=cinema' });
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/cinema-detail/cinema-detail?id=' + e.currentTarget.dataset.id
    });
  },

  onShareAppMessage() {
    return {
      title: '特价电影票 · 附近影院低至 3 折',
      path: '/pages/cinema/cinema'
    };
  }
});
