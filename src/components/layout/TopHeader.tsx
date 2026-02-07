import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Shield, UserPlus, Database, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface TopHeaderProps {
  onMenuClick?: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { user, signOut, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  
  const getRoleBadge = () => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      admin: {
        label: "Super Admin",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200"
      },
      doctor: {
        label: "Médico",
        className: "bg-blue-100 text-blue-700 border-blue-200"
      },
      lab_technician: {
        label: "Técnico Lab",
        className: "bg-green-100 text-green-700 border-green-200"
      },
      receptionist: {
        label: "Recepcionista",
        className: "bg-orange-100 text-orange-700 border-orange-200"
      },
      viewer: {
        label: "Visualizador",
        className: "bg-gray-100 text-gray-700 border-gray-200"
      }
    };
    
    const primaryRole = roles[0] || 'viewer';
    const config = roleConfig[primaryRole] || roleConfig.viewer;
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  };

  return (
    <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 shrink-0">
      {/* Left side - Menu button for mobile */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onMenuClick}
          className="text-primary-foreground hover:bg-primary-foreground/10 lg:flex"
        >
          <Menu className="h-5 w-5" />
          <span className="ml-2 font-medium">MENÚ</span>
        </Button>
      </div>

      {/* Right side - User Menu */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="text-primary-foreground hover:bg-primary-foreground/10 gap-2"
            >
              <User className="h-4 w-4" />
              <span className="font-medium">{getUserDisplayName()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.full_name || 'Usuario'}
                </p>
                {getRoleBadge()}
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
    </header>
  );
}
