// Arrastar gráficos e tabelas para mudar a ordem dentro da tab. A ordem fica guardada neste browser,
// por tab, e o PowerPoint segue-a. Cada cartão tem uma pega (também funciona com as setas do teclado).
import { icon } from './icons.js?v=20261111-1439';
import { ordem, guardarOrdem } from './store.js?v=20261111-1439';

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

    // Rato e toque: o cartão "levanta" e segue o dedo/rato; os outros afastam-se com animação (como nos ícones do iPhone)
    pega.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const x0 = e.clientX + scrollX, y0 = e.clientY + scrollY;
      const top0 = card.offsetTop, left0 = card.offsetLeft;
      let x = e.clientX, y = e.clientY, ativo = true, mudou = false;
      card.classList.add('a-mover');
      document.body.classList.add('a-arrastar');
      // Segue o ponteiro, descontando o sítio novo do cartão na lista
      const seguir = () => {
        const dx = x + scrollX - x0 + (left0 - card.offsetLeft), dy = y + scrollY - y0 + (top0 - card.offsetTop);
        card.style.transform = `translate(${dx}px, ${dy}px) scale(1.015)`;
      };
      // Troca de lugar assim que a borda da frente do cartão arrastado entra um pouco no outro
      // (só no sentido em que o rato se está a mover, para não ficar a trocar para trás e para a frente)
      let dirX = 0, dirY = 0, ux = x, uy = y + scrollY;
      const procurar = () => {
        const py = y + scrollY;
        if (Math.abs(py - uy) > 3) { dirY = Math.sign(py - uy); uy = py; }
        if (Math.abs(x - ux) > 3) { dirX = Math.sign(x - ux); ux = x; }
        const cs = irmaos(), i = cs.indexOf(card);
        const op = (card.offsetParent || document.body).getBoundingClientRect(), r = card.getBoundingClientRect();
        const vt = r.top - op.top, vb = r.bottom - op.top, vl = r.left - op.left, vr = r.right - op.left;
        let alvo = null, depois = true;
        for (const [j, c] of cs.entries()) {
          if (c === card) continue;
          const l = c.offsetLeft, t = c.offsetTop, w = c.offsetWidth, h = c.offsetHeight;
          const mesmaLinha = Math.abs(t - card.offsetTop) < 8;
          if (mesmaLinha) {
            if (vb < t || vt > t + h) continue;
            const m = Math.min(w * 0.2, 60);
            if (j > i && dirX > 0 && vr > l + m) { alvo = c; depois = true; }
            else if (j < i && dirX < 0 && vl < l + w - m && !alvo) { alvo = c; depois = false; }
          } else {
            if (vr < l || vl > l + w) continue;
            const m = Math.min(h * 0.15, 50);
            if (j > i && dirY > 0 && vb > t + m) { alvo = c; depois = true; }
            else if (j < i && dirY < 0 && vt < t + h - m && !alvo) { alvo = c; depois = false; }
          }
        }
        if (!alvo) return;
        mover(cs, () => (depois ? alvo.after(card) : alvo.before(card)), card);
        mudou = true;
      };
      const passo = () => {
        if (!ativo) return;
        const m = 70, v = y < m ? -(m - y) / 3 : y > innerHeight - m ? (y - innerHeight + m) / 3 : 0;
        if (v) scrollBy(0, v);
        procurar(); seguir();
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      const mover_ = ev => { x = ev.clientX; y = ev.clientY; };
      const largar = () => {
        ativo = false;
        removeEventListener('pointermove', mover_);
        removeEventListener('pointerup', largar);
        removeEventListener('pointercancel', largar);
        // Assenta no lugar novo com animação
        card.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
        card.style.transform = '';
        document.body.classList.remove('a-arrastar');
        setTimeout(() => { card.classList.remove('a-mover'); card.style.transition = ''; }, 230);
        if (mudou) guardar();
      };
      // No window: ao mudar o cartão de sítio na página o browser larga o "pointer capture" da pega
      addEventListener('pointermove', mover_);
      addEventListener('pointerup', largar);
      addEventListener('pointercancel', largar);
    });
    // Teclado: setas para cima e para baixo (com a mesma animação)
    pega.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const cs = irmaos(), i = cs.indexOf(card);
      const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
      if (j < 0 || j >= cs.length) return;
      mover(cs, () => (e.key === 'ArrowUp' ? cs[j].before(card) : cs[j].after(card)));
      pega.focus();
      guardar();
    });
  }
}

// Muda a ordem e anima os cartões do sítio antigo para o novo (técnica FLIP). O cartão arrastado não anima.
function mover(cs, trocar, fixo = null) {
  const antes = new Map(cs.map(c => [c, { l: c.offsetLeft, t: c.offsetTop }]));
  trocar();
  for (const c of cs) {
    if (c === fixo) continue;
    const a = antes.get(c), dx = a.l - c.offsetLeft, dy = a.t - c.offsetTop;
    if (!dx && !dy) continue;
    c.style.transition = 'none';
    c.style.transform = `translate(${dx}px, ${dy}px)`;
    c.getBoundingClientRect();
    c.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
    c.style.transform = '';
    clearTimeout(c._fim);
    c._fim = setTimeout(() => { c.style.transition = ''; }, 260);
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
