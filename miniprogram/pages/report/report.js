Page({
  data: {
    loading: true,
    report: null
  },

  onLoad() {
    this.fetchReport();
  },

  fetchReport() {
    wx.cloud.callFunction({
      name: 'generateFunReport',
      success: res => {
        if (res.result && res.result.success) {
          console.log('📥 获取报告成功：', res.result.report);
          this.setData({
            report: res.result.report,
            loading: false
          });
        } else {
          console.warn('⚠️ 报告加载失败：无有效数据');
          wx.showToast({ title: '报告数据为空', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: err => {
        console.error('❌ 云函数调用失败:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  }
});
