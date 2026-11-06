// Menu lateral e barra de topo
import { BRANDS, GROUP } from './brands.js?v=20261106-1325';
import { icon } from './icons.js?v=20261106-1325';
import { logo } from './logos.js?v=20261106-1325';
import { esc } from './ui.js?v=20261106-1325';
import { formatarData } from './excel.js?v=20261106-1325';
import { store, abertas } from './store.js?v=20261106-1325';

export function tileVars(b) {
  return `--tile-bg:${b.colors.main};--tile-on:${b.colors.on};--tile-soft:${b.colors.lightest};--tile-ink:${b.colors.darkest}`;
}

export function sidebar({ brand, tab }) {
  const itens = BRANDS.map(b => {
    const atual = brand?.id === b.id;
    const aberta = abertas.has(b.id);
    const sub = aberta ? `<div class="sb-sub-nav" id="tabs-${b.id}">${b.tabs.map(t => t.off ? `
        <span class="sb-tab is-off" aria-disabled="true" tabindex="0" data-tip-title="Tab desativada" data-tip="${esc(t.off)}">${icon(t.icon)}<span class="lbl">${esc(t.name)}</span></span>` : `
        <a class="sb-tab" href="#/${b.id}/${t.id}" ${atual && tab?.id === t.id ? 'aria-current="page"' : ''}>${icon(t.icon)}<span class="lbl" title="${esc(t.name)}">${esc(t.name)}</span>${store.get(b.id, t.id) ? '<span class="dot" title="Com dados"></span>' : ''}</a>`).join('')}</div>` : '';
    return `<div class="sb-row" style="${tileVars(b)}">
        <a class="sb-item${atual ? ' is-open' : ''}" href="#/${b.id}/${b.tabs[0].id}">
        <span class="tile mark">${logo(b.icon)}</span><span class="nm" title="${esc(b.name)}">${esc(b.name)}</span><span class="count" title="${b.tabs.length} tabs">${b.tabs.length}</span></a>
        <button class="sb-toggle" data-toggle="${b.id}" aria-expanded="${aberta}" aria-controls="tabs-${b.id}" aria-label="${aberta ? 'Fechar' : 'Abrir'} tabs de ${esc(b.name)}">${icon('chevron')}</button>
      </div>${sub}`;
  }).join('');
  return `
    <div class="sb-head"><img class="sb-logo-nome" src="assets/stater-logo.svg?v=1" alt="Stater" width="117" height="40"></div>
    <div>
      <div class="sb-label">Marcas</div>
      <nav class="sb-nav" aria-label="Marcas">
        <a class="sb-item sb-ov${!brand ? ' is-open' : ''}" href="#/" style="${tileVars(GROUP)}" ${!brand ? 'aria-current="page"' : ''}><span class="tile mark">${logo('grupo')}</span><span>Overview</span></a>
        ${itens}
      </nav>
    </div>
    <div class="sb-foot">
      <div class="sb-note">${icon('lock')} Os dados ficam só neste browser.</div>
    </div>`;
}

export function topbar({ brand, tab }) {
  const rec = brand && tab ? store.get(brand.id, tab.id) : null;
  const crumbs = brand
    ? `<span>Stater</span>${icon('chevron')}<span>${esc(brand.name)}</span>${icon('chevron')}<b>${esc(tab.name)}</b>`
    : `<span>Stater</span>${icon('chevron')}<b>Overview</b>`;
  return `
    <nav class="crumbs" aria-label="Onde estás">${crumbs}</nav>
    <div class="spacer"></div>
    ${rec ? `<span class="updated">Atualizado a ${formatarData(rec.savedAt)}</span>` : ''}
`;
}
