// pages/search/search.js — 搜索电影 / 影院
const mock = require('../../utils/mock.js');
const store = require('../../utils/store.js');

Page({
  data: {
    placeholder: '搜索电影',
    keyword: '',
    hot: [],
    history: [],
    movies: [],
    cinemas: []
  },

  onLoad(options) {
    const isCinema = options.type === 'cinema';
    this.setData({
      placeholder: isCinema ? '搜索附近的影院' : '搜索电影',
      hot: mock.HOT_SEARCH,
      history: store.getSearchHistory()
    });
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword: keyword });
    this.doSearch(keyword);
  },

  onConfirm(e) {
    this.doSearch(e.detail.value);
  },

  onChip(e) {
    const word = e.currentTarget.dataset.word;
    this.setData({ keyword: word });
    this.doSearch(word);
  },

  doSearch(keyword) {
    const w = String(keyword || '').trim();
    if (!w) {
      this.setData({ movies: [], cinemas: [] });
      return;
    }
    const res = mock.search(w);
    this.setData({ movies: res.movies, cinemas: res.cinemas });
  },

  onClear() {
    this.setData({ keyword: '', movies: [], cinemas: [] });
  },

  clearHistory() {
    const that = this;
    wx.showModal({
      title: '清空搜索历史',
      content: '确定清空全部搜索历史吗？',
      confirmText: '清空',
      confirmColor: '#E8403A',
      success(res) {
        if (!res.confirm) return;
        store.clearSearchHistory();
        that.setData({ history: [] });
      }
    });
  },

  goMovie(e) {
    const id = e.currentTarget.dataset.id;
    store.addSearchHistory(this.data.keyword);
    wx.navigateTo({ url: '/pages/movie-detail/movie-detail?id=' + id });
  },

  goCinema(e) {
    const id = e.currentTarget.dataset.id;
    store.addSearchHistory(this.data.keyword);
    wx.navigateTo({ url: '/pages/cinema-detail/cinema-detail?id=' + id });
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/movie/movie' });
      }
    });
  }
});
