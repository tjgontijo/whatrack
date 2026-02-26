import { NextRequest } from 'next/server'
import { handlePasswordChange } from '@/server/auth/password-change'

export async function PATCH(request: NextRequest) {
  return handlePasswordChange(request)
}

export async function PUT(request: NextRequest) {
  return handlePasswordChange(request)
}
