# Spec: tirar a Stripe do código

- Versão / estado: 1.0 / implementada (aguarda PR)
- Data: 11/11/2026
- Workflow: standard-development v1.1
- Relacionadas: decisões 35 e 40 do `docs/plano.md`, `docs/specs/mercado-pago-webhook-hardening.md`, `docs/specs/mercado-pago-e2e.md`

## Objetivo

O Mercado Pago passou nos testes do staging (11/11/2026) e substitui a Stripe. Contratação e renovação passam a usar só o Mercado Pago, e o código, a dependência e as variáveis da Stripe saem do projeto.

## Escopo

- API: sai `StripeProvider`, `POST /webhooks/stripe`, os eventos de assinatura mensal antiga e o pacote `stripe`. `PaymentProvider` continua como interface, implementada pelo Mercado Pago.
- Contratos do checkout e da renovação (`packages/shared`): o campo `provider` sai da entrada; o API grava `MERCADO_PAGO`. As respostas continuam aceitando `STRIPE`, porque o banco ainda tem contratos antigos de teste.
- Front: checkout e renovação sem escolha de provedor nem de forma de pagamento (a forma é escolhida no Mercado Pago); sai o quadro de cartões de teste da Stripe.
- Job diário: contrato do checkout pendente há mais de 8 dias é cancelado, de qualquer provedor (os pendentes antigos da Stripe não recebem mais o evento de expiração).
- Variáveis, `render.yaml`, textos legais (rascunho) e documentação.

## Não escopo

- Colunas `stripe*` e o padrão `STRIPE` de `provider` no banco: ficam para a migration da decisão 40, obrigatória antes do primeiro deploy de produção.
- Pagamento real, preços, Pix na conta da Exactra e 12x com cartão real.

## Requisitos

| ID | Requisito | Critério de aceitação | Validação |
|---|---|---|---|
| REQ-S01 | Checkout e renovação criam só preferência do Mercado Pago. | CA: `POST /checkout/sessions` e `POST /app/plan/renew` gravam `provider = MERCADO_PAGO`, mesmo se a requisição pedir `STRIPE`. | e2e da API |
| REQ-S02 | Não existe mais rota da Stripe. | CA: `POST /webhooks/stripe` responde 404. | e2e da API |
| REQ-S03 | Ativação, renovação e e-mails continuam iguais. | CA: os testes de notificação e da área do cliente passam ativando pelo webhook do Mercado Pago. | e2e da API |
| REQ-S04 | Pendente abandonado é cancelado em qualquer provedor. | CA: contrato do checkout pendente há 9 dias vira `CANCELED`; contrato manual não é tocado. | e2e da API |
| REQ-S05 | Telas sem Stripe. | CA: checkout e renovação não mostram escolha de provedor nem a palavra "Stripe"; build e testes do front passam. | build + unitários |
| REQ-S06 | Nenhuma referência ativa à Stripe. | CA: `git grep -i stripe` só encontra histórico (migrations, docs de decisão, spec antiga) e as colunas mantidas pela decisão 40. | revisão |

## Rastreabilidade

| Requisito | Código | Evidência |
|---|---|---|
| REQ-S01 | `apps/api/src/contracts/checkout.controller.ts`, `apps/api/src/portal/portal.controller.ts`, `packages/shared/src/schemas.ts` e `portal.ts` | `test/checkout.e2e-spec.ts` ("whatever provider the request names"), `test/portal.e2e-spec.ts` (renovação retoma o mesmo link) |
| REQ-S02 | `apps/api/src/contracts/webhook.controller.ts`, `app.module.ts`; removidos `stripe.provider.ts`, `scripts/checkout-flow.mjs` | `test/checkout.e2e-spec.ts` ("no Stripe webhook route anymore") |
| REQ-S03 | `apps/api/src/contracts/contract-lifecycle.ts`, `payments/payment-provider.ts` | `test/notifications.e2e-spec.ts`, `test/portal.e2e-spec.ts` e `test/mercado-pago.e2e-spec.ts` ativando por `test/mercado-pago-fixtures.ts` |
| REQ-S04 | `apps/api/src/contracts/expiry.job.ts` | `test/notifications.e2e-spec.ts` ("from any provider, nothing else") |
| REQ-S05 | `apps/web/src/components/checkout/CheckoutForm.tsx`, `components/portal/Plan.tsx`, `config/checkout.ts`, `config/env.ts`, `config/legal.ts` | `pnpm --filter web lint`, `test` e build de staging |
| REQ-S06 | `render.yaml`, `.env.example`, docs | `git grep -i stripe` (ver resultado no PR) |

Fora do código, o fluxo 1 do Playwright (`e2e/tests/01-compra.spec.ts`) passou a parar no link do Mercado Pago; ele só pode rodar no staging depois do merge.
