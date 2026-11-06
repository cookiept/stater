// Tipo "NPS por grupo, por área": o mesmo Relate (ex.: NPS por Driver) exportado uma vez por área
// (área de conforto, centro de inspeção…). Cada Excel vem filtrado no Stats iQ por uma área; o Stater lê esse
// filtro, dá o nome à área e junta tudo. Mostra "Todas" (soma de todos os Excels) ou uma área de cada vez,
// mais uma tabela cruzada área × driver. O resto da página é a vista "NPS por grupo" (grupos.js).
import { npsDe, fmt, LIMITES } from '../stats.js?v=20261106-1530';
import { esc } from '../ui.js?v=20261106-1530';
import { icon } from '../icons.js?v=20261106-1530';
import { formatarPeriodo } from '../excel.js?v=20261106-1530';
import { baseGrafico } from '../export.js?v=20261106-1530';
import { tabelaHtml, ligarTabela, pptTabela } from './comum.js?v=20261106-1530';
import * as G from './grupos.js?v=20261106-1530';

const LIM = LIMITES.amostraPequena;
const TODAS = '*';
const A0 = { um: 'área', varios: 'áreas', col: 'Área' };
const areaT = tab => {
  const a = { ...A0, ...(tab?.termos?.area || {}) };
  const o = a.masc ? 'o' : 'a';
  return { ...a, o, nessa: `ness${o} ${a.um}`, numa: `num${o} ${a.um}`, esta: `est${o} ${a.um}`, nenhuma: `${a.masc ? 'Nenhum' : 'Nenhuma'} ${a.um}`, carregadas: `carregad${o}s` };
};
const termos = tab => ({ um: 'grupo', varios: 'grupos', col: 'Grupo', ...(tab?.termos || {}) });

export const multi = true;
export const multiTexto = 'Uma Pivot Table com todas as áreas, ou um Excel por área já filtrado no Stats iQ (ex.: Centro = Palamós). O Stater lê o filtro e dá o nome a cada área.';

// ---------- A área de cada Excel, a partir dos filtros ----------
const PISTA = /área|area|centro|loja|local|regi|zona|posto|esta[cç]/i;
const igual = f => !f.data && /^igual a /.test(f.valor || '');
const valorDe = f => f.valor.replace(/^igual a /, '').trim();

// Escolhe o filtro que identifica a área: o que tem nome de área, ou o que muda entre Excels, ou o primeiro "igual a"
function areaDe(filtros, outros = []) {
  const cand = (filtros || []).filter(igual);
  if (!cand.length) return null;
  const varia = cand.filter(f => outros.some(o => (o.filtros || []).some(g => g.campo === f.campo && g.valor !== f.valor)));
  const f = cand.find(x => PISTA.test(x.campo)) || varia[0] || cand[0];
  return { campo: f.campo, valor: valorDe(f) };
}
const nomeDe = f => f.area?.valor || f.fileName.replace(/\.[^.]+$/, '');

// Dados antigos (um só Excel, antes desta vista) passam a ser a lista com um ficheiro
function ficheirosDe(rec) {
  if (!rec) return [];
  if (rec.data.ficheiros) return rec.data.ficheiros;
  return [{ ...rec.data, fileName: rec.fileName, area: areaDe(rec.data.filtros) }];
}

// Junta um Excel novo; a mesma área é substituída
export function juntar(rec, novo, fileName) {
  // Uma Pivot Table já traz todas as áreas: substitui o que estava
  if (novo.pivot) {
    const ficheiros = novo.ficheiros.map(f => ({ ...f, fileName }));
    return { ficheiros, pivot: fileName, sel: ficheiros.length > 1 ? TODAS : nomeDe(ficheiros[0]), periodo: novo.periodo, filtros: novo.filtros };
  }
  const ficheiros = rec?.data.pivot ? [] : [...ficheirosDe(rec)];
  const f = { ...novo, fileName, area: areaDe(novo.filtros, ficheiros) };
  const i = ficheiros.findIndex(x => nomeDe(x) === nomeDe(f));
  if (i >= 0) ficheiros[i] = f; else ficheiros.push(f);
  return { ficheiros, sel: ficheiros.length > 1 ? TODAS : nomeDe(f), periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros };
}

// Soma os grupos de vários Excels (a nota média é ponderada pelas respostas)
function somar(fs) {
  const mapa = new Map();
  for (const f of fs) for (const g of f.grupos) {
    const a = mapa.get(g.nome) || { nome: g.nome, d: 0, n: 0, p: 0, total: 0, soma: 0, comMedia: 0 };
    a.d += g.d; a.n += g.n; a.p += g.p; a.total += g.total;
    if (g.media != null) { a.soma += g.media * g.total; a.comMedia += g.total; }
    mapa.set(g.nome, a);
  }
  const grupos = [...mapa.values()].map(({ soma, comMedia, ...g }) => (comMedia ? { ...g, media: soma / comMedia } : g));
  const semRespostas = [...new Set(fs.flatMap(f => f.semRespostas || []))].filter(n => !mapa.has(n));
  return { grupos, semRespostas, multi: false, amostraGrupo: null };
}

// Período de vários Excels: do início mais cedo ao fim mais tarde
function periodoDe(fs) {
  const ini = fs.map(f => f.periodo?.inicio).filter(Boolean).sort()[0];
  const fim = fs.map(f => f.periodo?.fim).filter(Boolean).sort().pop();
  return ini || fim ? { inicio: ini || null, fim: fim || null, texto: '' } : fs[0].periodo;
}

// O registo que as outras funções desenham: a área escolhida, ou todas somadas
export function preparar(rec) {
  const fs = ficheirosDe(rec);
  const nomes = fs.map(nomeDe);
  const sel = fs.length > 1 && (rec.data.sel === TODAS || !nomes.includes(rec.data.sel)) ? TODAS : (nomes.includes(rec.data.sel) ? rec.data.sel : nomes[0]);
  const um = sel === TODAS ? null : fs[nomes.indexOf(sel)];
  const comuns = fs[0].filtros.filter(f => !f.data && fs.every(x => (x.filtros || []).some(g => g.campo === f.campo && g.valor === f.valor)));
  const data = um ? { ...um } : {
    ...somar(fs), periodo: periodoDe(fs), pergunta: fs[0].pergunta,
    filtros: [...fs[0].filtros.filter(f => f.data), ...comuns, { campo: fs[0].area?.campo || 'Área', valor: rec.data.pivot ? `todas (${fs.length})` : `${fs.length} Excels juntos (${nomes.join(', ')})` }],
  };
  return { ...rec, fileName: rec.data.pivot || (um ? um.fileName : `${fs.length} Excels`), data: { ...data, ficheiros: fs, sel, pivot: rec.data.pivot } };
}

// ---------- Tabela área × driver ----------
function cruz(rec) {
  const fs = rec.data.ficheiros;
  const grupos = somar(fs).grupos.sort((a, b) => b.total - a.total).map(g => g.nome);
  const linhas = fs.map(f => {
    const t = f.grupos.reduce((s, g) => ({ d: s.d + g.d, p: s.p + g.p, total: s.total + g.total }), { d: 0, p: 0, total: 0 });
    const l = { nome: nomeDe(f), total: t.total, nps: t.total ? npsDe(t.d, t.p, t.total) : null };
    grupos.forEach((nome, i) => {
      const g = f.grupos.find(x => x.nome === nome);
      l[`g${i}`] = g && g.total ? npsDe(g.d, g.p, g.total) : null;
      l[`n${i}`] = g ? g.total : 0;
    });
    return l;
  });
  return { grupos, linhas };
}

const celula = (v, n, meta) => (v == null ? '<td class="r muted">–</td>'
  : `<td class="r"><span class="badge ${v < meta ? 'bad' : 'good'} num${n < LIM ? ' pouco' : ''}" title="${fmt(n)} respostas${n < LIM ? ' (poucas)' : ''}">${fmt(v)}</span></td>`);

// ---------- Vista ----------
export const chips = (rec, tab) => G.chips(rec, tab);

export function resumo(rec, meta, tab) {
  const r = G.resumo(rec, meta, tab);
  const fs = rec.data.ficheiros, A = areaT(tab), T = termos(tab);
  if (fs.length < 2) return r;
  const { grupos, linhas } = cruz(rec);
  const fiaveis = linhas.filter(l => l.total >= LIM && l.nps != null).sort((a, b) => b.nps - a.nps);
  let extra = '';
  if (rec.data.sel === TODAS && fiaveis.length >= 2 && fiaveis[0].nps !== fiaveis[fiaveis.length - 1].nps) {
    const [m, p] = [fiaveis[0], fiaveis[fiaveis.length - 1]];
    extra = ` Entre ${A.varios}, o NPS vai de <strong>${fmt(p.nps)}</strong> em <strong>${esc(p.nome)}</strong> a <strong>${fmt(m.nps)}</strong> em <strong>${esc(m.nome)}</strong>.`;
  } else if (rec.data.sel !== TODAS) {
    extra = ` Estás a ver só <strong>${esc(rec.data.sel)}</strong>, de ${fs.length} ${A.varios} ${A.carregadas}.`;
  }
  // O pior cruzamento área × driver com respostas suficientes
  let pior = null;
  for (const l of linhas) grupos.forEach((g, i) => { if (l[`g${i}`] != null && l[`n${i}`] >= LIM && (!pior || l[`g${i}`] < pior.v)) pior = { v: l[`g${i}`], a: l.nome, g, n: l[`n${i}`] }; });
  if (rec.data.sel === TODAS && pior) extra += ` Com ${LIM} ou mais respostas, o pior cruzamento é <strong>${esc(pior.g)}</strong> em ${esc(pior.a)} (NPS ${fmt(pior.v)}).`;
  return { ...r, texto: r.texto + extra, factos: rec.data.sel === TODAS && pior ? [r.factos[0], { valor: fmt(pior.v), rot: `${pior.g} em ${pior.a}`, tom: pior.v < meta ? 'bad' : 'good', tip: `O ${T.um} com o NPS mais baixo ${A.numa}, entre os que têm ${LIM} ou mais respostas: ${pior.g} em ${pior.a}, NPS ${fmt(pior.v)} com ${fmt(pior.n)} respostas.` }].filter(Boolean) : r.factos };
}

function seletor(rec, tab) {
  const fs = rec.data.ficheiros, A = areaT(tab);
  if (fs.length < 2) return '';
  const ops = [[TODAS, `Todas (${fs.length})`], ...fs.map(f => [nomeDe(f), nomeDe(f)])];
  return `<div class="vistas" role="group" aria-label="Escolher ${A.um}">
    <span class="vistas-rot">${esc(A.col)}</span>
    ${ops.length <= 8
      ? ops.map(([v, t]) => `<button type="button" class="vista${rec.data.sel === v ? ' is-on' : ''}" data-act="vista" data-v="${esc(v)}" aria-pressed="${rec.data.sel === v}">${esc(t)}</button>`).join('')
      : `<label class="sr-only" for="sel-vista">Escolher ${A.um}</label><select id="sel-vista" class="vista-sel" data-act="vista">${ops.map(([v, t]) => `<option value="${esc(v)}"${rec.data.sel === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`}
  </div>`;
}

function tabelaCruz(rec, meta, tab) {
  const fs = rec.data.ficheiros, A = areaT(tab), T = termos(tab);
  if (fs.length < 2) return '';
  const { grupos } = cruz(rec);
  return tabelaHtml('cruz', `NPS de cada ${T.um} por ${A.um}`, `Uma linha por ${A.um} e uma coluna por ${T.um}. Cada número é o NPS de quem escolheu esse ${T.um} ${A.nessa}. Verde: no objetivo (${meta}) ou acima. Vermelho: abaixo. Números claros: menos de ${LIM} respostas, mudam muito. Passa o rato por cima para ver as respostas.`,
    [{ k: 'nome', rot: A.col }, { k: 'nps', rot: 'NPS geral', r: true }, { k: 'total', rot: 'Respostas', r: true }, ...grupos.map((g, i) => ({ k: `g${i}`, rot: g, r: true }))], A.um.length > 14 ? "Procurar" : `Procurar ${A.um}`)
    .replace('class="tbl"', 'class="tbl cruz"');
}

export function html(rec, meta, tab) {
  return seletor(rec, tab) + G.html(rec, meta, tab) + tabelaCruz(rec, meta, tab);
}

export function mount(rec, brand, meta, tab) {
  G.mount(rec, brand, meta, tab);
  if (rec.data.ficheiros.length < 2) return;
  const { grupos, linhas } = cruz(rec);
  ligarTabela('cruz', linhas, l => `
    <tr class="${rec.data.sel === l.nome ? 'is-sel' : ''}"><td><span class="name">${esc(l.nome)}</span></td>${celula(l.nps, l.total, meta)}<td class="r num">${fmt(l.total)}</td>${grupos.map((_, i) => celula(l[`g${i}`], l[`n${i}`], meta)).join('')}</tr>`,
  { chave: 'total', ncol: grupos.length + 3, vazio: `${areaT(tab).nenhuma} com esse nome.` });
}

export function exportar(rec, brand, meta, tab) {
  const e = G.exportar(rec, brand, meta, tab);
  const fs = rec.data.ficheiros, A = areaT(tab), T = termos(tab);
  e.resumo = [resumo(rec, meta, tab).texto.replace(/<[^>]+>/g, '')];
  if (fs.length >= 2) {
    const { grupos, linhas } = cruz(rec);
    e.graficos.push({ id: 'cruz', titulo: `NPS de cada ${T.um} por ${A.um}`, desenhar: pptTabela(baseGrafico(brand), [A.col, 'NPS geral', 'Respostas', ...grupos],
      linhas.sort((a, b) => b.total - a.total).map(l => [l.nome, l.nps == null ? '–' : fmt(l.nps), fmt(l.total), ...grupos.map((_, i) => (l[`g${i}`] == null ? '–' : fmt(l[`g${i}`])))]),
      { dir: [1, 2, ...grupos.map((_, i) => i + 3)] }) });
  }
  return e;
}

// Lista de Excels carregados (menu Ficheiro)
export function lado(rec, meta, tab) {
  const A = areaT(tab);
  if (rec.data.pivot) return `<div class="side-block">
    <div class="filecard">${icon('file')}<div><div class="fn">${esc(rec.data.pivot)}</div><div class="fm">Pivot Table · ${fmt(rec.data.ficheiros.length)} ${esc(A.varios)} · ${esc(formatarPeriodo(rec.data.ficheiros[0].periodo))}</div></div></div>
    <div class="file-actions">
      <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Substituir</button>
      <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga o ficheiro desta tab">${icon('trash')} Apagar</button>
    </div>
  </div>`;
  return `<div class="side-block">
    <h3 class="sec-title">${esc(A.varios[0].toUpperCase() + A.varios.slice(1))} ${A.carregadas}</h3>
    <ul class="drv-lista">${rec.data.ficheiros.map((f, i) => `
      <li><div><b>${esc(nomeDe(f))}</b><span>${esc(f.fileName)} · ${esc(formatarPeriodo(f.periodo))}</span></div>
        <button type="button" class="btn btn-ghost btn-xs" data-act="rm-ficheiro" data-i="${i}" aria-label="Tirar ${esc(nomeDe(f))}" title="Tirar ${esc(A.esta)}">${icon('x')}</button></li>`).join('')}
    </ul>
    <div class="file-actions">
      <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Adicionar ${esc(A.um)}</button>
      <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga todos os ficheiros desta tab">${icon('trash')} Apagar tudo</button>
    </div>
  </div>`;
}

export const nomeFicheiro = f => nomeDe(f);

export const importar = {
  titulo: 'Como importar os dados de NPS por Driver',
  texto: 'No Stats iQ, selecione os Drivers, a área (ex.: Centro ou AreaConfortoNome) e "(Group) NPS". Vá a Advanced → Pivot Table: nas linhas os Drivers e, por baixo, a área; nas colunas o "(Group) NPS"; nos valores COUNT. Mude "Data sampled" para All, aplique os filtros de data e exporte com "Export data for Excel".',
};
