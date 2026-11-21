import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chave, paraEnvio, valido, mascarar } from '../src/core/numero.js';
import { assinar, assinaturaValida } from '../src/core/assinatura.js';
import { lerCSV } from '../src/core/csv.js';
import { extrairMarcas, metaAteAgora, parametrosDoModelo, textoAbertura } from '../src/core/robo.js';
import { carregarConfig, validarConfig } from '../src/core/config.js';
import { normalizar, criarIA } from '../src/core/ia/index.js';
import { lerWebhook, explicarErro } from '../src/core/whatsapp.js';
import { partes, inicioDoDia } from '../src/core/tempo.js';
import { webhookMensagem } from './falsos.mjs';

test('número: o 9 do celular não duplica contato', () => {
  assert.equal(chave('(43) 99999-8888'), chave('554399998888'));
  assert.equal(chave('5543999998888'), '554399998888');
  assert.equal(paraEnvio('43 99999-8888'), '5543999998888');
  assert.equal(paraEnvio('043 99999-8888'), '5543999998888');
  assert.equal(chave('5215512345678'), '525512345678');
  assert.ok(valido('5543999998888'));
  assert.ok(!valido('0800 123 4567'));
  assert.ok(!valido('123'));
  assert.ok(!valido('0000000000'));
  assert.equal(mascarar('5543999998888'), '•••• 8888');
});

test('assinatura da Meta: aceita a certa, recusa a errada', async () => {
  const corpo = '{"a":1}';
  const sig = await assinar('segredo', corpo);
  assert.ok(await assinaturaValida('segredo', corpo, sig));
  assert.ok(!(await assinaturaValida('outro', corpo, sig)));
  assert.ok(!(await assinaturaValida('segredo', corpo + ' ', sig)));
  assert.ok(!(await assinaturaValida('', corpo, sig)));
  assert.ok(!(await assinaturaValida('segredo', corpo, null)));
});

test('CSV: ponto e vírgula, aspas, BOM e nomes de coluna variados', () => {
  const { linhas, temTelefone, colunas } = lerCSV('﻿Nome Fantasia;Celular;Município;Categoria;Nota\n"Clínica ""Sorriso""";(43) 99999-8888;Londrina;Dentista;4,8\n\n;;;;\nPet Feliz;43988887777;Maringá;Pet shop;');
  assert.ok(temTelefone);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].empresa, 'Clínica "Sorriso"');
  assert.equal(linhas[0].telefone, '(43) 99999-8888');
  assert.equal(linhas[0].cidade, 'Londrina');
  assert.equal(linhas[0].nicho, 'Dentista');
  assert.equal(linhas[0].nota, '4,8');
  assert.equal(colunas['Celular'], 'telefone');
  const virg = lerCSV('phone,name,title\n5511911112222,Ana,"Loja, da Ana"');
  assert.equal(virg.linhas[0].empresa, 'Loja, da Ana');
  assert.equal(virg.linhas[0].nome, 'Ana');
});

test('marcas da IA saem do texto e viram ação', () => {
  const r = extrairMarcas('Vou chamar alguém.\n[HUMANO: quer desconto]');
  assert.equal(r.texto, 'Vou chamar alguém.');
  assert.deepEqual(r.marcas, [{ nome: 'HUMANO', info: 'quer desconto' }]);
  assert.deepEqual(extrairMarcas('[IGNORAR]'), { texto: '', marcas: [{ nome: 'IGNORAR', info: '' }] });
  assert.equal(extrairMarcas('Tchau [NÃO_CONTATAR]').marcas[0].nome, 'NAO_CONTATAR');
  assert.equal(extrairMarcas('texto normal [com colchete]').texto, 'texto normal [com colchete]');
});

test('prospecção espalha os envios ao longo do dia e respeita dia/horário', () => {
  const c = carregarConfig({ prospeccao: { ligada: true, limite_dia: 30, hora_inicio: 9, hora_fim: 18, dias: [1, 2, 3, 4, 5] } });
  const ms = (iso) => Date.parse(iso);
  assert.equal(metaAteAgora(c, ms('2026-11-23T11:59:00Z')), 0, '08:59 em SP: antes do horário');
  assert.equal(metaAteAgora(c, ms('2026-11-23T12:00:00Z')), 1, '09:00: primeiro envio');
  const meio = metaAteAgora(c, ms('2026-11-23T16:30:00Z'));
  assert.ok(meio > 10 && meio < 20, `13:30 deveria estar no meio, deu ${meio}`);
  assert.equal(metaAteAgora(c, ms('2026-11-23T19:59:00Z')), 30, '16:59: limite cheio');
  assert.equal(metaAteAgora(c, ms('2026-11-23T20:00:00Z')), 0, '17:00: para 1h antes do fim');
  assert.equal(metaAteAgora(c, ms('2026-11-22T15:00:00Z')), 0, 'domingo');
});

test('parâmetros do modelo: campo vazio usa o padrão (senão a Meta recusa)', () => {
  const c = carregarConfig({ prospeccao: { parametros: [{ campo: 'nome', padrao: 'tudo bem' }, { campo: 'empresa', padrao: 'sua empresa' }], texto_para_ia: 'Oi, {{1}}! Vi a {{2}}.' } });
  const p = parametrosDoModelo(c, { nome: '', empresa: '  Pet   Feliz ' });
  assert.deepEqual(p, [{ nome: '1', valor: 'tudo bem' }, { nome: '2', valor: 'Pet Feliz' }]);
  assert.equal(textoAbertura(c, p), 'Oi, tudo bem! Vi a Pet Feliz.');
  const extra = parametrosDoModelo(carregarConfig({ prospeccao: { parametros: [{ nome: 'nota', campo: 'nota', padrao: '5' }] } }), { extra: '{"nota":"4,9"}' });
  assert.deepEqual(extra, [{ nome: 'nota', valor: '4,9' }]);
});

test('config: pega erros antes de ir pro ar', () => {
  assert.deepEqual(validarConfig(carregarConfig({})), []);
  const ruim = validarConfig(carregarConfig({ fuso: 'Marte/Base', prospeccao: { ligada: true, modelo: '', parametros: [{ campo: 'nome' }], limite_dia: 500 } }));
  assert.ok(ruim.some((x) => x.includes('fuso')));
  assert.ok(ruim.some((x) => x.includes('modelo está vazio')));
  assert.ok(ruim.some((x) => x.includes('padrao')));
  assert.ok(ruim.some((x) => x.includes('250')));
});

test('histórico pra IA: junta mensagens seguidas e começa pelo cliente', () => {
  const n = normalizar([{ papel: 'robo', texto: 'Oi, vi sua loja' }, { papel: 'cliente', texto: 'oi' }, { papel: 'cliente', texto: 'quanto custa?' }, { papel: 'robo', texto: ' ' }]);
  assert.equal(n[0].papel, 'cliente');
  assert.equal(n[1].papel, 'robo');
  assert.equal(n[2].texto, 'oi\nquanto custa?');
  assert.equal(n.length, 3);
});

test('webhook: lê texto, áudio, botão e ignora reação', () => {
  const w = webhookMensagem({ texto: 'olá' });
  w.entry[0].changes[0].value.messages.push(
    { from: '5543999998888', id: 'a', timestamp: '1', type: 'reaction', reaction: { emoji: 'x' } },
    { from: '5543999998888', id: 'b', timestamp: '1', type: 'button', button: { text: 'Quero ver' } },
    { from: '5543999998888', id: 'c', timestamp: '1', type: 'image', image: { caption: 'meu logo' } },
  );
  const { msgs } = lerWebhook(w);
  assert.equal(msgs.length, 3);
  assert.equal(msgs[0].texto, 'olá');
  assert.equal(msgs[0].nomePerfil, 'Cliente');
  assert.equal(msgs[1].texto, 'Quero ver');
  assert.equal(msgs[2].texto, '(o cliente mandou uma foto: meu logo)');
  assert.equal(explicarErro(131042).acao, 'travar');
  assert.equal(explicarErro(131026).acao, 'contato');
});

test('fuso: meia-noite de SP, não de Londres', () => {
  const ms = Date.parse('2026-11-23T02:30:00Z'); // 23:30 do dia 22 em SP
  assert.equal(partes(ms, 'America/Sao_Paulo').dia, 22);
  assert.equal(new Date(inicioDoDia(ms, 'America/Sao_Paulo')).toISOString(), '2026-11-22T03:00:00.000Z');
});

// ---- formato exato que cada IA espera (sem chamar a internet)
function fetchEspiao(resposta) {
  const chamadas = [];
  const f = async (url, op) => { chamadas.push({ url, op, corpo: op?.body && typeof op.body === 'string' ? JSON.parse(op.body) : null }); return new Response(JSON.stringify(resposta), { status: 200 }); };
  return { f, chamadas };
}
const hist = [{ papel: 'robo', texto: 'abertura' }, { papel: 'cliente', texto: 'oi' }];

test('Gemini: chave no cabeçalho, instrução de sistema e papéis certos', async () => {
  const { f, chamadas } = fetchEspiao({ candidates: [{ content: { parts: [{ text: 'pensando', thought: true }, { text: 'Olá!' }] } }] });
  const ia = criarIA({ provedor: 'gemini', env: { GEMINI_API_KEY: 'k' }, fetch: f });
  assert.equal(await ia.responder('regras', hist), 'Olá!');
  const c = chamadas[0];
  assert.match(c.url, /models\/gemini-flash-lite-latest:generateContent$/);
  assert.equal(c.op.headers['x-goog-api-key'], 'k');
  assert.equal(c.corpo.systemInstruction.parts[0].text, 'regras');
  assert.deepEqual(c.corpo.contents.map((x) => x.role), ['user', 'model', 'user']);
  assert.ok(ia.temAudio);
});

test('OpenAI: max_completion_tokens e mensagem de sistema', async () => {
  const { f, chamadas } = fetchEspiao({ choices: [{ message: { content: 'ok' } }] });
  const ia = criarIA({ provedor: 'openai', modelo: 'gpt-x', env: { OPENAI_API_KEY: 'k' }, fetch: f });
  assert.equal(await ia.responder('regras', hist), 'ok');
  const c = chamadas[0].corpo;
  assert.equal(c.model, 'gpt-x');
  assert.equal(c.messages[0].role, 'system');
  assert.ok(c.max_completion_tokens && c.temperature === undefined);
});

test('Claude: system separado, versão da API no cabeçalho', async () => {
  const { f, chamadas } = fetchEspiao({ content: [{ type: 'text', text: 'oi!' }] });
  const ia = criarIA({ provedor: 'anthropic', env: { ANTHROPIC_API_KEY: 'k' }, fetch: f });
  assert.equal(await ia.responder('regras', hist), 'oi!');
  assert.equal(chamadas[0].op.headers['anthropic-version'], '2023-06-01');
  assert.equal(chamadas[0].corpo.system, 'regras');
  assert.equal(chamadas[0].corpo.messages[0].role, 'user');
  assert.equal(ia.temAudio, false);
});

test('OpenRouter e compatível: max_tokens + base certa; erro claro sem chave', async () => {
  const { f, chamadas } = fetchEspiao({ choices: [{ message: { content: 'ok' } }] });
  await criarIA({ provedor: 'openrouter', env: { OPENROUTER_API_KEY: 'k' }, fetch: f }).responder('r', hist);
  assert.match(chamadas[0].url, /^https:\/\/openrouter\.ai\/api\/v1\/chat\/completions$/);
  assert.ok(chamadas[0].corpo.max_tokens);
  await criarIA({ provedor: 'compativel', modelo: 'llama', env: { IA_API_KEY: 'k', IA_BASE_URL: 'https://api.groq.com/openai/v1/' }, fetch: f }).responder('r', hist);
  assert.match(chamadas[1].url, /^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/);
  assert.throws(() => criarIA({ provedor: 'gemini', env: {} }), /GEMINI_API_KEY/);
  assert.throws(() => criarIA({ provedor: 'xyz', env: {} }), /desconhecido/);
});
