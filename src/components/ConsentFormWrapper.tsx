import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText } from 'lucide-react';
import { useAppConsent } from '@/hooks/useAppConsent';
import { toast } from 'sonner';
import { ShareConsentButtons } from './ShareConsentButtons';
import { consentService, type ConsentData } from '@/services/consentService';

interface ConsentFormWrapperProps {
  children: React.ReactNode;
  /** Etiqueta visible / nombre del consentimiento (para UI/archivo). */
  consentType: string;
  /** Código interno estable (para BD/webhook). Ej: "venopuncion", "carga_glucosa", "hiv" */
  consentTypeCode?: string;
  /** Decisión del paciente: aprobar o disentir */
  consentDecision?: "aprobar" | "disentir";
  patientData: {
    nombre: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono?: string;
    email?: string;
  };
  onGeneratePDF: () => Promise<Blob>;
  onGetHTMLContent: () => string;
  professionalData?: {
    name: string;
    document: string;
  };
  patientSignature?: string | null;
  patientPhotoUrl?: string | null;
  // Funciones para obtener datos dinámicamente antes de guardar
  getPatientSignature?: () => string | null;
  getPatientPhoto?: () => string | null;
}

export const ConsentFormWrapper: React.FC<ConsentFormWrapperProps> = ({
  children,
  consentType,
  consentTypeCode,
  consentDecision,
  patientData,
  onGeneratePDF,
  onGetHTMLContent,
  professionalData,
  patientSignature,
  patientPhotoUrl,
  getPatientSignature,
  getPatientPhoto
}) => {
  const { saveConsent, isSaving } = useAppConsent();

  const handleSaveAndGenerate = async () => {
    try {
      // Obtener firma y foto justo antes de guardar (usando callbacks si están disponibles)
      const currentPatientSignature = getPatientSignature?.() || patientSignature;
      const currentPatientPhoto = getPatientPhoto?.() || patientPhotoUrl;
      const currentConsentDecision = consentDecision;

      // No loggear datos sensibles (base64). Solo presencia/longitud.
      console.log('📝 ConsentFormWrapper - Validación previa:', {
        hasSignature: !!currentPatientSignature,
        signatureLength: currentPatientSignature?.length || 0,
        hasPhoto: !!currentPatientPhoto,
        photoLength: currentPatientPhoto?.length || 0,
        consentDecision: currentConsentDecision,
        consentType,
        consentTypeCode,
      });

      // Validación requerida: firma del paciente
      if (!currentPatientSignature || currentPatientSignature.length < 100) {
        toast.error('Falta la firma del paciente', {
          description: 'La firma del paciente es obligatoria antes de guardar el consentimiento.',
          duration: 5000,
        });
        return;
      }

      // Get HTML content for storage first
      const htmlContent = onGetHTMLContent();
      
      // Generate PDF
      const pdfBlob = await onGeneratePDF();
      
      // Save to database with PDF
      const result = await saveConsent({
        patientName: `${patientData.nombre} ${patientData.apellidos}`,
        patientDocumentType: patientData.tipoDocumento,
        patientDocumentNumber: patientData.numeroDocumento,
        patientEmail: patientData.email,
        patientPhone: patientData.telefono,
        consentType: consentTypeCode || consentType,
        payload: {
          patientData,
          professionalData,
          decision: currentConsentDecision,
          consentDecision: currentConsentDecision,
          patientSignature: currentPatientSignature,
          patientPhotoUrl: currentPatientPhoto,
          generatedAt: new Date().toISOString()
        },
        professionalName: professionalData?.name,
        professionalDocument: professionalData?.document,
        pdfContent: htmlContent,
        patientSignature: currentPatientSignature || undefined,
        patientPhotoUrl: currentPatientPhoto || undefined
      });

      if (result.success) {
        // Download PDF for user
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${consentType}_${patientData.nombre}_${patientData.apellidos}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('¡Consentimiento creado exitosamente!', {
          description: `El consentimiento de ${patientData.nombre} ${patientData.apellidos} ha sido guardado y el PDF se ha descargado.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error al procesar consentimiento:', error);
      toast.error('Error al procesar el consentimiento');
    }
  };

  // Preparar datos para ShareConsentButtons
  const shareConsentData: ConsentData = {
    patientName: `${patientData.nombre} ${patientData.apellidos}`,
    patientDocumentType: patientData.tipoDocumento,
    patientDocumentNumber: patientData.numeroDocumento,
    patientEmail: patientData.email,
    patientPhone: patientData.telefono,
    consentType: consentTypeCode || consentType,
    payload: {
      patientData,
      professionalData,
      decision: consentDecision,
      consentDecision: consentDecision,
    }
  };

  return (
    <div className="space-y-6">
      {children}
      
      <Separator />
      
      {/* Botones de acción - orden unificado para todos los módulos */}
      <div className="space-y-4">
        {/* Botón principal: Generar Consentimiento */}
        <div className="flex justify-center">
          <Button
            onClick={handleSaveAndGenerate}
            disabled={isSaving}
            size="lg"
            className="w-full sm:w-auto min-w-[300px]"
          >
            <FileText className="h-5 w-5 mr-2" />
            {isSaving ? 'Generando...' : 'Generar Consentimiento'}
          </Button>
        </div>
        
        {/* Botón secundario: Crear Enlace para Firma */}
        <div className="flex justify-center">
          <div className="w-full sm:w-auto min-w-[300px]">
            <ShareConsentButtons 
              consentData={shareConsentData}
              onConsentCreated={(shareableConsent) => {
                console.log('Enlace de consentimiento creado:', shareableConsent);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentFormWrapper;
