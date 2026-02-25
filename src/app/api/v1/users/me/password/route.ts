import { NextRequest } from 'next/server'
import { applyOrganizationLegacyHeaders } from '@/server/http/legacy-organization'
import { handleLegacyPasswordChange } from '@/server/auth/legacy-password-change'

export async function PUT(req: NextRequest) {
  const response = await handleLegacyPasswordChange(req)
  return applyOrganizationLegacyHeaders(response, '/api/v1/me/account/password')
}

export async function PATCH(req: NextRequest) {
  return PUT(req)
}
