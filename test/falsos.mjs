// Meta e IA de mentira, pra testar o robô inteiro sem gastar nada nem precisar de conta.
import http from 'node:http';

export async function servidorFalso(cenario = {}) {
  const enviados = [];
  const iaPedidos = [];
  let seq = 0;
  const s = http.createServer(async (req, res) => {
    const partes = []; for await (const c of req) partes.push(c);
    const corpo = partes.length ? JSON.parse(Buffer.concat(partes).toString() || '{}') : null;
    const url = new URL(req.url, 'http://x');
    const responder = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

    // ---- Meta: leitura (usada pelo npm run checar)
    if (url.pathname.endsWith('/debug_token')) return responder(200, { data: { is_valid: true, expires_at: cenario.tokenTemporario ? Math.floor(Date.now() / 1000) + 3600 : 0, scopes: cenario.semPermissao ? ['whatsapp_business_messaging'] : ['whatsapp_business_messaging', 'whatsapp_business_management'] } });
    if (/\/v\d+\.\d+\/NUM1$/.test(url.pathname) && req.method === 'GET') {
      if ((url.searchParams.get('fields') || '').includes('messaging_limit')) return responder(200, { whatsapp_business_manager_messaging_limit: 'TIER_250' });
      return responder(200, { display_phone_number: '+55 11 90000-1234', verified_name: 'Loja Teste', name_status: 'APPROVED', quality_rating: 'GREEN', status: 'CONNECTED', platform_type: cenario.naoRegistrado ? 'NOT_APPLICABLE' : 'CLOUD_API' });
    }
    if (/\/WABA1\/subscribed_apps$/.test(url.pathname)) return responder(200, { data: cenario.semAssinatura ? [] : [{ whatsapp_business_api_data: { name: 'App' } }] });
    if (/\/WABA1\/message_templates$/.test(url.pathname)) return responder(200, { data: [{ name: 'abertura', language: 'pt_BR', status: 'APPROVED', components: [{ type: 'BODY', text: 'Olá, {{1}}! Vi a {{2}}.' }] }] });

    // ---- Meta
    let m = url.pathname.match(/^\/v\d+\.\d+\/(\w+)\/messages$/);
    if (m && req.method === 'POST') {
      if (corpo.status === 'read') return responder(200, { success: true });
      if (corpo.to === '5511900000026') return responder(400, { error: { message: 'not a WhatsApp user', code: 131026 } });
      if (corpo.template?.name === 'quebrado') return responder(404, { error: { message: 'template does not exist', code: 132001 } });
      enviados.push({ numeroId: m[1], ...corpo, auth: req.headers.authorization });
      return responder(200, { messages: [{ id: `wamid.falso${++seq}` }] });
    }
    m = url.pathname.match(/^\/v\d+\.\d+\/(midia\w+)$/);
    if (m) return responder(200, { url: `http://127.0.0.1:${s.address().port}/arquivo/${m[1]}`, mime_type: 'audio/ogg' });
    if (url.pathname.startsWith('/arquivo/')) { res.writeHead(200, { 'content-type': 'audio/ogg' }); return res.end(Buffer.from([1, 2, 3])); }

    // ---- IA no formato OpenAI
    if (url.pathname === '/v1/chat/completions') {
      iaPedidos.push(corpo);
      const ult = corpo.messages.filter((x) => x.role === 'user').pop()?.content || '';
      let r = `Resposta da IA para: ${ult.split('\n').pop()}`;
      if (/humano|atendente de verdade/i.test(ult)) r = 'Claro, vou chamar alguém da equipe. [HUMANO: pediu uma pessoa]';
      if (/não quero mais/i.test(ult)) r = 'Tudo bem, não te chamo mais. [NAO_CONTATAR]';
      if (/menu automático/i.test(ult)) r = '[IGNORAR]';
      if (/falha ia/i.test(ult)) return responder(500, { error: { message: 'IA fora do ar' } });
      return responder(200, { choices: [{ message: { content: r }, finish_reason: 'stop' }] });
    }
    if (url.pathname === '/v1/models') return responder(200, { data: [{ id: 'modelo-falso' }] });
    responder(404, { error: { message: `rota falsa desconhecida ${url.pathname}`, code: 100 } });
  });
  await new Promise((ok) => s.listen(0, ok));
  const base = `http://127.0.0.1:${s.address().port}`;
  return { base, enviados, iaPedidos, fechar: () => s.close() };
}

// Corpo de webhook igual ao que a Meta manda.
export function webhookMensagem({ de = '5543999998888', texto = 'oi', id = `wamid.in${Math.random()}`, tipo = 'text', audio, nome = 'Cliente', quando = Date.now() } = {}) {
  const msg = { from: de, id, timestamp: String(Math.floor(quando / 1000)), type: tipo };
  if (tipo === 'text') msg.text = { body: texto };
  if (tipo === 'audio') msg.audio = { id: audio || 'midia123', mime_type: 'audio/ogg; codecs=opus' };
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp', metadata: { display_phone_number: '5511000000000', phone_number_id: 'NUM1' },
      contacts: [{ profile: { name: nome }, wa_id: de }], messages: [msg],
    } }] }],
  };
}

export function webhookStatus({ para, codigo = 131026 }) {
  return { entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'NUM1' }, statuses: [{ id: 'wamid.x', recipient_id: para, status: 'failed', errors: [{ code: codigo, title: 'falhou' }] }] } }] }] };
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
