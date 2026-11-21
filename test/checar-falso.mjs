// Confere se o `npm run checar` pega os erros clássicos de configuração da Meta.
// Uso: node test/checar-falso.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const rodar = promisify(execFile);
import { servidorFalso } from './falsos.mjs';

const casos = [
  ['tudo certo', {}, [/Token permanente/, /Registrado na Cloud API/, /App assinado/, /Limite da Meta: TIER_250/]],
  ['token temporário', { tokenTemporario: true }, [/Token TEMPORÁRIO/]],
  ['token sem permissão', { semPermissao: true }, [/sem a permissão whatsapp_business_management/]],
  ['número não registrado', { naoRegistrado: true }, [/não está na Cloud API/, /registrar-numero/]],
  ['webhook não assinado', { semAssinatura: true }, [/webhook NÃO vai chegar/, /assinar-webhook/]],
];
let falhas = 0;
for (const [nome, cen, esperado] of casos) {
  const f = await servidorFalso(cen);
  // async: o servidor falso roda neste mesmo processo e precisa responder enquanto o checar espera
  const r = await rodar('node', ['scripts/checar.mjs', 'meta'], { encoding: 'utf8', env: { ...process.env, META_BASE_URL: f.base, META_TOKEN: 'EAAfalso', META_APP_SECRET: 's', META_VERIFY_TOKEN: 'v', META_PHONE_NUMBER_ID: 'NUM1', META_WABA_ID: 'WABA1', PAINEL_SENHA: 'senha-bem-longa-123' } }).catch((e) => e);
  f.fechar();
  const saida = r.stdout.replace(/\x1b\[\d+m/g, '');
  const ok = esperado.every((re) => re.test(saida));
  if (!ok) { falhas++; console.log(`FALHOU ${nome}\n${saida}`); } else console.log(`ok   ${nome}`);
}
process.exit(falhas ? 1 : 0);
