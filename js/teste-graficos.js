// Página de comparação: os mesmos gráficos do NPS em três bibliotecas.
// ApexCharts (o que o Stater usava), Apache ECharts (o que o Stater usa agora) e AG Charts Community.
// Lê os dados que já estão neste browser (nada sai do computador); sem dados, usa o exemplo fictício.
import { BRANDS, brandById, applyTheme } from './brands.js?v=20261103-1225';
import { resumoNps, fmt, CORES, corNps, corNpsClaro } from './stats.js?v=20261103-1225';
import { exemplos } from './exemplo.js?v=20261103-1225';
import { junta } from './charts.js?v=20261103-1225';
import * as vNps from './views/nps.js?v=20261103-1225';

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

const COLS = [['ax', 'ApexCharts', 'o que o Stater usava'], ['ch', 'Apache ECharts', 'o que o Stater usa agora'], ['ag', 'AG Charts', 'versão grátis']];
const linha = (id, titulo) => `<div class="tg-row">${COLS.map(([p, n]) => `<section class="card"><div class="card-head"><h3>${titulo}</h3><span class="note">${n}</span></div><div id="${p}-${id}" class="chart"></div></section>`).join('')}</div>`;
document.getElementById('tg').innerHTML = `
  <div class="tg-top">
    <div><h1>Comparação de gráficos · ${brand.name} NPS</h1>
    <p>Os mesmos dados em três bibliotecas de gráficos. Todas funcionam dentro do browser.</p></div>
    <a class="btn btn-secondary btn-sm" href="./#/${brand.id}/nps">Voltar ao Stater</a>
  </div>
  ${exemplo ? '<div class="tg-aviso"><b>Dados de exemplo.</b> Carrega o Excel do NPS desta marca no Stater, neste browser, para ver os teus números aqui.</div>' : ''}
  <div class="tg-cols">${COLS.map(([p, n, d]) => `<div class="tg-col-t ${p}"><i></i>${n}<span>${d}</span></div>`).join('')}</div>
  ${linha('gauge', 'NPS face à meta')}
  ${linha('dist', 'Notas dadas')}
  ${linha('mes', 'NPS por mês · fictício')}
  <p class="tg-nota">No AG Charts o medidor é pago, por isso aparece um donut com detratores, neutros e promotores.</p>`;

// ---------- Apache ECharts: o código do Stater ----------
vNps.mount(rec, brand, meta);

// ---------- ApexCharts: o código que o Stater tinha antes ----------
function apexBase(b) {
  return {
    chart: { fontFamily: FONTE, toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 450 }, foreColor: '#5c5c5c', parentHeightOffset: 0 },
    grid: { borderColor: '#efefef', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 6, right: 8 } },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.18, opacityFrom: 1, opacityTo: 0.88, stops: [0, 100] } },
    xaxis: { labels: { style: { fontSize: '12px' } } }, yaxis: { labels: { style: { fontSize: '12px' } } },
    dataLabels: { enabled: false }, legend: { show: false }, tooltip: { theme: 'light' },
  };
}
function apex(el, o) { const g = new window.ApexCharts(el, o); g.render(); return g; }
function apexMount(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const cores = c.map((_, i) => (i <= 6 ? CORES.det : i <= 8 ? CORES.neu : CORES.pro));
  const corG = corNps(r.nps);
  const b = apexBase(brand);

  apex(document.getElementById('ax-gauge'), junta(b, {
    chart: { type: 'radialBar', height: 280, sparkline: { enabled: true } },
    series: [Math.max(0, Math.min(100, (r.nps + 100) / 2))],
    colors: [corG],
    plotOptions: {
      radialBar: {
        startAngle: -95, endAngle: 95, hollow: { size: '62%' },
        track: { background: '#f0f0f0', strokeWidth: '100%', margin: 0 },
        dataLabels: {
          name: { show: false },
          value: { offsetY: -6, fontSize: '44px', fontWeight: 500, color: '#1a1a1a', formatter: () => fmt(r.nps) },
        },
      },
    },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', gradientToColors: [corNpsClaro(r.nps)], stops: [0, 100] } },
    stroke: { lineCap: 'round' },
    labels: ['NPS'],
  }));

  apex(document.getElementById('ax-dist'), junta(b, {
    chart: { type: 'bar', height: 300 },
    series: [{ name: 'Respostas', data: c }],
    colors: cores,
    plotOptions: { bar: { distributed: true, borderRadius: 5, borderRadiusApplication: 'end', columnWidth: '62%', dataLabels: { position: 'top' } } },
    dataLabels: {
      enabled: true, offsetY: -18, style: { fontSize: '12px', fontWeight: 600, colors: ['#494949'] },
      formatter: v => `${fmt((v / r.total) * 100, 0)}%`,
    },
    xaxis: { categories: c.map((_, i) => String(i)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', fontWeight: 600 } } },
    yaxis: { labels: { formatter: v => fmt(v) } },
    tooltip: { y: { formatter: v => `${fmt(v)} respostas (${fmt((v / r.total) * 100, 1)}%)` }, x: { formatter: v => `Nota ${v}` } },
  }));

  // Exemplo fictício: meses à volta do valor real
  const meses = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
  const desvios = [-7, -4, -6, -2, -5, -1, 1, -3, 2, 0, 3, 1];
  apex(document.getElementById('ax-mes'), junta(b, {
    chart: { type: 'bar', height: 220 },
    series: [{ name: 'NPS (fictício)', data: desvios.map(d => r.nps + d) }],
    colors: desvios.map((_, i) => (i >= 9 ? CORES.pro : CORES.proClaro)),
    plotOptions: { bar: { borderRadius: 5, borderRadiusApplication: 'end', columnWidth: '58%', distributed: true, dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '12px', fontWeight: 600, colors: ['#494949'] } },
    xaxis: { categories: meses, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: Math.min(0, r.nps - 20), max: 100, tickAmount: 4 },
    annotations: { yaxis: [{ y: meta, borderColor: '#e0a400', strokeDashArray: 4, label: { text: `Meta ${meta}`, position: 'right', textAnchor: 'end', offsetY: -2, borderColor: '#ffc148', style: { background: '#ffc148', color: '#1a1a1a', fontWeight: 600, fontSize: '12px' } } }] },
    tooltip: { y: { formatter: v => `${v} (fictício)` } },
  }));
}

apexMount(rec, brand, meta);

// ---------- AG Charts Community ----------
const AG = window.agCharts.AgCharts;
const agBase = { background: { visible: false }, padding: { top: 10, right: 10, bottom: 6, left: 6 }, legend: { enabled: false } };
const fonte = { fontFamily: FONTE };
const corNota = i => (i <= 6 ? CORES.det : i <= 8 ? CORES.neu : CORES.pro);
const altura = (id, h) => { const el = document.getElementById(id); el.style.height = h + 'px'; return el; };

AG.create({ ...agBase, container: altura('ag-gauge', 260),
  data: [{ g: 'Detratores', v: r.d }, { g: 'Neutros', v: r.n }, { g: 'Promotores', v: r.p }],
  series: [{ type: 'donut', angleKey: 'v', legendItemKey: 'g', innerRadiusRatio: 0.72, fills: [CORES.det, CORES.neu, CORES.pro], strokeWidth: 3, strokes: ['#fff'], cornerRadius: 6,
    innerLabels: [{ text: fmt(r.nps), fontSize: 44, fontWeight: 500, color: '#1a1a1a', ...fonte }, { text: `Meta ${meta}`, fontSize: 13, fontWeight: 600, color: r.nps >= meta ? '#17702b' : '#b3301c', margin: 4, ...fonte }],
    tooltip: { renderer: p => ({ title: p.datum.g, content: `${fmt(p.datum.v)} pessoas` }) } }],
});

AG.create({ ...agBase, container: altura('ag-dist', 300),
  data: c.map((v, i) => ({ nota: String(i), v })),
  series: [{ type: 'bar', xKey: 'nota', yKey: 'v', yName: 'Respostas', cornerRadius: 8,
    itemStyler: p => ({ fill: corNota(+p.datum.nota) }),
    label: { placement: 'outside-end', fontSize: 12, fontWeight: 600, color: '#3a3a3a', ...fonte, formatter: p => `${fmt((p.value / r.total) * 100, 0)}%` },
    tooltip: { renderer: p => ({ title: `Nota ${p.datum.nota}`, content: `${fmt(p.datum.v)} respostas · ${fmt((p.datum.v / r.total) * 100, 1)}%` }) } }],
  axes: [
    { type: 'category', position: 'bottom', label: { fontSize: 12, fontWeight: 600, ...fonte }, line: { enabled: false } },
    { type: 'number', position: 'left', label: { fontSize: 12, ...fonte, formatter: p => fmt(p.value) }, gridLine: { style: [{ stroke: '#ececec', lineDash: [4, 4] }] } },
  ],
});

const meses = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
const desvios = [-7, -4, -6, -2, -5, -1, 1, -3, 2, 0, 3, 1];
AG.create({ ...agBase, container: altura('ag-mes', 240),
  data: meses.map((m, i) => ({ m, v: r.nps + desvios[i] })),
  series: [
    { type: 'area', xKey: 'm', yKey: 'v', fill: CORES.pro, fillOpacity: 0.12, strokeWidth: 0, marker: { enabled: false }, tooltip: { enabled: false } },
    { type: 'line', xKey: 'm', yKey: 'v', yName: 'NPS', stroke: CORES.pro, strokeWidth: 3, interpolation: { type: 'smooth' },
      marker: { size: 8, fill: '#fff', stroke: CORES.pro, strokeWidth: 2 },
      label: { fontSize: 12, fontWeight: 600, color: '#3a3a3a', ...fonte, formatter: p => fmt(p.value) } },
  ],
  axes: [
    { type: 'category', position: 'bottom', label: { fontSize: 12, ...fonte } },
    { type: 'number', position: 'left', min: Math.min(0, r.nps - 20), max: 100, label: { fontSize: 12, ...fonte }, gridLine: { style: [{ stroke: '#ececec', lineDash: [4, 4] }] },
      crossLines: [{ type: 'line', value: meta, stroke: CORES.ama, lineDash: [5, 4], strokeWidth: 1.5, label: { text: `Meta ${meta}`, position: 'left', fontSize: 12, fontWeight: 600, color: '#1a1a1a', ...fonte } }] },
  ],
});
