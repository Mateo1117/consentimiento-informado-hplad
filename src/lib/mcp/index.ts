import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConsentsTool from "./tools/list-consents";
import getConsentTool from "./tools/get-consent";
import consentStatsTool from "./tools/consent-stats";

// Issuer must be the direct Supabase host, built from the project ref so it
// survives publish and stays import-safe (Vite inlines the env at build time).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hplad-consent-mcp",
  title: "HPLAD Consentimientos MCP",
  version: "0.1.0",
  instructions:
    "Tools to query informed-consent records for the E.S.E. Hospital Pedro León Álvarez Díaz. Use `list_consents` to search, `get_consent` for one record, and `consent_stats` for counts by status. All data is scoped to the signed-in user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listConsentsTool, getConsentTool, consentStatsTool],
});