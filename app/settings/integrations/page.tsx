import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function IntegrationsPage() {
  return (
    <DashboardShell
      title="Integrations"
      description="Customers connect individual Gmail accounts. The backend should register Gmail watches, persist encrypted tokens, and process Pub/Sub notifications."
    >
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
        }}
      >
        <article
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 24
          }}
        >
          <h2>Gmail OAuth</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            After sign-in, redirect each customer through Google consent, store refresh tokens securely, and start a mailbox watch for transaction emails.
          </p>
          <Link
            href="/api/auth/gmail"
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "12px 18px",
              borderRadius: 999,
              background: "var(--accent)",
              color: "#fff7ed"
            }}
          >
            Connect Gmail
          </Link>
        </article>

        <article
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 24
          }}
        >
          <h2>Pipeline Health</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Track watch expiration, sync lag, duplicate suppression, failed extraction jobs, and low-confidence transactions that need human review.
          </p>
        </article>
      </section>
    </DashboardShell>
  );
}
