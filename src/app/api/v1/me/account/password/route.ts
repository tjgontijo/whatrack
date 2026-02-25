import { NextRequest } from 'next/server'
import { handleLegacyPasswordChange } from '@/server/auth/legacy-password-change'

export async function PATCH(request: NextRequest) {
  return handleLegacyPasswordChange(request)
}

export async function PUT(request: NextRequest) {
  return handleLegacyPasswordChange(request)
}
