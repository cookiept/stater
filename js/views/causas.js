// Tab "NPS por Causa Raiz": Relate de Group NPS com a causa raiz (resposta múltipla).
import { enriquecerCausas, comZeros, npsDe, fmt, sinal, destaques, causasFiaveis, CORES } from '../stats.js?v=20261103-1149';
import { base, junta, desenhar } from '../charts.js?v=20261103-1149';
import { info, esc, def, btnPptx, faixa } from '../ui.js?v=20261103-1149';
import { baseGrafico, hex, textoDe, TPL } from '../export.js?v=20261103-1149';
import { icon } from '../icons.js?v=20261103-1149';

export const npsGlobal = data => {
  const a = data.amostraGrupo;
  return a ? { nps: npsDe(a.d, a.p, a.d + a.n + a.p), total: a.d + a.n + a.p } : null;
};

// Todas as causas do Excel, com as de 0 menções no fim
export const todasCausas = data => enriquecerCausas(comZeros(data.causas, data.semRespostas));

export function chips(rec) {
  const g = npsGlobal(rec.data);
  return { respostas: g ? g.total : rec.data.causas.reduce((a, c) => a + c.total, 0) };
}

// Resumo descritivo (exemplo para demonstrar; as regras finais vão ser escolhidas pelos colegas).
// "Outra"/"Sem sugestões" e causas com menos de 30 menções não entram no melhor e pior.
export function resumo(rec, meta) {
  const cs = enriquecerCausas(rec.data.causas);
  const mencoes = cs.reduce((a, c) => a + c.total, 0);
  const g = npsGlobal(rec.data);
  const dz = destaques(cs);
  const fiaveis = causasFiaveis(cs);
  const melhor = [...(fiaveis.length ? fiaveis : cs.filter(c => !c.semSugestao))].sort((a, b) => b.nps - a.nps)[0];
  const abaixo = fiaveis.filter(c => c.nps < meta);
  const maior = dz.maisReferida, pior = dz.pior;
  const partes = [];
  partes.push(`Com base em <strong>${fmt(mencoes)}</strong> menções${g ? ` de <strong>${fmt(g.total)}</strong> pessoas` : ''}${g ? `, o NPS de quem respondeu foi <strong>${fmt(g.nps)}</strong>, ${g.nps > meta ? 'acima' : g.nps === meta ? 'em linha com' : 'abaixo'} da meta (${meta})` : ''}.`);
  if (maior) partes.push(`O motivo mais referido é <strong>${esc(maior.nome)}</strong>, com <strong>${fmt(maior.total)}</strong> menções (${fmt(maior.quota)}% do total) e NPS de <strong>${sinal(maior.nps)}</strong>.`);
  if (melhor && pior && melhor !== pior) partes.push(`A causa mais bem avaliada é <strong>${esc(melhor.nome)}</strong> (NPS ${sinal(melhor.nps)}) e a que mais afasta clientes é <strong>${esc(pior.nome)}</strong> (NPS ${sinal(pior.nps)}, ${fmt(pior.pctD)}% de detratores).`);
  partes.push(abaixo.length ? `${abaixo.length === 1 ? 'Uma causa está' : `<strong>${abaixo.length}</strong> causas estão`} abaixo da meta, por isso é aí que vale a pena atuar primeiro.` : 'Nenhuma causa com volume suficiente está abaixo da meta.');
  const notas = [];
  const pequenas = cs.filter(c => c.amostraPequena && !c.semSugestao).length;
  if (pequenas) notas.push(`${pequenas === 1 ? 'Uma causa tem' : `${pequenas} causas têm`} menos de 30 menções e não entra${pequenas === 1 ? '' : 'm'} no melhor e pior.`);
  if (rec.data.semRespostas?.length) notas.push(`${rec.data.semRespostas.length === 1 ? 'Uma opção não teve' : `${rec.data.semRespostas.length} opções não tiveram`} menções neste período: aparece${rec.data.semRespostas.length === 1 ? '' : 'm'} no fim, com 0.`);
  return {
    tom: g && g.nps < meta ? 'bad' : 'good',
    texto: partes.join(' '),
    factos: [
      ...(g ? [{ valor: sinal(g.nps - meta), rot: 'vs meta', tom: g.nps >= meta ? 'good' : 'bad', tip: 'Diferença entre o NPS de quem respondeu e a meta da marca.' }] : []),
      ...(maior ? [{ valor: `${fmt(maior.quota)}%`, rot: 'peso da mais referida', tip: `Parte das menções que vai para ${maior.nome}.` }] : []),
      { valor: fmt(abaixo.length), rot: 'abaixo da meta', tom: abaixo.length ? 'bad' : 'good', tip: 'Causas com 30 ou mais menções e NPS abaixo da meta da marca.' },
    ],
    notas,
  };
}

export function html(rec, meta) {
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
      ${g ? kpi('NPS de quem respondeu', fmt(g.nps), `${fmt(g.total)} pessoas · meta ${meta}`, info('NPS de quem respondeu', 'NPS de todas as pessoas que viram esta pergunta, calculado a partir do tamanho de cada grupo (Sample Size) no Excel.'), true) : ''}
      ${kpi('Causas com menções', fmt(nMenc), `de ${fmt(cs.length)} opções`, def('causa'))}
      ${kpi('Menções', fmt(mencoes), 'uma pessoa pode escolher várias', def('mencoes'))}
      ${kpi('Abaixo da meta', fmt(abaixo.length), abaixo.length ? 'causas com NPS abaixo da meta' : 'nenhuma causa', def('meta'))}
    </div>
    <section class="card" aria-labelledby="h-comp">
      <div class="card-head">
        <h3 id="h-comp">Quem escolheu cada causa ${info('Composição por causa', 'Para cada causa, a parte de detratores, neutros e promotores entre quem a escolheu. Ordenado por número de menções.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:var(--detractor)"></i>Detratores</span><span><i style="background:var(--passive)"></i>Neutros</span><span><i style="background:var(--promoter)"></i>Promotores</span></div>
        ${btnPptx('comp')}
      </div>
      <div id="ch-comp" class="chart" role="img" aria-label="Composição de detratores, neutros e promotores por causa"></div>
    </section>
    <section class="card" aria-labelledby="h-mat">
      <div class="card-head"><h3 id="h-mat">Onde atuar primeiro ${info('Menções vs NPS', 'Cada ponto é uma causa. Quanto mais à direita, mais pessoas a referiram; quanto mais abaixo, pior o NPS. As causas no canto inferior direito pesam mais e estão pior.')}</h3>
        <div class="note">Linha amarela: meta (${meta}). Pontos a vermelho estão abaixo dela.</div>${btnPptx('mat')}</div>
      <div id="ch-mat" class="chart" role="img" aria-label="Menções e NPS por causa"></div>
      <div class="legend" id="lg-mat" style="margin:0 0 10px"></div>
    </section>
    <section class="card" aria-labelledby="h-tab" style="padding-bottom:16px">
      <div class="card-head" style="margin-bottom:10px">
        <h3 id="h-tab">Tabela ${info('Peso', 'Peso da causa no total de menções: Alto a partir de 15%, Médio a partir de 5%, Baixo abaixo disso.')}</h3>
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
          <th scope="col"><button data-sort="quota">Peso ${icon('sort')}</button></th>
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
      <td><span class="muted num">0%</span></td>
    </tr>` : `
    <tr class="${c.amostraPequena ? 'is-pequena' : ''}">
      <td><span class="name">${esc(c.nome)}</span>${c.amostraPequena ? ` <span class="badge mid">poucas menções ${def('amostra')}</span>` : ''}</td>${extra(c)}
      <td class="r"><span class="badge ${c.nps < meta ? 'bad' : 'good'} num" title="${c.nps < meta ? 'Abaixo da meta' : 'Na meta ou acima'}">${fmt(c.nps)}</span></td>
      <td class="r num">${fmt(c.total)}</td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="minibar" aria-hidden="true"><div class="d" style="flex:${c.pctD}"></div><div class="n" style="flex:${c.pctN}"></div><div class="p" style="flex:${c.pctP}"></div></div><span class="muted num" style="white-space:nowrap">${fmt(c.pctD)} · ${fmt(c.pctN)} · ${fmt(c.pctP)}%</span></div></td>
      <td><span class="badge ${c.impacto === 'Alto' ? 'bad' : c.impacto === 'Médio' ? 'mid' : ''}">${c.impacto}</span> <span class="muted num">${fmt(c.quota, 1)}%</span></td>
    </tr>`).join('') || `<tr><td colspan="${6}" class="muted">Nenhuma causa com esse nome.</td></tr>`;
}

export function mount(rec, brand, meta) {
  const cs = todasCausas(rec.data);
  const comM = cs.filter(c => !c.zero);
  const dz = destaques(cs);
  const g = npsGlobal(rec.data);
  const b = base(brand);
  const nomes = cs.map(c => c.nome);
  const altura = Math.max(220, cs.length * 54 + 60);

  desenhar(document.getElementById('ch-comp'), junta(b, {
    chart: { type: 'bar', height: altura, stacked: true, stackType: '100%' },
    series: [
      { name: 'Detratores', data: cs.map(c => c.d) },
      { name: 'Neutros', data: cs.map(c => c.n) },
      { name: 'Promotores', data: cs.map(c => c.p) },
    ],
    colors: [CORES.det, CORES.neu, CORES.pro],
    plotOptions: { bar: { horizontal: true, barHeight: '62%', borderRadius: 4, borderRadiusApplication: 'around', borderRadiusWhenStacked: 'all' } },
    stroke: { width: 2, colors: ['#fff'] },
    dataLabels: { enabled: true, formatter: (v) => (v >= 8 ? `${fmt(v)}%` : ''), style: { fontSize: '12px', fontWeight: 600, colors: ['#fff', '#1a1a1a', '#fff'] }, dropShadow: { enabled: false } },
    xaxis: { categories: cs.map(c => [c.nome.length > 30 ? c.nome.slice(0, 29) + '…' : c.nome, c.zero ? '0 menções' : `${fmt(c.total)} menções · NPS ${fmt(c.nps)}`]), labels: { formatter: v => `${v}%` }, axisBorder: { show: false } },
    yaxis: { labels: { minWidth: 230, maxWidth: 230, offsetX: 4, style: { fontSize: '12px', colors: ['#1a1a1a'] } } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v, { seriesIndex, dataPointIndex }) => `${fmt(v)} (${fmt([cs[dataPointIndex].pctD, cs[dataPointIndex].pctN, cs[dataPointIndex].pctP][seriesIndex], 1)}%)` } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  }));

  desenhar(document.getElementById('ch-mat'), junta(b, {
    chart: { type: 'scatter', height: 340 },
    series: comM.map(c => ({ name: c.nome, data: [[c.total, c.nps]] })),
    colors: comM.map(c => (c.nps < meta ? CORES.det : CORES.pro)),
    markers: { size: 11, strokeWidth: 2, strokeColors: '#fff', hover: { sizeOffset: 2 } },
    xaxis: { type: 'numeric', tickAmount: 5, min: 0, max: Math.ceil(Math.max(...comM.map(c => c.total)) * 1.15), labels: { formatter: v => fmt(v) }, title: { text: 'Menções', style: { fontSize: '12px', fontWeight: 500, color: '#5f5f5f' } } },
    yaxis: { min: Math.min(-20, Math.floor(Math.min(...comM.map(c => c.nps)) / 10) * 10 - 10), max: 100, tickAmount: 4, title: { text: 'NPS', style: { fontSize: '12px', fontWeight: 500, color: '#5f5f5f' } } },
    annotations: { yaxis: [
      { y: meta, borderColor: '#e0a400', strokeDashArray: 4, label: { text: `Meta ${meta}`, position: 'right', textAnchor: 'end', borderColor: '#ffc148', style: { background: '#ffc148', color: '#1a1a1a', fontWeight: 600, fontSize: '12px' } } },
      ...(g ? [{ y: g.nps, borderColor: '#b4b4b4', strokeDashArray: 2, label: { text: `NPS geral ${fmt(g.nps)}`, position: 'left', textAnchor: 'start', borderColor: 'transparent', style: { background: '#f0f0f0', color: '#494949', fontSize: '12px' } } }] : []),
    ] },
    tooltip: { custom: ({ seriesIndex }) => { const c = comM[seriesIndex]; return `<div style="padding:10px 12px;font-size:12px"><b>${esc(c.nome)}</b><br>NPS ${fmt(c.nps)} · ${fmt(c.total)} menções</div>`; } },
    grid: { xaxis: { lines: { show: true } } },
  }));

  document.getElementById('lg-mat').innerHTML = comM.map(c => `<span><i style="background:${c.nps < meta ? CORES.det : CORES.pro};border-radius:50%"></i>${esc(c.nome)} <b class="num">${fmt(c.nps)}</b></span>`).join('');

  // Tabela: ordenar e procurar
  const tbody = document.querySelector('#tbl-causas tbody');
  let chave = 'total', dir = -1, q = '';
  const pintar = () => {
    const lista = cs.filter(c => c.nome.toLowerCase().includes(q)).sort((a, b2) => {
      if (a.zero !== b2.zero) return a.zero - b2.zero;
      const x = a[chave], y = b2[chave];
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
  const cab = ['Causa', ...(comDriver ? ['Driver'] : []), 'NPS', 'Menções', 'Detratores', 'Neutros', 'Promotores', 'Peso'];
  const st = { fontFace: b.fontFace, fontSize: 10, color: '1A1A1A', valign: 'middle' };
  const linhasT = cs.map(c => [
    { text: c.nome, options: st }, ...(comDriver ? [{ text: c.driver, options: st }] : []),
    { text: c.zero ? '–' : fmt(c.nps), options: { ...st, bold: true, align: 'right', color: c.zero ? '9A9A9A' : c.nps < meta ? 'AD2C19' : '10641D' } },
    { text: fmt(c.total), options: { ...st, align: 'right' } },
    { text: `${fmt(c.pctD)}%`, options: { ...st, align: 'right' } }, { text: `${fmt(c.pctN)}%`, options: { ...st, align: 'right' } }, { text: `${fmt(c.pctP)}%`, options: { ...st, align: 'right' } },
    { text: `${fmt(c.quota, 1)}%`, options: { ...st, align: 'right' } },
  ]);
  // Estilo do template claro do Grupo Brisa: cabeçalho verde sem fundo, linhas alternadas em verde-lima claro
  const zebra = linhasT.map((l, i) => (i % 2 ? l : l.map(c => ({ ...c, options: { ...c.options, fill: { color: TPL.limaClaro } } }))));
  s.addTable([cab.map(t => ({ text: t, options: { ...st, bold: true, color: TPL.verde, border: [{ type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }, { type: 'solid', pt: 1, color: TPL.lima }, { type: 'none' }] } })), ...zebra],
    { x: b.x, y: b.y, w: b.w, h: 5.3, colW: comDriver ? [3.6, 1.8, 0.9, 1.1, 1.2, 1.2, 1.2, 1.33] : [4.4, 1.1, 1.3, 1.4, 1.4, 1.4, 1.33], fontFace: b.fontFace, border: { type: 'none' }, rowH: 0.28, autoPage: linhasT.length > 16, autoPageRepeatHeader: true, autoPageSlideStartY: 1.45 });
};

export function exportar(rec, brand, meta) {
  const cs = todasCausas(rec.data);
  const g = npsGlobal(rec.data);
  const b = baseGrafico(brand);
  const abaixo = causasFiaveis(cs).filter(c => c.nps < meta);
  return {
    kpis: [
      ...(g ? [{ rot: 'NPS de quem respondeu', val: fmt(g.nps), det: `${fmt(g.total)} pessoas · meta ${meta}` }] : []),
      { rot: 'Causas com menções', val: fmt(cs.filter(c => !c.zero).length), det: `de ${fmt(cs.length)} opções` },
      { rot: 'Menções', val: fmt(cs.reduce((a, c) => a + c.total, 0)), det: 'uma pessoa pode escolher várias' },
      { rot: 'Abaixo da meta', val: fmt(abaixo.length), det: abaixo.map(c => c.nome).join(', ') || 'nenhuma causa' },
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
