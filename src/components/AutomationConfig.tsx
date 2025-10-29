import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Webhook, 
  Zap, 
  Bot, 
  Settings, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { automationService, type WebhookConfig } from "@/services/automationService";

export function AutomationConfig() {
  // Load saved webhooks from localStorage on mount
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => {
    try {
      const stored = localStorage.getItem('configured_webhooks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [currentWebhook, setCurrentWebhook] = useState<Partial<WebhookConfig>>({
    name: '',
    url: '',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    events: ['*'],
    active: true,
    platform: 'generic'
  });
  const [customParams, setCustomParams] = useState<Record<string, any>>({
    includePatientPhotos: true,
    includeSignatures: true,
    includeDifferentialApproach: false,
    customFields: [],
    testParameters: {}
  });
  const [customFieldsText, setCustomFieldsText] = useState<string>('');
  const [testParameterName, setTestParameterName] = useState<string>('');
  const [testParameterValue, setTestParameterValue] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('generic');
  const [testResults, setTestResults] = useState<any>(null);

  // Save webhooks to localStorage whenever they change
  const updateWebhooks = (newWebhooks: WebhookConfig[]) => {
    setWebhooks(newWebhooks);
    localStorage.setItem('configured_webhooks', JSON.stringify(newWebhooks));
  };

  const platforms = [
    { 
      value: 'n8n', 
      label: 'n8n', 
      icon: Bot, 
      color: 'bg-purple-100 text-purple-800',
      description: 'Workflows complejos y personalizables'
    },
    { 
      value: 'zapier', 
      label: 'Zapier', 
      icon: Zap, 
      color: 'bg-orange-100 text-orange-800',
      description: '5000+ integraciones disponibles'
    },
    { 
      value: 'make', 
      label: 'Make.com', 
      icon: Settings, 
      color: 'bg-blue-100 text-blue-800',
      description: 'Automatización visual e intuitiva'
    },
    { 
      value: 'power_automate', 
      label: 'Power Automate', 
      icon: Settings, 
      color: 'bg-green-100 text-green-800',
      description: 'Integración con Microsoft 365'
    },
    { 
      value: 'generic', 
      label: 'Genérico', 
      icon: Webhook, 
      color: 'bg-gray-100 text-gray-800',
      description: 'Webhook personalizado'
    }
  ];

  const availableEvents = automationService.getAvailableEvents();

  const handleAddWebhook = () => {
    if (!currentWebhook.name || !currentWebhook.url) {
      toast.error("Nombre y URL son requeridos");
      return;
    }

    const newWebhook: WebhookConfig = {
      id: Date.now().toString(),
      name: currentWebhook.name,
      url: currentWebhook.url,
      method: currentWebhook.method || 'POST',
      headers: currentWebhook.headers || { 'Content-Type': 'application/json' },
      events: currentWebhook.events || ['*'],
      active: currentWebhook.active !== false,
      platform: currentWebhook.platform || 'generic',
      description: currentWebhook.description
    };

    updateWebhooks([...webhooks, newWebhook]);
    setCurrentWebhook({
      name: '',
      url: '',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      events: ['*'],
      active: true,
      platform: 'generic'
    });
    
    toast.success("Webhook agregado exitosamente");
  };

  const handleTestWebhook = async (webhook?: WebhookConfig) => {
    const testUrl = webhook?.url || currentWebhook.url;
    const testPlatform = webhook?.platform || currentWebhook.platform;
    
    if (!testUrl) {
      toast.error("URL del webhook requerida para la prueba");
      return;
    }

    try {
      const result = await automationService.testWebhook(testUrl, testPlatform);
      setTestResults(result);
    } catch (error: any) {
      toast.error(`Error en prueba: ${error.message}`);
    }
  };

  const handleRemoveWebhook = (id: string) => {
    updateWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook eliminado");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => p.value === platform);
    const Icon = platformData?.icon || Webhook;
    return <Icon className="h-4 w-4" />;
  };

  const addTestParameter = () => {
    if (!testParameterName.trim() || !testParameterValue.trim()) {
      toast.error("Nombre y valor del parámetro son requeridos");
      return;
    }

    setCustomParams(prev => ({
      ...prev,
      testParameters: {
        ...prev.testParameters,
        [testParameterName]: testParameterValue
      }
    }));

    setTestParameterName('');
    setTestParameterValue('');
    toast.success("Parámetro de prueba agregado");
  };

  const removeTestParameter = (paramName: string) => {
    setCustomParams(prev => {
      const newTestParams = { ...prev.testParameters };
      delete newTestParams[paramName];
      return {
        ...prev,
        testParameters: newTestParams
      };
    });
    toast.success("Parámetro eliminado");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Configuración de Automatizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <TabsList className="grid grid-cols-5 w-full">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <TabsTrigger key={platform.value} value={platform.value} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {platform.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {platforms.map((platform) => (
              <TabsContent key={platform.value} value={platform.value} className="space-y-6 mt-6">
                {/* Platform Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={platform.color}>
                      <platform.icon className="h-4 w-4 mr-1" />
                      {platform.label}
                    </Badge>
                    <span className="text-sm text-gray-600">{platform.description}</span>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    <strong>Instrucciones de configuración:</strong>
                    <pre className="mt-2 bg-white p-3 rounded border text-xs whitespace-pre-wrap">
                      {automationService.getPlatformInstructions(platform.value)}
                    </pre>
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="webhook-name">Nombre del Webhook</Label>
                      <Input
                        id="webhook-name"
                        placeholder={`Mi integración ${platform.label}`}
                        value={currentWebhook.name}
                        onChange={(e) => setCurrentWebhook(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="webhook-url">URL del Webhook</Label>
                      <div className="flex gap-2">
                        <Input
                          id="webhook-url"
                          placeholder="https://tu-webhook-url.com/endpoint"
                          value={currentWebhook.url}
                          onChange={(e) => setCurrentWebhook(prev => ({
                            ...prev, 
                            url: e.target.value, 
                            platform: platform.value as 'n8n' | 'zapier' | 'make' | 'power_automate' | 'generic'
                          }))}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => currentWebhook.url && copyToClipboard(currentWebhook.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Eventos a Escuchar</Label>
                      <Select 
                        value={currentWebhook.events?.[0] || '*'} 
                        onValueChange={(value) => setCurrentWebhook(prev => ({...prev, events: [value]}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="*">Todos los eventos</SelectItem>
                          {availableEvents.map((event) => (
                            <SelectItem key={event.value} value={event.value}>
                              {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="webhook-active"
                        checked={currentWebhook.active}
                        onCheckedChange={(checked) => setCurrentWebhook(prev => ({...prev, active: checked}))}
                      />
                      <Label htmlFor="webhook-active">Webhook Activo</Label>
                    </div>
                  </div>
                </div>

                {/* Custom Parameters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Parámetros del Webhook</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-photos"
                          checked={customParams.includePatientPhotos}
                          onCheckedChange={(checked) => setCustomParams(prev => ({...prev, includePatientPhotos: checked}))}
                        />
                        <Label htmlFor="include-photos">Incluir fotos del paciente</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-signatures"
                          checked={customParams.includeSignatures}
                          onCheckedChange={(checked) => setCustomParams(prev => ({...prev, includeSignatures: checked}))}
                        />
                        <Label htmlFor="include-signatures">Incluir firmas digitales</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-differential"
                          checked={customParams.includeDifferentialApproach}
                          onCheckedChange={(checked) => setCustomParams(prev => ({...prev, includeDifferentialApproach: checked}))}
                        />
                        <Label htmlFor="include-differential">Incluir enfoque diferencial</Label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Campos personalizados adicionales</Label>
                        <Textarea
                          placeholder="Ej: timestamp_custom, hospital_code, internal_reference..."
                          value={customFieldsText}
                          onChange={(e) => {
                            setCustomFieldsText(e.target.value);
                            setCustomParams(prev => ({
                              ...prev, 
                              customFields: e.target.value.split(',').map(f => f.trim()).filter(Boolean)
                            }));
                          }}
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separar con comas. Estos campos se incluirán en el payload del webhook.
                        </p>
                      </div>

                      <div>
                        <Label>Parámetros de Prueba</Label>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Nombre del parámetro"
                              value={testParameterName}
                              onChange={(e) => setTestParameterName(e.target.value)}
                            />
                            <Input
                              placeholder="Valor de prueba"
                              value={testParameterValue}
                              onChange={(e) => setTestParameterValue(e.target.value)}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={addTestParameter}
                            disabled={!testParameterName.trim() || !testParameterValue.trim()}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar Parámetro
                          </Button>
                          
                          {/* Mostrar parámetros agregados */}
                          {Object.keys(customParams.testParameters).length > 0 && (
                            <div className="space-y-1">
                              {Object.entries(customParams.testParameters).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                                  <span><strong>{key}:</strong> {String(value)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTestParameter(key)}
                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Define valores específicos para probar el webhook.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview of payload */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Vista previa del payload:</h4>
                     <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
{JSON.stringify({
  event: "consent.created",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    consent: {
      id: "example-id",
      decision: "aprobar",
      procedures: ["Procedimiento ejemplo"]
    },
    patient: {
      name: "Juan Pérez",
      documentNumber: "12345678",
      photoUrl: customParams.includePatientPhotos ? "https://..." : undefined,
      differentialApproach: customParams.includeDifferentialApproach ? {} : undefined
    },
    signatures: customParams.includeSignatures ? { 
      patient: "data:image...", 
      professional: "data:image..." 
    } : undefined,
    customFields: customParams.customFields.length > 0 ? 
      customParams.customFields.reduce((acc, field) => ({...acc, [field]: "valor_ejemplo"}), {}) : 
      undefined,
    testParameters: Object.keys(customParams.testParameters).length > 0 ? 
      customParams.testParameters : 
      undefined
  },
  metadata: {
    source: "hospital_consent_system",
    version: "1.0.0"
  }
}, null, 2).replace(/"testParameters":\s*{[^}]*}/, 
  Object.keys(customParams.testParameters).length > 0 ? 
    `"testParameters": ${JSON.stringify(customParams.testParameters, null, 6).replace(/\n/g, '\n      ')}` : 
    '"testParameters": undefined'
)}
                    </pre>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleAddWebhook} className="bg-medical-blue hover:bg-medical-blue/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Webhook
                  </Button>
                  
                  <Button variant="outline" onClick={() => handleTestWebhook()}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Probar Webhook
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Resultado de la Prueba
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {testResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                {testResults.success ? 'Webhook funcionando correctamente' : 'Error en el webhook'}
              </span>
            </div>
            
            {testResults.response && (
              <div className="mt-3">
                <Label>Respuesta del servidor:</Label>
                <pre className="bg-gray-100 p-3 rounded text-xs mt-1 overflow-auto max-h-32">
                  {testResults.response}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Webhooks */}
      {webhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Configurados ({webhooks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(webhook.platform)}
                    <div>
                      <p className="font-medium">{webhook.name}</p>
                      <p className="text-sm text-gray-600 truncate max-w-xs">{webhook.url}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={webhook.active ? "default" : "secondary"}>
                          {webhook.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="outline">
                          {webhook.events.includes('*') ? 'Todos los eventos' : `${webhook.events.length} eventos`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(webhook.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => webhook.id && handleRemoveWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableEvents.map((event) => (
              <div key={event.value} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{event.value}</Badge>
                </div>
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-xs text-gray-600 mt-1">{event.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}