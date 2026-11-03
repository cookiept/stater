// Gráficos com Apache ECharts (escolhido pelo Gonçalo a 2026-11-03 depois da página de comparação).
// Cada vista monta as suas opções; aqui ficam o estilo comum, a criação e a limpeza.

const ativos = [];
let observador = null;

export function limparGraficos() {
  while (ativos.length) { try { ativos.pop().dispose(); } catch { /* já removido */ } }
}

export function cssVar(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tooltip escuro, igual em todos os gráficos
export const TOOLTIP = {
  backgroundColor: '#1a1a1a', borderWidth: 0, padding: [8, 12],
  textStyle: { color: '#fff', fontSize: 13 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px -8px rgba(0,0,0,.35);',
};
// Eixos: letra de 12px no mínimo, grelha tracejada suave
export const EIXO_CAT = { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#4a4a4a', fontSize: 12, fontWeight: 600 } };
export const EIXO_VAL = { axisLabel: { color: '#6b6b6b', fontSize: 12 }, splitLine: { lineStyle: { color: '#ececec', type: [4, 4] } } };
export const ROTULO = { color: '#3a3a3a', fontSize: 12, fontWeight: 600 };
// Etiqueta amarela da meta, usada nas linhas de meta
export const ETIQ_META = { color: '#1a1a1a', backgroundColor: '#ffc148', padding: [3, 6], borderRadius: 6, fontWeight: 600, fontSize: 12 };

export function base(brand) {
  return {
    textStyle: { fontFamily: `${brand.font}, "Noto Sans", system-ui, sans-serif` },
    animation: !semMovimento(),
    animationDuration: 800, animationEasing: 'cubicOut',
    tooltip: { ...TOOLTIP },
  };
}

// Gradiente vertical (ou horizontal) entre duas cores
export function grad(de, ate, horizontal = false) {
  return new window.echarts.graphic.LinearGradient(0, 0, horizontal ? 1 : 0, horizontal ? 0 : 1, [{ offset: 0, color: de }, { offset: 1, color: ate }]);
}

// Versão mais clara de cada cor do Stater, para o topo dos gradientes
export const CLARO = { '#db3a23': '#f08a7a', '#c4c4c4': '#e4e4e4', '#22a03b': '#5fcf76', '#bfe5c8': '#dcf2e2', '#d6dde3': '#e8edf1', '#e0a400': '#f3cf6b' };
export const comBrilho = (cor, horizontal = false) => (CLARO[cor] ? grad(horizontal ? cor : CLARO[cor], horizontal ? CLARO[cor] : cor, horizontal) : cor);

// Junta opções em profundidade (objetos simples).
export function junta(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof a?.[k] === 'object' && !Array.isArray(a[k]) && !(v instanceof Object && v.colorStops) ? junta(a[k], v) : v;
  }
  return out;
}

// Cria o gráfico. A altura vem das opções (altura) e o gráfico acompanha a largura do cartão.
export function desenhar(el, opcoes, altura = 300) {
  if (!el || !window.echarts) return null;
  el.style.height = `${altura}px`;
  const g = window.echarts.init(el, null, { renderer: 'svg' });
  g.setOption(opcoes);
  ativos.push(g);
  if (!observador && 'ResizeObserver' in window) {
    observador = new ResizeObserver(() => ativos.forEach(c => { try { c.resize(); } catch { /* removido */ } }));
  }
  observador?.observe(el);
  return g;
}
