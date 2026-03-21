import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Mail, ShieldCheck, Sparkles } from "lucide-react";

const pillars = [
  {
    title: "Inbox To Ledger",
    description: "Each customer connects Gmail with OAuth. New transaction emails are parsed, normalized, deduplicated, and written into Supabase automatically.",
    icon: Mail
  },
  {
    title: "AI With Guardrails",
    description: "LLM extraction is paired with confidence scoring, raw-source retention, manual correction, and rule-based recategorization for long-term accuracy.",
    icon: Sparkles
  },
  {
    title: "Ready To Scale",
    description: "Row-level isolation, event tables, ingestion jobs, and real-time dashboard subscriptions keep the foundation safe for customer growth.",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 28
        }}
      >
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            borderRadius: 32,
            padding: "40px 32px",
            backdropFilter: "blur(12px)"
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--accent-strong)" }}>
            <BadgeIndianRupee size={18} />
            <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13 }}>
              Ledger Lens
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(2.6rem, 8vw, 5rem)", margin: "18px 0 14px", lineHeight: 0.95 }}>
            Expense intelligence that starts with Gmail.
          </h1>
          <p style={{ maxWidth: 680, fontSize: 18, color: "var(--muted)", lineHeight: 1.6 }}>
            A production-ready starting point for a multi-tenant expense tracker that ingests transaction emails,
            extracts structured finance events with AI, and keeps customer dashboards fresh in near real time.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 28 }}>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 20px",
                borderRadius: 999,
                background: "var(--accent)",
                color: "#fff7ed"
              }}
            >
              Open Dashboard <ArrowRight size={18} />
            </Link>
            <Link
              href="/settings/integrations"
              style={{
                padding: "14px 20px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface-strong)"
              }}
            >
              Configure Gmail
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18
          }}
        >
          {pillars.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 24,
                padding: 24
              }}
            >
              <Icon size={22} style={{ color: "var(--accent-strong)" }} />
              <h2 style={{ marginBottom: 8 }}>{title}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
