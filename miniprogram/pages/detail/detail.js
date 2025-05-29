const app = getApp();
import eventBus from '../../utils/eventBus';

Page({
  data: {
    dish: {}, // 等待加载的菜品对象
    showRating: false, // 是否显示评分界面
    score: 4, // 新增评分的默认值
    ratingCount: 0, // 菜品初始评分次数
  },

  onLoad: function(options) {
    const dishId = options.id;
    if (dishId) {
      this.loadDishDetailFromGlobalData(dishId); // 加载全局数据中的菜品详情
    } else {
      console.error("菜品ID未传递或传递错误"); // 菜品ID错误时的错误提示
    }

    // 绑定`dishUpdated`事件的监听器，使用箭头函数以确保`this`指向当前页面实例
    eventBus.on('dishUpdated', (data) => {
      if (data.dishId === this.data.dish._id) {
        const updatedDish = app.globalData.dishes.find(dish => dish._id === data.dishId);
        if (updatedDish) {
          this.setData({
            'dish.averageRating': updatedDish.averageRating, // 更新平均评分
            'dish.ratingCount': updatedDish.ratingCount, // 更新评分次数
          });
        }
      }
    });
  },


  onUnload: function() {
    eventBus.off('dishUpdated', this.loadDishDetailFromGlobalData); // 页面卸载时注销监听器，避免内存泄露
  },

  loadDishDetailFromGlobalData: function(dishId) {
    const dishDetail = app.globalData.dishes.find(dish => dish._id === dishId);
    if (dishDetail) {
      this.setData({
        dish: dishDetail,
        ratingCount: dishDetail.ratingCount || 0, // 加载并设置评分次数
      });
    } else {
      console.error('在全局数据中未找到对应的菜品详情'); // 未找到菜品详情时的错误提示
    }
  },

  handleImageError: function(e) {
    console.error('图片加载失败', e); // 图片加载失败时的错误日志
    this.setData({
      'dish.image': '../../images/default.png' // 图片加载失败时使用默认图片
    });
  },

  showRatingModal: function() {
    this.setData({
      showRating: true, // 显示评分界面
    });
  },

  rate: function(e) {
    this.setData({
      score: e.currentTarget.dataset.score // 设置当前评分
    });
  },

  confirmAndClose: function() {
    wx.showLoading({
      title: '正在提交喵...',
      mask: true, // 显示透明蒙层，防止触摸穿透
    });
    this.submitRating(); 
  },

  previewImage: function() {
    const imageUrl = this.data.dish.image; // 获取当前菜品的图片 URL
    wx.previewImage({
      urls: [imageUrl], // 需要预览的图片链接列表
      current: imageUrl // 当前显示图片的链接，默认为 urls 的第一张
    });
  },

  submitRating: function() {
    const that = this;
    const { score, dish } = this.data;
    if (score >= 0) {
        wx.cloud.callFunction({
            name: 'submitRating',
            data: {
                dishId: dish._id,
                score: score + 1
            },
            success: function(res) {
                if (res.result.success) {
                    const newRatingSum = res.result.newRatingSum;
                    const newRatingCount = res.result.newRatingCount;
                    const newAverageRating = (newRatingSum / newRatingCount).toFixed(3);
                    const activeStarCount = Math.round(newAverageRating);
                    const activeStars = Array(activeStarCount).fill('active');
                    const inactiveStars = Array(7 - activeStarCount).fill('inactive');

                    // 更新全局菜品评分
                    app.updateDishScore(dish._id, newRatingSum, newRatingCount, newAverageRating);

                    // 设置数据以更新页面
                    that.setData({
                        'dish.averageRating': newAverageRating,
                        'dish.ratingCount': newRatingCount,
                        'dish.stars': [...activeStars, ...inactiveStars],
                        showRating: false, // 隐藏评分界面
                        score: 4 // 重置评分为默认值
                    });

                    wx.showToast({
                        title: '评分成功',
                    });
                    eventBus.emit('dishUpdated', { dishId: dish._id, newAverageRating, newRatingCount });
                } else {
                    wx.showToast({
                        title: '评分失败，请稍后重试',
                        icon: 'none'
                    });
                }
            },
            fail: function(err) {
                console.error('调用云函数失败：', err);
            }
        });
    } else {
        wx.showToast({
            title: '请选择评分',
            icon: 'none'
        });
    }
  },
        // 关闭评分模态框
        closeRatingModal: function() {
          this.setData({
            showRating: false
          });
        },
        complete: function() {
          setTimeout(() => {
            wx.hideLoading(); // 隐藏加载提示框
          }, 500); // 延时跳转，确保动画可以展示一段时间
        },
    
          // 阻止事件冒泡的空函数
      stopPropagation: function() {
        // 仅用于阻止事件冒泡
      }
  });
  
