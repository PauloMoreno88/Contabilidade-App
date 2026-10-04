# Plano de execução — Fases 3 e 4 (front real + backend)

> Criado em 04/10/2026. Fonte de verdade das decisões do projeto. Quando uma decisão mudar, atualize este arquivo no mesmo commit.
> Contexto de negócio: ver `prompt.md` . Roadmap com o cliente: `roadmap-entrega.html`.

## 1. Objetivo

Transformar o site da Exactra Contabilidade em um funil de aquisição:
anúncio → landing → mini-diagnóstico (simulador) → resultado → plano recomendado → checkout → pagamento → onboarding.
Inclui um painel administrativo para a Exactra acompanhar contratações e leads.

As Fases 3 (front-end real) e 4 (backend e pagamentos) do roadmap rodam **em paralelo**, com um agente por lado.
A **aprovação do protótipo pelo cliente fica para o final**; depois dela refazemos telas e refatoramos o necessário.
Por isso o front é construído em componentes pequenos, com textos e preços em arquivos de configuração.

## 2. Decisões fechadas

| # | Tema | Decisão |
|---|---|---|
| 1 | Monorepo | **pnpm workspaces**, sem Turborepo por enquanto |
| 2 | Estrutura | `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (contrato) |
| 3 | Banco | **Postgres no Neon** (plano gratuito), via Prisma |
| 4 | Hospedagem | Front: Static Site no Render (continua `output: 'export'`). API: Web Service no Render, plano Starter (~US$ 7/mês). Domínios: `www.exactracontabilidade.com.br` e `api.exactracontabilidade.com.br` |
| 5 | Pagamentos | **Stripe**. Cartão = assinatura recorrente mensal. **Pix e boleto = pagamento único antecipado** por 3, 6 ou 12 meses. Tudo atrás de uma interface `PaymentProvider` (permite adicionar Mercado Pago depois) |
| 6 | Agentes | Um `git worktree` + uma branch por agente: `feat/web` e `feat/api`, saindo de `feat/app-v2` |
| 7 | Estado atual | Commitar o `page.tsx` modificado e os arquivos soltos antes de migrar; migração em commit separado |
| 8 | Base do front | Portar a **variante D** do protótipo, em componentes por seção |
| 9 | Backend v1 | Checkout, webhooks, status de contratação, clientes, leads, e-mails (Resend), job de vencimento, **painel admin com login** |
| 10 | Períodos | Cartão: mensal. Pix/boleto: 3/6/12 meses com desconto crescente. Valores em **um único arquivo** em `packages/shared` |
| 11 | Auth | **Better Auth** no `apps/api`, adapter Prisma, e-mail+senha sem cadastro público, plugin `admin` (papel `admin`), **2FA e reset de senha no v1**, cookies entre subdomínios |
| 12 | Painel admin | Cards (ativos, novos no mês, receita contratada, aguardando pagamento, vencendo em 30 dias), contratos por plano/forma de pagamento, tabela de clientes com busca/filtros, detalhe com histórico de pagamentos, CSV, lista de leads |
| 13 | Leads | Gate leve: prévia do resultado, valor detalhado após nome + WhatsApp + consentimento. Grava respostas, resultado, UTM e versão das regras |
| 14 | Testes | Vitest (shared), e2e Nest com supertest + banco de teste, fixtures/Stripe CLI nos webhooks, smoke Playwright no fim |
| 15 | Git | Conventional commits em inglês, PRs pequenos de `feat/web` e `feat/api` para `feat/app-v2`, **nada em `master` antes da aprovação do cliente** |
| 16 | Idiomas | Código e commits em inglês; interface e documentação em português |
| 17 | Contador atrasado | Preços/regras como `PLACEHOLDER` num só arquivo; flag `CHECKOUT_ENABLED`; Stripe só em modo teste até validação |
| 18 | Build da API | NestJS 12 em ESM; build com **tsdown** (embute `@exactra/shared`, que exporta TS cru). Prisma 7 com `@prisma/adapter-pg` |
| 19 | Testes da API | e2e com **PGlite** (Postgres em memória) aplicando as migrations reais; nada depende de Neon/Stripe/Resend |

## 3. Arquitetura alvo

```
/
├─ apps/
│  ├─ web/        Next.js 15, React 19, Tailwind 4, Framer Motion (export estático)
│  └─ api/        NestJS + TypeScript + Prisma + Better Auth
├─ packages/
│  └─ shared/     zod schemas, DTOs, plans.config.ts, função de cálculo do simulador
├─ docs/          plano.md, perguntas-contador.md, prompt.md, roadmap-entrega.html, prototype/
├─ AGENTS.md      fonte única de contexto para agentes
└─ CLAUDE.md      aponta para o AGENTS.md
```

- `packages/shared` é **o contrato**. Mudou ali, avise o outro lado.
- O front só fala com o API por HTTP; nada de lógica de negócio no front além da função pura de cálculo do simulador.
- Cada app tem seu `.env.example`. Segredos nunca entram no repositório.

## 4. Modelo de dados (rascunho)

Tabelas do Better Auth (user, session, account, verification, two_factor) são geradas pela CLI dele no mesmo `schema.prisma`.

Tabelas de domínio:
- **Lead**: id, nome, whatsapp, email?, respostas (JSON), resultado (JSON), rulesVersion, utm (JSON), consentimento + data, createdAt.
- **Customer**: id, nome, email, telefone, documento (CPF/CNPJ), stripeCustomerId, leadId?, createdAt.
- **Contract**: id, customerId, plano, periodo (MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL), formaPagamento (CARD | PIX | BOLETO), valor, status, startsAt, endsAt, stripeSubscriptionId?, createdAt.
- **Payment**: id, contractId, valor, status, método, stripePaymentIntentId, paidAt.
- **WebhookEvent**: stripeEventId (único, garante idempotência), tipo, payload, processedAt.

Status do contrato: `PENDING_PAYMENT → ACTIVE → (PAST_DUE | CANCELED | EXPIRED)`.
Boleto é assíncrono (1–3 dias úteis): o contrato nasce `PENDING_PAYMENT` e só ativa pelo webhook. **Nunca** confiar na página de sucesso do front para ativar contrato.

## 5. Rotas (rascunho do contrato)

Públicas:
- `POST /leads` — grava lead do simulador.
- `POST /checkout/sessions` — cria sessão do Stripe (plano, período, método, dados do cliente).
- `GET /contracts/:id/status` — status para a página de sucesso/pendente (protegido por token curto da sessão).
- `POST /webhooks/stripe` — assinatura verificada, idempotente.

Autenticação (Better Auth): `/api/auth/*`.

Admin (exige sessão com papel `admin`): `GET /admin/metrics`, `GET /admin/contracts`, `GET /admin/contracts/:id`, `GET /admin/leads`, `GET /admin/contracts.csv`.

Job diário: marca contratos vencidos e envia aviso antes do vencimento (necessário para Pix/boleto, que não renovam sozinhos).

## 6. Fases e cronograma

Hoje é 04/10; o roadmap termina em 20/10.

**Fase 0 — Fundação (Claude principal, 04–05/10)**
- [x] Commitar `src/app/main/page.tsx`; mover `prompt.md`, `roadmap-entrega.html`, `prototype/` para `docs/` e commitar
- [x] Migrar para monorepo pnpm (commit separado), Next.js em `apps/web` com `git mv`
- [x] `packages/shared`: schemas zod, `plans.config.ts` (PLACEHOLDER), função de cálculo (stub) e tipos das rotas
- [x] `apps/api` e `apps/web` com `AGENTS.md` curtos e `.env.example`
- [ ] Criar worktrees e branches `feat/web` e `feat/api`

**Agente de front — `feat/web` (06–14/10)**
- [ ] Porte da variante D em componentes por seção; copy e preços em arquivos de configuração
- [ ] Simulador em etapas com gate leve e captura de lead
- [ ] Planos, checkout, páginas de sucesso e pagamento pendente (boleto/Pix)
- [ ] Painel `/admin`: login, 2FA, reset de senha, dashboard, tabelas, detalhe, CSV
- [ ] Responsividade e microinterações
- [ ] Tudo contra mock do contrato até o API existir

**Agente de back — `feat/api` (06–14/10)**
- [x] Nest, Prisma, Neon, Better Auth (e-mail+senha, admin, 2FA, reset) e seed do primeiro admin
- [x] Leads
- [x] Stripe: cartão recorrente, Pix e boleto; webhooks idempotentes; contratos e pagamentos
- [x] E-mails (Resend): boas-vindas, aviso interno, reset de senha, aviso de vencimento
- [x] Job diário de vencimento
- [x] Endpoints admin e CSV
- [x] CORS explícito (`WEB_ORIGIN`), URLs de retorno do Stripe alinhadas ao front (`/checkout/status`, `/checkout?cancelado=1&plan=`)
- [x] Admin usando os schemas de `@exactra/shared` (query e resposta)
- [x] Neon de dev: migrations + seed do admin; login e `POST /leads` validados de ponta a ponta
- [x] Stripe teste: sessões de cartão/Pix/boleto criadas; webhook verificado sobre `req.rawBody`
- [x] Webhook pelo `stripe listen` (04/10): trigger gravado em `WebhookEvent`; Pix → `ACTIVE`; assinatura real (`invoice.paid`) → `ACTIVE`; cancelamento → `CANCELED`; reenvio → `duplicate`
- [x] Pagamento no Checkout hospedado com 4242 pelo navegador (`pnpm --filter api stripe:flow`): contrato `ACTIVE` (04/10)

**Integração e testes (14–17/10):** trocar mock pelo API real, testar fluxo completo com Stripe em modo teste, deploy e domínio.

**Lançamento (18–20/10):** deploy final, onboarding pós-venda, handoff.

**Depois:** aprovação do cliente → refazer telas e refatorar.

## 7. Como os agentes trabalham

- Cada agente altera apenas sua pasta (`apps/web` ou `apps/api`). `packages/shared` só muda avisando o outro lado.
- Contrato primeiro: o front usa mock até o API estar pronto.
- PRs pequenos para `feat/app-v2`; integração e merge pelo agente principal.
- Qualquer decisão que mude este plano é registrada aqui.

## 8. Segurança e LGPD

- Nenhum dado de cartão passa pelo nosso sistema; Stripe Checkout hospedado.
- Webhook com verificação de assinatura e idempotência.
- Guardamos nome, e-mail, telefone e CPF/CNPJ: exige política de privacidade, consentimento no checkout e no simulador, e acesso restrito ao admin.
- Admin: sem cadastro público, 2FA, rate limit no login.
- Segredos só em variáveis de ambiente.

## 9. Riscos e cortes

- Prazo apertado (9 dias de trabalho paralelo, e 2FA/reset de senha aumentaram o escopo do admin).
- Corte aceitável, nesta ordem: CSV → gráficos/segmentações do painel → polimento de animações.
- **Não cortar**: fluxo de pagamento, webhooks, ativação de contrato, segurança do admin.
- Preços e regras do contador não bloqueiam o desenvolvimento, **apenas o lançamento real**.

## 10. Pendências externas

- Conta Stripe da Exactra (CNPJ), com Pix e boleto habilitados.
- Acesso ao DNS do domínio (subdomínio `api.` e verificação de domínio no Resend).
- Respostas do contador: `docs/perguntas-contador.md`.
- Aprovação final do protótipo pelo cliente.
