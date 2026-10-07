// /api/chat.js — Vercel Serverless Function (CommonJS)
// Proxies multi-turn chat to Groq (default openai/gpt-oss-120b; override with GROQ_MODEL), prepending the ads playbook.
const PLAYBOOK = require('./_playbook');

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

  // playbook de ads primeiro; os dados do cliente seguem na mensagem de sistema enviada pelo front
  msgs = [{ role: 'system', content: PLAYBOOK }, ...msgs.filter(m => m && m.role && typeof m.content === 'string')];

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: msgs,
        max_tokens: 2500,          // folga: modelos de raciocínio gastam tokens pensando antes de responder
        temperature: 0.2,
        reasoning_effort: 'low',
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
