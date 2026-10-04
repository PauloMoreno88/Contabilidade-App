/**
 * Copy shared by the site (apps/web) and the transactional e-mails
 * (packages/emails), so both always say the same thing. Editable: change
 * here, both update. PLACEHOLDER items wait for Exactra / the accountant.
 */

export const contact = {
  whatsappNumber: "5500000000000", // PLACEHOLDER
  whatsappText: "Olá! Quero saber mais sobre a Exactra.",
  email: "contato@exactracontabilidade.com.br", // PLACEHOLDER
  phone: "(00) 00000-0000", // PLACEHOLDER
  hours: "Seg a sex, 9h às 18h", // PLACEHOLDER
  address: "Endereço a confirmar", // PLACEHOLDER
  coverage: "Atendimento remoto em todo o Brasil",
};

export function whatsappLink(text: string = contact.whatsappText) {
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/** "Contratei. E agora?" timeline and the documents usually requested. */
export const onboarding = {
  title: "Contratei. E agora?",
  sub: "O que acontece depois que você fecha com a Exactra.",
  steps: [
    { title: "Contrate seu plano", text: "Escolha o plano e preencha seus dados no checkout." },
    // PLACEHOLDER: no contact deadline until Exactra confirms one.
    { title: "Receba nosso contato", text: "Nosso time te chama no WhatsApp para começar o atendimento." },
    { title: "Envie seus documentos", text: "Uma lista simples do que precisamos para começar." },
    { title: "Analisamos suas informações", text: "Conferimos tudo antes de colocar sua contabilidade para rodar." },
    { title: "Sua contabilidade começa", text: "A partir daqui, a Exactra cuida da burocracia." },
  ],
  docsTitle: "Documentos que normalmente pedimos",
  // PLACEHOLDER: illustrative list, the accountant defines the final one.
  docs: [
    "Documento pessoal com foto",
    "Comprovante de endereço",
    "Dados da empresa (CNPJ, contrato social)",
    "Certificado digital, se já tiver",
    "Documentos específicos do seu serviço",
  ],
  docsNote: "Lista ilustrativa. Os documentos finais dependem do seu caso e são confirmados pelo time da Exactra.",
};
