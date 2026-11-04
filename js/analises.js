// Tipos de análise do Stater. Cada tipo é definido uma vez (leitura do Excel + vista)
// e várias tabs podem usar o mesmo tipo: em brands.js, `tipo` diz qual (por omissão, o id da tab).
//
// Para juntar um tipo novo:
//   1. a leitura do Excel em excel.js (parseX), que lança FicheiroErrado se o ficheiro não servir;
//   2. a vista em js/views/ (chips, resumo, html, mount, exportar, importar, e lado/multi/juntar se precisar);
//   3. uma linha aqui;
//   4. `live: true` (e `tipo`, se o id da tab for outro) nas tabs de brands.js.
import { parseNps, parseCausas } from './excel.js?v=20261104-1125';
import * as vNps from './views/nps.js?v=20261104-1125';
import * as vCausas from './views/causas.js?v=20261104-1125';
import * as vMolho from './views/molho.js?v=20261104-1125';

export const ANALISES = {
  nps: { parse: parseNps, view: vNps },
  'causa-raiz': { parse: parseCausas, view: vCausas },
  molho: { parse: parseCausas, view: vMolho },
};

export const analiseDe = t => (t ? ANALISES[t.tipo || t.id] : undefined);

// Uma tab funciona se tiver análise e estiver marcada como live em brands.js
export const ativa = (b, t) => !!(b && t && t.live && analiseDe(t));
