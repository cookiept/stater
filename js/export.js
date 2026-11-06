// Exportar para PowerPoint e PDF.
// PowerPoint: os gráficos vão como gráficos nativos (clicar com o botão direito > Editar dados no PowerPoint).
// PDF: usa a impressão do browser ("Guardar como PDF"), com estilos de impressão em css/app.css.
// O PptxGenJS (vendor/) só é carregado quando alguém exporta.
import { pelaOrdem } from './arrastar.js?v=20261106-1259';

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
// Template claro do Grupo Brisa: títulos em Prometo, texto em Verdana, azul 1B93BE
export const TPL = { titulo: 'Prometo', texto: 'Verdana', azul: '1B93BE', verde: '006531', lima: 'ABBF08', limaClaro: 'F2F5DC', cinza: '595959', claro: 'EEF6F9' };
const IMG = { logo: 'assets/pptx/brisa-group.png', logoPeq: 'assets/pptx/brisa-group-pequeno.png', linhas: 'assets/pptx/linhas-capa.png' };
export const fonte = () => TPL.texto;
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
  p.theme = { headFontFace: TPL.titulo, bodyFontFace: TPL.texto };
  return p;
}

// Slide de conteúdo do template: título azul, subtítulo cinzento, logótipo pequeno em cima à direita e número da página
export function slide(p, b, titulo, sub) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  s.addImage({ path: IMG.logoPeq, x: 11.9, y: 0.32, w: 0.95, h: 0.156 });
  s.addText(titulo, { x: 0.5, y: 0.3, w: 11, h: 0.6, fontSize: 26, color: TPL.azul, fontFace: TPL.titulo, margin: 0 });
  if (sub) s.addText(sub, { x: 0.5, y: 0.9, w: 11, h: 0.4, fontSize: 15, color: TPL.cinza, fontFace: TPL.titulo, margin: 0 });
  s.slideNumber = { x: 12.55, y: 7.0, w: 0.5, h: 0.3, fontSize: 9, color: '9A9A9A', fontFace: TPL.texto, align: 'right' };
  return s;
}

// Primeiro slide de uma tab: números principais, resumo e filtros
function capa(p, b, tab, e, sub) {
  const s = slide(p, b, `${b.name} · ${tab.name}`, sub);
  const n = Math.min(e.kpis.length, 6);
  const gap = 0.16, w = (AREA.w - gap * (n - 1)) / n;
  e.kpis.slice(0, 6).forEach((k, i) => {
    const x = AREA.x + i * (w + gap), escuro = i === 0;
    s.addShape(p.ShapeType.roundRect, { x, y: 1.5, w, h: 1.25, rectRadius: 0.08, fill: { color: escuro ? TPL.azul : TPL.claro }, line: { color: escuro ? TPL.azul : TPL.claro, width: 0 } });
    s.addText([
      { text: k.rot.toUpperCase(), options: { fontSize: 9, bold: true, color: escuro ? 'E6F3F8' : '595959', breakLine: true } },
      { text: k.val, options: { fontSize: 26, bold: true, color: escuro ? 'FFFFFF' : '1A1A1A', breakLine: true } },
      { text: k.det || '', options: { fontSize: 9, color: escuro ? 'E6F3F8' : '595959' } },
    ], { x: x + 0.1, y: 1.55, w: w - 0.2, h: 1.15, fontFace: fonte(b), valign: 'middle', margin: 4 });
  });
  s.addText('Resumo', { x: AREA.x, y: 3.05, w: 6, h: 0.3, fontSize: 13, bold: true, color: TPL.azul, fontFace: TPL.titulo, margin: 0 });
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
  for (const g of pelaOrdem(e.graficos, b.id, tab.id)) g.desenhar(slide(p, b, g.titulo, `${b.name} · ${tab.name}${sub ? ` · ${sub}` : ''}`), p);
}

export async function exportarTab(b, tab, e, sub) {
  const P = await biblioteca();
  const p = novo(P, b);
  capaRelatorio(p, b, `${b.name} · ${tab.name}`, sub);
  juntarTab(p, b, tab, e, sub);
  encerramento(p);
  await p.writeFile({ fileName: nomeFicheiro([b.name, tab.name]) });
}

// Capa do template claro: linhas coloridas à esquerda, logótipo Brisa Group à direita, título azul
function capaRelatorio(p, b, titulo, sub) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  s.addImage({ path: IMG.linhas, x: 0, y: 0, w: 7.4, h: 7.5 });
  s.addImage({ path: IMG.logo, x: 8.15, y: 0.75, w: 4.3, h: 1.11 });
  s.addText(titulo, { x: 8.1, y: 3.55, w: 4.9, h: 1.3, fontSize: 30, color: TPL.azul, fontFace: TPL.titulo, valign: 'bottom', margin: 0 });
  if (sub) s.addText(sub, { x: 8.1, y: 4.95, w: 4.9, h: 0.5, fontSize: 16, color: '7F7F7F', fontFace: TPL.titulo, margin: 0 });
  s.addText(`Stater · ${new Date().toLocaleDateString('pt-PT')}`, { x: 8.1, y: 6.45, w: 4.9, h: 0.3, fontSize: 9, color: '7F7F7F', fontFace: TPL.texto, margin: 0 });
}

// Último slide do template: logótipo ao centro
function encerramento(p) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  s.addImage({ path: IMG.logo, x: 4.52, y: 2.4, w: 4.3, h: 1.11 });
  s.addText('Relatório gerado no Stater', { x: 3.67, y: 4.2, w: 6, h: 0.4, fontSize: 16, color: 'FF9E0E', fontFace: TPL.titulo, align: 'center', margin: 0 });
}

// Overview: capa e um slide com o gráfico NPS vs objetivo
export async function exportarOverview(grupo, dados) {
  const P = await biblioteca();
  const p = novo(P, grupo);
  capaRelatorio(p, grupo, 'Overview do Grupo Brisa', 'NPS de cada marca face ao objetivo');
  const s = slide(p, grupo, 'NPS vs objetivo por marca', `Overview do Grupo Brisa · ${new Date().toLocaleDateString('pt-PT')}`);
  const com = dados.filter(d => d.r);
  s.addChart(p.ChartType.bar, [
    { name: 'NPS', labels: com.map(d => d.b.name), values: com.map(d => d.r.nps) },
    { name: 'Objetivo', labels: com.map(d => d.b.name), values: com.map(d => d.m) },
  ], { ...baseGrafico(grupo), barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60, chartColors: ['22A03B', 'D6DDE3'], showValue: true, valAxisMinVal: -100, valAxisMaxVal: 100, valAxisMajorUnit: 20 });
  encerramento(p);
  await p.writeFile({ fileName: nomeFicheiro(['Overview']) });
}

// PDF: o browser abre a janela de impressão; aí escolhe-se "Guardar como PDF"
export function imprimir() {
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => window.print(), 150);
}
