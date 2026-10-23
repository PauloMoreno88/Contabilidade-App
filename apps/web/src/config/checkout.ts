import type { BillingPeriod, PaymentMethod } from "@exactra/shared";

/** Online checkout is on only when NEXT_PUBLIC_CHECKOUT_ENABLED=true (see .env.example). */
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true";

/** Every method pays the one-year contract upfront (docs/plano.md, decision 22). */
export const methodLabels: Record<PaymentMethod, { label: string; hint: (maxInstallments: number) => string }> = {
  CARD: { label: "Cartão de crédito", hint: (n) => (n > 1 ? `À vista ou em até ${n}x` : "Pagamento à vista") },
  PIX: { label: "Pix", hint: () => "Valor anual à vista, confirmação na hora" },
  BOLETO: { label: "Boleto", hint: () => "Valor anual à vista. Compensa em 1 a 3 dias úteis" },
};

export const periodLabels: Record<BillingPeriod, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "3 meses",
  SEMIANNUAL: "6 meses",
  ANNUAL: "12 meses",
};

export const checkoutCopy = {
  title: "Contratar a Exactra",
  /** Stripe cancel_url: /checkout?cancelado=1 */
  canceled: {
    title: "Pagamento não concluído",
    text: "Você saiu antes de terminar e nada foi cobrado. Escolha a forma de pagamento e tente de novo quando quiser.",
  },
  back: "Voltar para o site",
  planTitle: "Plano",
  perYear: "contrato anual",
  contract: "Contrato anual",
  methodTitle: "Forma de pagamento",
  customerTitle: "Seus dados",
  fields: {
    name: { label: "Nome completo", placeholder: "Seu nome" },
    email: { label: "E-mail", placeholder: "voce@email.com" },
    phone: { label: "WhatsApp", placeholder: "(00) 00000-0000" },
    document: { label: "CPF ou CNPJ", placeholder: "Somente números" },
  },
  consentStart: "Concordo com os",
  termsLink: { href: "/termos", label: "termos de uso" },
  consent: "e autorizo a Exactra a tratar meus dados para prestar o serviço, conforme a",
  consentLink: { href: "/privacidade", label: "política de privacidade" },
  summaryTitle: "Resumo",
  totalNow: "Total agora",
  installments: (n: number, v: string) => `ou ${n}x de ${v} no cartão`,
  annualNote: "Contrato de 12 meses. Você pode desistir em até 7 dias após a contratação, com reembolso integral.",
  submit: "Ir para o pagamento",
  submitting: "Abrindo pagamento...",
  secureNote: "O pagamento é feito no ambiente seguro da Stripe. Não guardamos dados de cartão.",
  placeholderNote: "Valores de exemplo, ainda em validação.", // PLACEHOLDER
  errors: {
    name: "Informe seu nome completo.",
    email: "Confira o e-mail.",
    phone: "Informe um WhatsApp com DDD.",
    document: "Informe um CPF ou CNPJ válido.",
    consent: "Precisamos do seu consentimento para continuar.",
    request: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.",
  },
  disabled: {
    title: "Contratação online em breve",
    text: "Enquanto isso, fale com a gente pelo WhatsApp e contrate com o nosso time.",
    cta: "Contratar pelo WhatsApp",
    whatsappText: (plan: string) => `Olá! Quero contratar o ${plan}.`,
  },
};

export const statusCopy = {
  loading: "Conferindo seu pagamento...",
  missing: {
    title: "Não encontramos essa contratação",
    text: "O link pode estar incompleto. Se você já pagou, fale com a gente pelo WhatsApp.",
  },
  active: {
    title: "Pagamento confirmado",
    text: "Boas-vindas à Exactra! Recebemos sua contratação e nosso time vai te chamar no WhatsApp para começar.", // PLACEHOLDER: no deadline until confirmed
  },
  pending: {
    BOLETO: {
      title: "Boleto gerado",
      text: "Assim que o banco confirmar o pagamento (1 a 3 dias úteis), sua contratação é ativada e você recebe um e-mail.",
    },
    PIX: {
      title: "Aguardando o Pix",
      text: "Assim que o Pix for confirmado, sua contratação é ativada. Esta página atualiza sozinha.",
    },
    CARD: {
      title: "Processando o pagamento",
      text: "Estamos aguardando a confirmação do cartão. Esta página atualiza sozinha.",
    },
  },
  failed: {
    title: "O pagamento não foi concluído",
    text: "Nenhum valor foi cobrado. Você pode tentar de novo ou falar com a gente pelo WhatsApp.",
    retry: "Tentar de novo",
  },
  summary: (plan: string, period: string, method: string) => `${plan}, ${period.toLowerCase()}, ${method.toLowerCase()}`,
  whatsapp: "Falar no WhatsApp",
  whatsappText: "Olá! Acabei de contratar a Exactra.",
  home: "Voltar para o site",
};
