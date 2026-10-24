import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
	title: "YourID — OAuth 2.0 / OIDC provider",
	description: "Self-hosted OAuth 2.0 / OIDC provider",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Session-gated nav: before sign-in only the brand shows — login stays minimal.
	const signedIn = Boolean((await cookies()).get("op_session"));
	return (
		<html lang="en">
			<body>
				<nav className="nav">
					<a href="/">🏛️ YourID</a>
					{signedIn && (
						<>
							<a href="/client">🧩 Client app</a>
							<a href="/account">Connected apps</a>
							<a href="/.well-known/openid-configuration">discovery</a>
							<a href="/.well-known/jwks.json">jwks</a>
						</>
					)}
				</nav>
				<main>{children}</main>
			</body>
		</html>
	);
}
