// Tab "NPS": distribuição das notas 0–10 (Stats iQ Describe).
import { resumoNps, fmt, sinal, LIMITES, CORES, corNps, corNpsClaro } from '../stats.js?v=20261103-1555';
import { base, junta, desenhar, grad, comBrilho, EIXO_CAT, EIXO_VAL, ROTULO, ETIQ_META } from '../charts.js?v=20261103-1555';
import { info, esc, def, GLOSSARIO, btnPptx, faixa } from '../ui.js?v=20261103-1555';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261103-1555';
import { icon } from '../icons.js?v=20261103-1555';

const estadoMeta = (nps, meta) => (nps > meta ? 'Acima do objetivo' : nps === meta ? 'No objetivo' : 'Abaixo do objetivo');

export function chips(rec) {
  return { respostas: resumoNps(rec.data.contagens).total };
}

// Resumo: regra do Stater v10 para o NPS da Colibri (ler_dados_colibri.js), com os mesmos limites.
export function resumo(rec, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const p6T = (c[6] / r.total) * 100, p6D = r.d ? (c[6] / r.d) * 100 : 0;
  const p8T = (c[8] / r.total) * 100, p8N = r.n ? (c[8] / r.n) * 100 : 0;
  const m = r.media;
  const detratorBoa = p6D >= 40 || p6T >= 15 || (m >= 6 && m <= 6.9);
  const neutroBoa = p8N >= 50 || p8T >= 15 || (m >= 8 && m <= 8.9);
  const detratorRelevante = p6D >= 30 || p6T >= 10 || (m >= 5.5 && m <= 6.9);
  const neutroRelevante = p8N >= 40 || p8T >= 10 || (m >= 7.5 && m <= 8.9);
  const margem = detratorBoa || neutroBoa ? 'boa margem' : detratorRelevante || neutroRelevante ? 'margem relevante' : 'margem limitada';
  // A ação segue o lado que tem margem (boa primeiro, depois relevante)
  const det = detratorBoa || (!neutroBoa && detratorRelevante);
  const neu = neutroBoa || (!detratorBoa && neutroRelevante);
  const acao = det && !neu ? 'redução de detratores'
    : neu && !det ? 'conversão de clientes neutros em promotores'
    : 'redução de detratores e da conversão de clientes neutros em promotores';
  const avaliacao = r.nps >= meta ? 'positiva' : 'negativa';
  const comparacao = r.nps > meta ? 'acima do objetivo' : r.nps === meta ? 'em linha com o objetivo' : 'abaixo do objetivo';
  return {
    tom: r.nps >= meta ? 'good' : 'bad',
    texto: `Com base em <strong>${fmt(r.total)}</strong> avaliações, o NPS foi <strong>${fmt(r.nps)}</strong>. A avaliação é <strong>${avaliacao}</strong>, estando <strong>${comparacao}</strong> (${meta}). A distribuição entre promotores, neutros e detratores indica <strong>${margem}</strong> para reforçar a recomendação, sobretudo através da <strong>${acao}</strong>.`,
    factos: [
      { valor: `${sinal(r.nps - meta)}`, rot: 'vs objetivo', tom: r.nps >= meta ? 'good' : 'bad', tip: `NPS (${fmt(r.nps)}) menos o objetivo da marca (${meta}) = ${sinal(r.nps - meta)}. ${r.nps >= meta ? 'Positivo: o NPS está no objetivo ou acima.' : 'Negativo: o NPS está abaixo do objetivo.'} O objetivo define-se na Overview, em Editar objetivos.` },
      { valor: `${fmt(p6D)}%`, rot: 'dos detratores deram 6', tip: `Dos ${fmt(r.d)} detratores (notas 0 a 6), ${fmt(c[6])} deram 6, ou seja ${fmt(p6D)}%. Em relação a todas as respostas (${fmt(r.total)}) são ${fmt(p6T)}%, o valor do gráfico das notas. Estão a um ponto de passar a neutros: se passassem, o NPS subia ${fmt(Math.round(p6T))} pontos. A margem é boa a partir de 40% dos detratores (ou 15% de todas as respostas).` },
      { valor: `${fmt(p8N)}%`, rot: 'dos neutros deram 8', tip: `Dos ${fmt(r.n)} neutros (notas 7 e 8), ${fmt(c[8])} deram 8, ou seja ${fmt(p8N)}%. Em relação a todas as respostas (${fmt(r.total)}) são ${fmt(p8T)}%, o valor do gráfico das notas. Estão a um ponto de passar a promotores: se passassem, o NPS subia ${fmt(Math.round(p8T))} pontos. A margem é boa a partir de 50% dos neutros (ou 15% de todas as respostas).` },
    ],
  };
}

export function html(rec, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const pct = v => `${fmt(v, 1)}%`;
  const ficheiro = rec.fileName ? ` do Excel "${rec.fileName}"` : '';
  const kpi = (rot, val, det, tip, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}">
      <span class="kl">${rot} ${info(rot, tip)}</span>
      <span class="kv num">${val}</span><span class="kd">${det}</span>
    </div>`;
  // Tooltips com as contas feitas com os números deste Excel
  const dif = r.nps - meta;
  const tips = {
    nps: `NPS = % de promotores − % de detratores. Aqui: ${pct(r.pctP)} − ${pct(r.pctD)} = ${fmt(r.pctP - r.pctD, 1)}, arredondado a ${fmt(r.nps)}. Os neutros (${pct(r.pctN)}) não entram na conta. O NPS vai de −100 a 100. O objetivo da marca é ${meta} (define-se na Overview, em Editar objetivos): ${dif > 0 ? `está ${fmt(dif)} pontos acima` : dif < 0 ? `está ${fmt(-dif)} pontos abaixo` : 'está em linha'}.`,
    respostas: `Pessoas que deram uma nota de 0 a 10 no período em análise, segundo${ficheiro ? ficheiro.replace(' do Excel', ' o Excel') : ' o Excel'}. Cada pessoa conta uma vez. É o total usado para calcular todas as percentagens desta tab.${r.total < LIMITES.poucasRespostas ? ` Com menos de ${LIMITES.poucasRespostas} respostas os números servem só como indicação.` : ''}`,
    promotores: `Quem deu 9 ou 10: ${fmt(c[9])} pessoas deram 9 e ${fmt(c[10])} deram 10, num total de ${fmt(r.p)}. ${fmt(r.p)} a dividir pelas ${fmt(r.total)} respostas dá ${pct(r.pctP)}. São os clientes que nos recomendam.`,
    neutros: `Quem deu 7 ou 8: ${fmt(c[7])} pessoas deram 7 e ${fmt(c[8])} deram 8, num total de ${fmt(r.n)}. ${fmt(r.n)} a dividir pelas ${fmt(r.total)} respostas dá ${pct(r.pctN)}. Estão satisfeitos mas não entusiasmados e não entram na conta do NPS.`,
    detratores: `Quem deu de 0 a 6: ${fmt(r.d)} pessoas. ${fmt(r.d)} a dividir pelas ${fmt(r.total)} respostas dá ${pct(r.pctD)}. Por nota: ${[0, 1, 2, 3, 4, 5, 6].map(i => `${i}: ${fmt(c[i])}`).join(' · ')}. São os clientes que não nos recomendam.`,
    media: `Soma de todas as notas a dividir pelas ${fmt(r.total)} respostas: ${fmt(r.media, 2)} em 10. A nota mais dada foi ${r.moda} (${fmt(c[r.moda])} pessoas). O desvio padrão (${fmt(r.dp, 2)}) mostra quanto as notas se afastam da média: quanto maior, mais divididas estão as opiniões.`,
  };
  const avisos = [];
  return `
    ${avisos.join('')}
    <div class="kpis">
      ${kpi('NPS', fmt(r.nps), `Objetivo ${meta}`, tips.nps, true)}
      ${kpi('Respostas', fmt(r.total), r.total < LIMITES.poucasRespostas ? 'poucas respostas' : 'notas de 0 a 10', tips.respostas)}
      ${kpi('Promotores', pct(r.pctP), `${fmt(r.p)} pessoas deram 9 ou 10`, tips.promotores)}
      ${kpi('Neutros', pct(r.pctN), `${fmt(r.n)} pessoas deram 7 ou 8`, tips.neutros)}
      ${kpi('Detratores', pct(r.pctD), `${fmt(r.d)} pessoas deram 0 a 6`, tips.detratores)}
      ${kpi('Média', fmt(r.media, 2), `Desvio padrão ${fmt(r.dp, 2)}`, tips.media)}
    </div>
    <div class="grid-2">
      <section class="card" aria-labelledby="h-gauge">
        <div class="card-head"><h3 id="h-gauge">NPS face ao objetivo ${info('NPS face ao objetivo', `O arco vai de −100 a 100 e a parte colorida chega ao NPS (${fmt(r.nps)}). A cor do arco é verde a partir de 30, amarela de 0 a 29 e vermelha abaixo de 0. O traço laranja marca o objetivo da marca (${meta}). A barra por baixo divide as ${fmt(r.total)} respostas: ${fmt(r.pctD)}% detratores (0 a 6), ${fmt(r.pctN)}% neutros (7 e 8) e ${fmt(r.pctP)}% promotores (9 e 10).`)}</h3>${btnPptx('gauge')}</div>
        <div class="gauge-wrap">
          <div id="ch-gauge" class="chart" role="img" aria-label="NPS ${fmt(r.nps)}, ${estadoMeta(r.nps, meta).toLowerCase()} de ${meta}"></div>
          <span class="meta-pill ${r.nps >= meta ? 'up' : 'down'}" title="${estadoMeta(r.nps, meta)}">${icon(r.nps >= meta ? 'arrowUp' : 'arrowDown')}<span>Objetivo <b class="num">${meta}</b></span></span>
        </div>
        <div style="flex:1"></div><div class="compo" aria-hidden="true">
          <div class="d" style="flex:${r.pctD}">${r.pctD >= 6 ? fmt(r.pctD) + '%' : ''}</div>
          <div class="n" style="flex:${r.pctN}">${r.pctN >= 6 ? fmt(r.pctN) + '%' : ''}</div>
          <div class="p" style="flex:${r.pctP}">${fmt(r.pctP)}%</div>
        </div>
        <div class="legend"><span><i style="background:var(--detractor)"></i>Detratores 0–6</span><span><i style="background:var(--passive)"></i>Neutros 7–8</span><span><i style="background:var(--promoter)"></i>Promotores 9–10</span></div>
        <div style="height:10px"></div>
      </section>
      <section class="card" aria-labelledby="h-dist">
        <div class="card-head">
          <h3 id="h-dist">Notas dadas ${info('Notas dadas', `Quantas pessoas deram cada nota, de 0 a 10. A percentagem por cima de cada barra é em relação a todas as ${fmt(r.total)} respostas (por exemplo, a nota 6 tem ${fmt(c[6])} pessoas, ${fmt((c[6] / r.total) * 100)}% do total). Vermelho: detratores (0 a 6). Cinzento: neutros (7 e 8). Verde: promotores (9 e 10). Passa o rato por uma barra para ver o número exato.`)}</h3>
          ${btnPptx('dist')}
        </div>
        <div id="ch-dist" class="chart" role="img" aria-label="Distribuição das notas de 0 a 10"></div>
      </section>
    </div>
    <section class="card ficticio" aria-labelledby="h-mes">
      <div class="card-head">
        <h3 id="h-mes">NPS por mês ${info('NPS por mês', `Dados fictícios. O Excel atual não traz o mês de cada resposta, por isso os valores foram inventados à volta do NPS real (${fmt(r.nps)}) só para mostrar como o gráfico vai ficar. A linha amarela é o objetivo (${meta}). Quando o Excel trouxer meses, cada ponto passa a ser o NPS desse mês.`)}</h3>
      </div>
      <div class="aviso-ficticio">${icon('info')}<div><b>Dados fictícios</b> O Excel atual não traz meses. Este gráfico só mostra como vai ficar.</div></div>
      <div class="chart-ficticio"><div id="ch-mes" class="chart" role="img" aria-label="NPS por mês com dados fictícios"></div><span class="marca-agua" aria-hidden="true">Dados fictícios</span></div>
    </section>`;
}

// Escreve "Objetivo" em curva, por dentro do arco, centrado no traço da meta (SVG por cima do gráfico)
function textoMeta(g, ang) {
  const el = g.getDom();
  const pintar = () => {
    if (g.isDisposed() || !el.isConnected) return;
    el.querySelector('.meta-curva')?.remove();
    const w = el.clientWidth, h = el.clientHeight;
    const cx = w * 0.5, cy = h * 0.6, R = Math.min(w, h) / 2 * 0.86;
    const r = R - 20 - 26; // por dentro da faixa do arco, abaixo da ponta do traço
    const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy - r * Math.sin(a * Math.PI / 180)];
    const [x1, y1] = pt(ang + 25), [x2, y2] = pt(ang - 25);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'meta-curva'); svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs><path id="mc-${el.id}" d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}"/></defs>
      <text font-size="12" font-weight="700" fill="#c25e00" letter-spacing=".04em"><textPath href="#mc-${el.id}" startOffset="50%" text-anchor="middle">Objetivo</textPath></text>`;
    el.appendChild(svg);
  };
  g.on('finished', pintar);
  new ResizeObserver(() => requestAnimationFrame(pintar)).observe(el);
}

export function mount(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const corNota = i => (i <= 6 ? CORES.det : i <= 8 ? CORES.neu : CORES.pro);
  const corG = corNps(r.nps);
  const b = base(brand);

  // Medidor de -100 a 100: número a contar, triângulo a marcar a meta
  // Ângulo da meta no arco (200° = -100, 90° = 0 no topo, -20° = 100)
  const angMeta = 200 - ((Math.max(-100, Math.min(100, meta)) + 100) / 200) * 220;
  const arco = { type: 'gauge', startAngle: 200, endAngle: -20, min: -100, max: 100, radius: '86%', center: ['50%', '60%'] };
  const gGauge = desenhar(document.getElementById('ch-gauge'), junta(b, {
    tooltip: { show: false },
    series: [
      { ...arco,
        progress: { show: true, roundCap: true, width: 20, itemStyle: { color: grad(corNpsClaro(r.nps), corG, true) } },
        axisLine: { roundCap: true, lineStyle: { width: 20, color: [[1, '#f0f1f3']] } },
        axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { distance: -44, color: '#6b6b6b', fontSize: 12, formatter: v => (v === -100 || v === 0 || v === 100 ? v : '') },
        pointer: { show: false }, anchor: { show: false }, title: { show: false },
        detail: { valueAnimation: true, offsetCenter: [0, '-22%'], fontSize: 48, fontWeight: 500, color: '#1a1a1a', formatter: v => fmt(Math.round(v)) },
        data: [{ value: r.nps }] },
      // Marca da meta: traço laranja centrado no arco, a sair dos dois lados; o texto curvo vem de textoMeta()
      { type: 'gauge', silent: true, z: 10, radius: arco.radius, center: arco.center, min: 0, max: 1, splitNumber: 1,
        startAngle: angMeta, endAngle: angMeta,
        axisLine: { show: false }, axisTick: { show: false }, pointer: { show: false }, anchor: { show: false }, title: { show: false }, detail: { show: false },
        splitLine: { show: true, distance: -16, length: 36, lineStyle: { color: '#f07d00', width: 4, cap: 'round' } },
        axisLabel: { show: false },
        data: [] },
    ],
  }), 260);
  if (gGauge) textoMeta(gGauge, angMeta);

  // Notas dadas: barras com fundo suave, gradiente e % por cima
  desenhar(document.getElementById('ch-dist'), junta(b, {
    grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } },
      formatter: p => `<b>Nota ${p[0].name}</b><br>${fmt(p[0].value)} respostas · ${fmt((p[0].value / r.total) * 100, 1)}%` },
    xAxis: { type: 'category', data: c.map((_, i) => String(i)), ...EIXO_CAT },
    yAxis: { type: 'value', splitNumber: 4, ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => fmt(v) } },
    series: [{
      type: 'bar', barWidth: '58%', showBackground: true, backgroundStyle: { color: '#f8f8f8', borderRadius: [10, 10, 4, 4] },
      data: c.map((v, i) => ({ value: v, itemStyle: { color: comBrilho(corNota(i)), borderRadius: [10, 10, 4, 4] } })),
      label: { show: true, position: 'top', distance: 6, ...ROTULO, formatter: p => `${fmt((p.value / r.total) * 100, 0)}%` },
      emphasis: { focus: 'self' }, blur: { itemStyle: { opacity: 0.4 } },
      animationDelay: i => i * 40,
    }],
  }), 300);

  // Exemplo fictício: meses à volta do valor real, em linha com área e a meta
  const meses = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
  const desvios = [-7, -4, -6, -2, -5, -1, 1, -3, 2, 0, 3, 1];
  const serie = desvios.map(d => r.nps + d);
  desenhar(document.getElementById('ch-mes'), junta(b, {
    grid: { left: 4, right: 16, top: 28, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: p => `<b>${p[0].name}</b><br>NPS ${p[0].value} (fictício)` },
    xAxis: { type: 'category', boundaryGap: false, data: meses, ...EIXO_CAT, axisLine: { show: true, lineStyle: { color: '#e6e6e6' } } },
    yAxis: { type: 'value', min: Math.min(0, r.nps - 20), max: 100, interval: 25, ...EIXO_VAL },
    series: [{
      type: 'line', smooth: 0.35, data: serie, symbol: 'circle', symbolSize: 8,
      lineStyle: { width: 3, color: CORES.pro },
      itemStyle: { color: '#fff', borderColor: CORES.pro, borderWidth: 2 },
      areaStyle: { color: grad('rgba(34,160,59,.26)', 'rgba(34,160,59,0)') },
      label: { show: true, position: 'top', distance: 8, ...ROTULO },
      markLine: { symbol: 'none', silent: true, lineStyle: { color: CORES.ama, type: [5, 4], width: 1.5 },
        label: { formatter: `Objetivo ${meta}`, position: 'insideStartTop', ...ETIQ_META }, data: [{ yAxis: meta }] },
    }],
  }), 240);
}

// Para exportar: números principais, resumo e gráficos nativos do PowerPoint
export function exportar(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const b = baseGrafico(brand);
  const pct = v => Math.round((v / r.total) * 1000) / 10;
  return {
    kpis: [
      { rot: 'NPS', val: fmt(r.nps), det: `Objetivo ${meta}` },
      { rot: 'Respostas', val: fmt(r.total), det: 'notas de 0 a 10' },
      { rot: 'Promotores', val: `${fmt(r.pctP, 1)}%`, det: `${fmt(r.p)} pessoas` },
      { rot: 'Neutros', val: `${fmt(r.pctN, 1)}%`, det: `${fmt(r.n)} pessoas` },
      { rot: 'Detratores', val: `${fmt(r.pctD, 1)}%`, det: `${fmt(r.d)} pessoas` },
      { rot: 'Média', val: fmt(r.media, 2), det: `Desvio padrão ${fmt(r.dp, 2)}` },
    ],
    resumo: [textoDe(resumo(rec, meta).texto)],
    filtros: rec.data.filtros,
    graficos: [
      {
        id: 'gauge', titulo: 'NPS face ao objetivo',
        desenhar: (s, p) => {
          s.addChart(p.ChartType.doughnut, [{ name: 'Respostas', labels: ['Detratores 0–6', 'Neutros 7–8', 'Promotores 9–10'], values: [r.d, r.n, r.p] }],
            { ...b, x: 0.5, w: 7, holeSize: 62, chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], showPercent: true, showValue: false, dataLabelColor: 'FFFFFF', legendPos: 'r' });
          s.addText([
            { text: 'NPS', options: { fontSize: 14, color: '767676', breakLine: true } },
            { text: fmt(r.nps), options: { fontSize: 60, bold: true, color: '1A1A1A', breakLine: true } },
            { text: `${r.nps >= meta ? '▲' : '▼'}  Objetivo ${meta}`, options: { fontSize: 14, color: r.nps >= meta ? '10641D' : 'AD2C19' } },
          ], { x: 8, y: 2.4, w: 4.8, h: 2.6, fontFace: b.fontFace, valign: 'middle' });
        },
      },
      {
        id: 'dist', titulo: 'Notas dadas (% das respostas)',
        // Três séries empilhadas para cada nota ter a cor do seu grupo e continuar editável
        desenhar: (s, p) => s.addChart(p.ChartType.bar, [
          { name: 'Detratores', labels: c.map((_, i) => String(i)), values: c.map((v, i) => (i <= 6 ? pct(v) : 0)) },
          { name: 'Neutros', labels: c.map((_, i) => String(i)), values: c.map((v, i) => (i === 7 || i === 8 ? pct(v) : 0)) },
          { name: 'Promotores', labels: c.map((_, i) => String(i)), values: c.map((v, i) => (i >= 9 ? pct(v) : 0)) },
        ], { ...b, barDir: 'col', barGrouping: 'stacked', barGapWidthPct: 40, chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], showValue: true, dataLabelFormatCode: '0.0"%";;;', dataLabelPosition: 'inEnd', valAxisLabelFormatCode: '0"%"' }),
      },
    ],
  };
}

// Texto do Stater v10, sem alterações
export const importar = {
  titulo: 'Como importar os dados de NPS',
  texto: 'No Stats iQ, selecione a variável principal "(Numeric) NPS" e execute a opção "Describe". Em seguida, exporte a tabela para Excel.',
};
