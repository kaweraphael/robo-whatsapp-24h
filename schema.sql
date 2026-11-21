-- Banco do robô. Roda igual no Cloudflare D1 e no SQLite do Node.

CREATE TABLE IF NOT EXISTS contatos (
  id TEXT PRIMARY KEY,               -- telefone normalizado (ver src/core/numero.js)
  wa TEXT NOT NULL,                  -- número usado pra enviar (o WhatsApp devolve o certo no 1º contato)
  nome TEXT, empresa TEXT, cidade TEXT, nicho TEXT,
  extra TEXT,                        -- JSON com qualquer outra coluna da sua lista
  origem TEXT NOT NULL DEFAULT 'lista',  -- lista (você importou) ou entrou (a pessoa chamou primeiro)
  estado TEXT NOT NULL DEFAULT 'fila',
  -- fila | enviado | conversa | humano | pausado | nao_contatar | sem_whatsapp | erro
  erro TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  processando_ate INTEGER,           -- trava pra duas execuções não responderem a mesma pessoa
  criado_em INTEGER NOT NULL,
  enviado_em INTEGER, ultima_in INTEGER, ultima_out INTEGER,
  atualizado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contatos_estado ON contatos(estado, criado_em);
CREATE INDEX IF NOT EXISTS contatos_enviado ON contatos(enviado_em);

CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contato TEXT NOT NULL,
  direcao TEXT NOT NULL,             -- in (cliente) | out (robô ou você) | sistema (aviso interno pra IA)
  tipo TEXT NOT NULL DEFAULT 'text',
  texto TEXT,
  midia_id TEXT,
  wa_id TEXT UNIQUE,                 -- id da Meta: impede gravar a mesma mensagem duas vezes
  autor TEXT,                        -- robo | humano | modelo
  quando INTEGER NOT NULL,
  processada INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS mensagens_contato ON mensagens(contato, quando);
CREATE INDEX IF NOT EXISTS mensagens_pendentes ON mensagens(processada, direcao);

CREATE TABLE IF NOT EXISTS eventos (quando INTEGER NOT NULL, tipo TEXT NOT NULL, texto TEXT);
CREATE INDEX IF NOT EXISTS eventos_quando ON eventos(quando);

CREATE TABLE IF NOT EXISTS ajustes (chave TEXT PRIMARY KEY, valor TEXT);
