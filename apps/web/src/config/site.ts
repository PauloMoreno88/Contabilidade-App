/**
 * Landing copy. Everything the client may ask to change lives here, not in JSX.
 * Prices and plan features come from @exactra/shared (PLANS).
 * PLACEHOLDER: contact data and the trust numbers must be confirmed by Exactra.
 */
import {
  Calculator,
  CalendarClock,
  FileText,
  Headset,
  LineChart,
  MessagesSquare,
  Receipt,
  Scale,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

type Item = { title: string; text: string };
type IconItem = Item & { icon: LucideIcon };

export const contact = {
  whatsappNumber: "5500000000000", // PLACEHOLDER
  whatsappText: "Olá! Quero saber mais sobre a Exactra.",
  email: "contato@exactracontabilidade.com.br", // PLACEHOLDER
  phone: "(00) 00000-0000", // PLACEHOLDER
  hours: "Seg a sex, 9h às 18h",
  address: "Endereço a confirmar", // PLACEHOLDER
  coverage: "Atendimento remoto em todo o Brasil",
};

export function whatsappLink(text: string = contact.whatsappText) {
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export const seo = {
  title: "Exactra Contabilidade | Contabilidade simples para quem toca o negócio",
  description:
    "A Exactra cuida dos números, prazos e obrigações do seu CNPJ. Simule em menos de 1 minuto quanto você paga de imposto e veja o plano ideal.",
};

export const nav = {
  links: [
    { href: "/#servicos", label: "Serviços" },
    { href: "/#simulador", label: "Simulador" },
    { href: "/#planos", label: "Planos" },
    { href: "/#como-funciona", label: "Como funciona" },
    { href: "/#contato", label: "Contato" },
  ],
  cta: { href: "/#planos", label: "Quero contratar" },
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
};

export const hero = {
  title: "Contabilidade simples para quem quer cuidar do negócio, não da burocracia.",
  lede: "A Exactra cuida dos números, prazos e obrigações do seu CNPJ, para você focar em vender, atender e crescer.",
  primaryCta: { href: "#simulador", label: "Descobrir quanto vou pagar" },
  secondaryCta: { href: "#planos", label: "Conhecer planos" },
  trust: [
    { value: "+500", label: "empresas atendidas" }, // PLACEHOLDER
    { value: "100%", label: "digital" },
    { value: "< 1 min", label: "para simular" },
  ],
  preview: {
    title: "Mini-diagnóstico",
    step: "Passo 2 de 5",
    question: "Quanto você pretende faturar por mês?",
    options: ["R$ 10.000", "R$ 15.000", "R$ 20.000"],
    activeOption: 1,
    resultLabel: "Estimativa do que fica no seu bolso",
    resultValueCents: 1_240_000,
    perMonth: "/mês",
  },
};

export const benefits: { title: string; items: IconItem[] } = {
  title: "Por que empresas trocam de contador pela Exactra",
  items: [
    { icon: MessagesSquare, title: "Atendimento próximo", text: "Você fala com gente de verdade, não cai num protocolo nem fica dias esperando retorno." },
    { icon: Wifi, title: "Contabilidade 100% digital", text: "Documentos, guias e pendências num só lugar. Sem papel e sem ir até um escritório." },
    { icon: CalendarClock, title: "Menos burocracia", text: "A gente traduz o fiscal para português simples e cuida dos prazos antes que eles te procurem." },
    { icon: Headset, title: "Suporte especializado", text: "Um time acompanhando o seu CNPJ de verdade, não só fechando guias no fim do mês." },
  ],
};

export const services: { title: string; sub: string; items: IconItem[] } = {
  title: "O que a Exactra faz pelo seu CNPJ",
  sub: "Tudo o que uma contabilidade de verdade cobre, sem letra miúda.",
  items: [
    { icon: FileText, title: "Abertura de CNPJ", text: "Cuidamos do registro inteiro, do zero até o CNPJ ativo." },
    { icon: Calculator, title: "Contabilidade mensal", text: "Guias, obrigações e declarações em dia, sem você precisar lembrar de nada." },
    { icon: Users, title: "Folha de pagamento", text: "Admissão, rescisão, pró-labore e encargos calculados certinho." },
    { icon: Scale, title: "Consultoria tributária", text: "Ajuda para entender se o seu regime ainda faz sentido conforme você cresce." },
    { icon: Receipt, title: "Emissão de notas", text: "Notas fiscais emitidas e organizadas, sem sistema complicado." },
    { icon: LineChart, title: "Planejamento financeiro", text: "Visão clara de quanto entra, quanto sai e quanto sobra de verdade." },
  ],
};

export const howItWorks: { title: string; sub: string; steps: Item[] } = {
  title: "Como funciona para contratar",
  sub: "Do primeiro clique até sua contabilidade rodando.",
  steps: [
    { title: "Faça a simulação", text: "Responda o mini-diagnóstico e veja uma estimativa do seu cenário." },
    { title: "Escolha seu plano", text: "Com base no resultado, indicamos o plano que mais combina com você." },
    { title: "Finalize a contratação", text: "Preencha seus dados e pague online, sem ir a um escritório." },
    { title: "Comece a operar", text: "Nosso time entra em contato e assume a parte burocrática para você." },
  ],
};

export const plansSection = {
  title: "Planos pensados para o seu momento",
  sub: "Valores de exemplo. Serão ajustados com os dados reais da Exactra.", // PLACEHOLDER
  perMonth: "/mês",
  cta: "Contratar",
  prepaidNote: "Pix ou boleto: pague 3, 6 ou 12 meses adiantado com desconto.",
};

export const onboarding: { title: string; sub: string; steps: Item[]; docsTitle: string; docs: string[]; docsNote: string } = {
  title: "Contratei. E agora?",
  sub: "O que acontece depois que você fecha com a Exactra.",
  steps: [
    { title: "Contrate seu plano", text: "Escolha o plano e preencha seus dados no checkout." },
    { title: "Receba nosso contato", text: "Nosso time te chama no WhatsApp em até 1 dia útil." },
    { title: "Envie seus documentos", text: "Uma lista simples do que precisamos para começar." },
    { title: "Analisamos suas informações", text: "Conferimos tudo antes de colocar sua contabilidade para rodar." },
    { title: "Sua contabilidade começa", text: "A partir daqui, a Exactra cuida da burocracia." },
  ],
  docsTitle: "Documentos que normalmente pedimos",
  docs: [
    "Documento pessoal com foto",
    "Comprovante de endereço",
    "Dados da empresa (CNPJ, contrato social)",
    "Certificado digital, se já tiver",
    "Documentos específicos do seu serviço",
  ],
  docsNote: "Lista ilustrativa. Os documentos finais dependem do seu caso e são confirmados pelo time da Exactra.",
};

export const why: { title: string; items: Item[] } = {
  title: "Por que a Exactra",
  items: [
    { title: "Feita para pequenos e médios negócios", text: "Não é uma contabilidade genérica adaptada para qualquer porte. Pensamos no seu momento." },
    { title: "Comunicação direta", text: "Sem corrente de e-mail. Você fala com quem resolve, pelo canal que preferir." },
    { title: "Transparência nos números", text: "Você entende o que está pagando e por quê, sem termos que só contador entende." },
    { title: "Estrutura para crescer com você", text: "Do MEI ao Lucro Presumido, acompanhamos a evolução do seu CNPJ." },
  ],
};

export const faq: { title: string; items: { q: string; a: string }[] } = {
  title: "Perguntas frequentes",
  items: [
    { q: "Preciso já ter CNPJ?", a: "Não. Se você ainda não tem CNPJ, a gente cuida da abertura como parte da contratação." },
    { q: "Posso trocar de contador para a Exactra?", a: "Sim, e cuidamos da transição, incluindo o pedido dos seus dados ao contador anterior." },
    { q: "Como envio meus documentos?", a: "Tudo online, pelos canais que combinarmos com você depois da contratação." },
    { q: "Como funciona o pagamento?", a: "No cartão, a cobrança é mensal e recorrente. No Pix ou boleto, você paga 3, 6 ou 12 meses adiantado, com desconto." }, // PLACEHOLDER: confirm with the accountant
    { q: "Posso cancelar quando quiser?", a: "Sim. Você avisa o time e a gente te orienta sobre os próximos passos." }, // PLACEHOLDER: confirm cancellation rules
  ],
};

export const finalCta = {
  title: "Pronto para parar de se preocupar com a parte burocrática?",
  cta: { href: "#planos", label: "Ver planos" },
};

export const footer = {
  about: "Contabilidade digital para pequenos e médios negócios.",
  contactTitle: "Contato",
  locationTitle: "Localização",
  copyright: `© ${new Date().getFullYear()} Exactra Contabilidade`,
  links: [
    { href: "/privacidade", label: "Política de privacidade" }, // PLACEHOLDER: page pending
    { href: "/termos", label: "Termos de uso" }, // PLACEHOLDER: page pending
  ],
  whatsappLabel: "Falar no WhatsApp",
};

