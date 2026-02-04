import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, MessageCircle, Mail, Smartphone, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { consentService, type ConsentData } from "@/services/consentService";

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
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
            onClick={() => copyToClipboard(shareableConsent.shareUrl)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => openExternalLink(
              consentService.generateSMSLink(patientPhone, shareableConsent.shareUrl, consentData.patientName)
            )}
            className="text-blue-600 hover:text-blue-700"
          >
            <Smartphone className="w-4 h-4 mr-1" />
            SMS
          </Button>
        )}

        {patientEmail && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openExternalLink(
              consentService.generateEmailLink(patientEmail, shareableConsent.shareUrl, consentData.patientName)
            )}
            className="text-red-600 hover:text-red-700"
          >
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
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
    </div>
  );
};