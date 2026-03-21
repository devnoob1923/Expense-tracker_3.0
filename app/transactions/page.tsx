import { DashboardShell } from "@/components/dashboard-shell";

const columns = ["Date", "Merchant", "Direction", "Category", "Amount", "Confidence"];

export default function TransactionsPage() {
  return (
    <DashboardShell
      title="Transactions"
      description="This view is intended for search, filters, review queues, rule-driven categorization, and manual correction workflows."
    >
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: 22
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 12,
            fontSize: 14,
            color: "var(--muted)",
            marginBottom: 16
          }}
        >
          {columns.map((column) => (
            <div key={column}>{column}</div>
          ))}
        </div>
        <div style={{ color: "var(--muted)" }}>
          Connect data sources and this table can be backed by paginated Supabase queries with saved filters and review states.
        </div>
      </section>
    </DashboardShell>
  );
}
