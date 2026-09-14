// pages/cinema-detail/cinema-detail.js — 影院选片 / 场次
const mock = require('../../utils/mock.js');
const util = require('../../utils/util.js');

Page({
  data: {
    cinema: null,
    movies: [],
    movieIndex: 0,
    movie: null,
    expanded: false,
    dates: [],
    dayIndex: 0,
    slots: [],
    priceRange: '',
    originMinText: ''
  },

  onLoad(options) {
    const cinema = mock.getCinemaById(options.id || 'c1');
    if (!cinema) {
      this.setData({ cinema: null });
      return;
    }
    // 该影院当天有排片的影片，作为海报轮播数据源
    const movies = mock.getMovies('showing').filter(function (m) {
      return mock.getShowtimes(cinema.id, m.id, 0).length > 0;
    });
    const movieIndex = Number(options.movieIndex || 0) || 0;
    wx.setNavigationBarTitle({ title: cinema.name });
    this.setData({
      cinema: cinema,
      movies: movies,
      dates: mock.getShowDates()
    });
    this.selectMovie(movieIndex, 0);
  },

  onShow() {
    // 回到本页时刷新停售状态（时间在走）
    if (this.data.cinema) this.buildSlots(this.data.movieIndex, this.data.dayIndex);
  },

  /** 选中第 index 部影片 */
  selectMovie(index, dayIndex) {
    const movies = this.data.movies;
    if (!movies.length) {
      this.setData({ movie: null, slots: [] });
      return;
    }
    const i = Math.max(0, Math.min(index, movies.length - 1));
    const movie = movies[i];
    this.setData({
      movieIndex: i,
      movie: movie,
      expanded: false
    });
    const day = typeof dayIndex === 'number' ? dayIndex : this.data.dayIndex;
    this.buildSlots(i, day);
  },

  /** 生成场次列表 + 价格区间 */
  buildSlots(movieIndex, dayIndex) {
    const cinema = this.data.cinema;
    const movie = this.data.movies[movieIndex];
    if (!cinema || !movie) return;

    const slots = mock.getShowtimes(cinema.id, movie.id, dayIndex);

    if (slots.length === 0) {
      this.setData({ slots: [], priceRange: '', originMinText: '' });
      return;
    }
    let min = slots[0].price;
    let max = slots[0].price;
    let originMin = slots[0].originPrice;
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].price < min) min = slots[i].price;
      if (slots[i].price > max) max = slots[i].price;
      if (slots[i].originPrice < originMin) originMin = slots[i].originPrice;
    }
    // 价格区间形如 "21.17-39.92元"；最低价与最高价相同时只显示一个
    const priceRange = min === max
      ? util.money(min, 2) + '元'
      : util.money(min, 2) + '-' + util.money(max, 2) + '元';

    this.setData({
      slots: slots,
      priceRange: priceRange,
      originMinText: util.money(originMin, 2).replace(/\.00$/, '')
    });
  },

  /** 海报轮播切换 */
  onMovieSwiper(e) {
    const index = e.detail.current;
    if (index === this.data.movieIndex) return;
    this.selectMovie(index);
  },

  /** 点击海报（当前页的海报才响应，避免误触） */
  onPosterTap(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index === this.data.movieIndex) {
      wx.navigateTo({
        url: '/pages/movie-detail/movie-detail?id=' + this.data.movies[index].id
      });
    } else {
      this.selectMovie(index);
    }
  },

  toggleIntro() {
    this.setData({ expanded: !this.data.expanded });
  },

  onDay(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index === this.data.dayIndex) return;
    this.setData({ dayIndex: index });
    this.buildSlots(this.data.movieIndex, index);
  },

  callPhone() {
    const phone = this.data.cinema.phone;
    wx.makePhoneCall({
      phoneNumber: phone,
      fail() {
        util.toast('影院电话：' + phone);
      }
    });
  },

  /** 打开系统地图，展示影院位置并支持导航 */
  openLocation() {
    const cinema = this.data.cinema;
    if (!cinema || !cinema.latitude || !cinema.longitude) {
      util.toast('暂无该影院位置信息');
      return;
    }
    // wx.openLocation 需要数值型经纬度
    wx.openLocation({
      latitude: Number(cinema.latitude),
      longitude: Number(cinema.longitude),
      name: cinema.name,
      address: cinema.address,
      scale: 17,
      fail(err) {
        // 用户拒绝授权、或开发者工具中地图组件不可用时给出提示
        util.toast('打开地图失败：' + ((err && err.errMsg) || '未知错误'));
      }
    });
  },

  goSeat(e) {
    const ds = e.currentTarget.dataset;
    const slot = this.data.slots[Number(ds.slot)];
    if (!slot) return;
    if (slot.stopped) {
      util.toast('该场次已停止售票');
      return;
    }
    wx.navigateTo({
      url: '/pages/seat/seat?cinemaId=' + this.data.cinema.id +
        '&movieId=' + this.data.movie.id +
        '&day=' + this.data.dayIndex +
        '&slot=' + ds.slot
    });
  }
});
