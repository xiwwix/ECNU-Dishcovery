import eventBus from '../../utils/eventBus';
const app = getApp();

Page({
  data: {
    originalDishes: [],
    dishes: [],
    searchValue: '',
    dishesLoaded: false,
    isSmartSorted: false,
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

  /* ---------------- 生命周期 ---------------- */

  onLoad() {
    this.loadDishesFromGlobalData();
    eventBus.on('dishUpdated', this.dishUpdatedHandler.bind(this));
  },

  onUnload() {
    eventBus.off('dishUpdated');
  },

  onShow() {
    /* 进入页面先重置智能排序标志 */
    this.setData({
      selectedSortOptionIndex: 0, // 0 == 'smart'
      isSmartSorted: false
    }, () => {
      this.loadDishesFromGlobalData(); // 保证 originalDishes 有数据
      this.onSmartSortLoad();          // 强制重新拉协同过滤
    });
  },
  

  /* ---------------- 数据加载 ---------------- */

  loadDishesFromGlobalData() {
    if (app.globalData.dishesLoaded) {
      const dishesWithTriedFlag = app.globalData.dishes.map(dish => {
        const tried = wx.getStorageSync(`tried_${dish._id}`);
        return { ...dish, tried };
      });

      this.setData(
        { originalDishes: dishesWithTriedFlag, dishesLoaded: true },
        this.updateDisplayDishes
      );
    } else {
      console.error('全局菜品数据未加载');
    }
  },

  dishUpdatedHandler() {
    this.loadDishesFromGlobalData();
  },

  /* ---------------- 搜索 & 过滤 ---------------- */

  onSearchChange(e) {
    const value = e.detail.value.trim();
    this.setData({ searchValue: value }, this.updateDisplayDishes);

    if (value) {
      wx.cloud.callFunction({
        name: 'logUserBehavior',
        data: { type: 'search', searchKeywords: [value] }
      });
    }
  },

  clearSearch() {
    this.setData({ searchValue: '' }, this.updateDisplayDishes);
  },

  onSortPickerChange(e) {
    const newIndex = Number(e.detail.value);
    this.setData({ selectedSortOptionIndex: newIndex }, () => {
      const sortKey = this.data.sortOptions[newIndex].key;
      sortKey === 'location' ? this.getUserLocationAndSort() : this.updateDisplayDishes();
    });
  },

  onFilterChange(e) {
    const tags = e.detail.value.map(i => this.data.filterTags[0][i]);
    this.setData({ selectedFilterTags: tags }, this.updateDisplayDishes);
  },

  /* ---------------- 显示刷新 ---------------- */

  updateDisplayDishes() {
    const {
      searchValue,
      originalDishes,
      selectedSortOptionIndex,
      sortOptions,
      selectedFilterTags,
      isSmartSorted,
      selectedNearestCanteen
    } = this.data;

    const sortKey = sortOptions[selectedSortOptionIndex].key;
    let filtered = originalDishes.slice(); // 拷贝数组避免副作用

    /* 1. 位置筛选 */
    if (sortKey === 'location' && selectedNearestCanteen) {
      filtered = filtered.filter(d => d.location === selectedNearestCanteen);
    }

    /* 2. 搜索关键词 */
    if (searchValue) {
      filtered = filtered.filter(d => d.name.includes(searchValue));
    }

    /* 3. 标签过滤（非位置排序场景） */
    if (selectedFilterTags.length && sortKey !== 'location') {
      filtered = filtered.filter(
        d => d.tags && selectedFilterTags.some(tag => d.tags.includes(tag))
      );
    }

    /* 4. 排序逻辑 */
    if (sortKey === 'rating') {
      filtered = filtered
        .map(d => ({ ...d, _ratingScore: Number(d.averageRating) || 0 }))
        .sort((a, b) => b._ratingScore - a._ratingScore);

    } else if (sortKey === 'price') {
      filtered = filtered.filter(d => typeof d.price === 'number')
        .sort((a, b) => a.price - b.price);

    } else if (sortKey === 'smart' && isSmartSorted) {
      // ----- 协同过滤排序 -----
      console.log('🧠 [智能排序] 参与排序的菜品与得分：');
      filtered.forEach(d => console.log(`   - ${d.name}: ${d._sortScore}`));

      filtered.sort((a, b) => (b._sortScore || 0) - (a._sortScore || 0));

      console.log('✅ [智能排序] 排序结果：',
        filtered.map(d => ({ name: d.name, score: d._sortScore }))
      );
    }

    this.setData({ dishes: filtered });
  },

  /* ---------------- 智能推荐（协同过滤） ---------------- */

  onSmartSortLoad() {
    // 若已加载过一次则不重复调用
    // if (this.data.isSmartSorted) return;

    wx.showLoading({ title: '加载推荐中...' });
    wx.cloud.callFunction({
      name: 'collaborativeRecommend',
      success: res => {
        const recList = (res.result && res.result.recommended) || [];
        if (!recList.length) {
          console.warn('⚠️ 协同过滤返回为空，降级到默认排序');
          this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
          return;
        }

        // 构建 dishId => score 映射；若无 score 字段，则用排名倒序作为分数
        const scoreMap = {};
        recList.forEach((item, idx) => {
          const id = item.dishId || item._id || item.id;
          const score = typeof item.score === 'number' ? item.score : recList.length - idx;
          scoreMap[id] = score;
        });
        console.log('📊 智能推荐得分表：', scoreMap);

        // 给 originalDishes 注入 _sortScore
        const updated = this.data.originalDishes.map(d => ({
          ...d,
          _sortScore: scoreMap[d._id] || 0
        }));

        this.setData(
          { originalDishes: updated, isSmartSorted: true },
          this.updateDisplayDishes
        );
      },
      fail: err => {
        console.error('❌ 协同过滤云函数失败：', err);
        this.setData({ isSmartSorted: true }, this.updateDisplayDishes);
      },
      complete: () => wx.hideLoading()
    });
  },

  /* ---------------- 位置相关 ---------------- */

  getUserLocationAndSort() {
    wx.getSetting({
      success: settingRes => {
        if (settingRes.authSetting['scope.userLocation'] === false) {
          wx.showModal({
            title: '位置权限未开启',
            content: '请前往设置页面开启位置权限，以使用位置优先推荐功能',
            confirmText: '去设置',
            success: modalRes => modalRes.confirm && wx.openSetting()
          });
          return;
        }

        wx.getLocation({
          type: 'gcj02',
          success: res => this._handleLocationSuccess(res),
          fail: err => {
            console.warn('获取位置失败：', err);
            wx.showToast({ title: '无法获取位置', icon: 'none' });
          }
        });
      }
    });
  },

  _handleLocationSuccess(res) {
    const userLoc = { latitude: res.latitude, longitude: res.longitude };
    this.setData({ userLocation: userLoc });

    // 计算最近食堂
    const { canteenCoordinates } = this.data;
    let nearest = null, minDist = Infinity;
    Object.keys(canteenCoordinates).forEach(c => {
      const d = this.getDistance(
        userLoc.latitude, userLoc.longitude,
        canteenCoordinates[c].latitude, canteenCoordinates[c].longitude
      );
      if (d < minDist) { minDist = d; nearest = c; }
    });

    this.setData({ selectedNearestCanteen: nearest }, () => {
      wx.showToast({ title: `已推荐${nearest}`, icon: 'success' });
      this.updateDisplayDishes();
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
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  /* ---------------- 其他交互 ---------------- */

  onDishClick(e) {
    const dishId = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find(d => d._id === dishId);

    // 记录点击行为
    dish && wx.cloud.callFunction({
      name: 'logUserBehavior',
      data: { type: 'click', dishName: dish.name, tags: dish.tags || [] }
    });

    wx.navigateTo({ url: `/pages/detail/detail?id=${dishId}` });
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
      success: () => {
        wx.setStorageSync(triedKey, true);
        wx.showToast({ title: '已标记为吃过', icon: 'success' });

        const dishes = this.data.dishes.map(d =>
          d._id === dishId
            ? { ...d, tried: true, triedCount: (d.triedCount || 0) + 1 }
            : d
        );
        this.setData({ dishes });
      },
      fail: err => {
        console.error('更新吃过人数失败：', err);
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    });
  },

  handleImageError(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.dishes;
    list[idx].image = '/images/default.png';
    this.setData({ dishes: list });
  },

  goToModelRecommend() {
    wx.navigateTo({ url: '/pages/recommend/recommend' });
  }
});
