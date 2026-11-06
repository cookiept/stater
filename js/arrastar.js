// Arrastar gráficos e tabelas para mudar a ordem dentro da tab. A ordem fica guardada neste browser,
// por tab, e o PowerPoint segue-a. Cada cartão tem uma pega (também funciona com as setas do teclado).
import { icon } from './icons.js?v=20261106-1129';
import { ordem, guardarOrdem } from './store.js?v=20261106-1129';

const idDe = card => (card.getAttribute('aria-labelledby') || '').replace(/^h-/, '');
const cartoes = raiz => [...raiz.querySelectorAll('section.card[aria-labelledby]')];

// Põe os cartões pela ordem guardada (só troca cartões que estão no mesmo bloco)
function aplicar(raiz, lista) {
  if (!lista.length) return;
  const pos = id => { const i = lista.indexOf(id); return i < 0 ? 1e6 : i; };
  const pais = new Set(cartoes(raiz).map(c => c.parentElement));
  for (const pai of pais) {
    const cs = [...pai.children].filter(c => c.matches('section.card[aria-labelledby]'));
    if (cs.length < 2) continue;
    const marca = document.createComment('');
    pai.insertBefore(marca, cs[0]);
    const orig = cs.map(idDe);
    cs.sort((a, b) => (pos(idDe(a)) - pos(idDe(b))) || (orig.indexOf(idDe(a)) - orig.indexOf(idDe(b))));
    let ref = marca;
    for (const c of cs) { ref.after(c); ref = c; }
    marca.remove();
  }
}

export function ligarArrastar(raiz, brandId, tabId) {
  if (!raiz) return;
  aplicar(raiz, ordem(brandId, tabId));
  const guardar = () => guardarOrdem(brandId, tabId, cartoes(raiz).map(idDe));
  let aMover = null;

  for (const card of cartoes(raiz)) {
    const irmaos = () => [...card.parentElement.children].filter(c => c.matches('section.card[aria-labelledby]'));
    if (irmaos().length < 2) continue;
    const head = card.querySelector('.card-head');
    if (!head || head.querySelector('.pega')) continue;
    const titulo = card.querySelector('h3')?.textContent.trim() || 'cartão';
    head.insertAdjacentHTML('afterbegin', `<span class="pega" role="button" tabindex="0" draggable="true" aria-label="Mudar a ordem de ${titulo.replace(/"/g, '')}" title="Arrastar para mudar a ordem (ou setas do teclado)">${icon('grip')}</span>`);
    const pega = head.querySelector('.pega');

    pega.addEventListener('dragstart', e => {
      aMover = card;
      card.classList.add('a-mover');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idDe(card));
      try { e.dataTransfer.setDragImage(card, 24, 24); } catch { /* browser antigo */ }
    });
    pega.addEventListener('dragend', () => {
      card.classList.remove('a-mover');
      raiz.querySelectorAll('.alvo-cima,.alvo-baixo').forEach(c => c.classList.remove('alvo-cima', 'alvo-baixo'));
      aMover = null;
      guardar();
    });
    // Teclado: setas para cima e para baixo
    pega.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const cs = irmaos(), i = cs.indexOf(card);
      const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
      if (j < 0 || j >= cs.length) return;
      if (e.key === 'ArrowUp') cs[j].before(card); else cs[j].after(card);
      pega.focus();
      guardar();
    });

    card.addEventListener('dragover', e => {
      if (!aMover || aMover === card || aMover.parentElement !== card.parentElement) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const lado = card.parentElement.classList.contains('grid-2') ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      card.classList.toggle('alvo-cima', lado);
      card.classList.toggle('alvo-baixo', !lado);
    });
    card.addEventListener('dragleave', e => { if (!card.contains(e.relatedTarget)) card.classList.remove('alvo-cima', 'alvo-baixo'); });
    card.addEventListener('drop', e => {
      if (!aMover || aMover === card || aMover.parentElement !== card.parentElement) return;
      e.preventDefault();
      if (card.classList.contains('alvo-cima')) card.before(aMover); else card.after(aMover);
      card.classList.remove('alvo-cima', 'alvo-baixo');
    });
  }
}

// Repor a ordem original da tab
export const reporOrdem = (brandId, tabId) => guardarOrdem(brandId, tabId, null);

// Ordena a lista de gráficos do PowerPoint pela ordem guardada
export function pelaOrdem(graficos, brandId, tabId) {
  const lista = ordem(brandId, tabId);
  if (!lista.length) return graficos;
  const pos = id => { const i = lista.indexOf(id); return i < 0 ? 1e6 : i; };
  return [...graficos].map((g, i) => [g, i]).sort((a, b) => (pos(a[0].id) - pos(b[0].id)) || (a[1] - b[1])).map(x => x[0]);
}
