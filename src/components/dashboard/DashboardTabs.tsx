import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Clock, Stethoscope, Building2, UserCircle } from "lucide-react";

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const tabs = [
    { id: "resumen", label: "Resumen", icon: BarChart3 },
    { id: "tipo", label: "Por Tipo", icon: Clock },
    { id: "especialidad", label: "Especialidad", icon: Stethoscope },
    { id: "sede", label: "Por Sede", icon: Building2 },
    { id: "medico", label: "Por Médico", icon: UserCircle },
  ];

  return (
    <div className="mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border h-auto p-1 flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
