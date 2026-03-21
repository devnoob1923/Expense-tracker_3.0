import Link from "next/link";
import type { ReactNode } from "react";

export function DashboardShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main style={{ padding: "32px 20px 48px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 24 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <div>
            <Link href="/" style={{ color: "var(--accent-strong)", fontSize: 14 }}>
              Back Home
            </Link>
            <h1 style={{ marginBottom: 8 }}>{title}</h1>
            <p style={{ color: "var(--muted)", maxWidth: 720, margin: 0 }}>{description}</p>
          </div>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/transactions">Transactions</Link>
            <Link href="/settings/integrations">Integrations</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
