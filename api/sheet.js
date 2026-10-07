// /api/sheet.js — Vercel Serverless Function (CommonJS)
// Lê todas as abas "Funil ..." de uma planilha (uma planilha por cliente) e devolve os dias já normalizados.
const { parseGrid } = require('./_parse');

const MAX_RANGE = 'A1:GZ80'; // ~200 colunas de dias/semanas e 80 linhas de métricas

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });

  try {
    // 1) nomes das abas
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=properties.title,sheets.properties.title&key=${apiKey}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      const msg = metaRes.status === 403 || metaRes.status === 404
        ? 'Planilha inacessível — confirme o ID e se está como "Qualquer pessoa com o link pode ver".'
        : `Google Sheets respondeu ${metaRes.status}`;
      return res.status(502).json({ error: msg });
    }
    const meta = await metaRes.json();
    const titles = (meta.sheets || []).map(s => s.properties.title);
    if (!titles.length) return res.status(200).json({ spreadsheet: meta.properties?.title || '', tabs: [] });

    // 2) valores de todas as abas numa chamada só
    const ranges = titles.map(t => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'!${MAX_RANGE}`)}`).join('&');
    const valUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE&key=${apiKey}`;
    const valRes = await fetch(valUrl);
    if (!valRes.ok) return res.status(502).json({ error: `Google Sheets respondeu ${valRes.status}` });
    const valData = await valRes.json();

    // 3) cada aba que tiver o layout de funil diário vira uma entrada; as demais são ignoradas
    const tabs = [];
    (valData.valueRanges || []).forEach((vr, i) => {
      const parsed = parseGrid(titles[i], vr.values || []);
      if (parsed) tabs.push(parsed);
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ spreadsheet: meta.properties?.title || '', tabs });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
