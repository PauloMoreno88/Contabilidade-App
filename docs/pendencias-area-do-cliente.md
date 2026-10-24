# Pendências da área do cliente

Trabalho feito em 23/10/2026 (decisões 24–30 do `docs/plano.md`). O código está pronto e testado (e2e do API com banco em memória, front com mocks); falta o que depende de contas externas, de respostas da Exactra e de um teste com tudo ligado.

## 1. Você (contas e configuração)

- [x] **Cloudflare R2 (staging)**: feito em 23/10/2026 (bucket `exactra-arquivos-staging`, Account API token, CORS e variáveis no Render). Falta o bucket de produção.
  - Criar um token de API com permissão **Object Read & Write só nesse bucket** e anotar: Account ID, Access Key ID e Secret Access Key.
  - Em *Settings → CORS policy* do bucket, liberar o site:
    ```json
    [{ "AllowedOrigins": ["https://teste.exactracontabilidade.com.br"], "AllowedMethods": ["PUT", "GET", "HEAD"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
    ```
  - No Render (serviço da API), preencher `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET` (já estão no `render.yaml`). Sem elas, a área funciona, mas envio e download de arquivos respondem "indisponível".
  - Produção: outro bucket, com o domínio `https://www.exactracontabilidade.com.br` no CORS.
- [ ] **Migration**: o deploy do Render roda `prisma migrate deploy` sozinho. Para o Neon de dev local: `pnpm --filter api db:deploy`. A migration `20261023000000_customer_area` é aditiva e já cria 5 itens de exemplo no checklist.
- [ ] **Resend**: os e-mails novos usam o mesmo `EMAIL_FROM`. Com o domínio ainda em modo teste, só o dono da conta recebe.
- [ ] **GitHub Project**: para eu colocar as issues no Project, rode `! gh auth refresh -s project` (o token atual não tem essa permissão). As issues novas são #61 (certificado digital) e #62 (perguntas ao contador).

## 2. Exactra / contador (issue #62)

- [ ] Lista real de documentos por tipo de empresa (hoje são exemplos, editáveis em `/admin/checklist`).
- [ ] Prazo dos documentos (hoje: dia 10 do mês seguinte, `PORTAL_RULES.documentsDueDay`).
- [ ] Motivos de recusa (hoje: 5 motivos de exemplo, `REJECTION_REASONS`).
- [ ] Quais guias publicam e qual sistema contábil usam (define se vale fazer o upload em lote).
- [ ] Confirmar os prazos: renovação abre 60 dias antes, 90 dias de consulta depois do fim.
- [ ] Confirmar que a Exactra guarda os arquivos no sistema dela (a área do cliente apaga depois de 1 ano).
- [ ] Revisar os textos da área do cliente (`apps/web/src/config/portal.ts`) e dos e-mails (`packages/emails/src/copy.ts`).
- [ ] Termos de uso: acrescentar a área do cliente (retenção de 1 ano, o portal não é arquivo fiscal oficial, responsabilidade pelo pagamento das guias).

## 3. Testes que faltam (com tudo ligado)

- [ ] No staging com R2: contratar com Pix de teste → e-mail de boas-vindas com "Ativar meu acesso" → criar senha → primeiro acesso → enviar um documento pelo celular (inclusive foto).
- [ ] Publicar uma guia real (PDF de um DAS de verdade) e conferir a leitura: linha digitável, valor, vencimento e CNPJ. **Importante:** o leitor foi testado com PDFs gerados no teste; um DAS real pode ter a linha quebrada de outro jeito.
- [ ] Copiar a linha digitável no celular e colar no app do banco.
- [ ] Renovação pelo `/app/plano` com Stripe de teste.
- [ ] Link mágico de ponta a ponta (o domínio do site precisa estar em `WEB_ORIGIN`).
- [ ] Cookies entre `www.` e `api.`: o ZIP ("Baixar tudo") abre como link direto para a API e depende do cookie da sessão.

## 4. Para depois (fora da v1, combinados na conversa)

- Upload de guias em lote, casando cada PDF com o cliente pelo CNPJ.
- Importação de clientes por planilha (hoje: cadastro manual um por um em `/admin/clientes/novo`).
- WhatsApp automático (API oficial da Meta).
- Certificado digital e senhas (issue #61).
- Seletor de empresa para quem tem vários CNPJs (o banco já suporta).
- Convidar outros usuários da mesma empresa pela própria área do cliente.
- Job diário roda dentro da API (uma instância). Se a API escalar, mover para um Cron Job do Render.

## Como testar localmente agora

- Só o front, sem API: `NEXT_PUBLIC_USE_MOCK=true pnpm --filter web dev` e entrar em `/entrar` com `cliente@exactra.com.br` ou `admin@exactra.com.br`, senha `exactra123`. Convite de teste: `/entrar/ativar?token=convite-teste`.
- Com a API: sem `R2_*` no `.env`, os arquivos vão para `apps/api/.storage` e a própria API serve os links assinados.
