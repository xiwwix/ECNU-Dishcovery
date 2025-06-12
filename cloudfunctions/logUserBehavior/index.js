// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });

const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;

  const { type, dishName, tags = [], searchKeywords = [] } = event;

  if (!type || (type === 'click' && !dishName)) {
    return {
      success: false,
      message: '缺少必要字段'
    };
  }

  try {
    await db.collection('user_behavior').add({
      data: {
        _openid: openid,
        type,                  // 行为类型：search | view | click
        dishName: dishName || '',
        tags,
        searchKeywords,
        timestamp: db.serverDate()
      }
    });

    return {
      success: true,
      message: '行为记录成功'
    };
  } catch (err) {
    console.error('记录行为失败：', err);
    return {
      success: false,
      message: '行为记录失败',
      error: err
    };
  }
};
