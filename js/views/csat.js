// Tipo "CSAT por grupo de NPS": um Excel por CSAT (ex.: Eficiência do Serviço, Simpatia, Tempo de espera),
// cada um com as notas do CSAT (0 a 10) de detratores, neutros e promotores. Carregam-se vários de uma vez.
// Ex.: Overview CSAT's da Brisa Autoestradas.
import { CORES, fmt, LIMITES } from '../stats.js?v=20261106-1537';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL } from '../charts.js?v=20261106-1537';
import { esc } from '../ui.js?v=20261106-1537';
import { icon } from '../icons.js?v=20261106-1537';
import { formatarPeriodo } from '../excel.js?v=20261106-1537';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261106-1537';
import { kpi, kpis, cartao, tabelaHtml, ligarTabela, barrasH, pptBarras, pptTabela } from './comum.js?v=20261106-1537';

export const multi = true;
export const multiTexto = 'Um Excel por CSAT.';
const NEUTRA = '#14789c';
const GR = [['d', 'Detratores', CORES.det], ['n', 'Neutros', CORES.neu], ['p', 'Promotores', CORES.pro]];

// Junta um Excel novo aos que já existem; o mesmo CSAT é substituído
export function juntar(rec, novo, fileName) {
  const ficheiros = [...(rec?.data.ficheiros || [])];
  const f = { ...novo, fileName };
  const i = ficheiros.findIndex(x => x.atributo === f.atributo);
  if (i >= 0) ficheiros[i] = f; else ficheiros.push(f);
  return { ficheiros, periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros };
}

const estat = mapa => {
  const e = Object.entries(mapa || {}).map(([v, n]) => [+v, n]);
  const n = e.reduce((a, [, c]) => a + c, 0);
  return { n, media: n ? e.reduce((a, [v, c]) => a + v * c, 0) / n : null, top: n ? e.reduce((a, [v, c]) => a + (v >= 9 ? c : 0), 0) / n * 100 : null };
};
function atributos(rec) {
  return rec.data.ficheiros.map(f => {
    const g = Object.fromEntries(GR.map(([k]) => [k, estat(f.porGrupo[k])]));
    const todos = {};
    for (const [k] of GR) for (const [v, c] of Object.entries(f.porGrupo[k] || {})) todos[v] = (todos[v] || 0) + c;
    const t = estat(todos);
    return { nome: f.atributo, total: t.n, media: t.media, top: t.top, g, fileName: f.fileName, periodo: f.periodo, amostraPequena: t.n < LIMITES.poucasRespostas };
  }).sort((a, b) => b.media - a.media);
}

export function chips(rec) { return { respostas: Math.max(0, ...atributos(rec).map(a => a.total)) }; }

export function resumo(rec) {
  const as = atributos(rec);
  const alto = as[0], baixo = as[as.length - 1];
  const n = Math.max(...as.map(a => a.total));
  const partes = [`Em <strong>${fmt(n)}</strong> respostas, ${as.length === 1 ? `o CSAT de <strong>${esc(alto.nome)}</strong> foi <strong>${fmt(alto.media, 1)}</strong> em 10.` : `o CSAT mais alto é <strong>${esc(alto.nome)}</strong> (${fmt(alto.media, 1)} em 10) e o mais baixo é <strong>${esc(baixo.nome)}</strong> (${fmt(baixo.media, 1)}).`}`];
  const gap = as.filter(a => a.g.p.media != null && a.g.n.media != null).sort((a, b) => (b.g.p.media - b.g.n.media) - (a.g.p.media - a.g.n.media))[0];
  if (gap) partes.push(`A maior diferença entre promotores e neutros está em <strong>${esc(gap.nome)}</strong>: ${fmt(gap.g.p.media, 1)} contra ${fmt(gap.g.n.media, 1)}.`);
  return {
    tom: baixo.media >= 8 ? 'good' : 'bad',
    texto: partes.join(' '),
    factos: [
      { valor: fmt(baixo.media, 1), rot: `CSAT de ${baixo.nome}`, tom: baixo.media < 8 ? 'bad' : '', tip: `Média das notas (0 a 10) de ${baixo.nome}, com ${fmt(baixo.total)} respostas. É o CSAT mais baixo dos ${as.length} carregados.` },
      { valor: `${fmt(alto.top)}%`, rot: `deram 9 ou 10 a ${alto.nome}`, tip: `${fmt(alto.top, 1)}% das ${fmt(alto.total)} respostas a ${alto.nome} deram 9 ou 10.` },
    ],
  };
}

export function lado(rec) {
  return `<div class="side-block">
    <h3 class="sec-title">CSAT carregados</h3>
    <ul class="drv-lista">${rec.data.ficheiros.map((f, i) => `
      <li><div><b>${esc(f.atributo)}</b><span>${esc(f.fileName)} · ${esc(formatarPeriodo(f.periodo))}</span></div>
        <button type="button" class="btn btn-ghost btn-xs" data-act="rm-ficheiro" data-i="${i}" aria-label="Tirar ${esc(f.atributo)}" title="Tirar este CSAT">${icon('x')}</button></li>`).join('')}
    </ul>
    <div class="file-actions">
      <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Adicionar CSAT</button>
      <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga todos os ficheiros desta tab">${icon('trash')} Apagar tudo</button>
    </div>
  </div>`;
}

export function html(rec) {
  const as = atributos(rec);
  const n = Math.max(...as.map(a => a.total));
  const media = as.reduce((a, x) => a + x.media, 0) / as.length;
  return `
    ${kpis([
      kpi('CSAT médio', fmt(media, 1), `de 0 a 10 · ${as.length} CSAT`, `Média simples das médias dos ${as.length} CSAT carregados (${as.map(a => `${a.nome} ${fmt(a.media, 1)}`).join('; ')}).`, true),
      kpi('Respostas', fmt(n), n < LIMITES.poucasRespostas ? 'poucas respostas' : 'por CSAT', `Pessoas que responderam a cada CSAT (o maior dos ${as.length}).${n < LIMITES.poucasRespostas ? ` Menos de ${LIMITES.poucasRespostas}: as médias mudam muito com poucas respostas.` : ''}`),
      kpi('Mais alto', esc(as[0].nome), `${fmt(as[0].media, 1)} em 10`, `O CSAT com a média mais alta.`),
      kpi('Mais baixo', esc(as[as.length - 1].nome), `${fmt(as[as.length - 1].media, 1)} em 10`, `O CSAT com a média mais baixa.`),
    ])}
    ${cartao('med', 'CSAT médio de cada atributo', 'Média das notas de 0 a 10 de cada CSAT, com todas as respostas. Por baixo do nome estão as respostas e a % de quem deu 9 ou 10.')}
    ${cartao('grp', 'CSAT por grupo de NPS', 'Para cada CSAT, a média dada por detratores (NPS 0 a 6), neutros (7 e 8) e promotores (9 e 10). Um grupo sem respostas no Excel não tem barra.',
      { legenda: GR.map(([, r, c]) => `<span><i style="background:${c}"></i>${r}</span>`).join('') })}
    ${tabelaHtml('tab', 'Tabela', 'Uma linha por CSAT. Média: todas as respostas. Detratores, Neutros, Promotores: a média de cada grupo de NPS (entre parênteses, quantas pessoas). 9 ou 10: % de quem deu 9 ou 10.',
      [{ k: 'nome', rot: 'CSAT' }, { k: 'total', rot: 'Respostas', r: true }, { k: 'media', rot: 'Média', r: true }, ...GR.map(([k, r]) => ({ k: `m${k}`, rot: r, r: true })), { k: 'top', rot: '9 ou 10', r: true }], 'Procurar CSAT')}`;
}

export function mount(rec, brand) {
  const as = atributos(rec);
  barrasH(document.getElementById('ch-med'), brand, as.map(a => ({ ...a, valor: +a.media.toFixed(2), cor: NEUTRA, sub: `${fmt(a.total)} respostas · ${fmt(a.top)}% deram 9 ou 10` })),
    { min: 0, max: 10, formato: v => fmt(v, 1) });
  desenhar(document.getElementById('ch-grp'), junta(base(brand), {
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } },
      formatter: p => { const a = as[p[0].dataIndex]; return `<b>${esc(a.nome)}</b><br>` + GR.map(([k, r]) => `${r}: ${a.g[k].media != null ? `${fmt(a.g[k].media, 1)} (${fmt(a.g[k].n)} pessoas)` : 'sem respostas'}`).join('<br>'); } },
    xAxis: { type: 'category', data: as.map(a => a.nome), ...EIXO_CAT },
    yAxis: { type: 'value', min: 0, max: 10, ...EIXO_VAL },
    series: GR.map(([k, r, c]) => ({ name: r, type: 'bar', barGap: '12%', barMaxWidth: 46,
      data: as.map(a => (a.g[k].media != null ? +a.g[k].media.toFixed(2) : null)),
      itemStyle: { color: comBrilho(c), borderRadius: [8, 8, 3, 3] },
      label: { show: true, position: 'top', color: '#3a3a3a', fontSize: 12, fontWeight: 600, formatter: p => (p.value == null ? '' : fmt(p.value, 1)) } })),
  }), 320);
  ligarTabela('tab', as.map(a => ({ ...a, md: a.g.d.media, mn: a.g.n.media, mp: a.g.p.media })), a => `
    <tr class="${a.amostraPequena ? 'is-pequena' : ''}"><td><span class="name">${esc(a.nome)}</span></td>
      <td class="r num">${fmt(a.total)}</td><td class="r"><b class="num">${fmt(a.media, 1)}</b></td>
      ${GR.map(([k]) => `<td class="r num">${a.g[k].media != null ? `${fmt(a.g[k].media, 1)} <span class="muted">(${fmt(a.g[k].n)})</span>` : '<span class="muted">–</span>'}</td>`).join('')}
      <td class="r muted num">${fmt(a.top)}%</td></tr>`, { chave: 'media', ncol: 7 });
}

export function exportar(rec, brand) {
  const as = atributos(rec), b = baseGrafico(brand);
  return {
    kpis: as.slice(0, 4).map(a => ({ rot: a.nome, val: fmt(a.media, 1), det: `${fmt(a.total)} respostas` })),
    resumo: [textoDe(resumo(rec).texto)],
    filtros: rec.data.filtros,
    graficos: [
      { id: 'med', titulo: 'CSAT médio de cada atributo', desenhar: pptBarras(b, as.map(a => ({ ...a, valor: a.media })), { nome: 'CSAT médio', cor: NEUTRA, min: 0, max: 10, formato: '0.0' }) },
      { id: 'grp', titulo: 'CSAT por grupo de NPS', desenhar: (s, p) => s.addChart(p.ChartType.bar, GR.map(([k, r]) => ({ name: r, labels: as.map(a => a.nome), values: as.map(a => (a.g[k].media != null ? +a.g[k].media.toFixed(2) : 0)) })),
        { ...b, barDir: 'col', barGrouping: 'clustered', chartColors: GR.map(([, , c]) => hex(c)), showValue: true, dataLabelFormatCode: '0.0', valAxisMinVal: 0, valAxisMaxVal: 10 }) },
      { id: 'tab', titulo: 'Tabela', desenhar: pptTabela(b, ['CSAT', 'Respostas', 'Média', 'Detratores', 'Neutros', 'Promotores', '9 ou 10'],
        as.map(a => [a.nome, fmt(a.total), fmt(a.media, 1), ...GR.map(([k]) => (a.g[k].media != null ? fmt(a.g[k].media, 1) : '–')), `${fmt(a.top)}%`]), { dir: [1, 2, 3, 4, 5, 6] }) },
    ],
  };
}

export const importar = {
  titulo: "Como importar os dados de Overview CSAT's",
  texto: 'No Stats iQ, selecione a variável principal "(Group) NPS" e, como variável secundária, um CSAT (por exemplo CSAT_EficiênciaServiço). Em seguida, execute a opção "Relate" e exporte a tabela para Excel. Repita para cada CSAT e carregue os Excel todos nesta tab.',
};
