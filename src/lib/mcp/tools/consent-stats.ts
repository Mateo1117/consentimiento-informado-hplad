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
  name: "consent_stats",
  title: "Consent statistics",
  description:
    "Return counts of informed-consent records visible to the signed-in user, grouped by status (and optionally within a date range).",
  inputSchema: {
    from: z.string().optional().describe("ISO date lower bound on created_at."),
    to: z.string().optional().describe("ISO date upper bound on created_at."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("consents").select("status");
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const s = (row as { status: string | null }).status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    const total = data?.length ?? 0;
    return {
      content: [{ type: "text", text: JSON.stringify({ total, by_status: counts }) }],
      structuredContent: { total, by_status: counts },
    };
  },
});