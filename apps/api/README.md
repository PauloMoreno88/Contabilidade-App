# API — Exactra Contabilidade

NestJS 12 (ESM) + Prisma 7 (Postgres/Neon) + Better Auth. Build com `tsdown`, que embute o `@exactra/shared` (TS cru) no `dist/`.

## Rodar localmente

```
cp apps/api/.env.example apps/api/.env   # preencha DATABASE_URL e BETTER_AUTH_SECRET
pnpm install                             # roda `prisma generate`
pnpm --filter api db:deploy              # aplica as migrations no banco do DIRECT_URL/DATABASE_URL
pnpm --filter api build && pnpm --filter api seed   # cria o primeiro admin (ADMIN_SEED_*)
pnpm --filter api start:dev              # http://localhost:3001
```

Testes não precisam de serviços externos: o e2e usa Postgres em memória (PGlite) com as migrations reais.

```
pnpm --filter api test:e2e
pnpm --filter api lint
```

## Rotas

Base: `NEXT_PUBLIC_API_URL` (dev `http://localhost:3001`, produção `https://api.exactracontabilidade.com.br`). Erros seguem o padrão do Nest: `{ statusCode, message, error }`; erros de validação (400) trazem em `message` o `flatten()` do zod (`{ formErrors, fieldErrors }`).

### CORS

`src/setup-app.ts` chama `app.enableCors` com:

- `origin`: `WEB_ORIGIN` (lista separada por vírgula, ex.: `https://www.exactracontabilidade.com.br,https://exactracontabilidade.com.br`);
- `credentials: true`;
- métodos `GET POST PUT PATCH DELETE OPTIONS` e headers `Content-Type` e `Authorization`;
- expõe `Content-Disposition` (nome do CSV).

Outras origens não recebem `Access-Control-Allow-Origin`. O front deve usar `credentials: 'include'` em **todas** as chamadas, para o cookie de sessão do admin ir junto.

### Públicas

- `GET /health` → `{ ok: true }`.
- `/api/auth/*` — Better Auth (login, 2FA, reset de senha, plugin admin). Cadastro público desligado. Use o client do Better Auth com `twoFactorClient()` e `adminClient()`.
- `POST /leads` — body `CreateLeadInput`. **201** `{ id: string, result: SimulatorResult }`. O resultado é recalculado no servidor (o enviado pelo front é ignorado).
- `POST /checkout/sessions` — body `CreateCheckoutInput`. **201** `CheckoutResponse` = `{ contractId, checkoutUrl, statusToken }` → redirecione para `checkoutUrl`.
  - **400** se o período não combina com a forma de pagamento (cartão = `MONTHLY`; Pix/boleto = `QUARTERLY | SEMIANNUAL | ANNUAL`).
  - **503** se o checkout estiver indisponível (sem chave Stripe, ou chave live com `CHECKOUT_ENABLED=false`).
  - Retorno do Stripe: sucesso **ou pendente** (boleto/Pix gerado) → `WEB_ORIGIN/checkout/status?contract=<id>&token=<statusToken>`; desistência → `WEB_ORIGIN/checkout?cancelado=1&plan=<plano>`.
- `GET /contracts/:id/status?token=<statusToken>` → **200** `ContractStatusResponse` = `{ contractId, status, method, plan, period }`; **404** sem token ou com token errado. Faça polling enquanto `status = PENDING_PAYMENT` (boleto leva 1–3 dias úteis).
- `POST /webhooks/stripe` — só para o Stripe (ver "Webhook do Stripe").

### Admin

Todas exigem sessão com papel `admin`: sem sessão **401**, outro papel **403**. Datas em ISO 8601 (UTC), valores em centavos.
Query e respostas usam os schemas de `@exactra/shared` (`packages/shared/src/admin.ts`). A API valida a query com eles e passa a resposta pelo schema, o que remove campos internos como `statusToken` e ids do Stripe.

| Rota | Query (schema) | Resposta 200 (schema) |
|---|---|---|
| `GET /admin/metrics` | — | `adminMetricsSchema` |
| `GET /admin/contracts` | `adminContractsQuerySchema`: `q, status, plan, method, period, page=1, pageSize=20` (máx. 100) | `adminContractsPageSchema` = `{ items: AdminContractRow[], total, page, pageSize }` |
| `GET /admin/contracts/:id` | — | `adminContractDetailSchema` (contrato + `customer` com `lead` + `payments`); **404** se não existir |
| `GET /admin/leads` | `adminLeadsQuerySchema`: `q, page=1, pageSize=20` (máx. 100) | `adminLeadsPageSchema` = `{ items: AdminLead[], total, page, pageSize }` |
| `GET /admin/contracts.csv` | `adminContractsQuerySchema` (paginação ignorada) | `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="contratos.csv"` |

- Filtros inválidos (ex.: `status=FOO`) → **400**.
- `q` busca sem diferenciar maiúsculas em nome e e-mail e, se tiver dígitos, também em CPF/CNPJ (só dígitos) e telefone. Nos leads, busca em nome, e-mail e WhatsApp.
- Ordem: mais recentes primeiro; os pagamentos do detalhe vêm do mais recente para o mais antigo.

Definições do `AdminMetrics`:

- `activeCustomers`: clientes com contrato `ACTIVE`;
- `newThisMonth`: contratos com início no mês corrente;
- `contractedRevenueCents`: soma de `amountCents` dos contratos `ACTIVE` (cartão = valor mensal; Pix/boleto = valor do período pago);
- `pendingPayment`: contratos `PENDING_PAYMENT`;
- `expiringIn30Days`: Pix/boleto `ACTIVE` que vencem em até 30 dias;
- `byPlan` / `byMethod`: contratos `ACTIVE` (chave ausente = 0).

CSV:

- separador `;` e BOM UTF-8 (abre direto no Excel pt-BR);
- colunas `Cliente; E-mail; Telefone; CPF/CNPJ; Plano; Período; Pagamento; Status; Valor (R$); Início; Fim` (valor como `199,00`, datas `AAAA-MM-DD`);
- células que começam com `= + - @` ganham `'` na frente (proteção contra injeção de fórmula);
- para baixar: `fetch(url, { credentials: 'include' })` → `blob()`; o nome do arquivo vem em `Content-Disposition`.

## Pagamentos e ciclo do contrato

Tudo passa pela classe abstrata `PaymentProvider` (`src/payments`); hoje só existe `StripeProvider`. Os eventos do Stripe viram eventos neutros, e `src/contracts/contract-lifecycle.ts` aplica:

| Evento Stripe | Efeito |
|---|---|
| `checkout.session.completed` (pago, modo payment) / `async_payment_succeeded` | Pix/boleto: `ACTIVE`, `endsAt = início + 3/6/12 meses`, registra pagamento |
| `checkout.session.completed` (unpaid) | boleto/Pix gerado: segue `PENDING_PAYMENT` |
| `checkout.session.completed` (modo subscription) | cartão: `ACTIVE`, guarda a assinatura |
| `invoice.paid` | cartão: registra pagamento, `endsAt` = fim do período, volta para `ACTIVE` |
| `invoice.payment_failed` | `ACTIVE → PAST_DUE` |
| `checkout.session.async_payment_failed` / `checkout.session.expired` | `PENDING_PAYMENT → CANCELED` |
| `customer.subscription.deleted` | `CANCELED` |

## Webhook do Stripe

- **Verificação:** a assinatura é verificada sobre os **bytes crus** do corpo. O `AuthModule` sobe com `bodyParser: { rawBody: true }`, que guarda `req.rawBody` antes do parse do JSON, e o `StripeProvider` chama `stripe.webhooks.constructEvent(req.rawBody, <stripe-signature>, STRIPE_WEBHOOK_SECRET)`.
- **Respostas:** assinatura inválida → **400**; evento repetido → **200** `{ received: true, duplicate: true }`, sem efeito.
- **Teste e2e** (`test/checkout.e2e-spec.ts`): um payload com formatação própria, assinado, dá 200 e ativa o contrato. O mesmo JSON re-serializado, com a assinatura original, dá 400. Isso prova que a verificação usa `req.rawBody`, e não o corpo parseado.
- **Validado contra o Stripe real** (04/10, modo teste):
  - `POST /checkout/sessions` criou sessões aceitas pelo Stripe para cartão, Pix e boleto (`allowed_payment_method_types` = `card` / `pix` / `boleto`, `success_url` em `/checkout/status`).
  - Os eventos reais `checkout.session.expired` dessas sessões foram reenviados ao endpoint, assinados com o `STRIPE_WEBHOOK_SECRET` do `.env`. Resultado: 200, e os contratos foram para `CANCELED`.
## Teste manual com o Stripe (modo teste)

Pré-requisitos: `STRIPE_SECRET_KEY` (`sk_test_…`) e `STRIPE_WEBHOOK_SECRET` no `.env`, API rodando (`pnpm --filter api start:dev`, porta 3001) e, em outro terminal:

```
stripe listen --forward-to localhost:3001/webhooks/stripe
```

O `whsec_…` impresso pelo `listen` precisa ser o `STRIPE_WEBHOOK_SECRET` do `.env`. Se usar `--events`, inclua pelo menos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed` e `customer.subscription.deleted`.

**1. Webhook chegando (`stripe trigger`)**

```
stripe trigger checkout.session.completed
```

- Esperado no terminal do `listen`: `<-- [200] POST http://localhost:3001/webhooks/stripe`.
- O evento fica gravado em `WebhookEvent`. O contrato não muda, porque a sessão do trigger não tem `metadata.contractId`.
- Para o trigger ativar um contrato real: crie um contrato Pix (`POST /checkout/sessions` com `method: "PIX"`) e rode `stripe trigger checkout.session.completed --add checkout_session:metadata.contractId=<contractId>`. O trigger cria uma sessão já paga, então o contrato vai para `ACTIVE`.

**2. Fluxo real com pagamento**

```
pnpm --filter api stripe:flow            # cartão, plano essencial
pnpm --filter api stripe:flow PIX profissional
```

O script (`scripts/checkout-flow.mjs`) faz o seguinte:

1. cria a sessão por `POST /checkout/sessions`;
2. imprime a URL do Stripe Checkout;
3. acompanha `GET /contracts/:id/status` até `ACTIVE`.

Abra a URL e pague com o cartão **4242 4242 4242 4242**, validade futura e CVC quaisquer. Esperado: `status: PENDING_PAYMENT` → `status: ACTIVE` em poucos segundos. O pagamento aparece em `GET /admin/contracts/<id>`.

**3. Idempotência**

- `stripe events resend <evt_…>` (id do evento no terminal do `listen`) → 200 com `{ received: true, duplicate: true }`, sem novo pagamento.

## E-mails (Resend) e job diário

- Ativação do contrato (via webhook): boas-vindas ao cliente + aviso interno para `ADMIN_NOTIFY_EMAIL`. Falha de e-mail só é logada, porque o pagamento já está gravado.
- Reset de senha e código 2FA por e-mail: enviados pelo Better Auth.
- Job diário (09h, horário de Brasília, `src/contracts/expiry.job.ts`), só para Pix/boleto: avisa 7 dias antes do vencimento (uma vez) e marca como `EXPIRED` o que já venceu. Cartão segue os webhooks do Stripe.
- Sem `RESEND_API_KEY` os e-mails só aparecem no log (dev/testes); em produção a falta da chave gera erro.
- Os textos de e-mail são provisórios e ficam em `src/notifications.ts`.

## Autenticação (admin)

- E-mail + senha, sem cadastro público. O primeiro admin vem do `seed`; outros são criados por um admin (`/api/auth/admin/create-user`).
- 2FA: TOTP (app autenticador) ou código por e-mail; o admin ativa em `/api/auth/two-factor/enable`.
- Reset de senha: `POST /api/auth/request-password-reset` com `redirectTo` apontando para a tela do front.
- Todas as rotas exigem sessão por padrão (guard global); rotas públicas usam `@AllowAnonymous()` e rotas de admin usam `@Roles(['admin'])`.
- Produção: `AUTH_COOKIE_DOMAIN=.exactracontabilidade.com.br` compartilha o cookie entre `www.` e `api.`.
- Rate limit do login: o padrão do Better Auth (em memória, ativo em produção).

## O que falta configurar (externo)

- [x] Neon (branch de dev): migrations aplicadas e admin criado em 04/10.
- [x] Stripe (teste): chave de teste configurada; cartão, Pix e boleto aceitos na criação de sessão (04/10).
- [x] `stripe listen` encaminhando para `localhost:3001/webhooks/stripe`: validado em 04/10 (trigger, Pix, assinatura real com `invoice.paid`, cancelamento e reenvio duplicado).
- [x] Sessão de cartão paga no navegador com 4242 (`pnpm --filter api stripe:flow`): contrato `ACTIVE` (04/10).
- [ ] Neon produção: `DATABASE_URL` (pooled) + `DIRECT_URL` (sem `-pooler`, usado pelo `prisma migrate`) e rodar `db:deploy`. Use `sslmode=verify-full` para evitar o aviso do `pg`.
- [ ] `BETTER_AUTH_SECRET` forte em produção; `BETTER_AUTH_URL=https://api.exactracontabilidade.com.br`; `WEB_ORIGIN` com os domínios do site.
- [ ] `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` e rodar o `seed` uma vez.
- [ ] DNS do subdomínio `api.` apontando para o Render.
- [ ] Stripe: conta definitiva da Exactra com **Pix e boleto habilitados** (o checkout usa `allowed_payment_method_types`, que só filtra métodos ativos).
- [ ] Stripe: endpoint de webhook `https://api.exactracontabilidade.com.br/webhooks/stripe` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed` e `customer.subscription.deleted`; segredo em `STRIPE_WEBHOOK_SECRET`.
- [ ] Resend: domínio verificado (DNS), `RESEND_API_KEY`, `EMAIL_FROM` (ex.: `Exactra <contato@exactracontabilidade.com.br>`) e `ADMIN_NOTIFY_EMAIL`.
