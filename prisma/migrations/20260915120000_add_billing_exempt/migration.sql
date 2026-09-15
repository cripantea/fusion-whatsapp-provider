-- AddColumn: billing_exempt flag per esenzione dalla fatturazione (account test/proprietario)
ALTER TABLE "agencies" ADD COLUMN "billing_exempt" BOOLEAN NOT NULL DEFAULT false;

-- Imposta billing_exempt = true per l'account del proprietario (cripantea@gmail.com)
UPDATE "agencies"
SET "billing_exempt" = true
WHERE id IN (
  SELECT agency_id FROM users WHERE email = 'cripantea@gmail.com'
);
