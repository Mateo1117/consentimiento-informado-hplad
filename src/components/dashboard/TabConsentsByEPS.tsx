import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAnalyticsConsents, getPayloadText, type AnalyticsConsent } from "@/services/dashboardAnalyticsService";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HeartHandshake } from "lucide-react";
import { toast } from "sonner";

interface DateRangeProps { dateFrom?: string; dateTo?: string; }
interface EPSRow { name: string; total: number; signed: number; pending: number; completion: number; }

export function TabConsentsByEPS({ dateFrom, dateTo }: DateRangeProps) {
  const [consents, setConsents] = useState<AnalyticsConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchAnalyticsConsents(dateFrom, dateTo)
      .then((rows) => { if (active) setConsents(rows); })
      .catch((error: Error) => {
        console.error("Error loading EPS analytics:", error);
        toast.error(error.message || "Error al cargar el análisis por EPS");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  const data = useMemo<EPSRow[]>(() => {
    const grouped = new Map<string, Omit<EPSRow, "name" | "completion">>();
    consents.forEach((consent) => {
      const eps = getPayloadText(consent.payload, ["eps", "EPS", "nombreEps", "NOMBRE_EPS", "entidad"], "Sin EPS registrada");
      const current = grouped.get(eps) || { total: 0, signed: 0, pending: 0 };
      current.total += 1;
      if (consent.status === "signed") current.signed += 1;
      else current.pending += 1;
      grouped.set(eps, current);
    });
    return Array.from(grouped.entries()).map(([name, row]) => ({
      name, ...row, completion: row.total ? Math.round((row.signed / row.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [consents]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2"><div className="flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Consentimientos por EPS / EAPB</CardTitle></div></CardHeader>
        <CardContent>
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 12)} layout="vertical" margin={{ top: 8, right: 24, left: 120, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" width={112} stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value: string) => value.length > 22 ? `${value.slice(0, 22)}…` : value} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="signed" name="Firmados" stackId="status" fill="hsl(var(--accent))" />
                <Bar dataKey="pending" name="Pendientes" stackId="status" fill="hsl(var(--medical-amber))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardHeader><CardTitle className="text-lg">Detalle por EPS / EAPB</CardTitle></CardHeader>
        <CardContent><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="px-4 py-3 text-left text-muted-foreground">EPS / EAPB</th><th className="px-4 py-3 text-center text-muted-foreground">Total</th><th className="px-4 py-3 text-center text-muted-foreground">Firmados</th><th className="px-4 py-3 text-center text-muted-foreground">Pendientes</th><th className="px-4 py-3 text-center text-muted-foreground">Cumplimiento</th></tr></thead>
          <tbody>{data.map((row) => <tr key={row.name} className="border-b border-border/50 hover:bg-muted/30"><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3 text-center">{row.total}</td><td className="px-4 py-3 text-center text-accent">{row.signed}</td><td className="px-4 py-3 text-center text-medical-amber">{row.pending}</td><td className="px-4 py-3 text-center font-semibold">{row.completion}%</td></tr>)}</tbody>
        </table></div></CardContent>
      </Card>
    </div>
  );
}