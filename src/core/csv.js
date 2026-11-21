// Lê CSV de qualquer lugar (Google Maps, Excel, planilha do Google, Kaptar...).
// Aceita vírgula ou ponto e vírgula, aspas, e reconhece as colunas pelo nome.

const SINONIMOS = {
  telefone: ['telefone', 'phone', 'celular', 'whatsapp', 'whats', 'numero', 'número', 'fone', 'tel', 'phone_number', 'telefone1', 'mobile'],
  nome: ['nome', 'name', 'contato', 'responsavel', 'responsável', 'primeiro_nome', 'first_name'],
  empresa: ['empresa', 'negocio', 'negócio', 'nome_empresa', 'razao_social', 'razão social', 'nome_fantasia', 'title', 'company', 'estabelecimento'],
  cidade: ['cidade', 'city', 'municipio', 'município', 'localidade'],
  nicho: ['nicho', 'categoria', 'category', 'segmento', 'ramo', 'atividade'],
};

const sem = (s) => String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');

export function lerCSV(texto) {
  const t = String(texto).replace(/^﻿/, '');
  const primeira = t.split(/\r?\n/, 1)[0] || '';
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : primeira.includes('\t') && !primeira.includes(',') ? '\t' : ',';
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
    } else campo += ch;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
  if (linhas.length < 2) return { linhas: [], colunas: {} };

  const cab = linhas[0].map((c) => c.trim());
  const mapa = {}; // índice -> nome final
  const usados = new Set();
  cab.forEach((c, i) => {
    const s = sem(c);
    for (const [destino, lista] of Object.entries(SINONIMOS)) {
      if (!usados.has(destino) && lista.map(sem).includes(s)) { mapa[i] = destino; usados.add(destino); return; }
    }
    mapa[i] = s || `coluna_${i + 1}`;
  });
  const objetos = linhas.slice(1).map((l) => Object.fromEntries(cab.map((_, i) => [mapa[i], (l[i] ?? '').trim()])));
  return { linhas: objetos, colunas: Object.fromEntries(Object.entries(mapa).map(([i, n]) => [cab[i], n])), temTelefone: usados.has('telefone') };
}
