// Exportar para PowerPoint e PDF.
// PowerPoint: os gráficos vão como gráficos nativos (clicar com o botão direito > Editar dados no PowerPoint).
// PDF: usa a impressão do browser ("Guardar como PDF"), com estilos de impressão em css/app.css.
// O PptxGenJS (vendor/) só é carregado quando alguém exporta.

let pedido = null;
function biblioteca() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  pedido ??= new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = 'vendor/pptxgenjs-4.0.1.bundle.js';
    s.onload = () => ok(window.PptxGenJS);
    s.onerror = () => { pedido = null; falha(new Error('Não consegui carregar o exportador de PowerPoint. Recarrega a página e tenta de novo.')); };
    document.head.appendChild(s);
  });
  return pedido;
}

export const hex = c => String(c).replace('#', '').toUpperCase();
export const fonte = b => b.font.replace(/"/g, '');
export const textoDe = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };

// Área útil de cada slide (16:9, polegadas)
export const AREA = { x: 0.5, y: 1.45, w: 12.33, h: 5.45 };

// Opções comuns dos gráficos, com a fonte da marca
export function baseGrafico(b) {
  return {
    ...AREA,
    fontFace: fonte(b),
    catAxisLabelColor: '494949', catAxisLabelFontSize: 11, catAxisLabelFontFace: fonte(b),
    valAxisLabelColor: '767676', valAxisLabelFontSize: 10, valAxisLabelFontFace: fonte(b),
    valGridLine: { color: 'EFEFEF', size: 0.75 }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 'b', legendFontSize: 11, legendFontFace: fonte(b), legendColor: '494949',
    dataLabelFontSize: 10, dataLabelColor: '494949', dataLabelFontFace: fonte(b),
  };
}

function novo(P, b) {
  const p = new P();
  p.layout = 'LAYOUT_WIDE';
  p.author = 'Stater';
  p.company = 'Grupo Brisa';
  p.theme = { headFontFace: fonte(b), bodyFontFace: fonte(b) };
  return p;
}

// Slide com título, subtítulo e a faixa da cor da marca
export function slide(p, b, titulo, sub) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: hex(b.colors.main) }, line: { color: hex(b.colors.main), width: 0 } });
  s.addText(titulo, { x: 0.5, y: 0.3, w: 12.33, h: 0.6, fontSize: 24, bold: true, color: '1A1A1A', fontFace: fonte(b), margin: 0 });
  if (sub) s.addText(sub, { x: 0.5, y: 0.88, w: 12.33, h: 0.35, fontSize: 12, color: '767676', fontFace: fonte(b), margin: 0 });
  s.addText('Stater · Grupo Brisa', { x: 0.5, y: 7.08, w: 6, h: 0.28, fontSize: 9, color: '9A9A9A', fontFace: fonte(b), margin: 0 });
  return s;
}

// Primeiro slide de uma tab: números principais, resumo e filtros
function capa(p, b, tab, e, sub) {
  const s = slide(p, b, `${b.name} · ${tab.name}`, sub);
  const n = Math.min(e.kpis.length, 6);
  const gap = 0.16, w = (AREA.w - gap * (n - 1)) / n;
  e.kpis.slice(0, 6).forEach((k, i) => {
    const x = AREA.x + i * (w + gap), escuro = i === 0;
    s.addShape(p.ShapeType.roundRect, { x, y: 1.5, w, h: 1.25, rectRadius: 0.08, fill: { color: escuro ? hex(b.colors.darkest) : 'F6F6F4' }, line: { color: escuro ? hex(b.colors.darkest) : 'F6F6F4', width: 0 } });
    s.addText([
      { text: k.rot.toUpperCase(), options: { fontSize: 9, bold: true, color: escuro ? 'D0D7DC' : '767676', breakLine: true } },
      { text: k.val, options: { fontSize: 26, bold: true, color: escuro ? 'FFFFFF' : '1A1A1A', breakLine: true } },
      { text: k.det || '', options: { fontSize: 9, color: escuro ? 'D0D7DC' : '767676' } },
    ], { x: x + 0.1, y: 1.55, w: w - 0.2, h: 1.15, fontFace: fonte(b), valign: 'middle', margin: 4 });
  });
  s.addText('RESUMO', { x: AREA.x, y: 3.05, w: 6, h: 0.3, fontSize: 10, bold: true, color: '767676', fontFace: fonte(b), margin: 0 });
  s.addText(e.resumo.map(t => ({ text: t, options: { bullet: e.resumo.length > 1, breakLine: true, paraSpaceAfter: 6 } })),
    { x: AREA.x, y: 3.38, w: AREA.w, h: 2.6, fontSize: 13, color: '333333', fontFace: fonte(b), valign: 'top', margin: 0 });
  if (e.filtros?.length) {
    s.addText(`Filtros da extração: ${e.filtros.map(f => (f.campo ? `${f.campo} ${f.valor}` : f.valor)).join(' · ')}`,
      { x: AREA.x, y: 6.4, w: AREA.w, h: 0.4, fontSize: 10, color: '767676', fontFace: fonte(b), margin: 0 });
  }
  return s;
}

const nomeFicheiro = partes => `Stater - ${partes.join(' - ')}.pptx`.replace(/[\\/:*?"<>|]/g, '');

// Um gráfico, um slide
export async function exportarGrafico(b, tab, e, id, sub) {
  const P = await biblioteca();
  const p = novo(P, b);
  const g = e.graficos.find(x => x.id === id);
  g.desenhar(slide(p, b, g.titulo, `${b.name} · ${tab.name}${sub ? ` · ${sub}` : ''}`), p);
  await p.writeFile({ fileName: nomeFicheiro([b.name, tab.name, g.titulo]) });
}

function juntarTab(p, b, tab, e, sub) {
  capa(p, b, tab, e, sub);
  for (const g of e.graficos) g.desenhar(slide(p, b, g.titulo, `${b.name} · ${tab.name}${sub ? ` · ${sub}` : ''}`), p);
}

export async function exportarTab(b, tab, e, sub) {
  const P = await biblioteca();
  const p = novo(P, b);
  capaRelatorio(p, b, `${b.name} · ${tab.name}`, sub);
  juntarTab(p, b, tab, e, sub);
  await p.writeFile({ fileName: nomeFicheiro([b.name, tab.name]) });
}

// Capa: fundo escuro da marca, título, subtítulo e data
function capaRelatorio(p, b, titulo, sub) {
  const s = p.addSlide();
  s.background = { color: hex(b.colors.darkest) };
  s.addShape(p.ShapeType.rect, { x: 0, y: 7.2, w: 13.33, h: 0.3, fill: { color: hex(b.colors.main) }, line: { color: hex(b.colors.main), width: 0 } });
  s.addText(titulo, { x: 0.8, y: 2.5, w: 11.7, h: 1.1, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: fonte(b), margin: 0 });
  if (sub) s.addText(sub, { x: 0.8, y: 3.6, w: 11.7, h: 0.5, fontSize: 18, color: 'D0D7DC', fontFace: fonte(b), margin: 0 });
  s.addText(`Stater · Grupo Brisa · ${new Date().toLocaleDateString('pt-PT')}`, { x: 0.8, y: 6.5, w: 11.7, h: 0.4, fontSize: 11, color: 'D0D7DC', fontFace: fonte(b), margin: 0 });
}

// Overview: capa e um slide com o gráfico NPS vs meta
export async function exportarOverview(grupo, dados, alertas) {
  const P = await biblioteca();
  const p = novo(P, grupo);
  capaRelatorio(p, grupo, 'Overview do Grupo Brisa', 'NPS de cada marca face à meta');
  const s = slide(p, grupo, 'NPS vs meta por marca', `Overview do Grupo Brisa · ${new Date().toLocaleDateString('pt-PT')}`);
  const com = dados.filter(d => d.r);
  s.addChart(p.ChartType.bar, [
    { name: 'NPS', labels: com.map(d => d.b.name), values: com.map(d => d.r.nps) },
    { name: 'Meta', labels: com.map(d => d.b.name), values: com.map(d => d.m) },
  ], { ...baseGrafico(grupo), barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60, chartColors: ['22A03B', 'D6DDE3'], showValue: true, valAxisMinVal: -100, valAxisMaxVal: 100, valAxisMajorUnit: 20 });
  await p.writeFile({ fileName: nomeFicheiro(['Overview']) });
}

// PDF: o browser abre a janela de impressão; aí escolhe-se "Guardar como PDF"
export function imprimir() {
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => window.print(), 150);
}
