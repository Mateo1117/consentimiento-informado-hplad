import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsConsent {
  created_at: string;
  status: string;
  consent_type: string;
  professional_name: string | null;
  payload: unknown;
}

const PAGE_SIZE = 1000;

export async function fetchAnalyticsConsents(dateFrom?: string, dateTo?: string): Promise<AnalyticsConsent[]> {
  const rows: AnalyticsConsent[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("consents")
      .select("created_at, status, consent_type, professional_name, payload")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const page = (data || []) as AnalyticsConsent[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export function getPatientPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const root = payload as Record<string, unknown>;
  const patientData = root.patientData;
  return patientData && typeof patientData === "object" && !Array.isArray(patientData)
    ? patientData as Record<string, unknown>
    : root;
}

export function getPayloadText(payload: unknown, keys: string[], fallback: string): string {
  const patient = getPatientPayload(payload);
  for (const key of keys) {
    const value = patient[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}