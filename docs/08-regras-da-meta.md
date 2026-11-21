# Regras da Meta que derrubam número (e como o robô já respeita)

| Regra | O que acontece se quebrar | O que o robô faz |
|---|---|---|
| IA de uso geral é proibida (desde 15/01/2026) | Conta pode ser removida da plataforma | A IA só fala do seu negócio e recusa assunto fora (regra fixa) |
| Primeira mensagem só com modelo aprovado | Erro, mensagem não vai | Prospecção usa só o modelo da config |
| Janela de 24h | Erro 131047 | Não manda texto livre depois de 23h30; passa a conversa pra você |
| Quem pede pra parar tem que parar | Bloqueios, qualidade cai, limite trava | "parar", "sair", "não tenho interesse" e o botão do modelo param na hora |
| Qualidade do número | Amarela/vermelha trava os envios | Erros de conta (131048, 131042, 368...) param a prospecção sozinhos |
| Limite de pessoas novas por dia (começa em 250) | Mensagens não saem | `limite_dia` na config; o `checar` avisa se passou do seu limite |
| Envio em rajada | Cara de spam, mais bloqueio | Envios espalhados ao longo do horário configurado |
| Dizer que é humano quando é robô | Reclamação, denúncia | O prompt de exemplo manda dizer a verdade se perguntarem |

## Como o limite sobe

Conta nova: 250 pessoas novas por dia (quem já está conversando com você
dentro das 24h não conta). Sobe para 2.000 quando você verifica a empresa no
portfólio, **ou** quando manda 2.000 mensagens de boa qualidade em 30 dias.
Depois sobe sozinho (10 mil, 100 mil, ilimitado) se a qualidade continuar boa
e você usar pelo menos metade do limite.

Confira o seu: `npm run meta -- numero`.

Regras completas: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
e os Termos da Solução Business do WhatsApp.
