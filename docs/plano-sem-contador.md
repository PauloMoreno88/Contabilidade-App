# Plano — o que fazer sem depender do contador

> Criado em 08/10/2026 (dia 8 de 20 do roadmap). Complementa `docs/plano.md`.
> Objetivo: usar o tempo enquanto o contador não responde, deixando tudo pronto para que a resposta dele seja só **troca de valores**, sem retrabalho.
> Os percentuais e prazos abaixo são estimativas. Itens marcados **(novo)** são sugestões ainda sem card no Project.

## 1. Premissas e limites

**Depende do contador (fica FORA deste plano):**
- Planos, preços, descontos por período e política de cancelamento (perguntas A1 a A8 de `docs/perguntas-contador.md`).
- Regras do simulador e comparação de regimes (B9 a B15).
- Prazos de atendimento e lista final de documentos (C16, C17).
- Calendário fiscal, NFS-e, landing de abertura de CNPJ, calculadoras e PDF do resultado.
- Com isso, ficam bloqueados: checkout real, deploy com cobrança, testes com pagamento real e o handoff final.

**Regra de ouro:** nenhuma regra fiscal ou preço fictício pode aparecer como real para o público. Hoje o simulador usa `PLACEHOLDER` (`packages/shared/src/simulator.ts`, `plans.config.ts`). Ver decisão D1.

**Pode ser respondido sem o contador:** as seções C (operação) e D (dados institucionais) das perguntas. Mandar separado, já.

## 2. Estado de partida

| Item | Estado |
|---|---|
| Staging | No ar: `https://teste.exactracontabilidade.com.br` e `https://api.teste.exactracontabilidade.com.br`, HTTPS válido |
| Fluxo validado manualmente | Login do admin, checkout com cartão de teste, ativação pelo webhook, e-mails com domínio verificado |
| Ainda não validado | Pix e boleto de ponta a ponta, celular, smoke automatizado |
| Contas | Stripe da Exactra (área restrita de teste). Neon, Resend e Render ainda são pessoais |
| Agentes | Os painéis do Herdr foram perdidos; recriar worktrees em `.worktrees/web` e `.worktrees/api` antes de paralelizar (as branches `feat/web` e `feat/api` estão atrás de `feat/app-v2`) |

## 3. Decisões que destravam o plano

| # | Decisão | Recomendação | Quem decide |
|---|---|---|---|
| D1 | Como lançar sem as regras reais do simulador? | **Modo pré-lançamento:** o diagnóstico coleta perfil e contato **sem mostrar valores de imposto**, entrega "um contador entra em contato" e o botão de pagamento fica desligado (WhatsApp no lugar). Os valores voltam quando o contador validar | Você + Exactra |
| D2 | Apresentar o staging ao cliente já, avisando que preços e regras são fictícios? | Sim. A aprovação do design não depende do contador | Você |
| D3 | O DMARC (`p=none`) entra? Afeta o domínio todo, inclusive o e-mail da UOL | Sim, com aval da Exactra | Exactra |
| D4 | Qual caixa recebe as respostas e avisos em produção? | `contato@exactracontabilidade.com.br` | Exactra |
| D5 | Qual ferramenta de CRM, se houver? | Não bloquear: começar com planilha ou e-mail | Exactra |

## 4. Trilhas de trabalho

Legenda de responsável: **Você**, **Eu** (Claude e agentes). Esforço: P (até meio dia), M (1 a 2 dias), G (3 dias ou mais).

### Trilha A — Validação e qualidade
Objetivo: provar que o que existe funciona de forma repetível.

| # | Tarefa | Quem | Esf. | Card | Aceite |
|---|---|---|---|---|---|
| A1 | Teste de **Pix** de ponta a ponta no staging | Você + Eu | P | #18 | Contrato `ACTIVE` pelo webhook, e-mail enviado, evento registrado |
| A2 | Teste de **boleto**: simular o pagamento no Dashboard da Stripe (há um boleto em `PENDING_PAYMENT`) | Você + Eu | P | #18 | Boleto passa de `PENDING_PAYMENT` para `ACTIVE` só pelo webhook |
| A3 | **Smoke com Playwright** apontando para o staging | Eu | M | #18 | Simulador → lead → checkout → status passa em um comando |
| A4 | **Celular e tablet** (360, 768 e 1280 px): capturas automáticas + conferência no aparelho | Eu + Você | P | #18 | Sem rolagem horizontal, botões acessíveis, formulário legível |
| A5 | **CI no GitHub Actions** (lint, build, testes em cada push e PR) **(novo)** | Eu | P | — | Pipeline verde em `feat/app-v2` |
| A6 | Performance e acessibilidade (Lighthouse) **(novo)** | Eu | P | — | Pontuações registradas e problemas críticos corrigidos |

### Trilha B — Segurança e confiabilidade
| # | Tarefa | Quem | Esf. | Aceite |
|---|---|---|---|---|
| B1 | **Limite de requisições** em `/leads` e `/checkout/sessions` e proteção contra spam **(novo)** | Eu | P | Excesso retorna 429; teste e2e |
| B2 | **Cabeçalhos de segurança** no API e no site **(novo)** | Eu | P | Verificação com ferramenta pública |
| B3 | **Monitoramento:** verificação de disponibilidade de `/health` e captura de erros **(novo)** | Eu + Você | P | Alerta chega ao e-mail da equipe |
| B4 | **Backups do Neon** e plano de recuperação testado **(novo)** | Você + Eu | P | Restauração testada em branch separada |
| B5 | **LGPD técnica:** política de retenção e processo de exclusão de dados a pedido **(novo)** | Eu | M | Procedimento documentado e rotina testada |
| B6 | Revisar dependências vulneráveis **(novo)** | Eu | P | Auditoria sem itens críticos |

### Trilha C — Captação
| # | Tarefa | Quem | Esf. | Card | Aceite |
|---|---|---|---|---|---|
| C1 | **Formulário de contato** com envio pelo Resend (`POST /contact`), limite de envios e anti-spam | Eu | M | #55 | Mensagem chega à caixa da equipe; sem spam em teste |
| C2 | **Medição de conversão** (GA4, Meta Pixel, Google Ads) + banner de cookies | Eu | M | #46 | Evento de lead e de pagamento confirmado (pelo servidor) aparecem nas ferramentas |
| C3 | **WhatsApp com contexto** (mensagem já com plano/resultado) | Eu | P | #44 | Número real configurado em arquivo de configuração |
| C4 | **SEO técnico** (metatags, imagem de compartilhamento, sitemap de produção) **(novo)** | Eu | P | — | Pré-visualização correta ao compartilhar |
| C5 | **Landing por segmento** (estrutura, sem afirmação fiscal) | Eu | M | #41 | Uma landing modelo reaproveitável com UTM |

### Trilha D — Operação e produção
| # | Tarefa | Quem | Esf. | Card | Aceite |
|---|---|---|---|---|---|
| D1 | **Migrar contas** (Neon, Resend, Render) para a Exactra, com e-mail de grupo e 2FA | Você | M | #25 | Staging rodando nas contas novas; contas pessoais encerradas |
| D2 | **Ativar a conta Stripe** para cobrança real (dados do CNPJ, responsável, banco) | Você | M | #22 | Conta ativa; **chaves live ainda não usadas** |
| D3 | **Variáveis de produção** (segredos novos, nenhum reaproveitado) | Você + Eu | P | #26 | Checklist do card completa |
| D4 | **Blueprint de produção** pronto e testado, sem ligar o tráfego | Eu | M | #19 | Serviços de produção sobem em ambiente vazio |
| D5 | **Domínios definitivos** (`www` e `api`) planejados. **Não alterar o `www` atual antes da virada** | Você + Eu | P | #19 | Plano de virada com reversão escrito |
| D6 | **DMARC** `p=none` | Você | P | #55 | Registro publicado e verificado |
| D7 | **Guia do painel** para a equipe e roteiro de entrega | Eu | M | #20 | Documento e gravação curta de uso |

### Trilha E — Cliente
| # | Tarefa | Quem | Aceite |
|---|---|---|---|
| E1 | **Apresentar o staging** com aviso de que preços e regras são fictícios | Você | Lista de ajustes pedidos pelo cliente |
| E2 | **Aprovação do design** por escrito | Você | Registro da aprovação |
| E3 | **Enviar já as seções C e D** das perguntas à Exactra (WhatsApp, horário, razão social, CNPJ, CRC, endereço, política de privacidade) | Você | Dados no arquivo de configuração do site |
| E4 | Refatorar telas conforme o feedback | Eu | Ajustes entregues em `feat/app-v2` |

### Trilha F — Primeira onda de automações (cabe antes do lançamento só se sobrar tempo)
Todas já têm card no Backlog.

| # | Tarefa | Card | Esf. |
|---|---|---|---|
| F1 | Aviso interno em tempo real de lead e contratação | #33 | P |
| F2 | Cobrança recusada no cartão (e-mail + alerta no painel) | #32 | P |
| F3 | Lembretes de renovação de Pix e boleto com link de um clique | #31 | M |
| F4 | Recuperação de checkout abandonado | #30 | P |
| F5 | Follow-up de leads (D+1, D+3, D+7) | #29 | M |
| F6 | Resumo semanal para os sócios | #34 | P |

Ordem sugerida: F1, F2, F3, F4, F5, F6 (receita direta primeiro, depois conversão).

## 5. Cronograma proposto

| Janela | Foco | Entregas |
|---|---|---|
| **08 a 10/10** | Validação e cliente | A1, A2, A3, A4, E1, E3, D6; recriar worktrees |
| **11 a 13/10** | Segurança e captação | A5, B1, B2, B3, C1, C3; D3 e D4 (início) |
| **14 a 16/10** | Medição, backup e contas | C2, C4, B4, B5, D1, D2, D7 |
| **17 a 19/10** | Fechamento do pré-lançamento | E4, A6, B6, F1 e F2; revisão final; plano de virada (D5) |
| **20/10** | Marco do roadmap | Pré-lançamento no ar **somente se D1 estiver decidido e o cliente tiver aprovado (E2)** |

Se a aprovação do cliente ou a migração de contas atrasar, o corte é: F3 a F6, depois C5, depois A6. **Não cortar:** A1 a A4, B1, B2, C1, D1 a D3.

## 6. Dependências que NÃO são do contador

| Dependência | Bloqueia | Responsável |
|---|---|---|
| E-mail de grupo da Exactra para as contas | D1 | Exactra |
| Número de WhatsApp e horário | C3 | Exactra |
| Aprovação do design | Pré-lançamento (20/10) | Cliente |
| Ativação da conta Stripe (verificação da Stripe) | D2 e qualquer cobrança real | Você + Stripe |
| Aval para o DMARC | D6 | Exactra |
| Janela para trocar o `www` | D5 | Você + Exactra |

## 7. Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| Publicar o simulador com regras fictícias | Estimativa fiscal falsa ao público | Decisão D1: pré-lançamento sem valores |
| DNS da UOL instável com CNAME | Certificados demoram ou falham | Usar registros A; ao mexer no `www`, medir antes e depois |
| Trocar o `www` com o site atual no ar | Site fora do ar | Plano de reversão e janela combinada |
| Contas pessoais continuarem em produção | Perda de acesso, dados do cliente fora da empresa | D1 antes da virada |
| Agentes perdidos (Herdr reiniciado) | Menos paralelismo | Recriar worktrees e fazer merge de `feat/app-v2` nelas |

## 8. O que muda quando o contador responder
Só entram **valores**, sem refatorar:
- `packages/shared/src/plans.config.ts`: preços e descontos.
- `packages/shared/src/simulator.ts` e `RULES_VERSION`: regras reais.
- `packages/emails` e `apps/web/src/config`: prazos e lista de documentos.
- Ligar `CHECKOUT_ENABLED` e `NEXT_PUBLIC_CHECKOUT_ENABLED`, trocar para chaves live e criar o webhook de produção.
- Mostrar os valores no diagnóstico (fim do modo pré-lançamento), seguido de testes com pagamento real e do handoff final.

## 9. Próximos passos imediatos
1. Você: enviar as seções **C e D** à Exactra e a seção **A e B** ao contador (mensagens separadas).
2. Você: decidir D1, D2 e D3 e combinar a apresentação do staging.
3. Eu: abrir no Project os cards **(novo)** com a label `tecnico`, recriar as worktrees e começar por A3, A5, B1 e C1.
4. Você: simular o pagamento do boleto no Dashboard da Stripe para fecharmos A1 e A2.
