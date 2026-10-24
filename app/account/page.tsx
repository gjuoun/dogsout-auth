import { cookies } from "next/headers";
import { db, findClient, grantsFor, listPasskeys } from "@/lib/store";
import PasskeyEnroll from "@/components/PasskeyEnroll";

const MESSAGES: Record<string, string> = {
  added: "Passkey added.",
  removed: "Passkey removed.",
  failed: "Passkey registration failed.",
};

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  const grants = grantsFor(userId ?? "");
  const passkeys = userId ? listPasskeys(userId) : [];

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — Account</div>
      {!userId && <p className="muted">Not signed in to the provider.</p>}
      {userId && (
        <>
          <h3>Passkeys</h3>
          {passkeys.length === 0 && (
            <p className="muted">No passkeys yet. A passkey replaces the password — phishing-resistant.</p>
          )}
          {passkeys.map((p) => (
            <div key={p.credential_id} className="grant">
              <div>
                <b>{p.name ?? "passkey"}</b>
                <div className="muted mono">
                  {p.credential_id.slice(0, 16)}…{p.backed_up ? " · synced" : " · device-bound"}
                </div>
              </div>
              <form method="POST" action="/webauthn/remove">
                <input type="hidden" name="credential_id" value={p.credential_id} />
                <button className="danger">Remove</button>
              </form>
            </div>
          ))}
          <PasskeyEnroll />
          {sp.passkey && <p className="hint">{MESSAGES[sp.passkey] ?? ""}</p>}

          <h3>Connected apps</h3>
          {grants.length === 0 && <p className="muted">No apps connected.</p>}
          {grants.map((g) => (
            <div key={g.client_id} className="grant">
              <div>
                <b>{findClient(g.client_id)?.name}</b>
                <div className="muted mono">{g.scope.join(" ")}</div>
              </div>
              <form method="POST" action="/account/revoke">
                <input type="hidden" name="client_id" value={g.client_id} />
                <button className="danger">Remove access</button>
              </form>
            </div>
          ))}
          <p className="hint">
            Revoking drops the grant and kills all tokens issued under it.
            Agents are managed on the <a href="/admin">agent registry</a> page.
          </p>
        </>
      )}
    </div>
  );
}
