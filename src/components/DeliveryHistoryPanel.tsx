import React, { useEffect, useState } from 'react';
import { deliveryLogService, type DeliveryLog } from '@/services/deliveryLogService';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History } from 'lucide-react';

interface DeliveryHistoryPanelProps {
  consentId: string;
  refreshTrigger?: number;
}

export const DeliveryHistoryPanel: React.FC<DeliveryHistoryPanelProps> = ({ 
  consentId,
  refreshTrigger 
}) => {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const data = await deliveryLogService.getDeliveryLogs(consentId);
      setLogs(data);
      setIsLoading(false);
    };

    if (consentId) {
      fetchLogs();
    }
  }, [consentId, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <History className="h-5 w-5 mx-auto mb-2 opacity-50" />
        <p>Sin historial de envíos</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500 text-xs">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Fallido</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pendiente</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <History className="h-4 w-4" />
        Historial de Envíos ({logs.length})
      </h4>
      <ScrollArea className="h-[120px]">
        <div className="space-y-2 pr-3">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-xs"
            >
              <div className="flex items-center gap-2">
                <span>{deliveryLogService.getMethodIcon(log.delivery_method)}</span>
                <div>
                  <p className="font-medium">
                    {deliveryLogService.getMethodLabel(log.delivery_method)}
                  </p>
                  {log.recipient && (
                    <p className="text-muted-foreground truncate max-w-[150px]">
                      {log.recipient}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusBadge(log.status)}
                <span className="text-muted-foreground">
                  {formatDate(log.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
