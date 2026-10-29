# Histórico de e-mails aos clientes

Em `/admin/emails`, o admin escreve a mensagem e escolhe os clientes (todos marcados por padrão). Ao iniciar, a API grava o envio e uma cópia do nome e e-mail de cada destinatário. O resultado leva ao registro; o link **Histórico de envios** permite consultar envios anteriores, com data, assunto e admin responsável. No detalhe, **Atualizar status** busca as confirmações mais recentes.

Os registros ficam restritos a admins, inclusive nos endpoints. Alterar ou excluir um cliente não muda os destinatários históricos. O histórico começa com esta implementação; os envios anteriores não possuem dados para preenchê-lo retroativamente.

| Status | Significado |
|---|---|
| Pendente | Ainda não enviado, envio interrompido ou entrega temporariamente adiada. Sem chave Resend no ambiente local, apenas registra/loga e permanece pendente. |
| Enviado | Resend aceitou o e-mail. |
| Entregue | O servidor do destinatário confirmou o recebimento. Não confirma leitura nem chegada à caixa principal. |
| Falhou | Erro no envio ou rejeição definitiva pelo provedor/servidor. |

## Configuração no Resend e no Render

1. Aplicar as migrations da API no deploy (inclui `20261029000000_email_history`).
2. No painel do Resend, criar um webhook para `https://api.exactracontabilidade.com.br/webhooks/resend` (usar a URL da API de staging para os testes de staging).
3. Selecionar `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced` e `email.suppressed`.
4. Copiar o signing secret para `RESEND_WEBHOOK_SECRET` no serviço da API e publicar a configuração. Não colocar o segredo no Git. `RESEND_API_KEY` e `EMAIL_FROM` continuam necessários para envios reais.
5. Enviar uma mensagem de teste para um destinatário autorizado e conferir a atualização no registro.

A API verifica a assinatura do corpo original usando o SDK do Resend. Uma tag com o ID do destinatário associa os eventos mesmo quando eles chegam antes da resposta do envio. Eventos repetidos e eventos atrasados não desfazem a confirmação de entrega. Uma rejeição definitiva posterior pode mudar **Entregue** para **Falhou**. Sem configurar o webhook, um e-mail aceito permanece **Enviado** até haver confirmação.

O limite continua em 1.000 clientes por envio, com processamento síncrono. Não há fila de retomada: uma interrupção pode deixar destinatários pendentes. Consultar o histórico e o provedor antes de reenviar. A gravação inicial e cada atualização são persistidas separadamente; uma falha no banco interrompe o envio e mantém os registros já gravados.

Referências: [verificação de assinatura](https://resend.com/docs/webhooks/verify-webhooks-requests) e [eventos de e-mail](https://resend.com/docs/webhooks/event-types).
