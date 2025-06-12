module.exports = function setTabText(lang) {
  const tabTextMap = {
    zh: ['干饭', '社区', '我'],
    en: ['Feed', 'Community', 'Me']
  };

  const labels = tabTextMap[lang] || tabTextMap.zh;

  wx.setTabBarItem({ index: 0, text: labels[0] });
  wx.setTabBarItem({ index: 1, text: labels[1] });
  wx.setTabBarItem({ index: 2, text: labels[2] });
};
