// Página de teste: os mesmos gráficos do NPS em ApexCharts (atual) e em Apache ECharts, lado a lado.
// Lê os dados que já estão neste browser (nada sai do computador); sem dados, usa o exemplo fictício.
import { BRANDS, brandById, applyTheme } from './brands.js?v=20261103-1219';
import { resumoNps, fmt, CORES, corNps, corNpsClaro } from './stats.js?v=20261103-1219';
import { exemplos } from './exemplo.js?v=20261103-1219';
import * as vNps from './views/nps.js?v=20261103-1219';

const marcaId = new URLSearchParams(location.search).get('marca') || 'colibri';
const brand = brandById(marcaId) || BRANDS[0];
applyTheme(document.documentElement, brand);
document.body.style.fontFamily = `${brand.font}, "Noto Sans", system-ui, sans-serif`;

let rec = null;
try { rec = JSON.parse(localStorage.getItem(`stater:v1:${brand.id}:nps`)); } catch { /* sem dados */ }
const exemplo = !rec;
if (exemplo) rec = exemplos.nps;
const metaGuardada = parseInt(localStorage.getItem(`stater:v1:meta:${brand.id}`), 10);
const meta = Number.isFinite(metaGuardada) ? metaGuardada : (brand.target ?? 60);

const c = rec.data.contagens;
const r = resumoNps(c);
const FONTE = `${brand.font}, "Noto Sans", system-ui, sans-serif`;

const card = (id, titulo, extra = '') => `<section class="card"><div class="card-head"><h3>${titulo}</h3></div>${extra}<div id="${id}" class="chart"></div></section>`;
document.getElementById('tg').innerHTML = `
  <div class="tg-top">
    <div><h1>Teste de gráficos · ${brand.name} NPS</h1>
    <p>À esquerda o gráfico atual (ApexCharts). À direita o mesmo gráfico em Apache ECharts.</p></div>
    <a class="btn btn-secondary btn-sm" href="./#/${brand.id}/nps">Voltar ao Stater</a>
  </div>
  ${exemplo ? '<div class="tg-aviso"><b>Dados de exemplo.</b> Carrega o Excel do NPS desta marca no Stater, neste browser, para ver os teus números aqui.</div>' : ''}
  <div class="tg-cols"><div class="tg-col-t"><i></i>Atual · ApexCharts</div><div class="tg-col-t novo"><i></i>Novo · Apache ECharts</div></div>
  <div class="tg-row">${card('ch-gauge', 'NPS face à meta')}${card('ec-gauge', 'NPS face à meta')}</div>
  <div class="tg-row">${card('ch-dist', 'Notas dadas')}${card('ec-dist', 'Notas dadas')}</div>
  <div class="tg-row">${card('ch-mes', 'NPS por mês · dados fictícios')}${card('ec-mes', 'NPS por mês · dados fictícios')}</div>`;

// Lado atual: o código que já existe no Stater
vNps.mount(rec, brand, meta);

// Lado novo: ECharts
const E = window.echarts;
const graficos = [];
function novo(id, altura, opcoes) {
  const el = document.getElementById(id);
  el.classList.add('ec');
  el.style.height = altura + 'px';
  const g = E.init(el, null, { renderer: 'svg' });
  g.setOption({ textStyle: { fontFamily: FONTE }, animationDuration: 900, animationEasing: 'cubicOut', ...opcoes });
  graficos.push(g);
}
addEventListener('resize', () => graficos.forEach(g => g.resize()));
const grad = (de, ate, vertical = true) => new E.graphic.LinearGradient(0, vertical ? 0 : 0, vertical ? 0 : 1, vertical ? 1 : 0, [{ offset: 0, color: de }, { offset: 1, color: ate }]);
const TOOLTIP = { backgroundColor: '#1a1a1a', borderWidth: 0, padding: [8, 12], textStyle: { color: '#fff', fontSize: 13, fontFamily: FONTE }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -8px rgba(0,0,0,.35);' };

// 1. Medidor: arco de -100 a 100, número a contar, marca da meta no arco
const cor = corNps(r.nps);
novo('ec-gauge', 300, {
  series: [
    {
      type: 'gauge', startAngle: 200, endAngle: -20, min: -100, max: 100, radius: '84%', center: ['50%', '62%'],
      progress: { show: true, roundCap: true, width: 22, itemStyle: { color: grad(corNpsClaro(r.nps), cor, false) } },
      axisLine: { roundCap: true, lineStyle: { width: 22, color: [[1, '#f0f1f3']] } },
      axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { distance: -46, color: '#8a8a8a', fontSize: 12, formatter: v => (v === -100 || v === 100 ? v : '') },
      pointer: { show: false }, anchor: { show: false }, title: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '-4%'], fontSize: 52, fontWeight: 500, color: '#1a1a1a', formatter: v => fmt(Math.round(v)) },
      data: [{ value: r.nps }],
    },
    {
      // Marca da meta: um pequeno traço escuro em cima do arco
      type: 'gauge', startAngle: 200, endAngle: -20, min: -100, max: 100, radius: '84%', center: ['50%', '62%'],
      axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: true, icon: 'triangle', length: 12, width: 14, offsetCenter: [0, '-118%'], itemStyle: { color: '#1a1a1a' } },
      anchor: { show: false }, title: { show: false },
      detail: { offsetCenter: [0, '30%'], fontSize: 14, fontWeight: 600, color: r.nps >= meta ? '#17702b' : '#b3301c', formatter: () => `${r.nps >= meta ? '▲' : '▼'} Meta ${meta}` },
      data: [{ value: meta }],
    },
  ],
});

// 2. Notas dadas: barras com fundo, cantos redondos, gradiente e % por cima
const corNota = i => (i <= 6 ? CORES.det : i <= 8 ? CORES.neu : CORES.pro);
const claro = { [CORES.det]: '#f08a7a', [CORES.neu]: '#e2e2e2', [CORES.pro]: '#5fcf76' };
novo('ec-dist', 320, {
  grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
  tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } },
    formatter: p => `<b>Nota ${p[0].name}</b><br>${fmt(p[0].value)} respostas · ${fmt((p[0].value / r.total) * 100, 1)}%` },
  xAxis: { type: 'category', data: c.map((_, i) => String(i)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#5c5c5c', fontSize: 12, fontWeight: 600 } },
  yAxis: { type: 'value', splitNumber: 4, axisLabel: { color: '#8a8a8a', fontSize: 12, formatter: v => fmt(v) }, splitLine: { lineStyle: { color: '#eeeeee', type: [4, 4] } } },
  series: [{
    type: 'bar', barWidth: '58%', showBackground: true, backgroundStyle: { color: '#fafafa', borderRadius: [10, 10, 4, 4] },
    data: c.map((v, i) => ({ value: v, itemStyle: { color: grad(claro[corNota(i)], corNota(i)), borderRadius: [10, 10, 4, 4] } })),
    label: { show: true, position: 'top', distance: 6, color: '#3a3a3a', fontSize: 12, fontWeight: 600, formatter: p => `${fmt((p.value / r.total) * 100, 0)}%` },
    emphasis: { focus: 'self', itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,.18)' } },
    blur: { itemStyle: { opacity: 0.35 } },
    animationDelay: i => i * 45,
  }],
});

// 3. NPS por mês (fictício, como no Stater): linha suave com área, linha da meta, último mês destacado
const meses = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
const desvios = [-7, -4, -6, -2, -5, -1, 1, -3, 2, 0, 3, 1];
const serie = desvios.map(d => r.nps + d);
novo('ec-mes', 260, {
  grid: { left: 8, right: 16, top: 30, bottom: 4, containLabel: true },
  tooltip: { ...TOOLTIP, trigger: 'axis', formatter: p => `<b>${p[0].name}</b><br>NPS ${p[0].value} (fictício)` },
  xAxis: { type: 'category', boundaryGap: false, data: meses, axisLine: { lineStyle: { color: '#e6e6e6' } }, axisTick: { show: false }, axisLabel: { color: '#5c5c5c', fontSize: 12 } },
  yAxis: { type: 'value', min: Math.min(0, r.nps - 20), max: 100, interval: 25, axisLabel: { color: '#8a8a8a', fontSize: 12 }, splitLine: { lineStyle: { color: '#eeeeee', type: [4, 4] } } },
  series: [{
    type: 'line', smooth: 0.35, data: serie, symbol: 'circle', symbolSize: 8, showSymbol: true,
    lineStyle: { width: 3, color: CORES.pro },
    itemStyle: { color: '#fff', borderColor: CORES.pro, borderWidth: 2 },
    areaStyle: { color: grad('rgba(34,160,59,.28)', 'rgba(34,160,59,0)') },
    label: { show: true, position: 'top', distance: 8, color: '#3a3a3a', fontSize: 12, fontWeight: 600 },
    markLine: { symbol: 'none', silent: true, lineStyle: { color: CORES.ama, type: [5, 4], width: 1.5 },
      label: { formatter: `Meta ${meta}`, position: 'insideStartTop', color: '#1a1a1a', backgroundColor: '#ffc148', padding: [3, 6], borderRadius: 6, fontWeight: 600, fontSize: 12 },
      data: [{ yAxis: meta }] },
    markPoint: { symbol: 'circle', symbolSize: 14, itemStyle: { color: CORES.pro, borderColor: '#fff', borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(34,160,59,.5)' }, label: { show: false },
      data: [{ coord: [meses.length - 1, serie[serie.length - 1]] }] },
  }],
});
