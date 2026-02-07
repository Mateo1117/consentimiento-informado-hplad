import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className={cn(
        "hidden lg:flex",
        !sidebarOpen && "lg:hidden"
      )}>
        <AppSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <TopHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
