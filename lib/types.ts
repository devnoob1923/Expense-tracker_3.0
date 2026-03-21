export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TransactionDirection = "expense" | "income" | "refund" | "transfer";

export interface DashboardSummary {
  totalSpend: number;
  totalIncome: number;
  netCashflow: number;
  transactionCount: number;
  flaggedCount: number;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  category: string | null;
  direction: TransactionDirection;
  transactionAt: string;
  accountLabel: string | null;
  confidenceScore: number | null;
  sourceType: string;
}
