// Passkeys for the human principal. WebAuthn via @simplewebauthn; credentials
// live in SQLite. Username-first: the human is resolved by username (or email),
// then the assertion is restricted to that human's credentials via
// allowCredentials; a human with no credential yet registers one instead.
//
// Challenges are held in a small in-memory map keyed by a random id the
// browser sends back with the assertion — a challenge is single-use and
// expires in 5 minutes. Restarting drops them; that only aborts in-flight
// ceremonies, which is exactly what we want.

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

import { findPasskey } from "@/lib/store";

export type Ceremony = { challenge: string; userId: string; at: number };
const g = globalThis as unknown as { __webauthnChallenges?: Map<string, Ceremony> };
const challenges = g.__webauthnChallenges ?? (g.__webauthnChallenges = new Map());
const TTL_MS = 5 * 60 * 1000;

export function rpID(): string {
  return new URL(process.env.ISSUER ?? "http://localhost:3000").hostname;
}
export function origin(): string {
  return process.env.ISSUER ?? "http://localhost:3000";
}

function saveChallenge(challenge: string, userId: string): string {
  const id = crypto.randomUUID();
  // opportunistic sweep
  const now = Date.now();
  for (const [k, v] of challenges) if (now - v.at > TTL_MS) challenges.delete(k);
  challenges.set(id, { challenge, userId, at: now });
  return id;
}

export function takeChallenge(id: string): Ceremony | null {
  const c = challenges.get(id);
  if (!c) return null;
  challenges.delete(id); // single use
  if (Date.now() - c.at > TTL_MS) return null;
  return c;
}

export async function registrationOptionsFor(opts: {
  user: { id: string; username: string; name: string };
  excludeCredentialIds: string[];
}) {
  const options = await generateRegistrationOptions({
    rpName: "YourID",
    rpID: rpID(),
    userID: new TextEncoder().encode(opts.user.id),
    userName: opts.user.username,
    userDisplayName: opts.user.name,
    attestationType: "none",
    excludeCredentials: opts.excludeCredentialIds.map((id) => ({ id })),
    authenticatorSelection: {
      residentKey: "required", // discoverable — usernameless login
      userVerification: "preferred",
    },
  });
  return { ceremonyId: saveChallenge(options.challenge, opts.user.id), options };
}

export async function verifyRegistration(opts: {
  ceremonyId: string;
  credential: unknown;
}): Promise<
  | { ok: true; userId: string; credential: { id: string; publicKey: string; counter: number; transports?: string[]; backed_up: boolean } }
  | { ok: false }
> {
  const ceremony = takeChallenge(opts.ceremonyId);
  if (!ceremony) return { ok: false };
  try {
    const verification = await verifyRegistrationResponse({
      response: opts.credential as never,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) return { ok: false };
    const info = verification.registrationInfo;
    return {
      ok: true,
      userId: ceremony.userId,
      credential: {
        id: info.credential.id,
        publicKey: Buffer.from(info.credential.publicKey).toString("base64"),
        counter: info.credential.counter,
        transports: info.credential.transports,
        backed_up: info.credentialDeviceType === "multiDevice" && info.credentialBackedUp,
      },
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Assertion options restricted to a known human's credentials (username-first).
 * The challenge is bound to the resolved user id, and verifyAuthentication
 * refuses a credential that belongs to someone else.
 */
export async function authenticationOptionsFor(credentialIds: string[], userId: string) {
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    allowCredentials: credentialIds.map((id) => ({ id })),
    userVerification: "preferred",
  });
  return { ceremonyId: saveChallenge(options.challenge, userId), options };
}

/**
 * Verify an assertion against the stored credential.
 */
export async function verifyAuthentication(opts: {
  ceremonyId: string;
  credentialId: string;
  credential: unknown;
}): Promise<{ ok: true; userId: string; counter: number } | { ok: false }> {
  const ceremony = takeChallenge(opts.ceremonyId);
  if (!ceremony) return { ok: false };
  const stored = findPasskey(opts.credentialId);
  if (!stored) return { ok: false };
  if (ceremony.userId && stored.user_id !== ceremony.userId) return { ok: false };
  try {
    const verification = await verifyAuthenticationResponse({
      response: opts.credential as never,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: origin(),
      expectedRPID: rpID(),
      credential: {
        id: opts.credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64")),
        counter: stored.counter,
      },
      requireUserVerification: false,
    });
    if (!verification.verified) return { ok: false };
    return {
      ok: true,
      userId: stored.user_id,
      counter: verification.authenticationInfo.newCounter,
    };
  } catch {
    return { ok: false };
  }
}
