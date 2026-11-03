// Criação de gráficos ApexCharts com o tema da marca ativa.

const ativos = [];

export function limparGraficos() {
  while (ativos.length) { try { ativos.pop().destroy(); } catch { /* já removido */ } }
}

export function cssVar(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

export function base(brand) {
  return {
    chart: {
      fontFamily: `${brand.font}, "Noto Sans", system-ui, sans-serif`,
      toolbar: { show: false }, zoom: { enabled: false },
      animations: { enabled: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 450 },
      foreColor: '#5c5c5c', parentHeightOffset: 0,
    },
    grid: { borderColor: '#efefef', strokeDashArray: 4, xaxis: { lines: { show: false } }, padding: { left: 6, right: 8 } },
    // Barras com um gradiente leve (mais luz em cima) para não parecerem planas
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.18, opacityFrom: 1, opacityTo: 0.88, stops: [0, 100] } },
    // Letra dos eixos com 12px no mínimo, para se ler bem
    xaxis: { labels: { style: { fontSize: '12px' } }, title: { style: { fontSize: '12px', fontWeight: 600 } } },
    yaxis: { labels: { style: { fontSize: '12px' } }, title: { style: { fontSize: '12px', fontWeight: 600 } } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: 'light' },
    states: { hover: { filter: { type: 'darken', value: 0.92 } } },
  };
}

// Junta opções em profundidade (objetos simples).
export function junta(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof a?.[k] === 'object' && !Array.isArray(a[k]) ? junta(a[k], v) : v;
  }
  return out;
}

// Estilo novo (experiência): barras redondas com brilho, espaço entre fatias, meia-lua mais grossa e etiquetas em pílula.
// Só se aplica quando o estilo novo está ligado (classe .v2 no <html>).
function estiloNovo(o) {
  const t = o.chart?.type;
  const x = { grid: { borderColor: '#e9ebef', strokeDashArray: 5 }, tooltip: { theme: 'dark' } };
  if (t === 'bar') {
    const empilhado = o.chart?.stacked;
    const horizontal = o.plotOptions?.bar?.horizontal;
    x.plotOptions = { bar: { borderRadius: empilhado ? 7 : 12, borderRadiusApplication: empilhado ? 'around' : 'end' } };
    x.fill = { type: 'gradient', gradient: { shade: 'light', type: horizontal ? 'vertical' : 'horizontal', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.9, stops: [0, 100] } };
    if (empilhado) x.stroke = { show: true, width: 3, colors: ['#fff'] };
    if (o.dataLabels?.enabled && !empilhado) x.dataLabels = { background: { enabled: true, foreColor: '#fff', borderRadius: 8, padding: 5, borderWidth: 0, opacity: 0.92, dropShadow: { enabled: false } }, style: { colors: ['#17181b'] } };
  }
  if (t === 'radialBar') {
    x.plotOptions = { radialBar: { hollow: { size: '66%' }, track: { background: '#eef0f3', strokeWidth: '100%', margin: 0 }, dataLabels: { value: { fontSize: '52px', fontWeight: 400 } } } };
    x.stroke = { lineCap: 'round' };
  }
  if (t === 'scatter') x.markers = { size: 11, strokeWidth: 3, strokeColors: '#fff', hover: { sizeOffset: 3 } };
  return junta(o, x);
}

export function desenhar(el, opcoes) {
  if (!el || !window.ApexCharts) return null;
  if (document.documentElement.classList.contains('v2')) opcoes = estiloNovo(opcoes);
  const c = new window.ApexCharts(el, opcoes);
  c.render();
  ativos.push(c);
  return c;
}
