import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityItem {
  id: string;
  patientName: string;
  consentType: string;
  createdAt: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const formatConsentType = (type: string) => {
    const types: Record<string, string> = {
      'hiv': 'VIH',
      'frotis_vaginal': 'Frotis Vaginal',
      'carga_glucosa': 'Carga de Glucosa',
      'venopuncion': 'Venopunción',
      'hemocomponentes': 'Hemocomponentes',
    };
    return types[type] || type;
  };

  return (
    <Card className="border-border shadow-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg text-foreground">Actividad Reciente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay actividad reciente
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.patientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatConsentType(activity.consentType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
