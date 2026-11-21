// Camada fininha sobre o banco. O Cloudflare usa D1 e o Node usa SQLite,
// mas os dois falam SQL do SQLite: só muda o jeito de chamar.
// Interface: all(sql, ...p) -> linhas, first(sql, ...p) -> linha|null, run(sql, ...p) -> nº de linhas mudadas

const limpar = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));

export function bancoD1(DB) {
  return {
    async all(sql, ...p) { return (await DB.prepare(sql).bind(...limpar(p)).all()).results || []; },
    async first(sql, ...p) { return (await DB.prepare(sql).bind(...limpar(p)).first()) ?? null; },
    async run(sql, ...p) { return (await DB.prepare(sql).bind(...limpar(p)).run()).meta?.changes ?? 0; },
    async exec(sql) {
      for (const cmd of sql.split(';').map((s) => s.replace(/--[^\n]*/g, '').trim()).filter(Boolean)) await DB.prepare(cmd).run();
    },
  };
}

export function bancoSQLite(db) {
  const cache = new Map();
  const prep = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  return {
    async all(sql, ...p) { return prep(sql).all(...limpar(p)).map((r) => ({ ...r })); },
    async first(sql, ...p) { const r = prep(sql).get(...limpar(p)); return r ? { ...r } : null; },
    async run(sql, ...p) { return Number(prep(sql).run(...limpar(p)).changes); },
    async exec(sql) { db.exec(sql); },
  };
}
