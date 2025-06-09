Page({
  data: {
    importance: {},      // 用户对各因素重视程度
    tasteScore: {},      // 用户对不同口味的偏好
    importanceList: [    // 决策因素列表
      { key: 'taste', label: '口味' },
      { key: 'distance', label: '距离' },
      { key: 'price', label: '价格' },
      { key: 'environment', label: '用餐环境' },
      { key: 'waitTime', label: '等待时间短' },
      { key: 'familiarity', label: '是否熟悉' }
    ],
    tasteList: ['甜', '辣', '咸', '酸', '清淡']  // 口味维度
  },

  onLoad() {
    wx.cloud.callFunction({
      name: 'getUserPreference',
      success: res => {
        const user = res.result;
        if (user && user.preferenceSet) {
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
      fail: err => {
        console.warn('无法获取用户信息，继续展示问卷：', err);
      }
    });
  },

  // 重视程度滑块变化
  onImportanceChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = parseInt(e.detail.value);
    this.setData({ [`importance.${key}`]: value });
  },

  // 口味偏好滑块变化
  onTasteChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = parseInt(e.detail.value);
    this.setData({ [`tasteScore.${key}`]: value });
  },

  // 提交问卷
  onSubmit() {
    const { importance, tasteScore } = this.data;

    // 校验是否都填写完
    if (Object.keys(importance).length < this.data.importanceList.length ||
        Object.keys(tasteScore).length < this.data.tasteList.length) {
      wx.showToast({
        title: '请完整填写所有问题',
        icon: 'none'
      });
      return;
    }

    // 调用云函数
    wx.cloud.callFunction({
      name: 'saveUserPreference',
      data: {
        importance,
        tasteScore,
        preferenceSet: true
      },
      success: () => {
        wx.showToast({ title: '提交成功', icon: 'success' });
        wx.reLaunch({ url: '/pages/index/index' });
      },
      fail: err => {
        console.error('保存失败：', err);
        wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      }
    });
  }
});
