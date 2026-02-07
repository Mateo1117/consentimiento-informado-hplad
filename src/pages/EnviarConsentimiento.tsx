import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeCanvas } from 'qrcode.react';
import { deliveryLogService, type DeliveryMethod } from "@/services/deliveryLogService";
import { DeliveryHistoryPanel } from "@/components/DeliveryHistoryPanel";
import { patientApiService, type PatientData } from "@/services/patientApi";
import { StepIndicator } from "@/components/consent/StepIndicator";

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

const steps = [
  { id: 'search', label: 'Búsqueda' },
  { id: 'select', label: 'Selección' },
  { id: 'send', label: 'Envío' },
];

const documentTypes = [
  { value: "NI", label: "NI - Ninguno" },
  { value: "CC", label: "CC - Cédula de Ciudadanía" },
  { value: "CE", label: "CE - Cédula de Extranjería" },
  { value: "TI", label: "TI - Tarjeta de Identidad" },
  { value: "RC", label: "RC - Registro Civil" },
  { value: "PA", label: "PA - Pasaporte" },
  { value: "AS", label: "AS - Adulto sin Identificar" },
  { value: "MS", label: "MS - Menor sin Identificar" },
  { value: "SC", label: "SC - Salvoconducto" },
  { value: "CN", label: "CN - Certificado Nacido Vivo" },
  { value: "CD", label: "CD - Carné Diplomático" },
  { value: "PE", label: "PE - Permiso Especial" },
  { value: "PT", label: "PT - Permiso por Protección Temporal" },
  { value: "DE", label: "DE - Documento Extranjero" },
  { value: "SI", label: "SI - Sin Identificación" }
];

const EnviarConsentimiento = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState<'search' | 'select' | 'send'>('search');
  
  // Patient search state
  const [documentType, setDocumentType] = useState<string>("");
  const [searchDocument, setSearchDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  
  // Consent selection state
  const [consents, setConsents] = useState<Consent[]>([]);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [isLoadingConsents, setIsLoadingConsents] = useState(false);
  
  // Send state
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

  const getCompletedSteps = () => {
    if (currentStep === 'send') return ['search', 'select'];
    if (currentStep === 'select') return ['search'];
    return [];
  };

  // Search patient and consents
  const handleSearchPatient = async () => {
    if (!documentType) {
      toast.error("Por favor seleccione el tipo de documento");
      return;
    }
    
    if (!searchDocument) {
      toast.error("Por favor ingrese un número de documento");
      return;
    }

    setIsSearching(true);
    try {
      // Try to get patient data from external API (optional - don't block if fails)
      let foundPatientData: PatientData | null = null;
      try {
        const result = await patientApiService.searchByDocument(searchDocument);
        if (result.data) {
          foundPatientData = {
            ...result.data,
            tipoDocumento: documentType
          };
        }
      } catch (apiError) {
        console.log('External API unavailable, continuing with Supabase search');
      }

      // Always search for consents in Supabase, regardless of external API result
      await fetchPatientConsents(searchDocument, documentType, foundPatientData);
    } catch (error) {
      toast.error("Error al buscar consentimientos");
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch consents for a specific patient
  const fetchPatientConsents = async (documentNumber: string, docType: string, externalPatientData?: PatientData | null) => {
    setIsLoadingConsents(true);
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('id, patient_name, consent_type, status, created_at, share_token, patient_email, patient_phone, patient_document_type, patient_document_number')
        .eq('patient_document_number', documentNumber)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Use external patient data if available, otherwise create from consent data
        if (externalPatientData) {
          setPatientData(externalPatientData);
          toast.success("Paciente encontrado");
        } else {
          // Create minimal patient data from consent record
          const firstConsent = data[0];
          const nameParts = firstConsent.patient_name.split(' ');
          setPatientData({
            id: documentNumber,
            nombre: nameParts.slice(0, 2).join(' ') || firstConsent.patient_name,
            apellidos: nameParts.slice(2).join(' ') || '',
            numeroDocumento: documentNumber,
            tipoDocumento: docType,
            fechaNacimiento: '',
            edad: 0,
            sexo: '',
            eps: '',
            telefono: firstConsent.patient_phone || '',
            direccion: '',
            email: firstConsent.patient_email || '',
            centroSalud: '',
            sedeAtencion: ''
          });
          toast.success("Consentimientos pendientes encontrados");
        }
        setConsents(data);
        setCurrentStep('select');
      } else {
        toast.info("No se encontraron consentimientos pendientes para este documento");
        setPatientData(null);
        setConsents([]);
      }
    } catch (error) {
      console.error('Error fetching consents:', error);
      toast.error('Error al cargar consentimientos');
    } finally {
      setIsLoadingConsents(false);
    }
  };

  const handleSelectConsent = (consent: Consent) => {
    setSelectedConsent(consent);
    setPatientEmail(consent.patient_email || patientData?.email || "");
    setPatientPhone(consent.patient_phone || patientData?.telefono || "");
    setCurrentStep('send');
    setShowQR(false);
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setPatientData(null);
    setConsents([]);
    setSelectedConsent(null);
  };

  const handleBackToSelect = () => {
    setCurrentStep('select');
    setSelectedConsent(null);
    setShowQR(false);
  };

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
      {/* Step Indicator */}
      <StepIndicator 
        steps={steps} 
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
      />

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
                  Busque un paciente y envíe sus consentimientos pendientes por Email, SMS o WhatsApp
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 1: Patient Search */}
        {currentStep === 'search' && (
          <div className="max-w-4xl mx-auto">
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6" />
                  <CardTitle className="text-lg">
                    Búsqueda de Paciente
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {/* Document Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Documento *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Number */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Número de Documento *</Label>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Ingrese número de documento..."
                      value={searchDocument}
                      onChange={(e) => setSearchDocument(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSearchPatient}
                      disabled={isSearching || !documentType}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {isSearching ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>

                {/* Patient Found Info */}
                {patientData && (
                  <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Paciente Encontrado
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nombre:</span>
                        <p className="font-medium">{patientData.nombre} {patientData.apellidos}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Documento:</span>
                        <p className="font-medium">{patientData.tipoDocumento} {patientData.numeroDocumento}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">EPS:</span>
                        <p className="font-medium">{patientData.eps || 'No disponible'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teléfono:</span>
                        <p className="font-medium">{patientData.telefono || 'No disponible'}</p>
                      </div>
                    </div>
                    
                    {isLoadingConsents && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Buscando consentimientos pendientes...</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Consent Selection */}
        {currentStep === 'select' && patientData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Patient Summary */}
            <Card className="border-border shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {patientData.nombre} {patientData.apellidos}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {patientData.tipoDocumento} {patientData.numeroDocumento}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cambiar paciente
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Consent List */}
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-6 w-6" />
                  <CardTitle className="text-lg">
                    Consentimientos Pendientes de Firma
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {consents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Clock className="h-8 w-8 opacity-50" />
                    <span>No hay consentimientos pendientes para este paciente</span>
                    <Button variant="outline" onClick={handleBackToSearch} className="mt-4">
                      Buscar otro paciente
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {consents.map((consent) => (
                      <div
                        key={consent.id}
                        onClick={() => handleSelectConsent(consent)}
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {getConsentTypeLabel(consent.consent_type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Creado: {new Date(consent.created_at).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Send Options */}
        {currentStep === 'send' && selectedConsent && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Consent Summary */}
            <Card className="border-border shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedConsent.patient_name} - {getConsentTypeLabel(selectedConsent.consent_type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedConsent.patient_document_type} {selectedConsent.patient_document_number}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleBackToSelect}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cambiar consentimiento
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Send Options Card */}
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <Send className="h-6 w-6" />
                  <CardTitle className="text-lg">
                    Opciones de Envío
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
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

export default EnviarConsentimiento;
