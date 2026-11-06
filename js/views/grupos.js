// Tipo "NPS por grupo": o NPS de cada valor de outra variável.
// Serve para NPS por Driver, NPS x Resultado Inspeção, Segmento, NPS x CES, NPS x CSAT e Topics (resposta múltipla).
// As palavras mudam com a tab (brands.js → termos): ex. { um: 'driver', varios: 'drivers', col: 'Driver' }.
import { CORES, corMeta, enriquecerCausas, comZeros, npsDe, fmt, sinal, LIMITES } from '../stats.js?v=20261106-1418';
import { esc, def } from '../ui.js?v=20261106-1418';
import { ordemEscala } from '../excel.js?v=20261106-1418';
import { baseGrafico, textoDe } from '../export.js?v=20261106-1418';
import { kpi, kpis, cartao, LEGENDA_DNP, tabelaHtml, ligarTabela, alternar, ligarAlternar, ligarModo, barrasH, composicao, pptBarras, pptComposicao, pptTabela } from './comum.js?v=20261106-1418';

const LIM = LIMITES.amostraPequena;
const T0 = { um: 'grupo', varios: 'grupos', col: 'Grupo' };
const termos = tab => ({ ...T0, ...(tab?.termos || {}) });

// Itens com NPS, %, peso e, se a variável for uma escala (ex.: Discordo… Concordo), a ordem da escala
function itens(data) {
  const a = data.amostraGrupo;
  const todos = enriquecerCausas(comZeros(data.grupos, data.semRespostas), a ? a.d + a.n + a.p : 0);
  const ordem = ordemEscala(todos.map(c => c.nome));
  if (ordem) todos.sort((a, b) => ordem(a.nome) - ordem(b.nome));
  else todos.sort((a, b) => (a.zero - b.zero) || (b.total - a.total));
  return { todos, ordem };
}

// NPS de todas as pessoas: pelo tamanho de cada grupo (resposta múltipla) ou pela soma dos grupos
function geral(data) {
  const a = data.amostraGrupo || data.grupos.reduce((s, g) => ({ d: s.d + g.d, n: s.n + g.n, p: s.p + g.p }), { d: 0, n: 0, p: 0 });
  const t = a.d + a.n + a.p;
  return { nps: npsDe(a.d, a.p, t), total: t, pctD: (a.d / t) * 100, pctP: (a.p / t) * 100 };
}
const fiaveis = cs => cs.filter(c => !c.zero && !c.semSugestao && !c.amostraPequena);

export function chips(rec) {
  return { respostas: geral(rec.data).total, rotulo: rec.data.multi ? 'Pessoas' : 'Respostas' };
}

export function resumo(rec, meta, tab) {
  const T = termos(tab);
  const { todos, ordem } = itens(rec.data);
  const g = geral(rec.data);
  const f = fiaveis(todos);
  const lista = f.length ? f : todos.filter(c => !c.zero);
  const melhor = [...lista].sort((a, b) => b.nps - a.nps)[0], pior = [...lista].sort((a, b) => a.nps - b.nps)[0];
  const abaixo = f.filter(c => c.nps < meta);
  const partes = [`Com base em <strong>${fmt(g.total)}</strong> ${rec.data.multi ? 'pessoas' : 'respostas'}, o NPS foi <strong>${fmt(g.nps)}</strong>, ${g.nps > meta ? 'acima do' : g.nps === meta ? 'em linha com o' : 'abaixo do'} objetivo (${meta}).`];
  if (ordem && f.length >= 2) {
    const [a, z] = [f[0], f[f.length - 1]];
    partes.push(`De <strong>${esc(a.nome)}</strong> para <strong>${esc(z.nome)}</strong>, o NPS vai de <strong>${sinal(a.nps)}</strong> a <strong>${sinal(z.nps)}</strong>.`);
  } else if (melhor && pior && melhor !== pior) {
    partes.push(`O ${T.um} com melhor NPS é <strong>${esc(melhor.nome)}</strong> (${sinal(melhor.nps)}) e o com pior é <strong>${esc(pior.nome)}</strong> (${sinal(pior.nps)}, ${fmt(pior.pctD)}% de detratores).`);
  }
  partes.push(abaixo.length ? (f.length === 1 ? `O único ${T.um} com ${LIM} ou mais respostas (${esc(f[0].nome)}) está abaixo do objetivo.` : `<strong>${abaixo.length}/${f.length}</strong> ${T.varios} ${abaixo.length === 1 ? 'está' : 'estão'} abaixo do objetivo.`) : `Nenhum ${T.um} com ${LIM} ou mais respostas está abaixo do objetivo.`);
  return {
    tom: g.nps < meta ? 'bad' : 'good',
    texto: partes.join(' '),
    factos: [
      ...(melhor && pior && melhor !== pior ? [{ valor: fmt(melhor.nps - pior.nps), rot: `pontos de NPS entre o melhor ${T.um} e o pior`, tip: `${melhor.nome} tem NPS ${fmt(melhor.nps)} e ${pior.nome} tem ${fmt(pior.nps)}: ${fmt(melhor.nps - pior.nps)} pontos de diferença. Só contam ${T.varios} com ${LIM} ou mais respostas${f.length ? '' : ' (aqui nenhum tem, por isso entram todos)'}.` }] : []),
      { valor: `${fmt(abaixo.length)}/${fmt(f.length)}`, rot: `${T.varios} com NPS abaixo do objetivo (${meta})`, tom: abaixo.length ? 'bad' : 'good', tip: `${T.varios[0].toUpperCase() + T.varios.slice(1)} com ${LIM} ou mais respostas e NPS abaixo do objetivo (${meta}). ${abaixo.length ? `São: ${abaixo.map(c => `${c.nome} (NPS ${fmt(c.nps)})`).join('; ')}.` : 'Nenhum neste Excel.'}` },
    ],
  };
}

const colunasTab = (T, multi, temMedia, meta) => [{ k: 'nome', rot: T.col }, { k: 'nps', rot: 'NPS', r: true },
  { k: 'dif', rot: 'Face ao objetivo', r: true, tip: `NPS menos o objetivo (${meta}). Positivo: acima do objetivo. Negativo: quantos pontos faltam.` },
  { k: 'total', rot: multi ? 'Menções' : 'Respostas', r: true },
  { k: 'vD', rot: 'Detratores', r: true }, { k: 'vN', rot: 'Neutros', r: true }, { k: 'vP', rot: 'Promotores', r: true },
  { k: 'quota', rot: '% das respostas', r: true }, ...(temMedia ? [{ k: 'media', rot: 'Nota média', r: true }] : [])];

const sub = (c, multi) => (c.zero ? `0 ${multi ? 'menções' : 'respostas'}` : `${fmt(c.total)} ${multi ? 'menções' : 'respostas'} · ${fmt(c.quota)}% · NPS ${fmt(c.nps)}`);

export function html(rec, meta, tab) {
  const T = termos(tab);
  const { todos } = itens(rec.data);
  const g = geral(rec.data);
  const multi = rec.data.multi;
  const comResp = todos.filter(c => !c.zero);
  const abaixo = fiaveis(todos).filter(c => c.nps < meta);
  const mencoes = comResp.reduce((a, c) => a + c.total, 0);
  const temMedia = todos.some(c => c.media != null);
  const maisPeso = [...comResp].sort((x, y) => y.total - x.total)[0];
  return `
    ${kpis([
      kpi('NPS geral', fmt(g.nps), `${fmt(g.total)} ${multi ? 'pessoas' : 'respostas'} · objetivo ${meta}`, `NPS de todas as ${fmt(g.total)} ${multi ? 'pessoas que responderam' : 'respostas do Excel'}: ${fmt(g.pctP, 1)}% promotores − ${fmt(g.pctD, 1)}% detratores = ${fmt(g.pctP - g.pctD, 1)}, arredondado a ${fmt(g.nps)}. Objetivo da marca: ${meta} (${g.nps >= meta ? `${fmt(g.nps - meta)} pontos acima` : `${fmt(meta - g.nps)} pontos abaixo`}).`, true),
      multi ? kpi('Menções', fmt(mencoes), 'uma pessoa pode escolher vários', `Soma das vezes que cada ${T.um} foi escolhido: ${fmt(mencoes)}. Uma pessoa pode escolher mais do que um, por isso não é o número de pessoas (${fmt(g.total)}).`)
        : kpi('Respostas', fmt(g.total), `notas de 0 a 10`, `Respostas com nota de 0 a 10, somando todos os ${T.varios}: ${fmt(g.total)}.`),
      maisPeso ? kpi(`${T.um[0].toUpperCase() + T.um.slice(1)} que mais pesa`, `<span class="kv-txt">${esc(maisPeso.nome)}</span>`, `${fmt(maisPeso.quota)}% das ${multi ? 'pessoas' : 'respostas'} · NPS ${fmt(maisPeso.nps)}`, `${maisPeso.nome} é o ${T.um} com mais ${multi ? 'menções' : 'respostas'}: ${fmt(maisPeso.total)}/${fmt(g.total)} (${fmt(maisPeso.quota, 1)}%), com NPS ${fmt(maisPeso.nps)}. Como junta a maior parte dos clientes, é o que mais mexe no NPS geral.`)
        : kpi('Com respostas', `${fmt(comResp.length)}/${fmt(todos.length)}`, T.varios, ''),
      kpi('Abaixo do objetivo', `${fmt(abaixo.length)}/${fmt(fiaveis(todos).length)}`, abaixo.length ? `${T.varios} com NPS abaixo de ${meta}` : `nenhum ${T.um}`, `${T.varios[0].toUpperCase() + T.varios.slice(1)} com ${LIM} ou mais respostas cujo NPS fica abaixo do objetivo (${meta}). ${abaixo.length ? `Neste Excel: ${abaixo.map(c => `${c.nome} (NPS ${fmt(c.nps)}, ${fmt(c.total)} respostas)`).join('; ')}.` : 'Neste Excel nenhum está abaixo.'}`),
    ])}
    ${cartao('nps', `NPS por ${T.um}`, `Uma barra por ${T.um}, com o NPS de quem ${multi ? 'o escolheu' : 'está nesse ' + T.um} (de −100 a 100). Verde: no objetivo (${meta}) ou acima. Vermelho: abaixo. A linha amarela é o objetivo. Por baixo do nome estão as respostas. ${itens(rec.data).ordem ? 'Os valores seguem a ordem da escala.' : `Os ${T.varios} vão do que tem mais respostas para o que tem menos.`}`,
      { nota: `Linha amarela: objetivo (${meta}).`, aria: `NPS por ${T.um}` })}
    ${tabelaHtml('tab', `Quem respondeu em cada ${T.um}`, `Começa no gráfico: cada barra é 100% de quem ${multi ? 'escolheu' : 'está em'} esse ${T.um}, dividida em detratores (vermelho, notas 0 a 6), neutros (cinzento, 7 e 8) e promotores (verde, 9 e 10). O botão Tabela mostra os mesmos resultados numa tabela. Uma linha por ${T.um}. NPS: % promotores − % detratores (vermelho se abaixo do objetivo, ${meta}). Face ao objetivo: quantos pontos o NPS está acima (+) ou abaixo (−) do objetivo. ${multi ? 'Menções' : 'Respostas'}: quantas pessoas. Detratores, neutros e promotores: o botão "%" mostra a parte de cada grupo e o botão "Pessoas" mostra quantas são. % das respostas: das ${fmt(geral(rec.data).total)} pessoas que responderam ao NPS, quantas ${multi ? 'escolheram' : 'estão em'} este ${T.um}${multi ? ' (uma pessoa pode escolher vários, por isso somam mais de 100%)' : ''}.${temMedia ? ' Nota média: a média das notas de 0 a 10.' : ''} Clica no título de uma coluna para ordenar.`,
      colunasTab(T, multi, temMedia, meta), (T.um.length > 14 ? 'Procurar' : `Procurar ${T.um}`), alternar('tab', [['pct', '%'], ['n', 'Pessoas']], 'pct', 'Mostrar detratores, neutros e promotores em'), { id: 'comp', legenda: LEGENDA_DNP, aria: `Detratores, neutros e promotores por ${T.um}` })}`;
}

export function mount(rec, brand, meta, tab) {
  const T = termos(tab);
  const { todos, ordem } = itens(rec.data);
  const multi = rec.data.multi;
  const temMedia = todos.some(c => c.media != null);
  const comSub = todos.map(c => ({ ...c, sub: sub(c, multi) }));
  barrasH(document.getElementById('ch-nps'), brand, comSub.map(c => ({ ...c, valor: c.nps, cor: corMeta(c.nps, meta), sub: c.zero ? c.sub : `${fmt(c.total)} ${multi ? 'menções' : 'respostas'} · ${fmt(c.quota)}%${c.media != null ? ` · média ${fmt(c.media, 1)}` : ''}` })),
    { min: -100, max: 100, linha: { valor: meta, rotulo: `Objetivo ${meta}` },
      tooltip: c => `<b>${esc(c.nome)}</b><br>NPS ${fmt(c.nps)} · ${fmt(c.total)} ${multi ? 'menções' : 'respostas'}${c.media != null ? `<br>Nota média ${fmt(c.media, 1)}` : ''}${c.amostraPequena ? `<br><i>Menos de ${LIM} respostas</i>` : ''}` });
  composicao(document.getElementById('ch-comp'), brand, comSub);
  ligarModo('tab', 'comp');
  let modo = 'pct';
  const valores = () => comSub.forEach(c => Object.assign(c, modo === 'n' ? { vD: c.d, vN: c.n, vP: c.p } : { vD: c.pctD, vN: c.pctN, vP: c.pctP }, { dif: c.zero ? null : c.nps - meta }));
  const dnp = v => `<td class="r num">${modo === 'n' ? fmt(v) : `${fmt(v)}%`}</td>`;
  valores();
  const pintar = ligarTabela('tab', comSub, c => c.zero ? `
    <tr class="is-zero"><td><span class="name">${esc(c.nome)}</span></td><td class="r muted">–</td><td class="r muted">–</td><td class="r num">0</td><td class="r muted">–</td><td class="r muted">–</td><td class="r muted">–</td><td class="r muted num">0%</td>${temMedia ? '<td class="r muted">–</td>' : ''}</tr>` : `
    <tr class="${c.amostraPequena ? 'is-pequena' : ''}">
      <td><span class="name">${esc(c.nome)}</span>${c.amostraPequena ? ` <span class="badge mid">poucas respostas ${def('amostra')}</span>` : ''}</td>
      <td class="r"><span class="badge ${c.nps < meta ? 'bad' : 'good'} num" title="${c.nps < meta ? `Abaixo do objetivo (${meta})` : `No objetivo (${meta}) ou acima`}">${fmt(c.nps)}</span></td>
      <td class="r num ${c.dif < 0 ? 'neg' : 'pos'}">${sinal(c.dif)}</td>
      <td class="r num">${fmt(c.total)}</td>
      ${dnp(c.vD)}${dnp(c.vN)}${dnp(c.vP)}
      <td class="r muted num">${fmt(c.quota, 1)}%</td>
      ${temMedia ? `<td class="r num">${c.media != null ? fmt(c.media, 1) : '–'}</td>` : ''}
    </tr>`, { chave: ordem ? '_ordem' : 'total', dir: ordem ? 1 : -1, ordemNatural: ordem ? c => ordem(c.nome) : null, vazio: `Nenhum ${T.um} com esse nome.`, ncol: temMedia ? 9 : 8 });
  ligarAlternar('tab', v => { modo = v; valores(); pintar?.(); });
}

export function exportar(rec, brand, meta, tab) {
  const T = termos(tab);
  const { todos } = itens(rec.data);
  const g = geral(rec.data);
  const b = baseGrafico(brand);
  const abaixo = fiaveis(todos).filter(c => c.nps < meta);
  const temMedia = todos.some(c => c.media != null);
  return {
    kpis: [
      { rot: 'NPS geral', val: fmt(g.nps), det: `${fmt(g.total)} ${rec.data.multi ? 'pessoas' : 'respostas'} · objetivo ${meta}` },
      ...(() => { const m = [...todos].filter(c => !c.zero).sort((x, y) => y.total - x.total)[0]; return m ? [{ rot: `${T.um[0].toUpperCase() + T.um.slice(1)} que mais pesa`, val: m.nome, det: `${fmt(m.quota)}% · NPS ${fmt(m.nps)}` }] : []; })(),
      { rot: 'Abaixo do objetivo', val: `${fmt(abaixo.length)}/${fmt(fiaveis(todos).length)}`, det: abaixo.map(c => c.nome).join(', ') || `nenhum ${T.um}` },
    ],
    resumo: [textoDe(resumo(rec, meta, tab).texto)],
    filtros: rec.data.filtros,
    graficos: [
      { id: 'nps', titulo: `NPS por ${T.um}`, desenhar: pptBarras(b, todos.map(c => ({ ...c, valor: c.nps })), { nome: 'NPS', min: -100, max: 100 }) },
      { id: 'comp', titulo: `Quem respondeu em cada ${T.um}`, desenhar: pptComposicao(b, todos) },
      { id: 'tab', titulo: 'Tabela', desenhar: pptTabela(b, [T.col, 'NPS', 'Face ao objetivo', rec.data.multi ? 'Menções' : 'Respostas', 'Detratores', 'Neutros', 'Promotores', '% das respostas', ...(temMedia ? ['Nota média'] : [])],
        todos.map(c => [c.nome, c.zero ? '–' : fmt(c.nps), c.zero ? '–' : sinal(c.nps - meta), fmt(c.total), `${fmt(c.pctD)}%`, `${fmt(c.pctN)}%`, `${fmt(c.pctP)}%`, `${fmt(c.quota, 1)}%`, ...(temMedia ? [c.media != null ? fmt(c.media, 1) : '–'] : [])]),
        { dir: [1, 2, 3, 4, 5, 6, 7, 8] }) },
    ],
  };
}

export const importar = {
  titulo: 'Como importar os dados de NPS por grupo',
  texto: 'No Stats iQ, selecione a variável principal "(Group) NPS" (ou o NPS de 0 a 10) e, como variável secundária, a variável desta tab (driver, resultado da inspeção, segmento, CES ou CSAT). Em seguida, execute a opção "Relate" e exporte a tabela para Excel.',
};
