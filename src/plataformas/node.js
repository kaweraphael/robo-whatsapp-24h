// Entrada pra qualquer servidor com Node 22.13+ (VPS, Railway, Render, Fly, Docker, seu PC).
// Banco: um arquivo SQLite (dados/robo.db). Relógio: setInterval no lugar do cron.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { bancoSQLite } from '../core/banco.js';
import { criarContexto, tique } from '../core/contexto.js';
import { tratar } from '../core/rotas.js';
import { responderPendentes, prospectar, evento } from '../core/robo.js';
import { carregarEnv } from '../../scripts/lib/env.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function iniciar({ env = { ...carregarEnv(raiz), ...process.env }, porta, arquivoBanco, intervaloMs = 20_000, silencioso = false, configJson, atendente, agora } = {}) {
  const dbArq = arquivoBanco || env.BANCO_ARQUIVO || path.join(raiz, 'dados', 'robo.db');
  if (dbArq !== ':memory:') fs.mkdirSync(path.dirname(dbArq), { recursive: true });
  const sqlite = new DatabaseSync(dbArq);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  sqlite.exec(fs.readFileSync(path.join(raiz, 'schema.sql'), 'utf8'));

  const ler = (arq) => fs.readFileSync(path.join(raiz, 'config', arq), 'utf8');
  const ctx = criarContexto({
    db: bancoSQLite(sqlite), env, plataforma: 'node',
    configJson: configJson || JSON.parse(ler('robo.json')), atendente: atendente ?? ler('atendente.md'), agora,
  });

  const servidor = http.createServer(async (req, res) => {
    try {
      const corpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise((ok, erro) => {
        const partes = []; let tam = 0;
        req.on('data', (c) => { tam += c.length; if (tam > 10e6) { erro(new Error('corpo grande demais')); req.destroy(); } else partes.push(c); });
        req.on('end', () => ok(Buffer.concat(partes))); req.on('error', erro);
      });
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const r = await tratar(new Request(`${proto}://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers: req.headers, body: corpo }), ctx);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end(`erro interno: ${e.message}`);
    }
  });

  const p = Number(porta ?? env.PORT ?? 8787);
  let rodando = false;
  const relogio = setInterval(async () => {
    if (rodando) return; rodando = true;
    try { await tique(ctx, { responderPendentes, prospectar, evento }); } finally { rodando = false; }
  }, intervaloMs);

  return new Promise((ok) => servidor.listen(p, () => {
    if (!silencioso) console.log(`Robô no ar em http://localhost:${servidor.address().port}  (painel: /painel)`);
    ok({ servidor, ctx, porta: servidor.address().port, fechar: () => { clearInterval(relogio); servidor.close(); sqlite.close(); } });
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) iniciar();
