const i18n = require('../../utils/i18n');
const setTabText = require('../../utils/setTabText');

Page({
  data: {
    searchValue: '',
    posts: []
  },

  onLoad() {
    this.setData({
      posts: [
        {
          nickname: "花狮干饭猫",
          avatar: "/assets/avatar_admin.png",
          content: "今天天气晴，适合来一碗热腾腾的牛肉面！你们都吃了啥？",
          images: ["/assets/post_img_1.jpg"]
        }
        // 更多帖子可加入此处
      ]
    });
  },
  onShow() {
    const language = wx.getStorageSync('language') || 'zh';
    const lang = i18n[language];
    this.setData({ lang });
    setTabText(language);
  },
  onSearchChange(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  onSearch() {
    // 你可以在这里实现搜索逻辑
    console.log("搜索：", this.data.searchValue);
  },

  clearSearch() {
    this.setData({
      searchValue: ''
    });
  }
});
