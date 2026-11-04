// Overview do Grupo Brisa: cartões por marca, gráfico NPS vs objetivo e edição dos objetivos
import { BRANDS, GROUP } from './brands.js?v=20261104-1215';
import { icon } from './icons.js?v=20261104-1215';
import { logo } from './logos.js?v=20261104-1215';
import { esc, info, def, toast } from './ui.js?v=20261104-1215';
import { formatarPeriodo, formatarData } from './excel.js?v=20261104-1215';
import { resumoNps, fmt, sinal, LIMITES, CORES, corMeta } from './stats.js?v=20261104-1215';
import { base, junta, desenhar, comBrilho, EIXO_CAT, EIXO_VAL } from './charts.js?v=20261104-1215';
import { store, meta, dataMetas, guardarMetas } from './store.js?v=20261104-1215';
import { ativa } from './analises.js?v=20261104-1215';
import { tileVars } from './layout.js?v=20261104-1215';
import { menuExportar } from './painel.js?v=20261104-1215';

// Janela "Objetivos de NPS". depois() corre quando se guarda.
export function editarMetas(depois) {
  const d = document.createElement('dialog');
  d.className = 'dlg-metas';
  d.innerHTML = `<form method="dialog">
    <h3>Objetivos de NPS</h3>
    <p>NPS que cada marca quer atingir, de −100 a 100. É usado na Overview, no medidor e no resumo da tab NPS e na tab Causa Raiz.</p>
    <div class="metas-lista">${BRANDS.map(b => `
      <label class="meta-linha"><span class="tile mark">${logo(b.icon)}</span><span>${esc(b.name)}</span>
        <input name="${b.id}" type="number" min="-100" max="100" step="1" required value="${meta(b.id)}"></label>`).join('')}
    </div>
    <div class="row"><button class="btn btn-secondary" value="no" formnovalidate>Cancelar</button><button class="btn btn-primary" value="yes">Guardar objetivos</button></div>
  </form>`;
  document.body.appendChild(d);
  // Enter num campo guarda (sem isto, o Enter carregava no primeiro botão, que é Cancelar)
  d.querySelector('form').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (d.querySelector('form').reportValidity()) d.close('yes');
  });
  d.addEventListener('close', () => {
    if (d.returnValue === 'yes') {
      guardarMetas(Object.fromEntries(new FormData(d.querySelector('form'))));
      toast('Objetivos atualizados com sucesso.', 'ok');
      depois?.();
    }
    d.remove();
  });
  d.showModal();
}

// NPS de cada marca (da tab NPS) e o seu objetivo. Também alimenta o PowerPoint da Overview.
export function dadosOverview() {
  return BRANDS.map(b => {
    const rec = ativa(b, b.tabs[0]) ? store.get(b.id, 'nps') : null;
    const vivas = b.tabs.filter(t => ativa(b, t)).length;
    return { b, rec, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id), vivas };
  });
}

export function overview() {
  const dados = dadosOverview();
  const comDados = dados.filter(d => d.r);
  const totalResp = comDados.reduce((a, d) => a + d.r.total, 0);
  return `
    <section class="ov-hero">
      <span class="ov-blob o" aria-hidden="true"></span><span class="ov-blob l" aria-hidden="true"></span><span class="ov-blob g" aria-hidden="true"></span><span class="ov-blob c" aria-hidden="true"></span>
      <div class="ov-txt">
        <h1>Overview do Grupo Brisa</h1>
        <p>O NPS de cada marca face ao seu objetivo. Os números vêm da tab NPS de cada marca; os objetivos definem-se aqui.</p>
      </div>
      <img class="ov-logo" src="assets/grupo-brisa-branco.png" alt="Grupo Brisa" width="640" height="498">
      <span class="ov-faixa" aria-hidden="true"></span>
    </section>
    <div class="ov-bar">
      <h2>Marcas</h2>
      <span class="muted">${comDados.length} de ${BRANDS.length} com dados${totalResp ? ` · ${fmt(totalResp)} respostas` : ''}</span>
      <span class="sep"></span>
      ${dataMetas() ? `<span class="muted">Objetivos atualizados a ${formatarData(dataMetas())}</span>` : ''}
      <button class="btn btn-secondary btn-sm" data-act="metas">${icon('pencil')} Editar objetivos</button>
      ${menuExportar()}
    </div>
    <div class="ov-grid">${dados.map(({ b, rec, r, m, vivas }) => `
      <div class="ov-card" style="${tileVars(b)};--font-b:${b.font}, 'Noto Sans', sans-serif">
        <div class="top"><span class="tile mark">${logo(b.icon)}</span><b>${esc(b.name)}</b>
          ${r ? `<span class="badge ${r.nps >= m ? 'good' : 'bad'}" title="NPS ${fmt(r.nps)} menos o objetivo ${m} = ${sinal(r.nps - m)}">${sinal(r.nps - m)} vs objetivo</span>` : '<span class="badge">Sem dados</span>'}</div>
        ${r ? `<div class="val"><b class="num">${fmt(r.nps)}</b><span class="muted">NPS · ${fmt(r.total)} respostas</span>${info(`NPS da ${b.name}`, `NPS = ${fmt(r.pctP, 1)}% promotores − ${fmt(r.pctD, 1)}% detratores = ${fmt(r.nps)}. Das ${fmt(r.total)} respostas: ${fmt(r.d)} detratores (0 a 6), ${fmt(r.n)} neutros (7 e 8) e ${fmt(r.p)} promotores (9 e 10). Nota média ${fmt(r.media, 1)} em 10. Objetivo ${m}: ${r.nps >= m ? `${fmt(r.nps - m)} pontos acima` : `${fmt(m - r.nps)} pontos abaixo`}. Período do Excel: ${formatarPeriodo(rec.data.periodo)}. Vem da tab NPS da marca.`)}</div>
          <div class="compo" style="height:10px" aria-hidden="true"><div class="d" style="flex:${r.pctD}"></div><div class="n" style="flex:${r.pctN}"></div><div class="p" style="flex:${r.pctP}"></div></div>
          <div class="ov-dnp num"><span><i class="d"></i>Detratores ${fmt(r.pctD)}%</span><span><i class="n"></i>Neutros ${fmt(r.pctN)}%</span><span><i class="p"></i>Promotores ${fmt(r.pctP)}%</span></div>
          <div class="ov-info">
            <span>${icon('calendar')}<b>${esc(formatarPeriodo(rec.data.periodo))}</b></span>
            <span>${icon('star')}Nota média <b class="num">${fmt(r.media, 1)}</b> / 10</span>
          </div>
          ${r.total < LIMITES.poucasRespostas ? `<div class="badge mid">Poucas respostas ${def('amostra')}</div>` : ''}
          ${rec.exemplo ? '<div class="muted">Dados de exemplo</div>' : ''}`
        : `<div class="wait">${vivas ? 'A aguardar dados da tab NPS' : 'NPS ainda sem acesso'}</div>`}
      </div>`).join('')}
    </div>
    <section class="card" style="background:#fff" aria-labelledby="h-ov">
      <div class="card-head"><h3 id="h-ov">NPS vs objetivo por marca ${info('NPS vs objetivo por marca', `Duas barras por marca. A da esquerda é o NPS da tab NPS da marca: verde se está no objetivo ou acima, vermelha se está abaixo. A da direita, cinzenta, é o objetivo definido em Editar objetivos. O eixo vai de −100 a 100, com a linha do 0 a cheio. ${dados.filter(d => !d.r).length ? `Sem Excel de NPS, só aparece o objetivo: ${dados.filter(d => !d.r).map(d => d.b.name).join(', ')}.` : ''} Passa o rato por uma marca para ver os dois valores.`)}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:${CORES.pro}"></i>NPS no objetivo ou acima</span><span><i style="background:${CORES.det}"></i>NPS abaixo do objetivo</span><span><i style="background:${CORES.meta}"></i>Objetivo</span></div></div>
      <div id="ch-ov" class="chart"></div>
      <div class="ov-eixo" id="ov-eixo" aria-hidden="true">${BRANDS.map(b => `<span>${esc(b.name)}</span>`).join('')}</div>
    </section>`;
}

// Logótipo de cada marca dentro da barra do NPS (círculo branco), e a linha de nomes alinhada com as barras
const OV_GRID = { left: 52, right: 16, top: 30, bottom: 8 };
function logosNasBarras(g, dados) {
  if (g.isDisposed()) return;
  const el = g.getDom();
  if (!el || !el.isConnected) return;
  const e = document.getElementById('ov-eixo');
  if (e) { e.style.marginLeft = `${OV_GRID.left}px`; e.style.width = `${el.clientWidth - OV_GRID.left - OV_GRID.right}px`; }
  el.querySelectorAll('.ov-bar-logo').forEach(n => n.remove());
  const banda = (el.clientWidth - OV_GRID.left - OV_GRID.right) / dados.length;
  const larg = banda * 0.62 / 2 - 4;
  dados.forEach((d, i) => {
    if (!d.r || d.r.nps < 12) return;
    const [x, yTopo] = g.convertToPixel({ gridIndex: 0 }, [i, d.r.nps]);
    const [, yZero] = g.convertToPixel({ gridIndex: 0 }, [i, 0]);
    const alt = yZero - yTopo;
    const tam = Math.min(larg - 10, 56, alt - 12);
    if (tam < 18) return;
    const centro = x - larg / 2 - 2;
    const s = document.createElement('span');
    s.className = 'ov-bar-logo';
    s.innerHTML = logo(d.b.icon);
    Object.assign(s.style, { width: `${tam}px`, height: `${tam}px`, padding: `${Math.round(tam * 0.18)}px`, left: `${centro - tam / 2}px`, top: `${yZero - tam - 8}px` });
    el.appendChild(s);
  });
}

export function montarOverview() {
  const dados = BRANDS.map(b => { const rec = store.get(b.id, 'nps'); return { b, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id) }; });
  // Duas barras por marca: NPS (verde no objetivo ou acima, vermelho abaixo) e objetivo (cinzento claro), lado a lado
  const g = desenhar(document.getElementById('ch-ov'), junta(base(GROUP), {
    grid: { ...OV_GRID },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,.035)' } }, formatter: p => { const d = dados[p[0].dataIndex];
      const linha = (cor, rot, v) => `<div class="ov-tt-l"><i style="background:${cor}"></i>${rot}<b>${v == null ? 'sem dados' : fmt(v)}</b></div>`;
      return `<div class="ov-tt"><div class="ov-tt-t">${esc(d.b.name)}</div>${linha(d.r ? corMeta(d.r.nps, d.m) : CORES.meta, 'NPS', d.r ? d.r.nps : null)}${linha(CORES.meta, 'Objetivo', d.m)}</div>`; } },
    // Os nomes saem do eixo e vão para a linha HTML #ov-eixo
    xAxis: { type: 'category', data: dados.map(d => d.b.name), ...EIXO_CAT, axisLabel: { show: false } },
    yAxis: { type: 'value', min: -100, max: 100, interval: 20, ...EIXO_VAL },
    series: [
      { name: 'NPS', type: 'bar', barGap: '8%', barWidth: '31%',
        data: dados.map(d => ({ value: d.r ? d.r.nps : null, itemStyle: { color: comBrilho(d.r ? corMeta(d.r.nps, d.m) : CORES.meta), borderRadius: [10, 10, 4, 4] } })),
        label: { show: true, position: 'top', distance: 6, color: '#1a1a1a', fontSize: 12, fontWeight: 700, formatter: p => (p.value == null ? '' : fmt(p.value)) },
        markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: '#9a9a9a', type: 'solid', width: 1 }, data: [{ yAxis: 0 }] } },
      { name: 'Objetivo', type: 'bar', barWidth: '31%',
        data: dados.map(d => ({ value: d.m, itemStyle: { color: comBrilho(CORES.meta), borderRadius: [10, 10, 4, 4] } })),
        label: { show: true, position: 'top', distance: 6, color: '#5f5f5f', fontSize: 12, fontWeight: 700, formatter: p => fmt(p.value) } },
    ],
  }), 400);
  if (!g) return;
  const pos = () => logosNasBarras(g, dados);
  g.on('finished', pos);
  g.on('rendered', () => requestAnimationFrame(pos));
}
