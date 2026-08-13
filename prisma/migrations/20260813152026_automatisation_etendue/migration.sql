-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationActionType" ADD VALUE 'ESCALATE_TO_MANAGER';
ALTER TYPE "AutomationActionType" ADD VALUE 'MARK_TASK_BLOCKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTrigger" ADD VALUE 'TASK_OVERDUE';
ALTER TYPE "AutomationTrigger" ADD VALUE 'PROJECT_OVERDUE';
ALTER TYPE "AutomationTrigger" ADD VALUE 'BUDGET_EXCEEDED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'RISK_CRITICAL';

