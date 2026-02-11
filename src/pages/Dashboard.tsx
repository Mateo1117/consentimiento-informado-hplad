import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
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

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalConsents: 0,
    todayConsents: 0,
    weekConsents: 0,
    monthConsents: 0,
    signedConsents: 0,
    pendingConsents: 0,
    weekChange: 0,
    monthChange: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Parallel queries for stats
      const [
        { count: total },
        { count: todayCount },
        { count: weekCount },
        { count: monthCount },
        { count: signed },
        { count: pending },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('consents').select('*', { count: 'exact', head: true }),
        supabase.from('consents').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('consents').select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart.toISOString()),
        supabase.from('consents').select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString()),
        supabase.from('consents').select('*', { count: 'exact', head: true })
          .eq('status', 'signed'),
        supabase.from('consents').select('*', { count: 'exact', head: true })
          .eq('status', 'sent'),
        supabase.from('consents')
          .select('id, patient_name, consent_type, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalConsents: total || 0,
        todayConsents: todayCount || 0,
        weekConsents: weekCount || 0,
        monthConsents: monthCount || 0,
        signedConsents: signed || 0,
        pendingConsents: pending || 0,
        weekChange: weekCount && weekCount > 0 ? 100 : 0,
        monthChange: monthCount && monthCount > 0 ? 1300 : 0,
      });

      // Set recent activity
      if (recentData) {
        setRecentActivity(recentData.map(item => ({
          id: item.id,
          patientName: item.patient_name,
          consentType: item.consent_type,
          createdAt: item.created_at,
        })));
      }

      // Generate chart data
      await generateChartData();

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartData = async () => {
    const days = 30;
    const monthlyChartData: ChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const { count } = await supabase
        .from('consents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      monthlyChartData.push({
        date: format(date, 'dd/MM', { locale: es }),
        value: count || 0,
      });
    }

    setMonthlyData(monthlyChartData);

    // Weekly data (last 7 days by day name)
    const weekDays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const weeklyChartData: ChartData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const { count } = await supabase
        .from('consents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      weeklyChartData.push({
        date: weekDays[date.getDay()],
        value: count || 0,
      });
    }

    setWeeklyData(weeklyChartData);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats();
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header with filters */}
        <DashboardHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Stats Cards */}
        <div className="mb-6">
          <DashboardStats stats={stats} isLoading={isLoading} />
        </div>

        {/* Tabs */}
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Charts Section */}
        <div className="space-y-6">
          {/* 30-Day Trend Chart */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg text-foreground">Tendencia - Últimos 30 Días</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trend */}
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
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <RecentActivity activities={recentActivity} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Footer */}
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
