import eventBus from '../../utils/eventBus';

const app = getApp();
Page({
  data: {
    originalDishes: [], // 增加一个用于存储原始数据的数组
    dishes: [], // 用于展示的数据
    searchValue: '', // 用于存储搜索框输入的值
    dishesLoaded: false, // 菜品数据是否加载完成的标志
    selectedSortOption: 'name', // 默认改为随机
    selectedSortOrderOption: 'asc', // 选中的排序顺序，默认为升序
    sortOptions: [ // 排序选项列表
      { key: 'random', text: '随机' },
      { key: 'name', text: '菜品名' },
      { key: 'averageRating', text: '菜品评分' },
      { key: 'ratingCount', text: '评分人数' }
    ]
  },

  onLoad: function() {
    this.loadDishesFromGlobalData();
    eventBus.on('dishUpdated', this.dishUpdatedHandler.bind(this));
  },

  onShow: function() {
    this.loadDishesFromGlobalData();
    this.updateDisplayDishes(); // 加载完成后更新显示的菜品列表
  },

  loadDishesFromGlobalData: function() {
    if (app.globalData.dishesLoaded) {
      this.setData({
        originalDishes: app.globalData.dishes,
        dishes: app.globalData.dishes,
        dishesLoaded: true
      }, this.updateDisplayDishes); // 使用回调确保数据被设置后再进行更新显示
    } else {
      console.error("全局菜品数据未加载");
    }
  },

  dishUpdatedHandler: function() {
    this.loadDishesFromGlobalData();
  },

  onSearchChange: function(event) {
    this.setData({
      searchValue: event.detail.value.trim()
    }, this.updateDisplayDishes); // 更新显示的菜品列表
  },

  clearSearch: function() {
    this.setData({
      searchValue: ''
    }, this.updateDisplayDishes); // 更新显示的菜品列表
  },

  handleSortOptionChange: function(event) {
    const option = event.currentTarget.dataset.option;
    this.setData({
      selectedSortOption: option,
      selectedSortOrderOption: option === 'random' ? '' : 'asc', // 随机排序不需要排序顺序
      randomSorted: option === 'random' // 只有在选择随机时设置为true
    }, this.updateDisplayDishes);
  },

  toggleSortOrder: function() {
    this.setData({
      selectedSortOrderOption: this.data.selectedSortOrderOption === 'asc' ? 'desc' : 'asc'
    }, this.updateDisplayDishes); // 更新显示的菜品列表
  },

  // 更新显示的菜品列表
  updateDisplayDishes: function() {
    let filteredDishes = this.data.originalDishes;

    // 执行搜索
    if (this.data.searchValue) {
      filteredDishes = filteredDishes.filter(dish => dish.name.includes(this.data.searchValue));
    }

    // 执行排序
    switch (this.data.selectedSortOption) {
      case 'name':
        filteredDishes.sort((a, b) => {
          return this.data.selectedSortOrderOption === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        });
        break;
      case 'averageRating':
        filteredDishes.sort((a, b) => {
          return this.data.selectedSortOrderOption === 'asc' ? a.averageRating - b.averageRating : b.averageRating - a.averageRating;
        });
        break;
      case 'ratingCount':
        filteredDishes.sort((a, b) => {
          return this.data.selectedSortOrderOption === 'asc' ? a.ratingCount - b.ratingCount : b.ratingCount - a.ratingCount;
        });
        break;
      case 'random':
        filteredDishes = filteredDishes.sort(() => 0.5 - Math.random());
        break;
    }

    this.setData({
      dishes: filteredDishes
    });
  },
});
