# apps/api — agente de back

Leia primeiro o `AGENTS.md` da raiz e o `docs/plano.md`. Este arquivo só traz o que é específico do back.

- Branch: `feat/api` (worktree próprio). Só altere `apps/api`. Mudanças em `packages/shared` exigem avisar o agente de front.
- Esta pasta hoje só tem um `package.json` mínimo. **Criar o scaffold do NestJS (TypeScript) é a primeira tarefa** (issue de Nest + Prisma + Better Auth). Nome do pacote deve continuar `api`.
- Stack: NestJS, Prisma, Postgres (Neon), Better Auth, Stripe, Resend.
- O contrato (schemas zod, DTOs, planos, simulador) vem de `@exactra/shared`. Valide as entradas com esses schemas; não redefina tipos.
- Better Auth: e-mail+senha, cadastro público desligado, plugin `admin`, 2FA e reset de senha. A integração com Nest depende de pacote da comunidade e de ajuste no body parser: **confira a documentação atual** antes de implementar.
- Stripe atrás da interface `PaymentProvider`. Cartão = assinatura mensal; Pix/boleto = pagamento único de 3/6/12 meses. Webhooks com assinatura verificada e idempotência (`WebhookEvent.stripeEventId` único). Contrato só ativa por webhook.
- `CHECKOUT_ENABLED=false` por padrão. Use somente chaves do Stripe em **modo teste** até o contador validar preços.
- Nunca logue nem persista dado de cartão. Nunca commite `.env`.
- Cookies de sessão devem funcionar entre `www.` e `api.` do domínio da Exactra (cookies cross-subdomain). Em dev local, use `localhost`.
- Testes: e2e com supertest e banco de teste; webhooks com fixtures do Stripe.

Comandos (após o scaffold): `pnpm --filter api start:dev`, `pnpm --filter api test`, `pnpm --filter api test:e2e`.
