import { useState } from "react";
import { 
  LayoutGrid, 
  FilePlus, 
  Layers,
  Send,
  Menu,
  ChevronLeft,
  Settings,
  UserPlus
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
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md font-medium" 
          : "text-primary hover:bg-primary/10"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 shrink-0",
        isActive ? "text-primary-foreground" : "text-primary"
      )} />
      {!isCollapsed && (
        <span className="text-sm truncate">{label}</span>
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
    { icon: Layers, label: "Consentimientos Creados", to: "/consent-management" },
  ];

  const adminItems = [
    { icon: UserPlus, label: "Registrar Médico", to: "/doctor-registration" },
    { icon: Settings, label: "Panel Admin", to: "/admin" },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-background flex flex-col transition-all duration-300 shrink-0 p-4",
        isCollapsed ? "w-[80px]" : "w-[300px]"
      )}
    >

      {/* Navigation Label */}
      {!isCollapsed && (
        <div className="bg-primary/10 rounded-xl px-4 py-2 mb-4">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            Navegación Principal
          </span>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 overflow-y-auto">
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
              <div className="bg-muted/50 rounded-xl px-4 py-2 mt-6 mb-2">
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
      <div className="pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full justify-center gap-2 text-muted-foreground hover:text-foreground rounded-xl",
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
