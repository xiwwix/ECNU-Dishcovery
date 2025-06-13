const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

/** 因子定义：包含别名与标签 */
const FACTORS = [
  { keys: ['口味', 'taste'], label: '味蕾鉴赏家' },
  { keys: ['距离', 'distance'], label: '方向感达人' },
  { keys: ['价格', 'price'], label: '精打细算派' },
  { keys: ['环境', 'environment'], label: '氛围感大师' },
  { keys: ['等待时间', 'waitTime'], label: '效率主义者' },
  { keys: ['熟悉程度', 'familiarity'], label: '安全感收藏家' }
];

exports.main = async () => {
  const { OPENID: openid } = cloud.getWXContext();

  try {
    /** 获取问卷数据 */
    const userDoc = await db.collection('users').doc(openid).get();
    const { importance = {}, tasteScore = {}, updateTime } = userDoc.data || {};

    /** 获取行为数据 */
    const totalRes = await db.collection('user_behavior')
      .where({ _openid: openid }).count();
    const total = totalRes.total;
    let behaviors = [];
    const pageSize = 100;
    for (let i = 0; i < total; i += pageSize) {
      const { data } = await db.collection('user_behavior')
        .where({ _openid: openid }).skip(i).limit(pageSize).get();
      behaviors = behaviors.concat(data);
    }

    const clickCount = total;
    const clickedTags = behaviors.flatMap(b => b.tags || []);
    const keywords = behaviors.flatMap(b => b.searchKeywords || []);

    /** 标准化 importance（兼容英文别名） */
    const stdImportance = {};
    FACTORS.forEach(({ keys }) => {
      const [cn, en] = keys;
      const val = Number(importance[cn] ?? importance[en] ?? 3);
      stdImportance[cn] = Math.max(1, Math.min(5, val));
    });
    console.log('🔧 stdImportance:', stdImportance);

    /** 构建探索家风格（前两名） */
    const explorerStyle = FACTORS.map(f => ({
      label: f.label,
      score: stdImportance[f.keys[0]]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(f => f.label);

    console.log('🎒 explorerStyle:', explorerStyle);

    /** 味觉偏好 */
    const tastePref = Object.entries(tasteScore)
      .filter(([, s]) => Number(s) >= 3).map(([t]) => t);

    /** 标签偏好 */
    const topTags = buildTopTags(clickedTags, tastePref);
    const typeLabel = buildTypeLabel(tastePref, updateTime, keywords);
    const badges = buildBadges(tastePref, topTags, keywords);

    const report = {
      type: typeLabel,
      tastePreference: tastePref,
      explorerStyle,
      topTags,
      badges,
      clickCount,
      lastUpdated: updateTime
    };

    console.log('📦 final report:', report);
    return { success: true, report };

  } catch (err) {
    console.error('❌ 生成失败:', err);
    return { success: false, message: '生成失败', error: err };
  }
};

/** 构建标签列表（点击 + 补全） */
function buildTopTags(rawTags, tastePref) {
  const count = {};
  rawTags.forEach(t => count[t] = (count[t] || 0) + 1);
  let sorted = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t]) => t);

  const tasteMap = { '甜': '甜品', '辣': '川菜', '咸': '家常', '酸': '酸汤', '清淡': '轻食' };
  tastePref.forEach(t => {
    const alt = tasteMap[t];
    if (alt && !sorted.includes(alt)) sorted.push(alt);
  });

  while (sorted.length < 3) sorted.push('探索中');
  return sorted.slice(0, 3);
}

/** 构建类型标签 */
function buildTypeLabel(tastes, updateTime, keywords) {
  let base = tastes.includes('辣') ? '冒险派' :
             tastes.includes('清淡') ? '养生派' : '随心派';

  if (keywords.some(k => /便宜|近|打折/.test(k))) base += '理性';
  if (updateTime && Date.now() - new Date(updateTime) < 3 * 24 * 3600 * 1000) {
    base += '更新狂热者';
  }

  return `${base}吃货`;
}

/** 构建勋章 */
function buildBadges(tastes, tags, keywords) {
  const b = [];
  if (tastes.includes('甜'))                     b.push('嗜甜如命');
  if (tags.includes('川菜') || tags.includes('辣')) b.push('火辣达人');
  if (keywords.some(k => /便宜/.test(k)))          b.push('省钱小能手');
  if (keywords.some(k => /宵夜|夜宵/.test(k)))      b.push('夜宵猎手');
  return b;
}
