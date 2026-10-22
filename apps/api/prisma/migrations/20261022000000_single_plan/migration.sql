-- Single plan on sale (docs/plano.md, decision 20). Additive: legacy values stay for stored contracts.
ALTER TYPE "PlanId" ADD VALUE IF NOT EXISTS 'exactra';
