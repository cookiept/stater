// Tipo "Causa Raiz por driver": um Relate de Group NPS com a causa raiz de cada driver (ex.: RC_Marcação,
// RC_Check-in…), um Excel por driver, carregados de uma vez. Mostra "Todos" (as causas de todos os drivers
// juntas, cada uma com o seu driver) ou um driver de cada vez. O resto da página é a vista "Causa Raiz" (causas.js).
import { esc } from '../ui.js?v=20261113-1219';
import { icon } from '../icons.js?v=20261113-1219';
import { formatarPeriodo } from '../excel.js?v=20261113-1219';
import * as C from './causas.js?v=20261113-1219';

const TODOS = '*';
export const multi = true;
export const multiTexto = 'Um Excel por driver, com a causa raiz desse driver. Podes carregar todos de uma vez.';

const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
const nomeDriver = (novo, fileName) => maiuscula((novo.titulo || '').replace(/\.\.\.$/, '…').replace(/^(RC|CR)[_\s-]*/i, '').trim() || fileName.replace(/\.[^.]+$/, ''));

// Junta um Excel novo aos que já existem; o mesmo driver é substituído
export function juntar(rec, novo, fileName) {
  const ficheiros = [...(rec?.data.ficheiros || [])];
  const f = { ...novo, driver: nomeDriver(novo, fileName), fileName };
  const i = ficheiros.findIndex(x => x.driver === f.driver);
  if (i >= 0) ficheiros[i] = f; else ficheiros.push(f);
  return { ficheiros, sel: ficheiros.length > 1 ? TODOS : f.driver, periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros };
}

// Dados antigos (um só Excel, antes desta vista) passam a ser a lista com um ficheiro
const ficheirosDe = rec => rec.data.ficheiros || [{ ...rec.data, driver: nomeDriver(rec.data, rec.fileName), fileName: rec.fileName }];

// O registo que a vista de causas desenha: um driver, ou todos juntos (cada causa com o nome do driver)
export function preparar(rec) {
  const fs = ficheirosDe(rec);
  const nomes = fs.map(f => f.driver);
  const sel = fs.length > 1 && (rec.data.sel === TODOS || !nomes.includes(rec.data.sel)) ? TODOS : (nomes.includes(rec.data.sel) ? rec.data.sel : nomes[0]);
  const um = sel === TODOS ? null : fs[nomes.indexOf(sel)];
  // A amostra é a de quem respondeu ao NPS: igual em todos os Excels com os mesmos filtros; fica a maior
  const amostra = fs.map(f => f.amostraGrupo).filter(Boolean).sort((a, b) => (b.d + b.n + b.p) - (a.d + a.n + a.p))[0] || null;
  // Um driver escolhido (de vários): as causas guardam o driver, para a tabela e o gráfico mostrarem o separador
  const comDriver = f => [...f.causas, ...(f.semRespostas || []).map(n => ({ nome: n, d: 0, n: 0, p: 0, total: 0 }))].map(c => ({ ...c, causa: c.nome, driver: f.driver }));
  const data = um ? (fs.length > 1 ? { ...um, causas: comDriver(um), semRespostas: [], drivers: [um.driver], todosDrivers: nomes } : { ...um }) : {
    // Cada causa guarda o seu driver (causa = nome sem o driver, para a tabela); as de 0 menções também
    causas: fs.flatMap(f => [...f.causas, ...(f.semRespostas || []).map(n => ({ nome: n, d: 0, n: 0, p: 0, total: 0 }))]
      .map(c => ({ ...c, nome: `${c.nome} · ${f.driver}`, causa: c.nome, driver: f.driver }))),
    semRespostas: [], drivers: nomes, todosDrivers: nomes,
    amostraGrupo: amostra, multi: true, periodo: fs[0].periodo, pergunta: fs[0].pergunta,
    filtros: [...fs[0].filtros, { campo: 'Drivers', valor: `todos (${fs.length})` }],
  };
  return { ...rec, fileName: um ? um.fileName : `${fs.length} Excels`, data: { ...data, ficheiros: fs, sel } };
}

// Escolher o driver: dropdown por baixo dos indicadores (vale para o resumo, os gráficos e a tabela), a começar em "Todos"
function seletor(rec) {
  const fs = rec.data.ficheiros;
  if (fs.length < 2) return '';
  const ops = [[TODOS, `Todos os drivers (${fs.length})`], ...fs.map(f => [f.driver, f.driver])];
  return `<div class="vistas" role="group" aria-label="Escolher driver"><span class="vistas-rot">Driver</span><label class="sr-only" for="sel-driver">Escolher driver</label><select id="sel-driver" class="vista-sel" data-act="vista">${ops.map(([v, t]) => `<option value="${esc(v)}"${rec.data.sel === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
}

export const chips = rec => C.chips(rec);

export function resumo(rec, meta) {
  const r = C.resumo(rec, meta);
  if (rec.data.ficheiros.length > 1 && rec.data.sel !== TODOS) r.texto += ` Estás a ver só o driver <strong>${esc(rec.data.sel)}</strong>, de ${rec.data.ficheiros.length} carregados.`;
  return r;
}

export const html = (rec, meta) => C.html(rec, meta, seletor(rec));
export const mount = (rec, brand, meta) => C.mount(rec, brand, meta);
export const exportar = (rec, brand, meta) => C.exportar(rec, brand, meta);
export const nomeFicheiro = f => f.driver;

// Lista de Excels carregados (menu Ficheiro)
export function lado(rec) {
  return `<div class="side-block">
    <h3 class="sec-title">Drivers carregados</h3>
    <ul class="drv-lista">${rec.data.ficheiros.map((f, i) => `
      <li><div><b>${esc(f.driver)}</b><span>${esc(f.fileName)} · ${esc(formatarPeriodo(f.periodo))}</span></div>
        <button type="button" class="btn btn-ghost btn-xs" data-act="rm-ficheiro" data-i="${i}" aria-label="Tirar ${esc(f.driver)}" title="Tirar este driver">${icon('x')}</button></li>`).join('')}
    </ul>
    <div class="file-actions">
      <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Adicionar driver</button>
      <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga todos os ficheiros desta tab">${icon('trash')} Apagar tudo</button>
    </div>
  </div>`;
}

export const importar = {
  titulo: 'Como importar os dados de NPS por Causa Raiz',
  texto: 'No Stats iQ, faça um "Relate" por driver: a variável principal "(Group) NPS" e, como variável secundária, a causa raiz desse driver (ex.: RC_Marcação, RC_Check-in). Use os mesmos filtros em todos e exporte cada tabela para Excel.',
};
