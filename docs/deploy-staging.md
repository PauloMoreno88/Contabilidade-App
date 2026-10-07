# Deploy do ambiente de testes (staging) no Render

> Issue #28. Ambiente publicado para testes e para o cliente aprovar o protótipo. Usa o **Neon `dev`** e o **Stripe em modo teste**: não há cobrança real.
> A configuração fica em `render.yaml` (Blueprint), na raiz do repositório. **Nenhum segredo vai para o repositório**: você digita os valores no painel do Render.

## 1. O que o Blueprint cria

| Serviço | Tipo | O que faz |
|---|---|---|
| `exactra-api-staging` | Web Service (Node, plano `0.5c-512mb`, o antigo "Starter", região Virginia) | API NestJS |
| `exactra-web-staging` | Static Site | Site e painel admin (export estático do Next.js) |

- **Branch:** os dois serviços acompanham a `feat/app-v2`. Cada commit nela faz deploy automático, mas só do serviço cujos arquivos mudaram (`buildFilter`).
- **Node e pnpm:** Node 24 (arquivo `.node-version`) e pnpm 12.9.1, instalado no build porque o Render traz outra versão.
- **Build da API:** `pnpm install` e `pnpm --filter "api..." build`, que compila o `@exactra/emails` antes da API.
- **Migrations:** rodam sozinhas antes de cada deploy (`preDeployCommand: prisma migrate deploy`, usando `DIRECT_URL`). Se uma migration falhar, o deploy é cancelado e a versão anterior continua no ar.
- **Start da API:** `node apps/api/dist/main.mjs`.
- **Health check:** `/health` responde `{ ok: true }` sem tocar no banco. Assim, uma pausa ou falha do Neon não faz o Render reiniciar a API em loop. Para checar o banco, use `/health/db` (faz `SELECT 1`; responde 503 se o banco não estiver acessível).
- **Fora dos buscadores:** o site responde com o header `X-Robots-Tag: noindex, nofollow`.

## 2. Antes de começar

- [ ] Conta no Render com o GitHub conectado (acesso ao repositório `Contabilidade-App`).
- [ ] Neon: o projeto com a branch `dev`. As migrations já estão aplicadas e o admin já existe.
- [ ] Stripe em **modo teste** (chave começando com `sk_test_`).
- [ ] Resend com a chave de API.
- [ ] **Decidir os domínios** (veja o item 6):
  - `*.onrender.com`: funciona para o site, o simulador e o checkout, mas **o login do admin não funciona**;
  - subdomínios da Exactra (ex.: `teste.` e `api-teste.`): tudo funciona; depende do acesso ao DNS (#23).

## 3. Criar o Blueprint

1. No Render: **New → Blueprint**.
2. Escolha o repositório `PauloMoreno88/Contabilidade-App` e a branch **`feat/app-v2`**. O Render lê o `render.yaml`.
3. O Render pede os valores das variáveis marcadas como `sync: false` (tabela abaixo). Preencha e confirme.
   - As URLs só existem depois da criação. Use as URLs previstas (`https://exactra-api-staging.onrender.com` e `https://exactra-web-staging.onrender.com`) ou os seus subdomínios, e confira no item 5.
4. Aguarde o primeiro deploy dos dois serviços.

### Variáveis da API (`exactra-api-staging`)

| Variável | O que colocar | Onde obter |
|---|---|---|
| `DATABASE_URL` | Conexão **pooled** do Neon `dev` (host com `-pooler`), terminando em `?sslmode=verify-full` | Neon → projeto → branch `dev` → **Connect** → "Connection pooling" ligado |
| `DIRECT_URL` | Conexão **direta** do Neon `dev` (mesmo host, **sem** `-pooler`), `?sslmode=verify-full` | Neon → **Connect** → "Connection pooling" desligado |
| `BETTER_AUTH_URL` | URL pública da API, sem barra no fim | Render → `exactra-api-staging` (topo da página) ou o seu subdomínio |
| `WEB_ORIGIN` | URL pública do site; se houver mais de uma, separe por vírgula | Render → `exactra-web-staging` ou o seu subdomínio |
| `AUTH_COOKIE_DOMAIN` | Com subdomínios da Exactra: `.exactracontabilidade.com.br`. Com `*.onrender.com`: deixe **vazio** | — |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Stripe (modo teste) → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` **do endpoint do item 4** (o do `stripe listen` local não serve) | Stripe → webhook criado no item 4 → Signing secret |
| `RESEND_API_KEY` | `re_…` | Resend → API Keys |
| `EMAIL_FROM` | Sem domínio verificado: `Exactra <onboarding@resend.dev>`. Com domínio: `Exactra <contato@exactracontabilidade.com.br>` | Resend → Domains |
| `ADMIN_NOTIFY_EMAIL` | E-mail que recebe o aviso de nova contratação | — |
| `EMAIL_ASSET_BASE_URL` | URL pública do **site** (o logo dos e-mails sai de `/email/logo.png`) | igual ao `WEB_ORIGIN` |

Já definidas no `render.yaml`:

- `NODE_ENV=production`.
- `CHECKOUT_ENABLED=false`: a API só aceita chave **de teste** do Stripe.
- `BETTER_AUTH_SECRET`: gerado pelo Render, novo e diferente do local.

### Variáveis do site (`exactra-web-staging`)

| Variável | O que colocar |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública da API (o mesmo valor de `BETTER_AUTH_URL`) |

Já definidas:

- `NEXT_PUBLIC_CHECKOUT_ENABLED=true`: checkout ligado para testar com o cartão 4242. A cobrança é de teste, porque a API só aceita `sk_test_`.
- `NEXT_PUBLIC_USE_MOCK=false`.

> As variáveis `NEXT_PUBLIC_*` são gravadas no build. Mudou alguma? Faça **Manual Deploy → Deploy latest commit** no `exactra-web-staging`.

## 4. Webhook do Stripe (modo teste)

1. Stripe Dashboard em **modo teste** → **Developers → Webhooks** (no Workbench: **Event destinations**) → **Add destination / Add endpoint**.
2. URL: `https://<URL pública da API>/webhooks/stripe`.
3. Eventos (exatamente estes 7):
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Salve. Depois copie o **Signing secret** (`whsec_…`) para `STRIPE_WEBHOOK_SECRET` no Render (`exactra-api-staging` → Environment → Save). O Render reinicia a API sozinho.

## 5. Conferir URLs e ajustar

Depois do primeiro deploy, confira se as URLs reais batem com o que você preencheu. O Render pode acrescentar um sufixo se o nome já existir.

- **API:** `BETTER_AUTH_URL`, `WEB_ORIGIN` e `EMAIL_ASSET_BASE_URL`. Ao salvar, a API reinicia.
- **Site:** `NEXT_PUBLIC_API_URL`, seguido de **novo deploy** do site.
- **Stripe:** a URL do webhook.

## 6. Domínios e login do admin

O `onrender.com` está na *Public Suffix List*: para o navegador, `exactra-web-staging.onrender.com` e `exactra-api-staging.onrender.com` são **sites diferentes**. Por isso o cookie de sessão da API não é enviado nas chamadas do site, e o **login do admin não funciona** nesse modo. O site, o simulador, os leads e o checkout funcionam normalmente.

Para o admin funcionar, use subdomínios da Exactra (depende do DNS, #23):

1. Render → cada serviço → **Settings → Custom Domains**: `teste.exactracontabilidade.com.br` (site) e `api-teste.exactracontabilidade.com.br` (API).
2. No DNS, crie os registros CNAME que o Render indicar.
3. Ajuste as variáveis:
   - `AUTH_COOKIE_DOMAIN=.exactracontabilidade.com.br`;
   - `BETTER_AUTH_URL` e `NEXT_PUBLIC_API_URL` com `https://api-teste…`;
   - `WEB_ORIGIN` e `EMAIL_ASSET_BASE_URL` com `https://teste…`.
4. Faça novo deploy do site e atualize a URL do webhook no Stripe.

## 7. Seed do admin (manual)

O staging usa o Neon `dev`, onde o admin **já foi criado** (04/10). Só repita se quiser outro admin ou se trocar de banco.

Pelo **Shell** do Render (`exactra-api-staging` → **Shell**), sem deixar a senha no histórico:

```
cd apps/api
read -p "E-mail do admin: " ADMIN_SEED_EMAIL
read -s -p "Senha do admin: " ADMIN_SEED_PASSWORD; echo
ADMIN_SEED_EMAIL="$ADMIN_SEED_EMAIL" ADMIN_SEED_PASSWORD="$ADMIN_SEED_PASSWORD" node dist/seed.mjs
```

Saída esperada: `Admin … created` ou `Admin … already exists`. O seed não altera um admin que já existe.

## 8. Validar

1. `https://<API>/health` → `{"ok":true}`.
2. `https://<API>/health/db` → `{"ok":true,"db":true}`.
3. Abra o site. As páginas `/checkout`, `/checkout/status` e `/admin/login` devem abrir sem 404.
4. Simulador: preencha até o fim e envie nome e WhatsApp. O lead aparece no admin (**Leads**), se o admin estiver ativo (item 6).
5. Checkout com cartão:
   - escolha um plano e pague com **4242 4242 4242 4242** (validade futura e CVC quaisquer);
   - a página `/checkout/status` deve passar de "aguardando" para "ativo";
   - no Stripe → Webhooks → endpoint, as entregas devem aparecer com **200**.
6. Pix e boleto (modo teste): na página do Stripe Checkout, use as opções de simulação de pagamento do modo teste. O boleto fica "aguardando" até o evento `async_payment_succeeded`.
7. E-mails:
   - boas-vindas para o cliente e aviso interno para o `ADMIN_NOTIFY_EMAIL`;
   - sem domínio verificado no Resend, **só chegam ao e-mail dono da conta Resend**;
   - os envios aparecem em Resend → Emails.
8. Admin (com subdomínios): faça login, ative o 2FA em **Segurança**, confira o dashboard, os contratos, o detalhe e baixe o CSV.

Se algo falhar, veja os **Logs** do serviço no Render. O deploy da API mostra a etapa *Pre-deploy* (migrations) separada.

## 9. Cuidados

- Use segredos novos no staging (#26). Não reaproveite o `.env` local.
- O plano `0.5c-512mb` não dorme. O plano gratuito dorme e o primeiro acesso leva cerca de 1 minuto: ruim para demonstração.
- Pagamentos reais continuam bloqueados: `CHECKOUT_ENABLED=false` na API recusa qualquer chave `sk_live_`.

## Resend com domínio próprio (enviar para qualquer e-mail)

Sem domínio verificado, o Resend só envia de `onboarding@resend.dev` e **só para o e-mail do dono da conta**. Para enviar a qualquer cliente:

1. **Domínio de envio:** use um subdomínio, `envio.exactracontabilidade.com.br`, e **não a raiz**. A raiz tem o MX e o SPF do e-mail da Exactra na UOL (`mx.uhserver.com`, `include:spf.whservidor.com`); os registros do Resend ficam sob `envio.` e não conflitam com eles.
2. No Resend: **Domains → Add Domain**, informe `envio.exactracontabilidade.com.br` e escolha a região mais próxima (São Paulo, se disponível). O Resend lista os registros a criar (MX, TXT/SPF e TXT/DKIM). **Copie os valores exatos da tela**: este guia não os repete porque a chave DKIM é gerada por domínio.
3. Na UOL, crie os registros exatamente como o Resend mostrar (tipo, nome e valor). A chave DKIM é longa: confira que foi salva inteira e sem aspas extras.
4. Volte ao Resend e clique em **Verify**. Pode levar de minutos a horas. Os servidores de DNS da UOL são instáveis com CNAME; registros TXT e MX costumam responder bem.
5. Depois de **Verified**:
   - `EMAIL_FROM=Exactra <contato@envio.exactracontabilidade.com.br>`
   - `EMAIL_REPLY_TO=` a caixa real da Exactra que deve receber as respostas (o endereço de envio não é uma caixa de e-mail).
   - Faça redeploy da API.
6. **DMARC (opcional, recomendado):** um TXT em `_dmarc.exactracontabilidade.com.br` com `v=DMARC1; p=none; rua=mailto:<caixa da Exactra>`. `p=none` só observa, não bloqueia. Ele vale para todo o domínio, inclusive o e-mail da UOL.
7. Teste: reset de senha do admin e um checkout de teste com um e-mail que **não** seja o do dono do Resend. Se o log da API mostrar o aviso `EMAIL_FROM uses resend.dev`, o remetente ainda é o de teste.

Cuidado: com o domínio verificado, os e-mails vão para quem digitar o endereço no checkout. Em staging, use só e-mails de teste.

