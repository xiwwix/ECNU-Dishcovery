// 云函数 index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const db = cloud.database();
  const { dishId, score } = event;

  try {
    const numericScore = Number(score);
    const dishRef = db.collection('dishes').doc(dishId);
    const dishResult = await dishRef.get();
    const dishData = dishResult.data;

    const ratingSum = Number(dishData.ratingSum) || 0;
    const ratingCount = Number(dishData.ratingCount) || 0;

    const newRatingSum = ratingSum + numericScore;
    const newRatingCount = ratingCount + 1;

    // 更新菜品的评分信息，移除了 averageRating 的更新
    await dishRef.update({
      data: {
        ratingSum: newRatingSum,
        ratingCount: newRatingCount
      }
    });

    // 返回成功结果，仅包括新的总评分和评分次数
    return {
      success: true,
      newRatingSum: newRatingSum,
      newRatingCount: newRatingCount,
    };
  } catch (error) {
    console.error('submitRating error:', error);
    return { success: false, errorMessage: error.message };
  }
};
