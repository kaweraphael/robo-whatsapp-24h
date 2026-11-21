// npm run simular
// Converse com o seu atendente no terminal, sem WhatsApp e sem Meta.
// Usa a IA de verdade e o seu config/atendente.md. Ótimo pra ajustar o prompt.
//
//   npm run simular                      como se a pessoa tivesse chamado você
//   npm run simular -- --lista --nome Ana --empresa "Pet da Ana" --cidade Londrina
//                                        como se o robô tivesse aberto a conversa (prospecção)

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { criarIA } from '../src/core/ia/index.js';
import { montarSistema, extrairMarcas, parametrosDoModelo, textoAbertura } from '../src/core/robo.js';
import { env, config, atendente, verde, cinza, amarelo, negrito, vermelho } from './lib/comum.mjs';

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const c = config();
const ctx = { config: c, atendente: atendente(), agora: () => Date.now() };
const contato = { id: 'simulacao', origem: args.includes('--lista') ? 'lista' : 'entrou', nome: arg('nome'), empresa: arg('empresa'), cidade: arg('cidade'), nicho: arg('nicho') };

let ia;
try { ia = criarIA({ provedor: c.ia.provedor, modelo: c.ia.modelo, env: env(), maxTokens: c.ia.max_tokens, temperatura: c.ia.temperatura }); }
catch (e) { console.log(vermelho(e.message)); process.exit(1); }

const hist = [];
console.log(negrito(`Simulando ${c.negocio}`), cinza(`(${ia.provedor} / ${ia.modelo}) — escreva como cliente. "sair" encerra.\n`));
if (contato.origem === 'lista') {
  const abertura = c.prospeccao.modelo ? textoAbertura(c, parametrosDoModelo(c, contato)) : '(abertura da prospecção)';
  hist.push({ papel: 'robo', texto: abertura });
  console.log(`${verde('robô:')} ${abertura}\n`);
}
const rl = readline.createInterface({ input: stdin, output: stdout });
for (;;) {
  const t = (await rl.question(`${amarelo('você:')} `)).trim();
  if (!t) continue;
  if (t.toLowerCase() === 'sair') break;
  hist.push({ papel: 'cliente', texto: t });
  try {
    const t0 = Date.now();
    const { texto, marcas } = extrairMarcas(await ia.responder(montarSistema(ctx, contato), hist));
    if (texto) { hist.push({ papel: 'robo', texto }); console.log(`${verde('robô:')} ${texto}`); }
    for (const m of marcas) console.log(cinza(`       [${m.nome}${m.info ? ': ' + m.info : ''}] -> ${{ HUMANO: 'passa pra você e o robô para', NAO_CONTATAR: 'nunca mais fala com essa pessoa', IGNORAR: 'não responde' }[m.nome]}`));
    console.log(cinza(`       ${((Date.now() - t0) / 1000).toFixed(1)} s\n`));
    if (marcas.some((m) => m.nome !== 'IGNORAR')) { console.log(cinza('(no WhatsApp de verdade o robô pararia aqui)')); }
  } catch (e) { console.log(vermelho(e.message)); }
}
rl.close();
