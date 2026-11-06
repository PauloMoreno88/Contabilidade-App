# Spec — Seção da plataforma na landing

## Identificação
- Versão / estado: 1.2 / implementada
- Workflow e versão / overrides: `standard-development` v1.1. E2E desativado (padrão). Vai para o staging via `feat/app-v2`, por pedido do usuário.
- Fonte do pedido / responsável: conversa de 06/11/2026 com o usuário (Paulo).
- Revisão do código: branch `feat/platform-section`, a partir de `origin/feat/app-v2` (`fc91388`). Vai para o staging por PR.

## Objetivo e limites
Mostrar a quem visita a landing o que o cliente ganha usando a plataforma, com vídeos reais da área do cliente.

**Escopo:** nova seção na landing, 5 vídeos sem som em loop com setas, script que regrava os vídeos.

**Não escopo:** mudar a área do cliente, gravar a tela "Meu plano" (mostra preço PLACEHOLDER), levar o Mercado Pago junto.

## Requisitos e aceitação
| Requisito | Comportamento | Critério verificável | Verificação prevista |
|---|---|---|---|
| REQ-001 | A landing tem uma seção própria da plataforma. | CA-001: ao abrir `/`, `#plataforma` aparece depois de Serviços e o menu leva até ela. | Playwright local |
| REQ-002 | A seção apresenta 5 fluxos com benefício para o cliente. | CA-002: a configuração tem 5 fluxos, cada um com título, texto, vídeo e imagem existentes em `public/`. | unitário |
| REQ-003 | O vídeo roda sem som e em loop quando a seção está visível. | CA-003: com a seção na tela, o vídeo está `muted`, `loop` e tocando; fora da tela, pausado. | Playwright local |
| REQ-004 | Setas avançam e voltam entre os fluxos, dando a volta nas pontas. | CA-004: seta seguinte troca o vídeo e o texto; voltar no 1º leva ao 5º e avançar no 5º leva ao 1º. | Playwright local |
| REQ-005 | Quem prefere menos movimento não recebe vídeo automático, e todos podem pausar. | CA-005: com `prefers-reduced-motion`, o vídeo começa parado com a imagem; o botão de pausa alterna o estado. | Playwright local |
| REQ-006 | Funciona no celular, sem rolagem horizontal. | CA-006: em 360 px, a seção cabe na largura e as setas têm pelo menos 44 px. | Playwright local |
| REQ-007 | Os vídeos não pesam no carregamento da página. | CA-007: nenhum `.mp4` é baixado antes de a seção entrar na tela. | Playwright local |
| REQ-008 | Os vídeos podem ser regravados sem dado real. | CA-008: `pnpm --filter e2e platform-videos` regrava os 5 usando o mock do front. | Execução do script |
| REQ-009 | O menu do site cabe em qualquer largura e leva até a seção. | CA-009: de 320 a 1280 px, sem rolagem horizontal e com o botão do menu dentro da tela; em 390 e 768 px, o menu leva a `#plataforma`. | Playwright local |
| REQ-010 | Setas, título do fluxo e vídeo ficam visíveis juntos. | CA-010: de 1280x720 a 1440x900, o vídeo cabe inteiro e as setas estão na tela ao chegar na seção; em 360x740, ao tocar na seta, o título novo e parte do vídeo seguem visíveis. | Playwright local |

## Premissas e questões abertas
- Os vídeos usam o modo mock e a empresa fictícia "Estúdio Marina Costa". Não há dado real.
- Valores e datas das guias são fictícios. Quando telas ou textos mudarem, regravar com o script.
- Precisa de confirmação do usuário: o texto "Em breve, também pela plataforma" (bloco de Atendimento) contradiz a nova seção. Não foi alterado.
- Não verificado: reprodução em iPhone/Safari real e no Render. Conferir no staging.

## Decisões e aprovação humana
| Decisão relevante | Impacto/alternativas/rollback | Quem / data / referência | Versão e escopo autorizado |
|---|---|---|---|
| Seção com vídeos em loop e setas | Pedido do usuário. Rollback: retirar `<Platform />` da página. | Paulo, 06/11/2026, pedido na conversa | 1.0, landing |
| Escolha dos 5 fluxos | Delegada ao agente: primeiro acesso, início, documentos, guia e histórico. Trocar um fluxo exige ajustar o script e a configuração. | Paulo, 06/11/2026, pedido na conversa | 1.0, landing |

## Detalhamento proporcional
Vídeos em formato de celular: uma única versão fica legível em qualquer tela, porque uma gravação de desktop reduzida a um celular ficaria ilegível. H.264 em MP4 para funcionar no iPhone. Botão de pausa acrescentado por acessibilidade (WCAG 2.2.2).

## Plano e resultados de validação
`pnpm --filter web lint`: sem erros. `pnpm --filter web test`: 20 testes passaram. `pnpm --filter web build` (staging): passou, com os 10 arquivos em `out/video/plataforma`. Verificação no navegador feita com script Playwright avulso em Chromium, contra o front no modo mock, sem entrar na suíte. Suíte E2E: não executada (desativada). Safari/iPhone: não testado.

## Rastreabilidade final
| Requisito / critério | Código: arquivo/símbolo | Teste/evidência | Resultado |
|---|---|---|---|
| REQ-001 / CA-001 | `app/page.tsx`, `nav.links` em `config/site.ts` | Script Playwright: ordem das seções e clique no menu | Passou |
| REQ-002 / CA-002 | `platformTour` em `config/site.ts` | `config/site.test.ts` | Passou |
| REQ-003 / CA-003 | `Platform.tsx` | Script Playwright: `muted`, `loop`, `currentTime`, pausa fora da tela | Passou |
| REQ-004 / CA-004 | `Platform.tsx` | Script Playwright: setas e voltas 1→5 e 5→1 | Passou |
| REQ-005 / CA-005 | `Platform.tsx` | Script Playwright: `reducedMotion` e botão de pausa | Passou |
| REQ-006 / CA-006 | `Platform.tsx` | Script Playwright: 360 e 390 px; setas de 44x44 | Passou |
| REQ-007 / CA-007 | `Platform.tsx` (`preload="none"`) | Script Playwright: nenhuma requisição `.mp4` antes da seção | Passou |
| REQ-008 / CA-008 | `e2e/platform-videos.mjs` | Execução real gerou os 5 vídeos; quadros revisados | Passou |
| REQ-009 / CA-009 | `Header.tsx` | Script Playwright: 320 a 1280 px; menu em 390 e 768 px | Passou |
| REQ-010 / CA-010 | `Platform.tsx` | Script Playwright: 1280x720, 1366x768, 1280x800, 1440x900, 1024x768 e 360x740. Em 768x1024 faltam 30 px do vídeo ao chegar; setas e título visíveis | Passou |

## Auditoria e desvios
Revisão independente `auto`: não exigida para esta mudança, que só altera a landing e não toca em dados ou pagamentos.

## Histórico
- 1.0, 06/11/2026: versão inicial.
- 1.2, 06/11/2026: revisão com a skill `frontend-design`, pedida pelo usuário. A primeira passada reprovou: setas abaixo da dobra no notebook e título fora da tela ao trocar de fluxo no celular. As setas foram para junto do texto e o celular passou a acompanhar a altura da tela. A etiqueta "Plataforma" acima do título foi mantida por ser o padrão das seções do site.
- 1.1, 06/11/2026: inclui REQ-009. O link novo estourava o menu entre 768 e 996 px, e abaixo de ~400 px o botão do menu já ficava fora da tela antes desta mudança. Alteração pequena, necessária para o menu chegar à seção; a confirmar com o usuário no relatório.
