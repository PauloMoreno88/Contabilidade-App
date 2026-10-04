# API — Exactra Contabilidade

NestJS 12 (ESM) + Prisma 7 (Postgres/Neon) + Better Auth. Build com `tsdown`, que embute o `@exactra/shared` (TS cru) no `dist/`.

## Rodar localmente

```
cp apps/api/.env.example apps/api/.env   # preencha DATABASE_URL e BETTER_AUTH_SECRET
pnpm install                             # roda `prisma generate`
pnpm --filter api db:deploy              # aplica as migrations no banco do DATABASE_URL
pnpm --filter api build && pnpm --filter api seed   # cria o primeiro admin (ADMIN_SEED_*)
pnpm --filter api start:dev              # http://localhost:3001
```

Testes não precisam de serviços externos: o e2e usa Postgres em memória (PGlite) com as migrations reais.

```
pnpm --filter api test:e2e
pnpm --filter api lint
```

## Rotas

- `GET /health` — health check (Render).
- `/api/auth/*` — Better Auth (login, 2FA, reset de senha, plugin admin). Cadastro público desligado.
- `POST /leads` — público. Valida com `createLeadSchema`; o resultado é **recalculado no servidor** (o enviado pelo front é ignorado). Resposta: `{ id, result }`.

- `POST /checkout/sessions` — público. Valida com `createCheckoutSchema` e `allowedPeriods` (cartão = mensal; Pix/boleto = 3/6/12 meses). Preço vem de `totalPriceCents` do shared. Cria cliente + contrato `PENDING_PAYMENT` e devolve `{ contractId, checkoutUrl, statusToken }`.
  - Retorno do Stripe para o front: `WEB_ORIGIN/checkout/retorno?contract=…&token=…` (sucesso ou pendente) e `WEB_ORIGIN/checkout/cancelado?contract=…&token=…`.
  - `CHECKOUT_ENABLED=false` (padrão): só aceita chave **de teste** do Stripe (`sk_test_`); com chave live responde 503. Sem chave configurada: 503.
- `GET /contracts/:id/status?token=…` — público com o `statusToken`; resposta no formato `ContractStatusResponse`.
- `POST /webhooks/stripe` — assinatura verificada (`STRIPE_WEBHOOK_SECRET`) e idempotente (`WebhookEvent.stripeEventId` único, gravado na mesma transação que altera o contrato).

## Pagamentos e ciclo do contrato

Tudo passa pela classe abstrata `PaymentProvider` (`src/payments`); hoje só existe `StripeProvider`. Os eventos do Stripe viram eventos neutros e `src/contracts/contract-lifecycle.ts` aplica:

| Evento Stripe | Efeito |
|---|---|
| `checkout.session.completed` (pago, modo payment) / `async_payment_succeeded` | Pix/boleto: `ACTIVE`, `endsAt = início + 3/6/12 meses`, registra pagamento |
| `checkout.session.completed` (unpaid) | boleto/Pix gerado: segue `PENDING_PAYMENT` |
| `checkout.session.completed` (modo subscription) | cartão: `ACTIVE`, guarda a assinatura |
| `invoice.paid` | cartão: registra pagamento, `endsAt` = fim do período, volta para `ACTIVE` |
| `invoice.payment_failed` | `ACTIVE → PAST_DUE` |
| `checkout.session.async_payment_failed` / `checkout.session.expired` | `PENDING_PAYMENT → CANCELED` |
| `customer.subscription.deleted` | `CANCELED` |

Testar localmente com o Stripe CLI: `stripe listen --forward-to localhost:3001/webhooks/stripe` (use o `whsec_…` impresso como `STRIPE_WEBHOOK_SECRET`).

## Autenticação (admin)

- E-mail + senha, sem cadastro público. O primeiro admin vem do `seed`; outros são criados por um admin (`/api/auth/admin/create-user`).
- 2FA: TOTP (app autenticador) ou código por e-mail; o admin ativa em `/api/auth/two-factor/enable`.
- Reset de senha: `POST /api/auth/request-password-reset` com `redirectTo` apontando para a tela do front.
- Todas as rotas exigem sessão por padrão (guard global); rotas públicas usam `@AllowAnonymous()`, rotas de admin usam `@Roles(['admin'])`.
- Produção: `AUTH_COOKIE_DOMAIN=.exactracontabilidade.com.br` compartilha o cookie entre `www.` e `api.`. O front deve chamar a API com `credentials: 'include'`.
- Rate limit do login: o padrão do Better Auth (em memória, ativo em produção).

## O que falta configurar (externo)

- [ ] Projeto no Neon: `DATABASE_URL` (dev e produção) e rodar `db:deploy`.
- [ ] `BETTER_AUTH_SECRET` forte em produção; `BETTER_AUTH_URL=https://api.exactracontabilidade.com.br`.
- [ ] `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` e rodar o `seed` uma vez.
- [ ] DNS do subdomínio `api.` apontando para o Render.
- [ ] Stripe: conta da Exactra com **Pix e boleto habilitados** no Dashboard (o checkout usa `allowed_payment_method_types`, que só filtra métodos ativos). Chaves de teste em `STRIPE_SECRET_KEY`.
- [ ] Stripe: endpoint de webhook `https://api.exactracontabilidade.com.br/webhooks/stripe` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`; segredo em `STRIPE_WEBHOOK_SECRET`.
- [ ] Front: implementar as páginas `/checkout/retorno` e `/checkout/cancelado` (consultam `GET /contracts/:id/status`).
