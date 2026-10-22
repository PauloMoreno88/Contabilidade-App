/**
 * Landing copy (variant G of the prototype, docs/prototype/exactra-prototype-g.html).
 * Everything the client may ask to change lives here, not in JSX.
 * The price and plan features come from @exactra/shared (CURRENT_PLAN).
 * PLACEHOLDER: trust numbers, rating and testimonials must be confirmed by Exactra.
 * Images: no photos of people (client requirement, 20/10/2026).
 */
import {
  Bell,
  Building2,
  Calculator,
  MessageSquare,
  Receipt,
  Rocket,
  Scale,
  Users,
  type LucideIcon,
} from "lucide-react";

type Item = { title: string; text: string };
type IconItem = Item & { icon: LucideIcon };

// Contact data and the onboarding timeline are shared with the e-mails (packages/emails).
export { contact, onboarding, whatsappLink } from "@exactra/shared";

export const seo = {
  title: "Exactra Contabilidade | A contabilidade que mostra quanto sobra para você",
  description:
    "A Exactra cuida dos impostos, prazos e declarações do seu CNPJ. Simule grátis em 1 minuto quanto você pagaria em cada regime.",
};

export const nav = {
  links: [
    { href: "/#simulador", label: "Simulador" },
    { href: "/#sobre", label: "Sobre nós" },
    { href: "/#servicos", label: "Serviços" },
    { href: "/#plano", label: "Plano" },
    { href: "/#contato", label: "Contato" },
  ],
  // One entrance for customers and the Exactra team. Today only the admin panel exists.
  platform: { href: "/admin/login", label: "Acessar plataforma" },
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
};

export const images = {
  hero: { src: "/img/hero.jpg", alt: "Notebook aberto com um painel de gráficos financeiros" },
  about: { src: "/img/mesa.jpg", alt: "Mesa de trabalho com um gráfico de crescimento, régua e canetas" },
  band: { src: "/img/prancheta.jpg", alt: "" },
  contact: { src: "/img/escritorio.jpg", alt: "" },
};

export const hero = {
  rating: { value: "4,9", text: "no Google, 120 avaliações" }, // PLACEHOLDER
  title: "A contabilidade que mostra quanto sobra para você.",
  lede: "A Exactra cuida dos impostos, prazos e declarações do seu CNPJ. Antes de contratar, você simula grátis e vê quanto pagaria em cada regime.",
  primaryCta: { href: "#simulador", label: "Fazer a simulação" },
  secondaryCta: { label: "Falar com um contador" },
};

export const about = {
  kicker: "Sobre nós",
  title: "Contabilidade que acompanha o seu negócio de perto",
  // PLACEHOLDER: confirm with Exactra.
  stats: [
    { value: "10", suffix: "+", label: "anos de experiência" },
    { value: "500", suffix: "+", label: "empresas atendidas" },
    { value: "1 dia", label: "para responder no WhatsApp" },
  ],
  simple: { title: "Sem complicação", text: "Você recebe as guias prontas para pagar e entende o que cada uma significa, sem termo técnico." },
  human: { title: "Atendimento de verdade", text: "Surgiu uma dúvida? Você fala com um contador da equipe, não com um robô." },
  focus: {
    title: "Feita para pequenos e médios negócios",
    text: "Do primeiro CNPJ à empresa com equipe, a Exactra cuida da parte contábil para você decidir com mais segurança. Tudo online, para empresas de todo o Brasil.",
    link: { href: "#servicos", label: "Conhecer os serviços" },
  },
};

export const services: { kicker: string; title: string; sub: string; items: IconItem[] } = {
  kicker: "Serviços",
  title: "Tudo o que o seu CNPJ precisa",
  sub: "Escolha por onde começar. Se não souber, a simulação indica o caminho.",
  items: [
    { icon: Rocket, title: "Abertura de empresa", text: "Do registro até o CNPJ pronto para emitir nota fiscal." },
    { icon: Calculator, title: "Contabilidade mensal", text: "Impostos calculados, guias e declarações entregues no prazo." },
    { icon: Users, title: "Folha e pró-labore", text: "Admissões, salários, encargos e o pró-labore dos sócios." },
    { icon: Scale, title: "Planejamento tributário", text: "Revisão do regime para você não pagar imposto a mais." },
    { icon: Receipt, title: "Notas fiscais", text: "Orientação para emitir certo e manter tudo organizado." },
    { icon: Building2, title: "Troca de contador", text: "Pedimos seus documentos ao contador atual e fazemos a transição." },
  ],
};

export const whatsappBlock = {
  kicker: "Atendimento",
  title: "Sua contabilidade cabe no WhatsApp",
  sub: "As guias chegam prontas para pagar, os prazos são lembrados com antecedência e as dúvidas vão direto para quem cuida da sua empresa.",
  // PLACEHOLDER: confirm how Exactra sends the tax guides today.
  items: [
    { icon: Receipt, title: "Guias no dia certo", text: "Você recebe o boleto ou o Pix do imposto antes de vencer." },
    { icon: Bell, title: "Prazos lembrados", text: "Nada de multa por esquecer uma declaração." },
    { icon: MessageSquare, title: "Resposta humana", text: "Um contador responde, em dias úteis." },
  ] satisfies IconItem[],
  chat: {
    name: "Exactra Contabilidade",
    status: "online",
    messages: [
      { me: false, text: "Oi, Ana! A guia do Simples de outubro já está pronta.", file: { name: "DAS outubro.pdf", due: "Vence em 20/11" }, after: "Valor: R$ 1.800,00. Dá para pagar por Pix.", time: "09:12" },
      { me: true, text: "Perfeito, obrigada! Esse mês faturei mais, muda alguma coisa?", time: "09:15" },
      { me: false, text: "Muda um pouco a alíquota, mas você continua no regime mais barato. Te mando o resumo hoje à tarde.", time: "09:18" },
    ],
  },
};

export const planSection = {
  kicker: "Plano",
  title: "Um preço fixo, sem surpresa no fim do mês",
  sub: "Tudo o que o seu CNPJ precisa num plano só. O valor não sobe porque você faturou mais.",
  tag: "Um plano, tudo incluso",
  perMonth: "/mês",
  prepaidNote: "No Pix ou boleto, com desconto pagando 3, 6 ou 12 meses.",
  cta: "Contratar o Plano Exactra",
  simulate: { href: "#simulador", label: "Antes, simular quanto vou pagar de imposto" },
  includedTitle: "O que está incluso",
  // PLACEHOLDER: limit to confirm with the accountant (same rule as needsQuote in @exactra/shared).
  quote: { text: "Mais de 3 funcionários ou uma operação maior?", link: "Peça um orçamento" },
  payment: ["Cartão: mensal, cancele quando quiser", "Pix ou boleto: 3, 6 ou 12 meses com desconto", "Sem taxa de adesão"],
};

export const testimonials = {
  kicker: "Depoimentos",
  title: "Quem já é cliente recomenda",
  // PLACEHOLDER: replace with real Google reviews, with the customers' permission.
  score: { value: "4,9", text: "Nota média no Google, com 120 avaliações" },
  items: [
    { initials: "MC", name: "Nome da cliente", role: "Psicóloga, Cidade", quote: "Pela primeira vez eu entendo o que estou pagando. A simulação já mostrou que eu estava no regime errado." },
    { initials: "RS", name: "Nome do cliente", role: "Dono de restaurante, Cidade", quote: "Troquei de contador sem precisar ligar para o antigo. Eles resolveram tudo e me mantiveram informado." },
    { initials: "JP", name: "Nome do cliente", role: "Consultor, Cidade", quote: "Respondem no WhatsApp no mesmo dia. Abri meu CNPJ sem sair de casa." },
  ],
};

export const band = {
  title: "Comece pela simulação. É grátis e leva 1 minuto.",
  text: "Você vê quanto pagaria de imposto em cada regime e quanto sobra por mês, já com a mensalidade da Exactra.",
  cta: { href: "#simulador", label: "Simular agora" },
};

export const faq: { kicker: string; title: string; sub: string; items: { q: string; a: string }[] } = {
  kicker: "Dúvidas",
  title: "Perguntas frequentes",
  sub: "Não achou a sua? Fale com a gente.",
  items: [
    { q: "A simulação é confiável?", a: "Ela usa as regras gerais de cada regime para dar uma boa ideia do seu caso. Antes de qualquer decisão, um contador confere sua atividade e sua cidade." },
    { q: "Preciso já ter CNPJ?", a: "Não. A abertura faz parte da contratação. Você paga só as taxas do governo." },
    { q: "Como funciona a troca de contador?", a: "Depois que você contrata, pedimos seus documentos ao contador atual e fazemos a transição." },
    { q: "A mensalidade sobe se eu faturar mais?", a: "Não. Ela muda só se a empresa passar a ter mais de 3 funcionários." }, // PLACEHOLDER: confirm with the accountant
    { q: "Como funciona o pagamento?", a: "No cartão, a cobrança é mensal e recorrente. No Pix ou boleto, você paga 3, 6 ou 12 meses adiantado, com desconto." },
    { q: "Posso cancelar quando quiser?", a: "Sim. No cartão, a cobrança para no mês seguinte." }, // PLACEHOLDER: confirm cancellation rules
  ],
};

export const contactSection = {
  title: "Fale conosco",
  text: "Chame a gente no WhatsApp ou mande um e-mail. Respondemos no mesmo dia útil. Se preferir, ligue:",
  whatsapp: "Chamar no WhatsApp",
  emailLabel: "E-mail",
  hoursLabel: "Atendimento",
};

export const footer = {
  about: "Contabilidade online para pequenos e médios negócios de todo o Brasil.",
  columns: [
    {
      title: "Serviços",
      links: [
        { href: "/#servicos", label: "Abertura de empresa" },
        { href: "/#servicos", label: "Contabilidade mensal" },
        { href: "/#servicos", label: "Troca de contador" },
        { href: "/#servicos", label: "Planejamento tributário" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { href: "/#sobre", label: "Sobre nós" },
        { href: "/#plano", label: "Plano" },
        { href: "/#simulador", label: "Simulador" },
        { href: "/admin/login", label: "Acessar plataforma" },
      ],
    },
  ],
  contactTitle: "Contato",
  crc: "CRC: a confirmar", // PLACEHOLDER: registration number of the responsible accountant
  copyright: `© ${new Date().getFullYear()} Exactra Contabilidade`,
  links: [
    { href: "/privacidade", label: "Política de privacidade" },
    { href: "/termos", label: "Termos de uso" },
  ],
  whatsappLabel: "Falar no WhatsApp",
};

export const mobileBar = { simulate: "Simular grátis", whatsapp: "WhatsApp" };
