# Benchmark de sites de contabilidade online (20/10/2026)

Sites analisados: AccountTech, Contabilizei, Meu Contador Online, Contabilidade.com e Agilize.
Objetivo: entender o que faz um site "ter cara de contabilidade" e o que eles fazem com simuladores.
Protótipo resultante: `docs/prototype/exactra-prototype-e.html`.

## O que todos têm em comum

| Elemento | Como aparece | Exemplo |
|---|---|---|
| Promessa no hero | Benefício concreto + preço "a partir de" | Contabilizei: "planos a partir de R$ 195/mês" |
| Dois CTAs fixos | Um para quem vai abrir, outro para quem vai trocar | "Abrir CNPJ grátis" / "Trocar de contador" (Contabilizei, Contabilidade.com) |
| Prova social em números | Clientes, anos, prêmios, nota | "+100 mil clientes", "Campeã Reclame Aqui", "4,8 no Google" |
| Registro profissional | Número do CRC visível no topo ou rodapé | Contabilidade.com mostra o CRC logo abaixo do hero |
| "Gente de verdade" | Canais listados (WhatsApp, telefone, vídeo) e "sem pagar a mais" | AccountTech, Meu Contador Online ("contador exclusivo") |
| O que está incluso | Lista de obrigações em linguagem simples | Meu Contador Online: guias, pró-labore, relatórios, declarações |
| Comparativo | Tabela "nós x os outros" | Contabilizei (preço, abertura, atendimento), Meu Contador Online |
| Segmentos | Saúde, tecnologia, marketing, liberais, comércio | Agilize, Contabilizei |
| Planos | 3 planos, um destacado, "a partir de", preço riscado | Todos |
| Depoimentos | Nome real, estrelas, às vezes link para o Google | Todos |
| FAQ longo | Dúvidas de quem nunca teve contador | Todos |
| Calculadoras | Hub de ferramentas grátis (impostos, CLT x PJ, Fator R) | Contabilizei (5 calculadoras), Contabilidade.com |

## Simuladores: o que os melhores fazem

- **Contabilidade.com** tem a calculadora mais próxima do nosso simulador: pergunta atividade, faturamento, estado e cidade e mostra um comparativo entre MEI, Simples (com e sem Fator R) e Lucro Presumido, com selo "Recomendado para você". Depois do resultado, mostra 3 passos: contador revisa, abre/migra, usa a plataforma.
- **Contabilizei** usa calculadoras como isca de conteúdo no menu, separadas da home.
- Nenhum dos sites analisados coloca o simulador **dentro do hero**. Isso é uma oportunidade de diferenciação para a Exactra, que vende principalmente por anúncio.

## O que levamos para a Exactra (protótipo E)

1. Simulador no hero, à direita do título, já na pergunta 1. Título vendendo o simulador ("Descubra em 1 minuto quanto de imposto você deveria pagar").
2. Faturamento por slider com número grande, em vez de botões fixos (o schema já aceita número livre).
3. Opções avançam sozinhas ao clicar (menos cliques).
4. Gate de lead mostra o regime e o plano antes de pedir o contato, com o valor borrado.
5. Resultado com comparativo de regimes em barras, "fica com você", economia por ano e plano indicado.
6. Faixa de confiança (clientes, anos, nota Google, CRC, todo o Brasil) logo abaixo do hero.
7. Topbar com CRC e contador responsável.
8. "Qual é o seu momento?": abrir CNPJ, trocar de contador, sair do MEI, CLT para PJ.
9. Segmentos atendidos, "o que está incluso", comparativo com contabilidade tradicional.
10. Seção escura de atendimento humano com foto do contador.
11. Hub de ferramentas (simulador agora; CLT x PJ e Fator R depois).
12. Barra fixa no celular com "Simular grátis" + WhatsApp.

## O que depende da Exactra ou do contador

- Número do CRC, nome e foto do contador responsável, CNPJ e endereço.
- Números reais de confiança (clientes, anos, nota no Google) e depoimentos com autorização.
- Segmentos que a Exactra de fato atende.
- Preços, o que entra em cada plano, regra de reajuste e de cancelamento.
- Regras reais dos regimes no simulador (hoje as alíquotas do protótipo são ilustrativas).
- Se o simulador deve perguntar estado/cidade (ISS muda por município).

## Cuidados

- Não copiar textos nem paleta dos concorrentes: o protótipo usa textos próprios e a paleta da Exactra.
- Comparativos do tipo "nós x outros" precisam ser verdadeiros e defensáveis; evitar números de concorrentes.
- Depoimentos só reais, com autorização (LGPD).

## Segunda rodada (20/10/2026): Conube, Contador Amigo, Razonet e Omie

- **Reforma Tributária como gancho:** Omie lançou um simulador com linha do tempo de 2026 a 2033; Meu Contador Online abre a home com "Quanto custa ser PJ em 2027". A CBS começa a valer de verdade em janeiro de 2027, então é um assunto quente para anúncio.
- **A pessoa por trás:** Razonet tem uma seção inteira sobre o fundador (contador e advogado). Para a Exactra, o equivalente é mostrar o contador responsável com foto, nome e CRC.
- **Time por função:** Conube apresenta consultores, contadores e especialistas em impostos separadamente. Ajuda a entender quem faz o quê.
- **Planos por tipo de empresa:** Contador Amigo e Meu Contador Online separam serviços e comércio, e têm plano para empresa sem movimento.

Protótipo resultante: `docs/prototype/exactra-prototype-f.html` (conceito "demonstrativo": o simulador é uma frase para completar e um demonstrativo ao lado recalcula na hora).

Decisão pendente: no protótipo F a estimativa aparece **antes** do cadastro, e o cadastro libera o comparativo completo e a revisão do contador. Hoje o site mostra os valores só **depois** do cadastro.

## Terceira rodada (20/10/2026): referências do cliente no Pinterest

- **ISK Contabilidade:** barra superior com telefone, horário e área do cliente; foto no hero; cards escuros sobrepostos à foto; serviços com ícone; contato escuro com formulário e telefone grande; CRC no rodapé.
- **Contabe:** verde escuro com destaque claro; pessoa real no hero; nota de avaliações; números (anos, empresas, acesso); mosaico com foto do escritório; celular mostrando o app.
- **Fincco:** muita fotografia de pessoas, títulos com serifa, faixa de chamada com foto e depoimentos com nota.

O cliente gosta de linguagem **institucional com fotos de gente real**. Protótipo resultante: `docs/prototype/exactra-prototype-g.html`, na paleta da Exactra (azul-marinho no papel do verde escuro, vermelho no papel do destaque). Fotos do Unsplash são ilustrativas: o site final precisa de fotos reais da equipe e do escritório. O celular mostra o WhatsApp (e não um app), porque a Exactra não tem app.

**Atualização (20/10/2026):** o cliente não quer fotos de pessoas. A variante G passou a usar só imagens ligadas à contabilidade (notebook com painel de gráficos no hero, mesa com gráfico de crescimento no mosaico, prancheta e notebook na faixa, escritório vazio no contato) e depoimentos com iniciais no lugar do rosto. A G é a variante preferida até agora.
