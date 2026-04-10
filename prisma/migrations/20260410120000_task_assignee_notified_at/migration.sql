-- Notification assignation : horodatage du dernier envoi vers l’assigné (badge jusqu’à « vu »).
ALTER TABLE "agenda"."Task" ADD COLUMN IF NOT EXISTS "assigneeNotifiedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Task_assignedToId_idx" ON "agenda"."Task"("assignedToId");
