// Tab "NPS": distribuição das notas 0–10 (Stats iQ Describe).
import { resumoNps, fmt, sinal, LIMITES, CORES, corNps, corNpsClaro } from '../stats.js?v=20261103-1225';
import { base, junta, desenhar, grad, comBrilho, EIXO_CAT, EIXO_VAL, ROTULO, ETIQ_META } from '../charts.js?v=20261103-1225';
import { info, esc, def, GLOSSARIO, btnPptx, faixa } from '../ui.js?v=20261103-1225';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261103-1225';
import { icon } from '../icons.js?v=20261103-1225';

const estadoMeta = (nps, meta) => (nps > meta ? 'Acima da meta' : nps === meta ? 'Na meta' : 'Abaixo da meta');

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
      { valor: `${sinal(r.nps - meta)}`, rot: 'vs objetivo', tom: r.nps >= meta ? 'good' : 'bad', tip: 'Diferença entre o NPS e o objetivo definido na Overview.' },
      { valor: `${fmt(p6D)}%`, rot: 'detratores com 6', tip: `Quem deu 6 está a um ponto de ser neutro. Se passassem a neutros, o NPS subia ${sinal(Math.round(p6T))} pontos. Margem boa a partir de 40% (ou 15% do total).` },
      { valor: `${fmt(p8N)}%`, rot: 'neutros com 8', tip: `Quem deu 8 está a um ponto de ser promotor. Se passassem a promotores, o NPS subia ${sinal(Math.round(p8T))} pontos. Margem boa a partir de 50% (ou 15% do total).` },
    ],
  };
}

export function html(rec, meta) {
  const r = resumoNps(rec.data.contagens);
  const kpi = (rot, val, det, k, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}">
      <span class="kl">${rot} ${k ? def(k, rot) : ''}</span>
      <span class="kv num">${val}</span><span class="kd">${det}</span>
    </div>`;
  const avisos = [];
  return `
    ${avisos.join('')}
    <div class="kpis">
      ${kpi('NPS', fmt(r.nps), `Meta ${meta}`, 'nps', true)}
      ${kpi('Respostas', fmt(r.total), r.total < LIMITES.poucasRespostas ? 'poucas respostas' : 'notas de 0 a 10', 'respostas')}
      ${kpi('Promotores', `${fmt(r.pctP, 1)}%`, `${fmt(r.p)} pessoas`, 'promotores')}
      ${kpi('Neutros', `${fmt(r.pctN, 1)}%`, `${fmt(r.n)} pessoas`, 'neutros')}
      ${kpi('Detratores', `${fmt(r.pctD, 1)}%`, `${fmt(r.d)} pessoas`, 'detratores')}
      ${kpi('Média', fmt(r.media, 2), `Desvio padrão ${fmt(r.dp, 2)}`, 'media')}
    </div>
    <div class="grid-2">
      <section class="card" aria-labelledby="h-gauge">
        <div class="card-head"><h3 id="h-gauge">NPS face à meta ${def('meta')}</h3>${btnPptx('gauge')}</div>
        <div class="gauge-wrap">
          <div id="ch-gauge" class="chart" role="img" aria-label="NPS ${fmt(r.nps)}, ${estadoMeta(r.nps, meta).toLowerCase()} de ${meta}"></div>
          <span class="meta-pill ${r.nps >= meta ? 'up' : 'down'}" title="${estadoMeta(r.nps, meta)}">${icon(r.nps >= meta ? 'arrowUp' : 'arrowDown')}<span>Meta <b class="num">${meta}</b></span></span>
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
          <h3 id="h-dist">Notas dadas ${info('Notas dadas', 'Quantas pessoas deram cada nota. Por cima de cada barra está a percentagem do total.')}</h3>
          ${btnPptx('dist')}
        </div>
        <div id="ch-dist" class="chart" role="img" aria-label="Distribuição das notas de 0 a 10"></div>
      </section>
    </div>
    <section class="card ficticio" aria-labelledby="h-mes">
      <div class="card-head">
        <h3 id="h-mes">NPS por mês</h3>
      </div>
      <div class="aviso-ficticio">${icon('info')}<div><b>Dados fictícios</b> O Excel atual não traz meses. Este gráfico só mostra como vai ficar.</div></div>
      <div class="chart-ficticio"><div id="ch-mes" class="chart" role="img" aria-label="NPS por mês com dados fictícios"></div><span class="marca-agua" aria-hidden="true">Dados fictícios</span></div>
    </section>`;
}

export function mount(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const corNota = i => (i <= 6 ? CORES.det : i <= 8 ? CORES.neu : CORES.pro);
  const corG = corNps(r.nps);
  const b = base(brand);

  // Medidor de -100 a 100: número a contar, triângulo a marcar a meta
  const arco = { type: 'gauge', startAngle: 200, endAngle: -20, min: -100, max: 100, radius: '86%', center: ['50%', '60%'] };
  desenhar(document.getElementById('ch-gauge'), junta(b, {
    tooltip: { show: false },
    series: [
      { ...arco,
        progress: { show: true, roundCap: true, width: 20, itemStyle: { color: grad(corNpsClaro(r.nps), corG, true) } },
        axisLine: { roundCap: true, lineStyle: { width: 20, color: [[1, '#f0f1f3']] } },
        axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { distance: -44, color: '#6b6b6b', fontSize: 12, formatter: v => (v === -100 || v === 100 ? v : '') },
        pointer: { show: false }, anchor: { show: false }, title: { show: false },
        detail: { valueAnimation: true, offsetCenter: [0, '-22%'], fontSize: 48, fontWeight: 500, color: '#1a1a1a', formatter: v => fmt(Math.round(v)) },
        data: [{ value: r.nps }] },
      { ...arco, silent: true,
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        pointer: { show: true, icon: 'triangle', length: 12, width: 14, offsetCenter: [0, '-118%'], itemStyle: { color: '#1a1a1a' } },
        anchor: { show: false }, title: { show: false }, detail: { show: false },
        data: [{ value: meta }] },
    ],
  }), 260);

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
        label: { formatter: `Meta ${meta}`, position: 'insideStartTop', ...ETIQ_META }, data: [{ yAxis: meta }] },
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
      { rot: 'NPS', val: fmt(r.nps), det: `Meta ${meta}` },
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
        id: 'gauge', titulo: 'NPS face à meta',
        desenhar: (s, p) => {
          s.addChart(p.ChartType.doughnut, [{ name: 'Respostas', labels: ['Detratores 0–6', 'Neutros 7–8', 'Promotores 9–10'], values: [r.d, r.n, r.p] }],
            { ...b, x: 0.5, w: 7, holeSize: 62, chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], showPercent: true, showValue: false, dataLabelColor: 'FFFFFF', legendPos: 'r' });
          s.addText([
            { text: 'NPS', options: { fontSize: 14, color: '767676', breakLine: true } },
            { text: fmt(r.nps), options: { fontSize: 60, bold: true, color: '1A1A1A', breakLine: true } },
            { text: `${r.nps >= meta ? '▲' : '▼'}  Meta ${meta}`, options: { fontSize: 14, color: r.nps >= meta ? '10641D' : 'AD2C19' } },
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
