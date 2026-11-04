// Leitura dos Excel exportados do Qualtrics Stats iQ.
// Um só leitor para todas as tabs; cada tipo de análise tem o seu parser.

// `faltas`: o que o ficheiro não tem e esta tab precisa (aparece em lista no aviso).
export class FicheiroErrado extends Error {
  constructor(motivo, faltas = []) { super(motivo); this.name = 'FicheiroErrado'; this.faltas = faltas; }
}

export async function lerPrimeiraFolha(file) {
  if (!window.XLSX) throw new Error('A biblioteca de leitura de Excel não carregou. Verifica a ligação à internet e recarrega a página.');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

const texto = v => (v == null ? '' : String(v)).trim();
const lower = v => texto(v).toLowerCase();
const inteiro = v => {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const s = texto(v).replace(/[\s.]/g, '').replace(',', '.');
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : null;
};

// ---------- Filtro de data (período do ficheiro) ----------
const MESES = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function lerData(s) {
  s = texto(s);
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/(\d{1,2})\s+([A-Za-zçÇ]{3})[a-zç]*\.?,?\s+(\d{4})/);
  if (m && MESES[m[2].toLowerCase()]) return new Date(+m[3], MESES[m[2].toLowerCase()] - 1, +m[1]);
  m = s.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MESES[m[1].toLowerCase()]) return new Date(+m[3], MESES[m[1].toLowerCase()] - 1, +m[2]);
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); // Qualtrics exporta em formato americano
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  return null;
}

export function formatarData(d, curto = false) {
  if (!d) return '';
  d = new Date(d);
  return curto ? `${d.getDate()} ${MESES_PT[d.getMonth()]}` : `${d.getDate()} ${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatarPeriodo(p) {
  if (!p) return 'Sem filtro de data';
  if (p.inicio && p.fim) {
    const a = new Date(p.inicio), b = new Date(p.fim);
    return a.getFullYear() === b.getFullYear() ? `${formatarData(a, true)} – ${formatarData(b)}` : `${formatarData(a)} – ${formatarData(b)}`;
  }
  if (p.inicio) return `Desde ${formatarData(p.inicio)}`;
  if (p.fim) return `Até ${formatarData(p.fim)}`;
  return 'Sem filtro de data'; // filtro sem datas (ex.: linha "greater than or equal to" vazia)
}

export function extrairPeriodo(rows) {
  let semData = null; // filtro sem datas (ex.: "greater than or equal to " vazio): só serve se não houver outro
  for (const r of rows.slice(0, 40)) {
    for (const c of r || []) {
      const s = texto(c);
      if (!/(start|end|recorded)\s*date/i.test(s)) continue;
      const encontradas = s.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-zç]{3}[a-zç]*\.?,?\s+\d{4}|[A-Za-z]{3}[a-z]*\.?\s+\d{1,2},?\s+\d{4}/g) || [];
      const datas = encontradas.map(lerData).filter(Boolean);
      if (/between/i.test(s) && datas.length >= 2) return { inicio: datas[0].toISOString(), fim: datas[1].toISOString(), texto: s };
      if (!datas.length) { semData ??= { texto: s.trim() }; continue; }
      if (/after|since|greater|≥|>=/i.test(s) && datas[0]) return { inicio: datas[0].toISOString(), texto: s };
      if (/before|until|less|≤|<=/i.test(s) && datas[0]) return { fim: datas[0].toISOString(), texto: s };
      if (datas.length >= 2) return { inicio: datas[0].toISOString(), fim: datas[1].toISOString(), texto: s };
      return { texto: s };
    }
  }
  return semData;
}

// ---------- Filtros da extração (bloco "FILTER:" no topo do Excel) ----------
const CAMPOS = { 'start date': 'Data de início', 'end date': 'Data de fim', 'recorded date': 'Data de registo', 'response type': 'Tipo de resposta' };
const OPERADORES = [
  [/\s+does not contain\s+/i, ' não contém '], [/\s+contains\s+/i, ' contém '],
  [/\s+is greater than or equal to\s*/i, ' maior ou igual a '], [/\s+is less than or equal to\s*/i, ' menor ou igual a '],
  [/\s+is greater than\s*/i, ' maior que '], [/\s+is less than\s*/i, ' menor que '],
  [/\s+is not equal to\s+/i, ' diferente de '], [/\s+does not equal\s+/i, ' diferente de '], [/\s+equals\s+/i, ' igual a '], [/\s+is equal to\s+/i, ' igual a '],
  [/\s+is any of\s+/i, ' é um de '], [/\s+is not\s+/i, ' não é '], [/\s+is\s+/i, ' é '],
];

function traduzirFiltro(s) {
  s = texto(s).replace(/^survey metadata\s*-\s*/i, '').replace(/^embedded data\s*-\s*/i, '');
  // Linha de data: fica com as datas já em português
  if (/(start|end|recorded)\s*date/i.test(s)) {
    const campo = CAMPOS[(s.match(/(start|end|recorded)\s*date/i)[0]).toLowerCase().replace(/\s+/, ' ')];
    const datas = (s.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/g) || []).map(lerData).filter(Boolean);
    if (!datas.length) return null; // linha vazia (ex.: "greater than or equal to " sem data)
    if (/between/i.test(s) && datas.length >= 2) return { campo, valor: `${formatarData(datas[0])} a ${formatarData(datas[1])}`, data: true };
    if (/greater|after|since/i.test(s)) return { campo, valor: `desde ${formatarData(datas[0])}`, data: true };
    if (/less|before|until/i.test(s)) return { campo, valor: `até ${formatarData(datas[0])}`, data: true };
    return { campo, valor: formatarData(datas[0]), data: true };
  }
  for (const [re, pt] of OPERADORES) {
    const m = s.split(re);
    if (m.length === 2) {
      if (!m[1].trim()) return null;
      return { campo: CAMPOS[m[0].trim().toLowerCase()] || m[0].trim(), valor: pt.trim() + ' ' + m[1].trim() };
    }
  }
  return { campo: '', valor: s };
}

// Lista de filtros usados no Qualtrics, já traduzida. As linhas "ALL"/"ANY" só agrupam e não aparecem.
export function extrairFiltros(rows) {
  const i = rows.slice(0, 15).findIndex(r => /^filter:/i.test(texto((r || [])[0])));
  if (i < 0) return [];
  const out = [];
  let qualquer = false;
  for (const r of rows.slice(i + 1, i + 30)) {
    const s = texto((r || []).find(c => texto(c) !== ''));
    if (!s) break;
    if (/^(all|any)$/i.test(s)) { if (/^any$/i.test(s)) qualquer = true; continue; }
    const f = traduzirFiltro(s);
    if (f) out.push(f);
  }
  if (qualquer && out.length > 1) out.push({ campo: 'Nota', valor: 'basta cumprir um dos filtros (ANY)' });
  return out;
}

// Pergunta do inquérito, a partir da 1.ª linha "Summary of …". O Qualtrics corta-a com "...".
export function extrairPergunta(rows) {
  const s = texto((rows[0] || [])[0]);
  const m = s.match(/^summary of\s+(?:\(\w+\)\s*)?[^-]*?-\s*(.+?)(?:\s+vs\.?\s+|$)/i);
  return m ? m[1].replace(/\.\.\.$/, '…').trim() : '';
}

// ---------- Que análise é este Excel? (para dizer em que tab entra) ----------
// Devolve um dos tipos: nps, causa, relate, textiq, ces, csat, regressao, ou null.
export const TIPOS = {
  nps: { nome: 'Describe do NPS (notas de 0 a 10)', analises: ['nps'] },
  causa: { nome: 'Relate de Group NPS com a Causa Raiz (resposta múltipla)', analises: ['causa-raiz', 'grupos', 'molho', 'breakdown'] },
  relate: { nome: 'Relate de Group NPS com outra variável (driver, segmento…)', analises: ['grupos', 'breakdown'] },
  grupos: { nome: 'Relate do NPS (0 a 10) com outra variável (resultado, CES, CSAT…)', analises: ['grupos', 'breakdown'] },
  textiq: { nome: 'Text iQ (média de quem mencionou cada tema)', analises: ['textiq'] },
  ces: { nome: 'Describe do CES (escala de 1 a 7)', analises: ['ces'] },
  csat: { nome: 'Relate de Group NPS com um CSAT', analises: ['csat-grupos'] },
  regressao: { nome: 'Regressão (importância relativa)', analises: ['regressao'] },
  pivot: { nome: 'Pivot Table de Group NPS por driver e área', analises: ['breakdown'] },
};

// Que análise é este Excel? Vê a estrutura, não o nome do ficheiro.
export function identificar(rows) {
  const topo = rows.slice(0, 12).flat().map(texto).join(' \n ');
  const tudo = rows.slice(0, 80).flat().map(texto).join(' \n ');
  if (/^pivot table result/i.test(texto(rows[0]?.[0]))) return 'pivot';
  if (linhaCom(rows, /^is checked\??$/i) >= 0 || /\b(level 1|level 2|topic hierarchy)\b/i.test(topo)) return 'textiq';
  if (/relative importance/i.test(tudo)) return 'regressao';
  const cs = lerCounts(rows);
  if (cs) return cs.every(g => grupoDe(g.nome)) ? 'csat' : 'grupos';
  if (/checked count/i.test(tudo)) return 'causa';
  if (rows.some(r => lower(r?.[0]) === 'count') && rows.some(r => grupoDe(r?.[0]))) return 'relate';
  if (/\b(ces|customer effort)\b|esforço/i.test(topo) && /(^|\n)\s*count of/i.test(tudo)) return 'ces';
  if (/\bnps\b/i.test(topo) && /(^|\n)\s*count of/i.test(tudo)) return 'nps';
  return null;
}

// ---------- NPS: distribuição 0–10 (Stats iQ "Describe" de NPS numérico) ----------
export function parseNps(rows) {
  const tipo = identificar(rows);
  if (tipo && tipo !== 'nps')
    throw new FicheiroErrado(`Este Excel é um ${TIPOS[tipo].nome}. Nesta tab entra o Describe do NPS (notas de 0 a 10).`, ['A tabela "Count of NPS" com as notas de 0 a 10']);
  const contagens = Array(11).fill(null);
  // A tabela certa vem depois do cabeçalho "Count of NPS…" (antes há a tabela de percentis, que também tem 0–10).
  const iCab = rows.findIndex(r => (r || []).some(c => /^count of/i.test(texto(c))));
  for (const r of iCab >= 0 ? rows.slice(iCab + 1) : rows) {
    if (!r) continue;
    const nota = inteiro(r[0]), n = inteiro(r[1]);
    if (nota == null || n == null || nota < 0 || nota > 10 || n < 0) continue;
    if (contagens[nota] == null) contagens[nota] = n;
  }
  const encontradas = contagens.filter(v => v != null).length;
  const total = contagens.reduce((a, b) => a + (b || 0), 0);
  if (encontradas < 6 || total === 0)
    throw new FicheiroErrado('Não encontrei a tabela de notas de 0 a 10 com o número de respostas. Confirma que exportaste o Describe do NPS (numérico) no Stats iQ.',
      [iCab < 0 ? 'O cabeçalho "Count of NPS"' : 'As linhas com cada nota (0 a 10) e o número de respostas', 'A variável "(Numeric) NPS" com a opção Describe']);
  return { contagens: contagens.map(v => v || 0), periodo: extrairPeriodo(rows), filtros: extrairFiltros(rows), pergunta: extrairPergunta(rows) };
}

// ---------- NPS por Causa Raiz (Stats iQ "Relate" de Group NPS × causa de resposta múltipla) ----------
const grupoDe = s => {
  s = lower(s);
  if (/detra|detract/.test(s)) return 'd';
  if (/neutr|passiv/.test(s)) return 'n';
  if (/promo/.test(s)) return 'p';
  return null;
};

function limparTitulo(s) {
  const m = texto(s).split(/\s+vs\.?\s+/i);
  let t = (m[1] || m[0] || '').trim();
  t = t.replace(/^(CR\s*Store_|CR[_\s-]+|RC[_\s-]+)/i, '').replace(/\s*-\s*Quais.*$/i, '').trim();
  return t;
}

export function parseCausas(rows) {
  const tipo = identificar(rows);
  if (tipo && tipo !== 'causa' && tipo !== 'relate')
    throw new FicheiroErrado(`Este Excel é um ${TIPOS[tipo].nome}. Nesta tab entra o Relate de Group NPS com a Causa Raiz.`, ['O bloco com "Checked Count" por Detrator, Neutro e Promotor']);
  return lerCausas(rows);
}

// Leitura do Relate de "(Group) NPS" × variável, sem verificar o tipo (também usada pelo NPS por grupo)
function lerCausas(rows) {

  let titulo = '';
  for (const r of rows.slice(0, 5)) for (const c of r || []) if (/\svs\.?\s/i.test(texto(c)) && !titulo) titulo = limparTitulo(c);

  const mapa = new Map();
  const somar = (nome, g, n) => {
    if (!nome || g == null || n == null) return;
    if (!mapa.has(nome)) mapa.set(nome, { nome, d: 0, n: 0, p: 0 });
    mapa.get(nome)[g] += n;
  };

  // 1) Bloco vertical: [grupo NPS, causa, Checked Count, Sample Size do grupo, Sample Size da causa]
  const amostraGrupo = { d: 0, n: 0, p: 0 };
  const inicio = rows.findIndex(r => (r || []).some(c => /checked count|sample size of/i.test(texto(c))));
  if (inicio >= 0) {
    let grupoAtual = null;
    for (let i = inicio + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const primeira = lower(r.find(c => texto(c) !== ''));
      if (/^(count|all %|check %|category %|chi-squared)/.test(primeira)) break;
      const g = grupoDe(r[0]);
      if (g) grupoAtual = g;
      const nome = texto(r[1]);
      const n = inteiro(r[2]);
      if (grupoAtual && nome && n != null) somar(nome, grupoAtual, n);
      const ag = inteiro(r[3]);
      if (g && ag != null) amostraGrupo[g] = Math.max(amostraGrupo[g], ag);
    }
  }

  // 2) Alternativa: bloco horizontal "Count" (linhas = grupos, colunas = causas)
  if (mapa.size === 0) {
    let iCount = -1;
    rows.forEach((r, i) => { if ((r || []).some(c => lower(c) === 'count')) iCount = i; });
    if (iCount >= 0) {
      const cab = rows[iCount + 1] || [];
      for (let i = iCount + 2; i < Math.min(rows.length, iCount + 10); i++) {
        const r = rows[i] || [];
        const g = grupoDe(r[0]);
        if (!g) continue;
        for (let j = 1; j < cab.length; j++) {
          const nome = texto(cab[j]);
          if (nome && !/^total$/i.test(nome)) somar(nome, g, inteiro(r[j]));
        }
      }
    }
  }

  const todas = [...mapa.values()].map(c => ({ ...c, total: c.d + c.n + c.p }));
  const causas = todas.filter(c => c.total > 0);
  if (causas.length === 0)
    throw new FicheiroErrado('Não encontrei as linhas Detrator / Neutro / Promotor por causa. Confirma que exportaste o Relate de Group NPS com a Causa Raiz no Stats iQ.',
      [inicio < 0 ? 'A coluna "Checked Count"' : 'Linhas com Detrator, Neutro e Promotor e o número de menções', 'Variável principal "(Group) NPS" e secundária a Causa Raiz, com a opção Relate']);
  const semRespostas = todas.filter(c => c.total === 0).map(c => c.nome);
  const respondentes = amostraGrupo.d + amostraGrupo.n + amostraGrupo.p;
  return { titulo, causas, semRespostas, multi: inicio >= 0 && mapa.size > 0 && respondentes > 0, amostraGrupo: respondentes ? amostraGrupo : null, periodo: extrairPeriodo(rows), filtros: extrairFiltros(rows), pergunta: extrairPergunta(rows) };
}

// =====================================================================
// Tipos novos (2026-11-04). Cada um devolve dados normalizados que a vista usa.
// =====================================================================

const numero = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = texto(v).replace(/\s/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
};
const resumoBase = rows => ({ periodo: extrairPeriodo(rows), filtros: extrairFiltros(rows), pergunta: extrairPergunta(rows) });
const linhaCom = (rows, re, min = 1) => rows.findIndex(r => (r || []).filter(c => re.test(texto(c))).length >= min);

// Tabela "Counts": linhas = nota, colunas = "Count of <grupo>". Devolve [{ nome, contagens: Map(nota → n) }].
function lerCounts(rows) {
  const i = linhaCom(rows, /^count of\s+/i, 2);
  if (i < 0) return null;
  const cab = rows[i] || [];
  const cols = cab.map((c, j) => [j, texto(c)]).filter(([, s]) => /^count of\s+/i.test(s)).map(([j, s]) => [j, s.replace(/^count of\s+/i, '').trim()]);
  const grupos = cols.map(([, nome]) => ({ nome, contagens: new Map() }));
  let lidas = 0;
  for (const r of rows.slice(i + 1, i + 30)) {
    const nota = inteiro(r?.[0]);
    if (nota == null) { if (lidas) break; continue; }
    lidas++;
    cols.forEach(([j], k) => { const n = inteiro(r[j]); if (n != null) grupos[k].contagens.set(nota, n); });
  }
  return lidas ? grupos : null;
}

// ---------- NPS por grupo: driver, resultado da inspeção, segmento, CES, CSAT… ----------
// Aceita os dois formatos do Stats iQ:
//  A) Relate de "(Group) NPS" com outra variável: bloco "Count" com Detrator/Neutro/Promotor × grupo
//     (ou o bloco vertical "Checked Count" quando a variável é de resposta múltipla, ex.: Topics);
//  B) Relate de NPS (0–10) com outra variável: tabela "Counts" com as notas 0–10 × "Count of <grupo>".
// Ordem das escalas conhecidas (o resto vai por número de respostas)
const ESCALAS = [
  ['discordo totalmente', 'discordo', 'discordo parcialmente', 'nem discordo, nem concordo', 'concordo parcialmente', 'concordo', 'concordo totalmente'],
  ['muito insatisfeito', 'insatisfeito', 'neutro', 'satisfeito', 'muito satisfeito'],
];
export function ordemEscala(nomes) {
  const ls = nomes.map(lower);
  for (const e of ESCALAS) if (ls.length >= 2 && ls.every(n => e.includes(n))) return n => e.indexOf(lower(n));
  return null;
}

export function parseGrupos(rows) {
  const topo = rows.slice(0, 12).flat().map(texto).join(' \n ');
  if (linhaCom(rows, /^is checked\??$/i) >= 0)
    throw new FicheiroErrado('Este Excel é um Text iQ (média de quem mencionou cada tema). Nesta tab entra o Relate do NPS com outra variável.', ['O NPS cruzado com a variável (driver, resultado, segmento…) com a opção Relate']);
  if (/relative importance|regression/i.test(topo))
    throw new FicheiroErrado('Este Excel é uma Regressão. Nesta tab entra o Relate do NPS com outra variável.', ['O NPS cruzado com a variável com a opção Relate']);

  // B) notas 0–10 por grupo
  const cs = lerCounts(rows);
  if (cs && !cs.every(g => grupoDe(g.nome))) {
    const notas = new Set(cs.flatMap(g => [...g.contagens.keys()]));
    if ([...notas].every(n => n >= 0 && n <= 10)) {
      const grupos = cs.map(g => {
        const c = Array.from({ length: 11 }, (_, k) => g.contagens.get(k) || 0);
        const total = c.reduce((a, b) => a + b, 0);
        return { nome: g.nome, d: c.slice(0, 7).reduce((a, b) => a + b, 0), n: c[7] + c[8], p: c[9] + c[10], total, media: total ? c.reduce((a, v, k) => a + v * k, 0) / total : null };
      });
      return { grupos: grupos.filter(g => g.total > 0), semRespostas: grupos.filter(g => !g.total).map(g => g.nome), multi: false, amostraGrupo: null, ...resumoBase(rows) };
    }
  }
  // A) Group NPS × variável
  let base;
  try { base = lerCausas(rows); } catch (e) {
    throw new FicheiroErrado('Não encontrei o NPS por grupo. Confirma que exportaste, no Stats iQ, o NPS cruzado com a variável desta tab com a opção Relate.',
      ['A tabela "Count" com Detrator, Neutro e Promotor por grupo', 'ou a tabela "Counts" com as notas de 0 a 10 por grupo']);
  }
  return { grupos: base.causas, semRespostas: base.semRespostas, multi: !!base.multi, amostraGrupo: base.amostraGrupo, ...resumoBase(rows) };
}

// ---------- Text iQ: média da recomendação de quem mencionou cada tema (CHECKED / UNCHECKED) ----------
export function parseTextiq(rows) {
  const i = linhaCom(rows, /^is checked\??$/i);
  if (i < 0) {
    const tipo = identificar(rows);
    throw new FicheiroErrado(`${tipo ? `Este Excel é um ${TIPOS[tipo].nome}. ` : ''}Nesta tab entra o Text iQ: NPS (numérico) cruzado com os temas, com as linhas CHECKED e UNCHECKED.`,
      ['A coluna "Is Checked?" com CHECKED e UNCHECKED', 'As colunas "Average" e "Sample Size"']);
  }
  const cab = (rows[i] || []).map(lower);
  const col = re => cab.findIndex(c => re.test(c));
  const cChk = col(/^is checked/), cMed = col(/^average$/), cSoma = col(/^sum$/), cN = col(/^sample size$/);
  const mapa = new Map();
  for (const r of rows.slice(i + 1)) {
    const nome = texto(r?.[0]), chk = lower(r?.[cChk]);
    if (!nome) break;
    if (chk !== 'checked' && chk !== 'unchecked') continue;
    if (!mapa.has(nome)) mapa.set(nome, { nome, nC: 0, somaC: 0, nU: 0, somaU: 0 });
    const t = mapa.get(nome), n = inteiro(r[cN]) || 0;
    const soma = cSoma >= 0 && numero(r[cSoma]) != null ? numero(r[cSoma]) : (numero(r[cMed]) || 0) * n;
    if (chk === 'checked') { t.nC = n; t.somaC = soma; } else { t.nU = n; t.somaU = soma; }
  }
  const temas = [...mapa.values()];
  if (!temas.length) throw new FicheiroErrado('Encontrei o cabeçalho do Text iQ mas nenhuma linha de tema.', ['Linhas com o nome do tema e CHECKED / UNCHECKED']);
  const ref = temas.reduce((a, t) => (t.nC + t.nU > a.nC + a.nU ? t : a), temas[0]);
  const total = ref.nC + ref.nU;
  return { temas, total, media: total ? (ref.somaC + ref.somaU) / total : null, variavel: texto(rows[i][0]).replace(/\s*-\s*topic hierarchy.*$/i, ''), ...resumoBase(rows) };
}

// ---------- CES: distribuição das respostas numa escala (1 a 7) ----------
export function parseCes(rows) {
  const topo = rows.slice(0, 12).flat().map(texto).join(' \n ');
  const i = rows.findIndex(r => /^count of\s+/i.test(texto(r?.[1])));
  if (!/\bces\b|esforço|effort/i.test(topo) || i < 0) {
    const tipo = identificar(rows);
    throw new FicheiroErrado(`${tipo ? `Este Excel é um ${TIPOS[tipo].nome}. ` : ''}Nesta tab entra o Describe do CES (escala de 1 a 7).`, ['A variável CES com a opção Describe', 'A tabela "Count of CES" com cada valor da escala']);
  }
  const contagens = new Map();
  for (const r of rows.slice(i + 1, i + 15)) { const v = inteiro(r?.[0]), n = inteiro(r?.[1]); if (v == null || n == null) { if (contagens.size) break; continue; } contagens.set(v, n); }
  const vals = [...contagens.keys()];
  if (vals.length < 3 || Math.max(...vals) > 10) throw new FicheiroErrado('Não encontrei a contagem de cada valor do CES.', ['As linhas 1 a 7 com o número de respostas']);
  const min = Math.min(1, ...vals), max = Math.max(7, ...vals);
  return { min, max, contagens: Array.from({ length: max - min + 1 }, (_, k) => contagens.get(min + k) || 0), ...resumoBase(rows) };
}

// ---------- CSAT por grupo de NPS (um Excel por atributo; ex.: Overview CSAT's da Brisa) ----------
export function parseCsatGrupos(rows) {
  const cs = lerCounts(rows);
  const nomeCsat = rows.slice(0, 40).flat().map(texto).find(s => /^csat[_\s-]/i.test(s));
  if (!cs || !cs.every(g => grupoDe(g.nome)) || !nomeCsat)
    throw new FicheiroErrado('Nesta tab entra o Relate de "(Group) NPS" com um CSAT (um Excel por CSAT).', ['Uma variável CSAT (ex.: CSAT_EficiênciaServiço)', 'A tabela "Counts" com "Count of Detrator / Passivo / Promotor"']);
  const porGrupo = { d: null, n: null, p: null };
  for (const g of cs) porGrupo[grupoDe(g.nome)] = Object.fromEntries(g.contagens);
  return { atributo: nomeCsat.replace(/^csat[_\s-]*/i, '').replace(/([a-zà-ú])([A-ZÀ-Ú])/g, '$1 $2').trim(), porGrupo, ...resumoBase(rows) };
}

// ---------- Regressão: importância relativa de cada variável no NPS ----------
export function parseRegressao(rows) {
  const i = rows.findIndex(r => (r || []).some(c => lower(c) === 'relative importance'));
  if (i < 0) throw new FicheiroErrado('Nesta tab entra a Regressão do NPS com os CSAT (Stats iQ, opção Regression).', ['A coluna "Relative Importance"', 'As variáveis de entrada (ex.: CSAT_Serviço)']);
  const cab = (rows[i] || []).map(lower);
  const cNome = cab.indexOf('variable'), cImp = cab.indexOf('relative importance'), cCoef = cab.indexOf('coefficient');
  const variaveis = [];
  for (const r of rows.slice(i + 1)) {
    const nome = texto(r?.[cNome]), imp = numero(r?.[cImp]);
    if (!nome || imp == null) break;
    variaveis.push({ nome: nome.replace(/^csat[_\s-]*/i, ''), imp: imp * 100, coef: numero(r?.[cCoef]) });
  }
  const j = rows.findIndex(r => (r || []).some(c => lower(c) === 'r-squared'));
  let n = null, r2 = null;
  if (j >= 0) {
    const c = (rows[j] || []).map(lower), v = rows[j + 1] || [];
    n = inteiro(String(v[c.indexOf('sample size')] ?? '').replace(/[.,\s]/g, ''));
    r2 = numero(v[c.indexOf('r-squared')]);
  }
  if (!variaveis.length) throw new FicheiroErrado('Encontrei a tabela da regressão mas sem variáveis.', ['Linhas com cada variável e a sua Relative Importance']);
  return { variaveis: variaveis.sort((a, b) => b.imp - a.imp), n, r2, ...resumoBase(rows) };
}

// ---------- Pivot Table: Group NPS por driver e por área num só Excel ----------
// Linhas "Driver | Área | Detrator | Neutro | Promotor | Total"; a linha "Total" fica de fora.
// Devolve uma lista de "ficheiros", um por área, como se cada área viesse no seu Excel.
const PISTA_AREA = /área|area|centro|loja|local|regi|zona|posto|esta[cç]/i;
export function parsePivot(rows) {
  const iRows = rows.findIndex(r => lower(r?.[0]) === 'rows');
  const iCab = rows.findIndex(r => (r || []).some(c => lower(c) === 'detrator') && (r || []).some(c => lower(c) === 'promotor'));
  if (iRows < 0 || iCab < 0) {
    throw new FicheiroErrado('Esta Pivot Table não tem o formato esperado.', ['Nas linhas: o driver e, por baixo, a área ou o centro', 'Nas colunas: (Group) NPS, com COUNT']);
  }
  const nomes = (rows[iRows + 1] || []).slice(0, 2).map(c => texto(c).replace(/^embedded data\s*-\s*|^survey metadata\s*-\s*/i, ''));
  const cA = !PISTA_AREA.test(nomes[1]) && PISTA_AREA.test(nomes[0]) ? 0 : 1, cG = 1 - cA;
  const cab = rows[iCab].map(lower);
  const col = k => cab.indexOf(k);
  const [cd, cn, cp] = [col('detrator'), col('neutro'), col('promotor')];
  const areas = new Map();
  for (const r of rows.slice(iCab + 1)) {
    const g = texto(r?.[cG]), a = texto(r?.[cA]);
    if (!g || !a || /^total$/i.test(g) || /^total$/i.test(a)) continue;
    const [d, n, p] = [cd, cn, cp].map(c => numero(r[c]) || 0);
    if (!areas.has(a)) areas.set(a, []);
    areas.get(a).push({ nome: g, d, n, p, total: d + n + p });
  }
  if (!areas.size) throw new FicheiroErrado('A Pivot Table não tem linhas com contagens.', ['Linhas com driver, área e as contagens de Detrator, Neutro e Promotor']);
  const base = resumoBase(rows);
  const campo = nomes[cA] || 'Área';
  const ficheiros = [...areas.entries()].sort((x, y) => x[0].localeCompare(y[0], 'pt')).map(([a, grupos]) => ({
    grupos, semRespostas: [], multi: false, amostraGrupo: null, ...base,
    filtros: [...base.filtros, { campo, valor: `igual a ${a}` }], area: { campo, valor: a },
  }));
  return { pivot: true, ficheiros, periodo: base.periodo, filtros: base.filtros, campoArea: campo, variavel: nomes[cG] };
}

// NPS por Driver: um Excel do Relate (uma área) ou uma Pivot Table (todas as áreas)
export const parseBreakdown = rows => (identificar(rows) === 'pivot' ? parsePivot(rows) : parseGrupos(rows));
