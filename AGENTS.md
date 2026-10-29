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
- Protótipos HTML em `docs/prototype/` (variantes A–G; benchmark em `docs/benchmark-concorrentes.md`). A **variante G** foi aprovada pelo cliente em 22/10/2026 e é a base do front real. Exigência do cliente: **nenhuma foto de pessoas** (só imagens ligadas à contabilidade; depoimentos com iniciais). Textos e números continuam em arquivos de configuração.
- **Plano único** desde 22/10/2026: o **Plano Exactra** (`exactra`, preço PLACEHOLDER R$ 299). `PLAN_IDS` só tem `exactra`; `STORED_PLAN_IDS` inclui os antigos (`essencial`, `profissional`, `empresarial`) para contratos e leads já gravados, e `planInfo()` dá o nome de qualquer um. Migration aditiva `20261022000000_single_plan`. Vendido como **contrato anual** (decisão 22, preço anual PLACEHOLDER em `annualPriceCents`), sem limite de funcionários. Inclui abertura de empresa (decisão 34). Contato, dados oficiais e documentos iniciais da Exactra em `packages/shared/src/content.ts`.
- Pendências externas do usuário (conta Stripe, DNS, contador): ver issues com label `pendencia-externa` no GitHub Project.
- **API (feat/api) em 04/10/2026**: issues #12–#17 implementadas em `apps/api`: auth admin (Better Auth), `POST /leads`, checkout Stripe (cartão = assinatura; Pix/boleto = pagamento único), webhooks idempotentes, e-mails Resend (templates do `@exactra/emails`, html + text), job diário de vencimento e `/admin/*` + CSV. Staging no Render via Blueprint `render.yaml` (branch `feat/app-v2`, migrations no pre-deploy, health em `/health` e `/health/db`); passo a passo em `docs/deploy-staging.md`. CORS explícito via `WEB_ORIGIN` (`src/setup-app.ts`). Retorno do Stripe: `/checkout/status?contract&token` e `/checkout?cancelado=1&plan=`. Query e respostas do admin usam os schemas de `@exactra/shared` (`admin.ts`). Neon de dev migrado e admin criado. Criação de sessão validada no Stripe de teste (cartão, Pix e boleto). Rotas, teste manual com o Stripe e pendências: `apps/api/README.md`.
- **Front (feat/web) em 04/10/2026**: issues #7–#11 implementadas em `apps/web`. Landing (variante D, textos em `src/config/`), simulador com gate de lead, `/checkout` (`?plan=`, `?cancelado=1`), `/checkout/status` (consulta o status, nunca ativa pela volta do Stripe), `/privacidade` e `/termos` (**rascunho**, sem revisão jurídica, em `src/config/legal.ts`) e painel `/admin` (login com 2FA por app, e-mail ou código de recuperação; reset de senha; ativação do 2FA em `/admin/seguranca`; contratos, detalhe, leads e CSV). Fala com o API por `src/lib/api` (HTTP, respostas validadas pelo shared) e com o Better Auth por `src/lib/auth.ts`. Flags: `NEXT_PUBLIC_CHECKOUT_ENABLED` (padrão `false`) e `NEXT_PUBLIC_USE_MOCK` (padrão `false`, mocks só para trabalho local).
- **Front em 22/10/2026 (variante G)**: landing refeita em `apps/web/src/components/landing` (Hero com foto, simulador sobreposto ao hero, Sobre com números e mosaico, Serviços, bloco do WhatsApp, card do plano único, Depoimentos, faixa de chamada, Dúvidas, Contato e barra fixa no celular). Simulador em `components/simulator` (cards com ícone, faturamento por barra deslizante, cadastro, comparativo de regimes vindo de `estimateRegimes` em `@exactra/shared`). Fontes Source Serif 4 (títulos) e Figtree (texto); tokens em `globals.css`. Botão "Acessar plataforma" leva a `/admin/login` (área do cliente ainda não existe). Contato sem formulário (não há endpoint): WhatsApp, telefone e e-mail.
- **Blog em 22/10/2026**: `/blog` (lista com filtro por assunto) e `/blog/[slug]`, gerados no build a partir de `apps/web/src/content/blog/*.md` (formato em `src/lib/blog.ts`; textos fixos em `src/config/blog.ts`). 10 artigos iniciais, revisados pelo contador em 23/10/2026 (`reviewed: sim`). Fotos dos artigos em `public/img/blog` (Unsplash, sem pessoas). Link "Blog" no menu e no rodapé; artigos no sitemap.
- `packages/shared` agora tem os schemas das respostas do admin (`src/admin.ts`) e de `POST /leads`.
- **Área do cliente em 23/10/2026** (branch `feat/acesso-cliente`, decisões 24–30 do `docs/plano.md`): login único em `/entrar` (papel `admin` → `/admin`, `customer` → `/app`), link mágico para clientes, convite por e-mail. `/app`: Início, Documentos (checklist mensal + upload direto ao R2), Guias (leitura do PDF com conferência dos dígitos verificadores, "Já paguei"), Plano (renovação), Empresa e primeiro acesso. Admin: `/admin/mes`, `/admin/clientes`, `/admin/cliente`, `/admin/guias/nova`, `/admin/checklist`. Contrato em `packages/shared/src/portal.ts` e `portal-admin.ts`. Regras PLACEHOLDER em `PORTAL_RULES`. Pendências: `docs/pendencias-area-do-cliente.md`.
- **E-mails de renovação em 24/10/2026**: ao ativar novo contrato de empresa que já teve contrato iniciado, cliente e Exactra recebem confirmação de renovação com o novo período, sem repetir boas-vindas ou aviso de nova contratação (decisão 32 do `docs/plano.md`).

- **Feedback de interface em 29/10/2026** (branch `feat/ui-feedback`): indicador de carregamento comum no front, fallbacks de navegação e Suspense, espera em ações e atualizações de dados; cursor e hover globais para controles interativos, com estados desabilitados e redução de movimento. Testes locais com mocks em `e2e/ui-feedback` (configuração `ui-feedback.config.ts`).

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
- Pagamentos: **Stripe**. Desde 22/10/2026 (decisão 22): **contrato anual pago na contratação**, no cartão (à vista ou parcelado), Pix ou boleto. Assinaturas mensais antigas continuam tratadas. Tudo atrás de uma interface `PaymentProvider`.
- E-mail: **Resend**.
- Arquivos da área do cliente: **Cloudflare R2** (S3), atrás de `StorageProvider` (decisão 27).
- Hospedagem: **Render** (front estático, API como Web Service).
- Não trocar de stack sem pedir ao usuário.

## 5. Regras de domínio (importantes)

- **Nunca** armazenar dado de cartão. Stripe Checkout hospedado cuida disso.
- **Nunca** inventar regra fiscal ou preço real. Tudo que depender do contador é `PLACEHOLDER`, concentrado em `packages/shared` (`plans.config.ts` e regras do simulador). Perguntas pendentes: `docs/perguntas-contador.md`.
- O simulador sempre mostra: "Esta é uma estimativa. O enquadramento tributário definitivo depende da análise do contador."
- Contrato só ativa por **webhook verificado** do Stripe. Nunca pela página de sucesso do front. Webhooks são **idempotentes** (tabela `WebhookEvent` com `stripeEventId` único).
- Boleto é assíncrono (1–3 dias úteis): contrato nasce `PENDING_PAYMENT`.
- Status do contrato: `PENDING_PAYMENT → ACTIVE → PAST_DUE | CANCELED | EXPIRED`.
- Contratos pré-pagos (todos os novos, anuais) não renovam sozinhos: um job diário avisa o vencimento e marca contratos vencidos.
- A flag `CHECKOUT_ENABLED` controla pagamentos reais. Até o contador validar preços, só Stripe em **modo teste**.
- Área do cliente: cliente nunca acessa `/admin` e equipe nunca acessa `/app` (papel do Better Auth). Toda rota `/app` resolve a empresa do login; arquivo de outra empresa responde 404. Linha digitável só é publicada se todos os dígitos verificadores baterem, e sempre por uma pessoa. Arquivos ficam 1 ano (retenção a partir da competência).
- LGPD: guardamos nome, e-mail, telefone e CPF/CNPJ. Exige consentimento explícito (simulador e checkout) e acesso restrito ao admin. Leads do simulador que não viram cliente são apagados após 30 dias (job diário).
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
pnpm test                    # todos os testes unitários e e2e do API (Vitest)
pnpm --filter shared test    # Vitest
pnpm --filter web test       # unitários do front (src/lib)
pnpm --filter api test:unit  # unitários do API (src/**/*.test.ts)
pnpm --filter api test:e2e
pnpm --filter e2e staging    # fluxos completos no staging (Playwright); e-mails esperados: pnpm --filter e2e emails
```

`pnpm --filter api ...` só funciona depois que o scaffold do Nest existir. Ajuste esta seção se os nomes dos scripts mudarem.

## 8. Testes e ambientes

- Vitest em `packages/shared` (simulador, linha digitável, CPF/CNPJ, competências), `packages/emails` e `apps/web/src/lib` (formatação, blog, destino após o login).
- Unitários do API ao lado do código (`src/**/*.test.ts`: leitura de guias, datas de contrato, serialização); `pnpm --filter api test` roda eles e os e2e.
- e2e do Nest com supertest e banco de teste.
- Webhooks com fixtures do Stripe e Stripe CLI.
- Fluxos completos com Playwright em `e2e/` (24/10/2026), contra o staging publicado: os 8 fluxos de `docs/fluxos.html`. Logins de teste em `e2e/.env` (fora do Git). Não leem e-mail: registram os envios esperados para conferência manual. Detalhes em `e2e/README.md`.
- Ambientes: local (branch de dev no Neon, Stripe em modo teste) e produção.
- Cada app tem `.env.example`. **Nunca** commitar segredos ou `.env`.

## 9. UX do front

Mobile first. Leitura rápida, CTAs claros, progresso visível no simulador ("Passo 2 de 5"), cards clicáveis, números grandes, microinterações discretas. Evitar estética genérica de contabilidade (prédios, calculadoras, apertos de mão). O visitante pode vir de anúncio sem conhecer a Exactra: a página deve responder rápido onde ele está, o que fazem, se serve para ele, quanto custa, se pode confiar, como funciona e como contratar.

## 10. O que fazer ao terminar uma tarefa

- Rodar lint, build e testes do app que você alterou.
- Atualizar a seção 2 deste arquivo e o checklist de `docs/plano.md` se o estado do projeto mudou.
- Registrar no `docs/plano.md` qualquer decisão nova.
