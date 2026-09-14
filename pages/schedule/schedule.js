// pages/schedule/schedule.js — 选择影院与场次
const mock = require('../../utils/mock.js');

Page({
  data: {
    movie: null,
    dates: [],
    dayIndex: 0,
    list: []
  },

  onLoad(options) {
    const movieId = options.movieId || 'm1001';
    const movie = mock.getMovieById(movieId);
    if (!movie) {
      this.setData({ movie: null });
      return;
    }
    const dates = mock.getShowDates();
    this.setData({
      movie: movie,
      dates: dates,
      dayIndex: 0
    });
    wx.setNavigationBarTitle({ title: '选择场次 · ' + movie.title });
    this.buildList(0);
  },

  onDay(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index === this.data.dayIndex) return;
    this.setData({ dayIndex: index });
    this.buildList(index);
  },

  // 各影院的场次列表
  buildList(dayIndex) {
    const movieId = this.data.movie.id;
    const list = mock.getCinemas().map(function (c) {
      return {
        id: c.id,
        cinema: c,
        times: mock.getShowtimes(c.id, movieId, dayIndex)
      };
    }).filter(function (row) {
      return row.times.length > 0;
    });
    this.setData({ list: list });
  },

  goCinema(e) {
    wx.navigateTo({
      url: '/pages/cinema-detail/cinema-detail?id=' + e.currentTarget.dataset.id
    });
  },

  goSeat(e) {
    const ds = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/seat/seat?cinemaId=' + ds.cinema +
        '&movieId=' + this.data.movie.id +
        '&day=' + this.data.dayIndex +
        '&slot=' + ds.slot
    });
  }
});
