import eventBus from 'utils/eventBus';

App({
  globalData: {
    dishes: [],
    dishesLoaded: false, // 初始化菜品数据加载完成的标志为false
  },

  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gf7sz6fbf1f4d83', // 填入您的云环境ID
        traceUser: true,
      });
      this.fetchDishesData(); // 调用fetchDishesData方法来加载全局菜品数据
      this.eventBus = eventBus;
    }
  },

  fetchDishesData: function() {
    const db = wx.cloud.database();
    db.collection('dishes').get().then(res => {
      const dishes = res.data;

      // 获取所有菜品图片的fileID
      const fileIDs = dishes.map(dish => dish.image).filter(Boolean);

      if (fileIDs.length > 0) {
        // 获取临时链接
        wx.cloud.getTempFileURL({
          fileList: fileIDs,
          success: res => {
            // 将临时链接更新到菜品数据中
            const tempFileURLs = res.fileList;
            const dishesWithImages = dishes.map(dish => {
              const tempFile = tempFileURLs.find(file => file.fileID === dish.image);
              if (tempFile && tempFile.tempFileURL) {
                dish.image = tempFile.tempFileURL; // 更新为临时链接
              }
              return dish;
            });

            // 计算平均分数和处理星星数组
            const dishesWithRatings = dishesWithImages.map(dish => {
              const ratingCount = dish.ratingCount || 0;
              const ratingSum = dish.ratingSum || 0;
              const averageRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(3) : "0.0";
              const activeStarCount = Math.round(averageRating);
              const activeStars = Array(activeStarCount).fill('active');
              const inactiveStars = Array(7 - activeStarCount).fill('inactive');
              
              return {
                ...dish,
                averageRating,
                stars: [...activeStars, ...inactiveStars],
              };
            });

            // 更新全局变量
            this.globalData.dishes = dishesWithRatings;
            this.globalData.dishesLoaded = true;
          },
          fail: err => {
            console.error("获取图片临时链接失败：", err);
          }
        });
      } else {
      }
    }).catch(err => {
      console.error("获取菜品数据失败：", err);
      this.globalData.dishesLoaded = false;
    });
  },

// 更新全局数据中对应菜品的评分信息
updateDishScore: function(dishId, newRatingSum, newRatingCount) {
  const dishes = this.globalData.dishes;
  const index = dishes.findIndex(dish => dish._id === dishId);
  if (index !== -1 && newRatingCount !== undefined && newRatingSum !== undefined) {
    let dish = dishes[index];
    // 避免除以0，确保评分次数大于0
    const newAverageScore = (newRatingSum / newRatingCount).toFixed(1); // 正确计算平均评分
    dish = this.globalData.dishes[index];
    dish.ratingSum = newRatingSum;
    dish.ratingCount = newRatingCount;
    dish.averageRating = newAverageScore;
    dish.stars = this.generateStarsArray(parseFloat(newAverageScore)); // 确保传入的是数值类型
    this.globalData.dishes[index] = dish;
    this.eventBus.emit('dishUpdated', { dishId, newAverageScore, newRatingCount });
  }
},

generateStarsArray: function(averageRating) {
  let starsArray = [];
  const fullStars = Math.floor(averageRating);
  for (let i = 1; i <= 7; i++) {
    starsArray.push(i <= fullStars ? 'active' : 'inactive');
  }
  return starsArray;
},
});