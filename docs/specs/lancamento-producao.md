# Spec — Lançamento em produção

## Identificação
- Versão / estado: 1.2 / aprovada (1.0 aprovada por Paulo em 12/11/2026; 1.1 e 1.2 registram as respostas da mesma conversa). Em implementação na branch `feat/launch-readiness`. O PR #81 foi integrado em `feat/app-v2` em 12/11/2026.
- Workflow e versão / overrides: `complex-development` v1.1 (produção, pagamentos, DNS e dados pessoais). `planning`, `unit_tests` e `independent_review` obrigatórios. E2E desativado por padrão: o fluxo 1 do Playwright no staging (REQ-001) só roda com override explícito do usuário.
- Fonte do pedido / responsável: conversa de 12/11/2026 com o usuário (Paulo) e o artefato "Lançamento Exactra".
- Roadmap: `docs/roadmap-lancamento.md`.

## Objetivo e limites
Deixar o código e a documentação prontos para subir site, área do cliente e pagamento pelo Mercado Pago em produção, e conduzir com segurança o ensaio de compra e reembolso a R$ 10.

**Escopo do agente:** itens de código e documentação do checklist marcados "Claude", o preço real quando chegar e o ensaio a R$ 10.

**Não escopo:** criar contas, gerar ou guardar segredos, mexer no DNS, fazer push em `master`, mudar a stack, inventar preço ou regra fiscal, medição de anúncios (#46, onda 6).

## Regras para o agente
1. Leia `AGENTS.md` inteiro antes de começar.
2. Uma branch por requisito, saindo de `feat/app-v2`, nome `feat/<assunto>` ou `chore/<assunto>`. PR pequeno para `feat/app-v2`. Nunca push em `master`.
3. Commit, push e PR só com pedido do usuário.
4. Nenhum segredo no Git, em issue, no chat ou neste arquivo. Variáveis novas entram no `.env.example` com valor vazio e comentário.
5. Ao terminar cada requisito: lint, build e testes do app alterado; atualizar a seção 2 do `AGENTS.md`, o `docs/plano.md` e a coluna "Evidência" da rastreabilidade abaixo.
6. Requisito com decisão aberta (ver "Decisões"): parar nele, avisar o usuário e seguir com os independentes.
7. Toda comunicação com o usuário em pt-BR.

## Requisitos e aceitação
| Requisito | Comportamento | Critério verificável | Verificação prevista |
|---|---|---|---|
| REQ-001 | A Stripe sai do código (PR #81). | CA-001: PR #81 integrado em `feat/app-v2`; `rg -i stripe apps packages` só encontra histórico em docs ou migrations; `pnpm test` passa; migration `20261111000000_drop_stripe_columns` aplicada no staging; fluxo 1 de compra passa no staging. | testes unitários e e2e do API; Playwright no staging (com override) |
| REQ-002 | Termos e privacidade publicados sem aviso de rascunho, com o texto revisado. | CA-002: `draftNotice` some de `apps/web/src/config/legal.ts` e das páginas `/termos` e `/privacidade`; o texto bate com a versão revisada pelo jurídico; termos citam a guarda de 1 ano e que o portal não é o arquivo fiscal oficial. | build do web e leitura das páginas |
| REQ-003 | Rate limit em `POST /leads` e `POST /checkout/sessions`. A renovação (`POST /app/plan/renew`) fica de fora: exige login e já devolve 409 com renovação pendente. | CA-003: acima do limite por IP, a API responde 429 com corpo JSON; abaixo do limite nada muda; o IP vem do `X-Forwarded-For` do Render (`trust proxy`). Limite em memória basta: a API roda com uma instância. | e2e do API |
| REQ-004 | Erros da API e do site chegam ao Sentry, sem dados pessoais. | CA-004: sem `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` nada é enviado e o build passa; com DSN, um erro forçado chega ao Sentry; `sendDefaultPii: false`, sem corpo de requisição, sem e-mail, CPF ou CNPJ. | unitário (inicialização condicional); teste manual com DSN |
| REQ-005 | Blueprint de produção em `render.production.yaml`, separado do staging (cada Blueprint vive num workspace). | CA-005: serviços `exactra-api` (`0.5c-512mb`, `virginia`, branch `master`, sem autoscale, pre-deploy com migrations, health em `/health`) e `exactra-web` (branch `master`, `NEXT_PUBLIC_APP_ENV=production`, sem `noindex`); nenhuma variável `STRIPE_*`; segredos com `sync: false`; `MERCADO_PAGO_MODE=live` e `CHECKOUT_ENABLED=false`; staging inalterado. | leitura do Blueprint; `render blueprint validate`, se disponível |
| REQ-006 | Modo pré-lançamento do simulador (decisão D1 / 44): coleta perfil e contato sem mostrar valores. | CA-006: com `SIMULATOR_SHOWS_ESTIMATE = false`, o simulador não mostra regime, imposto, comparativo nem "quanto sobra"; o resultado diz que um contador entra em contato e oferece WhatsApp e o plano; a landing e o blog não prometem valores de imposto; com `true`, o comportamento antigo volta. | build e lint do web; Playwright do fluxo 1 atualizado |
| REQ-007 | Runbook da virada em `docs/lancamento-producao.md`. | CA-007: lista todas as variáveis de produção por serviço (sem valores), a ordem da onda 3 à onda 5, o seed do admin, o ensaio a R$ 10, a virada do DNS com TTL baixo e como voltar ao site antigo. | revisão do usuário |
| REQ-008 | Preço real aplicado quando a Exactra informar. **Adiado em 12/11/2026:** produção pode subir com o preço atual (R$ 3.588 por ano); não bloqueia o lançamento. | CA-008: `annualPriceCents` com o valor informado, `PRICES_ARE_PLACEHOLDER = false`, aviso "Valores de exemplo" some do checkout, testes do shared e e2e de preço atualizados (`simulator.test.ts`, `e2e/tests/01-compra.spec.ts`), tabela de tarifas do artefato recalculada. | testes do shared, web e API |
| REQ-009 | Ensaio de compra e reembolso a R$ 10 sem expor o preço ao público. | CA-009: o preço de R$ 10 só existe em um commit marcado `TEMPORARY`, publicado com o site fora do domínio final; depois do ensaio, `git revert` desse commit está na `master` e em produção; cada compra de teste (Pix, cartão à vista, cartão parcelado, boleto) ativou o contrato só pelo webhook e cada reembolso total o deixou `CANCELED` com um alerta à Exactra; os registros de teste estão identificados ou apagados. | teste manual guiado, com registro no runbook |

## Premissas e questões abertas
- O texto atual de termos e privacidade é o final (resposta de 12/11/2026); basta tirar o aviso de rascunho.
- O aviso "Valores de exemplo, ainda em validação." continua no checkout até a troca do preço (`PRICES_ARE_PLACEHOLDER` vira `false` junto com o REQ-008). Decidido por Paulo em 12/11/2026.
- A cobrança liga no lançamento mesmo com o simulador em pré-lançamento (diferente da D1 original). Decidido por Paulo em 12/11/2026.
- Os termos continuam citando a estimativa do simulador: mantido como está, por decisão de Paulo em 12/11/2026.
- O Mercado Pago tem valor mínimo por parcela; com R$ 10 o parcelado deve oferecer 1 ou 2 parcelas. O teste em 12x com o valor cheio fica fora do ensaio, a critério da Exactra (juros pagos pelo comprador).
- Para o ensaio, o webhook de produção do Mercado Pago aponta temporariamente para a URL `onrender.com` da API. A preferência não envia `notification_url`; vale a URL do painel.
- No ensaio o site roda em `*.onrender.com`, então `AUTH_COOKIE_DOMAIN` fica vazio e `WEB_ORIGIN` precisa incluir essa URL. Depois da virada, os dois mudam para o domínio final.
- A API roda com uma instância: os jobs diários e o rate limit em memória dependem disso.

## Decisões e aprovação humana
| Decisão relevante | Impacto/alternativas/rollback | Quem / data / referência | Versão e escopo autorizado |
|---|---|---|---|
| Spec 1.0 | — | Paulo — aprovada em 12/11/2026 | REQ-001 a REQ-009 |
| Simulador em modo pré-lançamento (D1), revertendo a resposta anterior | Rollback: `SIMULATOR_SHOWS_ESTIMATE = true` quando o contador entregar as regras. | Paulo — 12/11/2026 | REQ-006 |
| Termos e privacidade: texto atual é o final | — | Paulo — 12/11/2026 | REQ-002 |
| Preço anual real adiado; lançar com o preço atual | Troca futura de um valor em `plans.config.ts`. | Paulo — 12/11/2026 | REQ-008 |
| Ensaio a R$ 10 em produção antes do DNS | Expõe R$ 10 só em `*.onrender.com`. Rollback: `git revert` e novo deploy. | Paulo — pedido em 12/11/2026; confirmar a janela | REQ-009 |
| Sentry (plano grátis): `@sentry/nestjs` na API e `@sentry/browser` carregado sob demanda no site | Desligado sem DSN. Rollback: apagar o DSN. | Paulo — 12/11/2026 | REQ-004 |
| Rate limit em memória, sem dependência | Vale com uma instância (`numInstances: 1`). Alternativa futura: `@nestjs/throttler` com store compartilhado. | Agente, dentro da spec aprovada | REQ-003 |

## Plano e resultados de validação
| Etapa | Comando ou evidência | Resultado |
|---|---|---|
| Unitários e e2e do API | `pnpm --filter api test`, `pnpm --filter api lint` | 12/11/2026: 25 unitários e 73 e2e passando; lint sem erros |
| Shared | `pnpm --filter shared test` | 12/11/2026: 41 passando (sem mudança no shared) |
| Web | `pnpm --filter web lint`, `test` e `build` | 12/11/2026: lint limpo, 23 testes, build de staging ok |
| Fluxo 1 no staging | `pnpm --filter e2e staging` (com override) | — |
| Ensaio a R$ 10 | registro em `docs/lancamento-producao.md` | — |

## Rastreabilidade final
| Requisito | Arquivo / símbolo | Teste / evidência |
|---|---|---|
| REQ-001 | PR #81, integrado em 12/11/2026 | fluxo 1 no staging pendente |
| REQ-002 | `apps/web/src/config/legal.ts` (sem `draftNotice`), `components/legal/LegalPage.tsx` | build do web |
| REQ-003 | `apps/api/src/rate-limit.ts` (`RateLimit`, `clientKey`, `LEAD_LIMIT` 30 e `CHECKOUT_LIMIT` 20 a cada 10 min), `leads.controller.ts`, `contracts/checkout.controller.ts` | `test/rate-limit.e2e-spec.ts`, `src/rate-limit.test.ts` |
| REQ-004 | `apps/api/src/instrument.ts` (`scrubEvent`), `main.ts`, `app.module.ts` (`SentryModule`, `SentryGlobalFilter`); `apps/web/src/instrumentation-client.ts`; `.env.example` dos dois apps | `src/instrument.test.ts`; envio real pendente de DSN |
| REQ-005 | `render.production.yaml`; `render.yaml` ganhou as variáveis do Sentry | leitura; validação no Render pendente |
| REQ-006 | `packages/shared/src/simulator.ts` (`SIMULATOR_SHOWS_ESTIMATE`), `apps/web/src/components/simulator/{Simulator,LeadGate,ResultView}.tsx`, `config/simulator.ts` (`prelaunch`), `config/site.ts`, `config/blog.ts` | lint, build; `e2e/tests/01-compra.spec.ts` atualizado (não executado) |
| REQ-007 | `docs/lancamento-producao.md` | revisão do usuário pendente |
| REQ-008 | `packages/shared/src/plans.config.ts` | — |
| REQ-009 | commit `TEMPORARY` e seu revert | — |

## Auditoria e desvios
Revisão independente por subagente em 12/11/2026, sobre o diff da `feat/launch-readiness`. Achados e tratamento:

| Achado | Tratamento |
|---|---|
| `trust proxy` 1 pode dar o IP do proxy do Render (todos dividem o limite) | Verificação de duas redes no passo 3 de `docs/lancamento-producao.md`, antes de anúncios. Não verificável localmente. |
| Limite apertado com CGNAT; IPv6 fura por endereço; `Map` sem teto | Leads 30 e checkout 20 por 10 min; chave por /64 no IPv6 (`clientKey`, com teste); teto de 10 mil chaves. |
| Sentry iniciava depois das dependências | `instrument.ts` vira entry do tsdown e carrega com `node --import` nos dois Blueprints e no `start`. |
| Erros engolidos pelos jobs não chegavam ao Sentry | `captureException` nos `catch` de `expiry.job.ts` e `portal.job.ts`; comentário do filtro corrigido. 5xx de `HttpException` (ex.: `/health/db`) ficam com o monitor de uptime. |
| Mensagens de erro podiam levar e-mail, CPF ou CNPJ | `scrubEvent` remove `extra` e contextos extras e mascara e-mail e números de 11 a 14 dígitos (teste). |
| Boleto de R$ 10 podia ativar depois do revert | Passo a passo espera a compensação e confere que nada ficou ativo. |
| Termos ainda falam da estimativa do simulador | Mantido por decisão do usuário (12/11/2026). |
| Promessa de valor no blog | Título do CTA trocado; rótulos "Simular" mantidos. |
| Documentação desalinhada | Roadmap atualizado e ordem DNS → webhooks igual ao passo a passo. |

**Desvio:** o CA-005 pedia o staging inalterado; o `render.yaml` ganhou as variáveis do Sentry e o `--import` no start, para o staging testar o mesmo que a produção.

## Histórico
- 1.0 (12/11/2026): versão inicial, a partir do artefato "Lançamento Exactra". Aprovada.
- 1.1 (12/11/2026): jurídico mudou o texto (REQ-002 espera o texto final); simulador com regras reais (REQ-006 reescrito); Sentry aprovado; renovação fora do rate limit; produção em `render.production.yaml`.
- 1.2 (12/11/2026): texto jurídico atual é o final; simulador em modo pré-lançamento; preço real adiado, sem bloquear o lançamento; PR #81 integrado. Achados da revisão independente tratados (ver Auditoria).
