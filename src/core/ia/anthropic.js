// Claude (Anthropic). Chave em https://console.anthropic.com/settings/keys

import { erroIA } from './erro.js';

const BASE = 'https://api.anthropic.com/v1';

export function anthropic({ chave, modelo, maxTokens, temperatura, fetch: f }) {
  const cab = { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  return {
    async responder(sistema, historico) {
      const r = await f(`${BASE}/messages`, {
        method: 'POST',
        headers: cab,
        body: JSON.stringify({
          model: modelo,
          system: sistema,
          max_tokens: maxTokens,
          temperature: temperatura,
          messages: historico.map((m) => ({ role: m.papel === 'robo' ? 'assistant' : 'user', content: m.texto })),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erroIA('Claude', r.status, j);
      const texto = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      if (!texto) throw new Error(`Claude: resposta vazia (${j.stop_reason || 'sem motivo'})`);
      return texto;
    },
    async listarModelos() {
      const r = await f(`${BASE}/models?limit=1000`, { headers: cab });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erroIA('Claude', r.status, j);
      return (j.data || []).map((m) => m.id);
    },
  };
}
