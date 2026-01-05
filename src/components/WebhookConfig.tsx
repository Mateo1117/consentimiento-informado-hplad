import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Globe, Copy, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { patientApiService } from "@/services/patientApi";

export const WebhookConfig = () => {
  const [currentWebhook, setCurrentWebhook] = useState("");
  const [newWebhook, setNewWebhook] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testParameters, setTestParameters] = useState<Record<string, string>>({ documento: "72214439", tipo_documento: "CC" });
  const [newParamName, setNewParamName] = useState("");
  const [newParamValue, setNewParamValue] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcm_api_config');
      if (saved) {
        const config = JSON.parse(saved);
        const ep = Array.isArray(config) ? config.find((e: any) => e.name === 'consulta-paciente') : null;
        if (ep && ep.url) {
          setCurrentWebhook(ep.url);
          return;
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar configuración local de API:', e);
    }
    // Fallback por defecto
    setCurrentWebhook('https://flow.mcmasociados.tech/webhook/G92PxmaZY4H2Mhbw/webhook4/consulta-paciente');
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copiada al portapapeles");
  };

  const testPatientSearch = async (documento: string) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      console.log(`Probando búsqueda de paciente con documento: ${documento}`);
      
      const result = await patientApiService.searchByDocument(documento);
      
      if (result.data) {
        setTestResult({
          success: true,
          message: `Paciente encontrado: ${result.data.nombre} - ${result.data.eps}`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'No se encontró paciente con ese documento'
        });
      }
    } catch (error) {
      console.error('Error al consultar API:', error);
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateWebhook = () => {
    if (!newWebhook.trim()) {
      toast.error("Por favor ingrese una URL válida");
      return;
    }

    if (!newWebhook.startsWith('http://') && !newWebhook.startsWith('https://')) {
      toast.error("La URL debe comenzar con http:// o https://");
      return;
    }

    try {
      const key = 'mcm_api_config';
      const saved = localStorage.getItem(key);
      let endpoints: any[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) endpoints = parsed;
      }

      // Actualizar o crear endpoint de consulta-paciente
      const idx = endpoints.findIndex((e: any) => e.name === 'consulta-paciente');
      const updatedEndpoint = {
        name: 'consulta-paciente',
        url: newWebhook.trim(),
        description: 'API para consultar información de pacientes por documento',
        method: 'POST',
        status: 'active' as const,
      };
      if (idx >= 0) endpoints[idx] = { ...endpoints[idx], ...updatedEndpoint };
      else endpoints.push(updatedEndpoint);

      localStorage.setItem(key, JSON.stringify(endpoints));
      // Notificar a los servicios que la config cambió
      window.dispatchEvent(new CustomEvent('api-config-updated', { detail: { endpoints } }));

      setCurrentWebhook(updatedEndpoint.url);
      setNewWebhook('');
      setTestResult(null);
      toast.success('Webhook actualizado correctamente');
    } catch (e) {
      console.error('Error al actualizar webhook:', e);
      toast.error('No se pudo guardar la configuración');
      return;
    }
  };

  const addTestParameter = () => {
    if (!newParamName.trim() || !newParamValue.trim()) {
      toast.error("Nombre y valor del parámetro son requeridos");
      return;
    }

    setTestParameters(prev => ({
      ...prev,
      [newParamName]: newParamValue
    }));

    setNewParamName('');
    setNewParamValue('');
    toast.success("Parámetro de prueba agregado");
  };

  const removeTestParameter = (paramName: string) => {
    if (paramName === 'documento') {
      toast.error("No se puede eliminar el parámetro 'documento' requerido");
      return;
    }
    
    setTestParameters(prev => {
      const newParams = { ...prev };
      delete newParams[paramName];
      return newParams;
    });
    toast.success("Parámetro eliminado");
  };

  const testWithParameters = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      console.log(`Probando webhook con parámetros:`, testParameters);
      
      // Usar directamente los parámetros de prueba como body
      const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(currentWebhook), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testParameters)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Respuesta del webhook:', data);
        setTestResult({
          success: true,
          message: `Webhook funcionando correctamente. Respuesta: ${JSON.stringify(data, null, 2)}`
        });
      } else {
        const errorText = await response.text();
        setTestResult({
          success: false,
          message: `Error ${response.status}: ${errorText}`
        });
      }
    } catch (error) {
      console.error('Error al probar webhook:', error);
      setTestResult({
        success: false,
        message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNewWebhook = async () => {
    if (!newWebhook.trim()) {
      toast.error("Por favor ingrese una URL de webhook válida");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      console.log(`Probando nuevo webhook: ${newWebhook}`);
      console.log(`Parámetros de prueba:`, testParameters);
      
      // Usar la función edge de Supabase para evitar problemas de CORS e IPs directas
      const response = await fetch('https://drspravsvyxfhazpeygo.supabase.co/functions/v1/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyc3ByYXZzdnl4ZmhhenBleWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTU4MjksImV4cCI6MjA2OTMzMTgyOX0.YhBkyIcpykfzhq44yL3wlyxpHauSogwvmWxclcNCDz8`
        },
        body: JSON.stringify({
          webhookUrl: newWebhook,
          platform: 'custom',
          testData: testParameters
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Respuesta del test webhook:', result);
        
        if (result.success) {
          setTestResult({
            success: true,
            message: `Nuevo webhook funcionando correctamente. Status: ${result.status}. Respuesta: ${result.response}`
          });
        } else {
          setTestResult({
            success: false,
            message: `Error en webhook: ${result.error || 'Error desconocido'}`
          });
        }
      } else {
        const errorText = await response.text();
        setTestResult({
          success: false,
          message: `Error del servidor: ${response.status} - ${errorText}`
        });
      }
    } catch (error) {
      console.error('Error al probar nuevo webhook:', error);
      setTestResult({
        success: false,
        message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-card to-medical-blue-light border-medical-blue/20">
      <CardHeader className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Settings className="h-6 w-6" />
          Configuración de Webhook para Pacientes
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Webhook Actual */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-medical-gray">
            <Globe className="h-4 w-4" />
            <Label className="text-sm font-medium">API/Webhook Actual</Label>
            <Badge variant="outline" className="ml-auto text-green-600 border-green-600">
              Activo
            </Badge>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-xs text-gray-500">URL del Webhook:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(currentWebhook)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-sm bg-white p-2 rounded border block break-all">
              {currentWebhook}
            </code>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => testPatientSearch("1015435249")}
              disabled={isLoading}
              className="border-medical-blue text-medical-blue hover:bg-medical-blue/10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                "Probar Webhook Actual"
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => copyToClipboard(currentWebhook)}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {testResult.success ? 'Prueba Exitosa' : 'Error en la Prueba'}
                  </p>
                  <p className="text-sm mt-1">{testResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-medical-blue/20" />

        {/* Configurar Nuevo Webhook */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-medical-gray">
            <Settings className="h-4 w-4" />
            <Label className="text-sm font-medium">Configurar Nuevo Webhook</Label>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-medical-gray">Nueva URL del Webhook *</Label>
              <Input
                placeholder="https://tu-webhook.com/endpoint"
                value={newWebhook}
                onChange={(e) => setNewWebhook(e.target.value)}
                className="border-medical-blue/30 focus:border-medical-blue"
              />
              <p className="text-xs text-gray-500">
                El webhook debe aceptar un POST con el campo "documento" y devolver los datos del paciente
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={testNewWebhook}
              disabled={isLoading || !newWebhook.trim()}
              className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Probar Nuevo Webhook"
                )}
              </Button>
              
              <Button
                onClick={updateWebhook}
                disabled={!newWebhook.trim() || isLoading}
                className="bg-medical-blue hover:bg-medical-blue/90 text-white"
              >
                Actualizar Webhook
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-medical-blue/20" />

        {/* Parámetros de Prueba */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-medical-gray">Parámetros de Prueba del Webhook</Label>
          
          <div className="space-y-4">
            {/* Agregar nuevo parámetro */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nombre del parámetro"
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                className="border-medical-blue/30 focus:border-medical-blue"
              />
              <Input
                placeholder="Valor de prueba"
                value={newParamValue}
                onChange={(e) => setNewParamValue(e.target.value)}
                className="border-medical-blue/30 focus:border-medical-blue"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={addTestParameter}
              disabled={!newParamName.trim() || !newParamValue.trim()}
              className="border-medical-blue text-medical-blue hover:bg-medical-blue/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar Parámetro
            </Button>

            {/* Lista de parámetros actuales */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Parámetros configurados:</Label>
              {Object.entries(testParameters).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                  <div className="flex items-center gap-3 flex-1">
                    <Label className="text-sm font-medium w-20">{key}:</Label>
                    <Input
                      value={value}
                      onChange={(e) => setTestParameters(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }))}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTestParameter(key)}
                    disabled={key === 'documento'}
                    className="h-8 w-8 p-0 hover:bg-red-100 ml-2"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Vista previa del payload */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <Label className="text-xs font-medium text-blue-800 mb-2 block">Payload que se enviará:</Label>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
{JSON.stringify(testParameters, null, 2)}
              </pre>
            </div>

            {/* Botón de prueba con parámetros */}
            <Button
              onClick={testWithParameters}
              disabled={isLoading}
              className="w-full bg-medical-blue hover:bg-medical-blue/90 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Probando con parámetros...
                </>
              ) : (
                "Probar Webhook con Parámetros Configurados"
              )}
            </Button>

            <p className="text-xs text-gray-500">
              Los parámetros se enviarán en el cuerpo de la petición POST al webhook.
            </p>
          </div>
        </div>

        <Separator className="bg-medical-blue/20" />
        <div className="space-y-4">
          <Label className="text-sm font-medium text-medical-gray">Información de Integración</Label>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Formato de Petición Esperado:</h4>
            <code className="text-xs bg-white p-2 rounded border block">
              {`POST /tu-endpoint
Content-Type: application/json

{
  "documento": "1015435249"
}`}
            </code>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Formato de Respuesta Esperado:</h4>
            <code className="text-xs bg-white p-2 rounded border block whitespace-pre-wrap">
              {`{
  "OID_GENPACIEN": "205543",
  "DOCUMENTO_PACIENTE": "1015435249",
  "NOMBRE_PACIENTE": "MIGUEL MATEO LOPEZ HERRERA",
  "TELEFONO_PACIENTE": "3102448187",
  "EMAIL_PACIENTE": "mateolopez327@gmail.com",
  "TELEFONO_PRINCIPAL_PACIENTE": null,
  "FECHA_NACIMIENTO": "1992-05-05 15:31:20.143",
  "EDAD_PACIENTE": "33",
  "EPS": "PARTICULARES TARIFAS INSTITUCIONALES PROPIAS",
  "TIPO_DOCUMENTO": "C.C"
}`}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};