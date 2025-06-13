const i18n = require('../../utils/i18n');
const setTabText = require('../../utils/setTabText');


Page({
  data: {
    avatarUrl: '/images/default.png',
    nickName: '',
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    lang: {}  // 存放当前语言文案
  },

  onShow() {
    const language = wx.getStorageSync('language') || 'zh';
    const lang = i18n[language];
    setTabText(language);
    const nickName = this.data.hasUserInfo
      ? this.data.nickName
      : lang.nickname_default;
  
    this.setData({
      lang,
      nickName
    });
    
  },
  

  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户信息',
      success: res => {
        this.setData({
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          hasUserInfo: true
        });
      },
      fail: () => {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    });
  },

  goToQuestionnaire() {
    wx.navigateTo({
      url: '/pages/onboarding/onboarding?source=profile'
    });
  },

  goToReport() {
    wx.navigateTo({
      url: '/pages/report/report'
    });
  },

  goToLanguage() {
    wx.navigateTo({
      url: '/pages/language/language'
    });
  }
});
