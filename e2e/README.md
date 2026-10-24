# Testes de fluxo completo (Playwright)

Percorrem os fluxos de `docs/fluxos.html` no **ambiente de testes publicado** (`https://teste.exactracontabilidade.com.br`), com a Stripe em modo teste.

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
| `01-compra` | 1. Da simulação ao primeiro acesso (simulador, checkout, Stripe, painel) |
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
