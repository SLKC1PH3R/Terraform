-- Convertit Template.category de l'enum Postgres "Category" vers TEXT, sans perte
-- de données. Idempotent : ne fait rien si la colonne est déjà en TEXT (exécuté
-- à chaque démarrage du conteneur, avant `prisma db push`).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Template' AND column_name = 'category' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "Template" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
    DROP TYPE IF EXISTS "Category";
  END IF;
END $$;
