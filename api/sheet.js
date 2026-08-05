// /api/sheet.js — Vercel Serverless Function (CommonJS)
const TABS = [
  'Acomp_Semana_Geral','Acomp_Semana_Meta','Acomp_Semana_Google',
  'Acomp_Mensal_Geral','Acomp_Mensal_Meta','Acomp_Mensal_Google',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });

  const results = await Promise.all(
    TABS.map(async (tab) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A1:Z500?key=${apiKey}`;
      try {
        const r = await fetch(url);
        if (!r.ok) return { tab, values: [] };
        const data = await r.json();
        return { tab, values: data.values || [] };
      } catch (e) {
        return { tab, values: [] };
      }
    })
  );

  const tabs = {};
  for (const { tab, values } of results) tabs[tab] = values;
  res.status(200).json({ tabs });
};
