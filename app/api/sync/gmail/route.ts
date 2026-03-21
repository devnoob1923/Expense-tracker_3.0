import { NextRequest, NextResponse } from "next/server";
import { extractTransactionFromEmail } from "@/lib/ai/extract-transaction";
import { buildTransactionFingerprint, normalizeMerchantName } from "@/lib/transactions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    userId: string;
    sourceMessageId: string;
    email: {
      subject: string;
      from: string;
      snippet: string;
      textBody: string;
    };
  };

  const extracted = await extractTransactionFromEmail(body.email);

  if (!extracted.isTransaction) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createSupabaseAdminClient();
  const fingerprint = buildTransactionFingerprint({
    userId: body.userId,
    sourceMessageId: body.sourceMessageId,
    extracted
  });

  const payload = {
    user_id: body.userId,
    source_type: "gmail",
    source_message_id: body.sourceMessageId,
    fingerprint,
    direction: extracted.direction,
    amount: extracted.amount,
    currency: extracted.currency.toUpperCase(),
    merchant: normalizeMerchantName(extracted.merchant),
    category: extracted.category,
    payment_method: extracted.paymentMethod,
    account_label: extracted.accountLabel,
    transaction_at: extracted.transactionAt,
    reference_number: extracted.referenceNumber,
    description: extracted.description,
    confidence_score: extracted.confidenceScore,
    raw_extraction: extracted
  };

  const { error } = await supabase.from("transactions").upsert(payload, { onConflict: "fingerprint" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
