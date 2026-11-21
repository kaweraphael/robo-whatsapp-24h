// npm run publicar:cloudflare
// Faz tudo na Cloudflare: cria o banco, o robô, sobe as chaves e publica.
// Pode rodar de novo sempre que mudar algo (config, prompt, código): ele só atualiza.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { env as lerEnv, raiz, gravarEnv, verde, vermelho, amarelo, cinza, negrito } from './lib/comum.mjs';

const e = lerEnv();
const nome = (e.ROBO_NOME || 'robo-whatsapp').toLowerCase().replace(/[^a-z0-9-]/g, '-');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const wrangler = (args, { mostrar = false } = {}) => {
  const r = spawnSync(npx, ['--yes', 'wrangler', ...args], { cwd: raiz, encoding: 'utf8', stdio: mostrar ? 'inherit' : 'pipe', shell: process.platform === 'win32' });
  return { ok: r.status === 0, saida: (r.stdout || '') + (r.stderr || '') };
};
const passo = (t) => console.log(`\n${negrito(t)}`);
const parar = (t, como) => { console.log(vermelho(t)); if (como) console.log(cinza('-> ' + como)); process.exit(1); };

// 0. checagem rápida
const faltam = ['META_TOKEN', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_PHONE_NUMBER_ID', 'PAINEL_SENHA'].filter((k) => !e[k]);
if (faltam.length) parar(`Falta no .env: ${faltam.join(', ')}`, 'Rode npm run checar e siga o que ele pedir');

passo('1/5 Conferindo login na Cloudflare');
const quem = wrangler(['whoami']);
if (!quem.ok || /not authenticated|You are not/i.test(quem.saida)) parar('Você não está logado na Cloudflare.', 'Rode: npx wrangler login  (abre o navegador, clique em Allow) e depois rode este comando de novo');
console.log(verde('ok'));

passo(`2/5 Banco de dados D1 "${nome}"`);
let id = null;
const lista = wrangler(['d1', 'list', '--json']);
try { id = JSON.parse(lista.saida.slice(lista.saida.indexOf('['))).find((d) => d.name === nome)?.uuid || null; } catch {}
if (!id) {
  const cr = wrangler(['d1', 'create', nome]);
  id = (cr.saida.match(/"?database_id"?\s*[:=]\s*"([0-9a-f-]{36})"/) || [])[1];
  if (!id) parar('Não consegui criar o banco:\n' + cr.saida);
  console.log(verde('criado'));
} else console.log(verde('já existe, usando o mesmo'));

const cfg = fs.readFileSync(path.join(raiz, 'wrangler.exemplo.jsonc'), 'utf8').replaceAll('__NOME__', nome).replace('__D1_ID__', id);
fs.writeFileSync(path.join(raiz, 'wrangler.jsonc'), cfg);
const sch = wrangler(['d1', 'execute', nome, '--remote', '--file', 'schema.sql', '--yes']);
if (!sch.ok) parar('Erro ao criar as tabelas:\n' + sch.saida);
console.log(verde('tabelas ok'));

passo('3/5 Publicando o robô');
const dep = wrangler(['deploy']);
if (!dep.ok) parar('Erro ao publicar:\n' + dep.saida, /workers\.dev subdomain/i.test(dep.saida) ? 'Abra dash.cloudflare.com > Workers e crie seu subdomínio workers.dev (é grátis), depois rode de novo' : undefined);
const url = (dep.saida.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/) || [])[0];
if (url) { gravarEnv('ROBO_URL', url); console.log(verde('no ar:'), url); }
else console.log(amarelo('Publicado, mas não achei a URL na saída. Pegue em dash.cloudflare.com e ponha em ROBO_URL no .env'));

passo('4/5 Subindo as chaves (ficam criptografadas na Cloudflare)');
const nomesSegredos = ['META_TOKEN', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_PHONE_NUMBER_ID', 'META_WABA_ID', 'PAINEL_SENHA',
  'GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'IA_API_KEY', 'IA_BASE_URL'];
const segredos = Object.fromEntries(nomesSegredos.filter((k) => e[k]).map((k) => [k, e[k]]));
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'robo-')), 'segredos.json');
fs.writeFileSync(tmp, JSON.stringify(segredos), { mode: 0o600 });
try {
  const sb = wrangler(['secret', 'bulk', tmp]);
  if (!sb.ok) parar('Erro ao subir as chaves:\n' + sb.saida.replace(/EAA[A-Za-z0-9]+/g, 'EAA***'));
} finally { fs.rmSync(path.dirname(tmp), { recursive: true, force: true }); }
console.log(verde('ok'), cinza(Object.keys(segredos).join(', ')));

passo('5/5 Conferindo');
const u = url || e.ROBO_URL;
if (u) {
  let vivo = false;
  for (let i = 0; i < 10 && !vivo; i++) {
    try { vivo = (await fetch(`${u}/saude`)).ok; } catch {}
    if (!vivo) await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(vivo ? verde('respondendo') : amarelo('ainda subindo, rode npm run checar daqui a 1 minuto'));
  console.log(`\nPainel:  ${u}/painel  ${cinza('(qualquer usuário + sua PAINEL_SENHA)')}`);
  console.log(`Webhook: ${u}/webhook  ${cinza('(cole isso na Meta, com o seu META_VERIFY_TOKEN)')}`);
}
console.log(`\nPróximo: ${negrito('npm run checar')}`);
