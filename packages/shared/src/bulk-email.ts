import { z } from "zod";

export const emailRecipientsSchema = z.array(z.object({ id: z.string(), name: z.string(), email: z.string().email() }));
export const bulkEmailSchema = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(1000),
  subject: z.string().trim().min(1).max(200).refine((v) => !/[\r\n]/.test(v)),
  message: z.string().trim().min(1).max(20000),
});
export const bulkEmailResultSchema = z.object({
  campaignId: z.string(),
  sent: z.number().int().nonnegative(),
  failedCustomerIds: z.array(z.string()),
});
export type BulkEmailInput = z.infer<typeof bulkEmailSchema>;

export const emailDeliveryStatusSchema = z.enum(["PENDING", "SENT", "DELIVERED", "FAILED"]);
const campaignSchema = z.object({
  id: z.string(), subject: z.string(), createdAt: z.string().datetime(), createdBy: z.string(),
  recipientCount: z.number().int().nonnegative(),
});
export const emailHistoryQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) });
export const emailHistorySchema = z.object({
  items: z.array(campaignSchema), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(),
});
export const emailCampaignSchema = campaignSchema.extend({
  message: z.string(),
  recipients: z.array(z.object({
    id: z.string(), customerId: z.string(), name: z.string(), email: z.string().email(),
    status: emailDeliveryStatusSchema, updatedAt: z.string().datetime(),
  })),
});
export type EmailCampaign = z.infer<typeof emailCampaignSchema>;
