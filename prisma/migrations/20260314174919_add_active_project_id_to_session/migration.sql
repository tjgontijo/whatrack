-- Add activeProjectId column to session table
ALTER TABLE "session" ADD COLUMN "activeProjectId" UUID;
