import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_PUBSUB_TOPIC_NAME: z.string().min(1),
  GMAIL_WATCH_PROJECT_ID: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1)
});

export function getEnv() {
  return envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_PUBSUB_TOPIC_NAME: process.env.GOOGLE_PUBSUB_TOPIC_NAME,
    GMAIL_WATCH_PROJECT_ID: process.env.GMAIL_WATCH_PROJECT_ID,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  });
}
