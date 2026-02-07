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
  User,
  ArrowLeft,
  TestTube,
  Heart,
  TestTube2,
  Syringe,
  FlaskConical,
  CheckCircle2
} from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeCanvas } from 'qrcode.react';
import { deliveryLogService, type DeliveryMethod } from "@/services/deliveryLogService";
import { DeliveryHistoryPanel } from "@/components/DeliveryHistoryPanel";
import { patientApiService, type PatientData } from "@/services/patientApi";
import { StepIndicator } from "@/components/consent/StepIndicator";
import { ConsentTypeCard } from "@/components/consent/ConsentTypeCard";
import { useAuth } from "@/hooks/useAuth";

const consentTypes = [
  { 
    id: 'hiv', 
    title: 'VIH', 
    code: '1200AD01-F03', 
    icon: TestTube,
    iconBgColor: 'bg-primary/10',
    iconColor: 'text-primary'
  },
  { 
    id: 'frotis_vaginal', 
    title: 'Frotis Vaginal', 
    code: '1200AD01-F01', 
    icon: Heart,
    iconBgColor: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  { 
    id: 'carga_glucosa', 
    title: 'Carga Glucosa', 
    code: '1200AD01-F02', 
    icon: TestTube2,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  { 
    id: 'venopuncion', 
    title: 'Venopunción', 
    code: '1200AD01-F04', 
    icon: Syringe,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
];

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

interface CreatedConsent {
  id: string;
  share_token: string;
  consent_type: string;
  patient_name: string;
}

const EnviarConsentimiento = () => {
  const { user } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<'search' | 'select' | 'send'>('search');
  
  // Patient search state
  const [documentType, setDocumentType] = useState<string>("");
  const [searchDocument, setSearchDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  
  // Consent selection state
  const [selectedConsentType, setSelectedConsentType] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Created consent state
  const [createdConsent, setCreatedConsent] = useState<CreatedConsent | null>(null);
  const [isCreatingConsent, setIsCreatingConsent] = useState(false);
  
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

  const filteredConsentTypes = consentTypes.filter(type => 
    type.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    type.code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Search patient
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
      const result = await patientApiService.searchByDocument(searchDocument);
      
      if (result.data) {
        setPatientData({
          ...result.data,
          tipoDocumento: documentType
        });
        toast.success("Paciente encontrado");
        setCurrentStep('select');
      } else {
        // If patient not found in external API, still allow to continue with basic data
        setPatientData({
          id: searchDocument,
          nombre: '',
          apellidos: '',
          numeroDocumento: searchDocument,
          tipoDocumento: documentType,
          fechaNacimiento: '',
          edad: 0,
          sexo: '',
          eps: '',
          telefono: '',
          direccion: '',
          email: '',
          centroSalud: '',
          sedeAtencion: ''
        });
        toast.info("Paciente no encontrado en el sistema externo. Complete los datos manualmente.");
        setCurrentStep('select');
      }
    } catch (error) {
      // On error, still allow to continue
      setPatientData({
        id: searchDocument,
        nombre: '',
        apellidos: '',
        numeroDocumento: searchDocument,
        tipoDocumento: documentType,
        fechaNacimiento: '',
        edad: 0,
        sexo: '',
        eps: '',
        telefono: '',
        direccion: '',
        email: '',
        centroSalud: '',
        sedeAtencion: ''
      });
      toast.warning("No se pudo conectar con el sistema externo. Complete los datos manualmente.");
      setCurrentStep('select');
    } finally {
      setIsSearching(false);
    }
  };

  // Create consent and move to send step
  const handleConsentTypeSelect = async (typeId: string) => {
    if (!patientData) return;
    
    setSelectedConsentType(typeId);
    setIsCreatingConsent(true);
    
    try {
      const patientName = patientData.nombre && patientData.apellidos 
        ? `${patientData.nombre} ${patientData.apellidos}`.trim()
        : `Paciente ${patientData.numeroDocumento}`;

      // Create the consent in Supabase
      const { data, error } = await supabase
        .from('consents')
        .insert([{
          patient_name: patientName,
          patient_document_type: patientData.tipoDocumento,
          patient_document_number: patientData.numeroDocumento,
          patient_email: patientData.email || null,
          patient_phone: patientData.telefono || null,
          consent_type: typeId,
          status: 'pending',
          source: 'web',
          created_by: user?.id,
          payload: JSON.parse(JSON.stringify({
            patientData: patientData,
            createdFor: 'remote_signing'
          }))
        }])
        .select('id, share_token, consent_type, patient_name')
        .single();

      if (error) throw error;

      setCreatedConsent(data);
      setPatientEmail(patientData.email || '');
      setPatientPhone(patientData.telefono || '');
      setCurrentStep('send');
      toast.success("Consentimiento creado. Ahora puede enviarlo al paciente.");
    } catch (error: any) {
      console.error('Error creating consent:', error);
      toast.error(`Error al crear consentimiento: ${error.message}`);
    } finally {
      setIsCreatingConsent(false);
    }
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setPatientData(null);
    setSelectedConsentType(null);
    setCreatedConsent(null);
  };

  const handleBackToSelect = () => {
    setCurrentStep('select');
    setCreatedConsent(null);
    setShowQR(false);
  };

  const logDelivery = async (method: DeliveryMethod, recipient?: string, status: 'sent' | 'failed' = 'sent', error?: string) => {
    if (createdConsent?.id) {
      await deliveryLogService.logDelivery(createdConsent.id, method, recipient, status, error);
      setHistoryRefresh(prev => prev + 1);
    }
  };

  const handleSendEmail = async () => {
    if (!createdConsent) return;
    if (!patientEmail) {
      toast.error('Email del paciente requerido');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-email', {
        body: {
          to: patientEmail,
          patientName: createdConsent.patient_name,
          shareUrl: getShareUrl(createdConsent.share_token),
          consentType: getConsentTypeLabel(createdConsent.consent_type),
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
    if (!createdConsent) return;
    if (!patientPhone) {
      toast.error('Teléfono del paciente requerido');
      return;
    }
    
    setIsSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-sms', {
        body: {
          to: patientPhone,
          patientName: createdConsent.patient_name,
          shareUrl: getShareUrl(createdConsent.share_token),
          consentType: getConsentTypeLabel(createdConsent.consent_type),
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
    if (!createdConsent) return;
    if (!patientPhone) {
      toast.error('Teléfono del paciente requerido');
      return;
    }
    
    setIsSendingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-whatsapp', {
        body: {
          to: patientPhone,
          patientName: createdConsent.patient_name,
          shareUrl: getShareUrl(createdConsent.share_token),
          consentType: getConsentTypeLabel(createdConsent.consent_type),
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
    if (!qrRef.current || !createdConsent) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `consent-qr-${createdConsent.patient_name.replace(/\s+/g, '-')}.png`;
    link.href = url;
    link.click();
    toast.success('Código QR descargado');
    await logDelivery('qr');
  };

  const getConsentTypeLabel = (type: string) => {
    const found = consentTypes.find(c => c.id === type);
    return found?.title || type;
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
        <div className="mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Enviar Consentimiento</h2>
                <p className="text-sm text-muted-foreground">
                  Busque un paciente, seleccione el tipo de consentimiento y envíelo para firma remota
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 1: Patient Search */}
        {currentStep === 'search' && (
          <div>
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Consent Type Selection */}
        {currentStep === 'select' && patientData && (
          <div className="space-y-6">
            {/* Patient Info Summary */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {patientData.nombre && patientData.apellidos 
                          ? `${patientData.nombre} ${patientData.apellidos}`
                          : `Documento: ${patientData.numeroDocumento}`
                        }
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {patientData.tipoDocumento} {patientData.numeroDocumento}
                        {patientData.edad > 0 && ` • ${patientData.edad} años`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cambiar paciente
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Consent Type Selection */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-primary">
                      Seleccionar Tipo de Consentimiento
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Seleccione el tipo de consentimiento a enviar para firma remota
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar consentimiento por nombre o código..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Header */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Laboratorio</p>
                    <p className="text-xs text-muted-foreground">{filteredConsentTypes.length} consentimientos</p>
                  </div>
                </div>

                {/* Consent Types Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredConsentTypes.map((type) => (
                    <ConsentTypeCard
                      key={type.id}
                      icon={type.icon}
                      title={type.title}
                      code={type.code}
                      isActive={selectedConsentType === type.id}
                      onClick={() => handleConsentTypeSelect(type.id)}
                      iconBgColor={type.iconBgColor}
                      iconColor={type.iconColor}
                    />
                  ))}
                </div>

                {isCreatingConsent && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mr-3 text-primary" />
                    <span className="text-muted-foreground">Creando consentimiento...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Send Consent */}
        {currentStep === 'send' && createdConsent && patientData && (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="border-green-200 bg-green-50/50 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Consentimiento creado exitosamente</p>
                    <p className="text-sm text-green-600">
                      {getConsentTypeLabel(createdConsent.consent_type)} para {createdConsent.patient_name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient & Consent Summary */}
            <Card className="border-border shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{createdConsent.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patientData.tipoDocumento} {patientData.numeroDocumento}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {getConsentTypeLabel(createdConsent.consent_type)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Datos de Contacto</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Actualice los datos de contacto si es necesario antes de enviar
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email del Paciente</Label>
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Teléfono del Paciente</Label>
                    <Input
                      type="tel"
                      placeholder="+57 300 123 4567"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Send Options */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Enviar Consentimiento</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seleccione el método de envío para que el paciente firme el consentimiento
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Send Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || !patientEmail}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Mail className="h-6 w-6" />
                    )}
                    <span className="text-sm font-medium">Enviar por Email</span>
                  </Button>

                  <Button
                    onClick={handleSendSms}
                    disabled={isSendingSms || !patientPhone}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    {isSendingSms ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <MessageCircle className="h-6 w-6" />
                    )}
                    <span className="text-sm font-medium">Enviar por SMS</span>
                  </Button>

                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={isSendingWhatsApp || !patientPhone}
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSendingWhatsApp ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <MessageCircle className="h-6 w-6" />
                    )}
                    <span className="text-sm font-medium">Enviar por WhatsApp</span>
                  </Button>
                </div>

                {/* QR Code Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-foreground">Código QR</p>
                      <p className="text-sm text-muted-foreground">
                        El paciente puede escanear este código para firmar
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQR(!showQR)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {showQR ? 'Ocultar QR' : 'Mostrar QR'}
                    </Button>
                  </div>

                  {showQR && (
                    <div className="flex flex-col items-center gap-4 p-6 bg-muted/30 rounded-lg">
                      <div ref={qrRef} className="p-4 bg-white rounded-lg shadow-sm">
                        <QRCodeCanvas
                          value={getShareUrl(createdConsent.share_token)}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <Button variant="outline" onClick={downloadQR}>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar QR
                      </Button>
                    </div>
                  )}
                </div>

                {/* Direct Link */}
                <div className="border-t border-border pt-4">
                  <p className="font-medium text-foreground mb-2">Enlace Directo</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={getShareUrl(createdConsent.share_token)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(getShareUrl(createdConsent.share_token))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(getShareUrl(createdConsent.share_token), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery History */}
            <DeliveryHistoryPanel 
              consentId={createdConsent.id}
              refreshTrigger={historyRefresh}
            />

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBackToSelect}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nuevo Consentimiento
              </Button>
              <Button variant="outline" onClick={handleBackToSearch}>
                <User className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EnviarConsentimiento;
