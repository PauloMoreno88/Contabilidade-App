/**
 * Copy shared by the site (apps/web) and the transactional e-mails
 * (packages/emails), so both always say the same thing. Editable: change
 * here, both update. Contact, company data and onboarding sent by Exactra on 24/10/2026.
 */

/** The WhatsApp number is the only phone. */
export const contact = {
  whatsappNumber: "5521992635721",
  whatsappText: "Olá! Quero saber mais sobre a Exactra.",
  email: "contato@exactracontabilidade.com.br",
  phone: "(21) 99263-5721",
  hours: "Seg a sex, 8h às 18h",
  address: "Rua Sete de Setembro, 88, sala 502, Centro, Rio de Janeiro/RJ",
  coverage: "Atendimento remoto em todo o Brasil",
};

/** Official data for the footer and the legal pages. */
export const company = {
  legalName: "EXACTRA CONTABILIDADE EMPRESARIAL LTDA",
  cnpj: "61.909.509/0001-46",
  crc: "CRC-RJ 117161/O-1",
  forum: "Rio de Janeiro/RJ",
};

export function whatsappLink(text: string = contact.whatsappText) {
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/** tel: link for the phone shown on the site (Brazilian number, +55). */
export const phoneLink = () => `tel:+55${contact.phone.replace(/\D/g, "")}`;

/** "Contratei. E agora?" timeline and the documents usually requested. */
export const onboarding = {
  title: "Contratei. E agora?",
  sub: "O que acontece depois que você fecha com a Exactra.",
  steps: [
    { title: "Contrate o Plano Exactra", text: "Preencha seus dados e escolha como pagar no checkout." },
    { title: "Receba nosso contato", text: "Em até 1 dia útil, nosso time te chama no WhatsApp e sua contabilidade já começa." },
    { title: "Envie seus documentos", text: "Uma lista simples do que precisamos para começar." },
    { title: "A Exactra cuida do resto", text: "Conferimos suas informações e, a partir daqui, cuidamos dos impostos, prazos e declarações." },
  ],
  docsTitle: "Documentos que vamos pedir",
  /** First documents, by situation: everyone sends the first group plus the ones that fit. */
  docGroups: [
    {
      title: "Para todos",
      items: ["RG e CPF (ou CNH)", "Comprovante de residência", "Conta gov.br nível prata ou ouro"],
    },
    {
      title: "Se você está trocando de contador",
      items: [
        "Contrato social e todas as alterações",
        "Cartão CNPJ, inscrição estadual/municipal e alvará",
        "Documentos pessoais de todos os sócios",
        "Certificado digital (e-CNPJ) ou procuração eletrônica no e-CAC",
        "Senhas: prefeitura (nota fiscal), Sefaz e código de acesso do Simples",
        "Extratos bancários do último mês fechado",
        "Contratos de empréstimo, financiamento ou parcelamento em aberto",
        "Do contador anterior: balanço e balancete, declarações do Simples (PGDAS-D e DEFIS) dos últimos 5 anos, últimas guias DAS, folha de pagamento, acesso ao eSocial e relação de bens e estoque",
      ],
    },
    {
      title: "Se você vai abrir uma empresa",
      items: [
        "Documentos pessoais de todos os sócios",
        "Certidão de casamento, se for casado(a)",
        "Número do recibo das 2 últimas declarações de IR ou título de eleitor",
        "Carnê do IPTU e contrato de locação ou escritura do endereço da empresa",
        "3 opções de nome para a empresa",
        "Atividades que vai exercer",
        "Capital social e quanto fica com cada sócio",
        "Quem vai administrar a empresa",
        "Faturamento mensal estimado e se vai ter funcionários",
      ],
    },
    {
      title: "Se você é MEI",
      items: [
        "CCMEI (certificado do MEI) ou cartão CNPJ",
        "Notas fiscais emitidas e guias DAS pagas neste ano",
        "Última declaração anual do MEI (DASN-SIMEI)",
        "Senha do emissor de nota fiscal",
        "Dados do funcionário, se tiver",
      ],
    },
    {
      title: "Para o Imposto de Renda (pessoa física)",
      items: [
        "Declaração do ano passado completa, com recibo",
        "Informes de rendimentos (empregador, bancos, corretoras, INSS)",
        "Dados dos dependentes (nome, CPF e data de nascimento)",
        "Recibos de despesas médicas e de educação",
        "Documentos de compra ou venda de bens e de financiamentos",
        "Comprovantes de aluguéis recebidos ou pagos",
        "Informe de previdência privada, se tiver",
      ],
    },
  ],
  docsNote: "Todo mundo envia o primeiro grupo e os grupos que combinam com o seu caso. O time da Exactra confirma a lista com você no primeiro contato.",
};
