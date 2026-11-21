// Google Gemini (AI Studio). Chave grátis em https://aistudio.google.com/apikey
// O nome "gemini-flash-lite-latest" sempre aponta pro Flash-Lite mais novo,
// então o robô não quebra quando o Google aposenta um modelo.

import { erroIA } from './erro.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

function base64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function gemini({ chave, modelo, maxTokens, temperatura, fetch: f }) {
  async function gerar(corpo) {
    const nome = modelo.replace(/^models\//, '');
    const r = await f(`${BASE}/models/${nome}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': chave, 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw erroIA('Gemini', r.status, j);
    const c = j.candidates?.[0];
    const texto = (c?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    if (!texto) throw new Error(`Gemini: resposta vazia (${c?.finishReason || j.promptFeedback?.blockReason || 'sem motivo'})`);
    return texto;
  }

  return {
    responder(sistema, historico) {
      return gerar({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: historico.map((m) => ({ role: m.papel === 'robo' ? 'model' : 'user', parts: [{ text: m.texto }] })),
        generationConfig: { maxOutputTokens: maxTokens, temperature: temperatura },
      });
    },
    transcrever(bytes, tipo) {
      return gerar({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: tipo.split(';')[0], data: base64(bytes) } },
          { text: 'Transcreva este áudio palavra por palavra, no idioma falado. Responda só com a transcrição.' },
        ] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0 },
      });
    },
    async listarModelos() {
      const out = [];
      let token = '';
      do {
        const r = await f(`${BASE}/models?pageSize=1000${token ? `&pageToken=${token}` : ''}`, { headers: { 'x-goog-api-key': chave } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw erroIA('Gemini', r.status, j);
        for (const m of j.models || []) if ((m.supportedGenerationMethods || []).includes('generateContent')) out.push(m.name.replace(/^models\//, ''));
        token = j.nextPageToken || '';
      } while (token);
      return out;
    },
  };
}
