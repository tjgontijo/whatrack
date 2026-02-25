-- Add team identity fields to organization (team-first model)
ALTER TABLE "organization"
ADD COLUMN "teamType" TEXT,
ADD COLUMN "documentType" TEXT,
ADD COLUMN "documentNumber" TEXT;

CREATE INDEX "organization_documentNumber_idx" ON "organization"("documentNumber");

-- Backfill from existing CNPJ data when available
UPDATE "organization" AS o
SET
  "teamType" = 'pessoa_juridica',
  "documentType" = 'cnpj',
  "documentNumber" = regexp_replace(oc."cnpj", '\\D', '', 'g')
FROM "organization_companies" AS oc
WHERE oc."organizationId" = o."id"
  AND oc."cnpj" IS NOT NULL
  AND o."documentNumber" IS NULL;

-- Backfill from CPF profile when CNPJ is not available
UPDATE "organization" AS o
SET
  "teamType" = 'pessoa_fisica',
  "documentType" = 'cpf',
  "documentNumber" = regexp_replace(op."cpf", '\\D', '', 'g')
FROM "organization_profiles" AS op
WHERE op."organizationId" = o."id"
  AND op."cpf" IS NOT NULL
  AND o."documentNumber" IS NULL;
