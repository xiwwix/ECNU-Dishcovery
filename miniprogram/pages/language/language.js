Page({
  data: {
    language: wx.getStorageSync('language') || 'zh'
  },
  setLanguage(e) {
    const lang = e.currentTarget.dataset.lang;
    wx.setStorageSync('language', lang);
    this.setData({ language: lang });
    wx.showToast({
      title: lang === 'zh' ? '已切换为中文' : 'Switched to English',
      icon: 'success'
    });
  }
});
