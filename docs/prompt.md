# CONTEXTO DO PROJETO — EXACTRA CONTABILIDADE

## 1. Visão geral

Estamos redesenhando e evoluindo o site da Exactra Contabilidade.

Site atual:
https://www.exactracontabilidade.com.br/

Repositório:
https://github.com/PauloMoreno88/Contabilidade-App

Referência visual / comercial:
https://visibilidadedigital.com.br/studiofiscal/

IMPORTANTE:
A referência da Studio Fiscal deve ser usada como inspiração de estrutura, dinâmica, experiência e conversão.

NÃO copiar o site.
NÃO copiar textos.
NÃO utilizar a paleta de cores da Studio Fiscal.

A identidade visual e a paleta da Exactra devem ser preservadas e modernizadas.

Antes de trabalhar:
1. Analise o repositório atual.
2. Identifique cores, logo, fontes, assets e conteúdo existente.
3. Analise a estrutura atual antes de substituir qualquer coisa.
4. Use o site atual como fonte da identidade da marca.


# 2. Contexto comercial

O projeto foi contratado para deixar de ser apenas um site institucional e passar a funcionar também como um FUNIL DE AQUISIÇÃO.

Pretendemos futuramente rodar tráfego pago direcionando pessoas para o site.

Portanto, o objetivo principal não é simplesmente "ficar bonito".

O site precisa:

- prender atenção;
- explicar rapidamente o valor da empresa;
- gerar confiança;
- fazer o visitante interagir;
- demonstrar valor antes de pedir uma compra;
- apresentar os planos;
- reduzir objeções;
- levar o usuário à contratação.


# 3. Escopo final do projeto

O sistema final deverá possuir:

## Front-end

- Landing page / página principal;
- apresentação da Exactra;
- serviços;
- benefícios;
- planos de contabilidade;
- simulador interativo;
- checkout de assinatura recorrente;
- página de confirmação após pagamento;
- botão de WhatsApp;
- área explicando os próximos passos após contratação;
- tutorial sobre documentos necessários;
- layout totalmente responsivo.

## Backend

O projeto final também terá backend.

Responsabilidades futuras:

- integração com Stripe ou Mercado Pago;
- assinatura recorrente;
- recebimento de webhooks;
- confirmação de pagamentos;
- identificação de:
  - pagamento aprovado;
  - pagamento recusado;
  - assinatura ativa;
  - cancelamento;
  - inadimplência;
- persistência das informações do cliente;
- persistência da contratação;
- envio automático de e-mails;
- aviso para a Exactra sobre novas contratações;
- e-mail de boas-vindas para o cliente;
- possibilidade de evoluir posteriormente para painel administrativo.

IMPORTANTE:

Dados sensíveis de cartão NÃO deverão ser armazenados pela aplicação.

O provedor de pagamento será responsável pelos dados financeiros sensíveis.


# 4. TECNOLOGIA ATUAL

O repositório existente utiliza:

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lucide React

O projeto atual já está publicado no Render.

Não tomar decisões sobre troca de stack agora.

Primeiro compreender o projeto existente.


# 5. OBJETIVO DE HOJE

HOJE NÃO VAMOS IMPLEMENTAR O SISTEMA FINAL.

A tarefa atual é criar um PROTÓTIPO VISUAL INTERATIVO.

Quero um arquivo HTML que seja possível abrir diretamente no navegador e apresentar ao cliente.

Pode conter:

- HTML
- CSS
- JavaScript vanilla

Tudo pode ficar no mesmo arquivo para facilitar a demonstração.

Exemplo:

prototype.html

Não precisamos nesta etapa de:

- API real;
- banco de dados;
- Stripe real;
- Mercado Pago real;
- autenticação;
- envio real de e-mail;
- backend.

As funcionalidades deverão ser SIMULADAS visualmente.

A ideia é que o cliente consiga navegar pelo protótipo e imaginar o produto final.


# 6. DIREÇÃO DO REDESIGN

O site atual é simples e institucional.

Queremos uma evolução significativa.

O novo site deve parecer:

- moderno;
- tecnológico;
- confiável;
- contábil sem parecer antiquado;
- profissional;
- leve;
- premium;
- focado em conversão.

Evitar estética genérica de escritório de contabilidade.

Evitar excesso de:

- prédios;
- calculadoras;
- gráficos genéricos;
- homens de terno apertando mãos;
- fotos stock corporativas clichês.

Preservar a personalidade visual da Exactra.


# 7. PRINCIPAL REFERÊNCIA

Referência:

https://visibilidadedigital.com.br/studiofiscal/

Não quero reproduzir o design.

Quero observar principalmente:

- hierarquia das informações;
- tamanho das chamadas;
- blocos bem definidos;
- CTAs;
- interação;
- sensação de autoridade;
- calculadora / ferramenta interativa;
- construção de um funil.

Um elemento especialmente importante da referência é a ferramenta:

"Estime, com valores reais..."

Ela pede informações do visitante antes de entregar um resultado.

O cliente da Exactra gostou MUITO dessa dinâmica.

Queremos algo equivalente, MAS QUE FAÇA SENTIDO PARA UMA CONTABILIDADE.


# 8. A PRINCIPAL INTERAÇÃO DO SITE

Não quero apenas uma calculadora comum com:

[ salário ]
[ calcular ]

Quero uma experiência em etapas, quase como um pequeno jogo/quiz.

Nome provisório:

"Descubra o custo do seu CNPJ"

ou

"Quanto vai sobrar no seu bolso como PJ?"

ou

"Descubra sua realidade tributária em menos de 1 minuto"

A copy definitiva poderá ser ajustada depois.

# 8.1. CONCEITO CENTRAL DO FUNIL

O simulador não deve ser apresentado como uma simples "calculadora tributária".

A intenção é criar um MINI DIAGNÓSTICO INTERATIVO que gere curiosidade e faça o visitante sentir que está recebendo uma resposta personalizada.

A experiência desejada é:

"Vou responder 4 ou 5 perguntas e descobrir quanto custa ter meu CNPJ e qual plano faz mais sentido para mim."

Fluxo principal do funil:

ANÚNCIO
→ LANDING PAGE
→ QUIZ / MINI DIAGNÓSTICO
→ RESULTADO PERSONALIZADO
→ PLANO RECOMENDADO
→ CHECKOUT
→ PAGAMENTO
→ ONBOARDING

Esse fluxo é uma das ideias centrais do projeto.

Evitar chamar a ferramenta apenas de:

"Calculadora Tributária"

Preferir uma comunicação mais comercial e fácil de entender.

Exemplo de headline:

"Quanto do que você fatura realmente fica no seu bolso?"

Subheadline:

"Responda algumas perguntas e veja uma estimativa em menos de 1 minuto."

CTA:

"Fazer simulação grátis"

O resultado deve entregar valor antes de pedir a contratação.

Depois do resultado, conectar naturalmente com os planos:

"Com base no seu perfil, este é o plano que mais combina com o seu momento."

[ VER PLANO RECOMENDADO ]

A ferramenta deve funcionar como parte do funil de vendas, e não apenas como uma calculadora isolada.


## Fluxo sugerido

Criar um card grande e visual.

### Etapa 1

"Qual é o seu perfil?"

Opções visualmente clicáveis:

- Prestador de serviços
- Profissional liberal
- Comércio
- Empresa
- Estou abrindo meu primeiro CNPJ


### Etapa 2

"Quanto você pretende faturar por mês?"

Usar:

- slider;
ou
- opções clicáveis;
ou
- input monetário.

Exemplo:

R$ 5 mil
R$ 10 mil
R$ 15 mil
R$ 20 mil
R$ 30 mil
R$ 50 mil+


### Etapa 3

"Você já possui CNPJ?"

- Sim
- Não


### Etapa 4

"Possui funcionários?"

- Nenhum
- 1 a 3
- 4 a 10
- Mais de 10


### Etapa 5

"Hoje você trabalha como..."

Dependendo do público:

- CLT
- Autônomo
- MEI
- Simples Nacional
- Lucro Presumido
- Não sei


# 9. RESULTADO DO SIMULADOR

Ao terminar, fazer uma pequena animação de processamento.

Exemplo:

"Analisando seu perfil..."

Depois apresentar um resultado visualmente forte.

Exemplo:

---------------------------------

Seu cenário estimado

Faturamento:
R$ 15.000/mês

Regime sugerido para simulação:
Simples Nacional

Tributos estimados:
R$ X a R$ Y/mês

Valor aproximado após tributos:
R$ XXXX

---------------------------------

IMPORTANTE:

NESTE PROTÓTIPO os cálculos podem ser simulados.

Não criar regras fiscais reais sem que tenham sido fornecidas e validadas pelo contador.

Deixar a implementação preparada conceitualmente para posteriormente receber as regras reais.

Pode existir uma pequena mensagem:

"Esta é uma estimativa. O enquadramento tributário definitivo depende da análise do contador."


# 10. CONVERSÃO APÓS O RESULTADO

Esta é uma parte MUITO importante.

O simulador não existe somente para informar.

Ele faz parte do funil.

Depois do resultado mostrar algo como:

"Quer cuidar disso sem dor de cabeça?"

ou

"Encontramos um cenário compatível com o seu perfil."

E apresentar CTA:

[ Ver plano recomendado ]

O botão leva até a área de planos.


# 11. PLANOS

Criar uma seção visualmente muito boa para contratação.

Por enquanto podemos utilizar valores fictícios ou placeholders até os valores definitivos serem enviados.

Exemplo:

ESSENCIAL
Para quem está começando

PROFISSIONAL
Mais escolhido

EMPRESARIAL
Para operações maiores

Cada card deve mostrar:

- valor mensal;
- principais recursos;
- para quem é;
- CTA "Contratar".

Um dos planos pode receber destaque visual como:

"Mais escolhido"


# 12. CHECKOUT NO PROTÓTIPO

Ao clicar em "Contratar":

NÃO abrir Stripe real.

Simular um checkout.

Pode ser:

- modal;
ou
- seção;
ou
- página simulada dentro do HTML.

Mostrar:

Plano escolhido
Valor mensal
Nome
E-mail
Telefone
CPF/CNPJ

Botão:

"Continuar para pagamento"

Após clicar, simular:

"Pagamento aprovado"

E então mostrar:

"Bem-vindo à Exactra!"

"Recebemos sua contratação."

CTAs:

[ Falar agora pelo WhatsApp ]

[ Ver próximos passos ]


# 13. PRÓXIMOS PASSOS / ONBOARDING

Criar uma seção demonstrativa:

"Contratei. E agora?"

Apresentar algo semelhante a uma timeline.

Exemplo:

1. Contrate seu plano

2. Receba nosso contato

3. Envie seus documentos

4. Nossa equipe analisa suas informações

5. Sua contabilidade começa


Também criar uma seção:

"Documentos que normalmente solicitamos"

Exemplo visual:

- Documento pessoal;
- comprovante;
- dados da empresa;
- certificado digital;
- documentos específicos dependendo do serviço.

Não assumir ainda que essa lista é definitiva.

Pode utilizar placeholders claramente editáveis.


# 14. ESTRUTURA SUGERIDA DA HOME

Criar inicialmente uma landing page longa.

Ordem sugerida:

1. HEADER

Logo Exactra

Links:
- Início
- Serviços
- Simulador
- Planos
- Como funciona
- Contato

CTA destacado:
"Quero contratar"


2. HERO

Headline forte.

Evitar:

"Contabilidade com precisão e agilidade"

porque é genérico.

Criar algo com benefício mais direto.

Exemplo conceitual:

"Contabilidade simples para quem quer cuidar do negócio, não da burocracia."

Subheadline explicando a Exactra.

CTAs:

[ Descobrir quanto vou pagar ]

[ Conhecer planos ]


3. PROVA / BENEFÍCIOS

3 ou 4 benefícios rápidos.

Exemplo:

Atendimento próximo
Contabilidade digital
Menos burocracia
Suporte especializado


4. SIMULADOR

Este deve ser um dos elementos VISUAIS PRINCIPAIS da página.


5. SERVIÇOS


6. "COMO FUNCIONA"

Passo a passo simples.


7. PLANOS


8. POR QUE A EXACTRA


9. FAQ

Exemplos:

"Preciso já ter CNPJ?"

"Posso trocar de contador?"

"Como envio meus documentos?"

"Como funciona a mensalidade?"

"Posso cancelar?"


10. CTA FINAL

Algo forte antes do footer.


11. FOOTER

Dados atuais da empresa.
WhatsApp.
Contato.
Localização.
Política de privacidade.
Termos.


# 15. TRAFEGO PAGO

Lembrar constantemente que pessoas poderão chegar aqui através de anúncios.

Isso significa que:

O visitante pode:

- nunca ter ouvido falar da Exactra;
- não saber nada sobre contabilidade;
- estar comparando preços;
- ter medo de abrir CNPJ;
- achar contabilidade complicada;
- estar procurando economia;
- querer resolver tudo rapidamente.

A landing page precisa responder rapidamente:

1. Onde estou?
2. O que vocês fazem?
3. Isso serve para mim?
4. Quanto custa?
5. Posso confiar?
6. Como funciona?
7. Como contrato?


# 16. UX

Priorizar:

- mobile first;
- leitura rápida;
- scroll agradável;
- feedback visual;
- microinterações;
- hover;
- animações discretas;
- progresso no simulador;
- cards clicáveis;
- números grandes;
- CTAs claros.

O simulador deve mostrar progresso.

Exemplo:

Passo 2 de 5

[████████░░░░]


# 17. DESIGN

Utilizar a identidade existente da Exactra.

Primeiro extrair a paleta atual do código/assets.

Pode criar:

- variações mais claras/escuras;
- transparências;
- gradientes discretos;
- backgrounds neutros.

Mas não substituir a identidade principal.

Usar bastante:

- whitespace;
- cards;
- border-radius;
- hierarquia tipográfica;
- sombras extremamente sutis;
- ícones consistentes.

O resultado precisa parecer um produto comercial profissional, não um template genérico.


# 18. COPY

A linguagem deve ser:

- brasileira;
- simples;
- direta;
- profissional;
- acessível.

Evitar contabilidade falando apenas com contadores.

Falar com empresário / profissional.

Em vez de:

"Assessoria contábil e fiscal estratégica"

preferir quando possível algo como:

"Você cuida do seu negócio. A Exactra cuida da burocracia."


# 19. RESPONSIVIDADE

O protótipo precisa ser muito bom em:

- desktop;
- tablet;
- celular.

Especialmente celular, pois parte relevante do tráfego pago provavelmente chegará por mobile.


# 20. DADOS E REGRAS FICTÍCIAS

Nunca inventar uma regra fiscal real e apresentá-la como verdadeira.

Para o protótipo:

- utilizar valores claramente simulados;
- deixar funções separadas;
- documentar onde futuramente entrarão regras reais.

O contador fornecerá posteriormente as regras tributárias.


# 21. O QUE EU QUERO QUE VOCÊ FAÇA AGORA

Primeiro:

1. Analise todo o repositório.
2. Identifique a identidade visual atual.
3. Identifique conteúdo e assets reutilizáveis.
4. NÃO altere o projeto de produção ainda.

Depois:

Crie:

/prototype/exactra-prototype.html

ou estrutura equivalente isolada.

Ele deve funcionar abrindo o arquivo diretamente no browser.


# 22. O PROTÓTIPO PRECISA TER INTERAÇÕES REAIS

Apesar de ser somente HTML/CSS/JS, quero conseguir demonstrar:

- menu;
- scroll para seções;
- simulador em etapas;
- seleção de opções;
- slider ou input;
- barra de progresso;
- resultado simulado;
- indicação de plano;
- seleção de plano;
- checkout fictício;
- pagamento fictício;
- página/estado de sucesso;
- botão de WhatsApp;
- FAQ accordion;
- animações e feedbacks.

Não quero somente um layout estático.


# 23. IMPORTANTE SOBRE EXECUÇÃO

Não saia implementando imediatamente.

Antes:

1. Examine o projeto.
2. Resuma o que encontrou.
3. Explique a proposta visual.
4. Explique a arquitetura do protótipo.
5. Liste as seções da página.
6. Explique como será o simulador.
7. Aponte quaisquer dúvidas ou decisões relevantes.

Depois disso, implemente o protótipo.

Não faça mudanças destrutivas no projeto existente.