# Spec — Desativar e apagar cliente

## Identificação
- Versão: 1.0 (20/11/2026). Workflow: `complex-development` v1.1 (apaga dados de produção, LGPD).
- Branch: `feat/admin-remove-customer`, saindo de `feat/app-v2`. Decisão 46 do `docs/plano.md`.

## Objetivo e limites
O painel não tinha como tirar um cliente. Agora a ficha do cliente (`/admin/cliente`) ganha **Desativar** (reversível) e **Apagar** (definitivo, inclusive arquivos no R2).

Fora do escopo: apagar um admin; apagar registros no Mercado Pago ou no Resend; desfazer um apagar; tela de auditoria.

## Decisões do usuário (20/11/2026)
- Apagar é **bloqueado** quando a empresa tem contrato pago pelo site (`source = CHECKOUT` já ativado ou com pagamento registrado) ou checkout do site ainda em aberto (`PENDING_PAYMENT`, que ainda pode ser pago). Para esses, só desativar; desativar cancela o checkout em aberto. Clientes manuais, de teste e checkouts cancelados sem pagamento podem ser apagados.
- Apagar exige **digitar o nome da empresa**; a API confere o nome também.
- Desativar: bloqueia o login, some das listas (Clientes, Mês, e-mails em massa), para os e-mails automáticos e guarda os arquivos. Pode ser revertido (Reativar).

## Requisitos e aceitação
| Requisito | Comportamento | Critério verificável | Verificação |
|---|---|---|---|
| REQ-001 | Desativar | CA-001: `POST /admin/customers/:id/deactivate` grava `deactivatedAt`, bane os logins `customer` que não têm outra empresa ativa (`banReason = customer-deactivated`) e apaga as sessões deles; o cliente não entra mais e `/app` responde 403 mesmo com sessão em cache. | e2e |
| REQ-002 | Reativar | CA-002: `POST /admin/customers/:id/reactivate` limpa `deactivatedAt` e tira o banimento só dos logins banidos por desativação; o login volta a funcionar. | e2e |
| REQ-003 | Listas e e-mails | CA-003: desativado não aparece em `/admin/customers` (padrão `status=active`), aparece com `status=inactive`; some de `/admin/month`, dos destinatários do e-mail em massa e da contagem de clientes ativos; nenhum e-mail automático (documentos, guias, retenção, vencimento, aviso de guia publicada) sai para ele. | e2e |
| REQ-004 | Apagar | CA-004: `DELETE /admin/customers/:id` com `{ confirmName }` igual ao nome (sem diferenciar maiúsculas e espaços nas pontas) apaga os objetos do R2 de todos os arquivos da empresa e, numa transação, pagamentos, contratos, destinatários de e-mail em massa, guias, a empresa (com vínculos, checklist, pedidos de documento, arquivos e avisos), os logins `customer` sem outra empresa e o lead do simulador ligado só a ela. | e2e |
| REQ-005 | Bloqueios do apagar | CA-005: nome errado → 400 e nada muda; contrato pago pelo site → 409 e nada muda; falha ao apagar no R2 → erro e o banco fica intacto (dá para tentar de novo). A ficha informa `canDelete`. | e2e |
| REQ-006 | Painel | CA-006: Clientes tem o filtro Ativos/Desativados com selo "Desativado"; a ficha mostra o aviso de desativado, Desativar/Reativar e Apagar com campo do nome; com `canDelete = false`, o Apagar some e o motivo aparece. Depois de apagar, volta para a lista. | lint, build e mocks |

## Rastreabilidade
| Requisito | Código | Teste |
|---|---|---|
| REQ-001, 002, 004, 005 | `apps/api/src/portal/customer-removal.ts`, `admin-portal.controller.ts`, `portal/company.ts`, migration `20261120000000_customer_deactivation` | `apps/api/test/customer-removal.e2e-spec.ts` |
| REQ-003 | `admin-portal.controller.ts` (`customers`, `month`, `invite`), `admin.controller.ts`, `bulk-email.controller.ts`, `portal/notify.ts`, `portal/portal.job.ts`, `portal/documents.ts`, `contracts/expiry.job.ts`, `contracts/checkout.controller.ts` | `customer-removal.e2e-spec.ts` |
| REQ-006 | `packages/shared/src/portal-admin.ts`, `apps/web/src/components/admin/portal/{Customers,CustomerFile,CustomerDangerZone}.tsx`, `config/admin-portal.ts`, `lib/api/{http,mock-portal}.ts` | lint, build |

## Validação
| Etapa | Resultado (20/11/2026) |
|---|---|
| API: `pnpm --filter api test:e2e`, `test:unit`, `lint` | 80 e2e (7 novos em `customer-removal.e2e-spec.ts`), 28 unitários, lint limpo |
| Shared | 42 testes (`sameCompanyName`) |
| Web: `lint`, `test`, build de staging | limpo, 23 testes, build ok |

## Auditoria (revisão independente, 20/11/2026)
Nada grave. Achados tratados:
| Achado | Tratamento |
|---|---|
| Cliente desativado que compra de novo ficava com o login banido | `ensurePortalUser` tira o banimento de desativação ao vincular a uma empresa ativa (teste) |
| Checkout em aberto podia ativar empresa desativada ou pagar contrato apagado | Desativar cancela `PENDING_PAYMENT` do site; Apagar bloqueado com checkout em aberto (teste) |
| Corrida entre a checagem e a transação do Apagar | Transação interativa refaz a checagem; login só é apagado se não tiver nenhum vínculo depois do delete |
| Arquivo criado durante o Apagar ficava órfão no R2; R2 não configurado | Arquivos novos lidos na transação e apagados depois; 503 sem armazenamento com arquivos |
| `/app/me` respondia 403 com sessão em cache | Trata `ForbiddenException` como sem empresa |
| Reset de senha para login banido | `sendResetPassword` não envia para banido |
| `?apagado=` ficava na URL | Lido uma vez e removido |
| Resíduos: `WebhookEvent.payload` e linhas `verification` | Mantidos: o webhook do Mercado Pago só guarda IDs; `verification` expira sozinha |

## Riscos
- Apagar é irreversível: dupla proteção (nome digitado na tela e conferido na API) e bloqueio de contrato pago.
- Sessão em cache do Better Auth vale até 5 min: `companyFor` ignora empresa desativada, então o acesso cai na hora.
- Um login com várias empresas só é banido quando todas estão desativadas, e só é apagado quando não sobra nenhuma.
