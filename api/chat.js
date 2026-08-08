// /api/chat.js — Vercel Serverless Function (CommonJS)
// Proxies multi-turn chat to Groq (llama-3.3-70b-versatile).
// Accepts: { messages: [{role, content}] } OR legacy { prompt: string }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const { messages, prompt } = req.body || {};

  // Support both multi-turn messages array and legacy single prompt
  let msgs;
  if (messages && Array.isArray(messages)) {
    msgs = messages;
  } else if (prompt) {
    msgs = [{ role: 'user', content: prompt }];
  } else {
    return res.status(400).json({ error: 'messages or prompt required' });
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: msgs,
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'Groq error', detail: err });
    }

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || 'Sem resposta.';
    return res.status(200).json({ response: text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
