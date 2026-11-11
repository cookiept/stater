// Peças partilhadas pelas vistas: números grandes, cartões de gráfico, tabela ordenável e
// gráficos que se repetem (barras horizontais de um valor, composição detratores/neutros/promotores).
// Uma vista nova deve montar-se com estas peças para o Stater ficar igual em todas as tabs.
import { CORES, fmt } from '../stats.js?v=20261111-1436';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL, ETIQ_META } from '../charts.js?v=20261111-1436';
import { info, esc, btnPptx } from '../ui.js?v=20261111-1436';
import { icon } from '../icons.js?v=20261111-1436';
import { hex, TPL } from '../export.js?v=20261111-1436';

// Número grande (KPI). hero = o primeiro, em fundo escuro.
export const kpi = (rot, val, det, tip, hero = false) => `
  <div class="kpi${hero ? ' hero' : ''}"><span class="kl">${rot} ${tip ? info(rot, tip) : ''}</span><span class="kv num">${val}</span><span class="kd">${det}</span></div>`;
export const kpis = lista => `<div class="kpis" style="grid-template-columns:repeat(${lista.length},minmax(0,1fr))">${lista.join('')}</div>`;

// Cartão com título, "i", legenda opcional, botão Download e a área do gráfico
export function cartao(id, titulo, tip, { legenda = '', nota = '', aria = titulo, corpo = null } = {}) {
  return `<section class="card" aria-labelledby="h-${id}">
    <div class="card-head"><h3 id="h-${id}">${esc(titulo)} ${info(titulo, tip)}</h3>
      ${legenda ? `<div class="legend" style="margin:0 0 0 auto">${legenda}</div>` : ''}${nota ? `<div class="note">${nota}</div>` : ''}${btnPptx(id)}</div>
    ${corpo ?? `<div id="ch-${id}" class="chart" role="img" aria-label="${esc(aria)}"></div>`}
  </section>`;
}
export const LEGENDA_DNP = `<span><i style="background:var(--detractor)"></i>Detratores</span><span><i style="background:var(--passive)"></i>Neutros</span><span><i style="background:var(--promoter)"></i>Promotores</span>`;

// Tabela com títulos que ordenam e caixa de procura. colunas: [{ k, rot, r (à direita), ordena }]
export function tabelaHtml(id, titulo, tip, colunas, procurar = 'Procurar', extra = '', grafico = null) {
  // grafico = { id, legenda, aria }: o cartão começa no gráfico e um botão troca para a tabela
  const g = grafico, m = modo => (g ? ` data-modo="${modo}"${modo === 'tab' ? ' hidden' : ''}` : '');
  return `<section class="card" aria-labelledby="h-${id}" style="padding-bottom:16px">
    <div class="card-head" style="margin-bottom:10px">
      <h3 id="h-${id}">${esc(titulo)} ${info(titulo, tip)}</h3>
      ${g ? `<div class="modo-sw">${alternar(`modo-${id}`, [['graf', 'Gráfico'], ['tab', 'Tabela']], 'graf', 'Mostrar como')}</div>` : ''}
      <div class="tbl-tools" style="margin-left:auto">
        ${g?.legenda ? `<div class="legend"${m('graf')} style="margin:0">${g.legenda}</div>` : ''}
        <span class="tbl-only"${m('tab')}>${extra}</span><label class="search"${m('tab')}>${icon('search')}<span class="sr-only">${esc(procurar)}</span><input id="q-${id}" type="search" placeholder="${esc(procurar)}"></label>
        ${btnPptx(g ? g.id : id)}
      </div>
    </div>
    ${g ? `<div id="ch-${g.id}" class="chart" data-modo="graf" role="img" aria-label="${esc(g.aria || titulo)}"></div>` : ''}
    <div class="tbl-wrap"${m('tab')}><table class="tbl" id="tbl-${id}">
      <thead><tr>${colunas.map(c => `<th scope="col"${c.r ? ' class="r"' : ''}>${c.ordena === false ? esc(c.rot) : `<button data-sort="${c.k}">${esc(c.rot)} ${icon('sort')}</button>`}${c.tip ? ` ${info(c.rot, c.tip)}` : ''}</th>`).join('')}</tr></thead>
      <tbody></tbody>
    </table></div>
  </section>`;
}

// Liga o botão Gráfico / Tabela de um cartão feito com tabelaHtml(..., grafico)
export function ligarModo(id, graficoId) {
  ligarAlternar(`modo-${id}`, v => {
    const card = document.querySelector(`[aria-labelledby="h-${id}"]`);
    card.querySelectorAll('[data-modo]').forEach(el => { el.hidden = el.dataset.modo !== v; });
    card.querySelector('.exp')?.setAttribute('data-exp', v === 'tab' ? id : graficoId);
  });
}

// Botões para alternar a forma de ver (ex.: % ou n.º de pessoas). ops: [[valor, texto]]
export const alternar = (id, ops, on, rot = 'Mostrar') => `<div class="seg-toggle" role="group" aria-label="${esc(rot)}" id="sg-${id}">${ops.map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === on}">${esc(t)}</button>`).join('')}</div>`;
export function ligarAlternar(id, fn) {
  const g = document.getElementById(`sg-${id}`);
  g?.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    fn(b.dataset.v);
  });
}

// Liga a ordenação e a procura. Linhas com zero ficam sempre no fim.
export function ligarTabela(id, itens, linha, { chave: k0 = 'total', dir: d0 = -1, vazio = 'Nada com esse nome.', ncol = 5, ordemNatural = null } = {}) {
  const tbody = document.querySelector(`#tbl-${id} tbody`);
  if (!tbody) return;
  let chave = k0, dir = d0, q = '';
  const pintar = () => {
    const lista = itens.filter(c => c.nome.toLowerCase().includes(q)).sort((a, b) => {
      if (!!a.zero !== !!b.zero) return a.zero ? 1 : -1;
      if (chave === '_ordem' && ordemNatural) return (ordemNatural(a) - ordemNatural(b)) * dir;
      const x = a[chave], y = b[chave];
      if (x == null || y == null) return (x == null) - (y == null);
      return (typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y) * dir;
    });
    tbody.innerHTML = lista.map(linha).join('') || `<tr><td colspan="${ncol}" class="muted">${esc(vazio)}</td></tr>`;
    document.querySelectorAll(`#tbl-${id} th`).forEach(th => th.removeAttribute('aria-sort'));
    document.querySelector(`#tbl-${id} [data-sort="${chave}"]`)?.closest('th').setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
  };
  document.querySelectorAll(`#tbl-${id} [data-sort]`).forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.sort;
    dir = k === chave ? -dir : (k === 'nome' ? 1 : -1);
    chave = k;
    pintar();
  }));
  document.getElementById(`q-${id}`)?.addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); pintar(); });
  pintar();
  return pintar;
}

// Mini barra detratores/neutros/promotores para tabelas
export const miniDnp = c => `<div style="display:flex;align-items:center;gap:10px"><div class="minibar" aria-hidden="true"><div class="d" style="flex:${c.pctD}"></div><div class="n" style="flex:${c.pctN}"></div><div class="p" style="flex:${c.pctP}"></div></div><span class="muted num" style="white-space:nowrap">${fmt(c.pctD)} · ${fmt(c.pctN)} · ${fmt(c.pctP)}%</span></div>`;

const curto = (s, n = 30) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const ROT_RICH = { n: { fontSize: 12, color: '#1a1a1a', lineHeight: 16 }, m: { fontSize: 12, color: '#6b6b6b', lineHeight: 15 } };

// Barras horizontais de um valor por item (ex.: NPS por driver, média por tema).
// itens: [{ nome, valor, sub, cor, zero }]. linha: { valor, rotulo } desenha uma linha de referência (ex.: objetivo).
export function barrasH(el, brand, itens, { min, max, linha = null, formato = v => fmt(v), tooltip, altura } = {}) {
  const h = altura ?? Math.max(200, itens.length * 46 + 50);
  return desenhar(el, junta(base(brand), {
    grid: { left: 8, right: 44, top: linha ? 30 : 8, bottom: 6, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => tooltip ? tooltip(itens[p.dataIndex]) : `<b>${esc(itens[p.dataIndex].nome)}</b><br>${formato(p.value)}` },
    xAxis: { type: 'value', min, max, ...EIXO_VAL },
    yAxis: { type: 'category', inverse: true, data: itens.map(c => `{n|${curto(c.nome)}}\n{m|${c.sub || ''}}`), ...EIXO_CAT,
      axisLabel: { margin: 12, align: 'right', rich: ROT_RICH } },
    series: [{
      type: 'bar', barWidth: '56%', showBackground: true, backgroundStyle: { color: '#f4f4f4', borderRadius: 6 },
      data: itens.map(c => (c.zero ? null : { value: c.valor, itemStyle: { color: comBrilho(c.cor, true), borderRadius: 6 } })),
      label: { show: true, position: 'right', color: '#1a1a1a', fontSize: 12, fontWeight: 700, formatter: p => (p.value == null ? '' : formato(p.value)) },
      markLine: linha ? { symbol: 'none', silent: true, data: [{ xAxis: linha.valor, lineStyle: { color: linha.cor || CORES.ama, type: [5, 4], width: 1.5 }, label: { formatter: linha.rotulo, position: 'start', distance: 6, ...(linha.cor ? { color: '#494949', backgroundColor: '#f0f0f0', padding: [3, 6], borderRadius: 6, fontSize: 12 } : ETIQ_META) } }] } : undefined,
    }],
  }), h);
}

// Composição 100%: detratores, neutros e promotores por item. itens: [{ nome, d, n, p, pctD, pctN, pctP, zero, sub }]
export function composicao(el, brand, itens) {
  const cor3 = [CORES.det, CORES.neu, CORES.pro];
  const nomes3 = ['Detratores', 'Neutros', 'Promotores'];
  const pct = [itens.map(c => c.pctD), itens.map(c => c.pctN), itens.map(c => c.pctP)];
  return desenhar(el, junta(base(brand), {
    grid: { left: 8, right: 16, top: 6, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } },
      formatter: p => { const c = itens[p[0].dataIndex]; return `<b>${esc(c.nome)}</b><br>` + (c.zero ? 'Sem respostas' : p.map(x => `${x.marker}${x.seriesName}: ${fmt([c.d, c.n, c.p][x.seriesIndex])} (${fmt(x.value, 1)}%)`).join('<br>')); } },
    xAxis: { type: 'value', max: 100, ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => `${v}%` } },
    yAxis: { type: 'category', inverse: true, data: itens.map(c => `{n|${curto(c.nome)}}\n{m|${c.sub || ''}}`), ...EIXO_CAT,
      axisLabel: { margin: 12, align: 'right', rich: ROT_RICH } },
    series: [0, 1, 2].map(k => ({
      name: nomes3[k], type: 'bar', stack: 't', barWidth: '58%',
      data: pct[k].map((v, i) => (itens[i].zero ? null : v)),
      itemStyle: { color: comBrilho(cor3[k], true), borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, color: k === 1 ? '#1a1a1a' : '#fff', fontSize: 12, fontWeight: 600, formatter: p => (p.value >= 8 ? `${fmt(p.value)}%` : '') },
      emphasis: { focus: 'series' }, blur: { itemStyle: { opacity: 0.35 } },
    })),
  }), Math.max(200, itens.length * 54 + 60));
}

// ---------- PowerPoint ----------
// Barras horizontais nativas (editáveis no PowerPoint)
export const pptBarras = (b, itens, { nome = 'Valor', cor = CORES.pro, min, max, formato = '0' } = {}) => (s, p) => s.addChart(p.ChartType.bar, [
  { name: nome, labels: itens.map(c => c.nome), values: itens.map(c => (c.zero ? 0 : +(+c.valor).toFixed(2))) },
], { ...b, barDir: 'bar', catAxisOrientation: 'maxMin', chartColors: [hex(cor)], showValue: true, dataLabelFormatCode: formato, showLegend: false, catAxisLabelFontSize: 10,
  ...(min != null ? { valAxisMinVal: min } : {}), ...(max != null ? { valAxisMaxVal: max } : {}) });

export const pptComposicao = (b, itens) => (s, p) => s.addChart(p.ChartType.bar, [
  { name: 'Detratores', labels: itens.map(c => c.nome), values: itens.map(c => c.d) },
  { name: 'Neutros', labels: itens.map(c => c.nome), values: itens.map(c => c.n) },
  { name: 'Promotores', labels: itens.map(c => c.nome), values: itens.map(c => c.p) },
], { ...b, barDir: 'bar', barGrouping: 'percentStacked', barGapWidthPct: 45, catAxisOrientation: 'maxMin', chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], showValue: false, catAxisLabelFontSize: 10, valAxisLabelFormatCode: '0%' });

// Tabela no estilo do template claro do Grupo Brisa. linhas: arrays de texto; dir: índices alinhados à direita
export const pptTabela = (b, cab, linhas, { larg, dir = [] } = {}) => (s) => {
  const st = { fontFace: b.fontFace, fontSize: 10, color: '1A1A1A', valign: 'middle' };
  const corpo = linhas.map((l, i) => l.map((t, j) => ({ text: String(t), options: { ...st, align: dir.includes(j) ? 'right' : 'left', ...(i % 2 ? {} : { fill: { color: TPL.limaClaro } }) } })));
  s.addTable([cab.map(t => ({ text: t, options: { ...st, bold: true, color: TPL.verde, border: [{ type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }, { type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }] } })), ...corpo],
    { x: b.x, y: b.y, w: b.w, h: 5.3, ...(larg ? { colW: larg } : {}), fontFace: b.fontFace, border: { type: 'none' }, rowH: 0.28, autoPage: linhas.length > 16, autoPageRepeatHeader: true, autoPageSlideStartY: 1.45 });
};
