const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  apiKey: '235e6810-84a4-4bb7-8b6d-f98c945ca868',
});

async function getRecommendedDishNames(userQuery, dishes) {
  const prompt = `
用户的需求是：${userQuery}

以下是所有菜品（JSON数组）：
${JSON.stringify(dishes, null, 2)}

请你基于这些信息，推荐最适合的几道菜，返回推荐菜品的 name 字段，用 JSON 数组表示。
`;

  const completion = await client.chat.completions.create({
    model: 'Qwen/Qwen2.5-7B-Instruct',
    messages: [
      { role: 'system', content: '你是一个聪明的美食推荐助手，只返回JSON格式的推荐菜品名列表。' },
      { role: 'user', content: prompt }
    ]
  });

  const reply = completion.choices[0].message.content;
  return JSON.parse(reply);
}

module.exports = {
  getRecommendedDishNames
};
