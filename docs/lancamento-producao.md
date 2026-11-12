# Lançamento em produção — passo a passo

Roteiro da virada (spec `docs/specs/lancamento-producao.md`, REQ-007). Ordem e responsáveis: `docs/roadmap-lancamento.md`.
Nenhum segredo neste arquivo: os valores ficam só no Render.

## 0. Antes de começar

- Bloqueios do roadmap resolvidos: regras da área do cliente (#62) e contas da onda 2. O preço atual e o simulador em pré-lançamento podem ir para produção (decisão 44).
- `feat/app-v2` integrada na `master` por PR aprovado pela Exactra.
- Contas no nome da Exactra, com 2FA: Render (workspace Hobby), Neon (Launch, `us-east-1`), Resend (domínio verificado), Cloudflare R2 (bucket, token restrito e CORS), Mercado Pago (CNPJ, chave Pix, credenciais de produção), Sentry (dois projetos: API e site).

## 1. Criar os serviços

1. No workspace da Exactra: **New → Blueprint**, repositório `PauloMoreno88/Contabilidade-App`, branch `master`, **Blueprint Path** `render.production.yaml`.
2. O Render pede cada variável `sync: false`. Use valores novos, nunca os do staging:

| Serviço | Variável | Valor |
|---|---|---|
| `exactra-api` | `DATABASE_URL` / `DIRECT_URL` | Neon de produção: com `-pooler` / sem `-pooler` |
| | `BETTER_AUTH_URL` | por enquanto a URL `https://exactra-api….onrender.com` |
| | `AUTH_COOKIE_DOMAIN` | vazio enquanto usar `*.onrender.com` |
| | `WEB_ORIGIN` | por enquanto a URL `https://exactra-web….onrender.com` |
| | `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_WEBHOOK_SECRET` | credencial e assinatura de **produção** |
| | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | conta da Exactra |
| | `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFY_EMAIL` | endereços da Exactra |
| | `EMAIL_ASSET_BASE_URL` | `https://www.exactracontabilidade.com.br` |
| | `R2_*` | bucket de produção |
| | `SENTRY_DSN` | DSN do projeto da API |
| `exactra-web` | `NEXT_PUBLIC_SITE_URL` | `https://www.exactracontabilidade.com.br` |
| | `NEXT_PUBLIC_API_URL` | por enquanto a URL `onrender.com` da API |
| | `NEXT_PUBLIC_SENTRY_DSN` | DSN do projeto do site |

Já vêm do arquivo: `CHECKOUT_ENABLED=false`, `MERCADO_PAGO_MODE=live`, `NEXT_PUBLIC_CHECKOUT_ENABLED=false`, `BETTER_AUTH_SECRET` gerado.

3. O primeiro deploy roda as migrations (`preDeployCommand`). Confira `GET /health/db` da API.

## 2. Primeiro admin

No **Shell** de `exactra-api`, sem deixar a senha no histórico:

```
cd apps/api
read -p "E-mail do admin: " ADMIN_SEED_EMAIL
read -s -p "Senha do admin: " ADMIN_SEED_PASSWORD; echo
ADMIN_SEED_EMAIL="$ADMIN_SEED_EMAIL" ADMIN_SEED_PASSWORD="$ADMIN_SEED_PASSWORD" node dist/seed.mjs
```

Entre em `/admin/login` e ative o 2FA em `/admin/seguranca`.

## 3. Conferência sem cobrança (URLs `onrender.com`)

- [ ] Login do admin com 2FA.
- [ ] Convite de cliente pelo drawer de `/admin/clientes`: e-mail chega e o link mágico abre `/app`.
- [ ] Upload de documento pelo celular (inclusive foto) e download pelo admin.
- [ ] Guia com um DAS real: linha digitável, valor, vencimento e CNPJ conferem.
- [ ] "Baixar tudo" (ZIP).
- [ ] Erro forçado aparece no Sentry, sem e-mail, CPF, CNPJ ou token.
- [ ] **IP do rate limit:** de duas redes diferentes (Wi-Fi e 4G), confira nos logs ou com um endpoint temporário que o `req.ip` da API é o IP público de cada aparelho e não o de um proxy do Render. Se vier o mesmo IP para os dois, ajuste `trust proxy` em `apps/api/src/setup-app.ts` antes de qualquer anúncio: com o IP errado, todo o site divide o mesmo limite.

## 4. Ensaio de pagamento a R$ 10

Feito antes do DNS: só quem tem a URL `onrender.com` vê o preço de teste.

1. Mercado Pago, aba **Produção** dos Webhooks: URL `https://exactra-api….onrender.com/webhooks/mercado-pago`, evento Pagamentos.
2. PR para a `master` com um commit só: `annualPriceCents: 1000`, marcado `TEMPORARY` (ajuste também `simulator.test.ts`). Espere o deploy da API e do site.
3. Ligue `CHECKOUT_ENABLED=true` na API e `NEXT_PUBLIC_CHECKOUT_ENABLED=true` no site (o site precisa de novo deploy).
4. Compre com um e-mail de teste identificável (ex.: `financeiro+ensaio@…`), uma vez por forma:

| Compra | Esperado | Ok |
|---|---|---|
| Pix | contrato `ACTIVE` só depois do webhook; e-mails de boas-vindas e de nova contratação | [ ] |
| Cartão à vista | idem | [ ] |
| Cartão parcelado | Mercado Pago oferece 1 ou 2 parcelas; juros por conta do comprador; contrato ativa com o valor sem juros | [ ] |
| Boleto | contrato `PENDING_PAYMENT` até a compensação (1 a 3 dias úteis) | [ ] |

5. No painel do Mercado Pago, reembolso **total** de cada compra paga: o contrato vai para `CANCELED` e a Exactra recebe um alerta, uma vez.
   **Boleto:** espere a compensação (1 a 3 dias úteis) e só então reembolse. O contrato do boleto guarda o valor de R$ 10, então um boleto pago depois do revert ainda ativaria um contrato de R$ 10. Não siga para o passo 6 antes de o boleto compensar e ser reembolsado (ou de vencer sem pagamento).
6. Desligue `CHECKOUT_ENABLED` e `NEXT_PUBLIC_CHECKOUT_ENABLED`, faça `git revert` do commit `TEMPORARY` por PR e espere o deploy. Confira que o checkout mostra o preço real.
7. Confira em `/admin` que **nenhum** contrato do e-mail de teste ficou `ACTIVE` ou `PENDING_PAYMENT`. Os registros ficam no banco como `CANCELED`, identificados pelo e-mail de teste. Anote aqui a data e os IDs dos pagamentos.

## 5. Virada do DNS

1. Anote os registros atuais do `www`, da raiz e de `api.` (onde está o site antigo) e baixe o TTL para 300 segundos um dia antes.
2. Render: adicione `www.exactracontabilidade.com.br` e `exactracontabilidade.com.br` em `exactra-web`, e `api.exactracontabilidade.com.br` em `exactra-api`. Crie os registros que o Render indicar.
3. Quando o HTTPS estiver ativo, troque as variáveis e faça novo deploy dos dois serviços:
   - API: `BETTER_AUTH_URL=https://api.exactracontabilidade.com.br`, `AUTH_COOKIE_DOMAIN=.exactracontabilidade.com.br`, `WEB_ORIGIN=https://www.exactracontabilidade.com.br,https://exactracontabilidade.com.br`.
   - Site: `NEXT_PUBLIC_API_URL=https://api.exactracontabilidade.com.br`.
4. Mercado Pago: webhook de produção para `https://api.exactracontabilidade.com.br/webhooks/mercado-pago`. Resend: webhook para `https://api.exactracontabilidade.com.br/webhooks/resend`.
5. Confira HTTPS, `/health/db`, login do admin com 2FA, link mágico e um e-mail chegando.

**Para voltar:** recoloque os registros anotados no passo 1. Com TTL de 300 segundos, o site antigo volta em minutos. A API e o banco continuam de pé.

## 6. Ligar a cobrança

1. `CHECKOUT_ENABLED=true` na API e `NEXT_PUBLIC_CHECKOUT_ENABLED=true` no site, com novo deploy.
2. Better Stack: monitores em `https://api.exactracontabilidade.com.br/health` e em `https://www.exactracontabilidade.com.br`.
3. Cadastre os clientes atuais em `/admin/clientes`.
4. Atualize `AGENTS.md` e `docs/plano.md`; feche #19, #25 e #26.
