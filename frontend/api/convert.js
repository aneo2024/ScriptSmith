import { generatePrompt, extractYamlFromContent } from '../shared/promptTemplate.js';

export default async function handler(req, res) {
  // 检查请求方法，只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 从环境变量读取 AI 配置
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  const model = process.env.AI_MODEL || 'gpt-4o';

  // 配置不完整时返回 500
  if (!apiKey || !apiUrl) {
    return res.status(500).json({
      error: 'Server misconfigured: AI_API_KEY and AI_API_URL are required',
    });
  }

  // 从请求体解构小说文本和配置参数
  const { novelText, config } = req.body || {};

  // 校验小说文本非空
  if (!novelText || !String(novelText).trim()) {
    return res.status(400).json({ error: 'novelText is required' });
  }

  // 去除 apiUrl 末尾的斜杠，防止拼接时出现双斜杠
  const base = apiUrl.replace(/\/$/, '');

  try {
    // 调用上游 AI 接口
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          // system prompt：定义 AI 的身份和角色
          { role: 'system', content: '你是一位专业编剧和YAML专家。' },
          // user prompt：传入小说文本和配置，生成结构化的转换提示词
          { role: 'user', content: generatePrompt(novelText, config) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    // 解析上游返回的 JSON
    const data = await upstream.json();

    // 上游返回非 2xx 状态码时，提取错误信息并透传状态码
    if (!upstream.ok) {
      const msg =
        data?.error?.message || data?.message || `Upstream API error (${upstream.status})`;
      return res.status(upstream.status).json({ error: msg });
    }

    // 提取 AI 返回的内容（choices[0].message.content）
    const content = data?.choices?.[0]?.message?.content;
    // 内容为空时返回 502（上游服务异常）
    if (!content) {
      return res.status(502).json({ error: 'Empty response from AI provider' });
    }

    // 从 AI 返回的文本中提取 YAML 部分（去除可能的前后文、markdown 代码块等）
    const yaml = extractYamlFromContent(content);
    // 返回成功响应
    return res.status(200).json({ yaml });
  } catch (err) {
    // 捕获网络错误等异常，返回 500
    return res.status(500).json({
      error: err.message || 'Failed to call AI provider',
    });
  }
