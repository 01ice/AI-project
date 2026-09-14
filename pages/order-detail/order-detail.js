// pages/order-detail/order-detail.js — 订单详情
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

// 状态 → 头图配色 / 图标
const STATUS_STYLE = {
  unpaid: { bg: 'linear-gradient(135deg,#FF9A4D 0%,#FF7A33 100%)', icon: '⏰' },
  ticketing: { bg: 'linear-gradient(135deg,#5B9BFF 0%,#2F7BFF 100%)', icon: '🎬' },
  ticketed: { bg: 'linear-gradient(135deg,#4CC98A 0%,#22A45D 100%)', icon: '🎟️' },
  refund: { bg: 'linear-gradient(135deg,#B8B8B8 0%,#9A9A9A 100%)', icon: '↩️' }
};

const ACTION_MAP = {
  unpaid: [
    { key: 'cancel', label: '取消订单' },
    { key: 'pay', label: '立即支付', primary: true }
  ],
  ticketing: [
    { key: 'refresh', label: '刷新状态', primary: true }
  ],
  ticketed: [
    { key: 'refund', label: '申请退款' },
    { key: 'code', label: '复制取票码', primary: true }
  ],
  refund: [
    { key: 'delete', label: '删除订单' }
  ]
};

Page({
  data: {
    order: null,
    statusBg: '#999999',
    statusIcon: '🎫',
    statusDesc: '',
    actions: [],
    countdown: ''
  },

  onLoad(options) {
    this.orderId = options.id || '';
    this.load();
  },

  onShow() {
    this.load();
    this.startTimer();
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  load() {
    store.advanceTicketingOrders();
    const order = store.getOrderById(this.orderId);
    if (!order) {
      this.setData({ order: null });
      return;
    }
    const meta = store.ORDER_STATUS[order.status] || {};
    const style = STATUS_STYLE[order.status] || STATUS_STYLE.refund;
    this.setData({
      order: order,
      statusBg: style.bg,
      statusIcon: style.icon,
      statusDesc: meta.desc || '',
      actions: ACTION_MAP[order.status] || []
    });
    this.updateCountdown();
  },

  // 出票倒计时
  updateCountdown() {
    const order = this.data.order;
    if (!order || order.status !== 'ticketing') {
      if (this.data.countdown) this.setData({ countdown: '' });
      return;
    }
    const remain = Math.ceil(store.ticketingRemain(order) / 1000);
    this.setData({ countdown: remain > 0 ? ('预计 ' + remain + ' 秒内完成出票') : '正在生成取票码…' });
  },

  startTimer() {
    if (this.timer) return;
    const order = store.getOrderById(this.orderId);
    if (!order || order.status !== 'ticketing') return;
    this.timer = setInterval(() => {
      const changed = store.advanceTicketingOrders();
      if (changed) {
        util.toast('出票成功', 'success');
        this.load();
        this.stopTimer();
        return;
      }
      this.updateCountdown();
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  copyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.id,
      success() {
        util.toast('订单号已复制');
      }
    });
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    const id = this.orderId;
    const that = this;

    if (key === 'refresh') {
      const changed = store.advanceTicketingOrders();
      this.load();
      util.toast(changed ? '已出票' : '出票中，请稍候');
      return;
    }

    if (key === 'code') {
      wx.setClipboardData({
        data: this.data.order.ticketCode,
        success() {
          util.toast('取票码已复制');
        }
      });
      return;
    }

    if (key === 'pay') {
      wx.showModal({
        title: '微信支付',
        content: '特价电影票\n应付金额 ¥' + this.data.order.totalText,
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
          that.load();
          that.startTimer();
        }
      });
      return;
    }

    if (key === 'cancel') {
      wx.showModal({
        title: '取消订单',
        content: '取消后座位将被释放，确定取消吗？',
        confirmText: '确定取消',
        confirmColor: '#E8403A',
        success(res) {
          if (!res.confirm) return;
          store.updateOrder(id, { status: 'refund', statusText: '已取消' });
          util.toast('订单已取消');
          that.load();
        }
      });
      return;
    }

    if (key === 'refund') {
      wx.showModal({
        title: '申请退款',
        content: '退款将原路退回，预计 1-3 个工作日到账，确定申请吗？',
        confirmText: '申请退款',
        confirmColor: '#E8403A',
        success(res) {
          if (!res.confirm) return;
          store.updateOrder(id, {
            status: 'refund',
            statusText: '退款/售后',
            refundAt: util.dateTimeStr(new Date())
          });
          util.toast('退款申请已提交');
          that.load();
        }
      });
      return;
    }

    if (key === 'delete') {
      wx.showModal({
        title: '删除订单',
        content: '删除后订单记录不可恢复，确定删除吗？',
        confirmText: '删除',
        confirmColor: '#E8403A',
        success(res) {
          if (!res.confirm) return;
          store.removeOrder(id);
          util.toast('订单已删除');
          setTimeout(function () {
            wx.navigateBack({
              fail() {
                wx.switchTab({ url: '/pages/profile/profile' });
              }
            });
          }, 600);
        }
      });
    }
  }
});
