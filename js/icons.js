// Ícones SVG desenhados para o Stater (traço 1.75, grelha 24×24).
// Marcas: símbolos próprios, não são os logótipos oficiais.

const P = {
  // Marcas
  grupo: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="3.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="3.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  colibri: '<path d="M3 13.5c3.2-.4 5.6-2.2 7.4-5.2 1.1-1.9 2.9-3 5-3 1.3 0 2.4.5 3.2 1.3L21.5 5.5l-2 2.6c.2.6.3 1.2.3 1.9 0 4.1-3.4 7.4-7.6 7.4H9.6L6 20.5l.9-3.6C5.3 16.4 4 15.2 3 13.5z"/><circle cx="16" cy="8.6" r=".9" fill="currentColor" stroke="none"/>',
  nedlinq: '<circle cx="5.5" cy="12" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M7.8 10.9l8.4-4.2M7.8 13.1l8.4 4.2M18.5 8v8"/>',
  controlauto: '<path d="M4 15.5l1.6-4.7A2 2 0 0 1 7.5 9.5h9a2 2 0 0 1 1.9 1.3l1.6 4.7"/><rect x="3" y="15" width="18" height="4" rx="1.5"/><path d="M6.5 19v1.5M17.5 19v1.5"/><path d="M9 6.5l2 2 4-4"/>',
  itv: '<path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5.1-7.5-9.5V6L12 3z"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
  road: '<path d="M8.5 3L4 21M15.5 3L20 21"/><path d="M12 4v2.5M12 10v3M12 16.5V20"/>',
  viaverde: '<path d="M3 20V8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V20"/><path d="M3 10.5h18"/><path d="M8.5 13.5l3.5 6 3.5-6"/>',
  // Tabs
  bars: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="6" width="3" height="11" rx="1"/><rect x="15.5" y="9" width="3" height="8" rx="1"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0L3.5 12.2z"/><circle cx="8" cy="8" r="1.4"/>',
  tags: '<path d="M3.5 11V4.5a1 1 0 0 1 1-1H11l7.5 7.5a1.4 1.4 0 0 1 0 2L13 18.5a1.4 1.4 0 0 1-2 0L3.5 11z"/><path d="M14.5 3.5l6 6a1.4 1.4 0 0 1 0 2L15 17"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M10.5 7.5v3l2 1.5"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.5"/>',
  wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M3.8 10.5c2.5-.8 5.3-1.2 8.2-1.2s5.7.4 8.2 1.2M10.6 13.6L7 19.5M13.4 13.6L17 19.5"/>',
  layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8 12 3.5z"/><path d="M3.5 12l8.5 4.5 8.5-4.5"/><path d="M3.5 16l8.5 4.5 8.5-4.5"/>',
  check: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 12l2.7 2.7L16 9.3"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5.5"/><circle cx="12" cy="17" r="1.2"/>',
  pie: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5z"/><path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15V3.8z"/>',
  // UI
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  file: '<path d="M6.5 3.5h7l4 4v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.5 3.5v4h4"/><path d="M8.5 13h7M8.5 16.5h5"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6h.01" stroke-width="2.4"/>',
  pencil: '<path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5z"/><path d="M13 7l4 4"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.8.8 3 2.4 3.5 4.7"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  arrowUp: '<path d="M12 19V5M6.5 10.5L12 5l5.5 5.5"/>',
  arrowDown: '<path d="M12 5v14M6.5 13.5L12 19l5.5-5.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
  chart: '<path d="M4 19.5h16"/><path d="M5 15l4.5-4.5 3.5 3 6-6.5"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  slides: '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M12 16.5v3.5M8.5 20h7"/><path d="M7.5 12.5l3-3 2.5 2 3.5-3.5"/>',
  print: '<path d="M7 8.5V3.5h10v5"/><rect x="3.5" y="8.5" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  alert: '<path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4.5"/><path d="M12 17.3h.01" stroke-width="2.4"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  sort: '<path d="M8 5v14M4.5 15.5L8 19l3.5-3.5M16 19V5M12.5 8.5L16 5l3.5 3.5"/>',
};

export function icon(name, cls = 'ico') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
