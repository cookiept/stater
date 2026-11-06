// Arrastar gráficos e tabelas para mudar a ordem dentro da tab. A ordem fica guardada neste browser,
// por tab, e o PowerPoint segue-a. Cada cartão tem uma pega (também funciona com as setas do teclado).
import { icon } from './icons.js?v=20261106-1307';
import { ordem, guardarOrdem } from './store.js?v=20261106-1307';

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

  for (const card of cartoes(raiz)) {
    const irmaos = () => [...card.parentElement.children].filter(c => c.matches('section.card[aria-labelledby]'));
    if (irmaos().length < 2) continue;
    const head = card.querySelector('.card-head');
    if (!head || head.querySelector('.pega')) continue;
    const titulo = card.querySelector('h3')?.textContent.trim() || 'cartão';
    head.insertAdjacentHTML('afterbegin', `<span class="pega" role="button" tabindex="0" aria-label="Mudar a ordem de ${titulo.replace(/"/g, '')}" title="Arrastar para mudar a ordem (ou setas do teclado)">${icon('grip')}</span>`);
    const pega = head.querySelector('.pega');

    // Rato e toque: carregar na pega e arrastar o cartão para cima ou para baixo
    pega.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      pega.setPointerCapture(e.pointerId);
      card.classList.add('a-mover');
      document.body.classList.add('a-arrastar');
      let alvo = null, cima = true, y = e.clientY, x = e.clientX, ativo = true;
      const limpar = () => raiz.querySelectorAll('.alvo-cima,.alvo-baixo').forEach(c => c.classList.remove('alvo-cima', 'alvo-baixo'));
      const procurar = () => {
        limpar();
        alvo = irmaos().filter(c => c !== card).find(c => { const r = c.getBoundingClientRect(); return y >= r.top && y <= r.bottom && x >= r.left && x <= r.right; }) || null;
        if (!alvo) return;
        const r = alvo.getBoundingClientRect();
        cima = card.parentElement.classList.contains('grid-2') ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
        alvo.classList.add(cima ? 'alvo-cima' : 'alvo-baixo');
      };
      // Desliza a página quando o rato chega perto do topo ou do fundo
      const rolar = () => {
        if (!ativo) return;
        const m = 70, v = y < m ? -(m - y) / 3 : y > innerHeight - m ? (y - innerHeight + m) / 3 : 0;
        if (v) { scrollBy(0, v); procurar(); }
        requestAnimationFrame(rolar);
      };
      requestAnimationFrame(rolar);
      const mover = ev => { x = ev.clientX; y = ev.clientY; procurar(); };
      const largar = () => {
        ativo = false;
        pega.removeEventListener('pointermove', mover);
        pega.removeEventListener('pointerup', largar);
        pega.removeEventListener('pointercancel', largar);
        if (alvo) { if (cima) alvo.before(card); else alvo.after(card); guardar(); }
        limpar();
        card.classList.remove('a-mover');
        document.body.classList.remove('a-arrastar');
      };
      pega.addEventListener('pointermove', mover);
      pega.addEventListener('pointerup', largar);
      pega.addEventListener('pointercancel', largar);
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
