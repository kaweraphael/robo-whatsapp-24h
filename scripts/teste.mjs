// npm run teste -- 11999998888
// O robô publicado te manda a mensagem de abertura. Responda como se fosse cliente.
import { chamarRobo, verde, vermelho, amarelo } from './lib/comum.mjs';

const numero = process.argv[2];
if (!numero) { console.log(vermelho('Use: npm run teste -- SEU_NUMERO_COM_DDD')); process.exit(1); }
try {
  const r = await chamarRobo('/painel/api/teste', { numero });
  console.log(verde('Feito.'), r.aviso ? amarelo(r.aviso) : 'Olhe seu WhatsApp e responda como se fosse cliente.');
} catch (e) { console.log(vermelho(e.message)); process.exit(1); }
