-- Renomme le statut Kanban « issues » → « urgent » (bugs / à traiter immédiatement).
-- À exécuter sur les bases déjà déployées avec l’ancienne valeur.
-- Si la base a été créée après ce changement (enum sans « issues »), ignorer cette migration ou la marquer comme appliquée sans l’exécuter.
ALTER TYPE "agenda"."TaskStatus" RENAME VALUE 'issues' TO 'urgent';
