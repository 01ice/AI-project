// pages/orders/orders.js — 我的订单
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

// 不同状态下的可执行操作
const ACTION_MAP = {
  unpaid: [
    { key: 'cancel', label: '取消订单' },
    { key: 'pay', label: '立即支付', primary: true }
  ],
  ticketing: [
    { key: 'detail', label: '查看详情' }
  ],
  ticketed: [
    { key: 'refund', label: '申请退款' },
    { key: 'code', label: '查看取票码', primary: true }
  ],
  refund: [
    { key: 'delete', label: '删除订单' }
  ]
};

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'unpaid', label: '待付款' },
      { key: 'ticketing', label: '出票中' },
      { key: 'ticketed', label: '已出票' },
      { key: 'refund', label: '退款/售后' }
    ],
    status: 'all',
    list: []
  },

  onLoad(options) {
    this.setData({ status: options.status || 'all' });
  },

  onShow() {
    this.refresh();
    this.startTimer();
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  refresh() {
    // 先把超时的「出票中」推进为「已出票」
    store.advanceTicketingOrders();

    const raw = store.getOrdersByStatus(this.data.status);
    const list = raw.map(function (o) {
      const meta = store.ORDER_STATUS[o.status] || {};
      return Object.assign({}, o, {
        statusColor: meta.color || '#999999',
        actions: ACTION_MAP[o.status] || []
      });
    });
    this.setData({ list: list });

    const stillTicketing = raw.some(function (o) {
      return o.status === 'ticketing';
    });
    if (!stillTicketing) this.stopTimer();
  },

  // 有订单在出票中时轮询刷新，模拟后台出票完成
  startTimer() {
    if (this.timer) return;
    const hasTicketing = store.getOrders().some(function (o) {
      return o.status === 'ticketing';
    });
    if (!hasTicketing) return;
    this.timer = setInterval(() => {
      this.refresh();
    }, 1500);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  onTab(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.status) return;
    this.setData({ status: key });
    this.refresh();
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id
    });
  },

  goMovie() {
    wx.switchTab({ url: '/pages/movie/movie' });
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    const id = e.currentTarget.dataset.id;

    if (key === 'detail' || key === 'code') {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
      return;
    }
    if (key === 'pay') {
      this.payOrder(id);
      return;
    }
    if (key === 'cancel') {
      this.confirmThen('取消订单', '取消后座位将被释放，确定取消吗？', '确定取消', id, {
        status: 'refund',
        statusText: '已取消'
      }, '订单已取消');
      return;
    }
    if (key === 'refund') {
      this.confirmThen('申请退款', '退款将原路退回，预计 1-3 个工作日到账，确定申请吗？', '申请退款', id, {
        status: 'refund',
        statusText: '退款/售后',
        refundAt: util.dateTimeStr(new Date())
      }, '退款申请已提交');
      return;
    }
    if (key === 'delete') {
      const that = this;
      wx.showModal({
        title: '删除订单',
        content: '删除后订单记录不可恢复，确定删除吗？',
        confirmText: '删除',
        confirmColor: '#E8403A',
        success(res) {
          if (!res.confirm) return;
          store.removeOrder(id);
          that.refresh();
          util.toast('订单已删除');
        }
      });
    }
  },

  // 通用：二次确认 → 更新订单状态
  confirmThen(title, content, confirmText, id, patch, successTip) {
    const that = this;
    wx.showModal({
      title: title,
      content: content,
      confirmText: confirmText,
      confirmColor: '#E8403A',
      success(res) {
        if (!res.confirm) return;
        store.updateOrder(id, patch);
        that.refresh();
        util.toast(successTip);
      }
    });
  },

  // 支付（演示：模拟微信支付）
  payOrder(id) {
    const that = this;
    const order = store.getOrderById(id);
    if (!order) return;
    wx.showModal({
      title: '微信支付',
      content: '特价电影票\n应付金额 ¥' + order.totalText,
      confirmText: '立即支付',
      confirmColor: '#E8403A',
      success(res) {
        if (!res.confirm) return;
        store.updateOrder(id, {
          status: 'ticketing',
          statusText: store.ORDER_STATUS.ticketing.text,
          ticketingAt: Date.now(),
          paidAt: util.dateTimeStr(new Date())
        });
        util.toast('支付成功，正在出票', 'success');
        that.refresh();
        that.startTimer();
      }
    });
  }
});
