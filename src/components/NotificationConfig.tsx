import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MessageSquare, 
  TestTube, 
  Save,
  AlertCircle,
  CheckCircle,
  Settings
} from "lucide-react";
import { toast } from "sonner";

interface EmailConfig {
  enabled: boolean;
  provider: 'resend' | 'sendgrid' | 'smtp';
  fromEmail: string;
  fromName: string;
  templates: {
    consentCreated: string;
    consentApproved: string;
    consentDenied: string;
  };
  recipients: string[];
}

interface SMSConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws' | 'generic';
  templates: {
    consentCreated: string;
    consentApproved: string;
    consentDenied: string;
  };
  recipients: string[];
}

export function NotificationConfig() {
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    enabled: false,
    provider: 'resend',
    fromEmail: 'notificaciones@hospital.com',
    fromName: 'Hospital Pedro Leon Alvarez Diaz de la Mesa',
    templates: {
      consentCreated: 'Se ha creado un nuevo consentimiento para el paciente {{patientName}}. Documento: {{documentNumber}}',
      consentApproved: 'El consentimiento del paciente {{patientName}} ha sido aprobado para: {{procedures}}',
      consentDenied: 'El consentimiento del paciente {{patientName}} ha sido denegado'
    },
    recipients: []
  });

  const [smsConfig, setSMSConfig] = useState<SMSConfig>({
    enabled: false,
    provider: 'twilio',
    templates: {
      consentCreated: 'Nuevo consentimiento: {{patientName}} - {{documentNumber}}',
      consentApproved: 'Consentimiento aprobado: {{patientName}} - {{procedures}}',
      consentDenied: 'Consentimiento denegado: {{patientName}}'
    },
    recipients: []
  });

  const [newRecipient, setNewRecipient] = useState('');
  const [testResults, setTestResults] = useState<any>(null);

  const handleSaveEmailConfig = async () => {
    try {
      // Aquí se guardaría la configuración en la base de datos
      toast.success("Configuración de email guardada exitosamente");
    } catch (error) {
      toast.error("Error al guardar configuración de email");
    }
  };

  const handleSaveSMSConfig = async () => {
    try {
      // Aquí se guardaría la configuración en la base de datos
      toast.success("Configuración de SMS guardada exitosamente");
    } catch (error) {
      toast.error("Error al guardar configuración de SMS");
    }
  };

  const handleTestEmail = async () => {
    try {
      // Aquí se enviaría un email de prueba
      setTestResults({ type: 'email', success: true, message: 'Email de prueba enviado correctamente' });
      toast.success("Email de prueba enviado");
    } catch (error) {
      setTestResults({ type: 'email', success: false, message: 'Error al enviar email de prueba' });
      toast.error("Error al enviar email de prueba");
    }
  };

  const handleTestSMS = async () => {
    try {
      // Aquí se enviaría un SMS de prueba
      setTestResults({ type: 'sms', success: true, message: 'SMS de prueba enviado correctamente' });
      toast.success("SMS de prueba enviado");
    } catch (error) {
      setTestResults({ type: 'sms', success: false, message: 'Error al enviar SMS de prueba' });
      toast.error("Error al enviar SMS de prueba");
    }
  };

  const addRecipient = (type: 'email' | 'sms') => {
    if (!newRecipient.trim()) {
      toast.error("Ingrese un destinatario válido");
      return;
    }

    if (type === 'email') {
      setEmailConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
    } else {
      setSMSConfig(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()]
      }));
    }
    
    setNewRecipient('');
    toast.success("Destinatario agregado");
  };

  const removeRecipient = (index: number, type: 'email' | 'sms') => {
    if (type === 'email') {
      setEmailConfig(prev => ({
        ...prev,
        recipients: prev.recipients.filter((_, i) => i !== index)
      }));
    } else {
      setSMSConfig(prev => ({
        ...prev,
        recipients: prev.recipients.filter((_, i) => i !== index)
      }));
    }
    toast.success("Destinatario eliminado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-medical-blue flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuración de Notificaciones
          </h2>
          <p className="text-medical-gray mt-1">
            Configure las notificaciones por email y SMS para eventos del sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuración de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-enabled"
                  checked={emailConfig.enabled}
                  onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="email-enabled">Habilitar notificaciones por email</Label>
              </div>

              {emailConfig.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email-provider">Proveedor de Email</Label>
                      <Select 
                        value={emailConfig.provider} 
                        onValueChange={(value) => setEmailConfig(prev => ({ ...prev, provider: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resend">Resend</SelectItem>
                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                          <SelectItem value="smtp">SMTP Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="from-email">Email Remitente</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={emailConfig.fromEmail}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                        placeholder="notificaciones@hospital.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="from-name">Nombre Remitente</Label>
                      <Input
                        id="from-name"
                        value={emailConfig.fromName}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                        placeholder="Hospital Pedro Leon Alvarez Diaz de la Mesa"
                      />
                    </div>
                  </div>

                  {/* Email Templates */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Plantillas de Email</h3>
                    
                    <div>
                      <Label htmlFor="email-consent-created">Consentimiento Creado</Label>
                      <Textarea
                        id="email-consent-created"
                        value={emailConfig.templates.consentCreated}
                        onChange={(e) => setEmailConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentCreated: e.target.value }
                        }))}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email-consent-approved">Consentimiento Aprobado</Label>
                      <Textarea
                        id="email-consent-approved"
                        value={emailConfig.templates.consentApproved}
                        onChange={(e) => setEmailConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentApproved: e.target.value }
                        }))}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email-consent-denied">Consentimiento Denegado</Label>
                      <Textarea
                        id="email-consent-denied"
                        value={emailConfig.templates.consentDenied}
                        onChange={(e) => setEmailConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentDenied: e.target.value }
                        }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Email Recipients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Destinatarios</h3>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="email@ejemplo.com"
                        type="email"
                      />
                      <Button onClick={() => addRecipient('email')}>
                        Agregar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {emailConfig.recipients.map((recipient, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {recipient}
                          <button
                            onClick={() => removeRecipient(index, 'email')}
                            className="ml-1 text-xs hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSaveEmailConfig} className="bg-medical-blue hover:bg-medical-blue/90">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </Button>
                    <Button variant="outline" onClick={handleTestEmail}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Enviar Prueba
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Configuration */}
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Configuración de SMS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sms-enabled"
                  checked={smsConfig.enabled}
                  onCheckedChange={(checked) => setSMSConfig(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="sms-enabled">Habilitar notificaciones por SMS</Label>
              </div>

              {smsConfig.enabled && (
                <>
                  <div>
                    <Label htmlFor="sms-provider">Proveedor de SMS</Label>
                    <Select 
                      value={smsConfig.provider} 
                      onValueChange={(value) => setSMSConfig(prev => ({ ...prev, provider: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="aws">AWS SNS</SelectItem>
                        <SelectItem value="generic">API Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SMS Templates */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Plantillas de SMS</h3>
                    
                    <div>
                      <Label htmlFor="sms-consent-created">Consentimiento Creado</Label>
                      <Textarea
                        id="sms-consent-created"
                        value={smsConfig.templates.consentCreated}
                        onChange={(e) => setSMSConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentCreated: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="sms-consent-approved">Consentimiento Aprobado</Label>
                      <Textarea
                        id="sms-consent-approved"
                        value={smsConfig.templates.consentApproved}
                        onChange={(e) => setSMSConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentApproved: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="sms-consent-denied">Consentimiento Denegado</Label>
                      <Textarea
                        id="sms-consent-denied"
                        value={smsConfig.templates.consentDenied}
                        onChange={(e) => setSMSConfig(prev => ({
                          ...prev,
                          templates: { ...prev.templates, consentDenied: e.target.value }
                        }))}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* SMS Recipients */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Números de Teléfono</h3>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        placeholder="+57 300 123 4567"
                        type="tel"
                      />
                      <Button onClick={() => addRecipient('sms')}>
                        Agregar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {smsConfig.recipients.map((recipient, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {recipient}
                          <button
                            onClick={() => removeRecipient(index, 'sms')}
                            className="ml-1 text-xs hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSaveSMSConfig} className="bg-medical-blue hover:bg-medical-blue/90">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </Button>
                    <Button variant="outline" onClick={handleTestSMS}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Enviar Prueba
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                {testResults.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Variables Disponibles en Plantillas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Variables de Paciente:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{"{{patientName}}"}</code> - Nombre completo del paciente</li>
                <li><code>{"{{documentNumber}}"}</code> - Número de documento</li>
                <li><code>{"{{age}}"}</code> - Edad del paciente</li>
                <li><code>{"{{phone}}"}</code> - Teléfono del paciente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Variables de Consentimiento:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{"{{procedures}}"}</code> - Procedimientos seleccionados</li>
                <li><code>{"{{decision}}"}</code> - Decisión del consentimiento</li>
                <li><code>{"{{professionalName}}"}</code> - Nombre del profesional</li>
                <li><code>{"{{healthcareCenter}}"}</code> - Centro de salud</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}