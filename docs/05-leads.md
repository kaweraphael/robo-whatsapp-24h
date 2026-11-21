# De onde vem a lista (e como importar)

## Formato

Um CSV com, no mínimo, uma coluna de telefone com DDD. O robô reconhece
sozinho os nomes mais comuns:

| O robô entende como | Nomes aceitos na sua planilha |
|---|---|
| telefone | telefone, celular, whatsapp, phone, número, fone |
| nome | nome, contato, responsável, name |
| empresa | empresa, negócio, nome fantasia, razão social, title, company |
| cidade | cidade, município, city |
| nicho | nicho, categoria, segmento, ramo, category |

Qualquer outra coluna (nota no Google, site, bairro...) vai junto como
informação extra: a IA lê na ficha do contato e pode usar na conversa.
Vírgula ou ponto e vírgula, tanto faz. Telefone repetido entra uma vez só.

## Importar

```bash
npm run importar -- listas/minha-lista.csv
```

Ou pelo painel: `SUA_URL/painel` > **Importar lista** (arquivo ou colar).

## Onde conseguir lista de negócios

- **Google Maps**: extensões e ferramentas de extração exportam nome,
  telefone, nota e categoria dos negócios de uma cidade.
- **CNPJs novos (dados abertos da Receita Federal)**: empresa que acabou de
  abrir precisa de tudo (site, contador, marketing). Existem sites grátis que
  filtram os CNPJs abertos nos últimos dias por cidade, com telefone.
- **Sua própria base**: clientes antigos, quem pediu orçamento e sumiu.

## Regras pra não queimar o número (e respeitar a LGPD)

- Aborde **empresas** sobre algo que faz sentido pra elas. Contato comercial
  com dado público de empresa, com saída fácil, é o caminho.
  Não compre lista de pessoas físicas.
- Comece devagar: `limite_dia` baixo (20 a 30) nos primeiros dias. Se a
  qualidade continuar verde (`npm run meta -- numero`), aumente.
- Mensagem personalizada (nome da empresa, cidade) é bloqueada bem menos que
  texto genérico.
- Quem pede pra parar nunca mais recebe nada. O robô já faz isso sozinho.
