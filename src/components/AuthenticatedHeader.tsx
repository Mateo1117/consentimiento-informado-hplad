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
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const getUserRole = () => {
    return user?.user_metadata?.role || 'usuario';
  };
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      doctor: {
        label: "Médico",
        className: "bg-blue-100 text-blue-800"
      },
      nurse: {
        label: "Enfermero/a",
        className: "bg-green-100 text-green-800"
      },
      admin: {
        label: "Administrador",
        className: "bg-purple-100 text-purple-800"
      },
      usuario: {
        label: "Usuario",
        className: "bg-gray-100 text-gray-800"
      }
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.usuario;
    return <Badge className={config.className}>
        {config.label}
      </Badge>;
  };
  return <header className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex-row flex items-center justify-between text-primary-foreground bg-primary border-0">
          
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={logoHospital} 
              alt="Logo Hospital" 
              className="h-20 w-auto cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/consent-management")} variant="outline" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium">
                <Database className="h-4 w-4 mr-2" />
                Gestionar Consentimientos
              </Button>
              
              <Button onClick={() => navigate("/doctor-registration")} variant="outline" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium">
                <UserPlus className="h-4 w-4 mr-2" />
                Registrar Médico
              </Button>
              
              <Button onClick={() => navigate("/admin")} variant="outline" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Panel Admin
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-white border-white bg-transparent hover:bg-white hover:text-medical-blue font-medium">
                  <User className="h-4 w-4 mr-2" />
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {user?.email}
                    </p>
                    <div className="mt-1">
                      {getRoleBadge(getUserRole())}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Panel de Administración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/consent-management")}>
                  <Database className="h-4 w-4 mr-2" />
                  Gestión de Consentimientos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/doctor-registration")}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Registrar Médico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600">
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