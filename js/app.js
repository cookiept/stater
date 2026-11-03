// Stater · protótipo. Uma página, menu de marcas à esquerda, cada tab lê o seu Excel.
import { BRANDS, GROUP, brandById, applyTheme } from './brands.js?v=20261103-1551';
import { icon } from './icons.js?v=20261103-1551';
import { logo } from './logos.js?v=20261103-1551';
import { esc, info, def, ligarTooltips, toast, confirmar } from './ui.js?v=20261103-1551';
import { lerPrimeiraFolha, parseNps, parseCausas, FicheiroErrado, formatarPeriodo, formatarData, identificar, TIPOS } from './excel.js?v=20261103-1551';
import { resumoNps, fmt, sinal, LIMITES, CORES, corMeta, enriquecerCausas, causasFiaveis, destaques } from './stats.js?v=20261103-1551';
import { exportarGrafico, exportarTab, exportarOverview, imprimir } from './export.js?v=20261103-1551';
import { limparGraficos, base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL } from './charts.js?v=20261103-1551';
import * as vNps from './views/nps.js?v=20261103-1551';
import * as vCausas from './views/causas.js?v=20261103-1551';
import * as vMolho from './views/molho.js?v=20261103-1551';
import { exemplos } from './exemplo.js?v=20261103-1551';

// Tabs que funcionam no protótipo
const ANALISES = {
  nps: { parse: parseNps, view: vNps },
  'causa-raiz': { parse: parseCausas, view: vCausas },
  molho: { parse: parseCausas, view: vMolho },
};
// Uma tab funciona se tiver análise e estiver marcada como live em brands.js
const ativa = (b, t) => !!(b && t && t.live && ANALISES[t.id]);

// ---------- Guardar no browser ----------
const chave = (b, t) => `stater:v1:${b}:${t}`;
const store = {
  get(b, t) { try { return JSON.parse(localStorage.getItem(chave(b, t))); } catch { return null; } },
  set(b, t, v) { localStorage.setItem(chave(b, t), JSON.stringify(v)); },
  del(b, t) { localStorage.removeItem(chave(b, t)); },
};
const meta = id => { const v = parseInt(localStorage.getItem(`stater:v1:meta:${id}`), 10); return Number.isFinite(v) ? v : (brandById(id)?.target ?? 60); };

// ---------- Alertas abaixo da meta (marca, driver e causa raiz) ----------
// Drivers e causas usam a meta da marca. Causas com menos de 30 menções e "Outra"/"Sem sugestões" não contam.
function alertasDe(b) {
  const m = meta(b.id), out = [];
  const add = (tipo, nome, nps, tab) => out.push({ marca: b.name, b, tipo, nome, nps, meta: m, href: `#/${b.id}/${tab}` });
  const tem = id => b.tabs.some(t => t.id === id && ativa(b, t));
  const nps = tem('nps') && store.get(b.id, 'nps');
  if (nps) { const r = resumoNps(nps.data.contagens); if (r.nps < m) add('Marca', 'NPS da marca', r.nps, 'nps'); }
  const molho = tem('molho') && store.get(b.id, 'molho');
  if (molho) {
    for (const f of molho.data.ficheiros) { const g = vCausas.npsGlobal(f); if (g && g.nps < m) add('Driver', f.driver, g.nps, 'molho'); }
    const cs = enriquecerCausas(molho.data.ficheiros.flatMap(f => f.causas.map(c => ({ ...c, driver: f.driver }))));
    for (const c of causasFiaveis(cs)) if (c.nps < m) add('Causa raiz', `${c.nome} (${c.driver})`, c.nps, 'molho');
  }
  const causa = tem('causa-raiz') && store.get(b.id, 'causa-raiz');
  if (causa) for (const c of causasFiaveis(enriquecerCausas(causa.data.causas))) if (c.nps < m && !out.some(a => a.nome.startsWith(c.nome + ' ('))) add('Causa raiz', c.nome, c.nps, 'causa-raiz');
  return out;
}
const todosAlertas = () => BRANDS.flatMap(alertasDe);

// ---------- Estado ----------
let erro = null;
const rota = () => {
  const [, b, t] = location.hash.replace(/^#\/?/, '#/').split('/');
  const brand = brandById(b);
  if (!brand) return { brand: null, tab: null };
  const tab = brand.tabs.find(x => x.id === t) || brand.tabs[0];
  return { brand, tab };
};
// Marcas com a lista de tabs aberta no menu (guardado só neste browser)
const CHAVE_ABERTAS = 'stater:v1:ui:abertas';
const abertas = new Set((() => { try { return JSON.parse(localStorage.getItem(CHAVE_ABERTAS)) || []; } catch { return []; } })());
const guardarAbertas = () => { try { localStorage.setItem(CHAVE_ABERTAS, JSON.stringify([...abertas])); } catch {} };

const ir = (b, t) => { location.hash = b ? `#/${b}/${t}` : '#/'; };

// ---------- Menu lateral ----------
function tileVars(b) {
  return `--tile-bg:${b.colors.main};--tile-on:${b.colors.on};--tile-soft:${b.colors.lightest};--tile-ink:${b.colors.darkest}`;
}

function sidebar({ brand, tab }) {
  const itens = BRANDS.map(b => {
    const atual = brand?.id === b.id;
    const aberta = abertas.has(b.id);
    const sub = aberta ? `<div class="sb-sub-nav" id="tabs-${b.id}">${b.tabs.map(t => `
        <a class="sb-tab" href="#/${b.id}/${t.id}" ${atual && tab?.id === t.id ? 'aria-current="page"' : ''}>${icon(t.icon)}<span class="lbl" title="${esc(t.name)}">${esc(t.name)}</span>${store.get(b.id, t.id) ? '<span class="dot" title="Com dados"></span>' : ''}</a>`).join('')}</div>` : '';
    return `<div class="sb-row" style="${tileVars(b)}">
        <a class="sb-item${atual ? ' is-open' : ''}" href="#/${b.id}/${b.tabs[0].id}">
        <span class="tile mark">${logo(b.icon)}</span><span class="nm" title="${esc(b.name)}">${esc(b.name)}</span><span class="count" title="${b.tabs.length} tabs">${b.tabs.length}</span></a>
        <button class="sb-toggle" data-toggle="${b.id}" aria-expanded="${aberta}" aria-controls="tabs-${b.id}" aria-label="${aberta ? 'Fechar' : 'Abrir'} tabs de ${esc(b.name)}">${icon('chevron')}</button>
      </div>${sub}`;
  }).join('');
  return `
    <div class="sb-head"><img class="sb-mark" src="assets/stater-mark.svg?v=4" alt="" width="34" height="37"><div class="sb-title">Stater</div></div>
    <div>
      <div class="sb-label">Marcas</div>
      <nav class="sb-nav" aria-label="Marcas">
        <a class="sb-item sb-ov${!brand ? ' is-open' : ''}" href="#/" style="${tileVars(GROUP)}" ${!brand ? 'aria-current="page"' : ''}><span class="tile mark">${logo('grupo')}</span><span>Overview</span><span class="count">grupo</span></a>
        ${itens}
      </nav>
    </div>
    <div class="sb-foot">
      <div class="sb-note">${icon('lock')} Os dados ficam só neste browser.</div>
    </div>`;
}

// ---------- Barra de topo ----------
function topbar({ brand, tab }) {
  const rec = brand && tab ? store.get(brand.id, tab.id) : null;
  const crumbs = brand
    ? `<span>Stater</span>${icon('chevron')}<span>${esc(brand.name)}</span>${icon('chevron')}<b>${esc(tab.name)}</b>`
    : `<span>Stater</span>${icon('chevron')}<b>Overview</b>`;
  return `
    <nav class="crumbs" aria-label="Onde estás">${crumbs}</nav>
    <div class="spacer"></div>
    ${rec ? `<span class="updated">Atualizado a ${formatarData(rec.savedAt)}</span>` : ''}
`;
}

// ---------- Painel da tab ----------
// Aviso de ficheiro errado: o que é o ficheiro, o que falta e em que tab entra
function avisoErro(extra = '') {
  if (!erro) return '';
  const lista = erro.faltas?.length ? `<p class="ae-t">O que falta no ficheiro:</p><ul>${erro.faltas.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  const ir = erro.sugestoes?.length ? `<div class="ae-ir">${erro.sugestoes.map(t => `<a class="btn btn-secondary btn-sm" href="#/${t.b}/${t.id}">Ir para ${esc(t.nome)} ${icon('chevron')}</a>`).join('')}</div>` : '';
  return `<div class="alert error aviso-erro" role="alert">${icon('alert')}<div><b>${esc(erro.ficheiro ? `"${erro.ficheiro}" não serve para esta tab` : 'Este ficheiro não serve para esta tab')}</b><p>${esc(erro.msg)}${extra}</p>${lista}${ir}</div></div>`;
}

function painelVazio(brand, tab, A) {
  const multi = A.view.multi;
  return `
    ${avisoErro()}
    <div class="empty">
      <div class="drop" id="drop">
        <div class="big">${icon('upload')}</div>
        <h3>${multi ? 'Carrega os Excel dos drivers' : 'Carrega o Excel desta tab'}</h3>
        <p>${multi ? 'Um Excel por driver. Podes escolher ou arrastar vários de uma vez.' : 'Arrasta o ficheiro para aqui ou escolhe-o no computador.'} Aceita .xlsx, .xls e .csv.</p>
        <div class="row">
          <button class="btn btn-primary" data-act="upload">${icon('upload')} Escolher ficheiro</button>
          <button class="btn btn-secondary" data-act="sample">${icon('sparkle')} Ver com dados de exemplo</button>
        </div>
      </div>
      <div class="howto">
        <h3>${esc(A.view.importar.titulo)}</h3>
        <p class="import-txt">${esc(A.view.importar.texto)}</p>
        <div class="alert alert-info" style="margin-top:16px">${icon('lock')}<div>O ficheiro é lido só neste browser. Nada é enviado para a internet.</div></div>
      </div>
    </div>`;
}

function painelEmBreve(brand, tab) {
  return `<div class="soon-panel">
    <div class="big">${icon(tab.icon)}</div>
    <h3>Disponível na versão final</h3>
    <p>Neste protótipo funcionam a tab <b>NPS</b> de cada marca (menos a Nedlinq) e a <b>NPS por Causa Raiz</b> da Colibri. Esta tab mantém o nome e as regras do Stater atual e vai ganhar o mesmo aspeto.</p>
    ${ativa(brand, brand.tabs[0]) ? `<a class="btn btn-secondary" href="#/${brand.id}/${brand.tabs[0].id}">${icon('bars')} Ver ${esc(brand.name)} › NPS</a>` : ''}
  </div>`;
}

// Filtros usados no Qualtrics, lidos do topo do Excel
function filtrosHtml(rec) {
  const fs = rec.data.filtros;
  if (!fs) return '';
  return `<div class="side-block filtros">
    <h3 class="sec-title">Filtros da extração ${def('filtros')}</h3>
    ${fs.length ? `<ul class="flt">${fs.map(f => `<li>${f.campo ? `<span>${esc(f.campo)}</span>` : ''}<b>${esc(f.valor)}</b></li>`).join('')}</ul>` : '<p class="muted flt-vazio">Sem filtros: o Excel inclui todas as respostas.</p>'}
    ${rec.data.pergunta ? `<p class="flt-q"><span>Pergunta</span>${esc(rec.data.pergunta)}</p>` : ''}
  </div>`;
}

// Menu "Exportar": PDF ou PowerPoint (com capa)
function menuExportar() {
  return `<details class="menu-exp">
    <summary class="btn btn-secondary btn-sm" role="button" aria-haspopup="menu">${icon('download')} Exportar</summary>
    <div class="menu-lista" role="menu">
      <button type="button" role="menuitem" data-act="exp-pdf" title="Abre a janela de impressão: escolhe Guardar como PDF">${icon('print')}<b>PDF</b></button>
      <button type="button" role="menuitem" data-act="exp-tab" title="Com capa e gráficos editáveis">${icon('slides')}<b>PowerPoint</b></button>
    </div>
  </details>`;
}

// Menu "Ficheiro": o Excel desta tab, Substituir/Apagar e como importar (antes na coluna da esquerda)
function menuFicheiro(rec, A, m) {
  return `<details class="menu-exp menu-fich">
    <summary class="btn btn-secondary btn-sm" role="button" aria-haspopup="true">${icon('file')} Ficheiro</summary>
    <div class="menu-lista menu-painel">
      ${A.view.lado ? A.view.lado(rec, m) : `
        <div class="filecard">${icon('file')}<div><div class="fn">${esc(rec.fileName)}</div><div class="fm">Carregado a ${formatarData(rec.savedAt)} · ${esc(formatarPeriodo(rec.data.periodo))}</div></div></div>
        <div class="file-actions">
          <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Substituir</button>
          <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga só o ficheiro desta tab">${icon('trash')} Apagar</button>
        </div>`}
      <details class="fold">
        <summary>${icon('chevron')} ${esc(A.view.importar.titulo)}</summary>
        <div class="fold-body"><p class="import-txt">${esc(A.view.importar.texto)}</p></div>
      </details>
    </div>
  </details>`;
}

const TIP_REGRAS = 'O texto sai de regras fixas aplicadas aos números do Excel, as mesmas do Stater atual. Não há opinião nem IA: as mesmas contas dão sempre as mesmas frases.';

function resumoHtml(r) {
  const blocos = r.blocos || [{ texto: r.texto, tom: r.tom }];
  return `<div class="resumo">
    <h3 class="sec-title">Resumo <span class="badge" data-tip-title="Regras fixas" data-tip="${TIP_REGRAS}" tabindex="0">Regras fixas</span></h3>
    ${blocos.map(b => `<div class="rs-bloco ${b.tom || ''}">${b.titulo ? `<b class="rs-t">${b.titulo}</b>` : ''}<p>${b.texto}</p></div>`).join('')}
    ${r.factos ? `<div class="rs-factos">${r.factos.map(f => `<div class="rs-f ${f.tom || ''}">${f.tip ? `<span class="rs-i">${info(f.rot, f.tip)}</span>` : ''}<b class="num">${f.valor}</b><span>${f.rot}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

function painel(brand, tab) {
  const A = ANALISES[tab.id];
  const live = ativa(brand, tab);
  const rec = store.get(brand.id, tab.id);
  const head = (chipsHtml = '') => `
    <div class="panel-head">
      <span class="tile" style="${tileVars(brand)}">${icon(tab.icon)}</span>
      <h2>${esc(tab.name)}</h2>
      <div class="chips">${chipsHtml}</div>
    </div>`;
  if (!live) return `<section class="panel">${head()}${painelEmBreve(brand, tab)}</section>`;
  if (!rec) return `<section class="panel">${head()}${painelVazio(brand, tab, A)}</section>`;

  const m = meta(brand.id);
  const ch = A.view.chips(rec);
  const chipsHtml = `
    ${rec.exemplo ? `<span class="chip" style="background:#ece7fb;color:#4b2a9c">${icon('sparkle')} Dados de exemplo</span>` : ''}
    <span class="chip">${icon('calendar')} Período em análise <b class="chip brand" style="padding:2px 8px">${esc(formatarPeriodo(rec.data.periodo))}</b> ${def('periodo')}</span>
    <span class="chip">${icon('users')} ${ch.rotulo || 'Respostas'} <b class="num">${fmt(ch.respostas)}</b></span>
    ${menuFicheiro(rec, A, m)}
    ${menuExportar()}`;
  return `<section class="panel">
    ${head(chipsHtml)}
    ${avisoErro(' Os dados anteriores continuam.')}
    <div class="panel-body so-main">
      <div class="panel-main">
        ${resumoHtml(A.view.resumo(rec, m))}
        ${A.view.html(rec, m)}
      </div>
    </div>
  </section>`;
}

// ---------- Metas ----------
const dataMetas = () => localStorage.getItem('stater:v1:meta-data');

function editarMetas() {
  const d = document.createElement('dialog');
  d.className = 'dlg-metas';
  d.innerHTML = `<form method="dialog">
    <h3>Metas de NPS</h3>
    <p>Valor de −100 a 100 para cada marca. Usado na Overview e no resumo da tab NPS.</p>
    <div class="metas-lista">${BRANDS.map(b => `
      <label class="meta-linha"><span class="tile mark">${logo(b.icon)}</span><span>${esc(b.name)}</span>
        <input name="${b.id}" type="number" min="-100" max="100" step="1" required value="${meta(b.id)}"></label>`).join('')}
    </div>
    <div class="row"><button class="btn btn-secondary" value="no" formnovalidate>Cancelar</button><button class="btn btn-primary" value="yes">Guardar metas</button></div>
  </form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'yes') {
      new FormData(d.querySelector('form')).forEach((v, id) => {
        const n = Math.max(-100, Math.min(100, parseInt(v, 10)));
        if (Number.isFinite(n)) localStorage.setItem(`stater:v1:meta:${id}`, String(n));
      });
      localStorage.setItem('stater:v1:meta-data', new Date().toISOString());
      toast('Metas guardadas.');
      render();
    }
    d.remove();
  });
  d.showModal();
}

// ---------- Overview (Grupo Brisa) ----------
function dadosOverview() {
  return BRANDS.map(b => {
    const rec = ativa(b, b.tabs[0]) ? store.get(b.id, 'nps') : null;
    const cau = ['molho', 'causa-raiz'].map(id => b.tabs.some(t => t.id === id && ativa(b, t)) && store.get(b.id, id)).find(Boolean);
    let pior = null;
    if (cau) {
      const cs = cau.data.ficheiros ? enriquecerCausas(cau.data.ficheiros.flatMap(f => f.causas.map(c => ({ ...c, driver: f.driver })))) : enriquecerCausas(cau.data.causas);
      pior = destaques(cs).pior || null;
    }
    const comDados = b.tabs.filter(t => ativa(b, t) && store.get(b.id, t.id)).length;
    const vivas = b.tabs.filter(t => ativa(b, t)).length;
    return { b, rec, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id), pior, comDados, vivas, alertas: alertasDe(b) };
  });
}

function overview() {
  const dados = dadosOverview();
  const comDados = dados.filter(d => d.r);
  const totalResp = comDados.reduce((a, d) => a + d.r.total, 0);
  const acima = comDados.filter(d => d.r.nps >= d.m).length;
  const alertas = dados.flatMap(d => d.alertas);
  const tabsCom = dados.reduce((a, d) => a + d.comDados, 0), tabsVivas = dados.reduce((a, d) => a + d.vivas, 0);
  const kpi = (rot, val, det, k, hero = false) => `<div class="kpi${hero ? ' hero' : ''}"><span class="kl">${rot} ${k}</span><span class="kv num">${val}</span><span class="kd">${det}</span></div>`;
  const porTipo = t => alertas.filter(a => a.tipo === t).length;
  return `
    <section class="ov-hero">
      <span class="ov-blob o" aria-hidden="true"></span><span class="ov-blob l" aria-hidden="true"></span><span class="ov-blob g" aria-hidden="true"></span><span class="ov-blob c" aria-hidden="true"></span>
      <div class="ov-txt">
        <h1>Overview do Grupo Brisa</h1>
        <p>O NPS de cada marca face à sua meta. Os números vêm da tab NPS de cada marca; as metas definem-se aqui.</p>
      </div>
      <img class="ov-logo" src="assets/grupo-brisa-branco.png" alt="Grupo Brisa" width="640" height="498">
      <span class="ov-faixa" aria-hidden="true"></span>
    </section>
    <div class="ov-bar">
      <h2>Marcas</h2>
      <span class="muted">${comDados.length} de ${BRANDS.length} com dados${totalResp ? ` · ${fmt(totalResp)} respostas` : ''}</span>
      <span class="sep"></span>
      ${dataMetas() ? `<span class="muted">Metas atualizadas a ${formatarData(dataMetas())}</span>` : ''}
      <button class="btn btn-secondary btn-sm" data-act="metas">${icon('pencil')} Editar metas</button>
      ${menuExportar()}
    </div>
    <div class="ov-grid">${dados.map(({ b, rec, r, m, pior, comDados: n, vivas, alertas: al }) => `
      <div class="ov-card" style="${tileVars(b)};--font-b:${b.font}, 'Noto Sans', sans-serif">
        <div class="top"><span class="tile mark">${logo(b.icon)}</span><b>${esc(b.name)}</b>
          ${r ? `<span class="badge ${r.nps >= m ? 'good' : 'bad'}" title="${r.nps >= m ? 'Meta atingida' : 'Abaixo da meta'}">${sinal(r.nps - m)} vs meta</span>` : '<span class="badge">Sem dados</span>'}</div>
        ${r ? `<div class="val"><b class="num">${fmt(r.nps)}</b><span class="muted">NPS · ${fmt(r.total)} respostas</span></div>
          <div class="compo" style="height:10px" aria-hidden="true"><div class="d" style="flex:${r.pctD}"></div><div class="n" style="flex:${r.pctN}"></div><div class="p" style="flex:${r.pctP}"></div></div>
          <div class="ov-dnp num"><span><i class="d"></i>Detratores ${fmt(r.pctD)}%</span><span><i class="n"></i>Neutros ${fmt(r.pctN)}%</span><span><i class="p"></i>Promotores ${fmt(r.pctP)}%</span></div>
          <div class="ov-info">
            <span>${icon('calendar')}<b>${esc(formatarPeriodo(rec.data.periodo))}</b></span>
            <span>${icon('star')}Nota média <b class="num">${fmt(r.media, 1)}</b> / 10</span>
          </div>
          ${r.total < LIMITES.poucasRespostas ? `<div class="badge mid">Poucas respostas ${def('amostra')}</div>` : ''}
          ${rec.exemplo ? '<div class="muted">Dados de exemplo</div>' : ''}`
        : `<div class="wait">${vivas ? 'A aguardar dados da tab NPS' : 'NPS ainda sem acesso'}</div>`}
      </div>`).join('')}
    </div>
    <section class="card" style="background:#fff" aria-labelledby="h-ov">
      <div class="card-head"><h3 id="h-ov">NPS vs meta por marca ${info('NPS vs meta', 'Barra verde: NPS na meta ou acima. Barra vermelha: NPS abaixo da meta. Barra cinzenta: meta definida em Editar metas. Marcas sem dados só mostram a meta.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:${CORES.pro}"></i>NPS na meta ou acima</span><span><i style="background:${CORES.det}"></i>NPS abaixo da meta</span><span><i style="background:${CORES.meta}"></i>Meta</span></div></div>
      <div id="ch-ov" class="chart"></div>
      <div class="ov-eixo" id="ov-eixo" aria-hidden="true">${BRANDS.map(b => `<span>${esc(b.name)}</span>`).join('')}</div>
    </section>`;
}

// Lista de alertas da Overview, agrupada por marca
function alertasHtml(alertas) {
  if (!alertas.length) return BRANDS.some(b => store.get(b.id, 'nps')) ? `<div class="faixa good" role="status">${icon('check')}<div><b>Sem alertas.</b> Marcas, drivers e causas raiz com dados estão na meta ou acima.</div></div>` : '';
  const marcas = [...new Set(alertas.map(a => a.b))];
  return `<section class="card ov-alertas" aria-labelledby="h-al">
    <div class="card-head"><h3 id="h-al">${icon('alert')} Abaixo da meta ${info('Alertas', 'Drivers e causas raiz usam a meta da marca. Causas com menos de 30 menções e "Outra"/"Sem sugestões" não contam.')}</h3></div>
    <div class="al-grupos">${marcas.map(b => `
      <div class="al-grupo" style="${tileVars(b)}">
        <div class="al-marca"><span class="tile mark">${logo(b.icon)}</span><b>${esc(b.name)}</b><span class="muted">meta ${meta(b.id)}</span></div>
        <ul>${alertas.filter(a => a.b === b).map(a => `<li><span class="al-tipo">${a.tipo}</span><a href="${a.href}">${esc(a.nome)}</a><span class="badge bad num">${fmt(a.nps)}</span></li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </section>`;
}

// Logótipo de cada marca dentro da barra do NPS (círculo branco), e a linha de nomes alinhada com as barras
const OV_GRID = { left: 52, right: 16, top: 30, bottom: 8 };
function logosNasBarras(g, dados) {
  if (g.isDisposed()) return;
  const el = g.getDom();
  if (!el || !el.isConnected) return;
  const e = document.getElementById('ov-eixo');
  if (e) { e.style.marginLeft = `${OV_GRID.left}px`; e.style.width = `${el.clientWidth - OV_GRID.left - OV_GRID.right}px`; }
  el.querySelectorAll('.ov-bar-logo').forEach(n => n.remove());
  const banda = (el.clientWidth - OV_GRID.left - OV_GRID.right) / dados.length;
  const larg = banda * 0.62 / 2 - 4;
  dados.forEach((d, i) => {
    if (!d.r || d.r.nps < 12) return;
    const [x, yTopo] = g.convertToPixel({ gridIndex: 0 }, [i, d.r.nps]);
    const [, yZero] = g.convertToPixel({ gridIndex: 0 }, [i, 0]);
    const alt = yZero - yTopo;
    const tam = Math.min(larg - 10, 56, alt - 12);
    if (tam < 18) return;
    const centro = x - larg / 2 - 2;
    const s = document.createElement('span');
    s.className = 'ov-bar-logo';
    s.innerHTML = logo(d.b.icon);
    Object.assign(s.style, { width: `${tam}px`, height: `${tam}px`, padding: `${Math.round(tam * 0.18)}px`, left: `${centro - tam / 2}px`, top: `${yZero - tam - 8}px` });
    el.appendChild(s);
  });
}

function montarOverview() {
  const dados = BRANDS.map(b => { const rec = store.get(b.id, 'nps'); return { b, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id) }; });
  // Duas barras por marca: NPS (verde na meta ou acima, vermelho abaixo) e meta (cinzento claro), lado a lado
  const g = desenhar(document.getElementById('ch-ov'), junta(base(GROUP), {
    grid: { ...OV_GRID },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.035)' } }, formatter: p => { const d = dados[p[0].dataIndex];
      const linha = (cor, rot, v) => `<div class="ov-tt-l"><i style="background:${cor}"></i>${rot}<b>${v == null ? 'sem dados' : fmt(v)}</b></div>`;
      return `<div class="ov-tt"><div class="ov-tt-t">${esc(d.b.name)}</div>${linha(d.r ? corMeta(d.r.nps, d.m) : CORES.meta, 'NPS', d.r ? d.r.nps : null)}${linha(CORES.meta, 'Meta', d.m)}</div>`; } },
    // Os nomes saem do eixo e vão para a linha HTML #ov-eixo
    xAxis: { type: 'category', data: dados.map(d => d.b.name), ...EIXO_CAT, axisLabel: { show: false } },
    yAxis: { type: 'value', min: -100, max: 100, interval: 20, ...EIXO_VAL },
    series: [
      { name: 'NPS', type: 'bar', barGap: '8%', barWidth: '31%',
        data: dados.map(d => ({ value: d.r ? d.r.nps : null, itemStyle: { color: comBrilho(d.r ? corMeta(d.r.nps, d.m) : CORES.meta), borderRadius: [10, 10, 4, 4] } })),
        label: { show: true, position: 'top', distance: 6, color: '#1a1a1a', fontSize: 12, fontWeight: 700, formatter: p => (p.value == null ? '' : fmt(p.value)) },
        markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: '#9a9a9a', type: 'solid', width: 1 }, data: [{ yAxis: 0 }] } },
      { name: 'Meta', type: 'bar', barWidth: '31%',
        data: dados.map(d => ({ value: d.m, itemStyle: { color: comBrilho(CORES.meta), borderRadius: [10, 10, 4, 4] } })),
        label: { show: true, position: 'top', distance: 6, color: '#5f5f5f', fontSize: 12, fontWeight: 700, formatter: p => fmt(p.value) } },
    ],
  }), 400);
  if (!g) return;
  const pos = () => logosNasBarras(g, dados);
  g.on('finished', pos);
  g.on('rendered', () => requestAnimationFrame(pos));
}

// ---------- Exportar ----------
async function exportar(oque, id) {
  const r = rota();
  try {
    toast('A preparar o PowerPoint…');
    if (!r.brand) {
      await exportarOverview(GROUP, dadosOverview(), todosAlertas());
    } else {
      const rec = store.get(r.brand.id, r.tab.id);
      const e = ANALISES[r.tab.id].view.exportar(rec, r.brand, meta(r.brand.id));
      const sub = formatarPeriodo(rec.data.periodo) + (rec.exemplo ? ' · dados de exemplo' : '');
      if (oque === 'grafico') await exportarGrafico(r.brand, r.tab, e, id, sub);
      else await exportarTab(r.brand, r.tab, e, sub);
    }
    toast('PowerPoint descarregado.');
  } catch (err) {
    toast(err.message || 'Não consegui exportar.');
  }
}

// ---------- Render ----------
const $ = s => document.querySelector(s);

function render() {
  limparGraficos();
  const r = rota();
  const tema = r.brand || GROUP;
  applyTheme(document.documentElement, tema);
  document.title = r.brand ? `${r.tab.name} · ${r.brand.name} · Stater` : 'Overview · Stater';
  $('#sidebar').innerHTML = sidebar(r);
  $('#topbar').innerHTML = topbar(r);
  const c = $('#content');
  if (!r.brand) {
    c.innerHTML = overview();
    montarOverview();
  } else {
    c.innerHTML = `
      <header class="brand-head">
        <span class="tile mark">${logo(r.brand.icon)}</span>
        <h1>${esc(r.brand.name)}</h1>
      </header>
      ${painel(r.brand, r.tab)}`;
    const A = ANALISES[r.tab.id];
    const rec = store.get(r.brand.id, r.tab.id);
    if (rec && ativa(r.brand, r.tab)) A.view.mount(rec, r.brand, meta(r.brand.id));
    $('#file').multiple = !!A?.view.multi;
    ligarDrop();
  }
}

// ---------- Ações ----------
// Tabs desta marca (que funcionam) onde um ficheiro deste tipo entra
function sugestoesPara(rows, brand, tabAtual) {
  const tipo = identificar(rows);
  if (!tipo) return [];
  return TIPOS[tipo].tabs.map(id => brand.tabs.find(t => t.id === id)).filter(t => t && t.id !== tabAtual.id && ativa(brand, t))
    .map(t => ({ b: brand.id, id: t.id, nome: t.name }));
}

async function carregar(files) {
  const r = rota();
  files = [...(files || [])].filter(Boolean);
  if (!r.brand || !files.length) return;
  const A = ANALISES[r.tab.id];
  if (!A.view.multi) files = files.slice(0, 1);
  erro = null;
  let ok = 0;
  for (const file of files) {
    let rows = null;
    try {
      rows = await lerPrimeiraFolha(file);
      const data = A.parse(rows);
      const ant = store.get(r.brand.id, r.tab.id);
      store.set(r.brand.id, r.tab.id, { fileName: file.name, savedAt: new Date().toISOString(), data: A.view.multi ? A.view.juntar(ant?.exemplo ? null : ant, data, file.name) : data });
      ok++;
    } catch (e) {
      erro = { ficheiro: file.name, msg: e instanceof FicheiroErrado ? e.message : `Não consegui ler o ficheiro (${e.message}).`, faltas: e.faltas || [], sugestoes: rows ? sugestoesPara(rows, r.brand, r.tab) : [] };
      if (e.name === 'QuotaExceededError') erro = { msg: 'A memória do browser para o Stater está cheia. Apaga dados de outras tabs e tenta de novo.' };
    }
  }
  if (ok) toast(ok === 1 ? `${files.length === 1 ? files[0].name : '1 ficheiro'} carregado.` : `${ok} ficheiros carregados.`);
  render();
}

function ligarDrop() {
  const d = $('#drop');
  if (!d) return;
  d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('is-over'); });
  d.addEventListener('dragleave', () => d.classList.remove('is-over'));
  d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('is-over'); carregar(e.dataTransfer.files); });
}

document.addEventListener('click', async e => {
  const tg = e.target.closest('[data-toggle]');
  if (tg) {
    const id = tg.dataset.toggle;
    abertas.has(id) ? abertas.delete(id) : abertas.add(id);
    guardarAbertas();
    $('#sidebar').innerHTML = sidebar(rota());
    $(`#sidebar [data-toggle="${id}"]`)?.focus();
    return;
  }
  // Fecha o menu Exportar ao clicar fora dele
  document.querySelectorAll('details.menu-exp[open]').forEach(m => { if (!m.contains(e.target) || e.target.closest('[data-act]')) m.open = false; });
  const ex = e.target.closest('[data-exp]');
  if (ex) { exportar('grafico', ex.dataset.exp); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const r = rota();
  if (b.dataset.act === 'exp-tab') exportar('tab');
  if (b.dataset.act === 'exp-pdf') imprimir();
  if (b.dataset.act === 'rm-ficheiro' && r.brand) {
    const rec = store.get(r.brand.id, r.tab.id);
    const f = rec?.data.ficheiros?.[+b.dataset.i];
    if (f && await confirmar(`Tirar o driver "${f.driver}"?`, 'Sai só o Excel deste driver. Os outros ficam.', 'Tirar')) {
      const ficheiros = rec.data.ficheiros.filter((_, i) => i !== +b.dataset.i);
      if (ficheiros.length) store.set(r.brand.id, r.tab.id, { ...rec, data: { ...rec.data, ficheiros, periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros } });
      else store.del(r.brand.id, r.tab.id);
      render();
    }
  }
  if (b.dataset.act === 'upload') $('#file').click();
  if (b.dataset.act === 'metas') editarMetas();
  if (b.dataset.act === 'sample' && r.brand) {
    const ex = exemplos[r.tab.id];
    store.set(r.brand.id, r.tab.id, { ...ex, savedAt: new Date().toISOString(), exemplo: true });
    erro = null;
    render();
  }
  if (b.dataset.act === 'clear' && r.brand) {
    if (await confirmar('Apagar os dados desta tab?', `Sai o ficheiro carregado em "${r.tab.name}". As outras tabs não mudam.`)) {
      store.del(r.brand.id, r.tab.id);
      erro = null;
      toast('Dados apagados.');
      render();
    }
  }
});

$('#file').addEventListener('change', e => { carregar(e.target.files); e.target.value = ''; });
// As tabs de cada marca só abrem e fecham pela seta do menu
addEventListener('hashchange', () => { erro = null; render(); window.scrollTo({ top: 0 }); });
ligarTooltips();
render();
