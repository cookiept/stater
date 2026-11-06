// Tab "NPS por Causa Raiz": Relate de Group NPS com a causa raiz (resposta múltipla).
import { enriquecerCausas, comZeros, npsDe, fmt, sinal, destaques, causasFiaveis, CORES, LIMITES } from '../stats.js?v=20261106-1530';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL, ETIQ_META } from '../charts.js?v=20261106-1530';
import { info, esc, btnPptx, faixa } from '../ui.js?v=20261106-1530';
import { baseGrafico, hex, textoDe, TPL } from '../export.js?v=20261106-1530';
import { icon } from '../icons.js?v=20261106-1530';

const LIM = LIMITES.amostraPequena;

export const npsGlobal = data => {
  const a = data.amostraGrupo;
  const t = a ? a.d + a.n + a.p : 0;
  return a ? { nps: npsDe(a.d, a.p, t), total: t, pctD: (a.d / t) * 100, pctP: (a.p / t) * 100 } : null;
};

// Todas as causas do Excel, com as de 0 menções no fim
// impNps: impacto estimado no NPS da marca = % das respostas × (NPS da causa − NPS da marca)
const comImpacto = (cs, g) => cs.map(c => ({ ...c, impNps: c.zero || !g ? null : (c.quota / 100) * (c.nps - g.nps) }));
export const todasCausas = data => comImpacto(enriquecerCausas(comZeros(data.causas, data.semRespostas), npsGlobal(data)?.total), npsGlobal(data));
const IMPNPS_TIP = g => `Quanto esta causa puxa o NPS da marca${g ? ` (${fmt(g.nps)})` : ''} para cima (+) ou para baixo (−), em pontos: % das respostas × (NPS da causa − NPS da marca). Ex.: 6% das respostas com NPS 56 numa marca com NPS 41 dá 0,06 × (56 − 41) = +0,9.`;
const um = v => (v > 0 ? '+' : '') + fmt(v, 1);

export function chips(rec) {
  const g = npsGlobal(rec.data);
  return { respostas: g ? g.total : rec.data.causas.reduce((a, c) => a + c.total, 0) };
}

// Resumo descritivo (exemplo para demonstrar; as regras finais vão ser escolhidas pelos colegas).
// "Outra"/"Sem sugestões" e causas com menos de 30 menções não entram no melhor e pior.
export function resumo(rec, meta) {
  const g = npsGlobal(rec.data);
  const cs = comImpacto(enriquecerCausas(rec.data.causas, g?.total), g);
  const dz = destaques(cs);
  const fiaveis = causasFiaveis(cs);
  const abaixo = fiaveis.filter(c => c.nps < meta);
  const maior = dz.maisReferida;
  const baixam = [...fiaveis].filter(c => c.impNps < 0).sort((x, y) => x.impNps - y.impNps);
  const sobem = [...fiaveis].filter(c => c.impNps > 0).sort((x, y) => y.impNps - x.impNps);
  const partes = [];
  if (g) partes.push(`O NPS de quem respondeu foi <strong>${fmt(g.nps)}</strong>, ${g.nps > meta ? 'acima do' : g.nps === meta ? 'em linha com o' : 'abaixo do'} objetivo (${meta}).`);
  if (maior) partes.push(`A causa mais referida é <strong>${esc(maior.nome)}</strong>, escolhida por <strong>${fmt(maior.quota)}%</strong> das pessoas, com NPS ${sinal(maior.nps)}.`);
  if (g && baixam.length) partes.push(`A que mais baixa o NPS da marca é <strong>${esc(baixam[0].nome)}</strong> (NPS ${sinal(baixam[0].nps)}, ${um(baixam[0].impNps)} pontos)${baixam[1] ? `, seguida de <strong>${esc(baixam[1].nome)}</strong> (${um(baixam[1].impNps)})` : ''}.`);
  else if (g && fiaveis.length) partes.push(`Nenhuma causa com ${LIM} ou mais menções baixa o NPS da marca: todas têm NPS acima de ${fmt(g.nps)}${sobem[0] && sobem[0] !== maior ? `, e a que mais o sobe é <strong>${esc(sobem[0].nome)}</strong> (${um(sobem[0].impNps)} pontos)` : ''}.`);
  const maiorAbaixo = [...abaixo].sort((x, y) => y.total - x.total)[0];
  partes.push(!abaixo.length ? 'Nenhuma causa com volume suficiente está abaixo do objetivo.'
    : abaixo.length === fiaveis.length && abaixo.length > 1 ? `Todas as <strong>${abaixo.length}</strong> causas com ${LIM} ou mais menções têm NPS abaixo do objetivo.`
    : `${abaixo.length === 1 ? 'Uma causa tem' : `<strong>${abaixo.length}/${fiaveis.length}</strong> causas têm`} NPS abaixo do objetivo${maiorAbaixo !== maior ? `; a mais referida delas é <strong>${esc(maiorAbaixo.nome)}</strong>` : ''}.`);
  return {
    tom: g && g.nps < meta ? 'bad' : 'good',
    texto: partes.join(' '),
    factos: [
      ...(maior ? [{ valor: `${fmt(maior.quota)}%`, rot: `escolheram ${maior.nome}, a causa mais referida`, tip: `${maior.nome} foi escolhida por ${fmt(maior.total)} das ${fmt(g?.total || cs.reduce((x, c) => x + c.total, 0))} pessoas que responderam ao NPS: ${fmt(maior.quota, 1)}%. É a causa mais referida (só contam causas com ${LIM} ou mais menções, sem "Outra" e "Sem sugestões").` }] : []),
      { valor: `${fmt(abaixo.length)}/${fmt(fiaveis.length)}`, rot: `causas com NPS abaixo do objetivo (${meta})`, tom: abaixo.length ? 'bad' : 'good', tip: `Causas com ${LIM} ou mais menções e NPS abaixo do objetivo (${meta}). ${abaixo.length ? `São: ${abaixo.map(c => `${c.nome} (NPS ${fmt(c.nps)})`).join('; ')}.` : 'Nenhuma neste Excel.'}` },
    ],
  };
}

export function html(rec, meta, depoisKpis = '') {
  const cs = todasCausas(rec.data);
  const nMenc = cs.filter(c => !c.zero).length;
  const g = npsGlobal(rec.data);
  const mencoes = cs.reduce((a, c) => a + c.total, 0);
  const kpi = (rot, val, det, k, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}"><span class="kl">${rot} ${k}</span><span class="kv num">${val}</span><span class="kd">${det}</span></div>`;
  const abaixo = causasFiaveis(cs).filter(c => c.nps < meta);
  const dz = destaques(cs);
  return `
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${g ? kpi('NPS de quem respondeu', fmt(g.nps), `${fmt(g.total)} pessoas · objetivo ${meta}`, info('NPS de quem respondeu', `NPS de todas as ${fmt(g.total)} pessoas que responderam a esta pergunta: ${fmt(g.pctP, 1)}% promotores − ${fmt(g.pctD, 1)}% detratores = ${fmt(g.pctP - g.pctD, 1)}, arredondado a ${fmt(g.nps)}. Vem do tamanho de cada grupo (Sample Size) no Excel, por isso conta pessoas e não menções. O objetivo da marca é ${meta}: ${g.nps >= meta ? `está ${fmt(g.nps - meta)} pontos acima` : `está ${fmt(meta - g.nps)} pontos abaixo`}.`), true) : ''}
      ${kpi('Causas com menções', `${fmt(nMenc)}/${fmt(cs.length)}`, 'opções escolhidas pelo menos uma vez', info('Causas com menções', `${fmt(nMenc)} das ${fmt(cs.length)} causas possíveis foram escolhidas pelo menos uma vez. ${cs.length - nMenc ? `As outras ${fmt(cs.length - nMenc)} tiveram 0 menções e aparecem no fim do gráfico e da tabela, a cinzento claro.` : 'Todas as causas tiveram menções.'}`))}
      ${kpi('Menções', fmt(mencoes), 'uma pessoa pode escolher várias', info('Menções', `Soma das vezes que cada causa foi escolhida: ${fmt(mencoes)}. Como uma pessoa pode escolher mais do que uma causa, este número não é o número de pessoas${g ? ` (que é ${fmt(g.total)})` : ''}. A % de cada causa na tabela é calculada sobre as pessoas que responderam ao NPS${g ? ` (${fmt(g.total)})` : ''}, por isso as % podem somar mais de 100%.`))}
      ${kpi('Abaixo do objetivo', `${fmt(abaixo.length)}/${fmt(causasFiaveis(cs).length)}`, abaixo.length ? 'causas com NPS abaixo do objetivo' : 'nenhuma causa', info('Abaixo do objetivo', `Causas com ${LIM} ou mais menções cujo NPS fica abaixo do objetivo da marca (${meta}). ${abaixo.length ? `Neste Excel: ${abaixo.map(c => `${c.nome} (NPS ${fmt(c.nps)}, ${fmt(c.total)} menções)`).join('; ')}.` : 'Neste Excel nenhuma causa está abaixo.'} Não contam "Outra" nem "Sem sugestões", nem causas com menos de ${LIM} menções, porque com tão poucas o NPS muda muito.`))}
    </div>
    ${depoisKpis}
    <section class="card" aria-labelledby="h-comp">
      <div class="card-head">
        <h3 id="h-comp">Quem escolheu cada causa ${info('Quem escolheu cada causa', 'Uma barra por causa. Cada barra é 100% das pessoas que escolheram essa causa, dividida em detratores (vermelho, notas 0 a 6), neutros (cinzento, 7 e 8) e promotores (verde, 9 e 10). Por baixo do nome estão as menções e o NPS da causa. As causas vão da mais referida para a menos referida; as que tiveram 0 menções ficam no fim, sem barra.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:var(--detractor)"></i>Detratores</span><span><i style="background:var(--passive)"></i>Neutros</span><span><i style="background:var(--promoter)"></i>Promotores</span></div>
        ${btnPptx('comp')}
      </div>
      <div id="ch-comp" class="chart" role="img" aria-label="Composição de detratores, neutros e promotores por causa"></div>
    </section>
    <section class="card" aria-labelledby="h-mat">
      <div class="card-head"><h3 id="h-mat">Onde atuar primeiro ${info('Onde atuar primeiro', `Cada ponto é uma causa com menções. Para a direita: mais menções. Para baixo: pior NPS. A linha amarela é o objetivo da marca (${meta})${g ? ` e a linha cinzenta o NPS de quem respondeu (${fmt(g.nps)})` : ''}. Os pontos vermelhos estão abaixo do objetivo. As causas mais à direita e mais abaixo são muito referidas e estão mal avaliadas: é por aí que vale a pena começar.`)}</h3>
        <div class="note">Linha amarela: objetivo (${meta}). Pontos a vermelho estão abaixo dele.</div>${btnPptx('mat')}</div>
      <div id="ch-mat" class="chart" role="img" aria-label="Menções e NPS por causa"></div>
    </section>
    <section class="card" aria-labelledby="h-tab" style="padding-bottom:16px">
      <div class="card-head" style="margin-bottom:10px">
        <h3 id="h-tab">Tabela ${info('Tabela', `Uma linha por causa. NPS: % de promotores − % de detratores entre quem escolheu a causa (vermelho se abaixo do objetivo, ${meta}). Menções: quantas vezes foi escolhida. Detratores · Neutros · Promotores: a divisão de quem a escolheu, em %. % das respostas: das pessoas que responderam ao NPS${g ? ` (${fmt(g.total)})` : ''}, quantas escolheram a causa (uma pessoa pode escolher várias, por isso somam mais de 100%). Impacto no NPS: quantos pontos a causa puxa o NPS da marca para cima ou para baixo. Clica no título de uma coluna para ordenar.`)}</h3>
        <div class="tbl-tools" style="margin-left:auto">
          <label class="search">${icon('search')}<span class="sr-only">Procurar causa</span><input id="q-causa" type="search" placeholder="Procurar causa"></label>
          ${btnPptx('tab')}
        </div>
      </div>
      <div class="tbl-wrap"><table class="tbl" id="tbl-causas">
        <thead><tr>
          <th scope="col"><button data-sort="nome">Causa ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="nps">NPS ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="total">Menções ${icon('sort')}</button></th>
          <th scope="col">Detratores · Neutros · Promotores</th>
          <th scope="col" class="r"><button data-sort="quota">% das respostas ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="impNps">Impacto no NPS ${icon('sort')}</button> ${info('Impacto no NPS', IMPNPS_TIP(g))}</th>
        </tr></thead>
        <tbody></tbody>
      </table></div>
    </section>`;
}

// Faixa "O que importa": pior NPS, mais detratores e mais referida
export function destaquesHtml(dz, comDriver = false) {
  if (!dz.pior) return '';
  const it = (rot, c, val, tom) => `<div class="dz ${tom}"><span class="dz-r">${rot}</span><b>${esc(c.nome)}</b>${comDriver ? `<span class="dz-d">${esc(c.driver)}</span>` : ''}<span class="dz-v num">${val}</span></div>`;
  return `<div class="destaques" aria-label="O que importa">
    ${it('Pior NPS', dz.pior, `NPS ${fmt(dz.pior.nps)}`, 'bad')}
    ${it('Mais detratores', dz.maisDetratores, `${fmt(dz.maisDetratores.d)} detratores`, 'bad')}
    ${it('Mais referida', dz.maisReferida, `${fmt(dz.maisReferida.total)} menções`, '')}
  </div>`;
}

export function linhas(cs, meta, pior, extra = () => '') {
  return cs.map(c => c.zero ? `
    <tr class="is-zero">
      <td><span class="name">${esc(c.nome)}</span></td>${extra(c)}
      <td class="r muted">–</td>
      <td class="r num">0</td>
      <td><div class="minibar vazia" aria-hidden="true"></div></td>
      <td class="r"><span class="muted num">0%</span></td>
      <td class="muted">–</td>
      <td class="r muted">–</td>
    </tr>` : `
    <tr class="${c.amostraPequena ? 'is-pequena' : ''}">
      <td><span class="name">${esc(c.nome)}</span></td>${extra(c)}
      <td class="r"><span class="badge ${c.nps < meta ? 'bad' : 'good'} num" title="${c.nps < meta ? `Abaixo do objetivo (${meta})` : `No objetivo (${meta}) ou acima`}">${fmt(c.nps)}</span></td>
      <td class="r num">${fmt(c.total)}</td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="minibar" aria-hidden="true"><div class="d" style="flex:${c.pctD}"></div><div class="n" style="flex:${c.pctN}"></div><div class="p" style="flex:${c.pctP}"></div></div><span class="muted num" style="white-space:nowrap">${fmt(c.pctD)} · ${fmt(c.pctN)} · ${fmt(c.pctP)}%</span></div></td>
 <td class="r"><span class="muted num">${fmt(c.quota, 1)}%</span></td>
      <td class="r num ${c.impNps == null ? 'muted' : c.impNps < 0 ? 'neg' : 'pos'}">${c.impNps == null ? '–' : um(c.impNps)}</td>
    </tr>`).join('') || `<tr><td colspan="${7}" class="muted">Nenhuma causa com esse nome.</td></tr>`;
}

export function mount(rec, brand, meta) {
  const cs = todasCausas(rec.data);
  const comM = cs.filter(c => !c.zero);
  const dz = destaques(cs);
  const g = npsGlobal(rec.data);
  const b = base(brand);
  const nomes = cs.map(c => c.nome);
  const altura = Math.max(220, cs.length * 54 + 60);

  // Quem escolheu cada causa: barras 100% (detratores, neutros, promotores) com cantos redondos
  const pct = [cs.map(c => c.pctD), cs.map(c => c.pctN), cs.map(c => c.pctP)];
  const rotY = cs.map(c => `{n|${c.nome.length > 30 ? c.nome.slice(0, 29) + '…' : c.nome}}\n{m|${c.zero ? '0 menções' : `${fmt(c.total)} menções · ${fmt(c.quota)}% · NPS ${fmt(c.nps)}`}}`);
  const cor3 = [CORES.det, CORES.neu, CORES.pro];
  const nomes3 = ['Detratores', 'Neutros', 'Promotores'];
  desenhar(document.getElementById('ch-comp'), junta(b, {
    grid: { left: 8, right: 16, top: 6, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } },
      formatter: p => { const c = cs[p[0].dataIndex]; return `<b>${esc(c.nome)}</b><br>` + (c.zero ? '0 menções' : p.map(x => `${x.marker}${x.seriesName}: ${fmt([c.d, c.n, c.p][x.seriesIndex])} (${fmt(x.value, 1)}%)`).join('<br>')); } },
    xAxis: { type: 'value', max: 100, ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => `${v}%` } },
    yAxis: { type: 'category', inverse: true, data: rotY, ...EIXO_CAT,
      axisLabel: { margin: 12, align: 'right', rich: { n: { fontSize: 12, color: '#1a1a1a', lineHeight: 16 }, m: { fontSize: 12, color: '#6b6b6b', lineHeight: 15 } } } },
    series: [0, 1, 2].map(k => ({
      name: nomes3[k], type: 'bar', stack: 't', barWidth: '58%',
      data: pct[k].map((v, i) => (cs[i].zero ? null : v)),
      itemStyle: { color: comBrilho(cor3[k], true), borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, color: k === 1 ? '#1a1a1a' : '#fff', fontSize: 12, fontWeight: 600, formatter: p => (p.value >= 8 ? `${fmt(p.value)}%` : '') },
      emphasis: { focus: 'series' }, blur: { itemStyle: { opacity: 0.35 } },
    })),
  }), altura);

  // Onde atuar primeiro: bolhas por causa, linha da meta e do NPS geral
  const maxX = Math.ceil(Math.max(...comM.map(c => c.total)) * 1.15);
  const minY = Math.min(-20, Math.floor(Math.min(...comM.map(c => c.nps)) / 10) * 10 - 10);
  desenhar(document.getElementById('ch-mat'), junta(b, {
    grid: { left: 8, right: 24, top: 34, bottom: 30, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => { const c = comM[p.dataIndex]; return `<b>${esc(c.nome)}</b><br>NPS ${fmt(c.nps)} · ${fmt(c.total)} menções`; } },
    xAxis: { type: 'value', min: 0, max: maxX, splitNumber: 5, ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => fmt(v) },
      name: 'Menções', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#5f5f5f', fontSize: 12 } },
    yAxis: { type: 'value', min: minY, max: 100, ...EIXO_VAL, name: 'NPS', nameTextStyle: { color: '#5f5f5f', fontSize: 12 } },
    series: [{
      type: 'scatter', symbolSize: 18,
      data: comM.map(c => ({ value: [c.total, c.nps], itemStyle: { color: comBrilho(c.nps < meta ? CORES.det : CORES.pro), borderColor: '#fff', borderWidth: 3, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.18)' } })),
      emphasis: { scale: 1.3 },
      markLine: { symbol: 'none', silent: true, data: [
        { yAxis: meta, lineStyle: { color: CORES.ama, type: [5, 4], width: 1.5 }, label: { formatter: `Objetivo ${meta}`, position: 'insideEndTop', ...ETIQ_META } },
        ...(g ? [{ yAxis: g.nps, lineStyle: { color: '#b4b4b4', type: [2, 3], width: 1 }, label: { formatter: `NPS geral ${fmt(g.nps)}`, position: 'insideStartTop', color: '#494949', backgroundColor: '#f0f0f0', padding: [3, 6], borderRadius: 6, fontSize: 12 } }] : []),
      ] },
    }],
  }), 340);


  // Tabela: ordenar e procurar
  const tbody = document.querySelector('#tbl-causas tbody');
  let chave = 'total', dir = -1, q = '';
  const pintar = () => {
    const lista = cs.filter(c => c.nome.toLowerCase().includes(q)).sort((a, b2) => {
      if (a.zero !== b2.zero) return a.zero - b2.zero;
      const x = a[chave], y = b2[chave];
      if (x == null || y == null) return (x == null) - (y == null);
      return (typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y) * dir;
    });
    tbody.innerHTML = linhas(lista, meta, dz.pior);
    document.querySelectorAll('#tbl-causas th').forEach(th => th.removeAttribute('aria-sort'));
    document.querySelector(`#tbl-causas [data-sort="${chave}"]`)?.closest('th').setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
  };
  document.querySelectorAll('#tbl-causas [data-sort]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.sort;
    dir = k === chave ? -dir : (k === 'nome' ? 1 : -1);
    chave = k;
    pintar();
  }));
  document.getElementById('q-causa').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); pintar(); });
  pintar();
}

// Gráficos nativos do PowerPoint, partilhados com a tabela única de causas
export const graficoComposicao = (b, brand, cs, rot = c => c.nome) => (s, p) => s.addChart(p.ChartType.bar, [
  { name: 'Detratores', labels: cs.map(rot), values: cs.map(c => c.d) },
  { name: 'Neutros', labels: cs.map(rot), values: cs.map(c => c.n) },
  { name: 'Promotores', labels: cs.map(rot), values: cs.map(c => c.p) },
], { ...b, barDir: 'bar', barGrouping: 'percentStacked', barGapWidthPct: 45, catAxisOrientation: 'maxMin', chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], showValue: false, catAxisLabelFontSize: 10, valAxisLabelFormatCode: '0%' });

export const graficoMatriz = (b, brand, todas, meta, cs = todas.filter(c => !c.zero)) => (s, p) => s.addChart(p.ChartType.scatter, [
  { name: 'Menções', values: cs.map(c => c.total) },
  { name: 'NPS', values: cs.map(c => c.nps), labels: cs.map(c => c.nome) },
], { ...b, chartColors: [hex(CORES.pro)], lineSize: 0, lineDataSymbolSize: 12, showLegend: false, showLabel: true, dataLabelFormatScatter: 'custom', dataLabelPosition: 'r',
  showValAxisTitle: true, valAxisTitle: `NPS (meta ${meta})`, showCatAxisTitle: true, catAxisTitle: 'Menções', valAxisMinVal: -100, valAxisMaxVal: 100 });

export const tabelaPptx = (b, brand, cs, meta, comDriver = false) => (s) => {
  const cab = ['Causa', ...(comDriver ? ['Driver'] : []), 'NPS', 'Menções', 'Detratores', 'Neutros', 'Promotores', '% das respostas', 'Impacto no NPS'];
  const st = { fontFace: b.fontFace, fontSize: 10, color: '1A1A1A', valign: 'middle' };
  const linhasT = cs.map(c => [
    { text: c.nome, options: st }, ...(comDriver ? [{ text: c.driver, options: st }] : []),
    { text: c.zero ? '–' : fmt(c.nps), options: { ...st, bold: true, align: 'right', color: c.zero ? '9A9A9A' : c.nps < meta ? 'AD2C19' : '10641D' } },
    { text: fmt(c.total), options: { ...st, align: 'right' } },
    { text: `${fmt(c.pctD)}%`, options: { ...st, align: 'right' } }, { text: `${fmt(c.pctN)}%`, options: { ...st, align: 'right' } }, { text: `${fmt(c.pctP)}%`, options: { ...st, align: 'right' } },
    { text: `${fmt(c.quota, 1)}%`, options: { ...st, align: 'right' } },
    { text: c.impNps == null ? '–' : um(c.impNps), options: { ...st, align: 'right' } },
  ]);
  // Estilo do template claro do Grupo Brisa: cabeçalho verde sem fundo, linhas alternadas em verde-lima claro
  const zebra = linhasT.map((l, i) => (i % 2 ? l : l.map(c => ({ ...c, options: { ...c.options, fill: { color: TPL.limaClaro } } }))));
  s.addTable([cab.map(t => ({ text: t, options: { ...st, bold: true, color: TPL.verde, border: [{ type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }, { type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }] } })), ...zebra],
    { x: b.x, y: b.y, w: b.w, h: 5.3, colW: comDriver ? [3.2, 1.6, 0.8, 1.0, 1.0, 1.0, 1.1, 1.2, 1.33] : [4.0, 0.9, 1.1, 1.2, 1.2, 1.2, 1.3, 1.33], fontFace: b.fontFace, border: { type: 'none' }, rowH: 0.28, autoPage: linhasT.length > 16, autoPageRepeatHeader: true, autoPageSlideStartY: 1.45 });
};

export function exportar(rec, brand, meta) {
  const cs = todasCausas(rec.data);
  const g = npsGlobal(rec.data);
  const b = baseGrafico(brand);
  const abaixo = causasFiaveis(cs).filter(c => c.nps < meta);
  return {
    kpis: [
      ...(g ? [{ rot: 'NPS de quem respondeu', val: fmt(g.nps), det: `${fmt(g.total)} pessoas · meta ${meta}` }] : []),
      { rot: 'Causas com menções', val: `${fmt(cs.filter(c => !c.zero).length)}/${fmt(cs.length)}`, det: 'opções escolhidas pelo menos uma vez' },
      { rot: 'Menções', val: fmt(cs.reduce((a, c) => a + c.total, 0)), det: 'uma pessoa pode escolher várias' },
      { rot: 'Abaixo do objetivo', val: `${fmt(abaixo.length)}/${fmt(causasFiaveis(cs).length)}`, det: abaixo.map(c => c.nome).join(', ') || 'nenhuma causa' },
    ],
    resumo: [textoDe(resumo(rec, meta).texto)],
    filtros: rec.data.filtros,
    graficos: [
      { id: 'comp', titulo: 'Quem escolheu cada causa', desenhar: graficoComposicao(b, brand, cs) },
      { id: 'mat', titulo: 'Onde atuar primeiro (menções vs NPS)', desenhar: graficoMatriz(b, brand, cs, meta) },
      { id: 'tab', titulo: 'Tabela de causas', desenhar: tabelaPptx(b, brand, cs, meta) },
    ],
  };
}

// Texto do Stater v10, sem alterações
export const importar = {
  titulo: 'Como importar os dados de NPS por causas raiz',
  texto: 'No Stats iQ, selecione a variável principal "(Group) NPS" e, como variável secundária, a "Causa Raiz" à escolha. Em seguida, execute a opção "Relate" e exporte a tabela para Excel.',
};
