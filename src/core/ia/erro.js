// Erro padronizado das IAs (mensagem legível + status HTTP).
export function erroIA(nome, status, j) {
  const msg = j?.error?.message || j?.error?.type || j?.message || `HTTP ${status}`;
  const e = new Error(`${nome}: ${msg}`);
  e.status = status;
  return e;
}
