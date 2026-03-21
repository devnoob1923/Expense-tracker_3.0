import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DashboardSummary, TransactionRecord } from "@/lib/types";

export async function getDashboardSnapshot(userId: string) {
  const supabase = createSupabaseAdminClient();

  const [{ data: transactions }, { data: metrics }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, currency, merchant, category, direction, transaction_at, account_label, confidence_score, source_type")
      .eq("user_id", userId)
      .order("transaction_at", { ascending: false })
      .limit(20),
    supabase.rpc("dashboard_summary", { target_user_id: userId })
  ]);

  const summary = (metrics?.[0] ?? {
    total_spend: 0,
    total_income: 0,
    net_cashflow: 0,
    transaction_count: 0,
    flagged_count: 0
  }) as {
    total_spend: number;
    total_income: number;
    net_cashflow: number;
    transaction_count: number;
    flagged_count: number;
  };

  return {
    summary: {
      totalSpend: summary.total_spend,
      totalIncome: summary.total_income,
      netCashflow: summary.net_cashflow,
      transactionCount: summary.transaction_count,
      flaggedCount: summary.flagged_count
    } satisfies DashboardSummary,
    transactions:
      transactions?.map(
        (item) =>
          ({
            id: item.id,
            amount: item.amount,
            currency: item.currency,
            merchant: item.merchant,
            category: item.category,
            direction: item.direction,
            transactionAt: item.transaction_at,
            accountLabel: item.account_label,
            confidenceScore: item.confidence_score,
            sourceType: item.source_type
          }) satisfies TransactionRecord
      ) ?? []
  };
}
