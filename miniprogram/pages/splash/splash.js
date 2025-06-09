const app = getApp();

Page({
  data: {
    logoAnimation: {},
    textAnimation: {}
  },
  onLoad: function () {
    this.animateElements();
    this.checkDataAndRedirect();
  },
  animateElements: function () {
    const logoAnimation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'ease',
    });

    const textAnimation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'ease',
    });

    logoAnimation.opacity(1).scale(1.2, 1.2).step();
    textAnimation.opacity(1).step({ delay: 500 });

    this.setData({
      logoAnimation: logoAnimation.export(),
      textAnimation: textAnimation.export()
    });
  },
  checkDataAndRedirect: function () {
    wx.cloud.callFunction({
      name: 'getUserPreference',
      success: res => {
        const hasData = res.result && res.result.hasData;
        const targetUrl = hasData ? '/pages/index/index' : '/pages/onboarding/onboarding';

        const redirect = () => {
          wx.reLaunch({ url: targetUrl });
        };

        if (app.globalData.dishesLoaded) {
          setTimeout(redirect, 500);
        } else {
          const checkInterval = setInterval(() => {
            if (app.globalData.dishesLoaded) {
              clearInterval(checkInterval);
              redirect();
            }
          }, 100);
        }
      },
      fail: err => {
        console.error("⚠️ 获取用户偏好失败，默认跳转问卷页", err);
        wx.reLaunch({ url: '/pages/onboarding/onboarding' });
      }
    });
  }
});
