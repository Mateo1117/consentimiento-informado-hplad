import { useState } from "react";
import { 
  LayoutGrid, 
  FilePlus, 
  Layers,
  Send,
  Menu,
  ChevronLeft,
  X
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoHospital from "@/assets/logo_hospital.png";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon: Icon, label, to, isCollapsed, isActive, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 min-h-[48px]",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md font-medium" 
          : "text-primary hover:bg-primary/10 active:bg-primary/20"
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

interface AppSidebarProps {
  isOverlay?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOverlay, onClose }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { icon: LayoutGrid, label: "Dashboard", to: "/dashboard" },
    { icon: FilePlus, label: "Crear Consentimiento", to: "/" },
    { icon: Layers, label: "Consentimientos Creados", to: "/consent-management" },
    { icon: Send, label: "Enviar Consentimiento", to: "/enviar-consentimiento" },
  ];

  // In overlay mode, never collapse — always show full width
  const collapsed = isOverlay ? false : isCollapsed;

  return (
    <aside 
      className={cn(
        "h-screen bg-background flex flex-col transition-all duration-300 shrink-0 p-4",
        collapsed ? "w-[80px]" : "w-[280px]",
        isOverlay && "shadow-2xl border-r border-border"
      )}
    >
      {/* Close button for overlay mode */}
      {isOverlay && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground -mr-2 -mt-1"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Logo */}
      <div 
        className="p-4 mb-2 cursor-pointer"
        onClick={() => { navigate("/"); isOverlay && onClose?.(); }}
      >
        {!collapsed ? (
          <div className="flex flex-col items-center justify-center">
            <img 
              src={logoHospital} 
              alt="Logo Hospital" 
              className="max-h-28 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <img 
              src={logoHospital} 
              alt="Logo Hospital" 
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
      </div>

      {/* Title Section */}
      {!collapsed && (
        <div className="mb-5 text-center">
          <h1 className="text-primary font-bold text-sm leading-tight">
            Sistema de Consentimientos Informados
          </h1>
          <div className="flex items-start gap-2 text-left mt-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
            <span className="text-xs text-muted-foreground leading-tight">
              E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa
            </span>
          </div>
        </div>
      )}

      {/* Navigation Label */}
      {!collapsed && (
        <div className="bg-primary/10 rounded-xl px-4 py-2 mb-4">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Navegación Principal
          </span>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isCollapsed={collapsed}
            isActive={location.pathname === item.to}
            onClick={isOverlay ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Collapse Toggle — only on desktop */}
      {!isOverlay && (
        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full justify-center gap-2 text-muted-foreground hover:text-foreground rounded-xl min-h-[44px]",
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
      )}
    </aside>
  );
}
