import { useState } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  FilePlus, 
  BarChart3, 
  Send,
  Menu,
  ChevronLeft,
  Settings,
  UserPlus,
  Database
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoHospital from "@/assets/logo_hospital_transparent.png";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isCollapsed: boolean;
  isActive: boolean;
}

const NavItem = ({ icon: Icon, label, to, isCollapsed, isActive }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-primary/10 group",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-foreground/70 hover:text-foreground"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 shrink-0 transition-colors",
        isActive ? "text-primary-foreground" : "text-primary group-hover:text-primary"
      )} />
      {!isCollapsed && (
        <span className="font-medium text-sm truncate">{label}</span>
      )}
    </NavLink>
  );
};

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const navItems = [
    { icon: FilePlus, label: "Crear Consentimiento", to: "/" },
    { icon: Database, label: "Gestionar Consentimientos", to: "/consent-management" },
  ];

  const adminItems = [
    { icon: UserPlus, label: "Registrar Médico", to: "/doctor-registration" },
    { icon: Settings, label: "Panel Admin", to: "/admin" },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Header with Logo */}
      <div className="p-4 border-b border-border">
        <div 
          className={cn(
            "flex items-center cursor-pointer",
            isCollapsed ? "justify-center" : "gap-3"
          )}
          onClick={() => navigate("/")}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
            <img 
              src={logoHospital} 
              alt="Logo Hospital" 
              className="h-10 w-auto object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-primary font-bold text-sm leading-tight truncate">
                Sistema de Consentimientos
              </span>
              <span className="text-primary font-semibold text-base leading-tight truncate">
                Informados
              </span>
              <span className="text-xs text-muted-foreground truncate">
                E.S.E. Hospital Pedro León Álvarez Díaz
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Label */}
      {!isCollapsed && (
        <div className="px-4 pt-6 pb-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Navegación Principal
          </span>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isCollapsed={isCollapsed}
            isActive={location.pathname === item.to}
          />
        ))}
        
        {/* Admin Section */}
        {isAdmin && (
          <>
            {!isCollapsed && (
              <div className="pt-4 pb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administración
                </span>
              </div>
            )}
            {adminItems.map((item) => (
              <NavItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                isCollapsed={isCollapsed}
                isActive={location.pathname === item.to}
              />
            ))}
          </>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full justify-center gap-2 text-muted-foreground hover:text-foreground",
            isCollapsed && "px-0"
          )}
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Colapsar menú</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
