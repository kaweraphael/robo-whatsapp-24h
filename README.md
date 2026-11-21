# Robô de WhatsApp 24h

Robô que **prospecta e atende no WhatsApp 24 horas**, usando a **API oficial
da Meta** (sem risco de ban por app pirata) e a **IA que você escolher**
(Gemini grátis, ChatGPT, Claude ou outra). Roda de graça na Cloudflare ou em
qualquer servidor.

> Vídeo explicando tudo: LINK_DO_VIDEO

## O que ele faz

- **Atende** quem chama no WhatsApp, a qualquer hora, com as informações do
  seu negócio, e entende áudio.
- **Prospecta**: abre conversa com a sua lista usando um modelo aprovado
  pela Meta, espalhando os envios ao longo do dia.
- **Passa pra você** quando a pessoa pede um humano, reclama ou pergunta algo
  que ele não sabe.
- **Respeita quem não quer**: "parar" ou "não tenho interesse" e a pessoa
  nunca mais recebe nada.
- **Painel** no celular: veja quem está esperando você, responda, pause o robô.
- **Para sozinho** se a Meta reclamar (pagamento, qualidade, modelo
  recusado), em vez de queimar o seu número.

## Custos reais

| | |
|---|---|
| Cloudflare (hospedagem + banco) | Grátis no volume de um negócio pequeno |
| Gemini (IA) | Tem plano grátis, com limites (veja `docs/03-ia.md`) |
| Meta (WhatsApp) | **Paga por mensagem.** A abertura de prospecção custa uns R$ 0,35 a 0,40. Respostas: 1.000 grátis por mês por número |

Detalhes e uma conta de exemplo em [docs/06-custos.md](docs/06-custos.md).

## Como configurar

### Com o Claude Code (recomendado)

1. Instale o [Node.js](https://nodejs.org) (22 ou mais novo) e o
   [Claude Code](https://claude.com/claude-code).
2. Baixe este repositório (botão **Code > Download ZIP**, ou `git clone`).
3. Abra a pasta no terminal, rode `claude` e digite:

   ```
   configura pra mim
   ```

O Claude te faz algumas perguntas sobre o seu negócio, escreve o atendente,
te guia em cada tela da Meta, publica o robô e testa no seu WhatsApp. Ele
segue o roteiro do [CLAUDE.md](CLAUDE.md).

### Na mão

1. `npm install` e `cp .env.exemplo .env`
2. Edite `config/robo.json` e `config/atendente.md`.
3. Chave da IA: [docs/03-ia.md](docs/03-ia.md). Teste com `npm run simular`.
4. Meta, passo a passo: [docs/02-meta-passo-a-passo.md](docs/02-meta-passo-a-passo.md)
5. Publique: [docs/04-hospedagem.md](docs/04-hospedagem.md)
6. `npm run checar` até ficar tudo verde.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run checar` | Confere tudo (IA, Meta, robô no ar) e diz o que falta |
| `npm run simular` | Conversa com o atendente no terminal, sem WhatsApp |
| `npm run publicar:cloudflare` | Cria e publica tudo na Cloudflare (rode de novo pra atualizar) |
| `npm run iniciar` | Roda num servidor Node |
| `npm run importar -- lista.csv` | Manda uma lista de contatos pro robô |
| `npm run teste -- 11999998888` | O robô te manda a mensagem de abertura |
| `npm run registrar-numero -- 123456` | Registra o número na Cloud API |
| `npm run assinar-webhook` | Liga o app à conta do WhatsApp (sem isso nada chega) |
| `npm run criar-modelo` | Manda o modelo de abertura pra aprovação |
| `npm run modelos` | Status dos seus modelos |
| `npm run meta -- numero` | Qualidade e limite do número |
| `npm test` | Testes automáticos |

## Guias

1. [Por que a API oficial](docs/01-por-que-api-oficial.md)
2. [Meta passo a passo](docs/02-meta-passo-a-passo.md)
3. [Qual IA usar](docs/03-ia.md)
4. [Onde hospedar](docs/04-hospedagem.md)
5. [Lista de contatos](docs/05-leads.md)
6. [Custos](docs/06-custos.md)
7. [Erros](docs/07-erros.md)
8. [Regras da Meta](docs/08-regras-da-meta.md)

## Estrutura

```
config/            o que você edita: robo.json, atendente.md, modelo-abertura.json
src/core/          o robô (igual em qualquer hospedagem)
src/plataformas/   liga o robô na Cloudflare ou no Node
scripts/           checar, publicar, importar, simular, atalhos da Meta
docs/              os guias
test/              testes com Meta e IA falsas
```

## Licença

MIT. Use, modifique e venda à vontade. Sem garantia: confira as regras da Meta
e a LGPD pro seu caso.
