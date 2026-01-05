import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Globe, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Save, 
  RotateCcw,
  ExternalLink,
  Database,
  Activity
} from "lucide-react";
import { toast } from "sonner";

interface ApiEndpoint {
  name: string;
  url: string;
  description: string;
  method: string;
  status: 'active' | 'inactive' | 'testing';
}

const API_CONFIG_KEY = 'mcm_api_config';

export const ApiConfig = () => {
  const [currentConfig, setCurrentConfig] = useState<ApiEndpoint[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const defaultEndpoints: ApiEndpoint[] = [
    {
      name: "consulta-paciente",
      url: "http://190.145.223.146:666/mcm/controller/api.php",
      description: "API para consultar información de pacientes por documento (incluye edad)",
      method: "GET",
      status: "active"
    },
    {
      name: "envio-notificaciones",
      url: "https://api.ejemplo.com/notifications",
      description: "API para envío de notificaciones SMS/Email",
      method: "POST", 
      status: "inactive"
    },
    {
      name: "integracion-his",
      url: "https://api.ejemplo.com/his-integration",
      description: "Integración con Sistema de Información Hospitalaria",
      method: "POST",
      status: "inactive"
    }
  ];

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem(API_CONFIG_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        setCurrentConfig(config);
      } else {
        setCurrentConfig(defaultEndpoints);
      }
    } catch (error) {
      console.error('Error loading API configuration:', error);
      setCurrentConfig(defaultEndpoints);
      toast.error("Error al cargar la configuración, usando valores por defecto");
    }
  };

  const saveConfiguration = () => {
    try {
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(currentConfig));
      setHasChanges(false);
      toast.success("Configuración guardada exitosamente");
      
      // Notificar al servicio de patientApi que recargue la configuración
      window.dispatchEvent(new CustomEvent('api-config-updated', { 
        detail: { endpoints: currentConfig } 
      }));
      
      toast.info("Reinicie la aplicación para aplicar todos los cambios");
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error("Error al guardar la configuración");
    }
  };

  const resetToDefaults = () => {
    setCurrentConfig([...defaultEndpoints]);
    setHasChanges(true);
    toast.success("Configuración restablecida a valores por defecto");
  };

  const updateEndpoint = (index: number, field: keyof ApiEndpoint, value: string) => {
    const updated = [...currentConfig];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentConfig(updated);
    setHasChanges(true);
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    if (endpoint.name === 'consulta-paciente') {
      setIsLoading(true);
      try {
        const response = await fetch('https://drspravsvyxfhazpeygo.supabase.co/functions/v1/test-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyc3ByYXZzdnl4ZmhhenBleWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTU4MjksImV4cCI6MjA2OTMzMTgyOX0.YhBkyIcpykfzhq44yL3wlyxpHauSogwvmWxclcNCDz8`
          },
          body: JSON.stringify({
            webhookUrl: endpoint.url,
            platform: 'custom',
            testData: { documento: '72214439', tipo_documento: 'CC' }
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setTestResults(prev => ({
              ...prev,
              [endpoint.name]: {
                success: true,
                message: `Conexión exitosa. Status: ${result.status}`
              }
            }));
          } else {
            setTestResults(prev => ({
              ...prev,
              [endpoint.name]: {
                success: false,
                message: `Error: ${result.error || 'Error desconocido'}`
              }
            }));
          }
        } else {
          setTestResults(prev => ({
            ...prev,
            [endpoint.name]: {
              success: false,
              message: `Error del servidor: ${response.status}`
            }
          }));
        }
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [endpoint.name]: {
            success: false,
            message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }
        }));
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.info(`Prueba no implementada para ${endpoint.name}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copiada al portapapeles");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Activo</Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pruebas</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Inactivo</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="w-full bg-gradient-to-br from-card to-medical-blue-light border-medical-blue/20">
        <CardHeader className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Settings className="h-6 w-6" />
              Configuración de APIs y Endpoints
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-200 border-yellow-200">
                  Cambios pendientes
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="endpoints">Endpoints Configurados</TabsTrigger>
              <TabsTrigger value="documentation">Documentación</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-6 mt-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-medical-gray">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {currentConfig.length} endpoint(s) configurado(s)
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restablecer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer configuración?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción restablecerá todos los endpoints a sus valores por defecto. 
                          Los cambios no guardados se perderán.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={resetToDefaults}>
                          Restablecer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button 
                    onClick={saveConfiguration}
                    disabled={!hasChanges}
                    className="bg-medical-blue hover:bg-medical-blue/90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>

              {/* Endpoints Configuration */}
              <div className="space-y-4">
                {currentConfig.map((endpoint, index) => (
                  <Card key={endpoint.name} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-medical-blue" />
                          <div>
                            <CardTitle className="text-base">{endpoint.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(endpoint.status)}
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-xs text-gray-500">URL del Endpoint</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={endpoint.url}
                              onChange={(e) => updateEndpoint(index, 'url', e.target.value)}
                              placeholder="https://api.ejemplo.com/endpoint"
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(endpoint.url)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-500">Estado</Label>
                          <select
                            value={endpoint.status}
                            onChange={(e) => updateEndpoint(index, 'status', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="active">Activo</option>
                            <option value="testing">En Pruebas</option>
                            <option value="inactive">Inactivo</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testEndpoint(endpoint)}
                            disabled={isLoading || endpoint.status === 'inactive'}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Probando...
                              </>
                            ) : (
                              <>
                                <Activity className="h-3 w-3 mr-1" />
                                Probar Conexión
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(endpoint.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir
                          </Button>
                        </div>

                        {testResults[endpoint.name] && (
                          <div className={`flex items-center gap-2 text-sm ${
                            testResults[endpoint.name].success 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {testResults[endpoint.name].success ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="max-w-xs truncate">
                              {testResults[endpoint.name].message}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="documentation" className="space-y-6 mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Cómo Cambiar URLs de API
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Para cambiar una URL de API:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                        <li>Vaya a la pestaña "Endpoints Configurados"</li>
                        <li>Encuentre el endpoint que desea modificar</li>
                        <li>Edite la URL directamente en el campo correspondiente</li>
                        <li>Opcionalmente, cambie el estado del endpoint</li>
                        <li>Use "Probar Conexión" para verificar que funciona</li>
                        <li>Haga clic en "Guardar Cambios" para aplicar</li>
                        <li>Reinicie la aplicación para aplicar completamente los cambios</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Formato de Endpoints</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">API de Consulta de Pacientes</h4>
                        <div className="bg-gray-50 p-3 rounded border">
                          <p className="text-sm font-medium mb-1">Petición esperada (POST):</p>
                          <code className="text-xs bg-white p-2 rounded border block">
                            {`{
  "documento": "1234567890"
}`}
                          </code>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border mt-2">
                          <p className="text-sm font-medium mb-1">Respuesta esperada:</p>
                          <code className="text-xs bg-white p-2 rounded border block">
                            {`{
  "success": "true",
  "nombre_paciente": "JUAN PEREZ",
  "documento": "1234567890",
  "eps": "NUEVA EPS",
  "telefono_paciente": "3001234567"
}`}
                          </code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notas Importantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <p>Los cambios se guardan localmente en el navegador. Para aplicar completamente los cambios en el servicio de consulta de pacientes, es necesario reiniciar la aplicación.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <p>Use la función "Probar Conexión" antes de guardar para asegurarse de que el endpoint funciona correctamente.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Database className="h-4 w-4 text-blue-500 mt-0.5" />
                        <p>La configuración se mantiene entre sesiones. Use "Restablecer" para volver a los valores por defecto si es necesario.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};