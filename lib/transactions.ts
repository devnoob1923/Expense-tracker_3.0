import { createHash } from "crypto";
import type { ExtractedTransaction } from "@/lib/ai/extract-transaction";

export function buildTransactionFingerprint(input: {
  userId: string;
  sourceMessageId: string;
  extracted: ExtractedTransaction;
}) {
  const payload = [
    input.userId,
    input.sourceMessageId,
    input.extracted.amount,
    input.extracted.currency,
    input.extracted.transactionAt,
    input.extracted.referenceNumber ?? "",
    input.extracted.merchant ?? ""
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function normalizeMerchantName(merchant: string | null) {
  return merchant?.trim().replace(/\s+/g, " ") ?? null;
}
