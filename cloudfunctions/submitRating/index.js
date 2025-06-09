const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

exports.main = async (event, context) => {
  const { dishId, score } = event;
  const openid = cloud.getWXContext().OPENID;

  if (!dishId || typeof score !== 'number' || score < 0 || score > 5) {
    return { success: false, message: '参数错误' };
  }

  try {
    const dishRef = db.collection('dishes').doc(dishId);
    const dishRes = await dishRef.get();

    if (!dishRes.data) {
      return {
        success: false,
        message: '找不到菜品',
        dishId
      };
    }

    const oldData = dishRes.data;
    const newRatingSum = (oldData.ratingSum || 0) + score;
    const newRatingCount = (oldData.ratingCount || 0) + 1;

    // 更新菜品评分信息
    await dishRef.update({
      data: {
        ratingSum: newRatingSum,
        ratingCount: newRatingCount
      }
    });

    // 同步记录评分行为
    await db.collection('userActions').add({
      data: {
        openid,
        dishId,
        action: 'rate',
        score,
        timestamp: Date.now()
      }
    });

    return {
      success: true,
      newRatingSum,
      newRatingCount
    };
  } catch (err) {
    console.error('🔥 submitRating 错误：', err);
    return {
      success: false,
      message: '数据库错误',
      error: err.message || err
    };
  }
};
