/**
 * DRAFT legal texts. Not reviewed by a lawyer: everything here must be
 * validated before launch. Bracketed items ([...]) are PLACEHOLDERS for
 * company data Exactra still has to provide.
 */
import { contact } from "./site";

export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };
export type LegalDoc = { title: string; updatedAt: string; intro: string; sections: LegalSection[] };

export const legalCopy = {
  draftNotice: "Rascunho, sujeito a revisão jurídica. Este texto ainda não tem validade e pode mudar antes do lançamento.",
  updatedLabel: "Última atualização",
  otherDoc: { privacy: { href: "/termos", label: "Ler os termos de uso" }, terms: { href: "/privacidade", label: "Ler a política de privacidade" } },
};

const company = "[Razão social da Exactra], CNPJ [00.000.000/0001-00], com sede em [endereço completo]"; // PLACEHOLDER

export const privacyPolicy: LegalDoc = {
  title: "Política de privacidade",
  updatedAt: "04/10/2026",
  intro: `Esta política explica quais dados pessoais a Exactra Contabilidade (${company}) coleta no site, para que usa e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).`,
  sections: [
    {
      title: "Quais dados coletamos",
      items: [
        "No simulador: nome, WhatsApp, e-mail (opcional) e as respostas sobre o seu negócio, como perfil, faturamento estimado e número de funcionários.",
        "Na contratação: nome completo, e-mail, telefone e CPF ou CNPJ.",
        "Dados de pagamento, como número do cartão, são informados direto no ambiente da Stripe. A Exactra não recebe nem guarda esses dados.",
        "Dados de navegação: origem da visita (parâmetros de campanha, como utm_source) e registros técnicos de acesso.",
      ],
    },
    {
      title: "Para que usamos",
      items: [
        "Mostrar a estimativa do simulador e entrar em contato sobre ela, se você autorizar.",
        "Prestar os serviços contratados, emitir cobranças e enviar avisos sobre o contrato, como confirmação de pagamento e vencimento.",
        "Cumprir obrigações legais e fiscais.",
        "Entender quais campanhas trazem visitantes, sem identificar você individualmente.",
      ],
    },
    {
      title: "Base legal",
      paragraphs: [
        "Usamos os dados do simulador com base no seu consentimento. Os dados da contratação são tratados para executar o contrato e cumprir obrigações legais. Você pode retirar o consentimento a qualquer momento, sem afetar o que já foi feito antes.",
      ],
    },
    {
      title: "Com quem compartilhamos",
      paragraphs: ["Compartilhamos dados só com empresas que nos ajudam a operar o serviço, e só o necessário:"],
      items: [
        "Stripe: processamento de pagamentos (cartão, Pix e boleto).",
        "Resend: envio de e-mails.",
        "Render e Neon: hospedagem do site e do banco de dados.",
        "Autoridades públicas, quando a lei exigir.",
      ],
    },
    {
      title: "Por quanto tempo guardamos",
      paragraphs: [
        "Os dados do simulador ficam guardados por até [prazo a definir] se você não contratar. Os dados da contratação ficam guardados enquanto o contrato durar e pelo prazo exigido pela legislação fiscal e contábil.", // PLACEHOLDER
      ],
    },
    {
      title: "Cookies",
      paragraphs: [
        "O site público não usa cookies de publicidade. O painel administrativo, usado só pela equipe da Exactra, usa um cookie de sessão para manter o login.",
      ],
    },
    {
      title: "Seus direitos",
      paragraphs: ["Você pode pedir a qualquer momento:"],
      items: [
        "Confirmação de que tratamos seus dados e acesso a eles.",
        "Correção de dados incompletos ou desatualizados.",
        "Exclusão dos dados tratados com base no consentimento.",
        "Portabilidade e informações sobre com quem compartilhamos.",
        "Revogação do consentimento.",
      ],
    },
    {
      title: "Segurança",
      paragraphs: [
        "O acesso aos dados é restrito à equipe da Exactra, com login protegido por verificação em duas etapas. As conexões com o site são criptografadas.",
      ],
    },
    {
      title: "Contato",
      paragraphs: [
        `Para exercer seus direitos ou tirar dúvidas, escreva para ${contact.email}. Encarregado pelo tratamento de dados: [nome do encarregado].`, // PLACEHOLDER
      ],
    },
  ],
};

export const termsOfUse: LegalDoc = {
  title: "Termos de uso",
  updatedAt: "04/10/2026",
  intro: `Estes termos valem para o uso do site e para a contratação online dos serviços da Exactra Contabilidade (${company}). Ao contratar, você declara que leu e concorda com eles.`,
  sections: [
    {
      title: "O simulador",
      paragraphs: [
        "O simulador mostra uma estimativa com base nas respostas que você informa. Ele não substitui a análise de um contador: o enquadramento tributário definitivo depende da análise da Exactra depois da contratação.",
      ],
    },
    {
      title: "Planos e preços",
      paragraphs: [
        "Os serviços incluídos em cada plano e os preços são os informados no site no momento da contratação. A Exactra pode mudar planos e preços para novas contratações, avisando quem já é cliente com antecedência de [prazo a definir].", // PLACEHOLDER
      ],
    },
    {
      title: "Pagamento",
      items: [
        "Cartão de crédito: cobrança mensal e automática enquanto o contrato estiver ativo.",
        "Pix ou boleto: pagamento único e antecipado de 3, 6 ou 12 meses, com desconto. Não renova sozinho: avisamos antes do vencimento.",
        "O contrato começa quando o pagamento é confirmado. No boleto, a confirmação leva de 1 a 3 dias úteis.",
      ],
    },
    {
      title: "Cancelamento",
      paragraphs: [
        "[Regras de cancelamento, multa e reembolso a definir com a Exactra e o contador.]", // PLACEHOLDER
      ],
    },
    {
      title: "Suas responsabilidades",
      items: [
        "Informar dados verdadeiros e mantê-los atualizados.",
        "Enviar os documentos pedidos nos prazos combinados, para que a Exactra cumpra as obrigações do seu CNPJ em dia.",
      ],
    },
    {
      title: "Responsabilidades da Exactra",
      paragraphs: [
        "A Exactra presta os serviços contábeis descritos no plano contratado, seguindo as normas da profissão. [Limites de responsabilidade a definir.]", // PLACEHOLDER
      ],
    },
    {
      title: "Dados pessoais",
      paragraphs: ["O tratamento dos seus dados segue a nossa política de privacidade."],
    },
    {
      title: "Foro",
      paragraphs: ["Fica eleito o foro da comarca de [cidade/UF] para resolver qualquer questão sobre estes termos."], // PLACEHOLDER
    },
  ],
};
