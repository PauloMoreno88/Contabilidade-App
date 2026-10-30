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

**30/10/2026 — base comum dos painéis:** a pedido do usuário, admin e cliente passam a compartilhar o layout `WorkspaceShell`, inspirado em `C:/Users/paulo/Backup OneDrive/Ten/portal/web/src/layouts/sidebar-layout.tsx` e seu tema. Barra lateral branca recolhível, links com ícones, seleção com cor da Exactra, identidade do usuário e saída no rodapé; menu móvel por diálogo nativo com Escape e retorno de foco. Títulos, controles e tabelas seguem um padrão comum apenas dentro dos painéis. Regras de acesso, empresa, renovação, onboarding e 2FA preservadas. Sem MUI nem novas dependências.

- [x] Base visual compartilhada do admin e cliente, navegação responsiva e testes de teclado dos dois perfis.

**30/10/2026 — interface dos e-mails:** refinamento das telas de envio, histórico e detalhe com a skill frontend-design, preservando os tokens e a tipografia da Exactra. Mensagem e destinatários separados no desktop; busca por nome/e-mail mantém a seleção completa e deixa isso explícito. Navegação comum, histórico organizado por assunto/responsável/data e status com texto e ícones. No celular, a data de atualização fica junto ao cliente para evitar rolagem horizontal. Contratos e regras de envio mantidos.

- [x] Refinamento visual e responsivo das três telas de e-mail, com busca de destinatários e seleção parcial acessível.

**29/10/2026 — histórico de e-mails:** cada envio personalizado gera um registro persistente, com assunto, mensagem, data, admin responsável e cópia dos destinatários. O detalhe mostra **Pendente**, **Enviado**, **Entregue** e **Falhou** por cliente. Entrega depende de webhook assinado do Resend (não indica leitura). Histórico e detalhe exclusivos para admins; alterações posteriores do cadastro não mudam o registro. Contratos em `packages/shared/src/bulk-email.ts`. Migrations aditivas, sem backfill; processamento síncrono atual mantido. Configuração externa pendente: webhook Resend e `RESEND_WEBHOOK_SECRET` (ver `historico-emails.md`).

- [x] Histórico paginado, detalhe por cliente, persistência antes do envio e webhook assinado com tratamento de eventos duplicados/fora de ordem.

**29/10/2026 — issue #56:** envio de e-mail personalizado exclusivo para admins, em `/admin/emails`. Todos os clientes cadastrados vêm marcados por padrão; destinatários são escolhidos antes de enviar. Assunto e mensagem em texto simples, e-mail individual sem expor outros destinatários. Contrato compartilhado em `bulk-email.ts`; API valida todos os IDs antes de enviar e informa falhas parciais. Até 1.000 clientes por requisição, com intervalo entre envios; fila persistente fica para quando o volume exigir. Em queda de conexão, conferir o provedor antes de reenviar, pois não há retomada persistente.

- [x] #56 — tela, seleção de clientes, permissão admin na API e envio personalizado individual.

| # | Tema | Decisão |
|---|---|---|
| 1 | Monorepo | **pnpm workspaces**, sem Turborepo por enquanto |
| 2 | Estrutura | `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (contrato) |
| 3 | Banco | **Postgres no Neon** (plano gratuito), via Prisma |
| 4 | Hospedagem | Front: Static Site no Render (continua `output: 'export'`). API: Web Service no Render, plano Starter (~US$ 7/mês). Domínios: `www.exactracontabilidade.com.br` e `api.exactracontabilidade.com.br` |
| 5 | Pagamentos | **Stripe**. Cartão = assinatura recorrente mensal. **Pix e boleto = pagamento único antecipado** por 3, 6 ou 12 meses. Tudo atrás de uma interface `PaymentProvider` (permite adicionar Mercado Pago depois) |
| 6 | Agentes | Um `git worktree` + uma branch por agente: `feat/web` e `feat/api`, saindo de `feat/app-v2` |
| 7 | Estado atual | Commitar o `page.tsx` modificado e os arquivos soltos antes de migrar; migração em commit separado |
| 8 | Base do front | ~~Variante D~~. Desde 22/10/2026: **variante G** (`docs/prototype/exactra-prototype-g.html`), aprovada pelo cliente. Sem fotos de pessoas |
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
| 20 | Planos | **Um único plano**, o Plano Exactra (`exactra`). Decidido em 20/10/2026 e implementado em 22/10/2026 em shared, API (migration aditiva no enum `PlanId`), e-mails, checkout e admin. Planos antigos só aparecem em dados gravados (`STORED_PLAN_IDS`). Mais de 3 funcionários: orçamento sob medida (limite PLACEHOLDER) |
| 21 | Blog | **Blog estático** em `/blog` (22/10/2026), para SEO. Um arquivo Markdown por artigo em `apps/web/src/content/blog` (front matter: title, description, category, date, updated, reviewed), lido no build por `src/lib/blog.ts`. Cada artigo tem foto do Unsplash (licença gratuita, **sem pessoas**) em `public/img/blog/<slug>.jpg`, indicada no front matter (`image`, `imageAlt`); sem foto, a capa mostra o ícone da categoria. Cada artigo tem dados estruturados (BlogPosting, BreadcrumbList e FAQPage), entra no sitemap e chama o simulador. Temas inspirados no blog da AccountTech, com texto próprio. Os 10 primeiros estão com `reviewed: nao` até o contador revisar |
| 22 | Pagamento | **Contrato anual pago na contratação** (respostas da Exactra em 22/10/2026), no lugar de "cartão mensal recorrente + Pix/boleto de 3/6/12 meses com desconto". Cartão à vista ou parcelado em até 12x (`STRIPE_CARD_INSTALLMENTS`, desligado até testar no Stripe), Pix ou boleto à vista; sem desconto, sem taxa de adesão, valor fixo durante o contrato. Todo contrato novo é `mode: payment` com período `ANNUAL` e não renova sozinho (o job diário avisa e expira). Assinaturas mensais antigas continuam tratadas pelos webhooks. Preço anual PLACEHOLDER (12 × R$ 299). Desistência em 7 dias (CDC art. 49) nos termos. Também: sem limite de funcionários, sem abertura de CNPJ e sem oferta de orientação para abrir (23/10/2026; a abertura passou a fazer parte do plano na decisão 34), sem nota do Google e sem depoimentos por enquanto |
| 23 | LGPD | Dados do simulador guardados por **até 1 mês** (Exactra, 23/10/2026). Job diário `LeadRetentionJob` (`apps/api/src/lead-retention.job.ts`) apaga leads com mais de 30 dias que não viraram cliente |
| 24 | Área do cliente: acesso | Desenhada com o usuário em 23/10/2026. **Login único em `/entrar`**: o papel do Better Auth decide o destino (`admin` → `/admin`, `customer` → `/app`). Cliente entra com e-mail + senha ou **link mágico** (só para `customer` sem 2FA, porque o link pula o segundo fator); 2FA opcional para cliente, obrigatório (recomendado) para a equipe. A conta nasce do **webhook de pagamento** (link de ativação dentro do e-mail de boas-vindas) ou do **cadastro manual** no admin. Modelo N:N (`CompanyMember`: uma pessoa com várias empresas, uma empresa com vários logins); a v1 mostra uma empresa e um login |
| 25 | Área do cliente: guias | A Exactra sobe o PDF da guia e o sistema **lê o texto para pré-preencher** (tipo, competência, vencimento, valor, linha digitável). Travas: a linha só vale se **todos os dígitos verificadores** baterem; com linha, o valor tem de ser o da linha; avisos quando o valor não aparece no PDF e quando o CPF/CNPJ do PDF não é o do cliente; **uma pessoa sempre confirma** antes de publicar; o PDF é a fonte da verdade. Estados calculados: a pagar → paga (o cliente informa "Já paguei", comprovante opcional) → vencida. Upload em lote (casar pelo CNPJ) fica para depois |
| 26 | Área do cliente: documentos | **Checklist mensal por competência**, gerado a partir do perfil da empresa (atividade, funcionários, bancos) com modelos editáveis no admin e itens só de um cliente, mais "Outros documentos". Modelo de **exceção**: enviado conta como entregue; a Exactra só age para recusar (motivo + observação), e o item volta a pendente. Itens, prazo (dia 10) e motivos são PLACEHOLDER (issue #62) |
| 27 | Área do cliente: arquivos | **Cloudflare R2** (S3) atrás de `StorageProvider`; upload e download direto do navegador por URL assinada. PDF, fotos, XML, OFX, planilhas e ZIP até 25 MB; o tipo vem da extensão. **Retenção de 1 ano** a partir da competência (decisão do usuário, 23/10/2026), com aviso 30 dias antes e "Baixar tudo (ZIP)"; o portal não é o arquivo fiscal oficial. Em dev/testes sem R2, disco local servido pela própria API |
| 28 | Área do cliente: plano | Tela com vigência, pagamentos e **renovação 60 dias antes do fim** (novo Checkout, mesma empresa; o contrato novo começa quando o atual termina). Contrato vencido ou cancelado: **somente leitura por 90 dias**, depois bloqueado. Clientes antigos entram por cadastro manual (contrato `MANUAL`, sem Stripe); importação por planilha fica para depois |
| 29 | Área do cliente: avisos | **Só e-mail** (Resend) na v1, uma ação por e-mail: guia nova, guia vencendo (3 dias e no dia), documentos do mês, lembrete (5 e 1 dia antes e no dia), recusa, aviso de retenção. Cada e-mail sai uma vez (`NotificationLog`); a Exactra desliga os lembretes por cliente. WhatsApp automático fica para a v2. Sem chat interno: botão de WhatsApp com o assunto pronto |
| 30 | Área do cliente: escopo e visual | v1: Início (tarefas por urgência), Documentos, Guias, Plano, Empresa e primeiro acesso (3 passos, perfil pulável). Admin: Visão do mês, clientes, ficha, publicar guia, checklist. Fora: certificado digital e senhas de prefeitura (#61), chat, relatórios. Visual: mesma marca, Figtree na interface, Source Serif só em saudações e valores; **vermelho só para ação e urgência**, verde para "em dia"; a guia é desenhada como canhoto de arrecadação. Sem protótipo HTML antes (decisão do usuário) |
| 31 | Checklist: quando um item novo começa | Ao criar um item (modelo ou só de um cliente), o admin escolhe **"Vale a partir de"**: **Agora** (entra na competência aberta das empresas cujo mês já foi gerado, sem e-mail novo; se o prazo já passou, aparece atrasado) ou um dos 6 meses seguintes. Nunca um mês passado. Padrão: próximo mês. Desligar e mudar textos continuam valendo a partir do próximo mês. Campo `startsCompetence` (null nos itens antigos = todo mês). Decisão de 24/10/2026 |
| 32 | E-mails de renovação | Quando um novo contrato é pago por uma empresa que já teve contrato iniciado, o cliente e a Exactra recebem confirmação de renovação com o novo período; as instruções de primeira contratação e a origem do lead não aparecem. Um contrato anterior que nunca iniciou não conta como renovação. Decisão de 24/10/2026 |
| 33 | CPF e CNPJ | Checkout e cadastro manual conferem os **dígitos verificadores** (`isValidTaxId` em `@exactra/shared`). Aceita o **CNPJ alfanumérico** (em vigor desde julho de 2026): o documento é guardado só com letras e números, em maiúsculas. Decisão de 24/10/2026 |
| 34 | Dados da Exactra e abertura de empresa | Contato, dados oficiais (razão social, CNPJ, CRC, foro) e documentos iniciais enviados pela Exactra em 24/10/2026, em `packages/shared/src/content.ts` (`contact`, `company`, `onboarding.docGroups`). WhatsApp é o único telefone; horário seg a sex, 8h às 18h; primeiro contato em até 1 dia útil, e a contabilidade começa nele. **A abertura de empresa e a declaração do IR da pessoa física fazem parte do plano** (revoga esse ponto da decisão 22); as taxas públicas da abertura são pagas por quem contrata. Encarregado de dados (LGPD): Yann Farias, sócio da Exactra. Decisão de 24/10/2026 |

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

Área do cliente (papel `customer`): `/app/*`; ativação pública em `/account/*`; admin da área em `/admin/month`, `/admin/customers*`, `/admin/guides*`, `/admin/checklist-items*`. Lista completa em `apps/api/README.md`.

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
- [x] Porte da variante D em componentes por seção; copy e preços em arquivos de configuração
- [x] Simulador em etapas com gate leve e captura de lead
- [x] Planos, checkout, páginas de sucesso e pagamento pendente (boleto/Pix); retorno do cancelamento (`/checkout?cancelado=1&plan=…`)
- [x] Painel `/admin`: login, 2FA (app, e-mail e código de recuperação), ativação do 2FA, reset de senha, dashboard, tabelas paginadas com busca, detalhe, CSV
- [x] Responsividade e microinterações
- [x] Tudo contra mock do contrato até o API existir; trocado pelo cliente HTTP real (mock só com `NEXT_PUBLIC_USE_MOCK=true`)
- [x] `/privacidade` e `/termos` como rascunho (aguardam revisão jurídica e dados da empresa)

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
- [x] Staging no Render: `render.yaml` (API `0.5c-512mb` + static site, branch `feat/app-v2`, migrations no pre-deploy), `/health/db` e guia `docs/deploy-staging.md` (05/10)
- [ ] Criar o Blueprint no Render, preencher as variáveis e o webhook do Stripe (usuário; ver `docs/deploy-staging.md`)

**Integração e testes (14–17/10):** trocar mock pelo API real, testar fluxo completo com Stripe em modo teste, deploy e domínio.

**Lançamento (18–20/10):** deploy final, onboarding pós-venda, handoff.

**Depois:** aprovação do cliente → refazer telas e refatorar.

**Área do cliente — `feat/acesso-cliente` (23/10/2026, decisões 24–30)**
- [x] Contrato em `packages/shared` (`portal.ts`, `portal-admin.ts`, `barcode.ts`) com testes
- [x] E-mails novos em `@exactra/emails` (convite, link mágico, guia, documentos, recusa, retenção)
- [x] API: papéis e convite, link mágico, empresas e membros, checklist, uploads (R2/local), guias com leitura do PDF, plano e renovação, admin (mês, clientes, ficha, checklist), job diário; e2e com PGlite
- [x] Front: `/entrar`, `/app/*` e telas novas do admin, com mocks
- [ ] Conta e bucket no Cloudflare R2, CORS e variáveis no Render (usuário)
- [ ] Teste ponta a ponta com a API real e o R2 (staging)
- [ ] Respostas do contador (#62) e revisão dos textos pela Exactra
- [x] Página de fluxos para teste manual e apresentação (`docs/fluxos.html`) e testes Playwright dos 8 fluxos no staging (`e2e/`, 24/10/2026)
- [ ] Depois: upload de guias em lote, importação de clientes por planilha, WhatsApp automático, certificado digital (#61)

**Feedback da interface (29/10/2026, `feat/ui-feedback`)**
- [x] Padronizar loading de telas, Suspense, consultas, formulários e ações; preservar dados durante atualizações e impedir cliques repetidos nas ações em espera.
- [x] Aplicar cursor e hover em controles interativos, preservando foco visível, estados desabilitados e preferência de movimento reduzido.
- [x] Adicionar regressão local com mocks para espera, atualizações, cursor e hover em 360, 768 e 1280 px.

Padrão visual: spinner discreto na identidade da Exactra, acompanhado de texto nas telas; nos botões, manter o rótulo da ação com spinner e estado ocupado. Ações síncronas não recebem atrasos artificiais.

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
- Cloudflare R2 para a área do cliente (ver `docs/pendencias-area-do-cliente.md`).
