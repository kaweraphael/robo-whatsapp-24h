# Por que a API oficial (e não um "WhatsApp pirata")

Existem dois jeitos de colocar um robô no WhatsApp:

| | API oficial da Meta (este projeto) | Apps não oficiais (Evolution, uazapi, Baileys, WPPConnect...) |
|---|---|---|
| Como funciona | A Meta te dá uma porta oficial pra mandar e receber mensagens | Um programa finge ser o WhatsApp Web no seu celular |
| Risco de ban | Só se você quebrar as regras (spam, gente bloqueando) | Alto. Pode cair a qualquer momento, com conversas dentro |
| Abrir conversa com quem nunca falou com você | Só com **modelo aprovado** pela Meta | Manda qualquer texto (por isso bane) |
| Custo | Paga por mensagem (veja `06-custos.md`) | O programa costuma ser pago, e o chip é você que perde |
| Limite | Começa com 250 pessoas novas por dia e sobe com boa qualidade | Não tem limite oficial, mas o ban vem antes |
| Nome e selo | Nome de exibição aprovado, pode ter selo de verificado | Seu número pessoal |

**Resumo pra quem vende:** o app pirata é barato até o dia em que o número
cai no meio da campanha. A API oficial custa centavos por mensagem e não
derruba o número sem motivo. Se a operação depende do WhatsApp, use a oficial.

## As três regras da API oficial que mudam o jeito de prospectar

1. **Primeira mensagem só com modelo aprovado.** Você escreve o texto, manda
   pra Meta, ela aprova em minutos ou horas. Variáveis como `{{1}}` viram o
   nome da pessoa, da empresa etc.
2. **Janela de 24 horas.** Depois que a pessoa responde, você (e o robô) podem
   mandar qualquer texto por 24h. Passou disso, só outro modelo aprovado.
3. **Qualidade.** Se muita gente bloqueia ou denuncia, a Meta baixa a nota do
   número e trava os envios. Lista boa e mensagem honesta mantêm o número vivo.

## Regra de IA (desde 15/01/2026)

A Meta proíbe usar a API pra oferecer **assistente de IA de uso geral**
(tipo um ChatGPT no WhatsApp). Robô que atende e vende **para um negócio
específico** continua liberado. Este projeto já trava a IA no assunto do seu
negócio (regra fixa no `src/core/robo.js`). Não tire essa trava.
