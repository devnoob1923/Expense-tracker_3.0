import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface GmailPushPayload {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as GmailPushPayload;
  const decoded = JSON.parse(Buffer.from(payload.message.data, "base64").toString("utf8")) as {
    emailAddress: string;
    historyId: string;
  };

  const supabase = createSupabaseAdminClient();

  await supabase.from("ingestion_events").insert({
    provider: "gmail",
    external_account_identifier: decoded.emailAddress,
    payload,
    processing_status: "queued"
  });

  return NextResponse.json({ ok: true });
}
