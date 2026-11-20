# Spec: teste dos pagamentos do Mercado Pago no staging

- Versão / estado: 1.1 / rodada em 11/11/2026
- Data: 10/11/2026
- Workflow: standard-development v1.1, com E2E autorizado pelo Paulo nesta tarefa
- Relacionada: `docs/specs/mercado-pago-webhook-hardening.md`

## Objetivo

Conferir, com pagamentos de teste de verdade, o que a API faz com cada resultado do Mercado Pago: ativa, mantém pendente, cancela ou avisa a equipe.

## Restrição

O Mercado Pago bloqueia o checkout aberto por navegador automatizado ("Hubo un error accediendo a esta pagina"). O teste não tenta contornar isso: cria o checkout pelo site, mostra o link e espera uma pessoa pagar com o comprador de teste. O resto é automático, pela API do Mercado Pago (credenciais de teste) e pela consulta de status do contrato.

Em 11/11/2026 o Mercado Pago entregou a notificação de um pagamento de teste aprovado, e o contrato ativou 2 segundos depois. O teste também envia cada notificação, assinada com o segredo da aplicação, para não depender do tempo de entrega; a repetida não muda nada. A recusa pode vir antes ou depois da aprovação.

## Requisitos

| ID | Requisito | Critério de aceitação |
|---|---|---|
| REQ-E01 | Só roda com credenciais de teste. | CA: `GET /users/me` sem a tag `test_user` interrompe a rodada. |
| REQ-E02 | Notificação sem assinatura válida é recusada. | CA: assinatura errada ou ausente responde 400. |
| REQ-E03 | Recusa não ativa; nova tentativa no mesmo link ativa. | CA: com pagamento `rejected`, contrato `PENDING_PAYMENT`; com `approved`, `ACTIVE`. |
| REQ-E04 | Parcelado com juros ativa o contrato. | CA: `transaction_amount` igual ao preço e contrato `ACTIVE`. O cartão de teste só oferece 1x; o 12x fica para a compra real antes do lançamento. |
| REQ-E05 | Notificação repetida não aplica de novo. | CA: resposta `{ received: true, duplicate: true }`, contrato segue `ACTIVE`. |
| REQ-E06 | Reembolso parcial mantém o contrato. | CA: após o reembolso de R$ 1, contrato segue `ACTIVE`; alerta registrado para conferência. |
| REQ-E07 | Reembolso total cancela. | CA: pagamento `refunded`, contrato `CANCELED`. |
| REQ-E08 | Pix e boleto gerados não ativam. | CA: pagamento `pending`, contrato `PENDING_PAYMENT`. |

## Resultado em 11/11/2026 (staging, credenciais de teste)

| Requisito | Resultado |
|---|---|
| REQ-E01, REQ-E02 | Passou. |
| REQ-E03 | Passou, com a recusa antes e depois da aprovação. O Mercado Pago entregou a notificação do aprovado e o contrato ativou em 2 segundos. |
| REQ-E04 | Parcial: `transaction_amount` = 3588 e contrato `ACTIVE`, mas o cartão de teste só ofereceu 1x. O 12x fica para a compra real. |
| REQ-E05 | Passou. |
| REQ-E06, REQ-E07 | Passaram, com a devolução feita no painel do vendedor de teste: a API do Mercado Pago recusa reembolso com credenciais de teste ("Unauthorized use of live credentials"). |
| REQ-E08 | Boleto passou (pagamento `pending`, contrato pendente). Pix não aparece no checkout de teste (o vendedor de teste não tem chave Pix): fica para a conta da Exactra. |

## Fora do escopo

Chargeback e disputa (o ambiente de teste não simula), Pix e boleto pagos, expiração do link, cancelamento pelo job e renovação pela área do cliente: seguem no teste manual.

## Histórico

- 1.0 (10/11/2026): versão inicial.
- 1.1 (11/11/2026): reembolso pelo painel do vendedor, recusa em qualquer ordem, resultado da primeira rodada.

## Rastreabilidade

`e2e/mercado-pago/pagamentos.spec.ts`, `e2e/lib/mercado-pago.ts`, `e2e/mercado-pago.config.ts`; instruções em `e2e/README.md`.
