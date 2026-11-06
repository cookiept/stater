// Painel de uma tab de marca: cabeçalho com chips, upload vazio, "em breve", Resumo e a vista da análise
import { icon } from './icons.js?v=20261106-1230';
import { esc, info } from './ui.js?v=20261106-1230';
import { formatarPeriodo, formatarData } from './excel.js?v=20261106-1230';
import { fmt } from './stats.js?v=20261106-1230';
import { store, meta, ordem } from './store.js?v=20261106-1230';
import { analiseDe, ativa, vistaDe } from './analises.js?v=20261106-1230';
import { tileVars } from './layout.js?v=20261106-1230';

// Como importar: o texto da tab (brands.js → importar) ou o do tipo de análise
const importarDe = (A, tab) => tab?.importar || A.view.importar;

// Aviso de ficheiro errado: o que é o ficheiro, o que falta e em que tab entra
function avisoErro(erro, extra = '') {
  if (!erro) return '';
  const lista = erro.faltas?.length ? `<p class="ae-t">O que falta no ficheiro:</p><ul>${erro.faltas.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  const ir = erro.sugestoes?.length ? `<div class="ae-ir">${erro.sugestoes.map(t => `<a class="btn btn-secondary btn-sm" href="#/${t.b}/${t.id}">Ir para ${esc(t.nome)} ${icon('chevron')}</a>`).join('')}</div>` : '';
  return `<div class="alert error aviso-erro" role="alert">${icon('alert')}<div><b>${esc(erro.ficheiro ? `"${erro.ficheiro}" não serve para esta tab` : 'Este ficheiro não serve para esta tab')}</b><p>${esc(erro.msg)}${extra}</p>${lista}${ir}</div></div>`;
}

// Passos do "Como importar": cada frase do texto é um passo, e o último é sempre carregar aqui
export function passosDe(texto, multi) {
  const frases = texto.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú"])/).map(f => f.replace(/^(em seguida|depois|por fim),\s*/i, '').trim()).filter(Boolean)
    .map(f => f[0].toUpperCase() + f.slice(1));
  return [...frases, multi ? 'Arraste os Excels para aqui (pode ser vários de uma vez) ou escolha-os no computador.' : 'Arraste o Excel para aqui ou escolha-o no computador.'];
}

function painelVazio(A, erro, tab) {
  const multi = A.view.multi;
  const imp = importarDe(A, tab);
  const passos = passosDe(imp.texto, multi);
  return `
    ${avisoErro(erro)}
    <div class="empty">
      <div class="empty-card">
        <div class="drop" id="drop">
          <div class="big">${icon('upload')}</div>
          <h3>${multi ? 'Carrega os Excel desta tab' : 'Carrega o Excel desta tab'}</h3>
          <p>${multi ? `${esc(A.view.multiTexto || 'Um Excel por driver.')} ` : ''}Aceita .xlsx, .xls e .csv.</p>
          <div class="row"><button class="btn btn-primary" data-act="upload">${icon('upload')} Escolher ficheiro</button></div>
        </div>
        <div class="howto">
          <h3>${esc(imp.titulo)}</h3>
          <ol class="passos">${passos.map((p, i) => `<li><span class="passo-n">${i + 1}</span><span>${esc(p)}</span></li>`).join('')}</ol>
        </div>
      </div>
    </div>`;
}

function painelEmBreve(brand, tab) {
  return `<div class="soon-panel">
    <div class="big">${icon(tab.icon)}</div>
    <h3>Disponível na versão final</h3>
    <p>Esta tab mantém o nome e as regras do Stater atual e vai ganhar o mesmo aspeto das outras.</p>
    ${ativa(brand, brand.tabs[0]) ? `<a class="btn btn-secondary" href="#/${brand.id}/${brand.tabs[0].id}">${icon('bars')} Ver ${esc(brand.name)} › NPS</a>` : ''}
  </div>`;
}

// Menu "Exportar": PDF ou PowerPoint (com capa). Também usado na Overview.
export function menuExportar() {
  return `<details class="menu-exp">
    <summary class="btn btn-secondary btn-sm" role="button" aria-haspopup="menu">${icon('download')} Exportar</summary>
    <div class="menu-lista" role="menu">
      <button type="button" role="menuitem" data-act="exp-pdf" title="Abre a janela de impressão: escolhe Guardar como PDF">${icon('print')}<b>PDF</b></button>
      <button type="button" role="menuitem" data-act="exp-tab" title="Com capa e gráficos editáveis">${icon('slides')}<b>PowerPoint</b></button>
    </div>
  </details>`;
}

// Menu "Ficheiro": o Excel desta tab, Substituir/Apagar e como importar
function menuFicheiro(rec, A, m, tab, brand) {
  const imp = importarDe(A, tab);
  return `<details class="menu-exp menu-fich">
    <summary class="btn btn-secondary btn-sm" role="button" aria-haspopup="true">${icon('file')} Ficheiro</summary>
    <div class="menu-lista menu-painel">
      ${A.view.lado ? A.view.lado(rec, m, tab) : `
        <div class="filecard">${icon('file')}<div><div class="fn">${esc(rec.fileName)}</div><div class="fm">Carregado a ${formatarData(rec.savedAt)} · ${esc(formatarPeriodo(rec.data.periodo))}</div></div></div>
        <div class="file-actions">
          <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Substituir</button>
          <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga só o ficheiro desta tab">${icon('trash')} Apagar</button>
        </div>`}
      ${brand && ordem(brand.id, tab.id).length ? `<button type="button" class="btn btn-ghost btn-sm repor" data-act="repor-ordem">${icon('grip')} Repor a ordem dos gráficos</button>` : ''}
      <details class="fold">
        <summary>${icon('chevron')} ${esc(imp.titulo)}</summary>
        <div class="fold-body"><p class="import-txt">${esc(imp.texto)}</p></div>
      </details>
    </div>
  </details>`;
}

// Faixa do Resumo: texto (um ou mais blocos) e cartões com os números-chave
function resumoHtml(r) {
  const blocos = r.blocos || [{ texto: r.texto, tom: r.tom }];
  return `<div class="resumo">
    <h3 class="sec-title">Resumo</h3>
    ${blocos.map(b => `<div class="rs-bloco ${b.tom || ''}">${b.titulo ? `<b class="rs-t">${b.titulo}</b>` : ''}<p>${b.texto}</p></div>`).join('')}
    ${r.factos ? `<div class="rs-factos">${r.factos.map(f => `<div class="rs-f ${f.tom || ''}">${f.tip ? `<span class="rs-i">${info(f.rot, f.tip)}</span>` : ''}<b class="num">${f.valor}</b><span>${f.rot}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

export function painel(brand, tab, erro) {
  const A = analiseDe(tab);
  const rec = vistaDe(A, store.get(brand.id, tab.id));
  const head = (chipsHtml = '') => `
    <div class="panel-head">
      <span class="tile" style="${tileVars(brand)}">${icon(tab.icon)}</span>
      <h2>${esc(tab.name)}</h2>
      <div class="chips">${chipsHtml}</div>
    </div>`;
  if (tab.off) return `<section class="panel">${head()}<div class="soon-panel"><div class="big">${icon(tab.icon)}</div><h3>Tab desativada</h3><p>${esc(tab.off)}</p></div></section>`;
  if (!ativa(brand, tab)) return `<section class="panel">${head()}${painelEmBreve(brand, tab)}</section>`;
  if (!rec) return `<section class="panel">${head()}${painelVazio(A, erro, tab)}</section>`;

  const m = meta(brand.id);
  const ch = A.view.chips(rec, tab);
  const chipsHtml = `
    ${rec.exemplo ? `<span class="chip" style="background:#ece7fb;color:#4b2a9c">${icon('sparkle')} Dados de exemplo</span>` : ''}
    <span class="chip">${icon('calendar')} Período em análise <b class="chip brand" style="padding:2px 8px">${esc(formatarPeriodo(rec.data.periodo))}</b> ${info('Período em análise', `De ${formatarPeriodo(rec.data.periodo).replace(' – ', ' a ')}. São as datas do filtro usado no Qualtrics ao exportar o Excel "${rec.fileName}", não a data em que o ficheiro foi carregado (${formatarData(rec.savedAt)}).`)}</span>
    <span class="chip">${icon('users')} ${ch.rotulo || 'Respostas'} <b class="num">${fmt(ch.respostas)}</b></span>
    ${menuFicheiro(rec, A, m, tab, brand)}
    ${menuExportar()}`;
  return `<section class="panel">
    ${head(chipsHtml)}
    ${avisoErro(erro, ' Os dados anteriores continuam.')}
    <div class="panel-body so-main">
      <div class="panel-main">
        ${resumoHtml(A.view.resumo(rec, m, tab))}
        ${A.view.html(rec, m, tab)}
      </div>
    </div>
  </section>`;
}
