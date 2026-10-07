// api/_parse.js — converte a grade bruta de uma aba "Funil ..." em dias normalizados.
//
// Layout esperado (um dia por coluna, métricas nas linhas):
//   linha de datas : dd/mm/aaaa em cada coluna de dia
//   colunas "Semanal dd/mm a dd/mm" e "Soma <Mês>" são totais calculados na planilha:
//   ficam de fora, o dashboard recalcula tudo a partir dos dias (evita contar o mês duas vezes)
//   coluna A = etapa do funil, coluna B = nome da métrica

const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Só métricas-base entram no resultado; as taxas e custos são recalculados no front para qualquer período.
const BASE_LABELS = {
  'alcance': 'alcance',
  'impressoes': 'impressoes',
  'cliques': 'cliques',
  'sessoes': 'sessoes',
  'page views (lp)': 'pageViews',
  'page views': 'pageViews',
  'add to cart': 'addToCart',
  'checkout': 'checkout',
  'vendas': 'vendas',
  'faturamento': 'faturamento',
  'leads': 'leads',
  'investimento': 'investimento',
};

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

// "R$ 1.234,56" | "1.234" | "0,71%" | "-" | "" -> número ou null
function parseNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || s === '-' || s === '—' || /^#/.test(s)) return null;
  const c = s.replace(/R\$\s*/g, '').replace(/%/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
}

function isoDate(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Linha com mais células dd/mm/aaaa = linha de datas.
function findDateRow(grid) {
  let best = -1, bestN = 0;
  for (let i = 0; i < Math.min(grid.length, 12); i++) {
    const n = (grid[i] || []).filter(c => DATE_RE.test(String(c || '').trim())).length;
    if (n > bestN) { best = i; bestN = n; }
  }
  return bestN >= 7 ? best : -1;
}

function detectKind(labels) {
  const has = k => labels.has(k);
  if (has('faturamento') || has('vendas') || has('sessoes')) return 'ecommerce';
  if (has('leads') || has('pageViews')) return 'b2b';
  return null;
}

// grid: matriz de células (strings) como a Sheets API devolve.
function parseGrid(title, grid) {
  if (!Array.isArray(grid) || grid.length < 5) return null;
  const dRow = findDateRow(grid);
  if (dRow < 0) return null;

  const dateRow = grid[dRow];
  const dayCols = []; // { col, date }
  dateRow.forEach((c, col) => {
    const m = DATE_RE.exec(String(c || '').trim());
    if (m) dayCols.push({ col, date: isoDate(m[1], m[2], m[3]) });
  });

  // linhas de métricas abaixo da linha de datas
  const metricRows = {}; // key -> índice da linha
  const stages = {};     // key -> etapa (coluna A, herdada das linhas anteriores)
  let stage = '';
  for (let i = dRow + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (String(r[0] || '').trim()) stage = String(r[0]).trim();
    const key = BASE_LABELS[norm(r[1])];
    if (key && metricRows[key] === undefined) { metricRows[key] = i; stages[key] = stage; }
  }
  const kind = detectKind(new Set(Object.keys(metricRows)));
  if (!kind || metricRows.investimento === undefined) return null;

  const keys = Object.keys(metricRows);
  const byDate = new Map();
  for (const { col, date } of dayCols) {
    const v = {};
    for (const k of keys) v[k] = parseNum((grid[metricRows[k]] || [])[col]);
    // se a mesma data aparecer duas vezes, a primeira vence
    if (!byDate.has(date)) byDate.set(date, v);
  }

  let days = [...byDate.entries()].map(([date, v]) => ({ date, v })).sort((a, b) => a.date.localeCompare(b.date));

  // Dias futuros / sem lançamento: tudo zerado ou vazio. Corta o que vem depois do último dia com dado.
  const hasData = d => keys.some(k => k !== 'alcance' && (d.v[k] || 0) > 0);
  let last = -1, first = -1;
  days.forEach((d, i) => { if (hasData(d)) { last = i; if (first < 0) first = i; } });
  if (last < 0) return null;
  days = days.slice(first, last + 1);

  return { title, kind, stages, metrics: keys, days };
}

module.exports = { parseGrid, parseNum, norm };
