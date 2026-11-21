// Monta o "ctx" que todo o robô usa, a partir do banco e das variáveis de ambiente.

import { carregarConfig } from './config.js';
import { criarWhatsApp } from './whatsapp.js';
import { criarIA } from './ia/index.js';

export function criarContexto({ db, env, configJson, atendente, plataforma, depois, fetch: f = fetch, agora = () => Date.now() }) {
  const config = carregarConfig(configJson);
  const wa = criarWhatsApp({ token: env.META_TOKEN, versao: config.meta.versao, base: env.META_BASE_URL || 'https://graph.facebook.com', fetch: f });
  let ia = null;
  return {
    db, env, config, atendente, plataforma, wa, agora,
    depois: depois || ((p) => { Promise.resolve(p).catch(() => {}); }),
    // a IA só é criada quando precisa (assim o painel abre mesmo sem chave de IA)
    ia: () => (ia ||= criarIA({
      provedor: config.ia.provedor, modelo: config.ia.modelo, env,
      maxTokens: config.ia.max_tokens, temperatura: config.ia.temperatura, fetch: f,
    })),
  };
}

// Uma "batida" do relógio: responde quem ficou pra trás e abre uma conversa nova.
export async function tique(ctx, { responderPendentes, prospectar, evento }) {
  const r = {};
  try { r.respostas = await responderPendentes(ctx); } catch (e) { await evento(ctx, 'erro_tique', `respostas: ${e.message}`); }
  try { r.prospeccao = await prospectar(ctx); } catch (e) { await evento(ctx, 'erro_tique', `prospecção: ${e.message}`); }
  return r;
}
