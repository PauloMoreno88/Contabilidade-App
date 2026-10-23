/**
 * Landing copy (variant G of the prototype, docs/prototype/exactra-prototype-g.html).
 * Everything the client may ask to change lives here, not in JSX.
 * The price and plan features come from @exactra/shared (CURRENT_PLAN).
 * Numbers and plan rules confirmed by Exactra on 22/10/2026 (no Google rating or testimonials for now).
 * Images: no photos of people (client requirement, 20/10/2026).
 */
import {
  Bell,
  Building2,
  Calculator,
  MessageSquare,
  Receipt,
  MonitorSmartphone,
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
    { href: "/blog", label: "Blog" },
    { href: "/#contato", label: "Contato" },
  ],
  // One entrance for customers (área do cliente) and the Exactra team.
  platform: { href: "/entrar", label: "Acessar plataforma" },
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
  badge: "Contabilidade online para todo o Brasil", // PLACEHOLDER: confirm nationwide service
  title: "A contabilidade que mostra quanto sobra para você.",
  lede: "A Exactra cuida dos impostos, prazos e declarações do seu CNPJ. Antes de contratar, você simula grátis e vê quanto pagaria em cada regime.",
  primaryCta: { href: "#simulador", label: "Fazer a simulação" },
  secondaryCta: { label: "Falar com um contador" },
};

export const about = {
  kicker: "Sobre nós",
  title: "Contabilidade que acompanha o seu negócio de perto",
  stats: [
    { value: "10", suffix: "+", label: "anos de experiência" },
    { value: "100", suffix: "+", label: "empresas atendidas" },
    { value: "1 dia", label: "para responder no WhatsApp" },
  ],
  simple: { title: "Sem complicação", text: "Você recebe as guias prontas para pagar e entende o que cada uma significa, sem termo técnico." },
  human: { title: "Atendimento de verdade", text: "Surgiu uma dúvida? Você fala com um contador da equipe, não com um robô." },
  focus: {
    title: "Feita para pequenos e médios negócios",
    text: "Do profissional liberal à empresa com equipe, a Exactra cuida da parte contábil para você decidir com mais segurança. Tudo online, para empresas de todo o Brasil.",
    link: { href: "#servicos", label: "Conhecer os serviços" },
  },
};

export const services: { kicker: string; title: string; sub: string; items: IconItem[] } = {
  kicker: "Serviços",
  title: "Tudo o que o seu CNPJ precisa",
  sub: "Escolha por onde começar. Se não souber, a simulação indica o caminho.",
  items: [
    { icon: Calculator, title: "Contabilidade completa", text: "Impostos calculados, guias e declarações obrigatórias entregues no prazo." },
    { icon: Users, title: "Folha e pró-labore", text: "Admissões, salários, encargos e o pró-labore dos sócios." },
    { icon: Scale, title: "Planejamento tributário", text: "Revisão do regime para você não pagar imposto a mais." },
    { icon: Receipt, title: "Notas fiscais", text: "Orientação para emitir certo e manter tudo organizado." },
    { icon: Building2, title: "Troca de contador", text: "Pedimos seus documentos ao contador atual e fazemos a transição, sem custo." },
    { icon: MonitorSmartphone, title: "Plataforma online", text: "Guias, documentos e relatórios do ano reunidos em um só lugar." },
  ],
};

export const whatsappBlock = {
  kicker: "Atendimento",
  title: "Atendimento de gente, no canal que você preferir",
  sub: "As guias chegam prontas para pagar no seu e-mail, os prazos são lembrados com antecedência e as dúvidas vão direto para quem cuida da sua empresa.",
  items: [
    { icon: Receipt, title: "Guias no seu e-mail", text: "Você recebe a guia do imposto pronta para pagar, antes de vencer. Em breve, também pela plataforma." },
    { icon: Bell, title: "Prazos lembrados", text: "Nada de multa por esquecer uma declaração." },
    { icon: MessageSquare, title: "Resposta humana", text: "Por WhatsApp, e-mail, telefone ou vídeo, no mesmo dia útil." },
  ] satisfies IconItem[],
  chat: {
    name: "Exactra Contabilidade",
    status: "online",
    messages: [
      { me: false, text: "Oi, Ana! Mandei para o seu e-mail a guia do Simples de outubro.", file: { name: "DAS outubro.pdf", due: "Vence em 20/11" }, after: "Valor: R$ 1.800,00. Dá para pagar por Pix.", time: "09:12" },
      { me: true, text: "Perfeito, obrigada! Esse mês faturei mais, muda alguma coisa?", time: "09:15" },
      { me: false, text: "Muda um pouco a alíquota, mas você continua no regime mais barato. Te mando o resumo hoje à tarde.", time: "09:18" },
    ],
  },
};

export const planSection = {
  kicker: "Plano",
  title: "Um preço fixo, sem surpresa no fim do mês",
  sub: "Tudo o que o seu CNPJ precisa num plano só, com contrato anual. O valor não sobe porque você faturou mais.",
  tag: "Um plano, tudo incluso",
  installments: (n: number) => `${n}x de`,
  perInstallment: "no cartão",
  upfront: (v: string) => `ou ${v} à vista no cartão, Pix ou boleto`,
  cta: "Contratar o Plano Exactra",
  simulate: { href: "#simulador", label: "Antes, simular quanto vou pagar de imposto" },
  includedTitle: "O que está incluso",
  payment: ["Contrato anual", "Cartão à vista ou parcelado, Pix ou boleto", "Sem taxa de adesão", "O valor não sobe se você faturar mais"],
};

export const band = {
  title: "Comece pela simulação. É grátis e leva 1 minuto.",
  text: "Você vê quanto pagaria de imposto em cada regime e quanto sobra por mês, já pagando a Exactra.",
  cta: { href: "#simulador", label: "Simular agora" },
};

export const faq: { kicker: string; title: string; sub: string; items: { q: string; a: string }[] } = {
  kicker: "Dúvidas",
  title: "Perguntas frequentes",
  sub: "Não achou a sua? Fale com a gente.",
  items: [
    { q: "A simulação é confiável?", a: "Ela usa as regras gerais de cada regime para dar uma boa ideia do seu caso. Antes de qualquer decisão, um contador confere sua atividade e sua cidade." },
    { q: "Como funciona a troca de contador?", a: "Depois que você contrata, pedimos seus documentos ao contador atual e fazemos a transição, sem custo." },
    { q: "O valor sobe se eu faturar mais?", a: "Não. O valor do plano é o mesmo durante todo o contrato, mesmo que você fature mais." },
    { q: "Como funciona o pagamento?", a: "O contrato é anual. No cartão, você paga à vista ou parcelado. No Pix ou no boleto, o valor anual é pago à vista. Não há taxa de adesão." },
    { q: "Posso desistir depois de contratar?", a: "Sim, em até 7 dias após a contratação, com reembolso integral, como garante o Código de Defesa do Consumidor. Depois disso, o contrato vale pelos 12 meses." },
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
        { href: "/#servicos", label: "Contabilidade completa" },
        { href: "/#servicos", label: "Folha e pró-labore" },
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
        { href: "/blog", label: "Blog" },
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
