// Tudo o que o Stater guarda no browser (localStorage). Nada sai do computador.
import { brandById } from './brands.js?v=20261103-1642';

const chave = (b, t) => `stater:v1:${b}:${t}`;

// Dados de cada tab: { fileName, savedAt, data, exemplo? }
export const store = {
  get(b, t) { try { return JSON.parse(localStorage.getItem(chave(b, t))); } catch { return null; } },
  set(b, t, v) { localStorage.setItem(chave(b, t), JSON.stringify(v)); },
  del(b, t) { localStorage.removeItem(chave(b, t)); },
};

// Objetivo de NPS de cada marca (definido na Overview)
export const meta = id => {
  const v = parseInt(localStorage.getItem(`stater:v1:meta:${id}`), 10);
  return Number.isFinite(v) ? v : (brandById(id)?.target ?? 60);
};
export const dataMetas = () => localStorage.getItem('stater:v1:meta-data');
export function guardarMetas(valores) {
  for (const [id, v] of Object.entries(valores)) {
    const n = Math.max(-100, Math.min(100, parseInt(v, 10)));
    if (Number.isFinite(n)) localStorage.setItem(`stater:v1:meta:${id}`, String(n));
  }
  localStorage.setItem('stater:v1:meta-data', new Date().toISOString());
}

// Marcas com a lista de tabs aberta no menu lateral
const CHAVE_ABERTAS = 'stater:v1:ui:abertas';
export const abertas = new Set((() => { try { return JSON.parse(localStorage.getItem(CHAVE_ABERTAS)) || []; } catch { return []; } })());
export const guardarAbertas = () => { try { localStorage.setItem(CHAVE_ABERTAS, JSON.stringify([...abertas])); } catch { /* browser sem espaço ou bloqueado */ } };
