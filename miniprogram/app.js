import eventBus from 'utils/eventBus';

App({
  globalData: {
    dishes: [],
    recommendedDishes: [], // ⭐ 新增
    dishesLoaded: false,
    userInfo: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gf7sz6fbf1f4d83',
        traceUser: true,
      });

      this.eventBus = eventBus;

      // ⭐ 数据加载完成后拉取推荐
      this.fetchDishesData(() => {
        this.checkUserPreference();
        this.fetchSmartRecommendation(); // ⭐
      });
    }
  },

  fetchDishesData(callback) {
    const db = wx.cloud.database();
    db.collection('dishes').get().then(res => {
      const dishes = res.data;
      const fileIDs = dishes.map(d => d.image).filter(Boolean);

      if (fileIDs.length > 0) {
        wx.cloud.getTempFileURL({
          fileList: fileIDs,
          success: res => {
            const tempMap = {};
            res.fileList.forEach(f => { tempMap[f.fileID] = f.tempFileURL });

            const dishesWithImg = dishes.map(dish => {
              if (tempMap[dish.image]) {
                dish.image = tempMap[dish.image];
              }
              return dish;
            });

            const dishesWithRating = dishesWithImg.map(d => {
              const avg = d.ratingCount > 0 ? (d.ratingSum / d.ratingCount).toFixed(2) : '0.0';
              const numericAvg = parseFloat(avg);
              const stars = Array(Math.min(Math.round(numericAvg), 5)).fill('active').concat(Array(5 - Math.min(Math.round(numericAvg), 5)).fill('inactive'));
              return { ...d, averageRating: avg, stars };
            });

            this.globalData.dishes = dishesWithRating;
            this.globalData.dishesLoaded = true;
            typeof callback === 'function' && callback();
          }
        });
      } else {
        this.globalData.dishes = dishes;
        this.globalData.dishesLoaded = true;
        typeof callback === 'function' && callback();
      }
    }).catch(err => {
      console.error('获取菜品数据失败：', err);
      this.globalData.dishesLoaded = false;
    });
  },

  checkUserPreference() {
    wx.cloud.callFunction({
      name: 'getUserPreference',
      success: res => {
        console.log('✅ 云函数返回:', res);
        const user = res.result;
  
        if (!user || !user.hasData) {
          console.warn('⚠️ 没有获取到用户偏好，跳转填写');
          wx.reLaunch({ url: '/pages/onboarding/onboarding' });
        } else {
          console.log('🎯 用户偏好已存在，加载成功');
          this.globalData.userInfo = user;
        }
      },
      fail: err => {
        console.error('❌ 获取用户偏好失败:', err);
        wx.reLaunch({ url: '/pages/onboarding/onboarding' });
      }
    });
  },

  fetchSmartRecommendation() {
    wx.cloud.callFunction({
      name: 'collaborativeRecommend',
      success: res => {
        if (res.result && res.result.success && res.result.recommended.length > 0) {
          this.globalData.recommendedDishes = res.result.recommended;
          this.eventBus.emit('smartSorted');
        } else {
          console.log('无用户行为数据，使用问卷偏好推荐');
          this.sortByUserPreference();
        }
      },
      fail: err => {
        console.error('推荐请求失败，回退到问卷偏好排序：', err);
        this.sortByUserPreference();
      }
    });
  },

  sortByUserPreference() {
    const user = this.globalData.userInfo;
    const allDishes = this.globalData.dishes;
  
    if (!user || !user.preferences) {
      console.warn('未找到用户偏好，使用默认顺序');
      this.globalData.recommendedDishes = allDishes;
      this.eventBus.emit('smartSorted');
      return;
    }
  
    const userTags = user.preferences.tags || [];
    console.log('🔍 用户偏好标签:', userTags);
  
    const sorted = allDishes.slice().sort((a, b) => {
      const aTags = a.tags || [];
      const bTags = b.tags || [];
      const aScore = aTags.filter(tag => userTags.includes(tag)).length;
      const bScore = bTags.filter(tag => userTags.includes(tag)).length;
  
      console.log(`🍽️ 比较菜品 "${a.name}" (得分 ${aScore}) 与 "${b.name}" (得分 ${bScore})`);
  
      return bScore - aScore;
    });
  
    console.log('✅ 排序后推荐菜品列表:', sorted.map(d => ({
      name: d.name,
      tags: d.tags,
      score: (d.tags || []).filter(tag => userTags.includes(tag)).length
    })));
  
    this.globalData.recommendedDishes = sorted;
    this.eventBus.emit('smartSorted');
  },

  updateDishScore(dishId, newRatingSum, newRatingCount) {
    const dishes = this.globalData.dishes;
    const index = dishes.findIndex(d => d._id === dishId);
    if (index !== -1 && newRatingCount !== undefined && newRatingSum !== undefined) {
      const avg = (newRatingSum / newRatingCount).toFixed(1);
      dishes[index].ratingSum = newRatingSum;
      dishes[index].ratingCount = newRatingCount;
      dishes[index].averageRating = avg;
      dishes[index].stars = this.generateStarsArray(parseFloat(avg));
      this.globalData.dishes[index] = dishes[index];

      this.eventBus.emit('dishUpdated', { dishId, newAverageScore: avg, newRatingCount });
    }
  },

  generateStarsArray(score) {
    return Array.from({ length: 5 }, (_, i) => i < Math.floor(score) ? 'active' : 'inactive');
  }
});
