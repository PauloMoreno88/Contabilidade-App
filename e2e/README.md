# Testes de fluxo completo (Playwright)

Percorrem os fluxos de `docs/fluxos.html` no **ambiente de testes publicado** (`https://teste.exactracontabilidade.com.br`), com o Mercado Pago em modo teste. O Mercado Pago bloqueia navegador automatizado: estes fluxos param no link de pagamento, e o pagamento é conferido pela suíte assistida (seção "Pagamentos no Mercado Pago (teste)").

## Preparar

```
pnpm install
pnpm --filter e2e exec playwright install chromium
cp e2e/.env.example e2e/.env   # e preencha os logins da equipe e do cliente de teste
```

O `.env` nunca vai para o Git.

## Rodar

```
pnpm --filter e2e staging                     # todos os fluxos
pnpm --filter e2e staging tests/03-mes.spec.ts   # um fluxo
pnpm --filter e2e report                      # relatório com prints e trace das falhas
pnpm --filter e2e emails                      # e-mails que deveriam ter chegado, por caixa
```

| Arquivo | Fluxo |
|---|---|
| `01-compra` | 1. Da simulação ao primeiro acesso (simulador, checkout até o link do Mercado Pago, painel) |
| `02-cliente-manual` | 2. Cliente que já é da Exactra (cadastro, convite, reenvio) |
| `03-mes` | 3. Rotina do mês: documentos e guias |
| `04-renovacao` | 4. Renovação e fim do contrato (o que dá para conferir sem mexer em datas) |
| `05-acesso` | 5. Entrar, recuperar a senha e segurança |
| `06-site` | 6. Site e conteúdo |
| `07-painel` | 7. Gestão pelo painel da equipe (liga e desliga o 2FA da equipe) |
| `08-empresa` | 8. Dados da empresa pelo cliente |

## O que os testes não fazem

- **Não leem e-mails.** Cada passo que envia e-mail registra o envio em `results/emails.jsonl`; `pnpm --filter e2e emails` mostra a lista para conferir nas caixas.
- **Não clicam em links de e-mail** (ativação, link mágico, redefinir senha). Por isso o fluxo 1 e o 2 param antes de "Cria a senha".
- **Não mexem em datas**: aviso de vencimento, "só consulta", "sem acesso" e lembretes automáticos ficam para o teste manual.
- **Não ligam o 2FA do cliente** (a conta de teste é compartilhada).

## Dados que ficam no ambiente de testes

Cada rodada cria clientes `E2E Compra …` e `E2E Manual …` (e-mails `+e2e-…` da caixa da equipe), um lead, uma guia `DAS E2E …` e arquivos no mês do cliente de teste. O item de checklist criado no fluxo 3 é desligado no fim. Telefone, perfil, lembretes e 2FA voltam ao que eram.

Os testes rodam em série (um navegador por vez): os fluxos usam a mesma conta de cliente e o Better Auth limita logins seguidos.

## Feedback de interface local

`pnpm --filter e2e exec playwright test --config ui-feedback.config.ts` inicia o front na porta 3101 usando somente mocks. Confere loading, atualização de filtros, bloqueio durante ações, cursor, hover e movimento reduzido em 360, 768 e 1280 px. Não usa credenciais nem altera o staging.

## Vídeos da plataforma na landing

`pnpm --filter e2e platform-videos` regrava os 5 vídeos de `apps/web/public/video/plataforma`, em formato de celular e de computador e em velocidade 1.5x, usando o modo mock do front (empresa fictícia, sem dado real). Precisa do ffmpeg com libx264 e do front rodando na porta 3100: os comandos estão no início de `platform-videos.mjs`. Para gravar um fluxo: `pnpm --filter e2e platform-videos guias`. Em um só formato: `pnpm --filter e2e platform-videos desktop guias`.

## Pagamentos no Mercado Pago (teste)

`pnpm --filter e2e mercado-pago` cria checkouts reais no staging com as credenciais de **teste** e confere o que a API faz com cada pagamento. Roda separado dos fluxos, porque precisa de uma pessoa: o Mercado Pago bloqueia navegador automatizado, então o pagamento é feito à mão.

Antes, preencha no `e2e/.env` `E2E_MP_ACCESS_TOKEN` e `E2E_MP_WEBHOOK_SECRET` com as credenciais de teste (as mesmas do Render). O teste para se o token não for de usuário de teste.

O Mercado Pago notifica os pagamentos de teste (conferido em 11/11/2026), mas o teste também envia cada notificação, assinada com o segredo da aplicação, para não depender do tempo de entrega. Notificação repetida não muda nada, e a API sempre lê o pagamento real no Mercado Pago. A entrega pelo Mercado Pago se confere pela simulação do painel (Webhooks, modo de teste): resposta 500 para o id fictício `123456` mostra que a URL e o segredo estão certos.

Durante a rodada, o terminal mostra cada link e o que fazer (também salvo em `results/mercado-pago.txt`). Abra o link numa janela anônima, entre com o **comprador de teste** e siga os passos. O teste espera até 15 minutos por pagamento.

| Cenário | Quem faz o quê | O que o teste confere |
|---|---|---|
| Assinatura inválida | automático | webhook responde 400 |
| Cartão recusado e nova tentativa em 12x | você paga (titular `OTHE`, depois `APRO`) | recusa não ativa; aprovado ativa; `transaction_amount` é o preço sem juros. O cartão de teste só oferece 1x: o 12x fica para o teste com cartão real |
| Notificação repetida | automático | resposta `duplicate`, nada muda |
| Reembolso parcial | você devolve R$ 1 no painel do vendedor de teste (a API recusa reembolso com credenciais de teste) | contrato continua ativo; alerta à equipe |
| Reembolso total | você devolve o restante no painel do vendedor de teste | contrato cancelado; alerta à equipe |
| Pix e boleto gerados | você gera, sem pagar | pagamento `pending`, contrato pendente |

O Pix não aparece no checkout de teste (o vendedor de teste não tem chave Pix); para rodar só o resto: `pnpm --filter e2e mercado-pago -g "assinatura|cartão|repetida|reembolso|boleto"`.

Ficam para o teste manual: chargeback e disputa (o Mercado Pago de teste não simula), Pix ou boleto pagos, expiração do link e cancelamento pelo job (dependem de datas) e a renovação pela área do cliente.
