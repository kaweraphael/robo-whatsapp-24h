// Todas as rotas HTTP, iguais no Cloudflare e no Node (os dois usam Request/Response padrão).
//
//   GET  /            só diz que está no ar
//   GET  /saude       usado pelo `npm run checar`
//   GET  /webhook     a Meta confere o token de verificação
//   POST /webhook     mensagens e status chegando
//   /painel...        seu painel (senha)

import { assinaturaValida } from './assinatura.js';
import { lerWebhook } from './whatsapp.js';
import { dormir } from './tempo.js';
import { receber, responderContato, importarContatos, responderComoHumano, mudarEstado, gravarAjuste, iniciarConversa, evento } from './robo.js';
import { telaInicio, telaConversa, telaImportar, pagina } from './painel.js';
import { lerCSV } from './csv.js';
import { chave, paraEnvio, valido } from './numero.js';

export const VERSAO_ROBO = '1.0.0';

const texto = (t, status = 200) => new Response(t, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

function senhaOk(req, senha) {
  if (!senha) return false;
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let dec = '';
  try { dec = atob(h.slice(6)); } catch { return false; }
  const s = dec.slice(dec.indexOf(':') + 1);
  if (s.length !== senha.length) return false;
  let d = 0;
  for (let i = 0; i < s.length; i++) d |= s.charCodeAt(i) ^ senha.charCodeAt(i);
  return d === 0;
}

// POST de formulário só vale se veio do próprio painel (protege contra site malicioso clicando por você)
function mesmaOrigem(req, url) {
  const o = req.headers.get('origin');
  if (!o) return true; // scripts (curl/npm run) não mandam Origin
  return o === url.origin;
}

export async function tratar(req, ctx) {
  const url = new URL(req.url);
  const { env } = ctx;
  const p = url.pathname.replace(/\/+$/, '') || '/';

  if (p === '/') return texto('Robô no ar.');
  if (p === '/saude') return json({ ok: true, versao: VERSAO_ROBO, plataforma: ctx.plataforma });
  if (p === '/privacidade') return politica(ctx.config.negocio);

  // ---------------- webhook
  if (p === '/webhook' && req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && env.META_VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === env.META_VERIFY_TOKEN;
    return ok ? texto(url.searchParams.get('hub.challenge') || '') : texto('token de verificação não confere', 403);
  }
  if (p === '/webhook' && req.method === 'POST') {
    const bruto = await req.text();
    const semAssinatura = env.PERMITIR_SEM_ASSINATURA === 'sim';
    if (!semAssinatura && !(await assinaturaValida(env.META_APP_SECRET, bruto, req.headers.get('x-hub-signature-256')))) {
      await evento(ctx, 'webhook_recusado', env.META_APP_SECRET ? 'assinatura não confere (META_APP_SECRET errado?)' : 'falta META_APP_SECRET');
      return texto('assinatura inválida', 401);
    }
    let corpo;
    try { corpo = JSON.parse(bruto); } catch { return texto('json inválido', 400); }
    const ids = await receber(ctx, corpo, lerWebhook(corpo));
    // espera a pessoa terminar de digitar e responde (o cron é a rede de segurança)
    const espera = ctx.config.atendimento.espera_segundos * 1000 + 300;
    for (const id of ids) ctx.depois(dormir(espera).then(() => responderContato(ctx, id)).catch((e) => evento(ctx, 'erro_resposta', e.message)));
    return texto('ok');
  }

  // ---------------- painel
  if (p === '/painel' || p.startsWith('/painel/')) {
    if (!env.PAINEL_SENHA) return texto('Painel desligado: defina PAINEL_SENHA.', 404);
    if (!senhaOk(req, env.PAINEL_SENHA)) {
      return new Response('Senha necessária', { status: 401, headers: { 'www-authenticate': 'Basic realm="Painel do robo", charset="UTF-8"' } });
    }
    if (req.method === 'POST' && !mesmaOrigem(req, url)) return texto('origem não permitida', 403);
    const voltar = (para) => new Response(null, { status: 303, headers: { location: para } });

    if (p === '/painel' && req.method === 'GET') return telaInicio(ctx, url.searchParams.get('f'));

    if (p === '/painel/destravar' && req.method === 'POST') {
      await gravarAjuste(ctx, 'travado', null);
      await evento(ctx, 'destravado', 'pelo painel');
      return voltar('/painel');
    }

    const mc = p.match(/^\/painel\/c\/([0-9]+)(\/responder|\/estado)?$/);
    if (mc) {
      const id = mc[1];
      if (!mc[2] && req.method === 'GET') return telaConversa(ctx, id);
      if (req.method === 'POST') {
        const f = await req.formData();
        try {
          if (mc[2] === '/responder') {
            const t = String(f.get('texto') || '').trim();
            if (t) { await responderComoHumano(ctx, id, t); await mudarEstado(ctx, id, 'humano'); }
          } else await mudarEstado(ctx, id, String(f.get('estado')));
        } catch (e) { return telaConversa(ctx, id, e.message); }
        return voltar(`/painel/c/${id}`);
      }
    }

    if (p === '/painel/importar') {
      if (req.method === 'GET') return telaImportar();
      const f = await req.formData();
      const arq = f.get('arquivo');
      const conteudo = arq && typeof arq === 'object' && arq.size ? await arq.text() : String(f.get('texto') || '');
      const { linhas, temTelefone } = lerCSV(conteudo);
      if (!linhas.length) return telaImportar({ erro: 'Não achei linhas. Confira se a primeira linha é o cabeçalho.' });
      if (!temTelefone) return telaImportar({ erro: 'Não achei a coluna de telefone. Renomeie a coluna pra "telefone".' });
      return telaImportar(await importarContatos(ctx, linhas));
    }

    if (p === '/painel/teste' && req.method === 'POST') {
      const f = await req.formData();
      const r = await prepararTeste(ctx, String(f.get('numero') || ''), String(f.get('nome') || ''));
      if (r.erro) return pagina('Teste', `<p><a href="/painel">Voltar</a></p><div class="faixa alerta" role="alert"><span>${r.erro.replace(/</g, '&lt;')}</span></div>`);
      return voltar(`/painel/c/${r.id}`);
    }

    // API pros scripts (npm run importar / npm run teste)
    if (p === '/painel/api/importar' && req.method === 'POST') {
      const b = await req.json().catch(() => null);
      if (!b || !Array.isArray(b.linhas)) return json({ erro: 'mande { linhas: [...] }' }, 400);
      return json(await importarContatos(ctx, b.linhas));
    }
    if (p === '/painel/api/teste' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const r = await prepararTeste(ctx, String(b.numero || ''), String(b.nome || ''));
      return json(r, r.erro ? 400 : 200);
    }
    if (p === '/painel/api/eventos' && req.method === 'GET') {
      return json(await ctx.db.all('SELECT * FROM eventos ORDER BY quando DESC LIMIT 50'));
    }
    return texto('não encontrado', 404);
  }

  return texto('não encontrado', 404);
}

// Coloca seu número como contato de teste e (se tiver modelo) já manda a abertura.
async function prepararTeste(ctx, numero, nome) {
  const wa = paraEnvio(numero, ctx.config.ddi_padrao);
  if (!valido(wa)) return { erro: 'Número inválido. Use DDD + número, ex.: 11999998888.' };
  const id = chave(wa, ctx.config.ddi_padrao);
  const t = ctx.agora();
  await ctx.db.run('DELETE FROM mensagens WHERE contato = ?', id);
  await ctx.db.run(
    `INSERT INTO contatos (id, wa, nome, empresa, origem, estado, criado_em, atualizado_em) VALUES (?, ?, ?, ?, 'lista', 'fila', ?, ?)
     ON CONFLICT(id) DO UPDATE SET estado = 'fila', erro = NULL, tentativas = 0, processando_ate = NULL, enviado_em = NULL, ultima_in = NULL, ultima_out = NULL, atualizado_em = excluded.atualizado_em`,
    id, wa, nome || 'Teste', 'Contato de teste', t, t,
  );
  if (!ctx.config.prospeccao.modelo) {
    await ctx.db.run("UPDATE contatos SET estado = 'conversa' WHERE id = ?", id);
    return { id, ok: true, aviso: 'Sem modelo de abertura: mande "oi" pro número do robô pelo seu WhatsApp.' };
  }
  try {
    const c = await ctx.db.first('SELECT * FROM contatos WHERE id = ?', id);
    await iniciarConversa(ctx, c);
    return { id, ok: true };
  } catch (e) {
    await ctx.db.run("UPDATE contatos SET estado = 'erro', erro = ? WHERE id = ?", `${e.codigo ?? ''} ${e.message}`, id);
    return { id, erro: `A Meta recusou: ${e.codigo ?? ''} ${e.message}. ${e.explicacao?.texto || ''}` };
  }
}

// A Meta exige uma URL de política de privacidade pra publicar o app. Esta serve de base;
// se o seu negócio já tem uma no site, use a dele.
function politica(negocio) {
  const n = String(negocio).replace(/[<>&"]/g, '');
  return pagina(`Privacidade · ${n}`, `<h1>Política de privacidade</h1>
<p>${n} usa o WhatsApp para conversar com clientes e possíveis clientes.</p>
<h2>O que guardamos</h2><p>Seu número de WhatsApp, o nome do seu perfil, as mensagens trocadas com a gente e, quando você é um contato comercial, dados públicos do seu negócio (nome, cidade, ramo).</p>
<h2>Para quê</h2><p>Para responder você, apresentar nossos serviços e dar continuidade ao atendimento. As respostas podem ser geradas com ajuda de inteligência artificial e revisadas pela nossa equipe.</p>
<h2>Com quem compartilhamos</h2><p>Com a Meta (WhatsApp), que entrega as mensagens, e com o provedor de inteligência artificial que gera as respostas. Não vendemos seus dados.</p>
<h2>Seus direitos (LGPD)</h2><p>Você pode pedir para parar de receber mensagens a qualquer momento: basta escrever <b>parar</b> na conversa. Também pode pedir acesso, correção ou exclusão dos seus dados pela mesma conversa.</p>`);
}
