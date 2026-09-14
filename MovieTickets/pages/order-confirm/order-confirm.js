// pages/order-confirm/order-confirm.js — 确认订单
const app = getApp();
const store = require('../../utils/store.js');
const util = require('../../utils/util.js');

// 演示用默认手机号（真实项目里应从用户资料读取）
const DEFAULT_PHONE = '13800138000';

Page({
  data: {
    booking: null,
    phone: DEFAULT_PHONE,
    submitting: false,
    tips: [
      '支付成功后系统自动出票，出票时间约 5 秒。',
      '影片开场前 30 分钟可凭取票码到影院自助机取票。',
      '本平台不支持影院现场换座、改签，座位售出不退不换。',
      '如遇场次取消或影院原因无法放映，将全额退款。'
    ]
  },

  onLoad() {
    const booking = app.globalData.booking;
    if (!booking) {
      this.setData({ booking: null });
      return;
    }
    this.setData({ booking: booking });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onSubmit() {
    if (this.data.submitting) return;

    const booking = this.data.booking;
    if (!booking) return;

    const phone = String(this.data.phone || '').trim();
    if (!/^1\d{10}$/.test(phone)) {
      util.toast('请输入正确的 11 位手机号');
      return;
    }

    this.setData({ submitting: true });

    // 1) 生成本地订单（待付款）
    const order = {
      id: util.makeOrderNo(),
      createdAt: util.dateTimeStr(new Date()),
      status: 'unpaid',
      statusText: store.ORDER_STATUS.unpaid.text,
      movieId: booking.movieId,
      movieTitle: booking.movieTitle,
      posterEmoji: booking.posterEmoji,
      posterBg: booking.posterBg,
      poster: booking.poster,
      formatText: booking.formatText,
      language: booking.language,
      cinemaId: booking.cinemaId,
      cinemaName: booking.cinemaName,
      cinemaAddress: booking.cinemaAddress,
      hall: booking.hall,
      date: booking.date,
      dateText: booking.dateText,
      time: booking.time,
      endTime: booking.endTime,
      seatCount: booking.seatCount,
      seats: booking.seats,
      seatsText: booking.seatsText,
      price: booking.price,
      priceText: booking.priceText,
      ticketTotalText: booking.ticketTotalText,
      serviceFeeText: booking.serviceFeeText,
      total: booking.total,
      totalText: booking.totalText,
      phone: phone,
      phoneMask: util.maskPhone(phone),
      ticketCode: ''
    };
    store.addOrder(order);
    app.globalData.booking = null;

    // 2) 模拟微信支付
    const orderId = order.id;
    wx.showModal({
      title: '微信支付',
      content: '特价电影票\n应付金额 ¥' + order.totalText,
      confirmText: '立即支付',
      cancelText: '稍后支付',
      confirmColor: '#E8403A',
      success: (res) => {
        if (res.confirm) {
          // 支付成功 → 进入出票中
          store.updateOrder(orderId, {
            status: 'ticketing',
            statusText: store.ORDER_STATUS.ticketing.text,
            ticketingAt: Date.now(),
            paidAt: util.dateTimeStr(new Date())
          });
          util.toast('支付成功，正在出票', 'success');
        } else {
          util.toast('已生成订单，可在「我的订单」中继续支付');
        }
        wx.redirectTo({
          url: '/pages/order-detail/order-detail?id=' + orderId
        });
      },
      fail: () => {
        this.setData({ submitting: false });
        wx.redirectTo({
          url: '/pages/order-detail/order-detail?id=' + orderId
        });
      }
    });
  }
});
