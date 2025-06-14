const app = getApp();
const i18n = require('../../utils/i18n');

Page({
  data: {
    messages: [],
    userInput: '',
    lang: {},
    popupDish: null,
    showPopup: false
  },

  onLoad() {
    const language = wx.getStorageSync('language') || 'zh';
    const lang = i18n[language];
    this.setData({
      lang,
      messages: [
        { type: 'text', role: 'bot', content: lang.recommend_greeting }
      ]
    });
  },

  onInputChange(e) {
    this.setData({ userInput: e.detail.value });
  },

  onSend() {
    const input = this.data.userInput.trim();
    if (!input) return;

    const messages = [...this.data.messages, { type: 'text', role: 'user', content: input }];
    this.setData({ messages, userInput: '' });

    this.appendThinking();

    wx.cloud.callFunction({
      name: 'recommendDishesByLLM',
      data: {
        userQuery: input,
        dishList: app.globalData.dishes || []
      },
      success: res => {
        this.removeThinking();
        const names = res.result.recommendedDishNames || [];
        const all = app.globalData.dishes || [];
        const matched = all.filter(d => names.includes(d.name));

        if (matched.length > 0) {
          this.appendMessage('bot', this.data.lang.recommend_result_prefix);
          matched.forEach(dish => {
            this.appendDishCard(dish);
          });
        } else {
          this.appendMessage('bot', this.data.lang.recommend_no_result);
        }
      },
      fail: err => {
        console.error('云函数调用失败：', err);
        this.removeThinking();
        this.appendMessage('bot', this.data.lang.recommend_error);
      }
    });
  },

  appendMessage(role, content) {
    const messages = [...this.data.messages, { type: 'text', role, content }];
    this.setData({ messages });
  },

  appendDishCard(dish) {
    const messages = [...this.data.messages, { type: 'dish', dish }];
    this.setData({ messages });
  },

  appendThinking() {
    const thinking = this.data.lang?.recommend_thinking || '我来帮你想想...';
    const messages = [...this.data.messages, { type: 'text', role: 'bot', content: thinking }];
    this.setData({ messages });
  },

  removeThinking() {
    const msg = this.data.lang?.recommend_thinking || '我来帮你想想...';
    const messages = this.data.messages;
    if (messages.length && messages[messages.length - 1].content === msg) {
      messages.pop();
      this.setData({ messages });
    }
  },

  onDishClick(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({
      popupDish: dish,
      showPopup: true
    });
  },

  closePopup() {
    this.setData({
      showPopup: false,
      popupDish: null
    });
  },

  toRatingPage() {
    const id = this.data.popupDish._id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});
