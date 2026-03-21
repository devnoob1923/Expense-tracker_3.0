import OpenAI from "openai";
import { z } from "zod";
import { getEnv } from "@/lib/env";

const extractionSchema = z.object({
  direction: z.enum(["expense", "income", "refund", "transfer"]),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  merchant: z.string().nullable(),
  category: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  accountLabel: z.string().nullable(),
  transactionAt: z.string(),
  referenceNumber: z.string().nullable(),
  description: z.string().nullable(),
  confidenceScore: z.number().min(0).max(1),
  isTransaction: z.boolean(),
  rawLabels: z.array(z.string()).default([])
});

export type ExtractedTransaction = z.infer<typeof extractionSchema>;

export async function extractTransactionFromEmail(input: {
  subject: string;
  from: string;
  snippet: string;
  textBody: string;
}) {
  const client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });

  const completion = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Extract financial transaction data from transactional emails. Return JSON only. If the email is not a transaction, set isTransaction to false."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(input)
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "transaction_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            direction: { type: "string", enum: ["expense", "income", "refund", "transfer"] },
            amount: { type: "number" },
            currency: { type: "string" },
            merchant: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            paymentMethod: { type: ["string", "null"] },
            accountLabel: { type: ["string", "null"] },
            transactionAt: { type: "string" },
            referenceNumber: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            confidenceScore: { type: "number" },
            isTransaction: { type: "boolean" },
            rawLabels: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: [
            "direction",
            "amount",
            "currency",
            "merchant",
            "category",
            "paymentMethod",
            "accountLabel",
            "transactionAt",
            "referenceNumber",
            "description",
            "confidenceScore",
            "isTransaction",
            "rawLabels"
          ]
        }
      }
    }
  });

  const jsonText = completion.output_text;
  return extractionSchema.parse(JSON.parse(jsonText));
}
