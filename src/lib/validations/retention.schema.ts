import { z } from "zod";

export const updateRetentionPolicySchema = z.object({
  dataType: z.enum(["AUDIT_LOG", "NOTIFICATION", "INTEGRATION_EVENT", "METRIC_SNAPSHOT", "TRASH"]),
  retentionDays: z.number().int().min(1).max(3650),
  isActive: z.boolean(),
});
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;
