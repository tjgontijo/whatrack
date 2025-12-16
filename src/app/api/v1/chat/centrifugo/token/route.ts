/**
 * POST /api/v1/chat/centrifugo/token
 *
 * Generate a JWT token for Centrifugo WebSocket connection.
 * The token allows the user to subscribe to their organization's channels.
 */

import { NextResponse } from "next/server";
import { validateFullAccess } from "@/server/auth/validate-organization-access";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  const access = await validateFullAccess(request);

  if (!access.hasAccess || !access.organizationId || !access.userId) {
    return NextResponse.json(
      { error: access.error ?? "Access denied" },
      { status: 403 }
    );
  }

  const secret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY;

  if (!secret) {
    console.error("[centrifugo/token] CENTRIFUGO_TOKEN_HMAC_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Generate JWT token for Centrifugo
  // User can subscribe to their org channel and any conversation channels
  const token = jwt.sign(
    {
      sub: access.userId,
      // Allow subscription to org-level channel for conversation list updates
      channels: [`chat:org:${access.organizationId}`],
      // Client can subscribe to conversation channels dynamically
      // Centrifugo will validate via subscription token or server-side subscribe proxy
    },
    secret,
    { expiresIn: "24h" }
  );

  return NextResponse.json({
    token,
    channels: {
      organization: `chat:org:${access.organizationId}`,
    },
  });
}
