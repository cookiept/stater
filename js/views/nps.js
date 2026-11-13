// Tab "NPS": distribuição das notas 0–10 (Stats iQ Describe).
import { resumoNps, fmt, sinal, LIMITES, CORES, corNps, corNpsClaro } from '../stats.js?v=20261113-1213';
import { base, junta, desenhar, grad, comBrilho, EIXO_CAT, EIXO_VAL, ROTULO, ETIQ_META } from '../charts.js?v=20261113-1213';
import { info, esc, def, GLOSSARIO, btnPptx, faixa } from '../ui.js?v=20261113-1213';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261113-1213';
import { icon } from '../icons.js?v=20261113-1213';

// ---------- Período e comparação (só com o Excel de respostas, que traz a data de cada resposta) ----------
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nomeMes = m => `${MES[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
const curtoMes = m => MES[+m.slice(5, 7) - 1];
const somaMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const fimMes = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
const rotPeriodo = (de, ate) => (de === ate ? nomeMes(de) : `${nomeMes(de).replace(de.slice(0, 4) === ate.slice(0, 4) ? ` ${de.slice(0, 4)}` : '', '')} – ${nomeMes(ate)}`);
const COMP = { ant: 'Período anterior', homo: 'Mesmo período do ano anterior', nada: 'Sem comparação' };

function porMes(dias) {
  const m = {};
  for (const [d, cs] of Object.entries(dias)) { const k = d.slice(0, 7); m[k] ||= Array(11).fill(0); cs.forEach((n, i) => { m[k][i] += n; }); }
  return m;
}
const somar = (mm, de, ate) => {
  const t = Array(11).fill(0);
  let tem = false;
  for (const [k, cs] of Object.entries(mm)) if (k >= de && k <= ate) { tem = true; cs.forEach((n, i) => { t[i] += n; }); }
  return tem ? t : null;
};

// Aplica o período escolhido (data.sel = "de|ate|comp") às contagens que o resto da tab usa
export function preparar(rec) {
  const d = rec.data;
  if (!d.dias) return rec;
  const mm = porMes(d.dias);
  const meses = Object.keys(mm).sort();
  let [de, ate, comp] = (d.sel || '').split('|');
  if (!meses.includes(de)) de = meses[0];
  if (!meses.includes(ate)) ate = meses[meses.length - 1];
  if (de > ate) [de, ate] = [ate, de];
  if (!COMP[comp]) comp = 'ant';
  const n = meses.indexOf(ate) - meses.indexOf(de) + 1;
  const cDe = comp === 'homo' ? somaMes(de, -12) : somaMes(de, -n), cAte = comp === 'homo' ? somaMes(ate, -12) : somaMes(de, -1);
  const contagensComp = comp === 'nada' ? null : somar(mm, cDe, cAte);
  const ultimoDia = Object.keys(d.dias).sort().pop(), primeiroDia = Object.keys(d.dias).sort()[0];
  const parcial = m => (m === ultimoDia.slice(0, 7) && ultimoDia < fimMes(m)) || (m === primeiroDia.slice(0, 7) && primeiroDia.slice(8) !== '01');
  return { ...rec, data: { ...d, contagens: somar(mm, de, ate), periodo: { inicio: de === primeiroDia.slice(0, 7) ? primeiroDia : `${de}-01`, fim: ate === ultimoDia.slice(0, 7) ? ultimoDia : fimMes(ate) },
    mensal: { meses: meses.map(m => ({ m, c: mm[m], parcial: parcial(m) })), de, ate, comp, cDe, cAte, contagensComp, rot: rotPeriodo(de, ate), rotComp: contagensComp ? rotPeriodo(cDe, cAte) : null, sel: `${de}|${ate}|${comp}` } } };
}

function seletorPeriodo(M) {
  const op = (v, t, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(t)}</option>`;
  const ms = M.meses.map(x => x.m);
  return `<div class="vistas periodo-sel" role="group" aria-label="Período em análise">
    <span class="vistas-rot">Período</span>
    <label class="sr-only" for="p-de">Desde</label><select id="p-de" class="vista-sel" data-act="vista">${ms.map(m => op(`${m}|${M.ate}|${M.comp}`, nomeMes(m), m === M.de)).join('')}</select>
    <span class="muted">até</span>
    <label class="sr-only" for="p-ate">Até</label><select id="p-ate" class="vista-sel" data-act="vista">${ms.map(m => op(`${M.de}|${m}|${M.comp}`, nomeMes(m) + (M.meses.find(x => x.m === m).parcial ? ' (incompleto)' : ''), m === M.ate)).join('')}</select>
    <span class="vistas-rot" style="margin-left:12px">Comparar com</span>
    <label class="sr-only" for="p-comp">Comparar com</label><select id="p-comp" class="vista-sel" data-act="vista">${Object.entries(COMP).map(([k, t]) => op(`${M.de}|${M.ate}|${k}`, t, k === M.comp)).join('')}</select>
    ${M.comp !== 'nada' ? `<span class="muted">${M.rotComp ? esc(M.rotComp) : 'sem dados para esse período'}</span>` : ''}
  </div>`;
}

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
  const M = rec.data.mensal;
  const rc = M?.contagensComp ? resumoNps(M.contagensComp) : null;
  const compTxt = rc ? ` Face a ${esc(M.rotComp)} (NPS ${fmt(rc.nps)}), o NPS ${r.nps > rc.nps ? `subiu <strong>${fmt(r.nps - rc.nps)}</strong> ${r.nps - rc.nps === 1 ? 'ponto' : 'pontos'}` : r.nps < rc.nps ? `desceu <strong>${fmt(rc.nps - r.nps)}</strong> ${rc.nps - r.nps === 1 ? 'ponto' : 'pontos'}` : 'ficou igual'}.` : '';
  return {
    tom: r.nps >= meta ? 'good' : 'bad',
    texto: `${M ? `Em <strong>${esc(M.rot)}</strong>, com` : 'Com'} base em <strong>${fmt(r.total)}</strong> avaliações, o NPS foi <strong>${fmt(r.nps)}</strong>. A avaliação é <strong>${avaliacao}</strong>, estando <strong>${comparacao}</strong> (${meta}). A distribuição entre promotores, neutros e detratores indica <strong>${margem}</strong> para reforçar a recomendação, sobretudo através da <strong>${acao}</strong>.${compTxt}`,
    factos: [
      { valor: `${fmt(p6D)}%`, rot: 'do total de detratores deram 6', tip: `Dos ${fmt(r.d)} detratores (notas 0 a 6), ${fmt(c[6])} deram 6, ou seja ${fmt(p6D)}%. Em relação a todas as respostas (${fmt(r.total)}) são ${fmt(p6T)}%, o valor do gráfico das notas. Estão a um ponto de passar a neutros: se passassem, o NPS subia ${fmt(Math.round(p6T))} pontos. A margem é boa a partir de 40% dos detratores (ou 15% de todas as respostas).` },
      { valor: `${fmt(p8N)}%`, rot: 'do total de neutros deram 8', tip: `Dos ${fmt(r.n)} neutros (notas 7 e 8), ${fmt(c[8])} deram 8, ou seja ${fmt(p8N)}%. Em relação a todas as respostas (${fmt(r.total)}) são ${fmt(p8T)}%, o valor do gráfico das notas. Estão a um ponto de passar a promotores: se passassem, o NPS subia ${fmt(Math.round(p8T))} pontos. A margem é boa a partir de 50% dos neutros (ou 15% de todas as respostas).` },
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
  const M = rec.data.mensal;
  const rc = M?.contagensComp ? resumoNps(M.contagensComp) : null;
  const delta = rc ? r.nps - rc.nps : null;
  const detNps = `Objetivo ${meta}${rc ? ` · <span class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${delta > 0 ? '+' : ''}${fmt(delta)}</span> vs ${fmt(rc.nps)}` : ''}`;
  if (rc) tips.nps += ` Comparação: em ${M.rotComp} o NPS foi ${fmt(rc.nps)} (${fmt(rc.total)} respostas), por isso ${delta > 0 ? `subiu ${fmt(delta)}` : delta < 0 ? `desceu ${fmt(-delta)}` : 'ficou igual'}.`;
  return `
    ${M ? seletorPeriodo(M) : ''}
    <div class="kpis">
      ${kpi('NPS', fmt(r.nps), detNps, tips.nps, true)}
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
    ${M ? `<section class="card" aria-labelledby="h-mes">
      <div class="card-head">
        <h3 id="h-mes">NPS por mês ${info('NPS por mês', `NPS de cada mês, calculado a partir da data e da nota de cada resposta do Excel. A faixa azul é o período escolhido (${M.rot})${M.rotComp ? ` e a cinzenta o período de comparação (${M.rotComp})` : ''}. A linha amarela é o objetivo (${meta}). Os meses marcados com * estão incompletos. Passa o rato por um ponto para ver as respostas desse mês.`)}</h3>
        <div class="note">Linha amarela: objetivo (${meta}).${M.meses.some(x => x.parcial) ? ' * mês incompleto.' : ''}</div>${btnPptx('mes')}
      </div>
      <div id="ch-mes" class="chart" role="img" aria-label="NPS por mês"></div>
    </section>` : `<section class="card ficticio" aria-labelledby="h-mes">
      <div class="card-head">
        <h3 id="h-mes">NPS por mês ${info('NPS por mês', `Dados fictícios. Este Excel não traz o mês de cada resposta, por isso os valores foram inventados à volta do NPS real (${fmt(r.nps)}) só para mostrar como o gráfico vai ficar. Para ver o NPS real de cada mês, carrega a exportação das respostas (Start Date e nota do NPS).`)}</h3>
      </div>
      <div class="aviso-ficticio">${icon('info')}<div><b>Dados fictícios</b> Para ver os meses reais, carrega a exportação das respostas do Qualtrics (Start Date e nota do NPS).</div></div>
      <div class="chart-ficticio"><div id="ch-mes" class="chart" role="img" aria-label="NPS por mês com dados fictícios"></div><span class="marca-agua" aria-hidden="true">Dados fictícios</span></div>
    `}
    </section>
    ${M ? `<section class="card" aria-labelledby="h-dp">
      <div class="card-head">
        <h3 id="h-dp">Desvio padrão por mês ${info('Desvio padrão por mês', `Desvio padrão das notas de 0 a 10 em cada mês. Mostra se as pessoas dão notas parecidas (desvio baixo) ou muito diferentes umas das outras (desvio alto, com notas altas e baixas ao mesmo tempo). A linha cinzenta é o desvio padrão do período escolhido (${M.rot}): ${fmt(r.dp, 2)}. Os meses marcados com * estão incompletos.`)}</h3>
        <div class="note">Linha cinzenta: desvio do período (${fmt(r.dp, 2)}).</div>${btnPptx('dp')}
      </div>
      <div id="ch-dp" class="chart" role="img" aria-label="Desvio padrão das notas por mês"></div>
    </section>` : `<section class="card ficticio" aria-labelledby="h-dp">
      <div class="card-head">
        <h3 id="h-dp">Desvio padrão por mês ${info('Desvio padrão por mês', `Dados fictícios. Este Excel não traz o mês de cada resposta, por isso os valores foram inventados à volta do desvio padrão real (${fmt(r.dp, 2)}) só para mostrar como o gráfico vai ficar. Para ver os meses reais, carrega a exportação das respostas (Start Date e nota do NPS).`)}</h3>
      </div>
      <div class="aviso-ficticio">${icon('info')}<div><b>Dados fictícios</b> Para ver os meses reais, carrega a exportação das respostas do Qualtrics (Start Date e nota do NPS).</div></div>
      <div class="chart-ficticio"><div id="ch-dp" class="chart" role="img" aria-label="Desvio padrão por mês com dados fictícios"></div><span class="marca-agua" aria-hidden="true">Dados fictícios</span></div>
    </section>`}`;
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

  const M = rec.data.mensal;
  desvioMes(rec, b, r);
  if (M) {
    const xs = M.meses.map(x => `${curtoMes(x.m)}${x.parcial ? '*' : ''}${x.m.slice(5) === '01' || x === M.meses[0] ? `\n${x.m.slice(0, 4)}` : ''}`);
    const rs = M.meses.map(x => resumoNps(x.c));
    const faixa = (de, ate, cor, nome) => { const i = M.meses.findIndex(x => x.m >= de), j = M.meses.map(x => x.m <= ate).lastIndexOf(true); return i >= 0 && j >= i ? [[{ xAxis: i, name: nome, itemStyle: { color: cor } }, { xAxis: j }]] : []; };
    desenhar(document.getElementById('ch-mes'), junta(b, {
      grid: { left: 4, right: 16, top: 34, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', formatter: p => { const i = p[0].dataIndex, x = M.meses[i], q = rs[i]; return `<b>${nomeMes(x.m)}</b>${x.parcial ? ' (incompleto)' : ''}<br>NPS ${fmt(q.nps)} · ${fmt(q.total)} respostas<br>${fmt(q.pctP, 1)}% promotores · ${fmt(q.pctD, 1)}% detratores`; } },
      xAxis: { type: 'category', boundaryGap: true, data: xs, ...EIXO_CAT, axisLine: { show: true, lineStyle: { color: '#e6e6e6' } } },
      yAxis: { type: 'value', min: Math.min(0, Math.floor((Math.min(...rs.map(q => q.nps), meta) - 10) / 10) * 10), max: 100, interval: 20, ...EIXO_VAL },
      series: [{
        type: 'line', smooth: 0.3, data: rs.map(q => q.nps), symbol: 'circle', symbolSize: 9,
        lineStyle: { width: 3, color: CORES.pro },
        itemStyle: { color: '#fff', borderColor: CORES.pro, borderWidth: 2 },
        areaStyle: { color: grad('rgba(34,160,59,.20)', 'rgba(34,160,59,0)') },
        label: { show: true, position: 'top', distance: 8, ...ROTULO },
        markArea: { silent: true, label: { color: '#494949', fontSize: 12, position: 'insideTop', distance: 4 }, data: [
          ...faixa(M.de, M.ate, 'rgba(20,120,156,.10)', 'Período'),
          ...(M.rotComp ? faixa(M.cDe, M.cAte, 'rgba(0,0,0,.05)', 'Comparação') : []),
        ] },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: CORES.ama, type: [5, 4], width: 1.5 },
          label: { formatter: `Objetivo ${meta}`, position: 'insideEndTop', ...ETIQ_META }, data: [{ yAxis: meta }] },
      }],
    }), 280);
    return;
  }
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

// Desvio padrão das notas em cada mês (real com a exportação das respostas; fictício sem ela)
function desvioMes(rec, b, r) {
  const M = rec.data.mensal;
  const el = document.getElementById('ch-dp');
  if (!el) return;
  const xs = M ? M.meses.map(x => `${curtoMes(x.m)}${x.parcial ? '*' : ''}${x.m.slice(5) === '01' || x === M.meses[0] ? `\n${x.m.slice(0, 4)}` : ''}`) : ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
  const rs = M ? M.meses.map(x => resumoNps(x.c)) : null;
  const vals = M ? rs.map(q => Math.round(q.dp * 100) / 100) : [0.12, 0.05, 0.1, -0.04, 0.08, -0.02, 0, 0.06, -0.05, 0.03, -0.07, 0.02].map(d => Math.round((r.dp + d) * 100) / 100);
  const faixa = (de, ate, cor, nome) => { const i = M.meses.findIndex(x => x.m >= de), j = M.meses.map(x => x.m <= ate).lastIndexOf(true); return i >= 0 && j >= i ? [[{ xAxis: i, name: nome, itemStyle: { color: cor } }, { xAxis: j }]] : []; };
  const max = Math.ceil(Math.max(...vals, r.dp) + 0.5);
  desenhar(el, junta(b, {
    grid: { left: 4, right: 16, top: 34, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', formatter: p => { const i = p[0].dataIndex; return M ? `<b>${nomeMes(M.meses[i].m)}</b>${M.meses[i].parcial ? ' (incompleto)' : ''}<br>Desvio padrão ${fmt(vals[i], 2)} · média ${fmt(rs[i].media, 2)}<br>${fmt(rs[i].total)} respostas` : `<b>${p[0].name}</b><br>Desvio padrão ${fmt(vals[i], 2)} (fictício)`; } },
    xAxis: { type: 'category', boundaryGap: !!M, data: xs, ...EIXO_CAT, axisLine: { show: true, lineStyle: { color: '#e6e6e6' } } },
    yAxis: { type: 'value', min: 0, max, ...EIXO_VAL, axisLabel: { ...(EIXO_VAL.axisLabel || {}), formatter: v => fmt(v, 1) } },
    series: [{
      type: 'line', smooth: 0.3, data: vals, symbol: 'circle', symbolSize: 9,
      lineStyle: { width: 3, color: '#1f4bff' },
      itemStyle: { color: '#fff', borderColor: '#1f4bff', borderWidth: 2 },
      areaStyle: { color: grad('rgba(31,75,255,.16)', 'rgba(31,75,255,0)') },
      label: { show: true, position: 'top', distance: 8, ...ROTULO, formatter: q => fmt(q.value, 2) },
      ...(M ? { markArea: { silent: true, label: { color: '#494949', fontSize: 12, position: 'insideTop', distance: 4 }, data: [
        ...faixa(M.de, M.ate, 'rgba(20,120,156,.10)', 'Período'),
        ...(M.rotComp ? faixa(M.cDe, M.cAte, 'rgba(0,0,0,.05)', 'Comparação') : []),
      ] } } : {}),
      markLine: { symbol: 'none', silent: true, lineStyle: { color: '#9a9a9a', type: [5, 4], width: 1.5 }, label: { show: false }, data: [{ yAxis: Math.round(r.dp * 100) / 100 }] },
    }],
  }), 260);
}

// Para exportar: números principais, resumo e gráficos nativos do PowerPoint
export function exportar(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const b = baseGrafico(brand);
  const pct = v => Math.round((v / r.total) * 1000) / 10;
  return {
    kpis: [
      { rot: 'NPS', val: fmt(r.nps), det: `Objetivo ${meta}${rec.data.mensal?.contagensComp ? ` · ${r.nps - resumoNps(rec.data.mensal.contagensComp).nps >= 0 ? '+' : ''}${fmt(r.nps - resumoNps(rec.data.mensal.contagensComp).nps)} vs ${rec.data.mensal.rotComp}` : ''}` },
      { rot: 'Respostas', val: fmt(r.total), det: 'notas de 0 a 10' },
      { rot: 'Promotores', val: `${fmt(r.pctP, 1)}%`, det: `${fmt(r.p)} pessoas` },
      { rot: 'Neutros', val: `${fmt(r.pctN, 1)}%`, det: `${fmt(r.n)} pessoas` },
      { rot: 'Detratores', val: `${fmt(r.pctD, 1)}%`, det: `${fmt(r.d)} pessoas` },
      { rot: 'Média', val: fmt(r.media, 2), det: `Desvio padrão ${fmt(r.dp, 2)}` },
    ],
    resumo: [textoDe(resumo(rec, meta).texto)],
    filtros: rec.data.filtros,
    graficos: [
      ...(rec.data.mensal ? [{ id: 'dp', titulo: 'Desvio padrão por mês', desenhar: (s, p) => s.addChart(p.ChartType.line, [
        { name: 'Desvio padrão', labels: rec.data.mensal.meses.map(x => nomeMes(x.m) + (x.parcial ? '*' : '')), values: rec.data.mensal.meses.map(x => Math.round(resumoNps(x.c).dp * 100) / 100) },
      ], { ...b, chartColors: ['1F4BFF'], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 7, showValue: true, dataLabelPosition: 't', dataLabelFormatCode: '0.00', showLegend: false, valAxisMinVal: 0 }) }] : []),
      ...(rec.data.mensal ? [{ id: 'mes', titulo: 'NPS por mês', desenhar: (s, p) => s.addChart(p.ChartType.line, [
        { name: 'NPS', labels: rec.data.mensal.meses.map(x => nomeMes(x.m) + (x.parcial ? '*' : '')), values: rec.data.mensal.meses.map(x => resumoNps(x.c).nps) },
        { name: `Objetivo ${meta}`, labels: rec.data.mensal.meses.map(x => nomeMes(x.m)), values: rec.data.mensal.meses.map(() => meta) },
      ], { ...b, chartColors: [hex(CORES.pro), hex(CORES.ama)], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 7, showValue: true, dataLabelPosition: 't', showLegend: true, legendPos: 'b', valAxisMinVal: -100, valAxisMaxVal: 100 }) }] : []),
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
  texto: 'No Stats iQ, selecione a variável principal "(Numeric) NPS" e execute a opção "Describe". Em seguida, exporte a tabela para Excel. Para ver o NPS por mês, use antes a exportação das respostas (Data & Analysis, só com a data e a nota do NPS).',
};
