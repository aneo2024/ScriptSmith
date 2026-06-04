import { generatePrompt, extractYamlFromContent } from '../shared/promptTemplate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  const model = process.env.AI_MODEL || 'gpt-4o';

  if (!apiKey || !apiUrl) {
    return res.status(500).json({
      error: 'Server misconfigured: AI_API_KEY and AI_API_URL are required',
    });
  }

  const { novelText, config } = req.body || {};

  if (!novelText || !String(novelText).trim()) {
    return res.status(400).json({ error: 'novelText is required' });
  }

  const base = apiUrl.replace(/\/$/, '');

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位专业编剧和YAML专家。' },
          { role: 'user', content: generatePrompt(novelText, config) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg =
        data?.error?.message || data?.message || `Upstream API error (${upstream.status})`;
      return res.status(upstream.status).json({ error: msg });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty response from AI provider' });
    }

    const yaml = extractYamlFromContent(content);
    return res.status(200).json({ yaml });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to call AI provider',
    });
  }
}
