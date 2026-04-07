import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AutomationConfig } from "@/components/AutomationConfig";
import { NotificationConfig } from "@/components/NotificationConfig";
import { WebhookReceiver } from "@/components/WebhookReceiver";
import { WebhookConfig } from "@/components/WebhookConfig";
import { ApiConfig } from "@/components/ApiConfig";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";
import { UserManagement } from "@/components/admin/UserManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  Download, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Database,
  Shield,
  Activity,
  Mail,
  Globe,
  UserCog,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { consentService, type ConsentForm } from "@/services/legacy-consent";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  totalConsents: number;
  approvedConsents: number;
  deniedConsents: number;
  todayConsents: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface SystemHealth {
  databaseStatus: 'healthy' | 'warning' | 'error';
  storageUsage: number;
  lastBackup: string;
  activeUsers: number;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentForm[]>([]);
  const [filteredConsents, setFilteredConsents] = useState<ConsentForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalConsents: 0,
    approvedConsents: 0,
    deniedConsents: 0,
    todayConsents: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    databaseStatus: 'healthy',
    storageUsage: 45,
    lastBackup: new Date().toISOString(),
    activeUsers: 12
  });

  // Filtros
  const [filters, setFilters] = useState({
    dateRange: "week",
    status: "all",
    searchTerm: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [consents, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await consentService.getAllConsents();
      setConsents(data);
      calculateStats(data);
    } catch (error) {
      toast.error("Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: ConsentForm[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekAgo = subWeeks(today, 1);
    const monthAgo = subMonths(today, 1);

    const todayConsents = data.filter(c => 
      new Date(c.created_at || '') >= todayStart
    ).length;

    const weeklyConsents = data.filter(c => 
      new Date(c.created_at || '') >= weekAgo
    ).length;

    const monthlyConsents = data.filter(c => 
      new Date(c.created_at || '') >= monthAgo
    ).length;

    const approved = data.filter(c => c.consent_decision === 'aprobar').length;
    const denied = data.filter(c => c.consent_decision === 'disentir').length;

    setStats({
      totalConsents: data.length,
      approvedConsents: approved,
      deniedConsents: denied,
      todayConsents,
      weeklyGrowth: weeklyConsents,
      monthlyGrowth: monthlyConsents
    });
  };

  const applyFilters = () => {
    let filtered = [...consents];

    // Filtro por rango de fecha
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = subWeeks(now, 1);
          break;
        case "month":
          startDate = subMonths(now, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(consent => 
        new Date(consent.created_at || '') >= startDate
      );
    }

    // Filtro por estado
    if (filters.status !== "all") {
      filtered = filtered.filter(consent => consent.consent_decision === filters.status);
    }

    // Filtro por búsqueda
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(consent =>
        consent.patient_name.toLowerCase().includes(searchLower) ||
        consent.patient_surname.toLowerCase().includes(searchLower) ||
        consent.document_number.toLowerCase().includes(searchLower) ||
        consent.eps.toLowerCase().includes(searchLower)
      );
    }

    setFilteredConsents(filtered);
  };

  const exportData = () => {
    // Crear CSV básico
    const headers = ["Fecha", "Paciente", "Documento", "Estado", "EPS", "Centro de Salud"];
    const csvData = filteredConsents.map(consent => [
      format(new Date(consent.created_at || ''), "dd/MM/yyyy HH:mm"),
      `${consent.patient_name} ${consent.patient_surname}`,
      `${consent.document_type} ${consent.document_number}`,
      consent.consent_decision === 'aprobar' ? 'Aprobado' : 'Denegado',
      consent.eps,
      consent.healthcare_center
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `consentimientos_${format(new Date(), "dd-MM-yyyy")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Datos exportados exitosamente");
  };

  const getStatusBadge = (decision: string) => {
    return decision === "aprobar" ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        ✓ Aprobado
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        ✗ Denegado
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  };

  // Remove the isSupabaseConfigured check - Supabase is already configured

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background">
      <AuthenticatedHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-medical-blue/30 hover:bg-medical-blue/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-medical-blue flex items-center gap-2 md:gap-3">
                <Shield className="h-6 w-6 md:h-8 md:w-8" />
                Panel de Administración
              </h1>
              <p className="text-medical-gray mt-1 md:mt-2 text-xs md:text-sm">
                Gestión y monitoreo del sistema de consentimientos informados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
            <Button onClick={loadData} variant="outline" disabled={isLoading} size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button onClick={exportData} className="bg-medical-blue hover:bg-medical-blue/90 flex-1 sm:flex-none" size="sm">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-11">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden lg:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="consents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden lg:inline">Consentimientos</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden lg:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden lg:inline">Permisos</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden lg:inline">Análisis</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden lg:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden lg:inline">Automatización</span>
            </TabsTrigger>
            <TabsTrigger value="api-config" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden lg:inline">Config API</span>
            </TabsTrigger>
            <TabsTrigger value="patient-api" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">API Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden lg:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden lg:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Consentimientos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-medical-blue">{stats.totalConsents}</div>
                  <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.approvedConsents}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalConsents > 0 ? 
                      `${((stats.approvedConsents / stats.totalConsents) * 100).toFixed(1)}% del total` : 
                      'No hay datos'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hoy</CardTitle>
                  <Calendar className="h-4 w-4 text-medical-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-medical-blue">{stats.todayConsents}</div>
                  <p className="text-xs text-muted-foreground">Consentimientos hoy</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
                  <Activity className="h-4 w-4 text-medical-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-medical-blue">{stats.weeklyGrowth}</div>
                  <p className="text-xs text-muted-foreground">Últimos 7 días</p>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      systemHealth.databaseStatus === 'healthy' ? 'bg-green-500' :
                      systemHealth.databaseStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">Base de Datos</p>
                      <p className="text-sm text-gray-600 capitalize">{systemHealth.databaseStatus}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-medical-blue" />
                    <div>
                      <p className="font-medium">Almacenamiento</p>
                      <p className="text-sm text-gray-600">{systemHealth.storageUsage}% utilizado</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-medical-blue" />
                    <div>
                      <p className="font-medium">Usuarios Activos</p>
                      <p className="text-sm text-gray-600">{systemHealth.activeUsers} en línea</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredConsents.slice(0, 5).map((consent, index) => (
                    <div key={consent.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-medical-blue rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          Consentimiento {consent.consent_decision === 'aprobar' ? 'aprobado' : 'denegado'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {consent.patient_name} {consent.patient_surname} - {consent.document_number}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {consent.created_at && formatDate(consent.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consents Tab */}
          <TabsContent value="consents" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros y Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={filters.dateRange} onValueChange={(value) => 
                      setFilters(prev => ({...prev, dateRange: value}))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mes</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={filters.status} onValueChange={(value) => 
                      setFilters(prev => ({...prev, status: value}))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="aprobar">Aprobados</SelectItem>
                        <SelectItem value="disentir">Denegados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Búsqueda</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nombre, documento, EPS..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(prev => ({...prev, searchTerm: e.target.value}))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => setFilters({dateRange: "all", status: "all", searchTerm: ""})}
                      variant="outline"
                      className="w-full"
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <strong>Resultados:</strong> {filteredConsents.length} de {consents.length} consentimientos
                </div>
              </CardContent>
            </Card>

            {/* Consents Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Consentimientos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <p>Cargando consentimientos...</p>
                  </div>
                ) : filteredConsents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron consentimientos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>EPS</TableHead>
                          <TableHead>Centro</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Profesional</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConsents.map((consent) => (
                          <TableRow key={consent.id}>
                            <TableCell className="text-sm">
                              {consent.created_at && formatDate(consent.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {consent.patient_name} {consent.patient_surname}
                                </p>
                                <p className="text-sm text-gray-600">Edad: {consent.age} años</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{consent.document_type}</p>
                                <p className="text-sm text-gray-600">{consent.document_number}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {consent.eps}
                            </TableCell>
                            <TableCell className="text-sm max-w-[150px] truncate">
                              {consent.healthcare_center}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(consent.consent_decision)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>
                                <p className="font-medium">{consent.professional_name}</p>
                                <p className="text-xs text-gray-600">{consent.professional_document}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <RoleManagement />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia de Aprobaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Gráfico de tendencias</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Tasa de aprobación: {stats.totalConsents > 0 ? 
                        `${((stats.approvedConsents / stats.totalConsents) * 100).toFixed(1)}%` : 
                        'N/A'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Centro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      consents.reduce((acc, consent) => {
                        acc[consent.healthcare_center] = (acc[consent.healthcare_center] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([center, count]) => (
                      <div key={center} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[200px]">{center}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por EPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(
                    consents.reduce((acc, consent) => {
                      acc[consent.eps] = (acc[consent.eps] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 9)
                  .map(([eps, count]) => (
                    <div key={eps} className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-sm truncate">{eps}</p>
                      <p className="text-2xl font-bold text-medical-blue">{count}</p>
                      <p className="text-xs text-gray-600">
                        {stats.totalConsents > 0 ? 
                          `${((count / stats.totalConsents) * 100).toFixed(1)}%` : 
                          '0%'
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <NotificationConfig />
          </TabsContent>

          {/* API Configuration Tab */}
          <TabsContent value="api-config" className="space-y-6">
            <ApiConfig />
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <AutomationConfig />
          </TabsContent>

          {/* Patient API Tab */}
          <TabsContent value="patient-api" className="space-y-6">
            <WebhookConfig />
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <WebhookReceiver />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Estado de la Base de Datos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Estado de Conexión</span>
                    <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Último Backup</span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(systemHealth.lastBackup), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Registros Totales</span>
                    <span className="font-medium">{stats.totalConsents}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Configuración del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Versión</span>
                    <Badge variant="outline">v1.0.0</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Entorno</span>
                    <Badge className="bg-blue-100 text-blue-800">Producción</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Almacenamiento</span>
                    <span className="text-sm text-gray-600">{systemHealth.storageUsage}% usado</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Acciones del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Respaldar Datos
                  </Button>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpiar Cache
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}