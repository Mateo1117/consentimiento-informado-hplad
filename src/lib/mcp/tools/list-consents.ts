import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_consents",
  title: "List consents",
  description:
    "List informed-consent records visible to the signed-in user, with optional filters by status, source, consent type, patient name or document number.",
  inputSchema: {
    status: z.enum(["pending", "sent", "signed", "expired", "cancelled"]).optional(),
    source: z.enum(["web", "app"]).optional(),
    consent_type: z.string().optional().describe("Consent type key (e.g. carga_glucosa, hiv)."),
    patient_name: z.string().optional().describe("Case-insensitive partial match on patient name."),
    patient_document_number: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("consents")
      .select(
        "id, created_at, patient_name, patient_document_type, patient_document_number, consent_type, status, signed_at, source",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 25);

    if (input.status) query = query.eq("status", input.status);
    if (input.source) query = query.eq("source", input.source);
    if (input.consent_type) query = query.eq("consent_type", input.consent_type);
    if (input.patient_document_number)
      query = query.eq("patient_document_number", input.patient_document_number);
    if (input.patient_name) query = query.ilike("patient_name", `%${input.patient_name}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { count: data?.length ?? 0, items: data ?? [] },
    };
  },
});