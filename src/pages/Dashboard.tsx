import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileCheck, 
  FilePlus, 
  Clock, 
  CheckCircle, 
  Send,
  TrendingUp,
  Users,
  Calendar
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalConsents: number;
  pendingConsents: number;
  signedConsents: number;
  todayConsents: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalConsents: 0,
    pendingConsents: 0,
    signedConsents: 0,
    todayConsents: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total consents
        const { count: total } = await supabase
          .from('consents')
          .select('*', { count: 'exact', head: true });

        // Get pending consents
        const { count: pending } = await supabase
          .from('consents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Get signed consents
        const { count: signed } = await supabase
          .from('consents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'signed');

        // Get today's consents
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from('consents')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        setStats({
          totalConsents: total || 0,
          pendingConsents: pending || 0,
          signedConsents: signed || 0,
          todayConsents: todayCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Consentimientos",
      value: stats.totalConsents,
      icon: FileCheck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      title: "Pendientes de Firma",
      value: stats.pendingConsents,
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    {
      title: "Firmados",
      value: stats.signedConsents,
      icon: CheckCircle,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Creados Hoy",
      value: stats.todayConsents,
      icon: Calendar,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    }
  ];

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general del sistema de consentimientos informados
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">
                      {isLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/" 
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FilePlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Crear Consentimiento</p>
                  <p className="text-sm text-muted-foreground">Iniciar nuevo proceso</p>
                </div>
              </a>
              
              <a 
                href="/consent-management" 
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Ver Consentimientos</p>
                  <p className="text-sm text-muted-foreground">Gestionar existentes</p>
                </div>
              </a>
              
              <a 
                href="/enviar-consentimiento" 
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Enviar Consentimiento</p>
                  <p className="text-sm text-muted-foreground">Compartir para firma</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
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
