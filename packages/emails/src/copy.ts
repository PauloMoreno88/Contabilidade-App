import type { BillingPeriod, PaymentMethod } from "@exactra/shared";

/**
 * E-mail copy. Editable: change wording here, not in the templates.
 * The onboarding timeline, documents and contact come from @exactra/shared
 * (same text as the site). PLACEHOLDER items wait for Exactra / the accountant.
 */

export const brand = {
  name: "Exactra Contabilidade",
  signature: "Equipe Exactra Contabilidade",
  footer: "Você recebeu este e-mail porque tem uma conta ou contratação com a Exactra Contabilidade.",
};

export const methodLabel: Record<PaymentMethod, string> = {
  CARD: "Cartão de crédito",
  PIX: "Pix",
  BOLETO: "Boleto",
};

export const periodLabel: Record<BillingPeriod, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "3 meses",
  SEMIANNUAL: "6 meses",
  ANNUAL: "12 meses",
};

/**
 * Monthly card subscriptions were sold before decision 22 (one-year contract paid upfront).
 * Every other contract, card included, is prepaid and does not renew by itself.
 */
export const isRecurring = (c: { period: BillingPeriod }) => c.period === "MONTHLY";

export const welcomeCopy = {
  subject: (firstName: string) => `Boas-vindas à Exactra, ${firstName}`,
  preview: "Seu pagamento foi confirmado. Veja o resumo e os próximos passos.",
  title: (firstName: string) => `Boas-vindas, ${firstName}.`,
  lede: "Seu pagamento foi confirmado e a sua contratação está ativa. A partir de agora, a Exactra cuida da parte burocrática do seu CNPJ.",
  summaryTitle: "Resumo da contratação",
  plan: "Plano",
  billing: "Pagamento",
  amount: "Valor",
  amountPerMonth: "por mês",
  amountPrepaid: (months: number) => `pago por ${months} meses`,
  startsAt: "Início",
  nextCharge: "Próxima cobrança",
  endsAt: "Válido até",
  cardNote: "No cartão, a cobrança se renova todo mês automaticamente.",
  prepaidNote: "O plano vale pelo período pago e não renova sozinho. Avisamos você antes do vencimento.",
  stepsTitle: "Contratei. E agora?",
  done: "Feito",
  docsTitle: "Documentos que normalmente pedimos",
  // PLACEHOLDER: no contact deadline until Exactra confirms one.
  whatsappText: "Quer adiantar? Fale com a gente pelo WhatsApp.",
  whatsappCta: "Falar no WhatsApp",
  whatsappMessage: (plan: string) => `Olá! Acabei de contratar o ${plan} da Exactra.`,
};

export const newContractCopy = {
  subject: (customer: string, plan: string) => `Nova contratação: ${customer} (${plan})`,
  preview: (customer: string) => `${customer} acabou de ativar um contrato.`,
  title: "Nova contratação ativa",
  lede: "O pagamento foi confirmado pelo Stripe. Entre em contato com o cliente para iniciar o atendimento.",
  customerTitle: "Cliente",
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  document: "CPF/CNPJ",
  contractTitle: "Contrato",
  source: "Origem",
  noSource: "Direto (sem simulador)",
  adminCta: "Abrir no painel",
  whatsappCta: "Chamar no WhatsApp",
};

export const passwordResetCopy = {
  subject: "Redefinir sua senha da Exactra",
  preview: "Use o link para criar uma nova senha.",
  title: "Redefinir senha",
  lede: (name: string) => `Olá, ${name}. Recebemos um pedido para criar uma nova senha na sua conta da Exactra.`,
  cta: "Criar nova senha",
  expires: (minutes: number) => `O link vale por ${minutes} minutos e só pode ser usado uma vez.`,
  expiresUnknown: "O link expira depois de um tempo e só pode ser usado uma vez.",
  fallback: "Se o botão não funcionar, copie e cole este endereço no navegador:",
  ignore: "Não foi você? Ignore este e-mail: sua senha continua a mesma.",
};

export const twoFactorCopy = {
  subject: (code: string) => `${code} é o seu código de acesso da Exactra`,
  preview: "Use este código para terminar o login.",
  title: "Seu código de acesso",
  lede: (name?: string) => `${name ? `Olá, ${name}. ` : ""}Use o código abaixo para terminar o login na Exactra.`,
  expires: (minutes: number) => `O código vale por ${minutes} minutos.`,
  expiresUnknown: "O código vale por poucos minutos.",
  ignore: "Não tentou entrar? Troque sua senha: alguém pode estar usando ela.",
};

export const expiryCopy = {
  subject: (date: string) => `Seu plano na Exactra vence em ${date}`,
  preview: "Renove para continuar com o atendimento sem interrupção.",
  title: (firstName: string) => `${firstName}, seu plano está perto do vencimento`,
  lede: (plan: string, date: string) => `O seu contrato do ${plan} vence em ${date}. Ele não renova sozinho.`,
  summaryTitle: "Seu plano",
  endsAt: "Vence em",
  cta: "Renovar meu plano",
  help: "Prefere falar com alguém? Chame a gente no WhatsApp.",
  whatsappCta: "Falar no WhatsApp",
  whatsappMessage: "Olá! Quero renovar meu plano na Exactra.",
};

/** Customer area (/app). One action per e-mail, straight to the item. */
export const portalCopy = {
  invite: {
    subject: "Ative seu acesso à área do cliente da Exactra",
    preview: "Crie sua senha para enviar documentos e ver suas guias.",
    title: (firstName: string) => `${firstName}, sua área do cliente está pronta`,
    lede: (company: string | null) =>
      `É por ela que você envia os documentos do mês, recebe as guias de impostos${company ? ` da ${company}` : ""} e acompanha seu plano.`,
    cta: "Criar minha senha",
    expires: (days: number) => `O link vale por ${days} dias. Depois disso, peça um novo pelo WhatsApp.`,
    fallback: "Se o botão não funcionar, copie e cole este endereço no navegador:",
  },
  welcomeActivation: {
    title: "Seu acesso à área do cliente",
    text: "Crie sua senha para enviar documentos, receber as guias e acompanhar tudo num só lugar.",
    cta: "Ativar meu acesso",
    expires: (days: number) => `O link vale por ${days} dias.`,
  },
  magicLink: {
    subject: "Seu link para entrar na Exactra",
    preview: "Toque no botão para entrar sem senha.",
    title: "Entrar na área do cliente",
    lede: (firstName: string) => `Olá, ${firstName}. Use o botão abaixo para entrar. Não precisa de senha.`,
    cta: "Entrar agora",
    expires: (minutes: number) => `O link vale por ${minutes} minutos e só funciona uma vez.`,
    ignore: "Não pediu este link? Ignore este e-mail: ninguém entra sem ele.",
  },
  guidePublished: {
    subject: (guide: string, date: string) => `Nova guia: ${guide}, vence em ${date}`,
    preview: "A guia já está na sua área do cliente.",
    title: "Tem guia nova para pagar",
    lede: (firstName: string) => `${firstName}, a Exactra publicou uma guia para você.`,
    cta: "Ver a guia",
    note: "Na área do cliente você baixa o PDF, copia o código de barras e marca como paga.",
  },
  guideDue: {
    subject: (guide: string, days: number) => (days === 0 ? `${guide} vence hoje` : `${guide} vence em ${days} ${days === 1 ? "dia" : "dias"}`),
    preview: "Pague em dia para evitar multa e juros.",
    title: (days: number) => (days === 0 ? "Sua guia vence hoje" : "Sua guia está perto do vencimento"),
    lede: (firstName: string) => `${firstName}, ainda não vimos esta guia marcada como paga.`,
    cta: "Ver a guia",
    note: "Já pagou? Marque como paga na área do cliente e os lembretes param.",
  },
  documentsOpen: {
    subject: (month: string) => `Documentos de ${month}: já pode enviar`,
    preview: "Veja a lista do que precisamos este mês.",
    title: (month: string) => `Documentos de ${month}`,
    lede: (firstName: string, date: string) => `${firstName}, já pode enviar os documentos do mês. O prazo é ${date}.`,
    listTitle: "O que precisamos",
    cta: "Enviar documentos",
  },
  documentsReminder: {
    subject: (n: number, month: string) => `${n === 1 ? "Falta 1 documento" : `Faltam ${n} documentos`} de ${month}`,
    preview: "Envie para fecharmos o mês da sua empresa.",
    title: (days: number) => (days === 0 ? "O prazo dos documentos é hoje" : "Faltam alguns documentos"),
    lede: (firstName: string, date: string) => `${firstName}, para fechar o mês precisamos destes documentos até ${date}.`,
    listTitle: "Ainda não recebemos",
    cta: "Enviar agora",
  },
  documentRejected: {
    subject: (title: string) => `Precisamos de um novo envio: ${title}`,
    preview: "Um documento precisa ser enviado de novo.",
    title: "Precisamos de um novo envio",
    lede: (firstName: string, title: string, month: string) => `${firstName}, o documento "${title}" de ${month} não pôde ser usado.`,
    reason: "Motivo",
    note: "Observação",
    cta: "Enviar de novo",
  },
  retention: {
    subject: (month: string) => `Arquivos de ${month} serão apagados em breve`,
    preview: "Baixe uma cópia se quiser guardar.",
    title: (month: string) => `Arquivos de ${month}`,
    lede: (firstName: string, date: string) =>
      `${firstName}, a área do cliente guarda os arquivos por 12 meses. Os documentos e guias deste mês serão apagados em ${date}.`,
    cta: "Baixar tudo (ZIP)",
    note: "A Exactra mantém os registros contábeis da sua empresa. A área do cliente é o canal de troca de arquivos, não o arquivo oficial.",
  },
  rows: { guide: "Guia", competence: "Competência", amount: "Valor", dueDate: "Vencimento" },
  whatsappCta: "Falar no WhatsApp",
};
