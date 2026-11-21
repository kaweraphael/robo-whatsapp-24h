// Teste da versão Cloudflare: roda o Worker de verdade (wrangler dev, banco D1 local)
// contra a Meta e a IA falsas. Não precisa de conta. Uso: node test/cloudflare-local.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { servidorFalso, webhookMensagem, esperar } from './falsos.mjs';
import { assinar } from '../src/core/assinatura.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(raiz, '.teste-cf-'));
const falso = await servidorFalso();
const PORTA = 8799;
const cfgOriginal = fs.readFileSync(path.join(raiz, 'config/robo.json'), 'utf8');
let dev;
const falhas = [];
const conferir = (cond, t) => { console.log(`${cond ? 'ok  ' : 'FALHOU'} ${t}`); if (!cond) falhas.push(t); };

try {
  const cfg = JSON.parse(cfgOriginal);
  cfg.ia = { provedor: 'compativel', modelo: 'modelo-falso' };
  cfg.atendimento.espera_segundos = 2;
  fs.writeFileSync(path.join(raiz, 'config/robo.json'), JSON.stringify(cfg, null, 2));
  fs.writeFileSync(path.join(tmp, 'wrangler.jsonc'), fs.readFileSync(path.join(raiz, 'wrangler.exemplo.jsonc'), 'utf8')
    .replaceAll('__NOME__', 'robo-teste').replace('__D1_ID__', '00000000-0000-0000-0000-000000000000')
    .replace('"main": "src/plataformas/cloudflare.js"', `"main": "${path.join(raiz, 'src/plataformas/cloudflare.js')}"`));
  fs.writeFileSync(path.join(tmp, '.dev.vars'), Object.entries({
    META_TOKEN: 'tok', META_APP_SECRET: 'seg', META_VERIFY_TOKEN: 'ver', META_PHONE_NUMBER_ID: 'NUM1', META_BASE_URL: falso.base,
    IA_API_KEY: 'k', IA_BASE_URL: falso.base + '/v1', PAINEL_SENHA: 'senha-teste-123',
  }).map(([k, v]) => `${k}=${v}`).join('\n'));
  const w = (a) => spawnSync('npx', ['wrangler', ...a, '-c', path.join(tmp, 'wrangler.jsonc'), '--persist-to', path.join(tmp, 'estado')], { cwd: raiz, encoding: 'utf8' });
  const s = w(['d1', 'execute', 'robo-teste', '--local', '--file', path.join(raiz, 'schema.sql'), '--yes']);
  conferir(s.status === 0, 'schema aplicado no D1 local' + (s.status ? '\n' + s.stderr : ''));

  dev = spawn('npx', ['wrangler', 'dev', '-c', path.join(tmp, 'wrangler.jsonc'), '--persist-to', path.join(tmp, 'estado'), '--port', String(PORTA), '--test-scheduled', '--env-file', path.join(tmp, '.dev.vars')], { cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; dev.stdout.on('data', (d) => (log += d)); dev.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${PORTA}`;
  let no = false; for (let i = 0; i < 60 && !no; i++) { try { no = (await fetch(base + '/saude')).ok; } catch { await esperar(500); } }
  conferir(no, 'Worker subiu' + (no ? '' : '\n' + log.slice(-2000)));

  const saude = await (await fetch(base + '/saude')).json();
  conferir(saude.plataforma === 'cloudflare', 'rodando como cloudflare');
  const v = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=ver&hub.challenge=777`);
  conferir((await v.text()) === '777', 'verificação do webhook');

  const corpo = JSON.stringify(webhookMensagem({ de: '5543999997777', texto: 'oi, tudo bem?' }));
  const r = await fetch(`${base}/webhook`, { method: 'POST', headers: { 'x-hub-signature-256': await assinar('seg', corpo) }, body: corpo });
  conferir(r.status === 200, 'webhook assinado aceito');
  let resp = false; for (let i = 0; i < 40 && !resp; i++) { resp = falso.enviados.some((e) => e.type === 'text'); if (!resp) await esperar(250); }
  conferir(resp, 'robô respondeu pelo waitUntil (sem esperar o cron)');
  conferir(falso.enviados.find((e) => e.type === 'text')?.text.body === 'Resposta da IA para: oi, tudo bem?', 'texto certo da IA');

  // cron: mensagem que ficou pra trás é respondida pelo scheduled()
  falso.enviados.length = 0;
  const corpo2 = JSON.stringify(webhookMensagem({ de: '5543999996666', texto: 'segunda pessoa' }));
  await fetch(`${base}/webhook`, { method: 'POST', headers: { 'x-hub-signature-256': await assinar('seg', corpo2) }, body: corpo2 });
  await esperar(3500);
  const cron = await fetch(`${base}/__scheduled?cron=*+*+*+*+*`);
  conferir(cron.ok, 'cron executou');
  await esperar(1500);
  conferir(falso.enviados.filter((e) => e.type === 'text' && e.to === '5543999996666').length === 1, 'cron não duplicou resposta (trava funcionando)');

  const p = await fetch(`${base}/painel`, { headers: { authorization: 'Basic ' + btoa('x:senha-teste-123') } });
  const html = await p.text();
  conferir(p.status === 200 && html.includes('Esperando você'), 'painel abre com senha');
  const imp = await fetch(`${base}/painel/api/importar`, { method: 'POST', headers: { authorization: 'Basic ' + btoa('x:senha-teste-123'), 'content-type': 'application/json' }, body: JSON.stringify({ linhas: [{ telefone: '11999990000', nome: 'Zé' }] }) });
  conferir((await imp.json()).novos === 1, 'importação pela API do painel');
} finally {
  fs.writeFileSync(path.join(raiz, 'config/robo.json'), cfgOriginal);
  dev?.kill('SIGTERM');
  falso.fechar();
  await esperar(500);
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nCloudflare: tudo certo');
process.exit(falhas.length ? 1 : 0);
