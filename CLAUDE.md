# Robô de WhatsApp 24h — guia de configuração para o Claude Code

Você (Claude) vai configurar este robô junto com uma pessoa que provavelmente
**não é programadora**. Ela assistiu a um vídeo, baixou o repositório e
digitou algo como "configura pra mim". Seu trabalho é levar ela do zero até o
robô respondendo no WhatsApp dela, sem ela travar em nenhum passo.

## Regras de conversa

- Fale em português do Brasil, simples, sem jargão. Se precisar de um termo
  técnico, explique em meia frase ("token, que é a senha que a Meta te dá").
- **Uma pergunta por vez.** Se a ferramenta de perguntas com opções
  (AskUserQuestion) existir, use ela pras escolhas (IA, hospedagem, modo).
  Nunca despeje um formulário de 10 perguntas.
- Mensagens curtas. Diga o próximo passo, espere a pessoa fazer, confira.
- Depois de cada etapa, **rode o `npm run checar`** (ou a parte dele) e só
  avance quando estiver verde. Não acredite em "já fiz": confira.
- Se a pessoa travar numa tela da Meta, peça um print. A Meta muda nome de
  botão com frequência: o `docs/02-meta-passo-a-passo.md` descreve o caminho,
  o print mostra a tela real.
- Se você não tiver certeza de como está a tela da Meta hoje, pesquise na web
  antes de inventar o nome de um botão.

## Segredos (não negociável)

- **Nunca** mostre, repita ou imprima token, chave de API, App Secret ou senha,
  nem em parte. Nem pra "confirmar". O `npm run checar` confere sem mostrar.
- O melhor caminho: a pessoa cola a chave direto no arquivo `.env` (abra o
  arquivo pra ela no editor). Se ela colar no chat, grave no `.env` com
  `node -e` (lendo de uma variável, sem ecoar) e diga só "gravei".
- Gere você mesmo `META_VERIFY_TOKEN` e `PAINEL_SENHA` com
  `node -e "console.log(crypto.randomUUID())"` direto pro `.env`. A senha do
  painel a pessoa precisa saber: mostre **uma vez** e peça pra ela guardar.
- `.env` nunca vai pro git (já está no `.gitignore`). Não faça commit nem push
  de nada sem a pessoa pedir.

## Antes de tudo: onde a pessoa está?

Rode `npm run checar`. Se já houver coisa configurada, continue de onde parou
em vez de recomeçar. Se for do zero, siga as etapas abaixo na ordem.

---

## Etapa 1 — Entender o negócio (perguntas, uma por vez)

1. Como se chama o negócio e o que vende? Pra quem? Em que cidade?
2. O robô vai **só atender** quem chamar, ou também **prospectar** (abrir
   conversa com uma lista de contatos)?
3. Qual é o objetivo de cada conversa? (marcar horário, mandar orçamento,
   passar pra um vendedor, mandar link de compra...)
4. O que o atendente precisa saber: preços (ou "a partir de"), horários,
   endereço, formas de pagamento, diferenciais, perguntas frequentes.
5. Quando ele deve passar pra uma pessoa?
6. Nome do atendente e jeito de falar (formal, descontraído). Usa emoji ou não?

Com isso, escreva:
- `config/atendente.md`: siga a estrutura de `config/atendente.exemplo.md`
  (Quem você é, Objetivo, O que você sabe, Como você fala, Quando passar pra
  equipe). **Só fatos que a pessoa te deu.** Nada de preço ou promessa
  inventada. Mostre o resumo e peça aprovação.
- `config/robo.json`: `negocio`, `fuso` (pergunte se não for horário de
  Brasília), e o resto no padrão.

## Etapa 2 — Escolher a IA

Pergunte com opções:
- **Gemini (Recomendado pra começar)**: tem plano grátis. Avise das duas
  coisas do grátis: limite diário e o Google poder usar os dados (detalhes em
  `docs/03-ia.md`).
- **ChatGPT (OpenAI)**: pago, muito bom em seguir instrução.
- **Claude (Anthropic)**: pago, ótimo texto. Não ouve áudio.
- **Outra** (OpenRouter, Groq, DeepSeek, Ollama): use `openrouter` ou
  `compativel` + `IA_BASE_URL`.

Grave `ia.provedor` (e `ia.modelo` se ela quiser um específico) no
`config/robo.json`. Passe o link da chave (tabela em `docs/03-ia.md`), espere
ela colar no `.env` e rode:

```bash
npm install
npm run checar -- ia
npm run simular
```

No simulador, peça pra ela conversar como cliente e tentar quebrar o robô
(desconto, assunto fora, "quero falar com alguém", "não quero mais"). Ajuste o
`atendente.md` com ela até ficar bom. **Esta é a etapa que faz o robô vender:
não pule.**

## Etapa 3 — Onde hospedar

Pergunte com opções:
- **Cloudflare (Recomendado)**: grátis, sem servidor pra cuidar.
- **Railway / Render / Fly**: serviço pronto, pode ser pago.
- **VPS ou servidor próprio**: pra quem já tem.
- **Docker**: pra quem já usa.

Guarde a escolha. A publicação acontece na Etapa 5 (o robô precisa das chaves
da Meta antes).

## Etapa 4 — Meta (a parte mais longa)

Conduza `docs/02-meta-passo-a-passo.md` **um passo por vez**, passos 1 a 7.
Antes de começar, confirme que ela tem: um número livre (fora de qualquer
WhatsApp) que recebe SMS ou ligação, e um cartão de crédito.

Pontos onde todo mundo trava, fique atento:
- Usar o **token temporário** da tela de API (expira em 24h). Tem que ser o
  do **usuário do sistema**, "Nunca expira", com as duas permissões. O
  `checar` detecta.
- Confundir o **ID do número** com o telefone.
- Esquecer a **forma de pagamento** (erro 131042 depois).
- Esquecer de **registrar o número**: `npm run registrar-numero -- PIN`.

Rode `npm run checar -- meta` depois dos passos 3, 5 e 7.

## Etapa 5 — Publicar

- Cloudflare: peça pra ela rodar `npx wrangler login` (abre o navegador; o
  login precisa ser dela). Depois rode `npm run publicar:cloudflare`.
- Outros: siga `docs/04-hospedagem.md` com ela e grave a URL final em
  `ROBO_URL` no `.env`.

Depois: `npm run checar -- robo`.

## Etapa 6 — Webhook e modo publicado

Passos 8 a 10 do `docs/02-meta-passo-a-passo.md`. Dê a ela a URL exata
(`ROBO_URL` + `/webhook`) e diga que o "Verificar token" é o que está no
`.env` como `META_VERIFY_TOKEN` (ela pode abrir o `.env` pra copiar). Depois:

```bash
npm run assinar-webhook
npm run checar
```

## Etapa 7 — Teste ao vivo

```bash
npm run teste -- NUMERO_PESSOAL_DELA
```

Sem modelo de abertura ainda, peça pra ela mandar "oi" do celular dela pro
número do robô. Ela deve receber a resposta em uns 15 a 30 segundos. Mostre o
painel: `ROBO_URL/painel` (qualquer usuário + `PAINEL_SENHA`).

Não respondeu? `docs/07-erros.md`, seção "Mensagem não chega no robô".

## Etapa 8 — Prospecção (só se ela escolheu prospectar)

1. Escreva com ela o `config/modelo-abertura.json` (regras no passo 11 do
   `docs/02`): uma frase dizendo quem é e por que está chamando, nome ou
   empresa como variável, botões "Quero saber" e "Não tenho interesse".
2. `npm run criar-modelo` e depois `npm run modelos` até aparecer APROVADO.
3. No `config/robo.json`, em `prospeccao`:
   - `modelo`: o nome; `idioma`: o mesmo do modelo.
   - `parametros`: um por variável, na ordem, cada um com `campo` (coluna da
     lista: nome, empresa, cidade, nicho ou outra) e `padrao` (o que vai se o
     campo estiver vazio). **Sem `padrao`, a Meta recusa a mensagem.**
   - `texto_para_ia`: o texto do modelo, pra IA saber o que foi dito.
   - `limite_dia`: **20 a 30 na primeira semana.** Explique o porquê
     (qualidade do número). Não suba por pedido dela sem avisar do risco.
   - `ligada: true`.
4. Lista: `docs/05-leads.md`. `npm run importar -- caminho.csv`.
5. Publique de novo (`npm run publicar:cloudflare` ou reinicie o servidor) e
   rode `npm run checar`.
6. Teste com o número dela: `npm run teste -- NUMERO`.

## Etapa 9 — Fechamento

Explique em 4 linhas:
- O painel é onde ela vê quem está "Esperando você" e responde.
- Mudou o prompt ou a config? Publique de novo.
- Custos reais: `docs/06-custos.md` (a abertura é o que mais pesa).
- Qualidade do número: `npm run meta -- numero` uma vez por semana.

---

## Mudanças depois

| Ela quer... | Você faz |
|---|---|
| Mudar o que o atendente fala | Edita `config/atendente.md`, testa com `npm run simular`, publica |
| Trocar a IA | `ia.provedor`/`ia.modelo` + chave no `.env`, `npm run checar -- ia`, publica |
| Mais ou menos abordagens | `prospeccao.limite_dia` (confira o limite com `npm run meta -- numero`) |
| Pausar a prospecção | `prospeccao.ligada: false` e publica |
| Mudar de Cloudflare pra servidor | `docs/04-hospedagem.md`; o banco não migra sozinho |
| Responder só quem está na lista | `atendimento.responder_desconhecidos: false` |

## O que nunca fazer

- Desligar a conferência de assinatura do webhook (`PERMITIR_SEM_ASSINATURA`
  existe só pros testes automáticos).
- Tirar a trava de "só falar do negócio" do `montarSistema` em
  `src/core/robo.js`. É a regra de IA da Meta.
- Inventar preço, resultado ou depoimento no `atendente.md`.
- Mandar texto livre fora da janela de 24h ou abrir conversa sem modelo
  aprovado.
- Subir o `limite_dia` acima do limite da conta na Meta.

## Para quem for mexer no código

- `npm test`: 33 testes (unidade + o robô inteiro contra uma Meta e uma IA
  falsas). `node test/cloudflare-local.mjs` roda o mesmo fluxo no Worker de
  verdade, local. Rode os dois antes de qualquer mudança no `src/`.
- A lógica fica em `src/core/` e é a mesma nas duas hospedagens.
  `src/plataformas/` só liga o núcleo ao Cloudflare ou ao Node.
- API da Meta: versão em `config/robo.json` (`meta.versao`). Ao trocar de
  versão, leia o changelog da Meta e rode os testes.
