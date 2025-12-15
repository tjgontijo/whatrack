import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // TODO: Implement password change logic
  // const body = await req.json()
  // const { currentPassword, newPassword } = body
  // await auth.changePassword(session.user.id, currentPassword, newPassword)

  return NextResponse.json({ success: true })
}
