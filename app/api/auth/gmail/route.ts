import { NextResponse } from "next/server";
import { buildGmailConsentUrl } from "@/lib/gmail";

const DEMO_USER_ID = "demo-user";

export async function GET() {
  const authUrl = buildGmailConsentUrl(DEMO_USER_ID);
  return NextResponse.redirect(authUrl);
}
