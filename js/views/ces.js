// Tipo "CES": distribuição das respostas numa escala de concordância (1 a 7, Describe do Stats iQ).
// 1 a 3 = discordam, 4 e 5 = ao meio, 6 e 7 = concordam (a regra do Stater v10 olha para 6 e 7).
import { CORES, fmt } from '../stats.js?v=20261106-1537';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL } from '../charts.js?v=20261106-1537';
import { esc } from '../ui.js?v=20261106-1537';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261106-1537';
import { kpi, kpis, cartao } from './comum.js?v=20261106-1537';

function contas(data) {
  const c = data.contagens, min = data.min;
  const total = c.reduce((a, b) => a + b, 0);
  const soma = (de, ate) => c.reduce((a, n, k) => a + (min + k >= de && min + k <= ate ? n : 0), 0);
  const media = c.reduce((a, n, k) => a + n * (min + k), 0) / total;
  let acc = 0, mediana = min;
  for (let k = 0; k < c.length; k++) { acc += c[k]; if (acc >= total / 2) { mediana = min + k; break; } }
  const alto = soma(data.max - 1, data.max), baixo = soma(min, min + 2);
  return { total, media, mediana, alto, baixo, meio: total - alto - baixo, pctAlto: (alto / total) * 100, pctBaixo: (baixo / total) * 100, pctMeio: ((total - alto - baixo) / total) * 100 };
}
const corDe = (v, data) => (v >= data.max - 1 ? CORES.pro : v <= data.min + 2 ? CORES.det : CORES.neu);

export function chips(rec) { return { respostas: contas(rec.data).total }; }

export function resumo(rec) {
  const k = contas(rec.data), d = rec.data;
  return {
    tom: k.pctAlto >= 60 ? 'good' : 'bad',
    texto: `Em <strong>${fmt(k.total)}</strong> respostas, o CES médio foi <strong>${fmt(k.media, 1)}</strong> em ${d.max}. <strong>${fmt(k.pctAlto)}%</strong> concordam (${d.max - 1} ou ${d.max}) e <strong>${fmt(k.pctBaixo)}%</strong> discordam (${d.min} a ${d.min + 2}).`,
    factos: [
      { valor: `${fmt(k.pctAlto)}%`, rot: `deram ${d.max - 1} ou ${d.max}`, tom: 'good', tip: `${fmt(k.alto)} das ${fmt(k.total)} respostas deram ${d.max - 1} ou ${d.max} (concordam): ${fmt(k.pctAlto, 1)}%.` },
      { valor: `${fmt(k.pctBaixo)}%`, rot: `deram ${d.min} a ${d.min + 2}`, tom: 'bad', tip: `${fmt(k.baixo)} das ${fmt(k.total)} respostas deram ${d.min}, ${d.min + 1} ou ${d.min + 2} (discordam): ${fmt(k.pctBaixo, 1)}%.` },
    ],
  };
}

export function html(rec) {
  const k = contas(rec.data), d = rec.data;
  const perg = d.pergunta ? ` Pergunta: "${d.pergunta}".` : '';
  return `
    ${kpis([
      kpi('CES médio', fmt(k.media, 1), `de ${d.min} a ${d.max} · mediana ${k.mediana}`, `Média de todas as ${fmt(k.total)} respostas, numa escala de ${d.min} (discordo totalmente) a ${d.max} (concordo totalmente): ${fmt(k.media, 2)}. A mediana é ${k.mediana}: metade das pessoas deu ${k.mediana} ou menos.${perg}`, true),
      kpi('Respostas', fmt(k.total), `valores de ${d.min} a ${d.max}`, `Pessoas que responderam à pergunta do CES no período do ficheiro.${perg}`),
      kpi(`Deram ${d.max - 1} ou ${d.max}`, `${fmt(k.pctAlto)}%`, `${fmt(k.alto)} pessoas concordam`, `${fmt(k.alto)} das ${fmt(k.total)} respostas deram ${d.max - 1} ou ${d.max}: ${fmt(k.pctAlto, 1)}%. É o indicador do Stater v10.`),
      kpi(`Deram ${d.min} a ${d.min + 2}`, `${fmt(k.pctBaixo)}%`, `${fmt(k.baixo)} pessoas discordam`, `${fmt(k.baixo)} das ${fmt(k.total)} respostas deram ${d.min} a ${d.min + 2}: ${fmt(k.pctBaixo, 1)}%.`),
    ])}
    ${cartao('dist', 'Respostas por valor', `Quantas pessoas deram cada valor, de ${d.min} (discordo totalmente) a ${d.max} (concordo totalmente). A percentagem por cima é em relação a todas as ${fmt(k.total)} respostas. Vermelho: ${d.min} a ${d.min + 2}. Cinzento: ${d.min + 3} e ${d.min + 4}. Verde: ${d.max - 1} e ${d.max}. A barra de baixo junta os três grupos.`, {
      legenda: `<span><i style="background:var(--detractor)"></i>Discordam (${d.min}–${d.min + 2})</span><span><i style="background:var(--passive)"></i>Ao meio (${d.min + 3}–${d.min + 4})</span><span><i style="background:var(--promoter)"></i>Concordam (${d.max - 1}–${d.max})</span>`,
      corpo: `<div id="ch-dist" class="chart" role="img" aria-label="Respostas por valor do CES"></div>
        <div class="compo" style="height:22px;margin-top:8px" aria-hidden="true"><div class="d" style="flex:${k.pctBaixo}">${k.pctBaixo >= 6 ? `${fmt(k.pctBaixo)}%` : ''}</div><div class="n" style="flex:${k.pctMeio}">${k.pctMeio >= 6 ? `${fmt(k.pctMeio)}%` : ''}</div><div class="p" style="flex:${k.pctAlto}">${k.pctAlto >= 6 ? `${fmt(k.pctAlto)}%` : ''}</div></div>` })}`;
}

export function mount(rec, brand) {
  const d = rec.data, k = contas(d);
  const vals = d.contagens.map((_, i) => d.min + i);
  desenhar(document.getElementById('ch-dist'), junta(base(brand), {
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `<b>Valor ${vals[p.dataIndex]}</b><br>${fmt(p.value)} respostas (${fmt((p.value / k.total) * 100, 1)}%)` },
    xAxis: { type: 'category', data: vals.map(String), ...EIXO_CAT },
    yAxis: { type: 'value', ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => fmt(v) } },
    series: [{ type: 'bar', barWidth: '58%', showBackground: true, backgroundStyle: { color: '#f6f6f6', borderRadius: [10, 10, 4, 4] },
      data: d.contagens.map((n, i) => ({ value: n, itemStyle: { color: comBrilho(corDe(vals[i], d)), borderRadius: [10, 10, 4, 4] } })),
      label: { show: true, position: 'top', color: '#3a3a3a', fontSize: 12, fontWeight: 600, formatter: p => `${fmt((p.value / k.total) * 100)}%` } }],
  }), 300);
}

export function exportar(rec, brand) {
  const d = rec.data, k = contas(d), b = baseGrafico(brand);
  const vals = d.contagens.map((_, i) => String(d.min + i));
  return {
    kpis: [
      { rot: 'CES médio', val: fmt(k.media, 1), det: `de ${d.min} a ${d.max}` },
      { rot: 'Respostas', val: fmt(k.total), det: '' },
      { rot: `Deram ${d.max - 1} ou ${d.max}`, val: `${fmt(k.pctAlto)}%`, det: 'concordam' },
      { rot: `Deram ${d.min} a ${d.min + 2}`, val: `${fmt(k.pctBaixo)}%`, det: 'discordam' },
    ],
    resumo: [textoDe(resumo(rec).texto)],
    filtros: d.filtros,
    graficos: [{ id: 'dist', titulo: 'Respostas por valor', desenhar: (s, p) => s.addChart(p.ChartType.bar, [{ name: 'Respostas', labels: vals, values: d.contagens }],
      { ...b, barDir: 'col', chartColors: vals.map(v => hex(corDe(+v, d))), showValue: true, showLegend: false }) }],
  };
}

export const importar = {
  titulo: 'Como importar os dados de CES',
  texto: 'No Stats iQ, selecione a variável "CES" (escala de 1 a 7). Em seguida, execute a opção "Describe" e exporte a tabela para Excel.',
};
