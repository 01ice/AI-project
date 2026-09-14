// app.js — 特价电影票 小程序入口
const store = require('./utils/store.js');

App({
  globalData: {
    // 当前城市（可在「选择城市」页修改，持久化到本地缓存）
    city: '北京',
    // 登录用户信息（null 表示未登录）
    userInfo: null,
    // 选座 → 确认订单 之间的临时数据，不落盘
    booking: null,
    // 机型信息，用于适配
    statusBarHeight: 20,
    navBarHeight: 44,
    safeBottom: 0
  },

  onLaunch() {
    this.initSystemInfo();
    this.globalData.city = store.getCity();
    this.globalData.userInfo = store.getUser();
    // 把停留超过 5 秒的「出票中」订单推进到「已出票」，模拟后台出票
    store.advanceTicketingOrders();
  },

  onShow() {
    store.advanceTicketingOrders();
  },

  // 读取机型信息，做安全区 / 状态栏适配
  initSystemInfo() {
    let info = {};
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : null;
      const dev = wx.getDeviceInfo ? wx.getDeviceInfo() : null;
      info = Object.assign({}, win || {}, dev || {});
    } catch (e) {
      info = {};
    }
    if (!info.statusBarHeight) {
      try {
        info = Object.assign({}, wx.getSystemInfoSync());
      } catch (e) {
        info = {};
      }
    }
    this.globalData.statusBarHeight = info.statusBarHeight || 20;
    const safeArea = info.safeArea;
    if (safeArea && info.screenHeight) {
      this.globalData.safeBottom = Math.max(0, info.screenHeight - safeArea.bottom);
    }
  },

  // 统一设置城市
  setCity(city) {
    this.globalData.city = city;
    store.setCity(city);
  },

  // 统一设置登录态
  setUser(user) {
    this.globalData.userInfo = user;
    store.setUser(user);
  }
});
