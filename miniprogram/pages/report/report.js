Page({
  data: {
    loading: true,
    report: null
  },

  onLoad() {
    wx.cloud.callFunction({
      name: 'generateFunReport',
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            report: res.result.report,
            loading: false
          });
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      },
      fail: err => {
        console.error('加载报告失败：', err);
        wx.showToast({ title: '请求失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  }
});
