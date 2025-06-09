// 云函数 collaborativeRecommend
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;

  try {
    const userPrefRes = await db.collection('users').doc(openid).get();
    const userPref = userPrefRes.data || {};

    const actionsRes = await db.collection('userActions')
      .where({ openid })
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    const actions = actionsRes.data;

    const allDishes = (await db.collection('dishes').get()).data;

    // 1. 行为评分数据收集
    const ratedDishes = {};
    actions.forEach(act => {
      if (act.action === 'rate' && act.score >= 4) {
        ratedDishes[act.dishId] = act.score;
      }
      if (act.action === 'click') {
        ratedDishes[act.dishId] = 3.5;
      }
    });

    const highScoreDishes = allDishes.filter(d => ratedDishes[d._id]);

    // 2. 相似度函数（行为相似度）
    function computeSimilarityScore(dish, refDishes) {
      let score = 0;
      refDishes.forEach(ref => {
        if (!ref.tags || !dish.tags) return;
        const commonTags = ref.tags.filter(tag => dish.tags.indexOf(tag) !== -1);
        score += commonTags.length;
      });
      return score;
    }

    // 3. 基于行为得分
    const behaviorScores = allDishes.map(dish => {
      return {
        dish,
        score: computeSimilarityScore(dish, highScoreDishes)
      };
    });

    // 4. 问卷偏好评分
    const tasteScoreMap = userPref.tasteScore || {};
    const importance = userPref.importance || {};

    function matchTasteScore(dish) {
      if (!dish.tags) return 0;
      let sum = 0;
      Object.keys(tasteScoreMap).forEach(taste => {
        if (dish.tags.indexOf(taste) !== -1) {
          sum += tasteScoreMap[taste];
        }
      });
      return sum;
    }

    // 5. 归一化函数
    function normalize(value, min, max) {
      return (value - min) / (max - min + 0.01);
    }

    const priceRange = allDishes.map(d => d.price).filter(p => typeof p === 'number');
    const priceMin = Math.min(...priceRange);
    const priceMax = Math.max(...priceRange);

    // 6. 综合打分（支持无行为时 fallback）
    const weightedScores = behaviorScores.map(({ dish, score: behaviorScore }) => {
      const tasteBonus = matchTasteScore(dish) * (importance.taste || 1);
      const familiarityBonus = behaviorScore * (importance.familiarity || 1);

      const priceBonus = typeof dish.price === 'number'
        ? (1 - normalize(dish.price, priceMin, priceMax)) * (importance.price || 0)
        : 0;

      const distanceBonus = typeof dish.distance === 'number'
        ? (1 - normalize(dish.distance, 0, 1000)) * (importance.distance || 0)
        : 0;

      const envBonus = typeof dish.environmentScore === 'number'
        ? dish.environmentScore * (importance.environment || 0)
        : 0;

      const waitBonus = typeof dish.waitTime === 'number'
        ? (1 - normalize(dish.waitTime, 0, 60)) * (importance.waitTime || 0)
        : 0;

      // ✅ 修正逻辑：即使 behaviorScore 为 0，也保留问卷维度打分
      const finalScore = familiarityBonus + tasteBonus + priceBonus + distanceBonus + envBonus + waitBonus;

      return {
        ...dish,
        _sortScore: finalScore
      };
    });

    // 7. 排序 & 输出
    const sorted = weightedScores.sort((a, b) => b._sortScore - a._sortScore);
    const recommended = sorted.length > 0 ? sorted.slice(0, 20) : allDishes.slice(0, 20);

    return {
      success: true,
      recommended
    };

  } catch (err) {
    console.error('推荐失败：', err);
    return {
      success: false,
      recommended: [],
      error: err.message || err
    };
  }
};
