// Confere se o webhook veio mesmo da Meta.
// A Meta assina o corpo com a "Chave secreta do app" (App Secret) e manda no
// cabeçalho X-Hub-Signature-256. Sem essa conferência, qualquer pessoa que
// descobrir a URL consegue fingir ser cliente e gastar sua IA.
// Usa Web Crypto, que existe igual no Cloudflare e no Node.

const enc = new TextEncoder();

export async function assinar(segredo, corpo) {
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(corpo));
  return 'sha256=' + [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function assinaturaValida(segredo, corpo, cabecalho) {
  if (!segredo || !cabecalho) return false;
  const esperado = await assinar(segredo, corpo);
  const recebido = String(cabecalho).trim().toLowerCase();
  if (esperado.length !== recebido.length) return false;
  let dif = 0; // comparação em tempo constante
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return dif === 0;
}
