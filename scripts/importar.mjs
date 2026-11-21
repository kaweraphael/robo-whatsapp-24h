// npm run importar -- listas/minha-lista.csv
// Manda a lista pro robô publicado (Cloudflare ou servidor), em pedaços.
import fs from 'node:fs';
import { lerCSV } from '../src/core/csv.js';
import { chamarRobo, verde, vermelho, cinza } from './lib/comum.mjs';

const arq = process.argv[2];
if (!arq || !fs.existsSync(arq)) { console.log(vermelho('Use: npm run importar -- caminho/da/lista.csv')); process.exit(1); }
const { linhas, colunas, temTelefone } = lerCSV(fs.readFileSync(arq, 'utf8'));
if (!temTelefone) { console.log(vermelho('Não achei a coluna de telefone. Colunas lidas: ' + Object.keys(colunas).join(', '))); process.exit(1); }
console.log(cinza(`Colunas reconhecidas: ${Object.entries(colunas).map(([a, b]) => (a === b ? a : `${a} -> ${b}`)).join(', ')}`));
const total = { novos: 0, repetidos: 0, invalidos: 0 };
for (let i = 0; i < linhas.length; i += 300) {
  const r = await chamarRobo('/painel/api/importar', { linhas: linhas.slice(i, i + 300) });
  for (const k of Object.keys(total)) total[k] += r[k];
  process.stdout.write(cinza(`\r${Math.min(i + 300, linhas.length)}/${linhas.length}`));
}
console.log(`\n${verde('Pronto.')} ${total.novos} novos na fila, ${total.repetidos} já estavam, ${total.invalidos} sem telefone válido.`);
