import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Save, FileText } from 'lucide-react';
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
}

export const ConsentFormWrapper: React.FC<ConsentFormWrapperProps> = ({
  children,
  consentType,
  patientData,
  onGeneratePDF,
  onGetHTMLContent,
  professionalData
}) => {
  const { saveConsent, isSaving } = useAppConsent();

  const handleSaveAndGenerate = async () => {
    try {
      // Generate PDF
      const pdfBlob = await onGeneratePDF();
      
      // Get HTML content for storage
      const htmlContent = onGetHTMLContent();
      
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
          generatedAt: new Date().toISOString()
        },
        professionalName: professionalData?.name,
        professionalDocument: professionalData?.document,
        pdfContent: htmlContent
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

        toast.success('Consentimiento guardado y PDF generado exitosamente');
      }
    } catch (error) {
      toast.error('Error al procesar el consentimiento');
    }
  };

  const handleDownloadOnly = async () => {
    try {
      const pdfBlob = await onGeneratePDF();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${consentType}_${patientData.nombre}_${patientData.apellidos}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      {children}
      
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Opciones de Guardado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar y Descargar PDF'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadOnly}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Solo Descargar PDF
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Guardar y Descargar:</strong> Almacena el consentimiento en la base de datos para su gestión posterior y descarga el PDF.
            <br />
            <strong>Solo Descargar:</strong> Genera y descarga el PDF sin guardarlo en la base de datos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentFormWrapper;