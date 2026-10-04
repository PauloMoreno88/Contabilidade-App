# AGENTS.md — Exactra Contabilidade

Leia este arquivo inteiro antes de mexer no repositório. Ele é a fonte única de contexto para qualquer agente.
Decisões detalhadas e cronograma: `docs/plano.md`. Contexto de negócio: `docs/prompt.md`.

## 1. O que é o projeto

Site da Exactra Contabilidade (https://www.exactracontabilidade.com.br/) sendo transformado em **funil de aquisição** para tráfego pago:
anúncio → landing → mini-diagnóstico (simulador) → resultado → plano recomendado → checkout → pagamento → onboarding.
Há também um **painel administrativo** para a Exactra ver contratações, clientes e leads.

Repositório: https://github.com/PauloMoreno88/Contabilidade-App

## 2. Estado atual (atualize esta seção quando mudar)

- **Fase 0 concluída em 04/10/2026**: monorepo pnpm criado. `apps/web` (Next.js, `output: 'export'`), `apps/api` (só `package.json` mínimo; o scaffold do NestJS é a primeira tarefa do agente de back) e `packages/shared` (`@exactra/shared`: enums, schemas zod, `plans.config.ts`, simulador, testes Vitest).
- Todos os preços e regras do simulador são **PLACEHOLDER** (`packages/shared/src/plans.config.ts` e `simulator.ts`) até o contador responder (`docs/perguntas-contador.md`).
- Protótipos HTML em `docs/prototype/` (variantes A–D). A **variante D** é a base do front real. O cliente ainda **não aprovou** o design: construa em componentes pequenos e deixe textos/preços em arquivos de configuração para refatorar depois.
- Pendências externas do usuário (conta Stripe, DNS, contador): ver issues com label `pendencia-externa` no GitHub Project.
- **API (feat/api) em 04/10/2026**: issues #12–#17 implementadas em `apps/api` (auth admin, leads, checkout Stripe, webhooks, e-mails, job de vencimento, endpoints admin + CSV). Neon de dev migrado e admin criado. Pendências externas e contrato das rotas: `apps/api/README.md`.

## 3. Estrutura alvo (monorepo pnpm)

```
apps/web        Next.js 15, React 19, TypeScript, Tailwind 4, Framer Motion, Lucide (export estático)
apps/api        NestJS, TypeScript, Prisma, Better Auth
packages/shared zod schemas, DTOs, plans.config.ts, função de cálculo do simulador
docs/           plano.md, perguntas-contador.md, prompt.md, roadmap-entrega.html
```

- `packages/shared` é **o contrato** entre front e back. Alterou? Avise o outro lado e atualize `docs/plano.md`.
- O front só conversa com o API por HTTP. Não coloque regra de negócio no front, exceto a função pura de cálculo do simulador, que vem de `packages/shared`.

## 4. Stack e decisões que NÃO devem ser reabertas sem pedir ao usuário

- Gerenciador: **pnpm workspaces** (sem Turborepo por ora).
- Banco: **Postgres no Neon** via Prisma.
- Auth do admin: **Better Auth** no `apps/api` (e-mail+senha, sem cadastro público, plugin `admin`, 2FA e reset de senha no v1, cookies compartilhados entre `www.` e `api.`).
- Pagamentos: **Stripe**. Cartão = assinatura recorrente mensal. Pix e boleto = pagamento único antecipado de 3/6/12 meses. Tudo atrás de uma interface `PaymentProvider`.
- E-mail: **Resend**.
- Hospedagem: **Render** (front estático, API como Web Service).
- Não trocar de stack sem pedir ao usuário.

## 5. Regras de domínio (importantes)

- **Nunca** armazenar dado de cartão. Stripe Checkout hospedado cuida disso.
- **Nunca** inventar regra fiscal ou preço real. Tudo que depender do contador é `PLACEHOLDER`, concentrado em `packages/shared` (`plans.config.ts` e regras do simulador). Perguntas pendentes: `docs/perguntas-contador.md`.
- O simulador sempre mostra: "Esta é uma estimativa. O enquadramento tributário definitivo depende da análise do contador."
- Contrato só ativa por **webhook verificado** do Stripe. Nunca pela página de sucesso do front. Webhooks são **idempotentes** (tabela `WebhookEvent` com `stripeEventId` único).
- Boleto é assíncrono (1–3 dias úteis): contrato nasce `PENDING_PAYMENT`.
- Status do contrato: `PENDING_PAYMENT → ACTIVE → PAST_DUE | CANCELED | EXPIRED`.
- Pix/boleto não renovam sozinhos: um job diário avisa o vencimento e marca contratos vencidos.
- A flag `CHECKOUT_ENABLED` controla pagamentos reais. Até o contador validar preços, só Stripe em **modo teste**.
- LGPD: guardamos nome, e-mail, telefone e CPF/CNPJ. Exige consentimento explícito (simulador e checkout) e acesso restrito ao admin.
- Não copiar o site, os textos nem a paleta da Studio Fiscal (apenas inspiração de estrutura). Preservar a identidade visual da Exactra (paleta extraída do site atual; vermelho `#C82333` é a cor de destaque usada nos materiais do projeto).

## 6. Como trabalhar

Dois agentes paralelos, cada um em seu worktree e sua branch, saindo de `feat/app-v2`:

| Agente | Branch | Pasta que pode alterar |
|---|---|---|
| Front | `feat/web` | `apps/web` |
| Back | `feat/api` | `apps/api` |

- Não edite a pasta do outro agente. `packages/shared` só muda avisando o outro lado.
- Contrato primeiro: o front usa mock do contrato até o API existir.
- PRs pequenos para `feat/app-v2`. **Nada vai para `master` antes da aprovação do cliente.** Nunca faça push em `master`.
- Commits: conventional commits em inglês (`feat:`, `fix:`, `chore:`…), como no histórico.
- Idiomas: código, identificadores e commits em inglês; textos de interface e documentação em português (pt-BR, linguagem simples e direta, falando com empresário/profissional, não com contador).

## 7. Comandos

```
pnpm install
pnpm --filter web dev        # Next.js
pnpm --filter api start:dev  # NestJS
pnpm --filter shared test    # Vitest
pnpm --filter api test:e2e
```

`pnpm --filter api ...` só funciona depois que o scaffold do Nest existir. Ajuste esta seção se os nomes dos scripts mudarem.

## 8. Testes e ambientes

- Vitest em `packages/shared` (principalmente o cálculo do simulador).
- e2e do Nest com supertest e banco de teste.
- Webhooks com fixtures do Stripe e Stripe CLI.
- Smoke com Playwright no funil, no final.
- Ambientes: local (branch de dev no Neon, Stripe em modo teste) e produção.
- Cada app tem `.env.example`. **Nunca** commitar segredos ou `.env`.

## 9. UX do front

Mobile first. Leitura rápida, CTAs claros, progresso visível no simulador ("Passo 2 de 5"), cards clicáveis, números grandes, microinterações discretas. Evitar estética genérica de contabilidade (prédios, calculadoras, apertos de mão). O visitante pode vir de anúncio sem conhecer a Exactra: a página deve responder rápido onde ele está, o que fazem, se serve para ele, quanto custa, se pode confiar, como funciona e como contratar.

## 10. O que fazer ao terminar uma tarefa

- Rodar lint, build e testes do app que você alterou.
- Atualizar a seção 2 deste arquivo e o checklist de `docs/plano.md` se o estado do projeto mudou.
- Registrar no `docs/plano.md` qualquer decisão nova.
