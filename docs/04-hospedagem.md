# Onde o robô roda

O robô precisa ficar ligado 24h num endereço público (é pra lá que a Meta
manda as mensagens). Duas opções, o mesmo código:

| | Cloudflare Workers (padrão) | Servidor Node (VPS, Railway, Render, Fly, Docker) |
|---|---|---|
| Custo | Grátis no volume de um negócio pequeno | De grátis (limitado) a uns R$ 30/mês |
| Banco | D1 (da Cloudflare, grátis) | Arquivo SQLite no servidor |
| Manutenção | Nenhuma | Você cuida do servidor |
| Publicar | `npm run publicar:cloudflare` | Depende do serviço (abaixo) |

## Cloudflare (recomendado)

1. Crie conta grátis em https://dash.cloudflare.com/sign-up
2. No terminal, dentro da pasta do robô:
   ```bash
   npx wrangler login        # abre o navegador, clique em Allow
   npm run publicar:cloudflare
   ```
3. O script cria o banco, publica, sobe as chaves criptografadas e grava a URL
   em `ROBO_URL` no `.env`.
4. Mudou o prompt, a config ou alguma chave? Rode `npm run publicar:cloudflare`
   de novo. Ele atualiza sem apagar nada.

Na primeira vez a Cloudflare pode pedir pra você escolher um subdomínio
`workers.dev` (em dash.cloudflare.com > Workers). É grátis.

**Limites do plano grátis** (sobram pra um negócio pequeno): 100 mil
requisições por dia, banco de 5 GB e o relógio que roda a cada minuto.
Confira os números atuais em https://developers.cloudflare.com/workers/platform/limits/

## Servidor Node

Precisa de Node 22.13 ou mais novo (o banco usa o SQLite que já vem no Node).

```bash
npm run iniciar            # sobe na porta 8787 (ou PORT)
```

As variáveis vêm do `.env` ou do painel do serviço. Pra o banco não sumir a
cada atualização, aponte `BANCO_ARQUIVO` pra um disco persistente.

- **Railway / Render / Fly**: crie o serviço a partir do repositório, comando
  de início `npm run iniciar`, adicione as variáveis do `.env` e um volume
  persistente montado em `/app/dados`.
- **VPS (qualquer Linux)**: `git clone`, preencha o `.env`, rode com
  `pm2 start "npm run iniciar" --name robo` e ponha um HTTPS na frente
  (Caddy faz isso sozinho).
- **Docker**: `docker build -t robo . && docker run -d --env-file .env -v robo-dados:/app/dados -p 8787:8787 robo`

A Meta exige **HTTPS**. Railway, Render, Fly e a Cloudflare já dão HTTPS.

## Testar no seu computador antes

```bash
npm run iniciar
npx cloudflared tunnel --url http://localhost:8787
```

O segundo comando dá uma URL https temporária (`...trycloudflare.com`) que
você pode usar no webhook da Meta pra testar. Ela muda toda vez: não use em
produção.

Depois de publicar em qualquer lugar: `npm run checar -- robo`.
