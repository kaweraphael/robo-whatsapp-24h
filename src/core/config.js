// Junta o config/robo.json com os valores padrão e confere se faz sentido.
// Qualquer erro aqui aparece no `npm run checar` antes de ir pro ar.

export const PADRAO = {
  negocio: 'Meu negócio',
  fuso: 'America/Sao_Paulo',
  ddi_padrao: '55',
  ia: { provedor: 'gemini', modelo: '', max_tokens: 2048, temperatura: 0.6 },
  meta: { versao: 'v25.0' },
  atendimento: {
    ligado: true,
    responder_desconhecidos: true, // responde quem chama sem estar na lista (receptivo)
    espera_segundos: 15,           // espera a pessoa terminar de digitar antes de responder
    historico_max: 30,             // quantas mensagens a IA lê de contexto
    marcar_como_lida: true,
    audio: true,
    palavras_parar: ['parar', 'pare', 'sair', 'stop', 'cancelar', 'descadastrar', 'não tenho interesse', 'nao tenho interesse'],
    resposta_parar: 'Pronto, não vou mais te mandar mensagem. Se precisar, é só chamar.',
  },
  prospeccao: {
    ligada: false,
    modelo: '',              // nome do modelo aprovado na Meta
    idioma: 'pt_BR',
    nomeados: false,         // true se o modelo usa {{nome}} em vez de {{1}}
    parametros: [],          // [{ "nome": "1", "campo": "nome", "padrao": "tudo bem" }]
    texto_para_ia: '',       // o texto do modelo, pra IA saber o que foi dito
    limite_dia: 30,
    dias: [1, 2, 3, 4, 5],   // 0 = domingo ... 6 = sábado
    hora_inicio: 9,
    hora_fim: 18,
  },
};

function mesclar(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? mesclar(base[k], v) : v;
  }
  return out;
}

export function carregarConfig(json) {
  return mesclar(PADRAO, json || {});
}

// Devolve lista de problemas (texto). Vazia = tudo certo.
export function validarConfig(c) {
  const p = [];
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: c.fuso }); } catch { p.push(`fuso "${c.fuso}" não existe (ex.: America/Sao_Paulo)`); }
  if (!/^v\d+\.\d+$/.test(c.meta.versao)) p.push(`meta.versao "${c.meta.versao}" inválida (ex.: v25.0)`);
  const a = c.atendimento;
  if (!(a.espera_segundos >= 0 && a.espera_segundos <= 25)) p.push('atendimento.espera_segundos precisa ficar entre 0 e 25 (no Cloudflare o robô só pode esperar ~30 s depois do webhook)');
  const pr = c.prospeccao;
  if (pr.ligada) {
    if (!pr.modelo) p.push('prospeccao.ligada = true mas prospeccao.modelo está vazio');
    if (!Array.isArray(pr.parametros)) p.push('prospeccao.parametros precisa ser uma lista');
    else for (const [i, x] of pr.parametros.entries()) {
      if (!x.campo) p.push(`prospeccao.parametros[${i}] sem "campo"`);
      if (pr.nomeados && !x.nome) p.push(`prospeccao.parametros[${i}] sem "nome" (modelo com parâmetros nomeados)`);
      if (!x.padrao) p.push(`prospeccao.parametros[${i}] sem "padrao": se o campo vier vazio, a Meta recusa a mensagem (erro 131008)`);
    }
    if (!(pr.hora_inicio >= 0 && pr.hora_fim <= 24 && pr.hora_inicio < pr.hora_fim)) p.push('prospeccao.hora_inicio/hora_fim inválidos');
    if (!(pr.limite_dia > 0)) p.push('prospeccao.limite_dia precisa ser maior que 0');
    if (pr.limite_dia > 250) p.push('prospeccao.limite_dia acima de 250: conta nova da Meta só alcança 250 pessoas novas por dia até subir de nível');
  }
  return p;
}
