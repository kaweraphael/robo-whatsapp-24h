// Robô inteiro rodando (versão Node) contra uma Meta e uma IA falsas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar } from '../src/plataformas/node.js';
import { assinar } from '../src/core/assinatura.js';
import { servidorFalso, webhookMensagem, webhookStatus, esperar } from './falsos.mjs';

let falso, robo, base;
const SEGREDO = 'segredo-do-app';
const SENHA = 'senha-painel';
const auth = { authorization: 'Basic ' + btoa('x:' + SENHA) };

const config = {
  negocio: 'Loja Teste',
  ia: { provedor: 'compativel', modelo: 'modelo-falso' },
  atendimento: { espera_segundos: 0, audio: true },
  prospeccao: {
    ligada: true, modelo: 'abertura', parametros: [{ campo: 'nome', padrao: 'tudo bem' }, { campo: 'empresa', padrao: 'sua empresa' }],
    texto_para_ia: 'Olá, {{1}}! Vi a {{2}} no Google.', limite_dia: 1000, hora_inicio: 0, hora_fim: 24, dias: [0, 1, 2, 3, 4, 5, 6],
  },
};

async function webhook(corpo, { assinatura = true } = {}) {
  const b = JSON.stringify(corpo);
  const h = { 'content-type': 'application/json' };
  if (assinatura) h['x-hub-signature-256'] = await assinar(SEGREDO, b);
  return fetch(`${base}/webhook`, { method: 'POST', headers: h, body: b });
}
const db = () => robo.ctx.db;
const contato = (id) => db().first('SELECT * FROM contatos WHERE id = ?', id);
async function ate(cond, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await esperar(30); } return false; }

before(async () => {
  falso = await servidorFalso();
  robo = await iniciar({
    porta: 0, arquivoBanco: ':memory:', intervaloMs: 3_600_000, silencioso: true, configJson: config,
    atendente: 'Você é a atendente da Loja Teste.', agora: () => Date.now(),
    env: { META_TOKEN: 'tok', META_APP_SECRET: SEGREDO, META_VERIFY_TOKEN: 'verifica', META_PHONE_NUMBER_ID: 'NUM1', META_BASE_URL: falso.base, IA_API_KEY: 'k', IA_BASE_URL: falso.base + '/v1', PAINEL_SENHA: SENHA },
  });
  base = `http://127.0.0.1:${robo.porta}`;
});
after(() => { robo?.fechar(); falso?.fechar(); });

test('a Meta consegue verificar o webhook (e um token errado não passa)', async () => {
  let r = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=12345`);
  assert.equal(r.status, 200); assert.equal(await r.text(), '12345');
  r = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1`);
  assert.equal(r.status, 403);
});

test('webhook sem assinatura da Meta é recusado', async () => {
  const r = await webhook(webhookMensagem({ de: '5511911110000' }), { assinatura: false });
  assert.equal(r.status, 401);
  assert.equal(await contato('551111110000'), null);
});

test('cliente manda mensagem -> robô responde pela IA', async () => {
  falso.enviados.length = 0;
  const r = await webhook(webhookMensagem({ de: '5543999990001', texto: 'quanto custa?', nome: 'Ana' }));
  assert.equal(r.status, 200);
  assert.ok(await ate(() => falso.enviados.some((e) => e.type === 'text')), 'robô não respondeu');
  const env = falso.enviados.find((e) => e.type === 'text');
  assert.equal(env.to, '5543999990001');
  assert.equal(env.text.body, 'Resposta da IA para: quanto custa?');
  assert.equal(env.auth, 'Bearer tok');
  const c = await contato('554399990001');
  assert.equal(c.nome, 'Ana'); assert.equal(c.origem, 'entrou'); assert.equal(c.estado, 'conversa');
  // a IA recebeu as regras do sistema, o nome do negócio e a política da Meta
  const sis = falso.iaPedidos.at(-1).messages[0].content;
  assert.match(sis, /Loja Teste/); assert.match(sis, /uso geral/);
});

test('a Meta reenviando a mesma mensagem não gera resposta dobrada', async () => {
  falso.enviados.length = 0;
  const w = webhookMensagem({ de: '5543999990002', texto: 'oi', id: 'wamid.repetida' });
  await webhook(w); await webhook(w);
  await ate(() => falso.enviados.length > 0); await esperar(200);
  assert.equal(falso.enviados.filter((e) => e.type === 'text').length, 1);
  assert.equal((await db().first("SELECT count(*) AS n FROM mensagens WHERE wa_id = 'wamid.repetida'")).n, 1);
});

test('pediu pessoa -> robô avisa e para de responder', async () => {
  falso.enviados.length = 0;
  await webhook(webhookMensagem({ de: '5543999990003', texto: 'quero falar com um humano' }));
  assert.ok(await ate(async () => (await contato('554399990003'))?.estado === 'humano'));
  assert.equal(falso.enviados.find((e) => e.type === 'text').text.body, 'Claro, vou chamar alguém da equipe.');
  falso.enviados.length = 0;
  await webhook(webhookMensagem({ de: '5543999990003', texto: 'alô?' }));
  await esperar(300);
  assert.equal(falso.enviados.length, 0, 'robô falou com quem está com você');
});

test('"parar" respeita na hora, sem gastar IA', async () => {
  falso.enviados.length = 0; const iaAntes = falso.iaPedidos.length;
  await webhook(webhookMensagem({ de: '5543999990004', texto: 'PARAR' }));
  assert.ok(await ate(async () => (await contato('554399990004'))?.estado === 'nao_contatar'));
  assert.match(falso.enviados[0].text.body, /não vou mais/);
  assert.equal(falso.iaPedidos.length, iaAntes);
});

test('resposta automática de empresa é ignorada', async () => {
  falso.enviados.length = 0;
  await webhook(webhookMensagem({ de: '5543999990005', texto: 'Este é um menu automático, digite 1' }));
  await esperar(400);
  assert.equal(falso.enviados.filter((e) => e.type === 'text').length, 0);
});

test('áudio sem IA que ouve: pede pra escrever, não trava', async () => {
  falso.enviados.length = 0;
  await webhook(webhookMensagem({ de: '5543999990006', tipo: 'audio', audio: 'midiaA' }));
  assert.ok(await ate(() => falso.enviados.some((e) => e.type === 'text')));
  const m = await db().first("SELECT texto FROM mensagens WHERE contato = '554399990006' AND tipo = 'audio'");
  assert.match(m.texto, /não ouve áudio/);
});

test('IA fora do ar: tenta 3 vezes e passa pra você', async () => {
  for (let i = 0; i < 3; i++) {
    await webhook(webhookMensagem({ de: '5543999990007', texto: `falha ia ${i}` }));
    await esperar(250);
  }
  assert.ok(await ate(async () => (await contato('554399990007'))?.estado === 'humano'));
  assert.match((await contato('554399990007')).erro, /falhou 3 vezes/);
});

test('passou de 24h: robô não manda texto livre (regra da Meta)', async () => {
  falso.enviados.length = 0;
  await webhook(webhookMensagem({ de: '5543999990008', texto: 'oi', quando: Date.now() - 25 * 3600e3 }));
  assert.ok(await ate(async () => (await contato('554399990008'))?.estado === 'humano'));
  assert.equal(falso.enviados.filter((e) => e.type === 'text').length, 0);
});

test('prospecção: importa lista, manda modelo com parâmetros e conversa continua', async () => {
  falso.enviados.length = 0;
  const r = await fetch(`${base}/painel/api/importar`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ linhas: [
    { telefone: '(11) 98888-0001', nome: 'Carlos', empresa: 'Pet do Carlos', cidade: 'SP' },
    { telefone: '11988880001', nome: 'Duplicado' },
    { telefone: '123' },
    { telefone: '11 98888-0002', nome: '', empresa: '' },
  ] }) });
  assert.deepEqual(await r.json(), { novos: 2, repetidos: 1, invalidos: 1 });

  const { prospectar } = await import('../src/core/robo.js');
  assert.match(await prospectar(robo.ctx), /enviado/);
  const t = falso.enviados.find((e) => e.type === 'template');
  assert.equal(t.template.name, 'abertura');
  assert.equal(t.template.language.code, 'pt_BR');
  assert.deepEqual(t.template.components[0].parameters.map((p) => p.text), ['Carlos', 'Pet do Carlos']);
  assert.equal(t.to, '5511988880001');

  assert.match(await prospectar(robo.ctx), /enviado/);
  const t2 = falso.enviados.filter((e) => e.type === 'template')[1];
  assert.deepEqual(t2.template.components[0].parameters.map((p) => p.text), ['tudo bem', 'sua empresa'], 'campo vazio tem que usar o padrão');

  // Carlos responde (o WhatsApp devolve o número sem o 9) -> mesmo contato, IA vê a abertura
  await webhook(webhookMensagem({ de: '551188880001', texto: 'opa, como funciona?' }));
  assert.ok(await ate(() => falso.enviados.some((e) => e.type === 'text' && e.to === '551188880001')));
  const ultimo = falso.iaPedidos.at(-1).messages;
  assert.ok(ultimo.some((m) => m.role === 'assistant' && m.content.includes('Olá, Carlos! Vi a Pet do Carlos no Google.')));
  assert.equal((await db().first("SELECT count(*) AS n FROM contatos WHERE id = '551188880001'")).n, 1);
});

test('prospecção: modelo com problema trava tudo e devolve o contato pra fila', async () => {
  const { prospectar, lerAjuste } = await import('../src/core/robo.js');
  robo.ctx.config.prospeccao.modelo = 'quebrado';
  await fetch(`${base}/painel/api/importar`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ linhas: [{ telefone: '11977770001', nome: 'Bia' }] }) });
  assert.match(await prospectar(robo.ctx), /132001/);
  assert.match(await lerAjuste(robo.ctx, 'travado'), /132001/);
  assert.equal((await contato('551177770001')).estado, 'fila');
  assert.match(await prospectar(robo.ctx), /travado/);
  // destrava pelo painel
  const r = await fetch(`${base}/painel/destravar`, { method: 'POST', headers: auth, redirect: 'manual' });
  assert.equal(r.status, 303);
  assert.equal(await lerAjuste(robo.ctx, 'travado'), null);
  robo.ctx.config.prospeccao.modelo = 'abertura';
});

test('número sem WhatsApp vira "sem_whatsapp" e o robô segue', async () => {
  const { prospectar } = await import('../src/core/robo.js');
  await db().run("UPDATE contatos SET estado = 'pausado' WHERE estado = 'fila'");
  await fetch(`${base}/painel/api/importar`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ linhas: [{ telefone: '11900000026' }] }) });
  await prospectar(robo.ctx);
  assert.equal((await contato('551100000026')).estado, 'sem_whatsapp');
  await webhook(webhookStatus({ para: '5511988880002', codigo: 131026 }));
  assert.equal((await contato('551188880002')).estado, 'sem_whatsapp');
});

test('painel: pede senha, bloqueia outro site, você responde e devolve pro robô', async () => {
  assert.equal((await fetch(`${base}/painel`)).status, 401);
  const r = await fetch(`${base}/painel`, { headers: auth });
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Loja Teste/); assert.ok(!html.includes('5543999990001'), 'painel mostrou número inteiro');
  assert.equal((await fetch(`${base}/painel/destravar`, { method: 'POST', headers: { ...auth, origin: 'https://site-malicioso.com' } })).status, 403);

  falso.enviados.length = 0;
  await db().run("UPDATE contatos SET ultima_in = ? WHERE id = '554399990003'", Date.now());
  let p = await fetch(`${base}/painel/c/554399990003/responder`, { method: 'POST', headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' }, body: 'texto=Oi%2C+aqui+%C3%A9+o+dono', redirect: 'manual' });
  assert.equal(p.status, 303);
  assert.equal(falso.enviados[0].text.body, 'Oi, aqui é o dono');
  const m = await db().first("SELECT autor FROM mensagens WHERE contato = '554399990003' ORDER BY id DESC LIMIT 1");
  assert.equal(m.autor, 'humano');
  p = await fetch(`${base}/painel/c/554399990003`, { headers: auth });
  assert.match(await p.text(), /aqui é o dono/);
  await fetch(`${base}/painel/c/554399990003/estado`, { method: 'POST', headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' }, body: 'estado=conversa', redirect: 'manual' });
  assert.equal((await contato('554399990003')).estado, 'conversa');
});

test('teste pelo painel: manda a abertura pro seu número', async () => {
  falso.enviados.length = 0;
  const r = await fetch(`${base}/painel/api/teste`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ numero: '43 99999-0099' }) });
  const j = await r.json();
  assert.ok(j.ok, JSON.stringify(j));
  assert.equal(falso.enviados[0].type, 'template');
  assert.equal(falso.enviados[0].to, '5543999990099');
});
