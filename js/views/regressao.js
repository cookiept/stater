// Tipo "Regressão": quanto cada CSAT pesa na recomendação (importância relativa do Stats iQ).
// Ex.: Overview CSAT's da Colibri (Instalações, Serviço, Produtos).
import { fmt } from '../stats.js?v=20261106-1307';
import { esc } from '../ui.js?v=20261106-1307';
import { baseGrafico, textoDe } from '../export.js?v=20261106-1307';
import { kpi, kpis, cartao, tabelaHtml, ligarTabela, barrasH, pptBarras, pptTabela } from './comum.js?v=20261106-1307';

// Cor neutra: a importância não é boa nem má
const NEUTRA = '#14789c';

export function chips(rec) { return { respostas: rec.data.n ?? 0 }; }

export function resumo(rec) {
  const d = rec.data, [a, b2, c] = d.variaveis;
  const partes = [`${d.n ? `Com <strong>${fmt(d.n)}</strong> respostas, os` : 'Os'} ${d.variaveis.length} CSAT explicam <strong>${fmt(d.r2 * 100)}%</strong> da variação da nota de recomendação.`];
  partes.push(`O que mais pesa é <strong>${esc(a.nome)}</strong> (${fmt(+a.imp.toFixed(1))}%)${b2 ? `, seguido de <strong>${esc(b2.nome)}</strong> (${fmt(+b2.imp.toFixed(1))}%)` : ''}${c ? ` e <strong>${esc(c.nome)}</strong> (${fmt(+c.imp.toFixed(1))}%)` : ''}.`);
  return {
    tom: 'good',
    texto: partes.join(' '),
    factos: [
      { valor: `${fmt(+a.imp.toFixed(1))}%`, rot: `peso de ${a.nome}`, tip: `Importância relativa de ${a.nome}: ${fmt(a.imp, 1)}%. As importâncias somam 100%: dizem que parte do efeito explicado vem de cada CSAT.` },
      ...(d.r2 != null ? [{ valor: `${fmt(d.r2 * 100)}%`, rot: 'da nota explicada pelos CSAT', tip: `R² da regressão: ${fmt(d.r2, 3)}. Os CSAT juntos explicam ${fmt(d.r2 * 100, 1)}% das diferenças na nota de recomendação; o resto vem de outros fatores.` }] : []),
    ],
  };
}

export function html(rec) {
  const d = rec.data, a = d.variaveis[0];
  return `
    ${kpis([
      kpi('Nota explicada', d.r2 != null ? `${fmt(d.r2 * 100)}%` : '–', 'R² da regressão', `R² = ${d.r2 != null ? fmt(d.r2, 3) : '–'}. Diz quanto das diferenças na nota de recomendação (0 a 10) é explicado pelos CSAT. 0% = nada, 100% = tudo.`, true),
      kpi('Respostas', d.n ? fmt(d.n) : '–', 'com todos os CSAT respondidos', 'Respostas usadas na regressão: só entram as que têm a nota de recomendação e todos os CSAT.'),
      kpi('CSAT no modelo', fmt(d.variaveis.length), d.variaveis.map(v => v.nome).join(', '), 'Variáveis de entrada da regressão.'),
      kpi('O que mais pesa', esc(a.nome), `${fmt(+a.imp.toFixed(1))}% da importância`, `${a.nome} tem a maior importância relativa: ${fmt(a.imp, 1)}%.`),
    ])}
    ${cartao('imp', 'Peso de cada CSAT na recomendação', 'Importância relativa de cada CSAT, em %. Somam 100%. Quanto maior, mais esse CSAT ajuda a explicar a nota de recomendação.')}
    ${tabelaHtml('tab', 'Tabela', 'Importância relativa: a parte do efeito explicado que vem de cada CSAT (somam 100%). Coeficiente: quanto sobe a nota de recomendação quando o CSAT sobe 1 ponto, com os outros iguais.',
      [{ k: 'nome', rot: 'CSAT' }, { k: 'imp', rot: 'Importância relativa', r: true }, { k: 'coef', rot: 'Coeficiente', r: true }], 'Procurar CSAT')}`;
}

export function mount(rec, brand) {
  const vs = rec.data.variaveis;
  barrasH(document.getElementById('ch-imp'), brand, vs.map(v => ({ ...v, valor: +v.imp.toFixed(1), cor: NEUTRA, sub: v.coef != null ? `coeficiente ${fmt(v.coef, 2)}` : '' })),
    { min: 0, max: Math.max(50, Math.ceil(vs[0].imp / 10) * 10 + 10), formato: v => `${fmt(v)}%` });
  ligarTabela('tab', vs.map(v => ({ ...v, total: v.imp })), v => `
    <tr><td><span class="name">${esc(v.nome)}</span></td><td class="r num">${fmt(v.imp, 1)}%</td><td class="r num">${v.coef != null ? fmt(v.coef, 2) : '–'}</td></tr>`, { chave: 'imp', ncol: 3 });
}

export function exportar(rec, brand) {
  const d = rec.data, b = baseGrafico(brand);
  return {
    kpis: [
      { rot: 'Nota explicada', val: d.r2 != null ? `${fmt(d.r2 * 100)}%` : '–', det: 'R² da regressão' },
      { rot: 'Respostas', val: d.n ? fmt(d.n) : '–', det: '' },
      { rot: 'O que mais pesa', val: d.variaveis[0].nome, det: `${fmt(+d.variaveis[0].imp.toFixed(1))}%` },
    ],
    resumo: [textoDe(resumo(rec).texto)],
    filtros: d.filtros,
    graficos: [
      { id: 'imp', titulo: 'Peso de cada CSAT na recomendação', desenhar: pptBarras(b, d.variaveis.map(v => ({ ...v, valor: v.imp })), { nome: 'Importância (%)', cor: NEUTRA, min: 0, formato: '0' }) },
      { id: 'tab', titulo: 'Tabela', desenhar: pptTabela(b, ['CSAT', 'Importância relativa', 'Coeficiente'], d.variaveis.map(v => [v.nome, `${fmt(v.imp, 1)}%`, v.coef != null ? fmt(v.coef, 2) : '–']), { dir: [1, 2] }) },
    ],
  };
}

export const importar = {
  titulo: "Como importar os dados de Overview CSAT's",
  texto: 'No Stats iQ, selecione como variável de saída o "NPS" (numérico) e, como variáveis de entrada, os CSAT (Instalações, Serviço, Produtos). Em seguida, execute a opção "Regression" e exporte a tabela para Excel.',
};
