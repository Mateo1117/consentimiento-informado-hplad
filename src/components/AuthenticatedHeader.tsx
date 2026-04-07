import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, Database, User, LogOut, Shield, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logoHospital from "@/assets/logo_hospital_transparent.png";

export function AuthenticatedHeader() {
  const {
    user,
    signOut,
    isAdmin,
    roles
  } = useAuth();
  const navigate = useNavigate();
  
  const getRoleLabel = () => {
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('doctor')) return 'Médico';
    if (roles.includes('lab_technician')) return 'Técnico de Laboratorio';
    if (roles.includes('receptionist')) return 'Recepcionista';
    if (roles.includes('viewer')) return 'Visualizador';
    return 'Usuario';
  };
  const getRoleBadge = () => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      admin: {
        label: "Administrador",
        className: "bg-purple-100 text-purple-800"
      },
      doctor: {
        label: "Médico",
        className: "bg-blue-100 text-blue-800"
      },
      lab_technician: {
        label: "Técnico Lab",
        className: "bg-green-100 text-green-800"
      },
      receptionist: {
        label: "Recepcionista",
        className: "bg-orange-100 text-orange-800"
      },
      viewer: {
        label: "Visualizador",
        className: "bg-gray-100 text-gray-800"
      }
    };
    
    const primaryRole = roles[0] || 'viewer';
    const config = roleConfig[primaryRole] || roleConfig.viewer;
    
    return <Badge className={config.className}>
        {config.label}
      </Badge>;
  };
  return <header className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white shadow-lg">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-primary-foreground bg-primary border-0">
          
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img 
              src={logoHospital} 
              alt="Logo Hospital" 
              className="h-14 md:h-20 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-xs md:text-sm font-medium leading-tight">E.S.E. Hospital</span>
              <span className="text-sm md:text-lg font-bold leading-tight">Pedro León Álvarez Díaz</span>
              <span className="text-xs font-medium leading-tight text-white/80">La Mesa</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap w-full md:w-auto">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Button onClick={() => navigate("/consent-management")} variant="outline" size="sm" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium text-xs md:text-sm">
                <Database className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Gestionar</span> Consent.
              </Button>
              
              {isAdmin && (
                <>
                  <Button onClick={() => navigate("/doctor-registration")} variant="outline" size="sm" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium text-xs md:text-sm">
                    <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Registrar</span> Médico
                  </Button>
                  
                  <Button onClick={() => navigate("/admin")} variant="outline" size="sm" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium text-xs md:text-sm">
                    <Settings className="h-4 w-4 mr-1 md:mr-2" />
                    Admin
                  </Button>
                </>
              )}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium text-xs md:text-sm">
                  <User className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}</span>
                  <span className="md:hidden">Perfil</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                    <div className="mt-1">
                      {getRoleBadge()}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 mr-2" />
                      Panel de Administración
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/doctor-registration")}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Registrar Médico
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/consent-management")}>
                  <Database className="h-4 w-4 mr-2" />
                  Gestión de Consentimientos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>;
}