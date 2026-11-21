// Entrada do Cloudflare Workers. O cron do wrangler.jsonc chama scheduled() a cada minuto.

import configJson from '../../config/robo.json';
import atendente from '../../config/atendente.md';
import { bancoD1 } from '../core/banco.js';
import { criarContexto, tique } from '../core/contexto.js';
import { tratar } from '../core/rotas.js';
import { responderPendentes, prospectar, evento } from '../core/robo.js';

const ctxDe = (env, exec) => criarContexto({
  db: bancoD1(env.DB), env, configJson, atendente, plataforma: 'cloudflare',
  depois: (p) => exec.waitUntil(Promise.resolve(p).catch(() => {})),
});

export default {
  async fetch(req, env, exec) {
    try {
      return await tratar(req, ctxDe(env, exec));
    } catch (e) {
      return new Response(`erro interno: ${e.message}`, { status: 500 });
    }
  },
  async scheduled(_ev, env, exec) {
    const ctx = ctxDe(env, exec);
    exec.waitUntil(tique(ctx, { responderPendentes, prospectar, evento }));
  },
};
