// 云函数 saveUserPreference/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { importance, tasteScore } = event;

  if (!importance || !tasteScore) {
    return {
      success: false,
      message: '缺少必要字段'
    };
  }

  try {
    await db.collection('users').doc(openid).set({
      data: {
        importance,
        tasteScore,
        preferenceSet: true,
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '用户偏好已保存'
    };
  } catch (err) {
    console.error('保存失败：', err);
    return {
      success: false,
      message: '数据库保存失败',
      error: err
    };
  }
};
