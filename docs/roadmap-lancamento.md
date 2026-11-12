# Roadmap — lançamento em produção

Fonte: artefato "Lançamento Exactra" (checklist com marcações de 12/11/2026), issues #19, #24, #25, #26, #46, #55, #62 e o código em `feat/app-v2`.
Spec que o agente segue: `docs/specs/lancamento-producao.md`.

## Onde estamos (12/11/2026)

- Concluído no checklist: aprovação para levar o código à `master`, revisão jurídica de termos e privacidade e revisão dos textos dos e-mails e da área do cliente.
- `feat/app-v2` está mais de 117 commits à frente da `master` (site antigo).
- PR #81 (Stripe fora do código) integrado em 12/11/2026.
- Onda 1 implementada na branch `feat/launch-readiness`: rate limit, Sentry, `render.production.yaml`, termos sem rascunho, simulador em pré-lançamento e o passo a passo da virada (decisões 43 e 44).
- Preço real adiado (lança com o atual); regras da área do cliente (#62) continuam `PLACEHOLDER`.

## Ondas

Cada onda só começa quando os bloqueios da anterior estão resolvidos. Trabalho do agente (Claude) e das contas (Paulo, Exactra) correm em paralelo dentro da onda.

### Onda 1 — Código pronto para produção (agente, sem depender de ninguém)

| # | Entrega | Dono | Bloqueia? | Spec |
|---|---|---|---|---|
| 1.1 | Merge do PR #81 em `feat/app-v2` e fluxo 1 do Playwright no staging | Paulo aprova, Claude executa | Sim | REQ-001 |
| 1.2 | Tirar o aviso de rascunho dos termos e da privacidade (com o texto revisado) | Claude | Sim | REQ-002 |
| 1.3 | Rate limit em `POST /leads` e `POST /checkout/sessions` | Claude | Não (recomendado antes de anúncio) | REQ-003 |
| 1.4 | Sentry na API e no site, desligado sem DSN | Claude | Não | REQ-004 |
| 1.5 | Blueprint de produção em `render.production.yaml` (`exactra-api`, `exactra-web`, branch `master`) | Claude | Sim | REQ-005 |
| 1.6 | Modo pré-lançamento do simulador (decidido em 12/11/2026) | Claude | Sim | REQ-006 |
| 1.7 | Runbook de virada: `docs/lancamento-producao.md` (variáveis, seed, DNS, volta) | Claude | Sim | REQ-007 |

### Onda 2 — Contas e decisões (Exactra e Paulo)

| # | Entrega | Dono | Bloqueia? |
|---|---|---|---|
| 2.1 | Preço anual real (A1–A8, #24). Adiado: lança com o preço atual | Exactra | Não |
| 2.2 | Simulador: regras reais do contador (B9–B15), para sair do pré-lançamento | Exactra | Não |
| 2.3 | Regras reais da área do cliente (#62) | Exactra | Sim |
| 2.4 | Mercado Pago: conta no CNPJ, chave Pix, credenciais e webhook de produção, juros pelo comprador, prazo do cartão | Exactra e Paulo | Sim |
| 2.5 | Neon de produção (Launch, `us-east-1`) | Paulo | Sim |
| 2.6 | Resend com domínio verificado (SPF, DKIM; DMARC só com aval) | Paulo e Exactra | Sim |
| 2.7 | Render: workspace da Exactra (Hobby), API com uma instância | Paulo | Sim |
| 2.8 | Cloudflare R2: bucket, token restrito e CORS | Paulo | Sim |
| 2.9 | Descobrir onde está o `www` hoje e baixar o TTL | Paulo e Exactra | Sim |
| 2.10 | Cartão internacional, 2FA em todas as contas, donos registrados, Stripe encerrada | Exactra e Paulo | Não |

Quando 2.1 chegar, o agente aplica o preço (REQ-008).

### Onda 3 — Produção montada, sem DNS e sem cobrança

| # | Entrega | Dono |
|---|---|---|
| 3.1 | PR `feat/app-v2` → `master` e criação dos serviços de produção pelo Blueprint | Paulo, com o agente |
| 3.2 | Variáveis de produção (issue #26), todas novas, `CHECKOUT_ENABLED=false` | Paulo |
| 3.3 | Seed do primeiro admin pelo Shell do Render | Paulo |
| 3.4 | Conferência pelas URLs `*.onrender.com`: `/health/db`, login com 2FA, e-mail chegando, upload no R2 | Paulo e Claude |
| 3.5 | Testes da área do cliente: upload pelo celular, DAS real, linha digitável, link mágico, ZIP, renovação | Paulo e Exactra |

### Onda 4 — Ensaio de pagamento real a R$ 10 (antes do DNS)

Feito nos endereços `*.onrender.com`, com o site ainda fora do domínio, para que nenhum visitante compre a R$ 10.

| # | Entrega | Dono |
|---|---|---|
| 4.1 | Commit temporário com `annualPriceCents: 1000` na `master` e deploy de API e site | Claude prepara, Paulo aprova |
| 4.2 | Webhook de produção do Mercado Pago apontando, por enquanto, para a URL `onrender.com` da API | Paulo |
| 4.3 | Ligar `CHECKOUT_ENABLED` e `NEXT_PUBLIC_CHECKOUT_ENABLED` só durante o ensaio | Paulo |
| 4.4 | Compras: Pix, cartão à vista, cartão parcelado (o Mercado Pago deve oferecer só 1 ou 2 parcelas para R$ 10), boleto | Paulo |
| 4.5 | Reembolso total de cada compra no painel do Mercado Pago: o contrato vai para `CANCELED` e a Exactra recebe o alerta | Paulo |
| 4.6 | Desligar o checkout, reverter o preço com `git revert` e fazer novo deploy | Claude prepara, Paulo aprova |
| 4.7 | Apagar ou marcar os contratos e clientes de teste no banco de produção | Paulo e Claude |

### Onda 5 — Dia do lançamento

1. Virar o DNS (`www`, raiz e `api.`) e conferir HTTPS, `/health/db`, login com 2FA e e-mails.
2. Webhooks do Mercado Pago e do Resend nas URLs finais de `api.exactracontabilidade.com.br` (só depois do HTTPS ativo).
3. Ligar a cobrança (`CHECKOUT_ENABLED=true` e novo build do site com `NEXT_PUBLIC_CHECKOUT_ENABLED=true`).
4. Ligar os monitores (Better Stack em `/health` e no site) e conferir se o Sentry recebe eventos.
5. Cadastrar os clientes atuais em `/admin/clientes`.
6. Atualizar `AGENTS.md` e `docs/plano.md`; fechar #19, #25 e #26.

### Onda 6 — Antes de investir em anúncios

- GA4 e Meta Pixel com consentimento (#46).
- Entregabilidade dos e-mails em Gmail, Outlook e UOL.
- Fechar o item do formulário de contato na #55.

## Caminho crítico

Contas da onda 2 → PR para a `master` (3.1) → ensaio a R$ 10 (onda 4) → DNS (onda 5).
O código da onda 1 não espera nada disso e deve ficar pronto antes.
