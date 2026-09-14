// pages/city/city.js — 选择城市
const app = getApp();
const mock = require('../../utils/mock.js');
const util = require('../../utils/util.js');

Page({
  data: {
    keyword: '',
    result: [],
    hot: [],
    groups: [],
    current: '北京'
  },

  onLoad() {
    // 拉平城市列表，供关键词过滤
    const all = [];
    mock.CITY_GROUPS.forEach(function (g) {
      g.cities.forEach(function (c) {
        if (all.indexOf(c) === -1) all.push(c);
      });
    });
    this.allCities = all;

    this.setData({
      hot: mock.HOT_CITIES,
      groups: mock.CITY_GROUPS,
      current: app.globalData.city
    });
  },

  onInput(e) {
    const keyword = e.detail.value;
    const w = String(keyword || '').trim();
    const result = w
      ? this.allCities.filter(function (c) {
        return c.indexOf(w) > -1;
      })
      : [];
    this.setData({ keyword: keyword, result: result });
  },

  onClear() {
    this.setData({ keyword: '', result: [] });
  },

  // 重新定位（演示：固定返回北京）
  relocate() {
    const that = this;
    wx.showLoading({ title: '定位中', mask: true });
    setTimeout(function () {
      wx.hideLoading();
      app.setCity('北京');
      that.setData({ current: '北京' });
      util.toast('已定位到北京');
    }, 800);
  },

  onPick(e) {
    const city = e.currentTarget.dataset.name;
    app.setCity(city);
    util.toast('已切换到 ' + city);
    setTimeout(function () {
      wx.navigateBack({
        fail() {
          wx.switchTab({ url: '/pages/movie/movie' });
        }
      });
    }, 400);
  }
});
