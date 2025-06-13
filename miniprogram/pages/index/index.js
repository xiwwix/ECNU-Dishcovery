import eventBus from '../../utils/eventBus';
const app = getApp();
const i18n = require('../../utils/i18n');
const setTabText = require('../../utils/setTabText');

Page({
  data: {
    lang: {},
    originalDishes: [],
    dishes: [],
    searchValue: '',
    dishesLoaded: false,
    isSmartSorted: false,
    smartSortedDishes: [],
    selectedSortOptionIndex: 0,
    canteenCoordinates: {
      '河东食堂': { latitude: 31.234972, longitude: 121.414828 },
      '河西食堂': { latitude: 31.236275, longitude: 121.409815 },
      '丽娃食堂': { latitude: 31.230577, longitude: 121.411687 }
    },
    userLocation: null,
    selectedNearestCanteen: null,

    // 新增弹窗与筛选
    showFilterPopup: false,
    filterCategories: [],
    selectedFilterConditions: {},
    selectedFilterText: ''
  },

  onLoad() {
    this.loadDishesFromGlobalData();
    eventBus.on('dishUpdated', this.dishUpdatedHandler.bind(this));
  },

  dishUpdatedHandler(data) {
    const updatedDish = app.globalData.dishes.find(d => d._id === data.dishId);
    if (updatedDish) {
      this.updateDisplayDishes();
    }
  },  

  goToModelRecommend() {
    wx.navigateTo({ url: '/pages/recommend/recommend' });
  },
  

  onUnload() {
    eventBus.off('dishUpdated');
  },

  onShow() {
    const language = wx.getStorageSync('language') || 'zh';
    const lang = i18n[language];

    const sortOptions = [
      { key: 'smart', text: lang.sort_smart },
      { key: 'location', text: lang.sort_location },
      { key: 'rating', text: lang.sort_rating },
      { key: 'price', text: lang.sort_price }
    ];

    this.setData({
      lang,
      sortOptions,
      filterCategories: [
        {
          key: 'taste',
          label: lang.filter_category_taste,
          options: [lang.filter_all, ...lang.filter_tags].map(v => ({ value: v, checked: false }))
        },
        {
          key: 'location',
          label: lang.filter_category_location,
          options: [
            lang.filter_all,
            lang.canteen_hedong,
            lang.canteen_hexi,
            lang.canteen_liwa
          ].map(v => ({ value: v, checked: false }))
        },
        {
          key: 'category',
          label: lang.filter_category_category,
          options: [
            lang.filter_all,
            lang.category_main,
            lang.category_dessert,
            lang.category_drink
          ].map(v => ({ value: v, checked: false }))
        }
      ]
      
    });

    setTabText(language);
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

  loadDishesFromGlobalData(retryCount = 5) {
    if (app.globalData.dishesLoaded) {
      const dishesWithTriedFlag = app.globalData.dishes.map(dish => {
        const tried = wx.getStorageSync(`tried_${dish._id}`);
        return { ...dish, tried };
      });

      this.setData({
        originalDishes: dishesWithTriedFlag,
        dishesLoaded: true
      }, this.updateDisplayDishes);
    } else if (retryCount > 0) {
      setTimeout(() => {
        this.loadDishesFromGlobalData(retryCount - 1);
      }, 500);
    } else {
      console.error("全局菜品数据仍未加载");
    }
  },

  onSearchChange(e) {
    this.setData({ searchValue: e.detail.value.trim() }, this.updateDisplayDishes);
  },

  clearSearch() {
    this.setData({ searchValue: '' }, this.updateDisplayDishes);
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

  openFilterPopup() {
    this.setData({ showFilterPopup: true });
  },

  closeFilterPopup() {
    this.setData({ showFilterPopup: false });
  },

  onCheckboxChange(e) {
    const categoryKey = e.currentTarget.dataset.category;
    const selectedValues = e.detail.value;

    const updated = this.data.filterCategories.map(cat => {
      if (cat.key === categoryKey) {
        const isAllSelected = selectedValues.includes('全部');
        return {
          ...cat,
          options: cat.options.map(opt => ({
            ...opt,
            checked: isAllSelected ? opt.value === '全部' : selectedValues.includes(opt.value)
          }))
        };
      }
      return cat;
    });

    this.setData({ filterCategories: updated });
  },

  confirmFilter() {
    const selected = {};
    const textSummary = [];

    this.data.filterCategories.forEach(cat => {
      const selectedOptions = cat.options
        .filter(opt => opt.checked && opt.value !== '全部')
        .map(opt => opt.value);
      if (selectedOptions.length > 0) {
        selected[cat.key] = selectedOptions;
        textSummary.push(`${cat.label}：${selectedOptions.join('、')}`);
      }
    });

    this.setData({
      showFilterPopup: false,
      selectedFilterConditions: selected,
      selectedFilterText: textSummary.join(' ｜ ')
    }, this.updateDisplayDishes);
  },

  updateDisplayDishes() {
    const {
      searchValue,
      originalDishes,
      selectedSortOptionIndex,
      sortOptions,
      isSmartSorted,
      smartSortedDishes,
      selectedNearestCanteen,
      selectedFilterConditions
    } = this.data;

    const sortKey = sortOptions[selectedSortOptionIndex].key;
    let filtered = originalDishes;

    if (sortKey === 'location' && selectedNearestCanteen) {
      filtered = filtered.filter(d => d.location === selectedNearestCanteen);
    }

    if (searchValue) {
      filtered = filtered.filter(dish => dish.name.includes(searchValue));
    }

    if (selectedFilterConditions) {
      if (selectedFilterConditions.taste) {
        filtered = filtered.filter(d =>
          selectedFilterConditions.taste.some(tag => d.tags?.includes(tag))
        );
      }
      if (selectedFilterConditions.location) {
        filtered = filtered.filter(d =>
          selectedFilterConditions.location.includes(d.location)
        );
      }
      if (selectedFilterConditions.category) {
        filtered = filtered.filter(d =>
          selectedFilterConditions.category.includes(d.category)
        );
      }
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
          const lang = that.data.lang;
          wx.showModal({
            title: lang.location_permission_title,
            content: lang.location_permission_content,
            confirmText: lang.location_permission_confirm,
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
                wx.showToast({
                  title: `${that.data.lang.index_recommend_to}${nearest}`,
                  icon: 'success'
                });
                that.updateDisplayDishes();
              });
            },
            fail(err) {
              console.warn('获取位置失败：', err);
              wx.showToast({
                title: that.data.lang.toast_location_failed,
                icon: 'none'
              });
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
    wx.showLoading({
      title: this.data.lang.loading_recommend
    });
    wx.cloud.callFunction({
      name: 'collaborativeRecommend',
      success: res => {
        if (res.result && res.result.success && res.result.recommended.length > 0) {
          this.setData({
            smartSortedDishes: res.result.recommended,
            isSmartSorted: true
          }, this.updateDisplayDishes);
        } else {
          this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
        }
      },
      fail: err => {
        console.error('智能推荐失败：', err);
        this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onDishClick(e) {
    const dishId = e.currentTarget.dataset.id;
    wx.cloud.callFunction({
      name: 'recordAction',
      data: { dishId, actionType: 'click' }
    });
    wx.navigateTo({ url: `/pages/detail/detail?id=${dishId}` });
  },

  handleImageError(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.dishes;
    list[index].image = '/images/default.png';
    this.setData({ dishes: list });
  }
});
