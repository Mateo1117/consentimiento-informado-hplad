import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Building2 } from "lucide-react";

interface SourceData {
  name: string;
  total: number;
  signed: number;
  pending: number;
}

const SOURCE_LABELS: Record<string, string> = {
  app: "Aplicación (Presencial)",
  web: "Web (Remoto)",
  webhook: "Webhook (Externo)",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
];

export function TabConsentsBySource() {
  const [data, setData] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: consents, error } = await supabase
        .from("consents")
        .select("source, status");

      if (error) throw error;

      const grouped: Record<string, { total: number; signed: number; pending: number }> = {};
      (consents || []).forEach((c) => {
        const key = c.source || "app";
        if (!grouped[key]) grouped[key] = { total: 0, signed: 0, pending: 0 };
        grouped[key].total++;
        if (c.status === "signed") grouped[key].signed++;
        else grouped[key].pending++;
      });

      const result = Object.entries(grouped)
        .map(([key, val]) => ({ name: SOURCE_LABELS[key] || key, ...val }))
        .sort((a, b) => b.total - a.total);

      setData(result);
    } catch (err) {
      console.error("Error fetching by source:", err);
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

  const pieData = data.map((d) => ({ name: d.name, value: d.total }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">Distribución por Origen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">Estado por Origen</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="signed" name="Firmados" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pendientes" fill="hsl(30, 80%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground">Resumen por Origen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Origen</th>
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
