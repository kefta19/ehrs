import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";

import { requireAuth } from "@/lib/auth";
import { handle, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { rateLimit } from "@/lib/security";
import { rpID, rpName } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireAuth();
    if (!can(user, "listing:create"))
      throw new HttpError(403, "Only sellers can verify a fingerprint");
    if (!rateLimit(`biometric-options:${user.id}`, 10, 60_000))
      throw new HttpError(429, "Too many attempts. Please wait a minute.");

    const body = await request.json().catch(() => ({}));
    const creds = await prisma.biometricCredential.findMany({
      where: { userId: user.id },
    });
    const register = creds.length === 0 || body?.forceRegister === true;

    await prisma.webAuthnChallenge.deleteMany({ where: { userId: user.id } });

    const toDescriptor = (c: (typeof creds)[number]) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    });

    const options = register
      ? await generateRegistrationOptions({
          rpName,
          rpID,
          userName: user.email,
          userDisplayName: user.name,
          userID: new TextEncoder().encode(user.id),
          attestationType: "none",
          excludeCredentials: creds.map(toDescriptor),
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
        })
      : await generateAuthenticationOptions({
          rpID,
          userVerification: "required",
          allowCredentials: creds.map(toDescriptor),
        });

    const mode = register ? "register" : "authenticate";
    await prisma.webAuthnChallenge.create({
      data: {
        userId: user.id,
        challenge: options.challenge,
        purpose: mode,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    return NextResponse.json({ mode, options });
  });
}
