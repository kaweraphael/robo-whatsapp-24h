# Meta: do zero ao número funcionando

Leva uns 30 a 60 minutos na primeira vez. A Meta muda o nome dos botões de vez
em quando: se algo estiver diferente, procure pelo nome em negrito, ou mande um
print pro Claude Code.

Depois de cada passo, rode `npm run checar -- meta`. Ele diz o que já está
certo e o que falta.

**O que você vai precisar ter em mãos**
- Uma conta pessoal no Facebook (só pra entrar; ela não aparece pro cliente).
- Um número de telefone que **não esteja** em nenhum WhatsApp no momento
  (chip novo, ou um número que você apagou do app). Precisa receber SMS ou
  ligação para o código. Fixo também serve, recebendo por ligação.
- Um cartão de crédito (a Meta cobra por mensagem).

---

## Passo 1. Portfólio empresarial (Business Manager)

1. Entre em **https://business.facebook.com** e crie um **portfólio
   empresarial** com o nome do seu negócio.
2. Não precisa verificar a empresa agora. A verificação só aumenta o limite
   de 250 para 2.000 pessoas novas por dia; dá pra fazer depois.

## Passo 2. App no Meta for Developers

1. Entre em **https://developers.facebook.com/apps** > **Criar app**.
2. Caso de uso: **Conectar-se com clientes pelo WhatsApp** (em inglês:
   *Connect with customers through WhatsApp*).
3. Escolha o portfólio do passo 1.
4. Dentro do app, abra **WhatsApp > Configuração da API** (*API Setup*).
   A Meta cria sozinha um **número de teste**. Ele serve pra testar, mas só
   manda pra até 5 números que você cadastrar.

## Passo 3. Seu número de verdade

1. Em **WhatsApp > Configuração da API**, clique em **Adicionar número de
   telefone**.
2. Preencha o **nome de exibição** (o nome que o cliente vê). Regras da Meta:
   tem que ter relação com o seu negócio, sem palavras genéricas sozinhas
   ("Vendas", "Promoções").
3. Receba o código por SMS ou ligação e confirme.
4. Agora copie os dois IDs que aparecem na tela (são números compridos,
   **não** o telefone):
   - **Identificação do número de telefone** (*Phone number ID*) → `META_PHONE_NUMBER_ID`
   - **Identificação da conta do WhatsApp Business** (*WhatsApp Business Account ID*) → `META_WABA_ID`

> Quer continuar usando o número também no app WhatsApp Business do celular?
> A Meta tem o modo **Coexistência**, que conecta um número que já está no app.
> Funciona, mas tem limitações (alguns recursos e históricos não passam).
> Para um robô de prospecção, número dedicado é mais simples.

## Passo 4. Forma de pagamento

1. Em **https://business.facebook.com** > **Configurações** > **Cobrança e
   pagamentos** (ou pelo **WhatsApp Manager** > **Visão geral** > adicionar
   forma de pagamento).
2. Cadastre o cartão na **conta do WhatsApp Business**.
3. No Brasil a cobrança é em reais (BRL).

Sem esse passo, o robô dá **erro 131042** na primeira mensagem.

## Passo 5. Token PERMANENTE (o passo que mais trava gente)

O token que aparece na tela de Configuração da API **expira em 24 horas**.
Se você usar ele, o robô para de funcionar amanhã. Faça o permanente:

1. **https://business.facebook.com/settings** > **Usuários** > **Usuários do
   sistema** > **Adicionar**.
2. Nome: `robo` (qualquer um). Função: **Administrador**.
3. Clique no usuário criado > **Atribuir ativos**:
   - **Apps** > seu app > marque **Controle total** (gerenciar app).
   - **Contas do WhatsApp** > sua conta > marque **Controle total**.
4. Clique em **Gerar token**:
   - App: o seu app.
   - Validade: **Nunca expira**.
   - Permissões: marque **whatsapp_business_messaging** e
     **whatsapp_business_management**.
5. Copie o token (começa com `EAA`) → `META_TOKEN`. Ele só aparece uma vez.

`npm run checar -- meta` confirma se é permanente e se tem as duas permissões.

## Passo 6. Chave secreta do app

1. No app, **Configurações do app** > **Básico**.
2. **Chave secreta do app** > **Mostrar** → `META_APP_SECRET`.

O robô usa essa chave pra conferir que cada mensagem veio mesmo da Meta.

## Passo 7. Registrar o número na Cloud API

```bash
npm run registrar-numero -- 123456
```

Troque `123456` por um PIN de 6 dígitos que você escolher e **guarde**: ele
vira a verificação em duas etapas do número. Se o número já tinha verificação
em duas etapas, use o PIN dela.

## Passo 8. Publicar o robô

Antes de configurar o webhook, o robô precisa estar no ar (ele é o endereço
que a Meta vai chamar). Veja `04-hospedagem.md`. No fim você tem uma URL tipo
`https://robo-whatsapp.seunome.workers.dev`.

## Passo 9. Webhook (é por aqui que as mensagens chegam)

1. No app, **WhatsApp > Configuração** (*Configuration*) > **Webhook** > **Editar**.
2. **URL de callback**: `SUA_URL/webhook`
3. **Verificar token**: o valor de `META_VERIFY_TOKEN` do seu `.env`.
4. Clique em **Verificar e salvar**. Se der erro, o robô não está no ar ou o
   token não bate (rode `npm run checar -- robo`).
5. Em **Campos do webhook**, assine o campo **messages**.
6. Rode `npm run assinar-webhook`. Isso liga o app à sua conta do WhatsApp.
   Sem esse passo, a Meta aceita a URL mas **não manda nada**, e é o erro mais
   comum de "configurei tudo e não chega mensagem".

## Passo 10. Deixar o app em modo publicado

App em **modo de desenvolvimento** pode não receber mensagens de clientes de
verdade. Para publicar:

1. **Configurações do app** > **Básico** > **URL da Política de Privacidade**:
   use a do site do seu negócio, ou a que o robô já serve: `SUA_URL/privacidade`.
2. Escolha uma categoria e salve.
3. No topo do painel do app, mude **Modo do app** para **Publicado** (*Live*).

## Passo 11. Modelo de abertura (só se for prospectar)

Para abrir conversa com quem nunca falou com você, precisa de um modelo
aprovado. Edite `config/modelo-abertura.json` (o Claude escreve com você) e:

```bash
npm run criar-modelo     # manda pra aprovação
npm run modelos          # mostra o status
```

O que ajuda a aprovar e a não queimar o número:
- Diga quem você é e por que está chamando, em uma frase.
- Nada de "GRÁTIS!!!", promessa de resultado ou link encurtado.
- Não comece nem termine o texto com variável (`{{1}}`).
- Botão **"Não tenho interesse"**: a pessoa sai com um toque em vez de
  bloquear (bloqueio derruba a qualidade). O robô já entende esse botão.
- Categoria **Marketing** (abordagem comercial é marketing; a Meta reclassifica
  se você marcar errado).

Quando aprovar, ligue a prospecção em `config/robo.json` (o Claude faz isso).

---

## Deu errado?

- "Configurei e não chega mensagem": passo 9.6 (`npm run assinar-webhook`) e
  passo 10 (modo publicado).
- Erros com código: `07-erros.md`.
- Sempre: `npm run checar`.
