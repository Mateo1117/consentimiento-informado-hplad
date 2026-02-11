import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TabConsentsByType } from "@/components/dashboard/TabConsentsByType";
import { TabConsentsBySpecialty } from "@/components/dashboard/TabConsentsBySpecialty";
import { TabConsentsBySource } from "@/components/dashboard/TabConsentsBySource";
import { TabConsentsByDoctor } from "@/components/dashboard/TabConsentsByDoctor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, startOfMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface StatsData {
  totalConsents: number;
  todayConsents: number;
  weekConsents: number;
  monthConsents: number;
  signedConsents: number;
  pendingConsents: number;
  weekChange: number;
  monthChange: number;
}

interface ChartData {
  date: string;
  value: number;
}

interface ActivityItem {
  id: string;
  patientName: string;
  consentType: string;
  createdAt: string;
}

// Helper: local date boundaries to ISO
function localDayStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function localDayEnd(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

const Dashboard = () => {
  const [stats, setStats] = useState<StatsData>({
    totalConsents: 0, todayConsents: 0, weekConsents: 0, monthConsents: 0,
    signedConsents: 0, pendingConsents: 0, weekChange: 0, monthChange: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [trendData, setTrendData] = useState<ChartData[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const rangeStart = dateFrom ? localDayStart(dateFrom) : undefined;
      const rangeEnd = dateTo ? localDayEnd(dateTo) : undefined;

      // Build filtered queries
      const buildQuery = () => {
        let q = supabase.from('consents').select('*', { count: 'exact', head: true });
        if (rangeStart) q = q.gte('created_at', rangeStart);
        if (rangeEnd) q = q.lte('created_at', rangeEnd);
        return q;
      };

      const [
        { count: total },
        { count: todayCount },
        { count: weekCount },
        { count: monthCount },
        { count: signed },
        { count: pending },
        { data: recentData },
      ] = await Promise.all([
        buildQuery(),
        buildQuery().gte('created_at', today.toISOString()),
        buildQuery().gte('created_at', weekStart.toISOString()),
        buildQuery().gte('created_at', monthStart.toISOString()),
        buildQuery().eq('status', 'signed'),
        buildQuery().eq('status', 'sent'),
        (() => {
          let q = supabase.from('consents')
            .select('id, patient_name, consent_type, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
          if (rangeStart) q = q.gte('created_at', rangeStart);
          if (rangeEnd) q = q.lte('created_at', rangeEnd);
          return q;
        })(),
      ]);

      setStats({
        totalConsents: total || 0,
        todayConsents: todayCount || 0,
        weekConsents: weekCount || 0,
        monthConsents: monthCount || 0,
        signedConsents: signed || 0,
        pendingConsents: pending || 0,
        weekChange: weekCount && weekCount > 0 ? 100 : 0,
        monthChange: monthCount && monthCount > 0 ? 100 : 0,
      });

      if (recentData) {
        setRecentActivity(recentData.map(item => ({
          id: item.id,
          patientName: item.patient_name,
          consentType: item.consent_type,
          createdAt: item.created_at,
        })));
      }

      // Generate chart data efficiently (single query, group client-side)
      await generateChartData(rangeStart, rangeEnd);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  const generateChartData = async (rangeStart?: string, rangeEnd?: string) => {
    try {
      // Fetch all consents in range with just created_at
      let q = supabase.from('consents').select('created_at');
      if (rangeStart) q = q.gte('created_at', rangeStart);
      if (rangeEnd) q = q.lte('created_at', rangeEnd);
      q = q.order('created_at', { ascending: true });

      const { data: consents, error } = await q;
      if (error) throw error;

      // Group by day
      const dayCounts: Record<string, number> = {};
      (consents || []).forEach(c => {
        const day = format(new Date(c.created_at), 'yyyy-MM-dd');
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      // Build trend data for the date range
      const from = dateFrom || subDays(new Date(), 30);
      const to = dateTo || new Date();
      const days = Math.max(differenceInDays(to, from), 1);
      const trendChartData: ChartData[] = [];

      for (let i = 0; i <= days; i++) {
        const date = new Date(from);
        date.setDate(date.getDate() + i);
        const key = format(date, 'yyyy-MM-dd');
        trendChartData.push({
          date: format(date, 'dd/MM', { locale: es }),
          value: dayCounts[key] || 0,
        });
      }
      setTrendData(trendChartData);

      // Weekly data (last 7 days from the end date)
      const weekDayLabels = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      const weeklyChartData: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(to, i);
        const key = format(date, 'yyyy-MM-dd');
        weeklyChartData.push({
          date: weekDayLabels[date.getDay()],
          value: dayCounts[key] || 0,
        });
      }
      setWeeklyData(weeklyChartData);

    } catch (error) {
      console.error('Error generating chart data:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchStats();
  };

  // Date range props for tab components
  const dateRangeProps = {
    dateFrom: dateFrom ? localDayStart(dateFrom) : undefined,
    dateTo: dateTo ? localDayEnd(dateTo) : undefined,
  };

  return (
    <MainLayout>
      <div className="p-6">
        <DashboardHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        <div className="mb-6">
          <DashboardStats stats={stats} isLoading={isLoading} />
        </div>

        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "resumen" && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg text-foreground">
                    Tendencia{dateFrom && dateTo ? ` - ${format(dateFrom, 'dd/MM/yyyy', { locale: es })} a ${format(dateTo, 'dd/MM/yyyy', { locale: es })}` : ' - Últimos 30 Días'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg text-foreground">Tendencia Semanal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <RecentActivity activities={recentActivity} isLoading={isLoading} />
            </div>
          </div>
        )}

        {activeTab === "tipo" && <TabConsentsByType {...dateRangeProps} />}
        {activeTab === "especialidad" && <TabConsentsBySpecialty {...dateRangeProps} />}
        {activeTab === "sede" && <TabConsentsBySource {...dateRangeProps} />}
        {activeTab === "medico" && <TabConsentsByDoctor {...dateRangeProps} />}
      </div>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="px-6 py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa - Sistema de Consentimientos Informados</p>
            <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

export default Dashboard;
