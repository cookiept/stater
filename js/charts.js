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
      fontFamily: `Geist, ${brand.font}, "Noto Sans", system-ui, sans-serif`,
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

export function desenhar(el, opcoes) {
  if (!el || !window.ApexCharts) return null;
  const c = new window.ApexCharts(el, opcoes);
  c.render();
  ativos.push(c);
  return c;
}
