const app = getApp();

Page({
  data: {
    logoAnimation: {},
    textAnimation: {}
  },
  onLoad: function() {
    this.animateElements();
    this.checkDataAndRedirect();
  },
  animateElements: function() {
    const logoAnimation = wx.createAnimation({
      duration: 1000, // 动画持续时间，单位ms
      timingFunction: 'ease',
    });

    const textAnimation = wx.createAnimation({
      duration: 1000, // 动画持续时间，单位ms
      timingFunction: 'ease',
    });

    logoAnimation.opacity(1).scale(1.2, 1.2).step(); // logo图片由透明变为不透明，且稍微放大
    textAnimation.opacity(1).step({ delay: 500 }); // 文本动画，延迟500ms后由透明变为不透明

    this.setData({
      logoAnimation: logoAnimation.export(),
      textAnimation: textAnimation.export()
    });
  },
  checkDataAndRedirect: function() {
    if (app.globalData.dishesLoaded) {
      // 如果数据已加载，延迟一段时间后跳转，确保用户可以看到splash动画
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index',
        })
      }, 500); // 延时跳转，确保动画可以展示一段时间
    } else {
      // 如果数据未加载完成，每100ms检查一次
      const checkInterval = setInterval(() => {
        if (app.globalData.dishesLoaded) {
          clearInterval(checkInterval);
          wx.reLaunch({
            url: '/pages/index/index',
          });
        }
      }, 100);
    }
  }
});
