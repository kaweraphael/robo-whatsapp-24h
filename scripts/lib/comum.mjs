// Coisas que todos os scripts usam.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerArquivoEnv } from './env.mjs';
import { carregarConfig } from '../../src/core/config.js';

export const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const env = () => ({ ...lerArquivoEnv(path.join(raiz, '.env')), ...process.env });
export const configJson = () => JSON.parse(fs.readFileSync(path.join(raiz, 'config', 'robo.json'), 'utf8'));
export const config = () => carregarConfig(configJson());
export const atendente = () => fs.readFileSync(path.join(raiz, 'config', 'atendente.md'), 'utf8');

const cor = (n) => (s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s);
export const verde = cor(32), vermelho = cor(31), amarelo = cor(33), cinza = cor(90), negrito = cor(1);

// Grava/atualiza uma variável no .env sem mexer no resto.
export function gravarEnv(chave, valor) {
  const arq = path.join(raiz, '.env');
  let t = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : fs.readFileSync(path.join(raiz, '.env.exemplo'), 'utf8');
  const re = new RegExp(`^${chave}=.*$`, 'm');
  t = re.test(t) ? t.replace(re, `${chave}=${valor}`) : `${t.trimEnd()}\n${chave}=${valor}\n`;
  fs.writeFileSync(arq, t, { mode: 0o600 });
}

// Chamada ao robô publicado, com a senha do painel.
export async function chamarRobo(caminho, corpo) {
  const e = env();
  if (!e.ROBO_URL) throw new Error('ROBO_URL vazio no .env. Publique o robô primeiro.');
  if (!e.PAINEL_SENHA) throw new Error('PAINEL_SENHA vazio no .env.');
  const r = await fetch(e.ROBO_URL.replace(/\/$/, '') + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { authorization: 'Basic ' + Buffer.from('robo:' + e.PAINEL_SENHA).toString('base64'), 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({ erro: `robô respondeu ${r.status}` }));
  if (!r.ok) throw new Error(j.erro || `robô respondeu ${r.status}`);
  return j;
}
