Page({
  data: {
    question: '',
    result: '',
    dishes: []
  },

  onInput(e) {
    this.setData({ question: e.detail.value });
  },

  onVoiceInput() {
    // 这里可调用微信API录音或语音识别接口
    wx.showToast({ title: '暂未接入语音', icon: 'none' });
  },

  onAskModel() {
    const { question } = this.data;
    const dishes = getApp().globalData.dishes;

    wx.showLoading({ title: '推荐中...' });

    wx.cloud.callFunction({
      name: 'modelRecommend',
      data: {
        question,
        dishes
      }
    }).then(res => {
      const result = res.result;
      if (result && result.recommended && result.recommended.length > 0) {
        this.setData({ result: '', dishes: result.recommended });
      } else {
        this.setData({ result: '找不到指定的菜品', dishes: [] });
      }
    }).catch(() => {
      this.setData({ result: '推荐失败', dishes: [] });
    }).finally(() => wx.hideLoading());
  }
});
