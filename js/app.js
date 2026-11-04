// Stater: rotas, desenho da página e ações (upload, apagar, exportar).
// O resto está em módulos: store (browser), analises (tipos de análise), layout (menu e topo),
// painel (tab de marca), overview (Grupo Brisa) e views/ (uma vista por tipo de análise).
import { GROUP, brandById, applyTheme } from './brands.js?v=20261104-1734';
import { logo } from './logos.js?v=20261104-1734';
import { esc, ligarTooltips, toast, confirmar } from './ui.js?v=20261104-1734';
import { lerPrimeiraFolha, FicheiroErrado, formatarPeriodo, identificar, TIPOS } from './excel.js?v=20261104-1734';
import { exportarGrafico, exportarTab, exportarOverview, imprimir } from './export.js?v=20261104-1734';
import { limparGraficos } from './charts.js?v=20261104-1734';
import { exemplos } from './exemplo.js?v=20261104-1734';
import { store, meta, abertas, guardarAbertas } from './store.js?v=20261104-1734';
import { analiseDe, ativa, vistaDe } from './analises.js?v=20261104-1734';
import { sidebar, topbar } from './layout.js?v=20261104-1734';
import { painel } from './painel.js?v=20261104-1734';
import { overview, montarOverview, editarMetas, dadosOverview } from './overview.js?v=20261104-1734';

// ---------- Estado ----------
// Último ficheiro recusado (aviso no painel); limpa ao mudar de página
let erro = null;
const rota = () => {
  const [, b, t] = location.hash.replace(/^#\/?/, '#/').split('/');
  const brand = brandById(b);
  if (!brand) return { brand: null, tab: null };
  const tab = brand.tabs.find(x => x.id === t) || brand.tabs[0];
  return { brand, tab };
};

// ---------- Exportar ----------
async function exportar(oque, id) {
  const r = rota();
  try {
    toast('A preparar o PowerPoint…');
    if (!r.brand) {
      await exportarOverview(GROUP, dadosOverview());
    } else {
      const rec = vistaDe(analiseDe(r.tab), store.get(r.brand.id, r.tab.id));
      const e = analiseDe(r.tab).view.exportar(rec, r.brand, meta(r.brand.id), r.tab);
      const sub = formatarPeriodo(rec.data.periodo) + (rec.exemplo ? ' · dados de exemplo' : '');
      if (oque === 'grafico') await exportarGrafico(r.brand, r.tab, e, id, sub);
      else await exportarTab(r.brand, r.tab, e, sub);
    }
    toast('PowerPoint descarregado com sucesso.', 'ok');
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
      ${painel(r.brand, r.tab, erro)}`;
    const A = analiseDe(r.tab);
    const rec = vistaDe(A, store.get(r.brand.id, r.tab.id));
    if (rec && ativa(r.brand, r.tab)) A.view.mount(rec, r.brand, meta(r.brand.id), r.tab);
    $('#file').multiple = !!A?.view.multi;
    ligarDrop();
  }
}

// ---------- Ações ----------
// Tabs desta marca (que funcionam) onde um ficheiro deste tipo entra
function sugestoesPara(rows, brand, tabAtual) {
  const tipo = identificar(rows);
  if (!tipo) return [];
  return brand.tabs.filter(t => t.id !== tabAtual.id && ativa(brand, t) && TIPOS[tipo].analises.includes(t.tipo || t.id))
    .map(t => ({ b: brand.id, id: t.id, nome: t.name }));
}

async function carregar(files) {
  const r = rota();
  files = [...(files || [])].filter(Boolean);
  if (!r.brand || !files.length) return;
  const A = analiseDe(r.tab);
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
  if (ok) toast(ok === 1 ? `${files.length === 1 ? files[0].name : '1 ficheiro'} carregado com sucesso.` : `${ok} ficheiros carregados com sucesso.`, 'ok');
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
    if (rec && !rec.data.ficheiros) { store.del(r.brand.id, r.tab.id); render(); return; } // um só Excel, guardado antes das listas
    const f = rec?.data.ficheiros?.[+b.dataset.i];
    const nomeF = analiseDe(r.tab).view.nomeFicheiro?.(f) || f?.driver || f?.atributo;
    if (f && await confirmar(`Tirar "${nomeF}"?`, 'Sai só este Excel. Os outros ficam.', 'Tirar')) {
      const ficheiros = rec.data.ficheiros.filter((_, i) => i !== +b.dataset.i);
      if (ficheiros.length) store.set(r.brand.id, r.tab.id, { ...rec, data: { ...rec.data, ficheiros, periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros } });
      else store.del(r.brand.id, r.tab.id);
      render();
    }
  }
  if (b.dataset.act === 'vista' && b.tagName === 'BUTTON' && r.brand) escolherVista(r, b.dataset.v);
  if (b.dataset.act === 'upload') $('#file').click();
  if (b.dataset.act === 'metas') editarMetas(render);
  if (b.dataset.act === 'sample' && r.brand) {
    const ex = exemplos[r.tab.tipo || r.tab.id];
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

// Vistas com escolha (ex.: uma área ou todas): fica guardada com os dados da tab
function escolherVista(r, v) {
  const rec = store.get(r.brand.id, r.tab.id);
  if (!rec) return;
  store.set(r.brand.id, r.tab.id, { ...rec, data: { ...rec.data, sel: v } });
  const y = window.scrollY;
  render();
  window.scrollTo({ top: y });
  document.querySelector(`[data-act="vista"][data-v="${CSS.escape(v)}"], #sel-vista`)?.focus({ preventScroll: true });
}
document.addEventListener('change', e => {
  const s = e.target.closest('select[data-act="vista"]');
  const r = rota();
  if (s && r.brand) escolherVista(r, s.value);
});

$('#file').addEventListener('change', e => { carregar(e.target.files); e.target.value = ''; });
// As tabs de cada marca só abrem e fecham pela seta do menu
addEventListener('hashchange', () => { erro = null; render(); window.scrollTo({ top: 0 }); });
ligarTooltips();
render();
