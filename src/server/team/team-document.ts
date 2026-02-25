export {
  normalizeDocumentNumber,
  validateDocumentByType,
  validateOrganizationIdentity as validateTeamIdentity,
} from '@/server/organization/organization-document'

export type {
  OrganizationDocumentType as TeamDocumentType,
  OrganizationType as TeamType,
} from '@/server/organization/organization-document'
