// Atalhos pra Meta, pra ninguém precisar caçar botão no painel deles.
//
//   npm run meta -- numero          mostra o número: nome, qualidade, limite, status
//   npm run registrar-numero -- 123456   registra o número na Cloud API (PIN de 6 dígitos que você escolhe)
//   npm run assinar-webhook         liga o seu app na conta do WhatsApp (sem isso o webhook não chega)
//   npm run modelos                 lista seus modelos e o status de cada um
//   npm run criar-modelo [arquivo]  manda o modelo de config/modelo-abertura.json pra aprovação

import fs from 'node:fs';
import path from 'node:path';
import { criarWhatsApp } from '../src/core/whatsapp.js';
import { env, config, raiz, verde, vermelho, amarelo, cinza, negrito } from './lib/comum.mjs';

const e = env();
const c = config();
const faltam = ['META_TOKEN', 'META_PHONE_NUMBER_ID', 'META_WABA_ID'].filter((k) => !e[k]);
if (faltam.length) { console.log(vermelho(`Falta no .env: ${faltam.join(', ')}`)); process.exit(1); }
const wa = criarWhatsApp({ token: e.META_TOKEN, versao: c.meta.versao, base: e.META_BASE_URL || 'https://graph.facebook.com' });
const [cmd, arg] = process.argv.slice(2);

function falhou(err) {
  console.log(vermelho(`A Meta respondeu: ${err.codigo ?? ''} ${err.message}`));
  if (err.explicacao) console.log(amarelo(err.explicacao.texto));
  process.exit(1);
}

try {
  if (cmd === 'numero') {
    const n = await wa.chamar(`${e.META_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,name_status,quality_rating,status,platform_type,code_verification_status`);
    let limite = '?';
    try { limite = (await wa.chamar(`${e.META_PHONE_NUMBER_ID}?fields=whatsapp_business_manager_messaging_limit`)).whatsapp_business_manager_messaging_limit ?? '?'; } catch {}
    console.log(`${negrito(n.verified_name)}  ${cinza('(final ' + String(n.display_phone_number).replace(/\D/g, '').slice(-4) + ')')}`);
    console.log(`Nome de exibição: ${n.name_status}   Qualidade: ${n.quality_rating}   Status: ${n.status}   Plataforma: ${n.platform_type}`);
    console.log(`Limite de pessoas novas por dia: ${limite}`);
    if (n.platform_type !== 'CLOUD_API') console.log(amarelo('O número ainda não está na Cloud API: rode npm run registrar-numero -- 123456'));
  } else if (cmd === 'registrar') {
    const pin = arg || '';
    if (!/^\d{6}$/.test(pin)) { console.log(vermelho('Use: npm run registrar-numero -- 123456  (PIN de 6 dígitos; se o número já tem verificação em duas etapas, use o PIN dela)')); process.exit(1); }
    await wa.chamar(`${e.META_PHONE_NUMBER_ID}/register`, { corpo: { messaging_product: 'whatsapp', pin } });
    console.log(verde('Número registrado na Cloud API.'), 'Guarde esse PIN: ele vira a verificação em duas etapas do número.');
  } else if (cmd === 'assinar') {
    await wa.chamar(`${e.META_WABA_ID}/subscribed_apps`, { corpo: {} });
    const l = await wa.chamar(`${e.META_WABA_ID}/subscribed_apps`);
    console.log(verde('App ligado na conta do WhatsApp.'), cinza(`Apps assinados: ${(l.data || []).map((a) => a.whatsapp_business_api_data?.name || a.whatsapp_business_api_data?.id).join(', ')}`));
  } else if (cmd === 'modelos') {
    const l = await wa.chamar(`${e.META_WABA_ID}/message_templates?fields=name,status,language,category,rejected_reason&limit=100`);
    if (!l.data?.length) console.log(amarelo('Nenhum modelo ainda. Crie com: npm run criar-modelo'));
    for (const m of l.data || []) {
      const st = m.status === 'APPROVED' ? verde('APROVADO') : m.status === 'REJECTED' ? vermelho('REJEITADO') : amarelo(m.status);
      console.log(`${st.padEnd(20)} ${m.name}  ${cinza(`${m.language} · ${m.category}${m.rejected_reason && m.rejected_reason !== 'NONE' ? ' · motivo: ' + m.rejected_reason : ''}`)}`);
    }
  } else if (cmd === 'criar-modelo') {
    const arq = arg || path.join(raiz, 'config', 'modelo-abertura.json');
    const m = JSON.parse(fs.readFileSync(arq, 'utf8'));
    const nVars = new Set((m.body.match(/\{\{\s*(\d+)\s*\}\}/g) || [])).size;
    if (nVars !== (m.exemplos || []).length) { console.log(vermelho(`O texto tem ${nVars} variáveis mas "exemplos" tem ${(m.exemplos || []).length}. Precisa de um exemplo por variável.`)); process.exit(1); }
    if (/^\s*\{\{|\{\{\d+\}\}\s*$/.test(m.body)) { console.log(vermelho('A Meta recusa modelo que começa ou termina com variável. Ponha texto antes e depois.')); process.exit(1); }
    if (!/^[a-z0-9_]+$/.test(m.name)) { console.log(vermelho('O nome do modelo só pode ter letras minúsculas, números e _ (ex.: abertura_loja).')); process.exit(1); }
    const comps = [{ type: 'BODY', text: m.body, ...(nVars ? { example: { body_text: [m.exemplos] } } : {}) }];
    if (m.botoes?.length) comps.push({ type: 'BUTTONS', buttons: m.botoes.map((t) => ({ type: 'QUICK_REPLY', text: t })) });
    const r = await wa.chamar(`${e.META_WABA_ID}/message_templates`, { corpo: { name: m.name, language: m.language || 'pt_BR', category: m.category || 'MARKETING', parameter_format: 'POSITIONAL', components: comps } });
    console.log(verde(`Modelo "${m.name}" enviado pra Meta.`), `Status: ${r.status}. A aprovação costuma levar de minutos a algumas horas. Confira com: npm run modelos`);
  } else {
    console.log('Comandos: numero | registrar PIN | assinar | modelos | criar-modelo [arquivo]');
  }
} catch (err) { falhou(err); }
