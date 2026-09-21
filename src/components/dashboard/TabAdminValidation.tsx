import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAnalyticsConsents, getPayloadText, type AnalyticsConsent } from "@/services/dashboardAnalyticsService";
import { normalizeConsentType, CONSENT_TYPE_SPECIALTY } from "@/utils/consentTypeNormalizer";
import { ClipboardCheck, CalendarRange, HeartHandshake, Stethoscope } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface DateRangeProps { dateFrom?: string; dateTo?: string; }

interface BreakdownRow {
  name: string;
  total: number;
  signed: number;
  pending: number;
  completion: number;
}

function buildBreakdown(consents: AnalyticsConsent[], keyFn: (c: AnalyticsConsent) => string): BreakdownRow[] {
  const grouped = new Map<string, { total: number; signed: number; pending: number }>();
  consents.forEach((c) => {
    const key = keyFn(c);
    const current = grouped.get(key) || { total: 0, signed: 0, pending: 0 };
    current.total += 1;
    if (c.status === "signed") current.signed += 1;
    else current.pending += 1;
    grouped.set(key, current);
  });
  return Array.from(grouped.entries())
    .map(([name, row]) => ({
      name,
      ...row,
      completion: row.total ? Math.round((row.signed / row.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function BreakdownTable({ title, icon: Icon, rows, maxRows = 8 }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: BreakdownRow[];
  maxRows?: number;
}) {
  const visible = rows.slice(0, maxRows);
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground">Concepto</th>
                <th className="px-3 py-2 text-center text-muted-foreground">Total</th>
                <th className="px-3 py-2 text-center text-muted-foreground">Firmados</th>
                <th className="px-3 py-2 text-center text-muted-foreground">Pendientes</th>
                <th className="px-3 py-2 text-center text-muted-foreground">Cumpl.</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.name} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium capitalize">{row.name}</td>
                  <td className="px-3 py-2 text-center font-semibold">{row.total}</td>
                  <td className="px-3 py-2 text-center text-accent">{row.signed}</td>
                  <td className="px-3 py-2 text-center text-medical-amber">{row.pending}</td>
                  <td className="px-3 py-2 text-center font-semibold">{row.completion}%</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin datos en el rango seleccionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > maxRows && (
          <p className="mt-2 text-xs text-muted-foreground">Mostrando {maxRows} de {rows.length} registros</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TabAdminValidation({ dateFrom, dateTo }: DateRangeProps) {
  const [consents, setConsents] = useState<AnalyticsConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchAnalyticsConsents(dateFrom, dateTo)
      .then((rows) => { if (active) setConsents(rows); })
      .catch((error: Error) => {
        console.error("Error loading admin validation:", error);
        toast.error(error.message || "Error al cargar la validación administrativa");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  const summary = useMemo(() => {
    const total = consents.length;
    const signed = consents.filter((c) => c.status === "signed").length;
    return {
      total,
      signed,
      pending: total - signed,
      completion: total ? Math.round((signed / total) * 100) : 0,
    };
  }, [consents]);

  const monthlyRows = useMemo<BreakdownRow[]>(() => {
    const rows = buildBreakdown(consents, (c) => format(parseISO(c.created_at), "yyyy-MM"));
    return rows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => ({
        ...row,
        name: format(parseISO(`${row.name}-01`), "MMM yyyy", { locale: es }),
      }));
  }, [consents]);

  const epsRows = useMemo(
    () => buildBreakdown(consents, (c) => getPayloadText(c.payload, ["eps", "EPS", "nombreEps", "NOMBRE_EPS", "entidad"], "Sin EPS registrada")),
    [consents]
  );

  const specialtyRows = useMemo(
    () => buildBreakdown(consents, (c) => CONSENT_TYPE_SPECIALTY[normalizeConsentType(c.consent_type)] || "General"),
    [consents]
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-primary bg-primary/5 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Validación administrativa — Total de consentimientos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-primary bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-primary">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Firmados</p>
              <p className="text-3xl font-bold text-accent">{summary.signed}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold text-medical-amber">{summary.pending}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Cumplimiento</p>
              <p className="text-3xl font-bold text-foreground">{summary.completion}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BreakdownTable title="Desglose mensual" icon={CalendarRange} rows={monthlyRows} maxRows={12} />
        <BreakdownTable title="Desglose por EPS / EAPB" icon={HeartHandshake} rows={epsRows} />
        <BreakdownTable title="Desglose por especialidad" icon={Stethoscope} rows={specialtyRows} />
      </div>
    </div>
  );
}
