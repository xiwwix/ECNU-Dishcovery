const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  apiKey: '235e6810-84a4-4bb7-8b6d-f98c945ca868',
});

exports.main = async (event, context) => {
  const { userQuery, dishList } = event;

  const prompt = `
用户的需求是：${userQuery}
以下是菜品数据（每行一个 JSON）：
${dishList.map(d => JSON.stringify(d)).join('\n')}

你是一个活泼可爱的推荐助手，请从中挑选出最符合用户需求的菜品，返回它们的 name 字段组成的 JSON 数组，例如：["糖醋排骨", "麻辣香锅"]。

如果找不到符合要求的菜品，也可以返回一个空数组（[]），并用俏皮的语气说明你找不到。
只输出 JSON 数组，不要加说明文字。
`;

  try {
    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [
        {
          role: 'system',
          content: '你是一个菜品推荐助手，请严格返回 JSON 数组格式的推荐菜品名，如没有推荐项可以返回 []。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const reply = response.choices[0].message.content.trim();

    // 强健性：尝试解析
    let names = [];
    try {
      names = JSON.parse(reply);
      if (!Array.isArray(names)) names = [];
    } catch {
      names = [];
    }

    return { recommendedDishNames: names };

  } catch (err) {
    console.error('模型推荐失败：', err);
    return {
      error: '模型调用失败',
      reason: err.message
    };
  }
};
