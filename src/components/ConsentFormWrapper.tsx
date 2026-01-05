import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import { useAppConsent } from '@/hooks/useAppConsent';
import { toast } from 'sonner';

interface ConsentFormWrapperProps {
  children: React.ReactNode;
  consentType: string;
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

      // No loggear datos sensibles (base64). Solo presencia/longitud.
      console.log('📝 ConsentFormWrapper - Validación previa:', {
        hasSignature: !!currentPatientSignature,
        signatureLength: currentPatientSignature?.length || 0,
        hasPhoto: !!currentPatientPhoto,
        photoLength: currentPatientPhoto?.length || 0,
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
        consentType,
        payload: {
          patientData,
          professionalData,
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

  return (
    <div className="space-y-6">
      {children}
      
      <Separator />
      
      <div className="flex justify-center">
        <Button
          onClick={handleSaveAndGenerate}
          disabled={isSaving}
          size="lg"
          className="w-full sm:w-auto min-w-[300px]"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? 'Guardando...' : 'Crear y Guardar Consentimiento'}
        </Button>
      </div>
    </div>
  );
};

export default ConsentFormWrapper;
