/**
 * Blog copy and categories. The articles themselves live in src/content/blog/*.md
 * (one file per article, front matter on top). Articles cite public rules that
 * change over time: the accountant must review each one (front matter "reviewed").
 */
import { Building2, FileText, Landmark, Newspaper, Wallet, type LucideIcon } from "lucide-react";

export type BlogCategoryId = "abrir-empresa" | "impostos" | "gestao" | "contabilidade" | "novidades";

export const blogCategories: Record<BlogCategoryId, { label: string; icon: LucideIcon }> = {
  "abrir-empresa": { label: "Abrir empresa", icon: Building2 },
  impostos: { label: "Impostos", icon: Landmark },
  gestao: { label: "Gestão", icon: Wallet },
  contabilidade: { label: "Contabilidade", icon: FileText },
  novidades: { label: "Novidades", icon: Newspaper },
};

export const blogCopy = {
  seo: {
    title: "Blog da Exactra | Impostos, CNPJ e gestão sem complicação",
    description:
      "Artigos simples sobre abrir CNPJ, MEI, Simples Nacional, Fator R, pró-labore e reforma tributária, para quem quer entender o próprio negócio.",
  },
  kicker: "Blog",
  title: "Entenda o seu CNPJ sem termo técnico",
  sub: "Impostos, abertura de empresa e gestão explicados de um jeito direto, para você decidir com mais segurança.",
  all: "Todos",
  filterLabel: "Filtrar por assunto",
  readingTime: (min: number) => `${min} min de leitura`,
  readMore: "Ler artigo",
  featured: "Destaque",
  breadcrumbHome: "Início",
  breadcrumbBlog: "Blog",
  tocTitle: "Neste artigo",
  updatedLabel: "Atualizado em",
  publishedLabel: "Publicado em",
  author: "Equipe Exactra Contabilidade",
  // Shown on every article: the rules change and each case is different.
  notice: "Conteúdo informativo. As regras mudam com frequência e cada empresa tem um caso diferente: antes de decidir, fale com um contador.",
  related: "Continue lendo",
  backToBlog: "Ver todos os artigos",
  cta: {
    title: "Quer saber quanto você pagaria de imposto?",
    text: "Responda 5 perguntas e veja, em 1 minuto, quanto pagaria em cada regime e quanto sobra por mês.",
    simulate: { href: "/#simulador", label: "Fazer a simulação grátis" },
    whatsapp: "Falar com um contador",
  },
  inlineCta: {
    title: "Simule o seu caso",
    text: "Veja quanto você pagaria de imposto em cada regime, grátis e sem compromisso.",
    label: "Simular agora",
  },
};
