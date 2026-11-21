# Erros e como resolver

Primeiro passo sempre: `npm run checar`. Ele confere tudo e aponta o que falta.

Os eventos recentes do robô ficam em `SUA_URL/painel/api/eventos` (com a senha do painel).

## Mensagem não chega no robô

Confira nesta ordem:

1. `npm run checar -- robo`: o robô está no ar e aceita o token de verificação?
2. Na Meta, **WhatsApp > Configuração > Webhook**: a URL termina em `/webhook` e o campo **messages** está assinado?
3. `npm run assinar-webhook`: sem isso a Meta aceita a URL mas não manda nada.
4. O app está em modo **Publicado** (passo 10 do `02-meta-passo-a-passo.md`)?
5. `META_APP_SECRET` certo? Se estiver errado, o robô recusa tudo (evento `webhook_recusado`).
6. `responder_desconhecidos` está `false` e quem escreveu não está na lista? Então o robô ignora de propósito.

## Robô recebe mas não responde

- Chave da IA errada ou limite estourado: `npm run checar -- ia`. Depois de 3 falhas, a conversa vai pro painel como "Esperando você".
- Contato em "Esperando você", "Pausado" ou "Não contatar": o robô não fala com ele. Devolva pelo painel.
- Passou de 24h desde a última mensagem do cliente: regra da Meta, só modelo aprovado.

## Prospecção não envia

- O painel mostra a faixa vermelha "Prospecção parada" com o motivo. Resolva e clique em **Já resolvi, voltar a enviar**.
- Fora do horário ou do dia configurado (`hora_inicio`, `hora_fim`, `dias`).
- Já bateu o `limite_dia` (os envios são espalhados pelo dia de propósito).
- Lista vazia: importe (`npm run importar`).

## Códigos da Meta

| Código | O que é | O que o robô faz |
|---|---|---|
| 0 | Token inválido ou expirado. Gere o token permanente de novo (docs/02-meta-passo-a-passo.md, passo 5). | Para a prospecção até você resolver |
| 10 | O token não tem permissão nesse número. Confira se o usuário do sistema recebeu o app e a conta do WhatsApp. | Para a prospecção até você resolver |
| 100 | Parâmetro inválido na mensagem. Confira o número e os campos do modelo. | Pula esse contato e segue |
| 190 | Token inválido ou expirado. Gere o token permanente de novo (docs/02-meta-passo-a-passo.md, passo 5). | Para a prospecção até você resolver |
| 200 | Permissão faltando no token (whatsapp_business_messaging e whatsapp_business_management). | Para a prospecção até você resolver |
| 368 | A Meta bloqueou temporariamente o envio por violação de política. Pare e veja a qualidade do número no WhatsApp Manager. | Para a prospecção até você resolver |
| 130429 | Limite de velocidade da API atingido. Espere alguns minutos. | Para a prospecção até você resolver |
| 131000 | Erro genérico da Meta. Tente de novo mais tarde. | Pula esse contato e segue |
| 131005 | Acesso negado. O token não tem permissão de envio. | Para a prospecção até você resolver |
| 131008 | Faltou um parâmetro obrigatório (algum campo do modelo ficou vazio). | Pula esse contato e segue |
| 131009 | Valor de parâmetro inválido. | Pula esse contato e segue |
| 131021 | Você tentou mandar mensagem pro próprio número do robô. | Pula esse contato e segue |
| 131026 | Esse número não recebe a mensagem (não tem WhatsApp, versão antiga ou não aceitou os termos). | Pula esse contato e segue |
| 131030 | Número de teste: só envia pra números cadastrados na lista de destinatários do app. Use um número real. | Para a prospecção até você resolver |
| 131031 | Conta do WhatsApp bloqueada ou restrita pela Meta. | Para a prospecção até você resolver |
| 131042 | Problema de pagamento: cadastre (ou corrija) a forma de pagamento da conta do WhatsApp. | Para a prospecção até você resolver |
| 131045 | Número não registrado na Cloud API. Rode: npm run registrar-numero | Para a prospecção até você resolver |
| 131047 | Passou de 24h desde a última mensagem do cliente. Só dá pra mandar modelo aprovado. | Passa a conversa pra você |
| 131048 | Limite por spam: muita gente bloqueou ou denunciou. Pare, revise a mensagem de abertura e a lista. | Para a prospecção até você resolver |
| 131049 | A Meta segurou essa mensagem de marketing pra preservar a experiência do cliente (ele já recebeu muitas). Não insista com esse contato hoje. | Pula esse contato e segue |
| 131050 | O cliente parou de aceitar mensagens de marketing. | Pula esse contato e segue |
| 131051 | Tipo de mensagem não suportado. | Pula esse contato e segue |
| 131056 | Muitas mensagens seguidas pro mesmo número. Espere um pouco. | Pula esse contato e segue |
| 131057 | Conta em manutenção. | Para a prospecção até você resolver |
| 132000 | Número de parâmetros diferente do modelo aprovado. Ajuste "parametros" em config/robo.json. | Para a prospecção até você resolver |
| 132001 | Modelo não existe nesse idioma (ou ainda não foi aprovado). Confira nome e idioma em config/robo.json. | Para a prospecção até você resolver |
| 132005 | Texto do modelo ficou grande demais com os parâmetros. | Para a prospecção até você resolver |
| 132007 | O conteúdo do modelo viola a política da Meta. | Para a prospecção até você resolver |
| 132012 | Formato de parâmetro errado pro modelo. | Para a prospecção até você resolver |
| 132015 | Modelo pausado pela Meta por baixa qualidade. Crie outro. | Para a prospecção até você resolver |
| 132016 | Modelo desativado pela Meta por baixa qualidade. Crie outro. | Para a prospecção até você resolver |
| 133010 | Número não registrado. Rode: npm run registrar-numero | Para a prospecção até você resolver |
| 135000 | Erro genérico do usuário. | Pula esse contato e segue |

Lista completa da Meta: https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes

## npm avisando "allow-scripts"

Versões novas do npm pedem permissão pra rodar scripts de instalação. Se o `wrangler` reclamar que não acha o `workerd`, rode `npm approve-scripts workerd` (ou `npm approve-scripts --allow-scripts-pending`) e `npm install` de novo.
