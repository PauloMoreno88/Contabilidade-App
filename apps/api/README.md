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
  - Retorno do Stripe: sucesso **ou pendente** (boleto/Pix gerado) → `WEB_ORIGIN/checkout/status?contract=<id>&token=<statusToken>`; desistência → `WEB_ORIGIN/checkout?cancelado=1`.
- `GET /contracts/:id/status?token=<statusToken>` → **200** `ContractStatusResponse` = `{ contractId, status, method, plan, period }`; **404** sem token ou com token errado. Faça polling enquanto `status = PENDING_PAYMENT` (boleto leva 1–3 dias úteis).
- `POST /webhooks/stripe` — só para o Stripe (ver "Webhook do Stripe").

### Admin

Todas exigem sessão com papel `admin`: sem sessão **401**, outro papel **403**. Datas em ISO 8601 (UTC), valores em centavos.

| Rota | Query | Resposta 200 |
|---|---|---|
| `GET /admin/metrics` | — | `AdminMetrics` (shared) |
| `GET /admin/contracts` | `q, status, plan, method, period, page=1, pageSize=20` (máx. 100) | `{ items: AdminContractRow[], total, page, pageSize }` |
| `GET /admin/contracts/:id` | — | `AdminContractDetail` (abaixo); **404** se não existir |
| `GET /admin/leads` | `q, page=1, pageSize=20` (máx. 100) | `{ items: AdminLeadRow[], total, page, pageSize }` |
| `GET /admin/contracts.csv` | mesmos filtros de `/admin/contracts` (sem paginação) | `text/csv; charset=utf-8` com `Content-Disposition: attachment; filename="contratos.csv"` |

- Filtros inválidos (ex.: `status=FOO`) → **400**.
- `q` busca sem diferenciar maiúsculas em nome e e-mail e, se tiver dígitos, também em CPF/CNPJ e telefone. Nos leads, busca em nome, e-mail e WhatsApp.
- Ordem: mais recentes primeiro.

```ts
// AdminMetrics (packages/shared/src/schemas.ts)
{
  activeCustomers: number;        // clientes com contrato ACTIVE
  newThisMonth: number;           // contratos com início (startsAt) no mês corrente
  contractedRevenueCents: number; // soma de amountCents dos contratos ACTIVE (cartão = mensal; Pix/boleto = período pago)
  pendingPayment: number;         // contratos PENDING_PAYMENT
  expiringIn30Days: number;       // Pix/boleto ACTIVE que vencem em até 30 dias
  byPlan: Record<PlanId, number>;          // contratos ACTIVE por plano (chave ausente = 0)
  byMethod: Record<PaymentMethod, number>; // contratos ACTIVE por forma de pagamento (chave ausente = 0)
}

// AdminContractRow (shared)
{ id, customerName, email, phone, document /* só dígitos */, plan, period, method, status,
  startsAt: string | null, endsAt: string | null }

// AdminContractDetail = AdminContractRow + (igual a apps/web/src/lib/api/admin-types.ts, mais leadId)
{
  amountCents: number;
  createdAt: string;
  leadId: string | null;
  payments: { id: string; amountCents: number; status: 'PENDING' | 'PAID' | 'FAILED';
              method: PaymentMethod; paidAt: string | null; createdAt: string }[]; // mais recente primeiro
}

// AdminLeadRow (igual a apps/web/src/lib/api/admin-types.ts, mais rulesVersion)
{ id: string; name: string; whatsapp: string; email?: string;
  monthlyRevenue: number; // em reais, como no simulador
  recommendedPlan: PlanId; utmSource?: string; utmCampaign?: string;
  rulesVersion: string; createdAt: string }
```

CSV:

- separador `;` e BOM UTF-8 (abre direto no Excel pt-BR);
- colunas `Cliente; E-mail; Telefone; CPF/CNPJ; Plano; Período; Pagamento; Status; Valor (R$); Início; Fim` (valor como `199,00`, datas `AAAA-MM-DD`);
- células que começam com `= + - @` ganham `'` na frente (proteção contra injeção de fórmula);
- para baixar: `fetch(url, { credentials: 'include' })` → `blob()`; o nome do arquivo vem em `Content-Disposition`.

> Diferenças em relação ao mock do front:
> - as listas são **paginadas** (`{ items, total, page, pageSize }`), enquanto o mock devolve array;
> - o detalhe ganha `leadId` e os leads ganham `rulesVersion`;
> - `REFUNDED` não existe no back.
>
> Os tipos `AdminContractDetail` e `AdminLeadRow` existem no front e no back (`src/admin.controller.ts`). Sugestão: movê-los para o `@exactra/shared` na integração.

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
- **Pendente:** o `stripe listen` da máquina do usuário estava conectado ao Stripe, mas não encaminhou nenhum evento para `localhost:3001/webhooks/stripe`. Provavelmente aponta para outra porta/caminho ou outra conta. Rode exatamente:

  ```
  stripe listen --forward-to localhost:3001/webhooks/stripe
  ```

  O `whsec_…` impresso precisa ser o mesmo `STRIPE_WEBHOOK_SECRET` do `.env` (ele muda se o CLI estiver logado em outra conta). Para disparar um evento, use `stripe trigger checkout.session.completed`; o terminal do `listen` deve mostrar `<-- [200] POST http://localhost:3001/webhooks/stripe`.

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
- [ ] Confirmar o `stripe listen` encaminhando para `localhost:3001/webhooks/stripe` (ver "Webhook do Stripe").
- [ ] Neon produção: `DATABASE_URL` (pooled) + `DIRECT_URL` (sem `-pooler`, usado pelo `prisma migrate`) e rodar `db:deploy`. Use `sslmode=verify-full` para evitar o aviso do `pg`.
- [ ] `BETTER_AUTH_SECRET` forte em produção; `BETTER_AUTH_URL=https://api.exactracontabilidade.com.br`; `WEB_ORIGIN` com os domínios do site.
- [ ] `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` e rodar o `seed` uma vez.
- [ ] DNS do subdomínio `api.` apontando para o Render.
- [ ] Stripe: conta definitiva da Exactra com **Pix e boleto habilitados** (o checkout usa `allowed_payment_method_types`, que só filtra métodos ativos).
- [ ] Stripe: endpoint de webhook `https://api.exactracontabilidade.com.br/webhooks/stripe` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed` e `customer.subscription.deleted`; segredo em `STRIPE_WEBHOOK_SECRET`.
- [ ] Resend: domínio verificado (DNS), `RESEND_API_KEY`, `EMAIL_FROM` (ex.: `Exactra <contato@exactracontabilidade.com.br>`) e `ADMIN_NOTIFY_EMAIL`.
