# Quanto custa de verdade

**Resumo:** Cloudflare e Gemini dá pra usar de graça. A Meta cobra por
mensagem. Os valores abaixo são referência de novembro de 2026: a Meta muda a
tabela no início de cada trimestre, então confira sempre a oficial:
https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing

## Meta (WhatsApp)

| O que | Quando | Preço aproximado no Brasil |
|---|---|---|
| Modelo de **marketing** (a abertura da prospecção) | Cada mensagem entregue | ~US$ 0,06 a 0,07 (uns R$ 0,35 a 0,40) |
| Resposta dentro das 24h (**serviço**) | Desde 01/10/2026 é cobrada | **1.000 grátis por mês por número**; depois, preço de utilidade (~US$ 0,007) |
| Conversa que começou por anúncio "clique pro WhatsApp" | 72h de janela | Grátis |

No Brasil a cobrança é em reais, pela Facebook Brasil.

**Conta de exemplo** (30 abordagens por dia útil, ~22 dias):
660 aberturas × R$ 0,38 ≈ **R$ 250/mês**. As respostas do robô quase sempre
cabem nas 1.000 grátis do mês. O que pesa é a abertura, então lista boa e
mensagem boa são economia direta.

## IA

| Provedor | Custo |
|---|---|
| Gemini (plano grátis) | R$ 0, com limite por dia e o Google podendo usar os dados |
| Gemini com faturamento | Centavos por centena de conversas no Flash-Lite |
| OpenAI / Claude / OpenRouter | Pré-pago: põe crédito e ele desconta. Modelos pequenos custam centavos por centena de conversas |

## Hospedagem

| Onde | Custo |
|---|---|
| Cloudflare Workers + D1 | Grátis no volume de um negócio pequeno |
| Railway / Render / VPS | De grátis (limitado) a ~R$ 30/mês |

## Onde dá pra gastar sem perceber

- Aumentar o `limite_dia` sem olhar a taxa de resposta.
- Lista ruim (número fixo, empresa fechada): a mensagem entregue é cobrada
  mesmo sem resposta.
- IA grande demais pra uma tarefa simples. Comece pelo modelo pequeno.
