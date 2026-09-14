// pages/profile/profile.js — 个人中心
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

const SERVICE_PHONE = '4008201234';
const WECHAT_ID = 'tejiamovie';

Page({
  data: {
    userInfo: null,
    orderTabs: [
      { key: 'unpaid', label: '待付款', icon: '💳', bg: '#FDF0E4', count: 0 },
      { key: 'ticketing', label: '出票中', icon: '🔄', bg: '#E8F0FD', count: 0 },
      { key: 'ticketed', label: '已出票', icon: '🎟️', bg: '#E6F7EC', count: 0 },
      { key: 'refund', label: '退款/售后', icon: '🧾', bg: '#F2F2F2', count: 0 }
    ],
    tools: [
      { key: 'privacy', label: '隐私协议', icon: '📄', bg: '#FDEBEA' },
      { key: 'online', label: '在线客服', icon: '💬', bg: '#E8F0FD' },
      { key: 'phone', label: '电话客服', icon: '📞', bg: '#E6F7EC' },
      { key: 'wechat', label: '微信客服', icon: '💬', bg: '#E6F7EC' }
    ]
  },

  onLoad() {
    this.refreshUser();
  },

  onShow() {
    store.advanceTicketingOrders();
    this.refreshUser();
    this.refreshCounts();
  },

  refreshUser() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  // 把订单数量合并进四宫格
  refreshCounts() {
    const counts = store.getOrderCounts();
    const tabs = this.data.orderTabs.map(function (t) {
      return Object.assign({}, t, { count: counts[t.key] || 0 });
    });
    this.setData({ orderTabs: tabs });
  },

  /* ---------------- 登录 / 退出 ---------------- */
  onUserTap() {
    if (this.data.userInfo) return;
    const that = this;
    wx.showModal({
      title: '登录特价电影票',
      content: '使用微信身份快速登录，登录后可查看订单与优惠券',
      confirmText: '一键登录',
      confirmColor: '#E8403A',
      success(res) {
        if (!res.confirm) return;
        app.setUser({
          nickName: '微信用户',
          avatarEmoji: '👤',
          isMember: true,
          memberLevel: '影迷会员'
        });
        that.refreshUser();
        util.toast('登录成功', 'success');
      }
    });
  },

  onLogout() {
    const that = this;
    wx.showModal({
      title: '退出登录',
      content: '退出后将无法查看订单与取票码，确定退出吗？',
      confirmText: '退出',
      confirmColor: '#E8403A',
      success(res) {
        if (!res.confirm) return;
        app.setUser(null);
        that.refreshUser();
        that.refreshCounts();
        util.toast('已退出登录');
      }
    });
  },

  /* ---------------- 订单入口 ---------------- */
  goOrders(e) {
    const status = e.currentTarget.dataset.status || 'all';
    wx.navigateTo({ url: '/pages/orders/orders?status=' + status });
  },

  /* ---------------- 常用功能 ---------------- */
  onToolTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'privacy') {
      wx.navigateTo({ url: '/pages/agreement/agreement' });
      return;
    }
    if (key === 'phone') {
      wx.makePhoneCall({
        phoneNumber: SERVICE_PHONE,
        fail() {
          util.toast('客服电话：' + SERVICE_PHONE);
        }
      });
      return;
    }
    if (key === 'wechat') {
      wx.setClipboardData({
        data: WECHAT_ID,
        success() {
          util.toast('微信号已复制：' + WECHAT_ID);
        }
      });
      return;
    }
    // 在线客服：小程序客服会话需在后台配置，这里给出提示
    wx.showModal({
      title: '在线客服',
      content: '服务时间 09:00 - 21:00。当前为前端演示环境，未接入客服会话，可拨打 ' + SERVICE_PHONE + ' 咨询。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#E8403A'
    });
  }
});
