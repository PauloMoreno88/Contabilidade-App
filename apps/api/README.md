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
