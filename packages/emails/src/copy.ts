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
  prepaidNote: "No Pix e no boleto o plano não renova sozinho. Avisamos você antes do vencimento.",
  stepsTitle: "Contratei. E agora?",
  done: "Feito",
  docsTitle: "Documentos que normalmente pedimos",
  // PLACEHOLDER: no contact deadline until Exactra confirms one.
  whatsappText: "Quer adiantar? Fale com a gente pelo WhatsApp.",
  whatsappCta: "Falar no WhatsApp",
  whatsappMessage: (plan: string) => `Olá! Acabei de contratar o plano ${plan} da Exactra.`,
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
  subject: "Redefinir sua senha do painel Exactra",
  preview: "Use o link para criar uma nova senha.",
  title: "Redefinir senha",
  lede: (name: string) => `Olá, ${name}. Recebemos um pedido para criar uma nova senha no painel da Exactra.`,
  cta: "Criar nova senha",
  expires: (minutes: number) => `O link vale por ${minutes} minutos e só pode ser usado uma vez.`,
  expiresUnknown: "O link expira depois de um tempo e só pode ser usado uma vez.",
  fallback: "Se o botão não funcionar, copie e cole este endereço no navegador:",
  ignore: "Não foi você? Ignore este e-mail: sua senha continua a mesma.",
};

export const twoFactorCopy = {
  subject: (code: string) => `${code} é o seu código de acesso da Exactra`,
  preview: "Use este código para terminar o login no painel.",
  title: "Seu código de acesso",
  lede: (name?: string) => `${name ? `Olá, ${name}. ` : ""}Use o código abaixo para terminar o login no painel da Exactra.`,
  expires: (minutes: number) => `O código vale por ${minutes} minutos.`,
  expiresUnknown: "O código vale por poucos minutos.",
  ignore: "Não tentou entrar? Troque sua senha: alguém pode estar usando ela.",
};

export const expiryCopy = {
  subject: (date: string) => `Seu plano na Exactra vence em ${date}`,
  preview: "Renove para continuar com o atendimento sem interrupção.",
  title: (firstName: string) => `${firstName}, seu plano está perto do vencimento`,
  lede: (plan: string, date: string) => `O plano ${plan} que você pagou adiantado vence em ${date}. No Pix e no boleto ele não renova sozinho.`,
  summaryTitle: "Seu plano",
  endsAt: "Vence em",
  cta: "Renovar meu plano",
  help: "Prefere falar com alguém? Chame a gente no WhatsApp.",
  whatsappCta: "Falar no WhatsApp",
  whatsappMessage: "Olá! Quero renovar meu plano na Exactra.",
};
