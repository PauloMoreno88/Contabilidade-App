# Perguntas para o contador

Objetivo: substituir os valores e regras `PLACEHOLDER` do site antes de aceitar pagamentos reais.
Enquanto não houver resposta, o desenvolvimento segue com valores fictícios e o checkout real fica desligado.

## A. Planos e preços (bloqueia o lançamento)

1. Quais planos serão vendidos no site? Hoje usamos Essencial, Profissional e Empresarial. Mantém esses três, muda nomes ou quantidade?
2. Qual o valor mensal de cada plano?
3. O que cada plano inclui (serviços, obrigações, número de funcionários, atendimento, certificado digital etc.)?
4. Para quem cada plano é indicado? (Perfil de cliente, faixa de faturamento, regime tributário.)
5. Existe taxa de abertura de CNPJ ou outro valor cobrado uma única vez? Se sim, quanto?
6. Para pagamento antecipado por Pix ou boleto (3, 6 e 12 meses): qual o desconto por período? O cartão recorrente terá o mesmo valor mensal?
7. O que acontece com o cliente que não renova ou atrasa? Qual o prazo de tolerância?
8. Qual a política de cancelamento e reembolso? Existe fidelidade ou prazo mínimo?

## B. Regras do simulador (bloqueia a estimativa real)

9. Quais regimes o simulador deve considerar: MEI, Simples Nacional, Lucro Presumido, outros?
10. Para cada regime: alíquotas, faixas de faturamento, anexos do Simples e fator R, quando aplicável.
11. Como a atividade (prestador de serviços, profissional liberal, comércio) muda o enquadramento e as alíquotas?
12. Quais despesas entram na estimativa: pró-labore, INSS, ISS, custo do contador? Qual pró-labore padrão usar?
13. Funcionários alteram a estimativa? Como (encargos, FGTS, INSS)?
14. Quando o perfil não se encaixa em nenhum plano (por exemplo, faturamento acima do limite do Simples), o que o simulador deve responder?
15. Qual texto de aviso legal ele aprova para a estimativa?

## C. Operação e onboarding

16. Quais documentos pedimos ao cliente após a contratação, por perfil (abertura de CNPJ, migração de contador, PF)?
17. Qual o prazo para o primeiro contato e para a contabilidade começar?
18. Qual WhatsApp e quais e-mails devem receber os avisos de nova contratação e a notificação interna?
19. Qual o horário de atendimento a exibir no site?

## D. Dados jurídicos e institucionais

20. Dados oficiais da empresa para o rodapé e para o contrato: razão social, CNPJ, CRC, endereço.
21. Existe contrato de prestação de serviços padrão? Pode enviar para colocarmos na página de checkout?
22. Política de privacidade e termos de uso: já existem, ou precisamos de rascunho para revisão jurídica?
23. Quem é o responsável legal pela conta de pagamentos (Stripe) e pelo domínio?
