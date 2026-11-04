// Dados fictícios para quem abre o protótipo sem Excel. Não são dados reais.
// Período e filtro dos exemplos novos
const P = { periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' }, filtros: [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }] };

export const exemplos = {
  nps: {
    fileName: 'Exemplo – NPS.xlsx',
    data: {
      contagens: [310, 160, 170, 180, 150, 330, 420, 760, 1840, 2310, 8070],
      periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' },
      filtros: [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }],
    },
  },
  'causa-raiz': {
    fileName: 'Exemplo – NPS por Causa Raiz.xlsx',
    data: {
      titulo: 'Exemplo de pergunta de causa raiz',
      causas: [
        { nome: 'Tempo de espera', d: 96, n: 140, p: 310 },
        { nome: 'Limpeza das instalações', d: 41, n: 66, p: 248 },
        { nome: 'Preço dos produtos', d: 88, n: 71, p: 102 },
        { nome: 'Simpatia da equipa', d: 9, n: 30, p: 196 },
        { nome: 'Variedade da oferta', d: 22, n: 39, p: 98 },
        { nome: 'Estacionamento', d: 18, n: 25, p: 61 },
        { nome: 'Sinalização', d: 4, n: 7, p: 12 },
      ].map(c => ({ ...c, total: c.d + c.n + c.p })),
      semRespostas: ['Meios de pagamento'],
      amostraGrupo: { d: 1300, n: 2100, p: 8600 },
      periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' },
      filtros: [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }],
    },
  },
  molho: {
    fileName: 'Exemplo – 3 drivers',
    data: (() => {
      const periodo = { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' };
      const filtros = [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }];
      const drv = (driver, amostraGrupo, causas) => ({ driver, fileName: `Exemplo – ${driver}.xlsx`, periodo, filtros, amostraGrupo, semRespostas: [],
        causas: causas.map(([nome, d, n, p]) => ({ nome, d, n, p, total: d + n + p })) });
      const ficheiros = [
        drv('Chegada', { d: 420, n: 610, p: 1900 }, [['Tempo de espera', 96, 140, 310], ['Estacionamento', 58, 45, 61], ['Sinalização', 4, 7, 12]]),
        drv('Atendimento', { d: 300, n: 520, p: 2200 }, [['Simpatia da equipa', 9, 30, 196], ['Rapidez no balcão', 77, 64, 90], ['Outra', 6, 4, 9]]),
        drv('Oferta', { d: 610, n: 540, p: 1300 }, [['Preço dos produtos', 188, 71, 102], ['Variedade da oferta', 22, 39, 98], ['Limpeza das instalações', 41, 66, 248]]),
      ];
      return { ficheiros, periodo, filtros };
    })(),
  },
  grupos: {
    fileName: 'Exemplo – NPS por grupo.xlsx',
    data: {
      grupos: [
        { nome: 'Chegada', d: 120, n: 340, p: 1240 },
        { nome: 'Atendimento', d: 260, n: 410, p: 980 },
        { nome: 'Pagamento', d: 310, n: 280, p: 520 },
        { nome: 'Instalações', d: 60, n: 150, p: 610 },
        { nome: 'Saída', d: 9, n: 8, p: 12 },
      ].map(c => ({ ...c, total: c.d + c.n + c.p })),
      semRespostas: [], multi: false, amostraGrupo: null, ...P,
    },
  },
  breakdown: {
    fileName: '3 Excels de exemplo',
    data: (() => {
      const g = (nome, d, n, p) => ({ nome, d, n, p, total: d + n + p });
      const f = (area, grupos) => ({ grupos, semRespostas: [], multi: false, amostraGrupo: null, ...P, filtros: [...P.filtros, { campo: 'Centro', valor: `igual a ${area}` }], fileName: `Exemplo – NPS por Driver – ${area}.xlsx`, area: { campo: 'Centro', valor: area } });
      const ficheiros = [
        f('Norte', [g('Chegada', 60, 170, 620), g('Atendimento', 130, 200, 490), g('Pagamento', 150, 140, 260), g('Instalações', 30, 75, 300)]),
        f('Centro', [g('Chegada', 40, 110, 420), g('Atendimento', 70, 150, 330), g('Pagamento', 120, 90, 180), g('Instalações', 20, 50, 210)]),
        f('Sul', [g('Chegada', 20, 60, 200), g('Atendimento', 60, 60, 160), g('Pagamento', 40, 50, 80), g('Instalações', 10, 25, 100), g('Saída', 4, 3, 6)]),
      ];
      return { ficheiros, sel: '*', periodo: P.periodo, filtros: P.filtros };
    })(),
  },
  textiq: {
    fileName: 'Exemplo – Text iQ.xlsx',
    data: (() => {
      const total = 12000, media = 8.3;
      const t = (nome, nC, mC) => ({ nome, nC, somaC: nC * mC, nU: total - nC, somaU: total * media - nC * mC });
      return { temas: [t('Preço', 2100, 7.1), t('Tempo de espera', 1300, 6.8), t('Simpatia', 900, 9.1), t('Limpeza', 640, 7.6), t('Estacionamento', 220, 7.9), t('Sinalização', 18, 7.0), t('Sem sugestões', 3100, 9.3)], total, media, ...P };
    })(),
  },
  ces: { fileName: 'Exemplo – CES.xlsx', data: { min: 1, max: 7, contagens: [410, 220, 260, 640, 900, 3900, 4100], ...P } },
  'csat-grupos': {
    fileName: 'Exemplo – 3 CSAT',
    data: (() => {
      const f = (atributo, d, n, p) => ({ atributo, fileName: `Exemplo – CSAT ${atributo}.xlsx`, porGrupo: { d, n, p }, ...P });
      const ficheiros = [
        f('Eficiência do serviço', { 5: 20, 6: 30, 7: 25, 8: 15 }, { 7: 40, 8: 90, 9: 60, 10: 30 }, { 8: 40, 9: 160, 10: 520 }),
        f('Simpatia', { 6: 15, 7: 30, 8: 30, 9: 15 }, { 8: 70, 9: 100, 10: 50 }, { 9: 120, 10: 600 }),
        f('Tempo de espera', { 2: 25, 3: 25, 4: 20, 5: 20 }, { 5: 50, 6: 70, 7: 60, 8: 40 }, { 7: 90, 8: 200, 9: 210, 10: 220 }),
      ];
      return { ficheiros, periodo: P.periodo, filtros: P.filtros };
    })(),
  },
  regressao: {
    fileName: 'Exemplo – Regressão CSAT.xlsx',
    data: { variaveis: [{ nome: 'Serviço', imp: 41, coef: 0.38 }, { nome: 'Instalações', imp: 34, coef: 0.31 }, { nome: 'Produtos', imp: 25, coef: 0.24 }], n: 1800, r2: 0.58, ...P },
  },
};
