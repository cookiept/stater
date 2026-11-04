// Tipos de análise do Stater. Cada tipo é definido uma vez (leitura do Excel + vista)
// e várias tabs podem usar o mesmo tipo: em brands.js, `tipo` diz qual (por omissão, o id da tab).
//
// Para juntar um tipo novo:
//   1. a leitura do Excel em excel.js (parseX), que lança FicheiroErrado se o ficheiro não servir;
//   2. a vista em js/views/ (chips, resumo, html, mount, exportar, importar, e lado/multi/juntar/preparar se precisar);
//   3. uma linha aqui;
//   4. `live: true` (e `tipo`, se o id da tab for outro) nas tabs de brands.js.
import { parseNps, parseCausas, parseGrupos, parseTextiq, parseCes, parseCsatGrupos, parseRegressao, parseBreakdown } from './excel.js?v=20261104-1537';
import * as vNps from './views/nps.js?v=20261104-1537';
import * as vCausas from './views/causas.js?v=20261104-1537';
import * as vMolho from './views/molho.js?v=20261104-1537';
import * as vGrupos from './views/grupos.js?v=20261104-1537';
import * as vTextiq from './views/textiq.js?v=20261104-1537';
import * as vCes from './views/ces.js?v=20261104-1537';
import * as vCsat from './views/csat.js?v=20261104-1537';
import * as vRegressao from './views/regressao.js?v=20261104-1537';
import * as vBreakdown from './views/breakdown.js?v=20261104-1537';

export const ANALISES = {
  nps: { parse: parseNps, view: vNps },
  'causa-raiz': { parse: parseCausas, view: vCausas },
  molho: { parse: parseCausas, view: vMolho },
  grupos: { parse: parseGrupos, view: vGrupos }, // NPS por driver, resultado, segmento, CES, CSAT, topics
  textiq: { parse: parseTextiq, view: vTextiq }, // média de quem mencionou cada tema (CHECKED / UNCHECKED)
  ces: { parse: parseCes, view: vCes }, // distribuição do CES (1 a 7)
  'csat-grupos': { parse: parseCsatGrupos, view: vCsat }, // CSAT por grupo de NPS, um Excel por CSAT
  regressao: { parse: parseRegressao, view: vRegressao }, // importância relativa de cada CSAT
  breakdown: { parse: parseBreakdown, view: vBreakdown }, // NPS por grupo com um Excel por área (ex.: NPS por Driver por centro)
};

// O registo que a vista desenha: algumas vistas escolhem uma parte dos dados (ex.: uma área)
export const vistaDe = (A, rec) => (rec && A?.view.preparar ? A.view.preparar(rec) : rec);

export const analiseDe = t => (t ? ANALISES[t.tipo || t.id] : undefined);

// Uma tab funciona se tiver análise e estiver marcada como live em brands.js
export const ativa = (b, t) => !!(b && t && t.live && analiseDe(t));
