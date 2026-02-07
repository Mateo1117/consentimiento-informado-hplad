import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Clock, TrendingUp, Calendar, CheckCircle, AlertCircle } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalConsents: number;
    todayConsents: number;
    weekConsents: number;
    monthConsents: number;
    signedConsents: number;
    pendingConsents: number;
    weekChange?: number;
    monthChange?: number;
  };
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const statCards = [
    {
      title: "Total",
      value: stats.totalConsents,
      icon: FileCheck,
      variant: "primary" as const,
    },
    {
      title: "Hoy",
      value: stats.todayConsents,
      icon: Clock,
      variant: "default" as const,
    },
    {
      title: "Semana",
      value: stats.weekConsents,
      icon: TrendingUp,
      variant: "default" as const,
      change: stats.weekChange,
    },
    {
      title: "Mes",
      value: stats.monthConsents,
      icon: Calendar,
      variant: "default" as const,
      change: stats.monthChange,
    },
    {
      title: "Firmados",
      value: stats.signedConsents,
      icon: CheckCircle,
      variant: "success" as const,
      subtitle: "Clic para ver todos",
    },
    {
      title: "Pendientes",
      value: stats.pendingConsents,
      icon: AlertCircle,
      variant: "warning" as const,
      subtitle: "Clic para ver detalles",
    },
  ];

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case "primary":
        return {
          border: "border-primary",
          text: "text-primary",
          bg: "bg-primary/5",
        };
      case "success":
        return {
          border: "border-accent",
          text: "text-accent",
          bg: "bg-accent/5",
        };
      case "warning":
        return {
          border: "border-amber-500",
          text: "text-amber-600",
          bg: "bg-amber-50",
        };
      default:
        return {
          border: "border-border",
          text: "text-foreground",
          bg: "bg-card",
        };
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => {
        const variantClasses = getVariantClasses(stat.variant);
        return (
          <Card 
            key={stat.title} 
            className={`${variantClasses.border} ${variantClasses.bg} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
                <stat.icon className={`h-4 w-4 ${stat.variant === 'default' ? 'text-muted-foreground' : variantClasses.text}`} />
              </div>
              <p className={`text-2xl font-bold ${variantClasses.text}`}>
                {isLoading ? "..." : stat.value}
              </p>
              {stat.change !== undefined && stat.change > 0 && (
                <p className="text-xs text-accent mt-1">
                  ↑ {stat.change}%
                </p>
              )}
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
