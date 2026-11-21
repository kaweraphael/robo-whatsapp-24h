// Painel pra você acompanhar e assumir conversas. Abre no celular.
// Protegido por senha (PAINEL_SENHA). Nunca mostra o número inteiro.

import { mascarar } from './numero.js';
import { partes, inicioDoDia } from './tempo.js';
import { dentroDaJanela, lerAjuste } from './robo.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const ROTULOS = {
  fila: 'Na fila', enviado: 'Abordado', conversa: 'Robô atendendo', humano: 'Esperando você',
  pausado: 'Pausado', nao_contatar: 'Não contatar', sem_whatsapp: 'Sem WhatsApp', erro: 'Erro',
};

function quando(ms, fuso) {
  if (!ms) return '';
  const p = partes(ms, fuso);
  const hoje = partes(Date.now(), fuso);
  const z = (n) => String(n).padStart(2, '0');
  return p.dia === hoje.dia && p.mes === hoje.mes ? `${z(p.hora)}:${z(p.minuto)}` : `${z(p.dia)}/${z(p.mes)}`;
}

const CSS = `
:root{--bg:#f3f4f1;--sup:#fff;--tx:#17201b;--tx2:#55615a;--linha:#dfe3dd;--ac:#0b6e4f;--ac-tx:#fff;--alerta:#9a2b14;--alerta-bg:#fbe9e3;--aviso-bg:#fff4d6;--aviso:#6b4e00;--eu:#dcefe5;--robo:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#101512;--sup:#18201b;--tx:#e8ede9;--tx2:#9daaa2;--linha:#2a342e;--ac:#3fbf8a;--ac-tx:#06130d;--alerta:#ffb4a1;--alerta-bg:#3a1a12;--aviso-bg:#33290a;--aviso:#f2d27a;--eu:#183a2b;--robo:#1d2721}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:16px 16px 48px}
a{color:var(--ac)}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 20px}
h1{font-size:1.25rem;margin:0;letter-spacing:-.01em}h2{font-size:1rem;margin:28px 0 10px}
.nums{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--linha);border:1px solid var(--linha);border-radius:12px;overflow:hidden}
.nums div{background:var(--sup);padding:12px}.nums b{display:block;font-size:1.5rem;font-variant-numeric:tabular-nums;line-height:1.2}.nums span{color:var(--tx2);font-size:.85rem}
@media (max-width:520px){.nums{grid-template-columns:repeat(2,1fr)}}
.faixa{padding:12px 14px;border-radius:10px;margin:0 0 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.faixa.alerta{background:var(--alerta-bg);color:var(--alerta)}.faixa.aviso{background:var(--aviso-bg);color:var(--aviso)}
nav{display:flex;gap:6px;flex-wrap:wrap;margin:20px 0 8px}
nav a{padding:6px 12px;border-radius:999px;text-decoration:none;color:var(--tx2);border:1px solid var(--linha);font-size:.9rem}
nav a[aria-current]{background:var(--tx);color:var(--bg);border-color:var(--tx)}
ul.lista{list-style:none;margin:0;padding:0;background:var(--sup);border:1px solid var(--linha);border-radius:12px;overflow:hidden}
ul.lista li+li{border-top:1px solid var(--linha)}
ul.lista a{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:12px 14px;color:inherit;text-decoration:none}
ul.lista a:hover{background:color-mix(in srgb,var(--ac) 6%,transparent)}
.nome{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hora{color:var(--tx2);font-size:.85rem;font-variant-numeric:tabular-nums}
.prev{color:var(--tx2);font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag{font-size:.75rem;padding:1px 8px;border-radius:999px;background:var(--bg);color:var(--tx2);white-space:nowrap;justify-self:end}
.tag.humano{background:var(--aviso-bg);color:var(--aviso);font-weight:600}.tag.erro,.tag.sem_whatsapp{background:var(--alerta-bg);color:var(--alerta)}
.vazio{color:var(--tx2);padding:20px 14px;background:var(--sup);border:1px dashed var(--linha);border-radius:12px}
.chat{display:flex;flex-direction:column;gap:8px;margin:16px 0}
.msg{max-width:85%;padding:8px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.msg.in{align-self:flex-start;background:var(--robo);border:1px solid var(--linha)}.msg.out{align-self:flex-end;background:var(--eu)}
.msg.sistema{align-self:center;background:transparent;color:var(--tx2);font-size:.85rem;box-shadow:none}
.msg small{display:block;color:var(--tx2);font-size:.75rem;margin-top:2px}
form.linha{display:flex;gap:8px;flex-wrap:wrap}
textarea,input{width:100%;font:inherit;color:var(--tx);background:var(--sup);border:1px solid var(--linha);border-radius:10px;padding:10px 12px}
textarea{min-height:88px;resize:vertical}
button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:9px 18px;background:var(--ac);color:var(--ac-tx);cursor:pointer}
button.sec{background:transparent;color:var(--tx);border:1px solid var(--linha)}button.perigo{background:transparent;color:var(--alerta);border:1px solid currentColor}
button:hover{filter:brightness(1.06)}
.acoes{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.meta{color:var(--tx2);font-size:.9rem}
label{display:block;font-weight:600;margin:14px 0 6px}
.dica{color:var(--tx2);font-size:.9rem;margin:6px 0 0}
`;

function pagina(titulo, corpo) {
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titulo)}</title><style>${CSS}</style></head><body><main>${corpo}</main></body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' },
  });
}

export async function telaInicio(ctx, filtro) {
  const { db, config } = ctx;
  const hoje = inicioDoDia(ctx.agora(), config.fuso);
  const n = async (sql, ...p) => (await db.first(sql, ...p)).n;
  const nums = {
    abertas: await n("SELECT count(*) AS n FROM contatos WHERE enviado_em >= ? AND origem = 'lista'", hoje),
    responderam: await n("SELECT count(DISTINCT contato) AS n FROM mensagens WHERE direcao = 'in' AND quando >= ?", hoje),
    voce: await n("SELECT count(*) AS n FROM contatos WHERE estado = 'humano'"),
    fila: await n("SELECT count(*) AS n FROM contatos WHERE estado = 'fila'"),
  };
  const travado = await lerAjuste(ctx, 'travado');
  const filtros = {
    voce: ["estado = 'humano'", 'Esperando você'],
    conversas: ["estado IN ('conversa','humano','pausado') OR ultima_in IS NOT NULL", 'Conversas'],
    abordados: ["estado = 'enviado'", 'Abordados'],
    problemas: ["estado IN ('erro','sem_whatsapp')", 'Problemas'],
    fila: ["estado = 'fila'", 'Fila'],
  };
  const f = filtros[filtro] ? filtro : nums.voce ? 'voce' : 'conversas';
  const lista = await db.all(
    `SELECT c.*, (SELECT texto FROM mensagens m WHERE m.contato = c.id ORDER BY quando DESC, id DESC LIMIT 1) AS ultima
     FROM contatos c WHERE ${filtros[f][0]} ORDER BY coalesce(c.ultima_in, c.ultima_out, c.atualizado_em) DESC LIMIT 100`,
  );

  const faixa = travado
    ? `<div class="faixa alerta" role="alert"><span><b>Prospecção parada.</b> ${esc(travado.split(' | ').slice(1).join(' | '))}</span><form method="post" action="/painel/destravar"><button class="perigo">Já resolvi, voltar a enviar</button></form></div>`
    : !config.prospeccao.ligada
      ? '<div class="faixa aviso"><span>Prospecção desligada: o robô só responde quem chama. Liga em <b>config/robo.json</b>.</span></div>'
      : '';

  const itens = lista.map((c) => `<li><a href="/painel/c/${esc(c.id)}">
    <span class="nome">${esc(c.empresa || c.nome || 'Sem nome')}</span><span class="hora">${quando(c.ultima_in || c.ultima_out || c.atualizado_em, config.fuso)}</span>
    <span class="prev">${esc(c.estado === 'humano' && c.erro ? c.erro : c.ultima || mascarar(c.wa))}</span><span class="tag ${esc(c.estado)}">${esc(ROTULOS[c.estado] || c.estado)}</span>
  </a></li>`).join('');

  return pagina('Robô · painel', `
<header><h1>${esc(config.negocio)}</h1><a href="/painel/importar">Importar lista</a></header>
${faixa}
<div class="nums"><div><b>${nums.voce}</b><span>esperando você</span></div><div><b>${nums.responderam}</b><span>responderam hoje</span></div><div><b>${nums.abertas}</b><span>abordados hoje</span></div><div><b>${nums.fila}</b><span>na fila</span></div></div>
<nav aria-label="Filtro">${Object.entries(filtros).map(([k, [, r]]) => `<a href="/painel?f=${k}"${k === f ? ' aria-current="page"' : ''}>${r}</a>`).join('')}</nav>
${itens ? `<ul class="lista">${itens}</ul>` : `<p class="vazio">${f === 'voce' ? 'Ninguém esperando você. O robô está dando conta.' : 'Nada aqui ainda.'}</p>`}
<h2>Testar no seu WhatsApp</h2>
<form method="post" action="/painel/teste" class="linha">
  <input name="numero" inputmode="tel" autocomplete="tel" placeholder="Seu número com DDD" required aria-label="Seu número com DDD">
  <button>${config.prospeccao.modelo ? 'Me mandar a abertura' : 'Preparar teste'}</button>
</form>
<p class="dica">${config.prospeccao.modelo ? 'O robô te manda o modelo de abertura. Responda como se fosse cliente.' : 'Sem modelo de abertura configurado: depois de preparar, mande um "oi" pro número do robô.'}</p>`);
}

export async function telaConversa(ctx, id, aviso = '') {
  const { db, config } = ctx;
  const c = await db.first('SELECT * FROM contatos WHERE id = ?', id);
  if (!c) return pagina('Não encontrado', '<p><a href="/painel">Voltar</a></p><p class="vazio">Contato não encontrado.</p>');
  const msgs = await db.all('SELECT * FROM mensagens WHERE contato = ? ORDER BY quando, id', id);
  const janela = dentroDaJanela(c, ctx.agora());
  const autor = { robo: 'robô', humano: 'você', modelo: 'modelo aprovado', cliente: '' };
  const chat = msgs.map((m) => `<div class="msg ${esc(m.direcao)}">${esc(m.texto ?? '(áudio ainda não transcrito)')}<small>${quando(m.quando, config.fuso)}${m.autor && autor[m.autor] ? ' · ' + autor[m.autor] : ''}</small></div>`).join('');
  const botao = (estado, rotulo, classe = 'sec') => `<form method="post" action="/painel/c/${esc(id)}/estado"><input type="hidden" name="estado" value="${estado}"><button class="${classe}">${rotulo}</button></form>`;
  return pagina(c.empresa || c.nome || 'Conversa', `
<p><a href="/painel">Voltar</a></p>
<h1>${esc(c.empresa || c.nome || 'Sem nome')}</h1>
<p class="meta">${esc(mascarar(c.wa))} · <span class="tag ${esc(c.estado)}">${esc(ROTULOS[c.estado] || c.estado)}</span>${c.cidade ? ' · ' + esc(c.cidade) : ''}${c.nicho ? ' · ' + esc(c.nicho) : ''}</p>
${c.erro ? `<div class="faixa ${c.estado === 'humano' ? 'aviso' : 'alerta'}"><span>${esc(c.erro)}</span></div>` : ''}
${aviso ? `<div class="faixa alerta" role="alert"><span>${esc(aviso)}</span></div>` : ''}
<div class="acoes">
  ${c.estado !== 'conversa' ? botao('conversa', 'Devolver pro robô', '') : botao('humano', 'Assumir conversa')}
  ${c.estado !== 'pausado' ? botao('pausado', 'Pausar robô') : ''}
  ${c.estado !== 'nao_contatar' ? botao('nao_contatar', 'Não contatar mais', 'perigo') : ''}
</div>
<div class="chat">${chat || '<p class="vazio">Sem mensagens.</p>'}</div>
${janela
    ? `<form method="post" action="/painel/c/${esc(id)}/responder"><label for="t">Responder como você</label><textarea id="t" name="texto" required maxlength="4000"></textarea><p class="dica">Ao responder, o robô para de falar com essa pessoa até você devolver.</p><div class="acoes"><button>Enviar</button></div></form>`
    : '<p class="faixa aviso">Passou de 24h desde a última mensagem do cliente. Pela regra da Meta, agora só modelo aprovado pode ir. Quando ele responder, a conversa reabre.</p>'}`);
}

export function telaImportar(resultado = null) {
  return pagina('Importar lista', `
<p><a href="/painel">Voltar</a></p>
<h1>Importar lista</h1>
${resultado ? `<div class="faixa ${resultado.erro ? 'alerta' : 'aviso'}" role="status"><span>${esc(resultado.erro || `${resultado.novos} novos na fila, ${resultado.repetidos} já estavam, ${resultado.invalidos} sem telefone válido.`)}</span></div>` : ''}
<form method="post" action="/painel/importar" enctype="multipart/form-data">
  <label for="arq">Arquivo CSV</label><input id="arq" type="file" name="arquivo" accept=".csv,text/csv,text/plain">
  <label for="txt">Ou cole aqui</label><textarea id="txt" name="texto" placeholder="telefone,nome,empresa,cidade,nicho"></textarea>
  <p class="dica">Precisa de uma coluna de telefone (com DDD). As colunas nome, empresa, cidade e nicho são reconhecidas sozinhas. O resto vira informação extra pra IA.</p>
  <div class="acoes"><button>Importar</button></div>
</form>`);
}

export { pagina, esc };
