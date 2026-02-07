import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Search, 
  FileCheck, 
  Mail, 
  MessageCircle, 
  QrCode, 
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Clock,
  CheckCircle,
  User
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeCanvas } from 'qrcode.react';
import { deliveryLogService, type DeliveryMethod } from "@/services/deliveryLogService";
import { DeliveryHistoryPanel } from "@/components/DeliveryHistoryPanel";

interface Consent {
  id: string;
  patient_name: string;
  consent_type: string;
  status: string;
  created_at: string;
  share_token: string;
  patient_email?: string;
  patient_phone?: string;
  patient_document_type?: string;
  patient_document_number?: string;
}

const EnviarConsentimiento = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  // Get the share URL for a consent
  const getShareUrl = (shareToken: string) => {
    const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/firmar/${shareToken}`;
  };

  useEffect(() => {
    fetchPendingConsents();
  }, []);

  useEffect(() => {
    if (selectedConsent) {
      setPatientEmail(selectedConsent.patient_email || "");
      setPatientPhone(selectedConsent.patient_phone || "");
      setShowQR(false);
    }
  }, [selectedConsent]);

  const fetchPendingConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('id, patient_name, consent_type, status, created_at, share_token, patient_email, patient_phone, patient_document_type, patient_document_number')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error('Error fetching consents:', error);
      toast.error('Error al cargar consentimientos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConsents = consents.filter(consent =>
    consent.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consent.consent_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consent.patient_document_number?.includes(searchTerm)
  );

  const logDelivery = async (method: DeliveryMethod, recipient?: string, status: 'sent' | 'failed' = 'sent', error?: string) => {
    if (selectedConsent?.id) {
      await deliveryLogService.logDelivery(selectedConsent.id, method, recipient, status, error);
      setHistoryRefresh(prev => prev + 1);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedConsent) return;
    if (!patientEmail) {
      toast.error('Email del paciente requerido');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-email', {
        body: {
          to: patientEmail,
          patientName: selectedConsent.patient_name,
          shareUrl: getShareUrl(selectedConsent.share_token),
          consentType: selectedConsent.consent_type,
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Email enviado exitosamente a ${patientEmail}`);
        await logDelivery('email', patientEmail, 'sent');
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Error al enviar email: ${error.message}`);
      await logDelivery('email', patientEmail, 'failed', error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSms = async () => {
    if (!selectedConsent) return;
    if (!patientPhone) {
      toast.error('Teléfono del paciente requerido');
      return;
    }
    
    setIsSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-sms', {
        body: {
          to: patientPhone,
          patientName: selectedConsent.patient_name,
          shareUrl: getShareUrl(selectedConsent.share_token),
          consentType: selectedConsent.consent_type,
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`SMS enviado exitosamente a ${patientPhone}`);
        await logDelivery('sms', patientPhone, 'sent');
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error(`Error al enviar SMS: ${error.message}`);
      await logDelivery('sms', patientPhone, 'failed', error.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedConsent) return;
    if (!patientPhone) {
      toast.error('Teléfono del paciente requerido');
      return;
    }
    
    setIsSendingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-whatsapp', {
        body: {
          to: patientPhone,
          patientName: selectedConsent.patient_name,
          shareUrl: getShareUrl(selectedConsent.share_token),
          consentType: selectedConsent.consent_type,
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`WhatsApp enviado exitosamente a ${patientPhone}`);
        await logDelivery('whatsapp', patientPhone, 'sent');
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      toast.error(`Error al enviar WhatsApp: ${error.message}`);
      await logDelivery('whatsapp', patientPhone, 'failed', error.message);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Enlace copiado al portapapeles');
    await logDelivery('link_copied');
  };

  const downloadQR = async () => {
    if (!qrRef.current || !selectedConsent) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `consent-qr-${selectedConsent.patient_name.replace(/\s+/g, '-')}.png`;
    link.href = url;
    link.click();
    toast.success('Código QR descargado');
    await logDelivery('qr');
  };

  const openExternalLink = (url: string) => {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      window.location.href = url;
    }
  };

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'hiv': 'VIH',
      'frotis_vaginal': 'Frotis Vaginal',
      'carga_glucosa': 'Carga Glucosa',
      'venopuncion': 'Venopunción',
      'hemocomponentes': 'Hemocomponentes'
    };
    return labels[type] || type;
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Enviar Consentimiento</h2>
                <p className="text-sm text-muted-foreground">
                  Envíe consentimientos pendientes de firma por Email, SMS o WhatsApp
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto grid gap-6">
          {/* Consent Selection Card */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
              <div className="flex items-center gap-3">
                <FileCheck className="h-6 w-6" />
                <CardTitle className="text-lg">
                  Seleccionar Consentimiento Pendiente
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-6">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Buscar consentimiento
                </Label>
                <Input
                  placeholder="Buscar por nombre, documento o tipo de consentimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Consent List */}
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Cargando consentimientos...</span>
                  </div>
                ) : filteredConsents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Clock className="h-8 w-8 opacity-50" />
                    <span>No hay consentimientos pendientes</span>
                  </div>
                ) : (
                  filteredConsents.map((consent) => (
                    <div
                      key={consent.id}
                      onClick={() => setSelectedConsent(consent)}
                      className={`p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConsent?.id === consent.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{consent.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {consent.patient_document_type} {consent.patient_document_number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">
                            {getConsentTypeLabel(consent.consent_type)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(consent.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Share Options Card - Only show when consent is selected */}
          {selectedConsent && (
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <Share2Icon className="h-6 w-6" />
                  <CardTitle className="text-lg">
                    Compartir Consentimiento
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {/* Patient Information */}
                <div className="space-y-3 p-4 bg-muted/50 border border-border rounded-lg">
                  <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Información del Paciente
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>
                      <p className="font-medium">{selectedConsent.patient_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Documento:</span>
                      <p className="font-medium">
                        {selectedConsent.patient_document_type} {selectedConsent.patient_document_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo de Consentimiento:</span>
                      <p className="font-medium">{getConsentTypeLabel(selectedConsent.consent_type)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant="secondary" className="mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente de firma
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient-email">Email del Paciente</Label>
                    <Input
                      id="patient-email"
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="paciente@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Teléfono del Paciente</Label>
                    <Input
                      id="patient-phone"
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="300 123 4567"
                    />
                  </div>
                </div>

                {/* Share Link */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Enlace de firma:</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={getShareUrl(selectedConsent.share_token)} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getShareUrl(selectedConsent.share_token))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExternalLink(getShareUrl(selectedConsent.share_token))}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code Section */}
                <Button
                  variant="default"
                  onClick={() => setShowQR(!showQR)}
                  className="w-full"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {showQR ? 'Ocultar Código QR' : 'Mostrar Código QR'}
                </Button>

                {showQR && (
                  <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-lg border">
                    <div ref={qrRef}>
                      <QRCodeCanvas 
                        value={getShareUrl(selectedConsent.share_token)} 
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      El paciente escanea este código con la cámara del celular para firmar
                    </p>
                    <Button size="sm" variant="outline" onClick={downloadQR}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Código QR
                    </Button>
                  </div>
                )}

                {/* Send Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || !patientEmail}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
                  </Button>
                  
                  <Button
                    onClick={handleSendSms}
                    disabled={isSendingSms || !patientPhone}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSendingSms ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isSendingSms ? 'Enviando...' : 'Enviar por SMS'}
                  </Button>
                  
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={isSendingWhatsApp || !patientPhone}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSendingWhatsApp ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-2" />
                    )}
                    {isSendingWhatsApp ? 'Enviando...' : 'Enviar por WhatsApp'}
                  </Button>
                </div>

                {/* Delivery History */}
                <div className="border-t pt-4">
                  <DeliveryHistoryPanel 
                    consentId={selectedConsent.id} 
                    refreshTrigger={historyRefresh}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="px-6 py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa - Sistema de Consentimientos Informados</p>
            <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

// Simple Share2 icon component
const Share2Icon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

export default EnviarConsentimiento;
