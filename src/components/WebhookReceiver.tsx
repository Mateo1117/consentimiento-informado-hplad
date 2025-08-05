import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  Trash2,
  RefreshCw,
  Activity,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Temporary type definitions until Supabase types are regenerated
interface Database {
  public: {
    Tables: {
      webhook_logs: {
        Row: {
          id: number;
          source: string;
          event_type: string;
          payload: any;
          headers: any;
          processed: boolean;
          error_message?: string;
          processing_attempts: number;
          created_at: string;
          processed_at?: string;
        };
        Insert: {
          id?: number;
          source: string;
          event_type: string;
          payload: any;
          headers: any;
          processed?: boolean;
          error_message?: string;
          processing_attempts?: number;
          created_at?: string;
          processed_at?: string;
        };
        Update: {
          id?: number;
          source?: string;
          event_type?: string;
          payload?: any;
          headers?: any;
          processed?: boolean;
          error_message?: string;
          processing_attempts?: number;
          created_at?: string;
          processed_at?: string;
        };
      };
    };
  };
}

interface WebhookLog {
  id: number;
  source: string;
  event_type: string;
  payload: any;
  headers: any;
  processed: boolean;
  error_message?: string;
  processing_attempts: number;
  created_at: string;
  processed_at?: string;
}

export function WebhookReceiver() {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [filter, setFilter] = useState({
    status: 'all', // all, processed, pending, failed
    source: 'all'
  });

  const webhookUrl = `https://drspravsvyxfhazpeygo.supabase.co/functions/v1/receive-webhook`;

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [webhookLogs, filter]);

  const fetchWebhookLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setWebhookLogs(data || []);
    } catch (error: any) {
      toast.error(`Error cargando webhooks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...webhookLogs];

    if (filter.status !== 'all') {
      switch (filter.status) {
        case 'processed':
          filtered = filtered.filter(log => log.processed && !log.error_message);
          break;
        case 'pending':
          filtered = filtered.filter(log => !log.processed && !log.error_message);
          break;
        case 'failed':
          filtered = filtered.filter(log => log.error_message);
          break;
      }
    }

    if (filter.source !== 'all') {
      filtered = filtered.filter(log => log.source === filter.source);
    }

    setFilteredLogs(filtered);
  };

  const deleteWebhookLog = async (id: number) => {
    try {
      const { error } = await supabase
        .from('webhook_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setWebhookLogs(prev => prev.filter(log => log.id !== id));
      toast.success("Webhook eliminado");
    } catch (error: any) {
      toast.error(`Error eliminando webhook: ${error.message}`);
    }
  };

  const retryWebhook = async (log: WebhookLog) => {
    try {
      // Simulate webhook retry by calling the function again
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': log.source
        },
        body: JSON.stringify(log.payload)
      });

      if (response.ok) {
        toast.success("Webhook reprocesado exitosamente");
        fetchWebhookLogs();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Error reprocesando webhook: ${error.message}`);
    }
  };

  const getStatusBadge = (log: WebhookLog) => {
    if (log.error_message) {
      return <Badge variant="destructive">Error</Badge>;
    } else if (log.processed) {
      return <Badge variant="default">Procesado</Badge>;
    } else {
      return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const getStatusIcon = (log: WebhookLog) => {
    if (log.error_message) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (log.processed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const uniqueSources = [...new Set(webhookLogs.map(log => log.source))];

  const stats = {
    total: webhookLogs.length,
    processed: webhookLogs.filter(log => log.processed && !log.error_message).length,
    pending: webhookLogs.filter(log => !log.processed && !log.error_message).length,
    failed: webhookLogs.filter(log => log.error_message).length
  };

  return (
    <div className="space-y-6">
      {/* Header with endpoint info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Receptor de Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Endpoint URL:</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("URL copiada al portapapeles");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
                <div className="text-sm text-green-800">Procesados</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-800">Pendientes</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-red-800">Fallidos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({...prev, status: value}))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="processed">Procesados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.source} onValueChange={(value) => setFilter(prev => ({...prev, source: value}))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchWebhookLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs de Webhooks ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando webhooks...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay webhooks registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(log)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{log.event_type}</span>
                        {getStatusBadge(log)}
                        <Badge variant="outline">{log.source}</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span>Recibido: {new Date(log.created_at).toLocaleString('es-CO')}</span>
                        {log.processed_at && (
                          <span className="ml-4">
                            Procesado: {new Date(log.processed_at).toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>
                      
                      {log.error_message && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Detalles del Webhook</DialogTitle>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Evento:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded">{selectedLog.event_type}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Origen:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded">{selectedLog.source}</p>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Headers:</label>
                              <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-auto">
                                {JSON.stringify(selectedLog.headers, null, 2)}
                              </pre>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Payload:</label>
                              <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-auto">
                                {JSON.stringify(selectedLog.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {log.error_message && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryWebhook(log)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebhookLog(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Probar Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Puedes probar el endpoint enviando un webhook de prueba:
            </p>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Ejemplo de cURL:</p>
              <code className="text-xs block">
                {`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Source: test-system" \\
  -d '{
    "event": "integration.test",
    "data": {
      "message": "Test webhook",
      "timestamp": "${new Date().toISOString()}"
    },
    "source": "manual-test"
  }'`}
              </code>
            </div>

            <Button
              onClick={async () => {
                try {
                  const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Webhook-Source': 'admin-panel'
                    },
                    body: JSON.stringify({
                      event: 'integration.test',
                      data: {
                        message: 'Test desde panel admin',
                        timestamp: new Date().toISOString()
                      },
                      source: 'admin-panel'
                    })
                  });

                  if (response.ok) {
                    toast.success("Webhook de prueba enviado");
                    setTimeout(fetchWebhookLogs, 1000);
                  } else {
                    throw new Error(`HTTP ${response.status}`);
                  }
                } catch (error: any) {
                  toast.error(`Error enviando prueba: ${error.message}`);
                }
              }}
            >
              Enviar Webhook de Prueba
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}