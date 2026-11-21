// Uma porta só pra qualquer IA. O robô chama responder() e transcrever()
// sem saber se do outro lado é Gemini, GPT, Claude ou outra.
//
// Provedores:
//   gemini            Google (tem plano grátis)          GEMINI_API_KEY
//   openai            ChatGPT / GPT                      OPENAI_API_KEY
//   anthropic         Claude                             ANTHROPIC_API_KEY
//   openrouter        centenas de modelos numa chave só  OPENROUTER_API_KEY
//   compativel        qualquer API no formato da OpenAI  IA_API_KEY + IA_BASE_URL
//                     (Groq, DeepSeek, Together, Ollama no seu PC...)

import { gemini } from './gemini.js';
import { openai } from './openai.js';
import { anthropic } from './anthropic.js';

export const PROVEDORES = {
  gemini: { chave: 'GEMINI_API_KEY', modelo: 'gemini-flash-lite-latest', audio: true, site: 'https://aistudio.google.com/apikey' },
  openai: { chave: 'OPENAI_API_KEY', modelo: 'gpt-5-mini', audio: true, site: 'https://platform.openai.com/api-keys' },
  anthropic: { chave: 'ANTHROPIC_API_KEY', modelo: 'claude-haiku-5-5', audio: false, site: 'https://console.anthropic.com/settings/keys' },
  openrouter: { chave: 'OPENROUTER_API_KEY', modelo: 'openrouter/auto', audio: false, site: 'https://openrouter.ai/keys', base: 'https://openrouter.ai/api/v1' },
  compativel: { chave: 'IA_API_KEY', modelo: '', audio: false, site: '' },
};

// Junta mensagens seguidas do mesmo lado e garante que a conversa começa pelo cliente.
// Gemini e Claude reclamam de conversa que começa pelo robô (a abertura da prospecção).
export function normalizar(historico) {
  const out = [];
  for (const m of historico) {
    const papel = m.papel === 'robo' ? 'robo' : 'cliente';
    const texto = String(m.texto ?? '').trim();
    if (!texto) continue;
    const ult = out[out.length - 1];
    if (ult && ult.papel === papel) ult.texto += '\n' + texto;
    else out.push({ papel, texto });
  }
  if (out[0]?.papel === 'robo') out.unshift({ papel: 'cliente', texto: '(início da conversa: o robô mandou a primeira mensagem)' });
  if (!out.length) out.push({ papel: 'cliente', texto: '(sem mensagens)' });
  return out;
}

export function criarIA({ provedor, modelo, env, maxTokens = 2048, temperatura = 0.6, fetch: f = fetch }) {
  const info = PROVEDORES[provedor];
  if (!info) throw new Error(`Provedor de IA desconhecido: "${provedor}". Use: ${Object.keys(PROVEDORES).join(', ')}`);
  const chave = env[info.chave];
  if (!chave) throw new Error(`Falta a chave ${info.chave} (provedor ${provedor}).`);
  const opc = { chave, modelo: modelo || info.modelo, maxTokens, temperatura, fetch: f };

  let impl;
  if (provedor === 'gemini') impl = gemini(opc);
  else if (provedor === 'anthropic') impl = anthropic(opc);
  else if (provedor === 'openai') impl = openai({ ...opc, base: env.IA_BASE_URL || 'https://api.openai.com/v1', transcricao: true });
  else if (provedor === 'openrouter') impl = openai({ ...opc, base: info.base, extras: { 'HTTP-Referer': 'https://github.com', 'X-Title': 'robo-whatsapp-24h' } });
  else {
    if (!env.IA_BASE_URL) throw new Error('Provedor "compativel" precisa de IA_BASE_URL (ex.: https://api.groq.com/openai/v1).');
    if (!opc.modelo) throw new Error('Provedor "compativel" precisa do nome do modelo em config/robo.json (ia.modelo).');
    impl = openai({ ...opc, base: env.IA_BASE_URL.replace(/\/$/, '') });
  }

  return {
    provedor,
    modelo: opc.modelo,
    temAudio: Boolean(impl.transcrever),
    // sistema: texto das regras; historico: [{ papel: 'cliente'|'robo', texto }]
    responder: (sistema, historico) => impl.responder(sistema, normalizar(historico)),
    transcrever: impl.transcrever ? (bytes, tipo) => impl.transcrever(bytes, tipo) : null,
    listarModelos: () => impl.listarModelos(),
  };
}
