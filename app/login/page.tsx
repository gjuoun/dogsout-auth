import PasskeySignIn from "@/components/PasskeySignIn";
import { db, findClient } from "@/lib/store";

export default async function Login({
	searchParams,
}: {
	searchParams: Promise<Record<string, string>>;
}) {
	const sp = await searchParams;
	const r = db.authRequests.get(sp.req ?? "");
	const client = findClient(r?.client_id ?? null);

	return (
		<div className="card narrow">
			<div className="brand">🏛️ YourID</div>
			<h2>Sign in</h2>
			{client && (
				<p className="muted">
					to continue to <b>{client.name}</b>
				</p>
			)}
			{sp.error && <p className="err">Sign-in failed. Try again.</p>}
			<PasskeySignIn req={sp.req} />
		</div>
	);
}
