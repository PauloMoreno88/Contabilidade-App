import {
  BarChart3,
  Briefcase,
  Building2,
  Check,
  FileText,
  MessageSquare,
  PenLine,
  Receipt,
  Rocket,
  Store,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SimulatorAnswers } from "@exactra/shared";

/** Simulator copy and options. Values must match simulatorAnswersSchema in @exactra/shared. */

type Option<V> = { label: string; hint: string; icon: LucideIcon; value: V };
type ChoiceStep<K extends keyof SimulatorAnswers> = { kind: "choice"; key: K; question: string; help: string; options: Option<SimulatorAnswers[K]>[] };
type RevenueStep = { kind: "revenue"; key: "monthlyRevenue"; question: string; help: string };

export const revenueInput = {
  min: 2_000,
  max: 100_000,
  step: 1_000,
  initial: 15_000,
  shortcuts: [5_000, 10_000, 20_000, 30_000, 50_000],
  minLabel: "R$ 2 mil",
  maxLabel: "R$ 100 mil ou mais",
  ariaLabel: "Faturamento mensal",
};

export const simulatorSteps = [
  {
    kind: "choice",
    key: "profile",
    question: "Qual é o seu perfil?",
    help: "Escolha o que mais se parece com o seu negócio.",
    options: [
      { label: "Prestador de serviços", hint: "Consultoria, agência, TI", icon: Briefcase, value: "servicos" },
      { label: "Profissional liberal", hint: "Saúde, engenharia, direito", icon: PenLine, value: "liberal" },
      { label: "Comércio", hint: "Loja física ou online", icon: Store, value: "comercio" },
      { label: "Empresa com equipe", hint: "Já tem funcionários", icon: Building2, value: "empresa" },
      { label: "Vou abrir meu CNPJ", hint: "Ainda não tenho empresa", icon: Rocket, value: "primeiro-cnpj" },
    ],
  } satisfies ChoiceStep<"profile">,
  {
    kind: "revenue",
    key: "monthlyRevenue",
    question: "Quanto você fatura por mês?",
    help: "Um valor aproximado já basta.",
  } satisfies RevenueStep,
  {
    kind: "choice",
    key: "hasCnpj",
    question: "Você já tem CNPJ?",
    help: "Se não tiver, a abertura faz parte do plano.",
    options: [
      { label: "Sim, já tenho", hint: "Quero trocar ou organizar", icon: Check, value: true },
      { label: "Ainda não", hint: "Quero abrir", icon: FileText, value: false },
    ],
  } satisfies ChoiceStep<"hasCnpj">,
  {
    kind: "choice",
    key: "employees",
    question: "Tem funcionários?",
    help: "Sem contar os sócios.",
    options: [
      { label: "Nenhum", hint: "Só eu ou os sócios", icon: User, value: "none" },
      { label: "1 a 3", hint: "Equipe pequena", icon: Users, value: "1-3" },
      { label: "4 a 10", hint: "Equipe média", icon: Users, value: "4-10" },
      { label: "Mais de 10", hint: "Equipe grande", icon: Building2, value: "10+" },
    ],
  } satisfies ChoiceStep<"employees">,
  {
    kind: "choice",
    key: "currentRegime",
    question: "Hoje você trabalha como?",
    help: "Se não souber, tudo bem.",
    options: [
      { label: "CLT", hint: "Carteira assinada", icon: Briefcase, value: "clt" },
      { label: "Autônomo", hint: "Sem CNPJ", icon: User, value: "autonomo" },
      { label: "MEI", hint: "Microempreendedor", icon: Receipt, value: "mei" },
      { label: "Simples Nacional", hint: "Já sou empresa", icon: BarChart3, value: "simples" },
      { label: "Lucro Presumido", hint: "Já sou empresa", icon: BarChart3, value: "presumido" },
      { label: "Não sei", hint: "A gente descobre", icon: MessageSquare, value: "nao-sei" },
    ],
  } satisfies ChoiceStep<"currentRegime">,
] as const;

export type SimulatorStep = (typeof simulatorSteps)[number];

export const simulatorCopy = {
  title: "Simule quanto você paga de imposto",
  badge: "Grátis, leva 1 minuto",
  stepOf: (step: number, total: number) => `Passo ${step} de ${total}`,
  lastStep: "Último passo",
  resultStep: "Resultado",
  perMonth: "por mês",
  back: "Voltar",
  next: "Continuar",
  finish: "Ver meu resultado",
  gate: {
    title: "Sua estimativa está pronta",
    text: "Informe seu nome e WhatsApp para ver os valores. Um contador pode revisar o seu caso, sem compromisso.",
    regimeLabel: "Regime mais vantajoso",
    taxLabel: "Imposto estimado",
    netLabel: "Fica com você, já com a mensalidade",
    hidden: "R$ 0.000",
    name: "Nome",
    namePlaceholder: "Seu nome",
    whatsapp: "WhatsApp",
    whatsappPlaceholder: "(00) 00000-0000",
    email: "E-mail (opcional)",
    emailPlaceholder: "voce@email.com",
    consent: "Concordo que a Exactra use esses dados para falar comigo sobre a simulação, conforme a",
    consentLink: { href: "/privacidade", label: "política de privacidade" },
    submit: "Ver meu resultado",
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
    title: (name: string) => (name ? `${name}, este é o seu cenário` : "Este é o seu cenário"),
    sub: "Valores por mês.",
    revenue: "Faturamento",
    taxes: "Imposto estimado",
    afterTax: "Depois do imposto",
    best: "melhor opção",
    notApplicable: "não se aplica",
    saving: (value: string) => `No regime certo, a economia pode chegar a ${value} por ano em relação ao regime mais caro para o seu perfil.`,
    close: "No seu faturamento os regimes ficam próximos. O contador pode achar detalhes que mudam esse resultado.",
    netLabel: "Quanto sobra por mês, já pagando a Exactra",
    netExplain: (fee: string, plan: string) => `Faturamento, menos o imposto estimado, menos ${fee} do ${plan}.`,
    quoteLabel: "Sua empresa precisa de um orçamento sob medida",
    quoteTitle: "Vamos montar o seu preço",
    quoteText: "Com mais de 3 funcionários, a folha muda o valor. Um contador te passa o preço pelo WhatsApp.",
    quoteCta: "Pedir orçamento",
    quoteWhatsapp: "Olá! Fiz a simulação no site e tenho mais de 3 funcionários. Pode me passar um orçamento?",
    planCta: (plan: string) => `Contratar o ${plan}`,
    review: "Revisar com um contador",
    reviewWhatsapp: "Olá! Fiz a simulação no site e queria revisar o resultado com um contador.",
    restart: "Refazer simulação",
  },
};
