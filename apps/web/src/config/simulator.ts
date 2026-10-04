import type { SimulatorAnswers } from "@exactra/shared";

/** Simulator copy and options. Values must match simulatorAnswersSchema in @exactra/shared. */

type Step<K extends keyof SimulatorAnswers> = {
  key: K;
  question: string;
  options: { label: string; value: SimulatorAnswers[K] }[];
};

export const simulatorSteps = [
  {
    key: "profile",
    question: "Qual é o seu perfil?",
    options: [
      { label: "Prestador de serviços", value: "servicos" },
      { label: "Profissional liberal", value: "liberal" },
      { label: "Comércio", value: "comercio" },
      { label: "Empresa", value: "empresa" },
      { label: "Estou abrindo meu primeiro CNPJ", value: "primeiro-cnpj" },
    ],
  } satisfies Step<"profile">,
  {
    key: "monthlyRevenue",
    question: "Quanto você pretende faturar por mês?",
    options: [
      { label: "R$ 5.000", value: 5_000 },
      { label: "R$ 10.000", value: 10_000 },
      { label: "R$ 15.000", value: 15_000 },
      { label: "R$ 20.000", value: 20_000 },
      { label: "R$ 30.000", value: 30_000 },
      { label: "R$ 50.000 ou mais", value: 50_000 },
    ],
  } satisfies Step<"monthlyRevenue">,
  {
    key: "hasCnpj",
    question: "Você já tem CNPJ?",
    options: [
      { label: "Sim", value: true },
      { label: "Não", value: false },
    ],
  } satisfies Step<"hasCnpj">,
  {
    key: "employees",
    question: "Tem funcionários?",
    options: [
      { label: "Nenhum", value: "none" },
      { label: "1 a 3", value: "1-3" },
      { label: "4 a 10", value: "4-10" },
      { label: "Mais de 10", value: "10+" },
    ],
  } satisfies Step<"employees">,
  {
    key: "currentRegime",
    question: "Hoje você trabalha como...",
    options: [
      { label: "CLT", value: "clt" },
      { label: "Autônomo", value: "autonomo" },
      { label: "MEI", value: "mei" },
      { label: "Simples Nacional", value: "simples" },
      { label: "Lucro Presumido", value: "presumido" },
      { label: "Não sei", value: "nao-sei" },
    ],
  } satisfies Step<"currentRegime">,
] as const;

export const simulatorCopy = {
  title: "Quanto do que você fatura fica no seu bolso?",
  sub: "Responda 5 perguntas e veja uma estimativa em menos de 1 minuto.",
  startTitle: "Descubra quanto você paga de imposto",
  startText: "5 perguntas rápidas sobre o seu negócio. No final, você vê uma estimativa e o plano que mais combina com o seu momento.",
  startCta: "Fazer simulação grátis",
  progressLabel: "Mini-diagnóstico",
  stepOf: (step: number, total: number) => `Passo ${step} de ${total}`,
  back: "Voltar",
  next: "Continuar",
  finish: "Ver resultado",
  gate: {
    title: "Sua estimativa está pronta",
    regimeLabel: "Regime sugerido para a simulação",
    planLabel: "Plano que combina com você",
    lockedText: "Informe seu nome e WhatsApp para ver os valores detalhados.",
    name: "Nome",
    namePlaceholder: "Seu nome",
    whatsapp: "WhatsApp",
    whatsappPlaceholder: "(00) 00000-0000",
    email: "E-mail (opcional)",
    emailPlaceholder: "voce@email.com",
    consent: "Concordo que a Exactra use esses dados para entrar em contato sobre a simulação, conforme a",
    consentLink: { href: "/privacidade", label: "política de privacidade" },
    submit: "Ver valores detalhados",
    submitting: "Enviando...",
    errors: {
      name: "Informe seu nome.",
      whatsapp: "Informe um WhatsApp com DDD.",
      email: "Confira o e-mail.",
      consent: "Precisamos do seu consentimento para continuar.",
      request: "Não foi possível enviar agora. Tente de novo em instantes.",
    },
  },
  result: {
    label: "Resultado da simulação",
    title: "Seu cenário estimado",
    revenue: "Faturamento informado",
    regime: "Regime sugerido para a simulação",
    taxes: "Impostos estimados",
    net: "Quanto fica com você, aproximadamente",
    perMonth: "/mês",
    range: (min: string, max: string) => `${min} a ${max}`,
    planText: (plan: string) => `O plano ${plan} é o que mais combina com o seu perfil.`,
    planCta: "Contratar plano recomendado",
    seePlans: "Ver todos os planos",
    restart: "Refazer simulação",
  },
};
