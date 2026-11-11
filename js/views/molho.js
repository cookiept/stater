// Tab "Todos ao molho" (Tabela única de causas): junta as causas raiz de todos os drivers numa só tabela.
// Cada driver é um Excel "Relate" de Group NPS com a causa raiz desse driver; carregam-se vários de uma vez.
import { CORES, enriquecerCausas, comZeros, fmt, sinal, destaques, causasFiaveis } from '../stats.js?v=20261111-1439';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL, ETIQ_META } from '../charts.js?v=20261111-1439';
import { info, esc, def, btnPptx, faixa } from '../ui.js?v=20261111-1439';
import { icon } from '../icons.js?v=20261111-1439';
import { formatarPeriodo } from '../excel.js?v=20261111-1439';
import { npsGlobal, destaquesHtml, linhas, tabelaPptx } from './causas.js?v=20261111-1439';
import { baseGrafico, hex, textoDe } from '../export.js?v=20261111-1439';

export const multi = true;

// Junta um Excel novo aos que já existem; o mesmo driver é substituído
export function juntar(rec, novo, fileName) {
  const ficheiros = [...(rec?.data.ficheiros || [])];
  const driver = novo.titulo?.replace(/\.\.\.$/, '…') || fileName.replace(/\.(xlsx|xls|csv)$/i, '');
  const f = { driver, fileName, causas: novo.causas, semRespostas: novo.semRespostas, amostraGrupo: novo.amostraGrupo, periodo: novo.periodo, filtros: novo.filtros };
  const i = ficheiros.findIndex(x => x.driver === driver);
  if (i >= 0) ficheiros[i] = f; else ficheiros.push(f);
  return { ficheiros, periodo: ficheiros[0].periodo, filtros: ficheiros[0].filtros };
}

// Todas as causas de todos os drivers, com o peso calculado sobre o total de menções
function todas(rec) {
  const lista = rec.data.ficheiros.flatMap(f => comZeros(f.causas, f.semRespostas, {}).map(c => ({ ...c, driver: f.driver })));
  return enriquecerCausas(lista);
}

function drivers(rec, meta) {
  return rec.data.ficheiros.map(f => {
    const g = npsGlobal(f);
    const mencoes = f.causas.reduce((a, c) => a + c.total, 0);
    return { nome: f.driver, nps: g?.nps ?? null, respondentes: g?.total ?? null, mencoes, abaixo: g ? g.nps < meta : false };
  });
}

export function chips(rec) {
  return { respostas: todas(rec).reduce((a, c) => a + c.total, 0), rotulo: 'Menções' };
}

// Resumo com as mesmas regras da tab de causa raiz, mais o driver com pior NPS
export function resumo(rec, meta) {
  const cs = todas(rec);
  const dz = destaques(cs);
  const ds = drivers(rec, meta).filter(d => d.nps != null).sort((a, b) => a.nps - b.nps);
  const mencoes = cs.reduce((a, c) => a + c.total, 0);
  const blocos = [];
  if (dz.maisReferida) blocos.push({ titulo: 'Amostra e volume', texto: `<strong>${fmt(mencoes)}</strong> menções em <strong>${rec.data.ficheiros.length}</strong> ${rec.data.ficheiros.length === 1 ? 'driver' : 'drivers'}. A causa mais referida é <strong>${esc(dz.maisReferida.nome)}</strong> (${esc(dz.maisReferida.driver)}), com <strong>${fmt(dz.maisReferida.total)}</strong> menções.` });
  if (dz.pior) blocos.push({ titulo: 'Maior ponto de detração', tom: 'bad', texto: `A causa com pior NPS é <strong>${esc(dz.pior.nome)}</strong> (${esc(dz.pior.driver)}), com NPS de <strong>${sinal(dz.pior.nps)}</strong> e ${fmt(dz.pior.pctD)}% de detratores.` });
  if (ds.length > 1) blocos.push({ titulo: 'Driver com pior NPS', tom: ds[0].nps < meta ? 'bad' : '', texto: `<strong>${esc(ds[0].nome)}</strong> tem o NPS mais baixo entre quem respondeu ao driver: <strong>${sinal(ds[0].nps)}</strong>${ds[0].nps < meta ? `, abaixo da meta de ${meta}` : ''}.` });
  const notas = ['Uma pessoa pode escolher várias causas: os números são menções, não pessoas.'];
  const periodos = new Set(rec.data.ficheiros.map(f => formatarPeriodo(f.periodo)));
  if (periodos.size > 1) notas.push(`Atenção: os Excel têm períodos diferentes (${[...periodos].join('; ')}).`);
  const pequenas = cs.filter(c => c.amostraPequena && !c.semSugestao).length;
  if (pequenas) notas.push(`${pequenas === 1 ? 'Uma causa tem' : `${pequenas} causas têm`} menos de 30 menções e não entra${pequenas === 1 ? '' : 'm'} nos destaques.`);
  return { blocos, notas };
}

// Bloco lateral: um ficheiro por driver, cada um com botão para tirar
export function lado(rec, meta) {
  const ds = drivers(rec, meta);
  return `<div class="side-block">
    <h3 class="sec-title">Drivers carregados ${def('driver')}</h3>
    <ul class="drv-lista">${rec.data.ficheiros.map((f, i) => `
      <li><div><b>${esc(f.driver)}</b><span>${esc(f.fileName)} · ${esc(formatarPeriodo(f.periodo))}</span></div>
        ${ds[i].nps != null ? `<span class="badge ${ds[i].abaixo ? 'bad' : 'good'} num" title="NPS de quem respondeu a este driver">${fmt(ds[i].nps)}</span>` : ''}
        <button type="button" class="btn btn-ghost btn-xs" data-act="rm-ficheiro" data-i="${i}" aria-label="Tirar ${esc(f.driver)}" title="Tirar este driver">${icon('x')}</button></li>`).join('')}
    </ul>
    <div class="file-actions">
      <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Adicionar drivers</button>
      <button class="btn btn-danger-ghost btn-sm" data-act="clear" title="Apaga todos os ficheiros desta tab">${icon('trash')} Apagar tudo</button>
    </div>
  </div>`;
}

export function html(rec, meta) {
  const cs = todas(rec);
  const ds = drivers(rec, meta);
  const mencoes = cs.reduce((a, c) => a + c.total, 0);
  const abaixo = causasFiaveis(cs).filter(c => c.nps < meta);
  const dAbaixo = ds.filter(d => d.abaixo);
  const kpi = (rot, val, det, k, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}"><span class="kl">${rot} ${k}</span><span class="kv num">${val}</span><span class="kd">${det}</span></div>`;
  const opcoes = ds.map(d => `<option>${esc(d.nome)}</option>`).join('');
  return `
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${kpi('Drivers', fmt(ds.length), dAbaixo.length ? `${dAbaixo.length} abaixo da meta` : `meta ${meta}`, def('driver'), true)}
      ${kpi('Causas com menções', `${fmt(cs.filter(c => !c.zero).length)}/${fmt(cs.length)}`, 'opções em todos os drivers', def('causa'))}
      ${kpi('Menções', fmt(mencoes), 'uma pessoa pode escolher várias', def('mencoes'))}
      ${kpi('Causas abaixo da meta', fmt(abaixo.length), 'com 30 ou mais menções', def('meta'))}
    </div>
    ${destaquesHtml(destaques(cs), true)}
    <section class="card" aria-labelledby="h-drv">
      <div class="card-head"><h3 id="h-drv">NPS por driver ${info('NPS por driver', 'NPS de quem respondeu à pergunta de causa raiz de cada driver, a partir do tamanho de cada grupo (Sample Size) no Excel. Barras a vermelho estão abaixo da meta.')}</h3>${btnPptx('drv')}</div>
      <div id="ch-drv" class="chart" role="img" aria-label="NPS por driver face à meta"></div>
    </section>
    <section class="card" aria-labelledby="h-top">
      <div class="card-head">
        <h3 id="h-top">Causas que mais pesam ${info('Causas que mais pesam', 'As 12 causas com mais menções, de todos os drivers. Cada barra mostra quantos detratores, neutros e promotores a escolheram.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:var(--detractor)"></i>Detratores</span><span><i style="background:var(--passive)"></i>Neutros</span><span><i style="background:var(--promoter)"></i>Promotores</span></div>
        ${btnPptx('top')}
      </div>
      <div id="ch-top" class="chart" role="img" aria-label="As 12 causas com mais menções"></div>
    </section>
    <section class="card" aria-labelledby="h-tabm" style="padding-bottom:16px">
      <div class="card-head" style="margin-bottom:10px">
        <h3 id="h-tabm">Tabela única de causas ${def('peso')}</h3>
        <div class="tbl-tools" style="margin-left:auto">
          <label class="select"><span class="sr-only">Driver</span><select id="f-driver"><option value="">Todos os drivers</option>${opcoes}</select></label>
          <label class="search">${icon('search')}<span class="sr-only">Procurar causa</span><input id="q-causa" type="search" placeholder="Procurar causa"></label>
          ${btnPptx('tab')}
        </div>
      </div>
      <div class="tbl-wrap"><table class="tbl" id="tbl-causas">
        <thead><tr>
          <th scope="col"><button data-sort="nome">Causa ${icon('sort')}</button></th>
          <th scope="col"><button data-sort="driver">Driver ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="nps">NPS ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="total">Menções ${icon('sort')}</button></th>
          <th scope="col">Detratores · Neutros · Promotores</th>
          <th scope="col" class="r"><button data-sort="quota">% das respostas ${icon('sort')}</button></th>
          <th scope="col" class="r">Impacto no NPS</th>
        </tr></thead>
        <tbody></tbody>
      </table></div>
    </section>`;
}

const curto = (s, n = 34) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function mount(rec, brand, meta) {
  const cs = todas(rec);
  const ds = drivers(rec, meta).filter(d => d.nps != null);
  const dz = destaques(cs);
  const b = base(brand);

  desenhar(document.getElementById('ch-drv'), junta(b, {
    grid: { left: 8, right: 40, top: 10, bottom: 4, containLabel: true },
    tooltip: { trigger: 'item', formatter: p => `<b>${esc(ds[p.dataIndex].nome)}</b><br>NPS ${fmt(p.value)} · ${fmt(ds[p.dataIndex].respondentes)} pessoas` },
    xAxis: { type: 'value', min: Math.min(0, ...ds.map(d => d.nps)) - 10, max: 100, ...EIXO_VAL },
    yAxis: { type: 'category', inverse: true, data: ds.map(d => d.nome), ...EIXO_CAT, axisLabel: { ...EIXO_CAT.axisLabel, width: 240, overflow: 'truncate', color: '#1a1a1a', fontWeight: 400 } },
    series: [{ type: 'bar', barWidth: '58%',
      data: ds.map(d => ({ value: d.nps, itemStyle: { color: comBrilho(d.abaixo ? CORES.det : CORES.pro, true), borderRadius: [4, 10, 10, 4] } })),
      label: { show: true, position: 'right', color: '#1a1a1a', fontSize: 12, fontWeight: 700, formatter: p => fmt(p.value) },
      markLine: { symbol: 'none', silent: true, lineStyle: { color: CORES.ama, type: [5, 4], width: 1.5 }, label: { formatter: `Meta ${meta}`, position: 'end', ...ETIQ_META }, data: [{ xAxis: meta }] } }],
  }), Math.max(200, ds.length * 46 + 70));

  const top = [...cs].filter(c => !c.zero && !c.semSugestao).sort((a, c) => c.total - a.total).slice(0, 12);
  const cor3 = [CORES.det, CORES.neu, CORES.pro];
  desenhar(document.getElementById('ch-top'), junta(b, {
    grid: { left: 8, right: 16, top: 6, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.04)' } } },
    xAxis: { type: 'value', ...EIXO_VAL, axisLabel: { ...EIXO_VAL.axisLabel, formatter: v => fmt(v) } },
    yAxis: { type: 'category', inverse: true, data: top.map(c => `{n|${curto(c.nome)}}\n{m|${c.driver} · NPS ${fmt(c.nps)}}`), ...EIXO_CAT,
      axisLabel: { margin: 12, align: 'right', rich: { n: { fontSize: 12, color: '#1a1a1a', lineHeight: 16 }, m: { fontSize: 12, color: '#6b6b6b', lineHeight: 15 } } } },
    series: ['Detratores', 'Neutros', 'Promotores'].map((nome, k) => ({
      name: nome, type: 'bar', stack: 't', barWidth: '58%',
      data: top.map(c => [c.d, c.n, c.p][k]),
      itemStyle: { color: comBrilho(cor3[k], true), borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    })),
  }), Math.max(220, top.length * 48 + 60));

  // Tabela: filtrar por driver, procurar e ordenar
  const tbody = document.querySelector('#tbl-causas tbody');
  let chave = 'total', dir = -1, q = '', drv = '';
  const extra = c => `<td>${esc(c.driver)}</td>`;
  const pintar = () => {
    const lista = cs.filter(c => (!drv || c.driver === drv) && c.nome.toLowerCase().includes(q)).sort((a, c2) => {
      if (a.zero !== c2.zero) return a.zero - c2.zero;
      const x = a[chave], y = c2[chave];
      return (typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y) * dir;
    });
    tbody.innerHTML = linhas(lista, meta, dz.pior, extra);
    document.querySelectorAll('#tbl-causas th').forEach(th => th.removeAttribute('aria-sort'));
    document.querySelector(`#tbl-causas [data-sort="${chave}"]`)?.closest('th').setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
  };
  document.querySelectorAll('#tbl-causas [data-sort]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.sort;
    dir = k === chave ? -dir : (k === 'nome' || k === 'driver' ? 1 : -1);
    chave = k;
    pintar();
  }));
  document.getElementById('q-causa').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); pintar(); });
  document.getElementById('f-driver').addEventListener('change', e => { drv = e.target.value; pintar(); });
  pintar();
}

export function exportar(rec, brand, meta) {
  const cs = todas(rec);
  const ds = drivers(rec, meta).filter(d => d.nps != null);
  const b = baseGrafico(brand);
  const abaixo = causasFiaveis(cs).filter(c => c.nps < meta);
  const top = [...cs].filter(c => !c.zero && !c.semSugestao).sort((a, c) => c.total - a.total).slice(0, 12);
  return {
    kpis: [
      { rot: 'Drivers', val: fmt(rec.data.ficheiros.length), det: `meta ${meta}` },
      { rot: 'Causas com menções', val: `${fmt(cs.filter(c => !c.zero).length)}/${fmt(cs.length)}`, det: 'opções em todos os drivers' },
      { rot: 'Menções', val: fmt(cs.reduce((a, c) => a + c.total, 0)), det: 'uma pessoa pode escolher várias' },
      { rot: 'Causas abaixo da meta', val: fmt(abaixo.length), det: 'com 30 ou mais menções' },
    ],
    resumo: resumo(rec, meta).blocos.map(x => `${x.titulo}: ${textoDe(x.texto)}`),
    filtros: rec.data.filtros,
    graficos: [
      { id: 'drv', titulo: 'NPS por driver', desenhar: (s, p) => s.addChart(p.ChartType.bar, [
        { name: 'NPS', labels: ds.map(d => d.nome), values: ds.map(d => d.nps) },
        { name: 'Meta', labels: ds.map(d => d.nome), values: ds.map(() => meta) },
      ], { ...b, barDir: 'bar', barGrouping: 'clustered', catAxisOrientation: 'maxMin', chartColors: [hex(CORES.pro), 'D6DDE3'], showValue: true, valAxisMinVal: -20, valAxisMaxVal: 100 }) },
      { id: 'top', titulo: 'Causas que mais pesam', desenhar: (s, p) => s.addChart(p.ChartType.bar, [
        { name: 'Detratores', labels: top.map(c => `${c.nome} (${c.driver})`), values: top.map(c => c.d) },
        { name: 'Neutros', labels: top.map(c => `${c.nome} (${c.driver})`), values: top.map(c => c.n) },
        { name: 'Promotores', labels: top.map(c => `${c.nome} (${c.driver})`), values: top.map(c => c.p) },
      ], { ...b, barDir: 'bar', barGrouping: 'stacked', catAxisOrientation: 'maxMin', chartColors: [hex(CORES.det), hex(CORES.neu), hex(CORES.pro)], catAxisLabelFontSize: 10 }) },
      { id: 'tab', titulo: 'Tabela única de causas', desenhar: tabelaPptx(b, brand, [...cs].sort((a, c) => c.total - a.total), meta, true) },
    ],
  };
}

export const importar = {
  titulo: 'Como importar os dados de cada driver',
  texto: 'No Stats iQ, para cada driver: selecione a variável principal "(Group) NPS" e, como variável secundária, a Causa Raiz desse driver. Execute a opção "Relate" e exporte a tabela para Excel. Aqui pode carregar os Excel de todos os drivers de uma vez.',
};
