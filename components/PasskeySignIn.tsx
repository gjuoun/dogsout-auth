"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

/**
 * Username-first passkey sign-in. The username resolves the human at the
 * provider; the provider answers with an assertion ceremony (`get()`) for
 * someone who already has a passkey, or a registration ceremony (`create()`)
 * for a first-time visitor — which signs them in on the spot.
 */
export default function PasskeySignIn({ req }: { req?: string }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function continueWithUsername(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/webauthn/login/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Unknown username." : "Could not start sign-in.");
      }
      const { mode, ceremonyId, options } = await res.json();

      const credential =
        mode === "reg"
          ? await startRegistration({ optionsJSON: options })
          : await startAuthentication({ optionsJSON: options });

      const verify = await fetch("/webauthn/login/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ceremonyId, mode, credential, req }),
      });
      if (!verify.ok) throw new Error("Passkey verification failed.");
      const { next } = (await verify.json()) as { next?: string };
      window.location.href = next ?? "/";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={continueWithUsername}>
      <label>
        Username
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username webauthn"
          placeholder="jun"
          autoFocus
          required
        />
      </label>
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Waiting for your authenticator…" : "Continue"}
      </button>
      {err && <p className="err">{err}</p>}
    </form>
  );
}