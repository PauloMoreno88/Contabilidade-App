-- Checklist items can start in the open competence or a later one (docs/plano.md, decision 31). Additive.
ALTER TABLE "ChecklistItem" ADD COLUMN "startsCompetence" TEXT;
