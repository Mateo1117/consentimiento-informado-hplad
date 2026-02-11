import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { UserCircle } from "lucide-react";

interface DateRangeProps {
  dateFrom?: string;
  dateTo?: string;
}

interface DoctorData {
  name: string;
  total: number;
  signed: number;
  pending: number;
}

export function TabConsentsByDoctor({ dateFrom, dateTo }: DateRangeProps) {
  const [data, setData] = useState<DoctorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let q = supabase.from("consents").select("professional_name, status");
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo);
      const { data: consents, error } = await q;

      const grouped: Record<string, { total: number; signed: number; pending: number }> = {};
      (consents || []).forEach((c) => {
        const key = c.professional_name || "Sin asignar";
        if (!grouped[key]) grouped[key] = { total: 0, signed: 0, pending: 0 };
        grouped[key].total++;
        if (c.status === "signed") grouped[key].signed++;
        else grouped[key].pending++;
      });

      const result = Object.entries(grouped)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.total - a.total);

      setData(result);
    } catch (err) {
      console.error("Error fetching by doctor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">Consentimientos por Médico</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="signed" name="Firmados" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pending" name="Pendientes" fill="hsl(30, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground">Detalle por Médico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Médico</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Firmados</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Pendientes</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">% Firmados</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{row.name}</td>
                    <td className="text-center py-3 px-4 text-foreground">{row.total}</td>
                    <td className="text-center py-3 px-4 text-accent">{row.signed}</td>
                    <td className="text-center py-3 px-4 text-amber-600">{row.pending}</td>
                    <td className="text-center py-3 px-4 text-foreground">
                      {row.total > 0 ? Math.round((row.signed / row.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
