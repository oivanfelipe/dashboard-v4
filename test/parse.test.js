// node test/parse.test.js — valida o parser contra a planilha-modelo (fixture gerada dos dados reais)
const assert = require('assert');
const { parseGrid, parseNum } = require('../api/_parse');
const fixture = require('./fixture-grid.json');

// parseNum
assert.strictEqual(parseNum('R$ 1.234,56'), 1234.56);
assert.strictEqual(parseNum('0,71%'), 0.71);
assert.strictEqual(parseNum('5.354'), 5354);
assert.strictEqual(parseNum('-'), null);
assert.strictEqual(parseNum(''), null);

const eco = parseGrid('Funil Ecommerce', fixture['Funil Ecommerce']);
const b2b = parseGrid('Funil B2B', fixture['Funil B2B']);
assert.strictEqual(eco.kind, 'ecommerce');
assert.strictEqual(b2b.kind, 'b2b');

// 1 dia por coluna, sem colunas de Semanal/Soma Mês: datas únicas e consecutivas
for (const t of [eco, b2b]) {
  const ds = t.days.map(d => d.date);
  assert.strictEqual(new Set(ds).size, ds.length, 'datas duplicadas');
  for (let i = 1; i < ds.length; i++) {
    const gap = (Date.parse(ds[i]) - Date.parse(ds[i - 1])) / 864e5;
    assert.strictEqual(gap, 1, `buraco entre ${ds[i - 1]} e ${ds[i]}`);
  }
}
assert.strictEqual(eco.days[0].date, '2026-06-01');
assert.strictEqual(eco.days[eco.days.length - 1].date, '2026-09-23');

const sum = (t, k, from, to) => t.days.filter(d => d.date >= from && d.date <= to).reduce((s, d) => s + (d.v[k] || 0), 0);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.011, `${m}: ${a} != ${b}`);

// Semana 01/06 a 07/06 da planilha: investimento 328,52 / impressões 25.831 / vendas 7 / faturamento 3.017,00
near(sum(eco, 'investimento', '2026-06-01', '2026-06-07'), 328.52, 'inv semana');
near(sum(eco, 'impressoes', '2026-06-01', '2026-06-07'), 25831, 'impr semana');
near(sum(eco, 'vendas', '2026-06-01', '2026-06-07'), 7, 'vendas semana');
near(sum(eco, 'faturamento', '2026-06-01', '2026-06-07'), 3017, 'fat semana');

// "Soma Junho" da planilha: investimento 3.014,03 / impressões 207.956 / vendas 24 / faturamento 7.327,80
near(sum(eco, 'investimento', '2026-06-01', '2026-06-30'), 3014.03, 'inv junho');
near(sum(eco, 'impressoes', '2026-06-01', '2026-06-30'), 207956, 'impr junho');
near(sum(eco, 'vendas', '2026-06-01', '2026-06-30'), 24, 'vendas junho');
near(sum(eco, 'faturamento', '2026-06-01', '2026-06-30'), 7327.8, 'fat junho');

// Fechamento de setembro da planilha: investimento 4.110,68 / impressões 163.126 (col. de soma do mês)
near(sum(eco, 'investimento', '2026-09-01', '2026-09-30'), 4110.68, 'inv setembro');
near(sum(eco, 'impressoes', '2026-09-01', '2026-09-30'), 163126, 'impr setembro');

// B2B: Soma Junho: investimento 110,61 / cliques 299 / leads 56
near(sum(b2b, 'investimento', '2026-06-01', '2026-06-30'), 110.61, 'b2b inv junho');
near(sum(b2b, 'cliques', '2026-06-01', '2026-06-30'), 299, 'b2b cliques junho');
near(sum(b2b, 'leads', '2026-06-01', '2026-06-30'), 56, 'b2b leads junho');

// Alcance: soma diária x total do mês na planilha (alcance é único, pode divergir)
console.log('b2b alcance soma diária junho:', sum(b2b, 'alcance', '2026-06-01', '2026-06-30'), '(planilha: 3.964)');
console.log('eco  alcance soma diária ago :', sum(eco, 'alcance', '2026-08-01', '2026-08-31'), '(planilha: 4.873)');
console.log('eco dias:', eco.days.length, '| b2b dias:', b2b.days.length, '| b2b início:', b2b.days[0].date, 'fim:', b2b.days[b2b.days.length - 1].date);
console.log('OK');
