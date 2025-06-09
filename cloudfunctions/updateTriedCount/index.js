// 云函数 updateTriedCount
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-3gf7sz6fbf1f4d83' });
const db = cloud.database();

exports.main = async (event) => {
  const { dishId } = event;
  try {
    await db.collection('dishes').doc(dishId).update({
      data: {
        triedCount: db.command.inc(1)
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
};
