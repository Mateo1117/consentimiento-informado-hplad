import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAnalyticsConsents, type AnalyticsConsent } from "@/services/dashboardAnalyticsService";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface DateRangeProps { dateFrom?: string; dateTo?: string; }

interface MonthlyRow {
  key: string;
  month: string;
  total: number;
  signed: number;
  pending: number;
  completion: number;
}

export function TabConsentsMonthly({ dateFrom, dateTo }: DateRangeProps) {
  const [consents, setConsents] = useState<AnalyticsConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchAnalyticsConsents(dateFrom, dateTo)
      .then((rows) => { if (active) setConsents(rows); })
      .catch((error: Error) => {
        console.error("Error loading monthly analytics:", error);
        toast.error(error.message || "Error al cargar el análisis mensual");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  const data = useMemo<MonthlyRow[]>(() => {
    const grouped = new Map<string, Omit<MonthlyRow, "month" | "completion">>();
    consents.forEach((consent) => {
      const key = format(parseISO(consent.created_at), "yyyy-MM");
      const current = grouped.get(key) || { key, total: 0, signed: 0, pending: 0 };
      current.total += 1;
      if (consent.status === "signed") current.signed += 1;
      else current.pending += 1;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      month: format(parseISO(`${row.key}-01`), "MMM yyyy", { locale: es }),
      completion: row.total ? Math.round((row.signed / row.total) * 100) : 0,
    }));
  }, [consents]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Producción mensual</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="signed" name="Firmados" stackId="status" fill="hsl(var(--accent))" />
                <Bar dataKey="pending" name="Pendientes" stackId="status" fill="hsl(var(--medical-amber))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader><CardTitle className="text-lg">Detalle mensual</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-muted-foreground">Mes</th><th className="px-4 py-3 text-center text-muted-foreground">Total</th><th className="px-4 py-3 text-center text-muted-foreground">Firmados</th><th className="px-4 py-3 text-center text-muted-foreground">Pendientes</th><th className="px-4 py-3 text-center text-muted-foreground">Cumplimiento</th>
              </tr></thead>
              <tbody>{data.slice().reverse().map((row) => <tr key={row.key} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium capitalize">{row.month}</td><td className="px-4 py-3 text-center">{row.total}</td><td className="px-4 py-3 text-center text-accent">{row.signed}</td><td className="px-4 py-3 text-center text-medical-amber">{row.pending}</td><td className="px-4 py-3 text-center font-semibold">{row.completion}%</td>
              </tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}