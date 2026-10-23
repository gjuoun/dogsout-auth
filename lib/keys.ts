import { generateKeyPair, exportJWK, importJWK, SignJWT, type JWK, type CryptoKey } from "jose";
import { meta } from "@/lib/db";

// The signing key. Public half is published at /.well-known/jwks.json so any
// client can verify an id_token without ever calling us.
//
// The private half persists in SQLite (meta table) — generated once, reloaded
// on every boot, so a restart never invalidates tokens clients already hold.
// Multiple keys / rotation is future work; today there is exactly one.
type Keys = { privateKey: CryptoKey; publicJwk: JWK; kid: string };

const META_KEY = "signing_key_rs256";
const KID = "dogsout-1";

const g = globalThis as unknown as { __oauthkeys?: Promise<Keys> };

export const keys: Promise<Keys> =
  g.__oauthkeys ??
  (g.__oauthkeys = (async () => {
    const stored = meta.get(META_KEY);
    if (stored) {
      const jwk = JSON.parse(stored) as JWK;
      const privateKey = (await importJWK(jwk, "RS256")) as CryptoKey;
      const publicJwk: JWK = { ...jwk };
      delete publicJwk.d; // the private exponent never leaves the vault row
      publicJwk.kid = KID;
      publicJwk.use = "sig";
      publicJwk.alg = "RS256";
      return { privateKey, publicJwk, kid: KID };
    }
    const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
    const privateJwk = await exportJWK(privateKey);
    meta.set(META_KEY, JSON.stringify(privateJwk));
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = KID;
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    return { privateKey: privateKey as CryptoKey, publicJwk, kid: KID };
  })());

export const ISSUER = process.env.ISSUER ?? "http://localhost:3000";

export async function signJwt(payload: Record<string, unknown>, audience: string, seconds: number) {
  const { privateKey, kid } = await keys;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

export const TTL = {
  code: 60,            // one-time, 60 seconds
  access: 15 * 60,     // 15 minutes
  id: 15 * 60,
  refresh: 30 * 24 * 3600,
};
