-- RBAC advanced model per organization
CREATE TABLE "organization_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationRoleId" UUID NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_permission_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_permission_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_roles_organizationId_key_key" ON "organization_roles"("organizationId", "key");
CREATE UNIQUE INDEX "organization_roles_organizationId_name_key" ON "organization_roles"("organizationId", "name");
CREATE INDEX "organization_roles_organizationId_idx" ON "organization_roles"("organizationId");
CREATE INDEX "organization_roles_isSystem_idx" ON "organization_roles"("isSystem");

CREATE UNIQUE INDEX "organization_role_permissions_organizationRoleId_permissionKey_key" ON "organization_role_permissions"("organizationRoleId", "permissionKey");
CREATE INDEX "organization_role_permissions_organizationRoleId_idx" ON "organization_role_permissions"("organizationRoleId");
CREATE INDEX "organization_role_permissions_permissionKey_idx" ON "organization_role_permissions"("permissionKey");

CREATE UNIQUE INDEX "member_permission_overrides_memberId_permissionKey_key" ON "member_permission_overrides"("memberId", "permissionKey");
CREATE INDEX "member_permission_overrides_memberId_idx" ON "member_permission_overrides"("memberId");
CREATE INDEX "member_permission_overrides_permissionKey_idx" ON "member_permission_overrides"("permissionKey");
CREATE INDEX "member_permission_overrides_effect_idx" ON "member_permission_overrides"("effect");

CREATE INDEX "member_organizationId_role_idx" ON "member"("organizationId", "role");

ALTER TABLE "organization_roles"
ADD CONSTRAINT "organization_roles_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_role_permissions"
ADD CONSTRAINT "organization_role_permissions_organizationRoleId_fkey"
FOREIGN KEY ("organizationRoleId") REFERENCES "organization_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_permission_overrides"
ADD CONSTRAINT "member_permission_overrides_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill system roles for every organization
INSERT INTO "organization_roles" (
  "id",
  "organizationId",
  "key",
  "name",
  "description",
  "isSystem",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  o."id",
  r."key",
  r."name",
  r."description",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organization" o
CROSS JOIN (
  VALUES
    ('owner', 'Owner', 'Acesso total ao tenant e configurações críticas.'),
    ('admin', 'Administrador', 'Gerencia usuários e operações diárias.'),
    ('user', 'Usuário', 'Acesso operacional básico.')
) AS r("key", "name", "description")
ON CONFLICT ("organizationId", "key") DO NOTHING;

-- Backfill permissions for system roles
INSERT INTO "organization_role_permissions" (
  "id",
  "organizationRoleId",
  "permissionKey",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  r."id",
  p."permissionKey",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organization_roles" r
JOIN (
  VALUES
    -- owner
    ('owner', 'view:dashboard'),
    ('owner', 'view:analytics'),
    ('owner', 'view:whatsapp'),
    ('owner', 'manage:whatsapp'),
    ('owner', 'view:ai'),
    ('owner', 'manage:ai'),
    ('owner', 'view:campaigns'),
    ('owner', 'manage:campaigns'),
    ('owner', 'view:integrations'),
    ('owner', 'manage:integrations'),
    ('owner', 'view:audit'),
    ('owner', 'manage:team_members'),
    ('owner', 'manage:team_settings'),
    ('owner', 'view:leads'),
    ('owner', 'manage:leads'),
    ('owner', 'view:tickets'),
    ('owner', 'manage:tickets'),
    ('owner', 'view:sales'),
    ('owner', 'manage:sales'),
    ('owner', 'view:items'),
    ('owner', 'manage:items'),
    ('owner', 'view:meta'),
    ('owner', 'manage:meta'),
    ('owner', 'manage:members'),
    ('owner', 'manage:organization'),
    ('owner', 'manage:settings'),
    -- admin
    ('admin', 'view:dashboard'),
    ('admin', 'view:analytics'),
    ('admin', 'view:whatsapp'),
    ('admin', 'manage:whatsapp'),
    ('admin', 'view:ai'),
    ('admin', 'manage:ai'),
    ('admin', 'view:campaigns'),
    ('admin', 'manage:campaigns'),
    ('admin', 'view:integrations'),
    ('admin', 'manage:integrations'),
    ('admin', 'view:audit'),
    ('admin', 'manage:team_members'),
    ('admin', 'view:leads'),
    ('admin', 'manage:leads'),
    ('admin', 'view:tickets'),
    ('admin', 'manage:tickets'),
    ('admin', 'view:sales'),
    ('admin', 'manage:sales'),
    ('admin', 'view:items'),
    ('admin', 'manage:items'),
    ('admin', 'view:meta'),
    ('admin', 'manage:meta'),
    ('admin', 'manage:members'),
    -- user
    ('user', 'view:dashboard'),
    ('user', 'view:whatsapp'),
    ('user', 'view:ai'),
    ('user', 'view:campaigns'),
    ('user', 'view:integrations'),
    ('user', 'view:leads'),
    ('user', 'view:tickets'),
    ('user', 'view:sales'),
    ('user', 'view:items'),
    ('user', 'view:meta')
) AS p("roleKey", "permissionKey")
ON r."key" = p."roleKey"
WHERE r."isSystem" = true
ON CONFLICT ("organizationRoleId", "permissionKey") DO NOTHING;

-- Ensure existing members always reference a valid role key inside their organization
UPDATE "member" m
SET "role" = 'user'
WHERE NOT EXISTS (
  SELECT 1
  FROM "organization_roles" r
  WHERE r."organizationId" = m."organizationId"
    AND r."key" = m."role"
);
