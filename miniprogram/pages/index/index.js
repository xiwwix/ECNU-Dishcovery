import eventBus from '../../utils/eventBus';
const app = getApp();

Page({
  data: {
    originalDishes: [],
    dishes: [],
    searchValue: '',
    dishesLoaded: false,
    isSmartSorted: false,
    smartSortedDishes: [],
    sortOptions: [
      { key: 'smart', text: '智能排序' },
      { key: 'location', text: '位置优先' },
      { key: 'rating', text: '评分优先' },
      { key: 'price', text: '价格优先' }
    ],
    selectedSortOptionIndex: 0,
    filterTags: [['甜', '辣', '咸', '酸', '清淡']],
    selectedFilterTags: [],
    canteenCoordinates: {
      '河东食堂': { latitude: 31.234972, longitude: 121.414828 },
      '河西食堂': { latitude: 31.236275, longitude: 121.409815 },
      '丽娃食堂': { latitude: 31.230577, longitude: 121.411687 }
    },
    userLocation: null,
    selectedNearestCanteen: null
  },

  onLoad() {
    this.loadDishesFromGlobalData();
    eventBus.on('dishUpdated', this.dishUpdatedHandler.bind(this));
  },

  onUnload() {
    eventBus.off('dishUpdated');
  },

  dishUpdatedHandler(data) {
    const updatedDish = app.globalData.dishes.find(d => d._id === data.dishId);
    if (updatedDish) {
      this.updateDisplayDishes();
    }
  },

  onShow() {
    this.loadDishesFromGlobalData();
    wx.cloud.callFunction({
      name: 'getUserPreference',
      success: res => {
        const pref = res.result || {};
        if (pref.hasData) {
          this.onSmartSortLoad();
        }
      },
      fail: err => {
        console.warn("获取用户偏好失败：", err);
      }
    });
  },

  loadDishesFromGlobalData() {
    if (app.globalData.dishesLoaded) {
      const dishesWithTriedFlag = app.globalData.dishes.map(dish => {
        const tried = wx.getStorageSync(`tried_${dish._id}`);
        return { ...dish, tried };
      });

      this.setData({
        originalDishes: dishesWithTriedFlag,
        dishesLoaded: true
      }, this.updateDisplayDishes);
    } else {
      console.error("全局菜品数据未加载");
    }
  },

  onSearchChange(e) {
    this.setData({ searchValue: e.detail.value.trim() }, this.updateDisplayDishes);
  },

  clearSearch() {
    this.setData({ searchValue: '' }, this.updateDisplayDishes);
  },

  searchDishes() {
    this.updateDisplayDishes();
  },

  onSortPickerChange(e) {
    const newIndex = parseInt(e.detail.value);
    this.setData({ selectedSortOptionIndex: newIndex }, () => {
      const sortKey = this.data.sortOptions[newIndex].key;
      if (sortKey === 'location') {
        this.getUserLocationAndSort();
      } else {
        this.updateDisplayDishes();
      }
    });
  },

  onFilterChange(e) {
    const tags = e.detail.value.map(i => this.data.filterTags[0][i]);
    this.setData({ selectedFilterTags: tags }, this.updateDisplayDishes);
  },

  updateDisplayDishes() {
    const {
      searchValue,
      originalDishes,
      selectedSortOptionIndex,
      sortOptions,
      selectedFilterTags,
      isSmartSorted,
      smartSortedDishes,
      selectedNearestCanteen
    } = this.data;

    const sortKey = sortOptions[selectedSortOptionIndex].key;
    let filtered = originalDishes;

    if (sortKey === 'location' && selectedNearestCanteen) {
      filtered = filtered.filter(d => d.location === selectedNearestCanteen);
    }

    if (searchValue) {
      filtered = filtered.filter(dish => dish.name.includes(searchValue));
    }

    if (selectedFilterTags.length > 0 && sortKey !== 'location') {
      filtered = filtered.filter(dish =>
        dish.tags && selectedFilterTags.some(tag => dish.tags.includes(tag))
      );
    }

    if (sortKey === 'rating') {
      filtered = filtered
        .map(d => ({ ...d, _ratingScore: parseFloat(d.averageRating) || 0 }))
        .sort((a, b) => b._ratingScore - a._ratingScore);
    } else if (sortKey === 'price') {
      filtered = filtered
        .filter(d => typeof d.price === 'number')
        .sort((a, b) => a.price - b.price);
    } else if (sortKey === 'smart' && isSmartSorted) {
      filtered.sort((a, b) => (b._sortScore || 0) - (a._sortScore || 0));
    }

    this.setData({ dishes: filtered });
  },

  getUserLocationAndSort() {
    const that = this;
    wx.getSetting({
      success(settingRes) {
        const auth = settingRes.authSetting;
        if (auth['scope.userLocation'] === false) {
          wx.showModal({
            title: '位置权限未开启',
            content: '请前往设置页面开启位置权限，以使用位置优先推荐功能',
            confirmText: '去设置',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.getLocation({
            type: 'gcj02',
            success(res) {
              const userLoc = { latitude: res.latitude, longitude: res.longitude };
              that.setData({ userLocation: userLoc });

              const canteenCoords = that.data.canteenCoordinates;
              let nearest = null;
              let minDist = Infinity;

              Object.keys(canteenCoords).forEach(c => {
                const dist = that.getDistance(
                  userLoc.latitude,
                  userLoc.longitude,
                  canteenCoords[c].latitude,
                  canteenCoords[c].longitude
                );
                if (dist < minDist) {
                  minDist = dist;
                  nearest = c;
                }
              });

              that.setData({ selectedNearestCanteen: nearest }, () => {
                wx.showToast({ title: `已推荐${nearest}`, icon: 'success' });
                that.updateDisplayDishes();
              });
            },
            fail(err) {
              console.warn('获取位置失败：', err);
              wx.showToast({ title: '无法获取位置', icon: 'none' });
            }
          });
        }
      }
    });
  },

  getDistance(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  onSmartSortLoad() {
    wx.showLoading({ title: '加载推荐中...' });
    wx.cloud.callFunction({
      name: 'collaborativeRecommend',
      success: res => {
        if (res.result && res.result.success && res.result.recommended.length > 0) {
          this.setData({
            smartSortedDishes: res.result.recommended,
            isSmartSorted: true
          }, this.updateDisplayDishes);
        } else {
          console.log('⚠️ 智能推荐为空，使用默认排序');
          this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
        }
      },
      fail: err => {
        console.error('智能推荐云函数失败：', err);
        this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onMarkTried(e) {
    const dishId = e.currentTarget.dataset.id;
    const triedKey = `tried_${dishId}`;

    if (wx.getStorageSync(triedKey)) {
      wx.showToast({ title: '你已经标记吃过啦', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'updateTriedCount',
      data: { dishId },
      success: res => {
        wx.setStorageSync(triedKey, true);
        wx.showToast({ title: '已标记为吃过', icon: 'success' });

        const dishes = this.data.dishes.map(d => {
          if (d._id === dishId) {
            return {
              ...d,
              tried: true,
              triedCount: (d.triedCount || 0) + 1
            };
          }
          return d;
        });
        this.setData({ dishes });
      },
      fail: err => {
        console.error('更新吃过人数失败：', err);
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    });
  },

  onDishClick(e) {
    const dishId = e.currentTarget.dataset.id;
    wx.cloud.callFunction({
      name: 'recordAction',
      data: {
        dishId,
        actionType: 'click'
      }
    });
    wx.navigateTo({ url: `/pages/detail/detail?id=${dishId}` });
  },

  goToModelRecommend() {
    wx.navigateTo({ url: '/pages/recommend/recommend' });
  },

  handleImageError(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.dishes;
    list[index].image = '/images/default.png';
    this.setData({ dishes: list });
  }
});
