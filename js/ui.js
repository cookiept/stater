// Pequenas peças de interface partilhadas.
import { icon } from './icons.js?v=20261104-1628';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Botão "i" com explicação (aparece ao passar o rato ou com o teclado).
export function info(titulo, texto) {
  return `<button type="button" class="info" data-tip-title="${esc(titulo)}" data-tip="${esc(texto)}" aria-label="O que é ${esc(titulo)}?">${icon('info')}</button>`;
}

// Explicações simples dos termos do Stater, para os botões "i".
export const GLOSSARIO = {
  nps: ['NPS', 'Net Promoter Score. Mede se os clientes nos recomendam: % de promotores menos % de detratores. Vai de −100 a +100.'],
  respostas: ['Respostas', 'Pessoas que deram uma nota de 0 a 10 no período do ficheiro.'],
  promotores: ['Promotores', 'Quem deu 9 ou 10. São os clientes que nos recomendam.'],
  neutros: ['Neutros', 'Quem deu 7 ou 8. Estão satisfeitos mas não entusiasmados. Não entram na conta do NPS.'],
  detratores: ['Detratores', 'Quem deu de 0 a 6. São os clientes que não nos recomendam.'],
  meta: ['Objetivo', 'O NPS que a marca quer atingir, de −100 a 100. Define-se na Overview, em Editar objetivos.'],
  driver: ['Driver', 'Uma parte da experiência que ajuda a explicar a nota, como a chegada, o atendimento ou o preço. Cada driver tem as suas causas raiz.'],
  causa: ['Causa raiz', 'O motivo concreto que o cliente escolheu para explicar a nota, dentro de um driver.'],
  mencoes: ['Menções', 'Quantas vezes uma causa foi escolhida. Uma pessoa pode escolher várias causas, por isso não é o número de pessoas.'],
  peso: ['Peso', 'Parte das menções desta causa no total. Mostra o que mais se repete.'],
  amostra: ['Poucas respostas', 'Com poucas respostas o NPS muda muito com cada pessoa. Abaixo de 30 menções numa causa, ou de 100 respostas no NPS, os números servem só como indicação.'],
  periodo: ['Período em análise', 'As datas do filtro usado no Qualtrics ao exportar o Excel. Não é a data em que o ficheiro foi carregado.'],
  filtros: ['Filtros da extração', 'Os filtros aplicados no Qualtrics antes de exportar: período, tipo de resposta, loja, etc. O Stater lê-os do topo do Excel.'],
  media: ['Média', 'A média das notas de 0 a 10. Ajuda a ver se as notas estão mais perto do 9 ou do 6.'],
};
export const def = (k, rot) => info(rot || GLOSSARIO[k][0], GLOSSARIO[k][1]);

let tipEl = null;
function mostrar(btn) {
  esconder();
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.innerHTML = `<b>${esc(btn.dataset.tipTitle)}</b>${esc(btn.dataset.tip)}`;
  document.body.appendChild(tipEl);
  const r = btn.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  let left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
  let top = r.top - t.height - 8;
  if (top < 8) top = r.bottom + 8;
  tipEl.style.left = `${left}px`;
  tipEl.style.top = `${top}px`;
}
function esconder() { tipEl?.remove(); tipEl = null; }

export function ligarTooltips() {
  document.addEventListener('mouseover', e => { const b = e.target.closest('[data-tip]'); if (b) mostrar(b); });
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) esconder(); });
  document.addEventListener('focusin', e => { const b = e.target.closest('[data-tip]'); if (b) mostrar(b); });
  document.addEventListener('focusout', esconder);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
  addEventListener('scroll', esconder, true);
}

// Aviso em baixo, ao centro. tipo 'ok' = verde com certo (ex.: objetivos guardados).
export function toast(msg, tipo = '') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast${tipo ? ` toast-${tipo}` : ''}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `${icon(tipo === 'ok' ? 'tick' : 'sparkle')}<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('is-in')));
  setTimeout(() => {
    t.classList.remove('is-in');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
    setTimeout(() => t.remove(), 600);
  }, 3200);
}

export function confirmar(titulo, texto, acao = 'Apagar') {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.innerHTML = `<h3>${esc(titulo)}</h3><p>${esc(texto)}</p><div class="row"><button class="btn btn-secondary" value="no">Cancelar</button><button class="btn btn-danger" value="yes">${esc(acao)}</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => { const v = e.target.closest('button')?.value; if (v) d.close(v); });
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    d.showModal();
  });
}

// Onda decorativa dos cartões (varia com a semente).
export function onda(seed = 1) {
  const a = 8 + (seed % 3) * 4, f = 1 + (seed % 4) * 0.35, ph = seed * 1.7;
  let d1 = 'M0 40', d2 = 'M0 52';
  for (let x = 0; x <= 300; x += 10) {
    d1 += ` L${x} ${(36 + a * Math.sin((x / 300) * Math.PI * 2 * f + ph)).toFixed(1)}`;
    d2 += ` L${x} ${(48 + a * 0.7 * Math.sin((x / 300) * Math.PI * 2 * f + ph + 1.2)).toFixed(1)}`;
  }
  return `<svg class="wave" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path d="${d1}" fill="none" stroke="currentColor" stroke-width="2"/><path d="${d2}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

// Botão para levar um gráfico para PowerPoint (editável)
export const btnPptx = id => `<button type="button" class="btn btn-ghost btn-xs exp" data-exp="${id}" title="Descarregar este gráfico em PowerPoint, editável">${icon('download')}<span class="exp-t">Download</span></button>`;

// Faixa de alerta dentro de uma tab (abaixo da meta, poucas respostas)
export const faixa = (tom, titulo, texto) => `<div class="faixa ${tom}" role="status">${icon(tom === 'bad' ? 'alert' : 'info')}<div><b>${titulo}</b> ${texto}</div></div>`;
