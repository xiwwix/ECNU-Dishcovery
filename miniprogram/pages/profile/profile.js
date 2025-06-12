Page({
  data: {
    avatarUrl: '/images/default-avatar.png', // 默认头像
    nickName: '未登录用户', // 默认昵称
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile')
  },

  onLoad() {
    // 可拓展：从缓存或数据库中读取头像昵称
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
      url: '/pages/report/report' // 请确保你有 report 页面
    });
  }
});
