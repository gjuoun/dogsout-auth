"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

/** Enroll a passkey for the signed-in human. One click, default name. */
export default function PasskeyEnroll() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function enroll() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/webauthn/reg/options");
      if (!res.ok) throw new Error("sign in first");
      const { ceremonyId, options } = await res.json();
      const credential = await startRegistration({ optionsJSON: options });
      const name = "passkey " + new Date().toISOString().slice(0, 10);
      const verify = await fetch("/webauthn/reg/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ceremonyId, credential, name }),
      });
      if (!verify.ok) throw new Error("verification failed");
      window.location.href = "/account?passkey=added";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <button onClick={enroll} disabled={busy}>{busy ? "Waiting for authenticator…" : "＋ Add a passkey"}</button>
      {err && <span className="err">{err}</span>}
    </div>
  );
}
