// Lê o arquivo .env (sem dependência externa).
import fs from 'node:fs';
import path from 'node:path';

export function lerArquivoEnv(arquivo) {
  const out = {};
  if (!fs.existsSync(arquivo)) return out;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

export const carregarEnv = (raiz) => lerArquivoEnv(path.join(raiz, '.env'));
