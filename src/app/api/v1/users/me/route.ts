import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

async function getSessionFromRequest(req: NextRequest) {
  const headers = new Headers(req.headers)
  if (!headers.get('cookie')) {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
    if (cookieHeader) headers.set('cookie', cookieHeader)
  }
  return auth.api.getSession({ headers })
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, email } = body

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  return NextResponse.json(updated)
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, phone } = body

  const data: Record<string, string> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (phone) data.phone = phone

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  })

  return NextResponse.json(updated)
}
