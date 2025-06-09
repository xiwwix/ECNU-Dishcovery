// 云函数 getUserPreference/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;

  try {
    const userDoc = await db.collection('users').doc(openid).get();

    const { importance, tasteScore, preferenceSet } = userDoc.data;

    return {
      hasData: !!preferenceSet,
      importance: importance || {},
      tasteScore: tasteScore || {},
      _id: openid
    };
  } catch (err) {
    if (err.errCode === 11) {
      // 文档不存在（通常是首次访问）
      return {
        hasData: false,
        importance: {},
        tasteScore: {},
        _id: openid
      };
    } else {
      return {
        hasData: false,
        error: err
      };
    }
  }
};
