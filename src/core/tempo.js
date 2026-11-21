// Horário no fuso do negócio (config "fuso"), sem depender do fuso do servidor.
// O Cloudflare roda em UTC; um VPS pode estar em qualquer lugar.

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const NUM_DIA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function partes(ms, fuso) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute, segundo: +p.second,
    semana: NUM_DIA[p.weekday], nomeDia: DIAS[NUM_DIA[p.weekday]],
  };
}

// Milissegundos da meia-noite de hoje no fuso do negócio.
export function inicioDoDia(ms, fuso) {
  const p = partes(ms, fuso);
  return ms - ((p.hora * 60 + p.minuto) * 60 + p.segundo) * 1000 - (ms % 1000);
}

export function saudacao(ms, fuso) {
  const h = partes(ms, fuso).hora;
  return h < 12 ? 'bom dia' : h < 18 ? 'boa tarde' : 'boa noite';
}

export function dataHora(ms, fuso) {
  const p = partes(ms, fuso);
  const z = (n) => String(n).padStart(2, '0');
  return `${p.nomeDia}, ${z(p.dia)}/${z(p.mes)}/${p.ano}, ${z(p.hora)}:${z(p.minuto)}`;
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
