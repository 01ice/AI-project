// pages/seat/seat.js — 选座购票
const app = getApp();
const mock = require('../../utils/mock.js');
const util = require('../../utils/util.js');

const MAX_SEATS = 4;              // 每单最多选座数
const SERVICE_FEE_PER_SEAT = 1.5; // 每张票的服务费（元）

Page({
  data: {
    movie: null,
    cinema: null,
    hall: '',
    dateText: '',
    time: '',
    endTime: '',
    price: 0,
    priceText: '0.00',
    rows: [],
    seatSize: 48,
    rowH: 60,
    chosen: [],
    totalText: '0.00'
  },

  onLoad(options) {
    const cinemaId = options.cinemaId || 'c1';
    const movieId = options.movieId || 'm1001';
    const dayIndex = Number(options.day || 0);
    const slotIndex = Number(options.slot || 0);

    const cinema = mock.getCinemaById(cinemaId);
    const movie = mock.getMovieById(movieId);
    if (!cinema || !movie) {
      this.setData({ movie: null });
      return;
    }

    const show = mock.getShowtimes(cinemaId, movieId, dayIndex)[slotIndex];
    if (!show) {
      this.setData({ movie: null });
      return;
    }

    const dateRow = mock.getShowDates()[dayIndex] || mock.getShowDates()[0];
    const seatMap = mock.getSeatMap(cinemaId, movieId, show.id);
    const aisles = seatMap.aisleAfter;

    // 座位尺寸自适应：让整排座位（含排号列）稳稳落在卡片宽度内
    // 可用宽度 = 750 - 左右外边距 48 - 卡片内边距 32 - 排号列 44 = 626rpx，
    // 这里留 26rpx 安全余量，避免不同机型下 1rpx 取整导致溢出
    const availWidth = 600;
    let size = Math.floor((availWidth - seatMap.colCount * 6 - aisles.length * 24) / seatMap.colCount);
    size = Math.max(38, Math.min(56, size));

    // 生成初始座位（附加过道标记）
    const baseRows = seatMap.rows.map(function (r) {
      return {
        rowNo: r.rowNo,
        seats: r.seats.map(function (s) {
          return {
            key: s.key,
            row: s.row,
            col: s.col,
            sold: s.sold,
            chosen: false,
            aisle: aisles.indexOf(s.col) > -1
          };
        })
      };
    });

    this.baseRows = baseRows;      // 未被修改的原始座位图
    this.show = show;
    this.dayIndex = dayIndex;

    this.setData({
      movie: movie,
      cinema: cinema,
      hall: show.hall,
      dateText: dateRow.label + ' ' + dateRow.mmdd,
      time: show.time,
      endTime: show.endTime,
      price: show.price,
      priceText: util.money(show.price, 2),
      rows: baseRows,
      seatSize: size,
      rowH: size + 14
    });

    wx.setNavigationBarTitle({ title: '选座 · ' + movie.title });
  },

  // 点击座位
  onSeatTap(e) {
    const ds = e.currentTarget.dataset;
    const row = Number(ds.row);
    const col = Number(ds.col);
    const sold = ds.sold === true || ds.sold === 'true';

    if (sold) {
      util.toast('该座位已售出，换一个吧');
      return;
    }

    const rIdx = row - 1;
    const cIdx = col - 1;
    const seat = this.data.rows[rIdx].seats[cIdx];
    const willChoose = !seat.chosen;

    if (willChoose && this.data.chosen.length >= MAX_SEATS) {
      util.toast('每单最多选择 ' + MAX_SEATS + ' 个座位');
      return;
    }

    let chosen;
    if (willChoose) {
      chosen = this.data.chosen.concat([{
        key: seat.key,
        label: row + '排' + col + '座',
        row: row,
        col: col
      }]);
    } else {
      chosen = this.data.chosen.filter(function (c) {
        return c.key !== seat.key;
      });
    }
    chosen.sort(function (a, b) {
      return a.row === b.row ? a.col - b.col : a.row - b.row;
    });

    const patch = {};
    patch['rows[' + rIdx + '].seats[' + cIdx + '].chosen'] = willChoose;
    patch.chosen = chosen;
    patch.totalText = util.money(chosen.length * this.data.price, 2);
    this.setData(patch);
  },

  // 从已选列表移除
  removeSeat(e) {
    const key = e.currentTarget.dataset.key;
    const chosen = this.data.chosen.filter(function (c) {
      return c.key !== key;
    });
    const rows = this.data.rows.map(function (r) {
      return {
        rowNo: r.rowNo,
        seats: r.seats.map(function (s) {
          return s.key === key ? Object.assign({}, s, { chosen: false }) : s;
        })
      };
    });
    this.setData({
      rows: rows,
      chosen: chosen,
      totalText: util.money(chosen.length * this.data.price, 2)
    });
  },

  clearChosen() {
    this.setData({
      rows: this.baseRows,
      chosen: [],
      totalText: '0.00'
    });
  },

  // 确认选座 → 确认订单
  goConfirm() {
    if (this.data.chosen.length === 0) {
      util.toast('请先选择座位');
      return;
    }
    const count = this.data.chosen.length;
    const ticketTotal = count * this.show.price;
    const serviceFee = count * SERVICE_FEE_PER_SEAT;
    const total = ticketTotal + serviceFee;
    const dateRow = mock.getShowDates()[this.dayIndex] || mock.getShowDates()[0];

    app.globalData.booking = {
      movieId: this.data.movie.id,
      movieTitle: this.data.movie.title,
      posterEmoji: this.data.movie.posterEmoji,
      posterBg: this.data.movie.posterBg,
      poster: this.data.movie.poster,
      formatText: this.data.movie.formatText,
      cinemaId: this.data.cinema.id,
      cinemaName: this.data.cinema.name,
      cinemaAddress: this.data.cinema.address,
      hall: this.show.hall,
      date: this.show.date,
      dateText: dateRow.label + ' ' + dateRow.mmdd,
      time: this.show.time,
      endTime: this.show.endTime,
      language: this.show.language,
      seatCount: count,
      seats: this.data.chosen.map(function (c) {
        return c.label;
      }),
      seatsText: this.data.chosen.map(function (c) {
        return c.label;
      }).join('、'),
      price: this.show.price,
      priceText: util.money(this.show.price, 2),
      ticketTotalText: util.money(ticketTotal, 2),
      serviceFeeText: util.money(serviceFee, 2),
      totalText: util.money(total, 2),
      total: total
    };

    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' });
  }
});
