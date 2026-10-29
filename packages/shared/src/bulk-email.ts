import { z } from "zod";

export const emailRecipientsSchema = z.array(z.object({ id: z.string(), name: z.string(), email: z.string().email() }));
export const bulkEmailSchema = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(1000),
  subject: z.string().trim().min(1).max(200).refine((v) => !/[\r\n]/.test(v)),
  message: z.string().trim().min(1).max(20000),
});
export const bulkEmailResultSchema = z.object({
  sent: z.number().int().nonnegative(),
  failedCustomerIds: z.array(z.string()),
});
export type BulkEmailInput = z.infer<typeof bulkEmailSchema>;
