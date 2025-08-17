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
    toast.success('Enlace copiado al portapapeles');
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank');
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
          onClick={() => openExternalLink(
            consentService.generateWhatsAppLink(shareableConsent.shareUrl, consentData.patientName)
          )}
          className="text-green-600 hover:text-green-700"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          WhatsApp
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