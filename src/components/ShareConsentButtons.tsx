import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, MessageCircle, Mail, Smartphone, Copy, ExternalLink, QrCode, Download, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { consentService, type ConsentData } from "@/services/consentService";
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from "@/integrations/supabase/client";
import { deliveryLogService, type DeliveryMethod } from "@/services/deliveryLogService";
import { DeliveryHistoryPanel } from "@/components/DeliveryHistoryPanel";

interface ShareConsentButtonsProps {
  consentData: ConsentData;
  onConsentCreated?: (shareableConsent: any) => void;
}

export const ShareConsentButtons: React.FC<ShareConsentButtonsProps> = ({ 
  consentData, 
  onConsentCreated 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareableConsent, setShareableConsent] = useState<any>(null);
  const [patientEmail, setPatientEmail] = useState(consentData.patientEmail || '');
  const [patientPhone, setPatientPhone] = useState(consentData.patientPhone || '');
  const [showQR, setShowQR] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const qrRef = useRef<HTMLDivElement>(null);

  const logDelivery = async (method: DeliveryMethod, recipient?: string, status: 'sent' | 'failed' = 'sent', error?: string) => {
    if (shareableConsent?.id) {
      await deliveryLogService.logDelivery(shareableConsent.id, method, recipient, status, error);
      setHistoryRefresh(prev => prev + 1);
    }
  };

  const handleSendEmail = async () => {
    if (!patientEmail) {
      toast.error('Email del paciente requerido');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-email', {
        body: {
          to: patientEmail,
          patientName: consentData.patientName,
          shareUrl: shareableConsent.shareUrl,
          consentType: consentData.consentType,
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
    if (!patientPhone) {
      toast.error('Teléfono del paciente requerido');
      return;
    }
    
    setIsSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-consent-sms', {
        body: {
          to: patientPhone,
          patientName: consentData.patientName,
          shareUrl: shareableConsent.shareUrl,
          consentType: consentData.consentType,
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

  const handleCreateShareableConsent = async () => {
    setIsCreating(true);
    try {
      const updatedData = {
        ...consentData,
        patientEmail: patientEmail.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
      };

      const result = await consentService.createShareableConsent(updatedData);
      if (result) {
        setShareableConsent(result);
        onConsentCreated?.(result);
        toast.success('Enlace de firma creado exitosamente');
      }
    } catch (error) {
      console.error('Error creating shareable consent:', error);
      toast.error('Error al crear el enlace de firma');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string, isLink: boolean = false) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
    if (isLink) {
      await logDelivery('link_copied');
    }
  };

  const openExternalLink = (url: string) => {
    // Para esquemas nativos (whatsapp://, sms:, mailto:) es más confiable usar location.
    if (/^(whatsapp:\/\/|sms:|mailto:)/i.test(url)) {
      window.location.href = url;
      return;
    }

    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) {
      // Fallback si el navegador bloquea popups
      window.location.href = url;
    }
  };

  const downloadQR = async () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `consent-qr-${consentData.patientName.replace(/\s+/g, '-')}.png`;
    link.href = url;
    link.click();
    toast.success('QR descargado');
    await logDelivery('qr');
  };

  if (!shareableConsent) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Crear Enlace para Firma
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Enlace de Firma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="patient-email">Email del Paciente (opcional)</Label>
              <Input
                id="patient-email"
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder="paciente@email.com"
              />
            </div>
            <div>
              <Label htmlFor="patient-phone">Teléfono del Paciente (opcional)</Label>
              <Input
                id="patient-phone"
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>
            <Button 
              onClick={handleCreateShareableConsent} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Creando...' : 'Crear Enlace de Firma'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <h3 className="font-semibold text-sm">Compartir Consentimiento</h3>
      
      {/* Patient Information */}
      <div className="space-y-2 p-3 bg-background border rounded-md">
        <h4 className="font-medium text-sm text-foreground">Información del Paciente:</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium">Nombre:</span> {consentData.patientName}</p>
          {consentData.patientDocumentType && consentData.patientDocumentNumber && (
            <p><span className="font-medium">Documento:</span> {consentData.patientDocumentType} {consentData.patientDocumentNumber}</p>
          )}
          {patientEmail && (
            <p><span className="font-medium">Email:</span> {patientEmail}</p>
          )}
          {patientPhone && (
            <p><span className="font-medium">Teléfono:</span> {patientPhone}</p>
          )}
          <p><span className="font-medium">Tipo:</span> {consentData.consentType}</p>
        </div>
      </div>
      
      {/* QR Code Section */}
      {showQR && (
        <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border">
          <div ref={qrRef}>
            <QRCodeCanvas 
              value={shareableConsent.shareUrl} 
              size={180}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            El paciente escanea este código con la cámara del celular
          </p>
          <Button size="sm" variant="outline" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-1" />
            Descargar QR
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Enlace de firma:</Label>
        <div className="flex items-center space-x-2">
          <Input
            value={shareableConsent.shareUrl} 
            readOnly 
            className="text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(shareableConsent.shareUrl, true)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* QR Button - BEST OPTION */}
        <Button
          size="sm"
          variant="default"
          onClick={() => setShowQR(!showQR)}
          className="bg-primary text-primary-foreground col-span-2"
        >
          <QrCode className="w-4 h-4 mr-1" />
          {showQR ? 'Ocultar QR' : 'Mostrar Código QR'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            // Primero copiamos el mensaje (si la red bloquea WhatsApp web, igual el usuario puede pegarlo manualmente)
            const msg = consentService.buildWhatsAppMessage(
              consentData.patientName,
              shareableConsent.shareUrl,
            );
            navigator.clipboard.writeText(msg);
            toast.success('Mensaje copiado. Si no abre WhatsApp, péguelo manualmente.');

            // Luego intentamos abrir la app (sin usar dominios web que suelen bloquearse)
            openExternalLink(
              consentService.generateWhatsAppLink(
                shareableConsent.shareUrl,
                consentData.patientName,
                patientPhone,
              ),
            );
            await logDelivery('whatsapp', patientPhone);
          }}
          className="text-green-600 hover:text-green-700"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          WhatsApp
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(
            consentService.buildWhatsAppMessage(consentData.patientName, shareableConsent.shareUrl)
          )}
        >
          <Copy className="w-4 h-4 mr-1" />
          Copiar mensaje
        </Button>

        {patientPhone && (
          <>
            {/* Envío directo via Edge Function */}
            <Button
              size="sm"
              variant="default"
              onClick={handleSendSms}
              disabled={isSendingSms}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingSms ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              {isSendingSms ? 'Enviando...' : 'Enviar SMS'}
            </Button>
            {/* Fallback: Abrir app SMS local */}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                openExternalLink(
                  consentService.generateSMSLink(patientPhone, shareableConsent.shareUrl, consentData.patientName)
                );
                await logDelivery('sms_client', patientPhone);
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              <Smartphone className="w-4 h-4 mr-1" />
              App SMS
            </Button>
          </>
        )}

        {patientEmail && (
          <>
            {/* Envío directo via Edge Function */}
            <Button
              size="sm"
              variant="default"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              {isSendingEmail ? 'Enviando...' : 'Enviar Email'}
            </Button>
            {/* Fallback: Abrir cliente de correo local */}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                openExternalLink(
                  consentService.generateEmailLink(patientEmail, shareableConsent.shareUrl, consentData.patientName)
                );
                await logDelivery('email_client', patientEmail);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Mail className="w-4 h-4 mr-1" />
              Cliente Email
            </Button>
          </>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => openExternalLink(shareableConsent.shareUrl)}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Abrir
        </Button>
      </div>

      {shareableConsent.expiresAt && (
        <p className="text-xs text-muted-foreground">
          Expira: {new Date(shareableConsent.expiresAt).toLocaleDateString()}
        </p>
      )}

      {/* Delivery History */}
      <div className="border-t pt-3 mt-3">
        <DeliveryHistoryPanel 
          consentId={shareableConsent.id} 
          refreshTrigger={historyRefresh}
        />
      </div>
    </div>
  );
};