// Marcas, cores e tabs do Stater.
// Cores e fontes vêm do "Design System @ Grupo Brisa" (Figma), coleções Base/Brand de cada marca.
// Colibri e Nedlinq não têm modo próprio no DS: ver notas em cada uma.

export const GROUP = {
  id: 'grupo',
  name: 'Grupo Brisa',
  // Modo "Brisa" do DS. A fonte oficial é Prometo (licenciada); no protótipo usa-se IBM Plex Sans.
  font: '"IBM Plex Sans"',
  colors: { darkest: '#074257', dark: '#0f6381', main: '#14789c', light: '#8fd2f8', lightest: '#c5e5fb', on: '#ffffff', ink: '#0f6381' },
  chart: ['#14789c', '#8fd2f8', '#074257', '#0f6381', '#c5e5fb'],
};

// Tabs: os nomes são os do Stater v10. `live` = funciona no protótipo.
// `off` = tab desativada (cinzenta no menu, não abre); o texto diz porquê.
export const BRANDS = [
  {
    id: 'colibri', name: 'Colibri', icon: 'colibri',
    // Sem modo no DS: usa as cores "Colibri" dos serviços Via Verde (#005555, #b62454, #f7bdbe).
    font: '"Noto Sans"',
    colors: { darkest: '#002b2b', dark: '#004040', main: '#005555', light: '#5fa8a3', lightest: '#d3ebe8', on: '#ffffff', ink: '#005555', accent: '#b62454', accentLight: '#f7bdbe' },
    chart: ['#005555', '#5fa8a3', '#b62454', '#f7bdbe', '#002b2b'],
    target: 60,
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars', live: true },
      { id: 'drivers', name: 'Média da Recomendação Drivers (Text iQ)', icon: 'tag' },
      { id: 'subtopics', name: 'Média da Recomendação Subtopics (Text iQ)', icon: 'tags' },
      { id: 'csat', name: "Overview CSAT's", icon: 'smile' },
      { id: 'driver-relate', name: 'NPS por Driver', icon: 'wheel' },
      { id: 'causa-raiz', name: 'NPS por Causa Raiz', icon: 'search', live: true },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag' },
      { id: 'molho', name: 'Todos ao molho', icon: 'layers' },
    ],
  },
  {
    id: 'nedlinq', name: 'Nedlinq', icon: 'nedlinq',
    // Modo "Nedlinq" existe no DS mas está vazio: usa a identidade Brisa até chegar o DS da Nedlinq.
    font: '"IBM Plex Sans"',
    colors: { darkest: '#074257', dark: '#0f6381', main: '#14789c', light: '#8fd2f8', lightest: '#c5e5fb', on: '#ffffff', ink: '#0f6381' },
    chart: ['#14789c', '#8fd2f8', '#074257', '#0f6381', '#c5e5fb'],
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars' },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag', off: 'Ainda não há Text iQ na Nedlinq.' },
      { id: 'causas', name: 'NPS por Causa Raiz (Text iQ)', icon: 'search', off: 'Ainda não há Text iQ na Nedlinq.' },
    ],
  },
  {
    id: 'controlauto', name: 'Controlauto', icon: 'controlauto',
    font: '"Raleway"',
    colors: { darkest: '#5f1c04', dark: '#a13a13', main: '#f96730', light: '#fc9771', lightest: '#febfa7', on: '#1a1a1a', ink: '#a13a13' },
    chart: ['#f96730', '#fc9771', '#a13a13', '#5f1c04', '#febfa7'],
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars', live: true },
      { id: 'inspecao', name: 'NPS x Resultado Inspeção', icon: 'check' },
      { id: 'driver-relate', name: 'NPS por Driver', icon: 'wheel' },
      { id: 'causa-raiz', name: 'NPS por Causa Raiz', icon: 'search' },
      { id: 'nps-ces', name: 'NPS x CES', icon: 'gauge' },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag' },
      { id: 'causas', name: 'NPS por Causa Raiz (Text iQ)', icon: 'search' },
    ],
  },
  {
    id: 'controlautoitv', name: 'Controlauto ITV', icon: 'itv',
    font: '"Raleway"',
    colors: { darkest: '#4b3c14', dark: '#b39321', main: '#ffd552', light: '#ffe4a9', lightest: '#ffeecb', on: '#1a1a1a', ink: '#7a6416' },
    chart: ['#e0b52e', '#ffd552', '#4b3c14', '#b39321', '#ffe4a9'],
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars', live: true },
      { id: 'inspecao', name: 'NPS x Resultado Inspeção', icon: 'check' },
      { id: 'segmento', name: 'Segmento', icon: 'pie' },
      { id: 'driver-relate', name: 'NPS por Driver', icon: 'wheel' },
      { id: 'causa-raiz', name: 'NPS por Causa Raiz', icon: 'search' },
      { id: 'nps-csat', name: 'NPS x CSAT', icon: 'smile' },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag', off: 'Ainda não há Text iQ na Controlauto ITV.' },
      { id: 'causas', name: 'NPS por Causa Raiz (Text iQ)', icon: 'search', off: 'Ainda não há Text iQ na Controlauto ITV.' },
    ],
  },
  {
    id: 'brisaautoestradas', name: 'Brisa Autoestradas', icon: 'road',
    // Modo "Brisa AE" do DS: mesma cor da Brisa, fonte IBM Plex Sans.
    font: '"IBM Plex Sans"',
    colors: { darkest: '#074257', dark: '#0f6381', main: '#14789c', light: '#8fd2f8', lightest: '#c5e5fb', on: '#ffffff', ink: '#0f6381' },
    chart: ['#14789c', '#8fd2f8', '#074257', '#0f6381', '#c5e5fb'],
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars', live: true },
      { id: 'driver-relate', name: 'NPS por Driver', icon: 'wheel' },
      { id: 'causa-raiz', name: 'NPS por Causa Raiz', icon: 'search' },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag' },
      { id: 'causas', name: 'NPS por Causa Raiz (Text iQ)', icon: 'search' },
      { id: 'csat', name: "Overview CSAT's", icon: 'smile' },
    ],
  },
  {
    id: 'viaverde', name: 'Via Verde', icon: 'viaverde',
    font: '"Noto Sans"',
    colors: { darkest: '#004921', dark: '#007735', main: '#008635', light: '#67e982', lightest: '#bffcc8', on: '#ffffff', ink: '#007735' },
    chart: ['#008635', '#67e982', '#004921', '#d98e69', '#bffcc8'],
    tabs: [
      { id: 'nps', name: 'NPS', icon: 'bars', live: true },
      { id: 'topics', name: 'NPS por Topics (Text iQ)', icon: 'tag' },
      { id: 'causas', name: 'NPS por Causa Raiz (Text iQ)', icon: 'search' },
      { id: 'ces', name: 'CES', icon: 'gauge' },
    ],
  },
];

// Ordem das marcas no menu, na Overview e no gráfico (pedida pelo Gonçalo)
const ORDEM = ["brisaautoestradas", "viaverde", "colibri", "controlauto", "controlautoitv", "nedlinq"];
BRANDS.sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id));

export const brandById = id => BRANDS.find(b => b.id === id);

// Aplica a identidade de uma marca (ou do grupo) às variáveis CSS.
export function applyTheme(el, brand) {
  const c = brand.colors;
  const s = el.style;
  s.setProperty('--brand-darkest', c.darkest);
  s.setProperty('--brand-dark', c.dark);
  s.setProperty('--brand', c.main);
  s.setProperty('--brand-light', c.light);
  s.setProperty('--brand-lightest', c.lightest);
  s.setProperty('--brand-on', c.on);
  s.setProperty('--brand-ink', c.ink);
  s.setProperty('--font-brand', `${brand.font}, "Noto Sans", system-ui, sans-serif`);
}
