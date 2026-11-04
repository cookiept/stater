// Tipo "Text iQ": média da recomendação (0 a 10) de quem mencionou cada tema nas sugestões,
// comparada com quem não o mencionou (linhas CHECKED / UNCHECKED do Stats iQ).
// Serve para Topics, Causa Raiz (Text iQ), Drivers e Subtopics. Não é NPS: é a média das notas.
import { CORES, fmt, LIMITES } from '../stats.js?v=20261104-1232';
import { base, junta, desenhar, comBrilho, EIXO_VAL } from '../charts.js?v=20261104-1232';
import { esc, def } from '../ui.js?v=20261104-1232';
import { baseGrafico, textoDe } from '../export.js?v=20261104-1232';
import { kpi, kpis, cartao, tabelaHtml, ligarTabela, barrasH, pptBarras, pptTabela } from './comum.js?v=20261104-1232';

const LIM = LIMITES.amostraPequena;
const T0 = { um: 'tema', varios: 'temas', col: 'Tema' };
// Nas frases diz-se sempre "tema"; só o título da coluna muda com a tab (Tema, Causa, Driver, Subtópico)
const termos = tab => ({ ...T0, col: tab?.termos?.col || T0.col });
const m1 = v => fmt(v, 1);
const dif1 = v => (v > 0 ? `+${fmt(v, 1)}` : fmt(v, 1));

function temas(data) {
  return data.temas.map(t => {
    const zero = !t.nC;
    const mediaC = zero ? null : t.somaC / t.nC;
    const mediaU = t.nU ? t.somaU / t.nU : null;
    return { nome: t.nome, total: t.nC, zero, mediaC, mediaU, dif: zero || mediaU == null ? null : mediaC - mediaU,
      pct: data.total ? (t.nC / data.total) * 100 : 0, amostraPequena: !zero && t.nC < LIM, semSugestao: /sem sugest|^outr[oa]s?\b/i.test(t.nome) };
  }).sort((a, b) => (a.zero - b.zero) || (b.total - a.total) || a.nome.localeCompare(b.nome, 'pt'));
}
const fiaveis = ts => ts.filter(t => !t.zero && !t.semSugestao && !t.amostraPequena);

export function chips(rec) { return { respostas: rec.data.total }; }

export function resumo(rec, meta, tab) {
  const T = termos(tab);
  const ts = temas(rec.data), f = fiaveis(ts);
  const media = rec.data.media;
  const mais = f[0] || ts.find(t => !t.zero && !t.semSugestao);
  const pior = [...f].sort((a, b) => a.dif - b.dif)[0];
  const abaixo = f.filter(t => t.mediaC < media);
  const partes = [`Em <strong>${fmt(rec.data.total)}</strong> respostas, a média da recomendação foi <strong>${m1(media)}</strong> em 10.`];
  if (mais) partes.push(`O ${T.um} mais mencionado é <strong>${esc(mais.nome)}</strong> (${fmt(mais.total)} menções, ${fmt(mais.pct, 1)}% das respostas), com média <strong>${m1(mais.mediaC)}</strong>.`);
  if (pior && pior.dif < 0) partes.push(`Quem menciona <strong>${esc(pior.nome)}</strong> dá em média <strong>${fmt(-pior.dif, 1)}</strong> pontos menos do que quem não menciona (${m1(pior.mediaC)} contra ${m1(pior.mediaU)}).`);
  partes.push(abaixo.length ? `<strong>${abaixo.length}</strong> de ${f.length} ${f.length === 1 ? T.um : T.varios} com ${LIM} ou mais menções ${abaixo.length === 1 ? 'fica' : 'ficam'} abaixo da média geral.` : `Nenhum ${T.um} com ${LIM} ou mais menções fica abaixo da média geral.`);
  return {
    tom: pior && pior.dif < -1 ? 'bad' : 'good',
    texto: partes.join(' '),
    factos: [
      ...(pior && pior.dif < 0 ? [{ valor: fmt(pior.dif, 1), rot: `pontos em quem menciona ${pior.nome}`, tom: 'bad', tip: `Média de quem mencionou ${pior.nome} (${m1(pior.mediaC)}, ${fmt(pior.total)} pessoas) menos a média de quem não mencionou (${m1(pior.mediaU)}): ${fmt(pior.dif, 2)}. É o ${T.um} com a maior descida, entre os que têm ${LIM} ou mais menções (sem "Outros" e "Sem sugestões").` }] : []),
      { valor: fmt(abaixo.length), rot: `de ${fmt(f.length)} ${T.varios} abaixo da média`, tom: abaixo.length ? 'bad' : 'good', tip: `${T.col}s com ${LIM} ou mais menções cuja média de quem os mencionou fica abaixo da média geral (${m1(media)}). ${abaixo.length ? `São: ${abaixo.map(t => `${t.nome} (${m1(t.mediaC)})`).join('; ')}.` : ''}` },
    ],
  };
}

export function html(rec, meta, tab) {
  const T = termos(tab);
  const ts = temas(rec.data), f = fiaveis(ts);
  const media = rec.data.media;
  const comM = ts.filter(t => !t.zero);
  const mencoes = comM.reduce((a, t) => a + t.total, 0);
  const abaixo = f.filter(t => t.mediaC < media);
  return `
    ${kpis([
      kpi('Média da recomendação', m1(media), `de 0 a 10 · ${fmt(rec.data.total)} respostas`, `Média das notas de 0 a 10 de todas as ${fmt(rec.data.total)} respostas: ${fmt(media, 2)}. Não é o NPS: é a média simples das notas.`, true),
      kpi('Com menções', fmt(comM.length), `de ${fmt(ts.length)} no Excel`, `${fmt(comM.length)} dos ${fmt(ts.length)} ${T.varios} foram mencionados pelo menos uma vez nas sugestões. ${ts.length - comM.length ? `Os outros ${ts.length - comM.length} aparecem no fim, a cinzento.` : ''}`),
      kpi('Menções', fmt(mencoes), 'uma pessoa pode mencionar vários', `Soma das menções de todos os ${T.varios}: ${fmt(mencoes)}. Uma resposta pode mencionar mais do que um ${T.um}.`),
      kpi('Abaixo da média', fmt(abaixo.length), abaixo.length ? `${T.varios} com média abaixo de ${m1(media)}` : `nenhum ${T.um}`, `${T.col}s com ${LIM} ou mais menções em que a média de quem os mencionou fica abaixo da média geral (${m1(media)}). Não contam "Outros" nem "Sem sugestões".`),
    ])}
    ${cartao('med', `Média de quem mencionou cada ${T.um}`, `Uma barra por ${T.um}: a média das notas (0 a 10) de quem o mencionou. Vermelho: abaixo da média geral (${m1(media)}, linha cinzenta). Verde: igual ou acima. Por baixo do nome estão as menções. Vão do mais mencionado para o menos.`, { nota: `Linha cinzenta: média geral (${m1(media)}).` })}
    ${cartao('mat', 'Onde atuar primeiro', `Cada ponto é um ${T.um} com menções. Para a direita: mais menções. Para baixo: quem o menciona dá notas mais baixas do que quem não o menciona (diferença em pontos, de 0 a 10). Os ${T.varios} mais à direita e mais abaixo pesam mais e baixam mais a recomendação.`)}
    ${tabelaHtml('tab', 'Tabela', `Uma linha por ${T.um}. Menções: quantas respostas o mencionaram. % das respostas: menções a dividir por todas as respostas (${fmt(rec.data.total)}). Média: média das notas de quem o mencionou. Diferença: essa média menos a de quem não o mencionou (negativo = baixa a recomendação). Clica no título de uma coluna para ordenar.`,
      [{ k: 'nome', rot: T.col }, { k: 'total', rot: 'Menções', r: true }, { k: 'pct', rot: '% das respostas', r: true }, { k: 'mediaC', rot: 'Média', r: true }, { k: 'dif', rot: 'Diferença', r: true }], (T.um.length > 14 ? 'Procurar' : `Procurar ${T.um}`))}`;
}

export function mount(rec, brand, meta, tab) {
  const T = termos(tab);
  const ts = temas(rec.data);
  const media = rec.data.media;
  barrasH(document.getElementById('ch-med'), brand, ts.map(t => ({ ...t, valor: t.mediaC, cor: t.mediaC < media ? CORES.det : CORES.pro, sub: `${fmt(t.total)} menções` })),
    { min: 0, max: 10, formato: m1, linha: { valor: +media.toFixed(2), rotulo: `Média ${m1(media)}`, cor: '#9a9a9a' },
      tooltip: t => `<b>${esc(t.nome)}</b><br>${t.zero ? '0 menções' : `Média ${m1(t.mediaC)} · ${fmt(t.total)} menções<br>Quem não mencionou: ${m1(t.mediaU)} (${dif1(t.dif)})`}` });

  const comM = ts.filter(t => !t.zero && t.dif != null);
  const maxX = Math.ceil(Math.max(...comM.map(t => t.total)) * 1.15);
  const minY = Math.min(-1, Math.floor(Math.min(...comM.map(t => t.dif)) - 0.5));
  const maxY = Math.max(1, Math.ceil(Math.max(...comM.map(t => t.dif)) + 0.5));
  desenhar(document.getElementById('ch-mat'), junta(base(brand), {
    grid: { left: 8, right: 24, top: 34, bottom: 30, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => { const t = comM[p.dataIndex]; return `<b>${esc(t.nome)}</b><br>${fmt(t.total)} menções · média ${m1(t.mediaC)}<br>${dif1(t.dif)} face a quem não mencionou`; } },
    xAxis: { type: 'value', min: 0, max: maxX, ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => fmt(v) }, name: 'Menções', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#5f5f5f', fontSize: 12 } },
    yAxis: { type: 'value', min: minY, max: maxY, ...EIXO_VAL, name: 'Diferença (pontos)', nameTextStyle: { color: '#5f5f5f', fontSize: 12, align: 'left' } },
    series: [{ type: 'scatter', symbolSize: 18,
      data: comM.map(t => ({ value: [t.total, +t.dif.toFixed(2)], itemStyle: { color: comBrilho(t.dif < 0 ? CORES.det : CORES.pro), borderColor: '#fff', borderWidth: 3, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.18)' } })),
      label: { show: true, position: 'right', color: '#494949', fontSize: 12, formatter: p => { const t = comM[p.dataIndex]; return t.total >= maxX * 0.06 || t.dif <= minY + 1 ? (t.nome.length > 22 ? t.nome.slice(0, 21) + '…' : t.nome) : ''; } },
      labelLayout: { hideOverlap: true },
      markLine: { symbol: 'none', silent: true, data: [{ yAxis: 0, lineStyle: { color: '#9a9a9a', type: 'solid', width: 1 }, label: { show: false } }] } }],
  }), 360);

  ligarTabela('tab', ts, t => t.zero ? `
    <tr class="is-zero"><td><span class="name">${esc(t.nome)}</span></td><td class="r num">0</td><td class="r muted num">0%</td><td class="r muted">–</td><td class="r muted">–</td></tr>` : `
    <tr class="${t.amostraPequena ? 'is-pequena' : ''}">
      <td><span class="name">${esc(t.nome)}</span>${t.amostraPequena ? ` <span class="badge mid">poucas menções ${def('amostra')}</span>` : ''}</td>
      <td class="r num">${fmt(t.total)}</td>
      <td class="r muted num">${fmt(t.pct, 1)}%</td>
      <td class="r"><span class="badge ${t.mediaC < rec.data.media ? 'bad' : 'good'} num">${m1(t.mediaC)}</span></td>
      <td class="r num" style="color:${t.dif < 0 ? 'var(--text-danger, #ad2c19)' : 'var(--text-success, #10641d)'}">${t.dif == null ? '–' : dif1(t.dif)}</td>
    </tr>`, { vazio: `Nenhum ${T.um} com esse nome.`, ncol: 5 });
}

export function exportar(rec, brand, meta, tab) {
  const T = termos(tab);
  const ts = temas(rec.data);
  const b = baseGrafico(brand);
  return {
    kpis: [
      { rot: 'Média da recomendação', val: m1(rec.data.media), det: `de 0 a 10 · ${fmt(rec.data.total)} respostas` },
      { rot: 'Com menções', val: fmt(ts.filter(t => !t.zero).length), det: `de ${fmt(ts.length)}` },
    ],
    resumo: [textoDe(resumo(rec, meta, tab).texto)],
    filtros: rec.data.filtros,
    graficos: [
      { id: 'med', titulo: `Média de quem mencionou cada ${T.um}`, desenhar: pptBarras(b, ts.map(t => ({ ...t, valor: t.mediaC ?? 0 })), { nome: 'Média', min: 0, max: 10, formato: '0.0' }) },
      { id: 'mat', titulo: 'Diferença face a quem não mencionou', desenhar: pptBarras(b, ts.filter(t => !t.zero).map(t => ({ ...t, valor: t.dif ?? 0 })), { nome: 'Diferença', cor: CORES.det, formato: '0.0' }) },
      { id: 'tab', titulo: 'Tabela', desenhar: pptTabela(b, [T.col, 'Menções', '% das respostas', 'Média', 'Diferença'],
        ts.map(t => [t.nome, fmt(t.total), `${fmt(t.pct, 1)}%`, t.zero ? '–' : m1(t.mediaC), t.dif == null ? '–' : dif1(t.dif)]), { dir: [1, 2, 3, 4] }) },
    ],
  };
}

export const importar = {
  titulo: 'Como importar os dados do Text iQ',
  texto: 'No Stats iQ, selecione a variável principal "NPS" (numérica, de 0 a 10) e, como variável secundária, os tópicos do Text iQ das sugestões (Topic Hierarchy Level 1 ou Level 2). Em seguida, execute a opção "Relate" e exporte a tabela para Excel. O ficheiro tem de ter as linhas CHECKED e UNCHECKED de cada tópico.',
};
