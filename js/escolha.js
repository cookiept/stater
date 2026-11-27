// Menus de escolha com o estilo do Stater, em vez da lista do browser.
// Cada <select class="vista-sel"> fica escondido e passa a ter um botão e uma lista por cima. Quando se escolhe,
// o select muda e dispara "change", por isso o resto do código continua igual.
import { esc } from './ui.js?v=20261127-1248';

const SETA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CERTO = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let aberto = null; // { sel, btn, lista }
let n = 0;

function fechar(focar = false) {
  if (!aberto) return;
  const { btn, lista } = aberto;
  lista.remove();
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('is-open');
  aberto = null;
  if (focar) btn.focus();
}

function escolher(sel, btn, v) {
  if (sel.value !== v) {
    sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  pintarBtn(sel, btn);
  fechar(true);
}

const pintarBtn = (sel, btn) => { btn.querySelector('.esc-txt').textContent = sel.selectedOptions[0]?.textContent || ''; };

function abrir(sel, btn) {
  fechar();
  const caixa = document.createElement('div');
  caixa.className = 'esc-lista';
  const muitas = sel.options.length > 10;
  const id = btn.getAttribute('aria-controls');
  caixa.innerHTML = `${muitas ? `<label class="esc-proc"><span class="sr-only">Procurar</span><input type="search" placeholder="Procurar…" autocomplete="off"></label>` : ''}<ul role="listbox" id="${id}" tabindex="-1">${[...sel.options].map((o, i) => `<li role="option" id="${id}-${i}" data-v="${esc(o.value)}" aria-selected="${o.selected}" class="${o.selected ? 'is-sel' : ''}">${CERTO}<span>${esc(o.textContent)}</span></li>`).join('')}</ul>`;
  document.body.appendChild(caixa);
  const lista = caixa.querySelector('ul'), proc = caixa.querySelector('input');
  // Por baixo do botão; se não couber, por cima
  const r = btn.getBoundingClientRect();
  caixa.style.minWidth = `${Math.round(r.width)}px`;
  caixa.style.left = `${Math.round(Math.min(r.left, innerWidth - caixa.offsetWidth - 8))}px`;
  const baixo = innerHeight - r.bottom - 8;
  if (baixo < Math.min(caixa.offsetHeight, 220) && r.top > baixo) caixa.style.bottom = `${Math.round(innerHeight - r.top + 6)}px`, caixa.style.maxHeight = `${Math.round(Math.min(380, r.top - 12))}px`;
  else caixa.style.top = `${Math.round(r.bottom + 6)}px`, caixa.style.maxHeight = `${Math.round(Math.min(380, baixo))}px`;
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('is-open');
  aberto = { sel, btn, lista: caixa };
  const atual = lista.querySelector('.is-sel') || lista.firstElementChild;
  marcar(lista, atual);
  atual?.scrollIntoView({ block: 'nearest' });
  lista.addEventListener('click', e => { const li = e.target.closest('li'); if (li) escolher(sel, btn, li.dataset.v); });
  lista.addEventListener('mousemove', e => { const li = e.target.closest('li'); if (li) marcar(lista, li); });
  (proc || lista).focus({ preventScroll: true });
  caixa.addEventListener('keydown', e => teclas(e, sel, btn, lista));
  proc?.addEventListener('input', () => {
    const q = proc.value.trim().toLowerCase();
    lista.querySelectorAll('li').forEach(li => { li.hidden = !!q && !li.textContent.toLowerCase().includes(q); });
    marcar(lista, lista.querySelector('li:not([hidden])'));
  });
}

function marcar(lista, li) {
  lista.querySelectorAll('.is-ativo').forEach(x => x.classList.remove('is-ativo'));
  if (!li) return;
  li.classList.add('is-ativo');
  lista.setAttribute('aria-activedescendant', li.id);
}

function teclas(e, sel, btn, lista) {
  const lis = [...lista.children].filter(li => !li.hidden);
  const i = lis.indexOf(lista.querySelector('.is-ativo'));
  const ir = j => { const li = lis[Math.max(0, Math.min(lis.length - 1, j))]; marcar(lista, li); li?.scrollIntoView({ block: 'nearest' }); };
  if (e.key === 'ArrowDown') { e.preventDefault(); ir(i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ir(i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); ir(0); }
  else if (e.key === 'End') { e.preventDefault(); ir(lis.length - 1); }
  else if (e.key === 'Enter' || (e.key === ' ' && e.target.tagName !== 'INPUT')) { e.preventDefault(); if (lis[i]) escolher(sel, btn, lis[i].dataset.v); }
  else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); fechar(true); }
}

function enfeitar(sel) {
  sel.dataset.enf = '1';
  const id = `esc-${++n}`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'esc-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', id);
  const rot = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`)?.textContent;
  if (rot) btn.setAttribute('aria-label', rot);
  btn.innerHTML = `<span class="esc-txt"></span>${SETA}`;
  pintarBtn(sel, btn);
  sel.classList.add('esc-escondido');
  sel.tabIndex = -1;
  sel.after(btn);
  btn.addEventListener('click', () => (aberto?.btn === btn ? fechar() : abrir(sel, btn)));
  btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrir(sel, btn); } });
  // Quem quiser pôr o foco no select (ex.: depois de redesenhar) fica no botão
  sel.addEventListener('focus', () => btn.focus({ preventScroll: true }));
  sel.addEventListener('change', () => pintarBtn(sel, btn));
  if (document.activeElement === sel) btn.focus({ preventScroll: true });
}

export function ligarEscolhas() {
  const tratar = () => document.querySelectorAll('select.vista-sel:not([data-enf])').forEach(enfeitar);
  tratar();
  new MutationObserver(tratar).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerdown', e => { if (aberto && !aberto.lista.contains(e.target) && !aberto.btn.contains(e.target)) fechar(); });
  addEventListener('resize', () => fechar());
  addEventListener('scroll', e => { if (aberto && !aberto.lista.contains(e.target)) fechar(); }, true);
}
