// Conversa com a API oficial do WhatsApp (Cloud API da Meta).

export const VERSAO_PADRAO = 'v25.0';

// Erros mais comuns, traduzidos. O código vem da Meta; o "acao" diz o que o robô faz.
//   travar   = para a prospecção até você resolver (problema da conta, não do contato)
//   contato  = problema só desse contato; segue pro próximo
//   janela   = passou de 24h sem o cliente escrever; só modelo aprovado pode ir
export const ERROS = {
  0: { acao: 'travar', texto: 'Token inválido ou expirado. Gere o token permanente de novo (docs/02-meta-passo-a-passo.md, passo 5).' },
  190: { acao: 'travar', texto: 'Token inválido ou expirado. Gere o token permanente de novo (docs/02-meta-passo-a-passo.md, passo 5).' },
  10: { acao: 'travar', texto: 'O token não tem permissão nesse número. Confira se o usuário do sistema recebeu o app e a conta do WhatsApp.' },
  200: { acao: 'travar', texto: 'Permissão faltando no token (whatsapp_business_messaging e whatsapp_business_management).' },
  100: { acao: 'contato', texto: 'Parâmetro inválido na mensagem. Confira o número e os campos do modelo.' },
  368: { acao: 'travar', texto: 'A Meta bloqueou temporariamente o envio por violação de política. Pare e veja a qualidade do número no WhatsApp Manager.' },
  130429: { acao: 'travar', texto: 'Limite de velocidade da API atingido. Espere alguns minutos.' },
  131000: { acao: 'contato', texto: 'Erro genérico da Meta. Tente de novo mais tarde.' },
  131005: { acao: 'travar', texto: 'Acesso negado. O token não tem permissão de envio.' },
  131008: { acao: 'contato', texto: 'Faltou um parâmetro obrigatório (algum campo do modelo ficou vazio).' },
  131009: { acao: 'contato', texto: 'Valor de parâmetro inválido.' },
  131021: { acao: 'contato', texto: 'Você tentou mandar mensagem pro próprio número do robô.' },
  131026: { acao: 'contato', texto: 'Esse número não recebe a mensagem (não tem WhatsApp, versão antiga ou não aceitou os termos).' },
  131030: { acao: 'travar', texto: 'Número de teste: só envia pra números cadastrados na lista de destinatários do app. Use um número real.' },
  131031: { acao: 'travar', texto: 'Conta do WhatsApp bloqueada ou restrita pela Meta.' },
  131042: { acao: 'travar', texto: 'Problema de pagamento: cadastre (ou corrija) a forma de pagamento da conta do WhatsApp.' },
  131045: { acao: 'travar', texto: 'Número não registrado na Cloud API. Rode: npm run registrar-numero' },
  131047: { acao: 'janela', texto: 'Passou de 24h desde a última mensagem do cliente. Só dá pra mandar modelo aprovado.' },
  131048: { acao: 'travar', texto: 'Limite por spam: muita gente bloqueou ou denunciou. Pare, revise a mensagem de abertura e a lista.' },
  131049: { acao: 'contato', texto: 'A Meta segurou essa mensagem de marketing pra preservar a experiência do cliente (ele já recebeu muitas). Não insista com esse contato hoje.' },
  131050: { acao: 'contato', texto: 'O cliente parou de aceitar mensagens de marketing.' },
  131051: { acao: 'contato', texto: 'Tipo de mensagem não suportado.' },
  131056: { acao: 'contato', texto: 'Muitas mensagens seguidas pro mesmo número. Espere um pouco.' },
  131057: { acao: 'travar', texto: 'Conta em manutenção.' },
  132000: { acao: 'travar', texto: 'Número de parâmetros diferente do modelo aprovado. Ajuste "parametros" em config/robo.json.' },
  132001: { acao: 'travar', texto: 'Modelo não existe nesse idioma (ou ainda não foi aprovado). Confira nome e idioma em config/robo.json.' },
  132005: { acao: 'travar', texto: 'Texto do modelo ficou grande demais com os parâmetros.' },
  132007: { acao: 'travar', texto: 'O conteúdo do modelo viola a política da Meta.' },
  132012: { acao: 'travar', texto: 'Formato de parâmetro errado pro modelo.' },
  132015: { acao: 'travar', texto: 'Modelo pausado pela Meta por baixa qualidade. Crie outro.' },
  132016: { acao: 'travar', texto: 'Modelo desativado pela Meta por baixa qualidade. Crie outro.' },
  133010: { acao: 'travar', texto: 'Número não registrado. Rode: npm run registrar-numero' },
  135000: { acao: 'contato', texto: 'Erro genérico do usuário.' },
};

export function explicarErro(codigo) {
  return ERROS[codigo] || { acao: 'contato', texto: 'Erro da Meta sem tradução. Veja o código em docs/07-erros.md.' };
}

export class ErroMeta extends Error {
  constructor(msg, codigo, detalhe, status) {
    super(msg);
    this.codigo = codigo;
    this.detalhe = detalhe;
    this.status = status;
    this.explicacao = explicarErro(codigo);
  }
}

export function criarWhatsApp({ token, versao = VERSAO_PADRAO, base = 'https://graph.facebook.com', fetch: f = fetch }) {
  async function chamar(caminho, { metodo, corpo } = {}) {
    const r = await f(`${base}/${versao}/${caminho}`, {
      method: metodo || (corpo ? 'POST' : 'GET'),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      const e = j.error || {};
      // sem corpo de erro (Meta fora do ar, 5xx): código nulo, pra não confundir com token inválido e travar à toa
      throw new ErroMeta(e.message || `Meta respondeu ${r.status}`, e.code ?? (r.status === 401 ? 190 : null), e.error_data?.details, r.status);
    }
    return j;
  }

  return {
    chamar,

    async enviarTexto(numeroId, para, texto) {
      const j = await chamar(`${numeroId}/messages`, {
        corpo: { messaging_product: 'whatsapp', recipient_type: 'individual', to: para, type: 'text', text: { body: texto, preview_url: true } },
      });
      return j.messages?.[0]?.id;
    },

    // parametros: [{ nome, valor }]. nomeados=true para modelos com {{nome}}, false para {{1}}, {{2}}...
    async enviarModelo(numeroId, para, { nome, idioma = 'pt_BR', parametros = [], nomeados = false }) {
      const componentes = parametros.length
        ? [{
            type: 'body',
            parameters: parametros.map((p) => (nomeados
              ? { type: 'text', parameter_name: p.nome, text: String(p.valor) }
              : { type: 'text', text: String(p.valor) })),
          }]
        : [];
      const j = await chamar(`${numeroId}/messages`, {
        corpo: { messaging_product: 'whatsapp', to: para, type: 'template', template: { name: nome, language: { code: idioma }, components: componentes } },
      });
      return j.messages?.[0]?.id;
    },

    async marcarLida(numeroId, waId) {
      try { await chamar(`${numeroId}/messages`, { corpo: { messaging_product: 'whatsapp', status: 'read', message_id: waId } }); } catch {}
    },

    // Baixa um áudio/arquivo que o cliente mandou. A URL da Meta só abre com o token.
    async baixarMidia(midiaId) {
      const info = await chamar(midiaId);
      const r = await f(info.url, { headers: { authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`não consegui baixar a mídia (${r.status})`);
      return { bytes: new Uint8Array(await r.arrayBuffer()), tipo: info.mime_type || 'audio/ogg' };
    },
  };
}

// Lê o corpo do webhook e devolve uma lista simples de eventos.
export function lerWebhook(corpo) {
  const msgs = [];
  const status = [];
  for (const entry of corpo?.entry || []) {
    for (const ch of entry.changes || []) {
      if (ch.field && ch.field !== 'messages') continue;
      const v = ch.value || {};
      const numeroId = v.metadata?.phone_number_id;
      const nomes = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages || []) {
        const tipo = m.type;
        let texto = null;
        let midia = null;
        if (tipo === 'text') texto = m.text?.body ?? '';
        else if (tipo === 'button') texto = m.button?.text ?? '';
        else if (tipo === 'interactive') texto = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
        else if (tipo === 'audio') midia = m.audio?.id;
        else if (tipo === 'reaction' || tipo === 'unsupported' || tipo === 'system') continue;
        else {
          const oque = { image: 'uma foto', video: 'um vídeo', document: 'um arquivo', sticker: 'uma figurinha', location: 'uma localização', contacts: 'um contato' }[tipo] || 'algo que não é texto';
          const legenda = m[tipo]?.caption ? `: ${m[tipo].caption}` : '';
          texto = `(o cliente mandou ${oque}${legenda})`;
        }
        msgs.push({ numeroId, de: m.from, nomePerfil: nomes[m.from] || null, waId: m.id, tipo, texto, midia, quando: Number(m.timestamp) * 1000 || Date.now() });
      }
      for (const s of v.statuses || []) {
        status.push({ numeroId, para: s.recipient_id, waId: s.id, status: s.status, erro: s.errors?.[0] || null });
      }
    }
  }
  return { msgs, status };
}
