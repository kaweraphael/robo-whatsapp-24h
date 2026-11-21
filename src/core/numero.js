// Telefones. O WhatsApp brasileiro tem uma pegadinha: o celular pode chegar
// com ou sem o 9 da frente (5543999998888 ou 554399998888). Se a gente não
// normalizar, a mesma pessoa vira dois contatos e o robô fala duas vezes.

export function soDigitos(n) {
  return String(n ?? '').replace(/\D/g, '');
}

// Número pronto pra enviar: com DDI. Sem DDI e com cara de Brasil, põe 55.
export function paraEnvio(n, ddiPadrao = '55') {
  let d = soDigitos(n);
  if (d.startsWith('00')) d = d.slice(2);
  if (ddiPadrao === '55' && d.startsWith('0') && (d.length === 11 || d.length === 12)) d = d.slice(1); // 0 + DDD
  if (ddiPadrao && !d.startsWith(ddiPadrao) && (d.length === 10 || d.length === 11)) d = ddiPadrao + d;
  return d;
}

// Chave única do contato: Brasil sem o 9 extra do celular, México sem o 1 antigo.
export function chave(n, ddiPadrao = '55') {
  let d = paraEnvio(n, ddiPadrao);
  if (d.startsWith('55') && d.length === 13 && d[4] === '9') d = d.slice(0, 4) + d.slice(5);
  if (d.startsWith('521') && d.length === 13) d = '52' + d.slice(3);
  return d;
}

// Número parece válido? (8 a 15 dígitos, padrão internacional E.164)
export function valido(n) {
  const d = soDigitos(n);
  if (d.length < 10 || d.length > 15) return false;
  if (/^(\d)\1+$/.test(d)) return false;              // 0000000000
  if (d.startsWith('550800') || d.startsWith('0800')) return false;
  return true;
}

// Pra mostrar no painel sem expor o número inteiro.
export function mascarar(n) {
  const d = soDigitos(n);
  return d.length > 4 ? `•••• ${d.slice(-4)}` : d;
}
