import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardSnapshot } from "@/lib/dashboard";

const DEMO_USER_ID = "demo-user";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot(DEMO_USER_ID).catch(() => ({
    summary: {
      totalSpend: 0,
      totalIncome: 0,
      netCashflow: 0,
      transactionCount: 0,
      flaggedCount: 0
    },
    transactions: []
  }));

  const metrics = [
    { label: "Spend", value: formatCurrency(snapshot.summary.totalSpend) },
    { label: "Income", value: formatCurrency(snapshot.summary.totalIncome) },
    { label: "Net", value: formatCurrency(snapshot.summary.netCashflow) },
    { label: "Transactions", value: String(snapshot.summary.transactionCount) }
  ];

  return (
    <DashboardShell
      title="Customer Dashboard"
      description="Live financial overview backed by Supabase. Once Gmail sync is connected, fresh transactions flow into this view automatically."
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16
        }}
      >
        {metrics.map((metric) => (
          <article
            key={metric.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 24,
              padding: 22
            }}
          >
            <div style={{ color: "var(--muted)", marginBottom: 10 }}>{metric.label}</div>
            <div style={{ fontSize: 32 }}>{metric.value}</div>
          </article>
        ))}
      </section>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0 }}>Latest Transactions</h2>
        </div>
        <div style={{ display: "grid" }}>
          {snapshot.transactions.length === 0 ? (
            <div style={{ padding: 22, color: "var(--muted)" }}>
              No transactions yet. Connect Gmail and run the first inbox sync.
            </div>
          ) : (
            snapshot.transactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 120px",
                  gap: 12,
                  padding: "18px 22px",
                  borderTop: "1px solid var(--border)"
                }}
              >
                <div>
                  <strong>{transaction.merchant ?? "Unknown merchant"}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>{transaction.category ?? "Uncategorized"}</div>
                </div>
                <div>{new Date(transaction.transactionAt).toLocaleDateString("en-IN")}</div>
                <div>{transaction.accountLabel ?? "Primary"}</div>
                <div style={{ textAlign: "right" }}>{formatCurrency(transaction.amount)}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
