import type { EmailCampaign } from "@exactra/shared";

export const emailStatusLabels: Record<EmailCampaign["recipients"][number]["status"], string> = {
  PENDING: "Pendente", SENT: "Enviado", DELIVERED: "Entregue", FAILED: "Falhou",
};
