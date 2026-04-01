import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // On mobile/tablet, close sidebar by default
  useEffect(() => {
    if (isMobileOrTablet) setSidebarOpen(false);
  }, [isMobileOrTablet]);

  return (
    <div className="min-h-screen flex w-full bg-muted/30 relative">
      {/* Overlay for mobile/tablet when sidebar is open */}
      {isMobileOrTablet && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "shrink-0 transition-all duration-300 z-50",
          isMobileOrTablet
            ? "fixed top-0 left-0 h-full shadow-2xl"
            : "relative",
          isMobileOrTablet && !sidebarOpen && "-translate-x-full",
          isMobileOrTablet && sidebarOpen && "translate-x-0",
          !isMobileOrTablet && !sidebarOpen && "hidden"
        )}
      >
        <AppSidebar
          isOverlay={isMobileOrTablet}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
