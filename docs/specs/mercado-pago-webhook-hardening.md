# Spec — Mercado Pago: bloqueios antes do teste real

## Identificação
- Versão / estado: 1.0 / implementada
- Workflow e versão / overrides: `standard-development` v1.1. E2E (Playwright) desativado; não há keys. Sem deploy no staging por pedido do usuário.
- Fonte do pedido / responsável: conversa de 05/11/2026 com o usuário (Paulo).
- Revisão do código: alterações ainda sem commit em `feat/mercado-pago-checkout`, sobre `cfa4f30`.

## Objetivo e limites
Fechar os bloqueios de código encontrados na verificação do Mercado Pago, para que o teste real comece quando as keys chegarem.

**Escopo:** webhook, reembolso e chargeback, expiração do link, contratos pendentes, alertas à Exactra e texto dos e-mails internos.

**Não escopo:** tirar a Stripe da tela, adaptar o Playwright, merge, PR, deploy, status `REFUNDED` em `Payment`.

## Requisitos e aceitação
| Requisito | Comportamento | Critério verificável | Verificação prevista |
|---|---|---|---|
| REQ-001 | O webhook não depende da idade do `ts`. | CA-001: dado um webhook assinado com `ts` antigo ou em segundos, quando chega, então é aceito. Assinatura inválida continua em 400. | e2e |
| REQ-002 | Reembolso total e chargeback cancelam o contrato daquele pagamento e alertam a Exactra. | CA-002: dado contrato `ACTIVE` pago por esse pagamento, quando o status é `refunded` ou `charged_back`, então fica `CANCELED` e um alerta é enviado uma vez. | e2e |
| REQ-003 | Reembolso de um pagamento que não ativou o contrato não o cancela. | CA-003: dado contrato pago por outro pagamento, quando este é reembolsado, então continua `ACTIVE` e há alerta. | e2e |
| REQ-004 | Reembolso parcial, disputa e chargeback revertido não mudam o contrato e geram alerta. | CA-004: dado cada caso, quando chega, então o status não muda e há um alerta. | e2e |
| REQ-005 | O link de pagamento vale 3 dias. | CA-005: quando a preferência é criada, então tem `expires`, `expiration_date_to` e `date_of_expiration` a 3 dias, com fuso `-03:00`. | e2e |
| REQ-006 | Pagamento recusado não cancela o contrato. | CA-006: dado `rejected` ou `cancelled`, então o contrato segue pendente e um `approved` posterior o ativa. | e2e |
| REQ-007 | Contrato Mercado Pago pendente é cancelado depois do prazo. | CA-007: dado pendente com mais de 8 dias, quando o job diário roda, então fica `CANCELED`. Com menos dias, ou de outro provedor, não muda. | e2e |
| REQ-008 | A renovação abandonada no Mercado Pago pode ser retomada. | CA-008: dado pendente com menos de 3 dias, quando o cliente renova de novo, então recebe o mesmo contrato e o link da preferência, sem 409 e sem novo contrato. | e2e |
| REQ-009 | Pagamento aprovado que não pode ativar o contrato não se perde. | CA-009: dado valor diferente, contrato inexistente ou contrato já resolvido, quando chega, então responde 200, não muda o contrato e alerta uma vez, mesmo com reenvio. | e2e |
| REQ-010 | E-mails internos não citam o provedor. | CA-010: os avisos de contratação e renovação não contêm "Stripe". | unitário |

## Premissas e questões abertas
Só o teste real confirma:
- o campo `transaction_amount_refunded` e o `status_detail` de reembolso parcial;
- `in_mediation` como status ou como detalhe (a documentação varia; o código aceita os dois);
- os formatos de data aceitos na preferência.

## Decisões e aprovação humana
| Decisão relevante | Impacto/alternativas/rollback | Quem / data / referência | Versão e escopo autorizado |
|---|---|---|---|
| Cancelar só em reembolso total ou chargeback; parcial mantém o contrato e alerta. | Rollback: reverter a alteração, sem migration. | Paulo, 05/11/2026: "sim, pode seguir com essas duas regras". | 1.0 |
| Link de pagamento de 3 dias. | A documentação recomenda pelo menos 3 dias para Pix e boleto. | Paulo, mesma mensagem. | 1.0 |
| Não subir para o staging antes das keys. | Sem merge nem PR. | Paulo, mesma mensagem. | 1.0 |

Escolhas de implementação, dentro do pedido e reversíveis:
- **Recusado não cancela na hora:** o comprador pode tentar de novo no mesmo link, e cancelar faria essa nova tentativa cobrar sem ativar. O cancelamento fica com o job.
- **Prazo de 8 dias no job:** 3 dias de link mais 5 de margem para a compensação do boleto. Depois disso, um pagamento aprovado gera alerta.
- **Retomada do link na renovação:** resolve a trava de 4 dias sem criar outro contrato.
- **Alerta só no Mercado Pago:** a Stripe mantém o erro 400 em caso de divergência.

## Plano e resultados de validação
Executado em 05/11/2026, sobre as alterações sem commit:

| Comando | Resultado |
|---|---|
| `pnpm --filter api test` | Aprovado: 24 unitários e 70 e2e |
| `pnpm --filter emails test` | Aprovado: 13 testes |
| `pnpm --filter api lint` e `pnpm --filter emails lint` | Sem erros |
| `pnpm --filter "api..." build` | Aprovado |

Não executado: Playwright (desativado) e qualquer chamada ao Mercado Pago real (sem keys). Os testes simulam as respostas dele.

## Rastreabilidade final
| Requisito / critério | Código: arquivo/símbolo | Teste/evidência |
|---|---|---|
| REQ-001 | `mercado-pago.provider.ts` `verifyWebhook` | `mercado-pago.e2e-spec.ts` |
| REQ-002, 003, 004 | `mercado-pago.provider.ts` `classify`; `webhook.controller.ts` `review`; `contract-lifecycle.ts` | `mercado-pago.e2e-spec.ts` |
| REQ-005 | `mercado-pago.provider.ts` `createCheckout` | `mercado-pago.e2e-spec.ts` |
| REQ-006 | `mercado-pago.provider.ts` `classify` | `mercado-pago.e2e-spec.ts` |
| REQ-007 | `expiry.job.ts` `run` | `notifications.e2e-spec.ts` |
| REQ-008 | `portal.controller.ts` `renew`; `mercado-pago.provider.ts` `checkoutUrl` | `portal.e2e-spec.ts` |
| REQ-009 | `webhook.controller.ts` `review`; `notifications.ts` `sendPaymentAlert` | `mercado-pago.e2e-spec.ts` |
| REQ-010 | `packages/emails/src/copy.ts` | `emails.test.ts` |

## Auditoria e desvios
Revisão independente: `auto` no workflow, não executada. Sem teste contra o Mercado Pago real.

Limitação aceita: um `Payment` reembolsado continua `PAID`, porque o enum não tem `REFUNDED`. O contrato fica `CANCELED` e a Exactra recebe o alerta.

## Histórico
- 1.0 (05/11/2026): versão inicial.
