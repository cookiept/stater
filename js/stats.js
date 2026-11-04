// Cores dos gráficos: as mesmas em todas as marcas (vermelho = detratores / abaixo da meta, cinzento = neutros, verde = promotores / na meta).
export const CORES = { det: '#db3a23', neu: '#c4c4c4', pro: '#22a03b', proClaro: '#bfe5c8', meta: '#d6dde3', ama: '#e0a400' };
// Cor pelo valor do NPS: negativo vermelho, 0 a 29 amarelo, 30 ou mais verde
export const corNps = n => (n < 0 ? CORES.det : n < 30 ? CORES.ama : CORES.pro);
export const corNpsClaro = n => (n < 0 ? '#f19a8c' : n < 30 ? '#f3cf6b' : '#7fd394');
export const corMeta = (nps, meta) => (nps >= meta ? CORES.pro : CORES.det);

// Contas do NPS: uma regra para todo o Stater.
// 0–6 detrator, 7–8 neutro, 9–10 promotor. NPS = %promotores − %detratores, calculado a partir das contagens e arredondado no fim.

export function resumoNps(contagens) {
  const total = contagens.reduce((a, b) => a + b, 0);
  const d = contagens.slice(0, 7).reduce((a, b) => a + b, 0);
  const n = contagens[7] + contagens[8];
  const p = contagens[9] + contagens[10];
  const media = contagens.reduce((a, c, i) => a + c * i, 0) / total;
  const variancia = total > 1 ? contagens.reduce((a, c, i) => a + c * (i - media) ** 2, 0) / (total - 1) : 0;
  let moda = 0;
  contagens.forEach((c, i) => { if (c > contagens[moda]) moda = i; });
  return {
    total, d, n, p,
    pctD: (d / total) * 100, pctN: (n / total) * 100, pctP: (p / total) * 100,
    nps: npsDe(d, p, total),
    media, dp: Math.sqrt(variancia), moda,
  };
}

export const npsDe = (d, p, total) => (total ? Math.round(((p - d) / total) * 100) : 0);

// Todas as linhas do Excel, incluindo as opções com 0 menções (vão para o fim)
export const comZeros = (causas, semRespostas = [], extra = {}) =>
  [...causas, ...semRespostas.map(nome => ({ nome, d: 0, n: 0, p: 0, total: 0, ...extra }))];

// Ordem: sempre da causa com mais menções para a com menos; as de 0 menções no fim
// base: o total de pessoas que responderam ao NPS. Em resposta múltipla, a % de cada opção é sobre essas pessoas
// (não sobre a soma das menções), por isso as % podem somar mais de 100%.
export function enriquecerCausas(causas, base = 0) {
  const totalGeral = base || causas.reduce((a, c) => a + c.total, 0);
  return causas.map(c => {
    const zero = c.total === 0;
    const quota = totalGeral ? (c.total / totalGeral) * 100 : 0;
    return {
      ...c,
      zero,
      nps: zero ? null : npsDe(c.d, c.p, c.total),
      pctD: zero ? 0 : (c.d / c.total) * 100, pctN: zero ? 0 : (c.n / c.total) * 100, pctP: zero ? 0 : (c.p / c.total) * 100,
      quota,
      impacto: zero ? '–' : quota >= 15 ? 'Alto' : quota >= 5 ? 'Médio' : 'Baixo',
      amostraPequena: !zero && c.total < 30,
      semSugestao: /sem sugest|^outr[oa]s?\b/i.test(c.nome),
    };
  }).sort((a, b) => (b.total - a.total) || a.nome.localeCompare(b.nome, 'pt'));
}

export const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const sinal = v => (v > 0 ? `+${fmt(v)}` : fmt(v));

// Limites para avisar que há poucas respostas (os números servem só como indicação)
export const LIMITES = { poucasRespostas: 100, amostraPequena: 30 };

// Causas que contam para destaques e alertas: sem "Outra"/"Sem sugestões" e com menções suficientes
export const causasFiaveis = cs => cs.filter(c => !c.zero && !c.semSugestao && !c.amostraPequena);

// Destaques de uma lista de causas já enriquecida: pior NPS, mais detratores e mais referida
export function destaques(cs) {
  const f = causasFiaveis(cs);
  const lista = f.length ? f : cs.filter(c => !c.zero && !c.semSugestao);
  if (!lista.length) return {};
  return {
    pior: [...lista].sort((a, b) => a.nps - b.nps)[0],
    maisDetratores: [...lista].sort((a, b) => b.d - a.d)[0],
    maisReferida: [...lista].sort((a, b) => b.total - a.total)[0],
  };
}
