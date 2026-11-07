import type { EmailCampaign } from "@exactra/shared";

export const emailStatusLabels: Record<EmailCampaign["recipients"][number]["status"], string> = {
  PENDING: "Pendente", SENT: "Enviado", DELIVERED: "Entregue", FAILED: "Falhou",
};

export const emailStatusStyles = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  SENT: "bg-surface-2 text-navy-3 ring-line",
  DELIVERED: "bg-ok-tint text-ok ring-ok/15",
  FAILED: "bg-brand-tint text-brand-dark ring-brand/15",
};

export const emailStatusDescriptions = {
  PENDING: "Aguardando envio ou nova tentativa de entrega.",
  SENT: "Aceito pelo provedor de e-mail, aguardando confirmação de entrega.",
  DELIVERED: "Recebimento confirmado pelo servidor do destinatário. Não indica leitura.",
  FAILED: "Ocorreu um erro no envio ou uma rejeição definitiva.",
};
