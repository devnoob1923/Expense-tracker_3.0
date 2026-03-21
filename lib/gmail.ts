import { google } from "googleapis";
import { getEnv } from "@/lib/env";

export interface GmailTokenSet {
  access_token: string;
  refresh_token: string;
  expiry_date?: number | null;
}

export function createGmailOAuthClient(tokens?: Partial<GmailTokenSet>) {
  const env = getEnv();
  const oauth2Client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

  if (tokens) {
    oauth2Client.setCredentials(tokens);
  }

  return oauth2Client;
}

export function createGmailApi(tokens: GmailTokenSet) {
  const auth = createGmailOAuthClient(tokens);
  return google.gmail({ version: "v1", auth });
}

export function buildGmailConsentUrl(userId: string) {
  const auth = createGmailOAuthClient();

  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state: userId
  });
}
