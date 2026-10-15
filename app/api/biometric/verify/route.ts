import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";

import { requireAuth } from "@/lib/auth";
import { handle, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { rateLimit } from "@/lib/security";
import { expectedOrigin, rpID } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireAuth();
    if (!can(user, "listing:create"))
      throw new HttpError(403, "Only sellers can verify a fingerprint");
    if (!rateLimit(`biometric-verify:${user.id}`, 10, 60_000))
      throw new HttpError(429, "Too many attempts. Please wait a minute.");

    const body = await request.json().catch(() => null);
    const mode = body?.mode;
    const response = body?.response;
    if ((mode !== "register" && mode !== "authenticate") || !response)
      throw new HttpError(400, "Invalid request");

    const challenge = await prisma.webAuthnChallenge.findFirst({
      where: { userId: user.id, purpose: mode, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge)
      throw new HttpError(400, "Verification expired. Please try again.");

    const burned = await prisma.webAuthnChallenge.deleteMany({
      where: { id: challenge.id },
    });
    if (burned.count !== 1)
      throw new HttpError(400, "Verification expired. Please try again.");

    try {
      if (mode === "register") {
        const result = await verifyRegistrationResponse({
          response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: await expectedOrigin(),
          expectedRPID: rpID,
          requireUserVerification: true,
        });
        if (!result.verified || !result.registrationInfo)
          throw new Error("not verified");
        const { credential } = result.registrationInfo;

        const saved = await prisma.biometricCredential.create({
          data: {
            userId: user.id,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey),
            counter: credential.counter,
            transports: credential.transports ?? [],
            lastUsedAt: new Date(),
          },
        });
        const verification = await prisma.biometricVerification.create({
          data: { userId: user.id, credentialId: saved.id, method: "REGISTER" },
        });
        return NextResponse.json({
          success: true,
          verificationId: verification.id,
        });
      }

      const cred = await prisma.biometricCredential.findFirst({
        where: { userId: user.id, credentialId: response.id },
      });
      if (!cred) throw new Error("unknown credential");

      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: await expectedOrigin(),
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: cred.credentialId,
          publicKey: new Uint8Array(cred.publicKey),
          counter: cred.counter,
          transports: cred.transports as AuthenticatorTransportFuture[],
        },
      });
      if (!result.verified) throw new Error("not verified");

      await prisma.biometricCredential.update({
        where: { id: cred.id },
        data: {
          counter: result.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      });
      const verification = await prisma.biometricVerification.create({
        data: {
          userId: user.id,
          credentialId: cred.id,
          method: "AUTHENTICATE",
        },
      });
      return NextResponse.json({
        success: true,
        verificationId: verification.id,
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.error("[biometric] verification failed", err);
      throw new HttpError(
        400,
        "Fingerprint verification failed. Please try again.",
      );
    }
  });
}
