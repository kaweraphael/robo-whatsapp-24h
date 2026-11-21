// OpenAI e tudo que fala o mesmo formato (OpenRouter, Groq, DeepSeek, Ollama...).

import { erroIA } from './erro.js';

export function openai({ chave, modelo, maxTokens, temperatura, fetch: f, base, extras = {}, transcricao = false }) {
  const oficial = base.includes('api.openai.com');
  const cab = { authorization: `Bearer ${chave}`, 'content-type': 'application/json', ...extras };

  const impl = {
    async responder(sistema, historico) {
      const corpo = {
        model: modelo,
        messages: [{ role: 'system', content: sistema }, ...historico.map((m) => ({ role: m.papel === 'robo' ? 'assistant' : 'user', content: m.texto }))],
      };
      // Os modelos novos da OpenAI usam max_completion_tokens e não aceitam temperatura.
      if (oficial) corpo.max_completion_tokens = maxTokens;
      else { corpo.max_tokens = maxTokens; corpo.temperature = temperatura; }
      const r = await f(`${base}/chat/completions`, { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erroIA(oficial ? 'OpenAI' : 'IA', r.status, j);
      const texto = String(j.choices?.[0]?.message?.content ?? '').trim();
      if (!texto) throw new Error(`IA: resposta vazia (${j.choices?.[0]?.finish_reason || 'sem motivo'})`);
      return texto;
    },
    async listarModelos() {
      const r = await f(`${base}/models`, { headers: cab });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erroIA('IA', r.status, j);
      return (j.data || []).map((m) => m.id);
    },
  };

  if (transcricao) {
    impl.transcrever = async (bytes, tipo) => {
      const form = new FormData();
      form.append('model', 'gpt-4o-mini-transcribe');
      form.append('file', new Blob([bytes], { type: tipo }), 'audio.ogg');
      const r = await f(`${base}/audio/transcriptions`, { method: 'POST', headers: { authorization: `Bearer ${chave}` }, body: form });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erroIA('OpenAI', r.status, j);
      return String(j.text || '').trim();
    };
  }
  return impl;
}
