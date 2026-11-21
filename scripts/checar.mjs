// npm run checar
// Confere TUDO e diz exatamente o que falta. Rode depois de cada passo.
// Nunca imprime chave nem token.

import fs from 'node:fs';
import path from 'node:path';
import { env as lerEnv, configJson, raiz, verde, vermelho, amarelo, cinza, negrito } from './lib/comum.mjs';
import { carregarConfig, validarConfig } from '../src/core/config.js';
import { criarIA, PROVEDORES } from '../src/core/ia/index.js';
import { criarWhatsApp } from '../src/core/whatsapp.js';

const so = process.argv[2]; // npm run checar -- ia | meta | robo
const e = lerEnv();
let erros = 0, avisos = 0;
const ok = (t) => console.log(`  ${verde('ok')}     ${t}`);
const erro = (t, como) => { erros++; console.log(`  ${vermelho('ERRO')}   ${t}`); if (como) console.log(`         ${cinza('-> ' + como)}`); };
const aviso = (t, como) => { avisos++; console.log(`  ${amarelo('aviso')}  ${t}`); if (como) console.log(`         ${cinza('-> ' + como)}`); };
const secao = (t) => console.log(`\n${negrito(t)}`);

// ---------------------------------------------------------------- base
secao('1. Base');
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj > 22 || (maj === 22 && min >= 13)) ok(`Node ${process.versions.node}`);
else erro(`Node ${process.versions.node} é antigo`, 'Instale o Node 22 LTS ou mais novo em https://nodejs.org');
if (!fs.existsSync(path.join(raiz, '.env'))) erro('Arquivo .env não existe', 'cp .env.exemplo .env');
let c;
try {
  c = carregarConfig(configJson());
  const p = validarConfig(c);
  if (p.length) p.forEach((x) => erro(`config/robo.json: ${x}`)); else ok(`config/robo.json (${c.negocio})`);
} catch (x) { erro(`config/robo.json não abre: ${x.message}`, 'Confira vírgulas e aspas (JSON)'); process.exit(1); }
const atend = fs.existsSync(path.join(raiz, 'config/atendente.md')) ? fs.readFileSync(path.join(raiz, 'config/atendente.md'), 'utf8') : '';
if (!atend.trim()) erro('config/atendente.md vazio', 'É o prompt do atendente. Peça pro Claude montar com você.');
else if (atend.includes('Studio Exemplo') && c.negocio !== 'Studio Exemplo') aviso('config/atendente.md ainda é o exemplo do Studio Exemplo', 'Troque pelo do seu negócio');
else ok(`config/atendente.md (${atend.length} caracteres)`);
if (!e.PAINEL_SENHA) erro('PAINEL_SENHA vazio', 'Gere uma: node -e "console.log(crypto.randomUUID())"');
else if (e.PAINEL_SENHA.length < 12) aviso('PAINEL_SENHA curta (menos de 12 caracteres)');
else ok('PAINEL_SENHA definida');

// ---------------------------------------------------------------- IA
if (!so || so === 'ia') {
  secao(`2. IA (${c.ia.provedor})`);
  const info = PROVEDORES[c.ia.provedor];
  if (!info) erro(`provedor "${c.ia.provedor}" não existe`, `Use: ${Object.keys(PROVEDORES).join(', ')}`);
  else if (!e[info.chave]) erro(`Falta ${info.chave} no .env`, info.site ? `Crie a chave em ${info.site}` : 'Preencha a chave do seu provedor');
  else {
    try {
      const ia = criarIA({ provedor: c.ia.provedor, modelo: c.ia.modelo, env: e, maxTokens: c.ia.max_tokens });
      try {
        const lista = await ia.listarModelos();
        if (lista.includes(ia.modelo) || lista.includes(`models/${ia.modelo}`)) ok(`modelo "${ia.modelo}" existe na sua conta`);
        else aviso(`modelo "${ia.modelo}" não aparece na lista da sua conta`, `Alguns parecidos: ${lista.filter((m) => /flash|mini|haiku|lite|nano|auto/i.test(m)).slice(0, 6).join(', ') || lista.slice(0, 6).join(', ')}`);
      } catch (x) { aviso(`não consegui listar os modelos: ${x.message}`); }
      const t0 = Date.now();
      const r = await ia.responder('Você é um teste de conexão. Responda exatamente: OK', [{ papel: 'cliente', texto: 'teste' }]);
      ok(`IA respondeu em ${((Date.now() - t0) / 1000).toFixed(1)} s ("${r.slice(0, 30)}")`);
      if (c.atendimento.audio && !ia.temAudio) aviso(`${c.ia.provedor} não ouve áudio: o robô vai pedir pro cliente escrever`, 'Gemini e OpenAI ouvem áudio');
      if (c.ia.provedor === 'gemini') aviso('No plano grátis do Gemini, o Google pode usar as conversas pra melhorar os produtos dele', 'Com dados de cliente, considere ativar o faturamento (aí deixa de usar). Veja docs/06-custos.md');
    } catch (x) {
      erro(`IA falhou: ${x.message}`, x.status === 401 || x.status === 403 ? 'Chave errada ou sem permissão' : x.status === 429 ? 'Limite estourado (plano grátis?). Espere ou ative o faturamento' : x.status === 404 ? 'Nome do modelo errado em config/robo.json (ia.modelo)' : 'Confira a chave e o modelo');
    }
  }
}

// ---------------------------------------------------------------- Meta
if (!so || so === 'meta') {
  secao('3. Meta (WhatsApp oficial)');
  const faltam = ['META_TOKEN', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_PHONE_NUMBER_ID', 'META_WABA_ID'].filter((k) => !e[k]);
  if (faltam.length) erro(`Falta no .env: ${faltam.join(', ')}`, 'Siga docs/02-meta-passo-a-passo.md');
  if (e.META_TOKEN && e.META_PHONE_NUMBER_ID) {
    const wa = criarWhatsApp({ token: e.META_TOKEN, versao: c.meta.versao, base: e.META_BASE_URL || 'https://graph.facebook.com' });
    const tentar = async (f) => { try { return await f(); } catch (x) { return { _erro: x }; } };

    // token: é permanente?
    const dbg = await tentar(() => wa.chamar(`debug_token?input_token=${encodeURIComponent(e.META_TOKEN)}`));
    if (!dbg._erro && dbg.data) {
      const d = dbg.data;
      if (!d.is_valid) erro('Token inválido ou expirado', 'Gere de novo (docs/02, passo 5)');
      else if (d.expires_at && d.expires_at !== 0) {
        const dias = Math.round((d.expires_at * 1000 - Date.now()) / 86400e3);
        erro(`Token TEMPORÁRIO: expira em ${dias <= 0 ? 'menos de 1 dia' : dias + ' dias'}`, 'Esse é o token de teste. Gere o PERMANENTE pelo usuário do sistema (docs/02, passo 5) e escolha "Nunca expira"');
      } else ok('Token permanente (não expira)');
      const esc = d.scopes || [];
      for (const s of ['whatsapp_business_messaging', 'whatsapp_business_management']) if (!esc.includes(s)) erro(`Token sem a permissão ${s}`, 'Gere de novo marcando as duas permissões do WhatsApp');
    }

    const n = await tentar(() => wa.chamar(`${e.META_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,name_status,quality_rating,status,platform_type,code_verification_status`));
    if (n._erro) erro(`Não consegui ler o número: ${n._erro.codigo ?? ''} ${n._erro.message}`, n._erro.codigo === 100 ? 'META_PHONE_NUMBER_ID errado (é o ID do número, não o telefone) ou o token não tem acesso a ele' : n._erro.explicacao?.texto);
    else {
      ok(`Número "${n.verified_name}" (final ${String(n.display_phone_number).replace(/\D/g, '').slice(-4)})`);
      if (/test/i.test(n.verified_name) || /^1555/.test(String(n.display_phone_number).replace(/\D/g, ''))) aviso('Parece o número de TESTE da Meta: só manda pra até 5 números cadastrados', 'Pra valer, adicione seu número real (docs/02, passo 3)');
      if (n.platform_type && n.platform_type !== 'CLOUD_API') erro(`Número não está na Cloud API (está em ${n.platform_type})`, 'npm run registrar-numero -- 123456');
      else ok('Registrado na Cloud API');
      if (n.name_status && !['APPROVED', 'AVAILABLE_WITHOUT_REVIEW'].includes(n.name_status)) aviso(`Nome de exibição: ${n.name_status}`, 'Enquanto não aprova, o nome não aparece pro cliente. Acompanhe no WhatsApp Manager');
      if (n.quality_rating === 'RED') erro('Qualidade do número: VERMELHA', 'Pare a prospecção e revise a abertura e a lista. Muita gente bloqueando');
      else if (n.quality_rating === 'YELLOW') aviso('Qualidade do número: AMARELA', 'Diminua o limite_dia e revise a abertura');
      else if (n.quality_rating) ok(`Qualidade: ${n.quality_rating}`);
      const lim = await tentar(() => wa.chamar(`${e.META_PHONE_NUMBER_ID}?fields=whatsapp_business_manager_messaging_limit`));
      const tier = lim?.whatsapp_business_manager_messaging_limit;
      if (tier) {
        const max = { TIER_250: 250, TIER_2K: 2000, TIER_10K: 10000, TIER_100K: 100000 }[tier] ?? Infinity;
        if (c.prospeccao.ligada && c.prospeccao.limite_dia > max) erro(`limite_dia (${c.prospeccao.limite_dia}) acima do seu limite na Meta (${tier})`, `Baixe pra no máximo ${max}`);
        else ok(`Limite da Meta: ${tier}`);
      }
    }

    const sub = await tentar(() => wa.chamar(`${e.META_WABA_ID}/subscribed_apps`));
    if (sub._erro) erro(`Não consegui ler a conta do WhatsApp: ${sub._erro.message}`, 'META_WABA_ID errado ou token sem acesso à conta');
    else if (!sub.data?.length) erro('Nenhum app assinado na conta do WhatsApp: o webhook NÃO vai chegar', 'npm run assinar-webhook');
    else ok('App assinado na conta do WhatsApp (webhook liberado)');

    if (c.prospeccao.ligada || c.prospeccao.modelo) {
      const mods = await tentar(() => wa.chamar(`${e.META_WABA_ID}/message_templates?name=${encodeURIComponent(c.prospeccao.modelo)}&fields=name,status,language,components`));
      const m = (mods.data || []).find((x) => x.name === c.prospeccao.modelo && x.language === c.prospeccao.idioma);
      if (mods._erro) erro(`Não consegui ler os modelos: ${mods._erro.message}`);
      else if (!m) erro(`Modelo "${c.prospeccao.modelo}" (${c.prospeccao.idioma}) não existe`, 'Crie com npm run criar-modelo, ou confira nome e idioma em config/robo.json');
      else if (m.status !== 'APPROVED') (m.status === 'REJECTED' ? erro : aviso)(`Modelo "${m.name}": ${m.status}`, m.status === 'REJECTED' ? 'Reescreva sem promessa exagerada e crie com outro nome' : 'Espere a aprovação (npm run modelos)');
      else {
        const corpo = m.components?.find((x) => x.type === 'BODY')?.text || '';
        const vars = new Set(corpo.match(/\{\{\s*[\w]+\s*\}\}/g) || []).size;
        if (vars !== c.prospeccao.parametros.length) erro(`Modelo tem ${vars} variáveis mas config/robo.json tem ${c.prospeccao.parametros.length} parâmetros`, 'Um parâmetro por variável, na ordem');
        else ok(`Modelo "${m.name}" aprovado, ${vars} variáveis batendo com a config`);
        if (!c.prospeccao.texto_para_ia) aviso('prospeccao.texto_para_ia vazio', `Cole o texto do modelo lá pra IA saber o que foi dito: "${corpo.slice(0, 80)}..."`);
      }
    } else aviso('Prospecção desligada (só atende quem chamar)', 'Pra abordar sua lista, ligue em config/robo.json');
    console.log(cinza('         Forma de pagamento: confira em business.facebook.com > Cobrança. Sem ela dá erro 131042 (a API não deixa conferir isso).'));
  }
}

// ---------------------------------------------------------------- robô publicado
if (!so || so === 'robo') {
  secao('4. Robô no ar');
  if (!e.ROBO_URL) aviso('Ainda não publicado (ROBO_URL vazio)', 'Cloudflare: npm run publicar:cloudflare   |   Servidor: docs/04-hospedagem.md');
  else {
    const u = e.ROBO_URL.replace(/\/$/, '');
    try {
      const s = await (await fetch(`${u}/saude`)).json();
      ok(`${u} respondendo (${s.plataforma}, v${s.versao})`);
      const ch = String(Math.floor(Math.random() * 1e9));
      const r = await fetch(`${u}/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(e.META_VERIFY_TOKEN || '')}&hub.challenge=${ch}`);
      if (r.ok && (await r.text()) === ch) ok('Webhook aceita o token de verificação');
      else erro('Webhook recusou o token de verificação', 'O META_VERIFY_TOKEN do .env é diferente do que está no robô publicado. Publique de novo');
      const sem = await fetch(`${u}/webhook`, { method: 'POST', body: '{}' });
      if (sem.status === 401) ok('Webhook recusa mensagem falsa (assinatura ligada)');
      else erro(`Webhook aceitou mensagem sem assinatura (status ${sem.status})`, 'Confira META_APP_SECRET no robô publicado');
      const p = await fetch(`${u}/painel`);
      if (p.status === 401) ok(`Painel protegido por senha: ${u}/painel`);
      else erro(`Painel respondeu ${p.status} sem senha`);
      console.log(cinza(`         Na Meta, a URL de callback é: ${u}/webhook  (campo "messages" assinado)`));
    } catch (x) { erro(`${u} não responde: ${x.message}`); }
  }
}

console.log('');
if (erros) { console.log(vermelho(negrito(`${erros} erro(s)`)) + (avisos ? amarelo(`, ${avisos} aviso(s)`) : '') + '. Resolva os erros e rode de novo.'); process.exit(1); }
console.log(verde(negrito('Tudo certo.')) + (avisos ? amarelo(` ${avisos} aviso(s) pra ler.`) : ''));
