import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, ClipboardCheck } from 'lucide-react';
import { useAppConsent } from '@/hooks/useAppConsent';
import { toast } from 'sonner';
import { ShareConsentButtons } from './ShareConsentButtons';
import { consentService, type ConsentData } from '@/services/consentService';
import { formatProcedureInfoForPayload } from '@/data/procedureInfo';
import { supabase } from '@/integrations/supabase/client';
import { PhotoService } from '@/services/photoService';
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
    centroSalud?: string;
    edad?: number;
    eps?: string;
    sexo?: string;
    direccion?: string;
    fechaNacimiento?: string;
  };
  onGeneratePDF: () => Promise<Blob>;
  onGetHTMLContent: () => string;
  onBack?: () => void;
  professionalData?: {
    name: string;
    document: string;
  };
  patientSignature?: string | null;
  patientPhotoUrl?: string | null;
  // Funciones para obtener datos dinámicamente antes de guardar
  getPatientSignature?: () => string | null;
  getPatientPhoto?: () => string | null;
  // Parámetros para casos de discapacidad/menores de edad
  hasDisability?: boolean;
  isMinor?: boolean;
  guardianSignature?: string | null;
  getGuardianSignature?: () => string | null;
  // Datos del acudiente
  guardianName?: string;
  guardianDocument?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  clinicalRiskNotes?: string;
}

export const ConsentFormWrapper: React.FC<ConsentFormWrapperProps> = ({
  children,
  consentType,
  consentTypeCode,
  consentDecision,
  patientData,
  onGeneratePDF,
  onGetHTMLContent,
  onBack,
  professionalData,
  patientSignature,
  patientPhotoUrl,
  getPatientSignature,
  getPatientPhoto,
  hasDisability = false,
  isMinor = false,
  guardianSignature,
  getGuardianSignature,
  guardianName = '',
  guardianDocument = '',
  guardianRelationship = '',
  guardianPhone = '',
  clinicalRiskNotes = ''
}) => {
  const { saveConsent, isSaving } = useAppConsent();
  const [isPreDiligenciando, setIsPreDiligenciando] = useState(false);
  const [preDiligenciadoConsent, setPreDiligenciadoConsent] = useState<any>(null);

  /**
   * Guarda el consentimiento pre-diligenciado por el médico (con su firma) pero en estado
   * "sent" para que el paciente solo añada foto, huella y firma después.
   */
  const handlePreDiligenciar = async () => {
    setIsPreDiligenciando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener firma profesional
      const { data: profSig } = await supabase
        .from('professional_signatures')
        .select('signature_data, professional_name, professional_document')
        .eq('created_by', user.id)
        .single();

      if (!profSig?.signature_data) {
        toast.error('Falta la firma del profesional', {
          description: 'Debe registrar su firma profesional antes de generar cualquier consentimiento. Vaya a "Registro de Firma" en el menú.',
          duration: 6000,
        });
        setIsPreDiligenciando(false);
        return;
      }

      // Normalizar firma profesional a URL si viene en base64
      let profSigUrl: string | null = profSig?.signature_data || null;
      if (profSigUrl && profSigUrl.startsWith('data:image')) {
        const uploaded = await PhotoService.uploadPhoto(profSigUrl, 'firma_profesional');
        if (uploaded?.url) profSigUrl = uploaded.url;
      }

      const procedureInfo = formatProcedureInfoForPayload(consentTypeCode || consentType);

      const { data: consent, error } = await supabase
        .from('consents')
        .insert({
          patient_name: `${patientData.nombre} ${patientData.apellidos}`,
          patient_document_type: patientData.tipoDocumento,
          patient_document_number: patientData.numeroDocumento,
          patient_email: patientData.email,
          patient_phone: patientData.telefono,
          consent_type: consentTypeCode || consentType,
          payload: {
            patientData,
            professionalData,
            decision: consentDecision,
            consentDecision,
            ...procedureInfo,
            hasDisability,
            isMinor,
            guardianName: guardianName || undefined,
            guardianDocument: guardianDocument || undefined,
            guardianRelationship: guardianRelationship || undefined,
            guardianPhone: guardianPhone || undefined,
            clinicalRiskNotes: clinicalRiskNotes || undefined,
            generatedAt: new Date().toISOString(),
          },
          created_by: user.id,
          professional_name: profSig?.professional_name || professionalData?.name,
          professional_document: profSig?.professional_document || professionalData?.document,
          professional_signature_data: profSigUrl,
          status: 'sent', // paciente aún debe firmar
          source: 'web',
        })
        .select()
        .single();

      if (error) throw error;

      // Construir URL de firma pública
      const baseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');
      const shareUrl = `${baseUrl}/firmar/${consent.share_token}`;

      setPreDiligenciadoConsent({ id: consent.id, shareUrl, shareToken: consent.share_token });
      toast.success('Consentimiento pre-diligenciado', {
        description: 'Ahora puede mostrar el QR al paciente para que firme.',
        duration: 6000,
      });
    } catch (err: any) {
      console.error('Error al pre-diligenciar:', err);
      toast.error('Error al pre-diligenciar el consentimiento');
    } finally {
      setIsPreDiligenciando(false);
    }
  };



  const handleSaveAndGenerate = async () => {
    try {
      // Obtener firma y foto ACTUALES del canvas (no usar valores en caché/estado anterior)
      // Si hay callback, usarlo EXCLUSIVAMENTE (ignorar prop que puede tener datos viejos)
      const currentPatientSignature = getPatientSignature ? getPatientSignature() : patientSignature;
      const currentPatientPhoto = getPatientPhoto ? getPatientPhoto() : patientPhotoUrl;
      const currentGuardianSignature = getGuardianSignature ? getGuardianSignature() : guardianSignature;
      const currentConsentDecision = consentDecision;
      
      // Determinar si requiere firma del acudiente en lugar del paciente
      const requiresGuardian = isMinor || hasDisability;

      // No loggear datos sensibles (base64). Solo presencia/longitud.
      console.log('📝 ConsentFormWrapper - Validación previa:', {
        hasPatientSignature: !!currentPatientSignature,
        patientSignatureLength: currentPatientSignature?.length || 0,
        hasGuardianSignature: !!currentGuardianSignature,
        guardianSignatureLength: currentGuardianSignature?.length || 0,
        hasPhoto: !!currentPatientPhoto,
        photoLength: currentPatientPhoto?.length || 0,
        consentDecision: currentConsentDecision,
        consentType,
        consentTypeCode,
        requiresGuardian,
        hasDisability,
        isMinor
      });

      // ═══ VALIDACIÓN ESTRICTA PARA CONSENTIMIENTO COMPLETO ═══
      // Requiere: (firma O huella del paciente) + firma del profesional

      // 1. Validar usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado', {
          description: 'Debe iniciar sesión para generar consentimientos.',
        });
        return;
      }

      // 2. Validar firma del profesional (OBLIGATORIA siempre para consentimiento completo)
      const { data: profSig } = await supabase
        .from('professional_signatures')
        .select('signature_data')
        .eq('created_by', user.id)
        .single();

      if (!profSig?.signature_data) {
        toast.error('Falta la firma del profesional', {
          description: 'Debe registrar su firma profesional antes de generar cualquier consentimiento. Vaya a "Registro de Firma" en el menú.',
          duration: 6000,
        });
        return;
      }

      // 3. Validar riesgos clínicos (obligatorio)
      if (!clinicalRiskNotes || clinicalRiskNotes.trim().length === 0) {
        toast.error('Campo obligatorio', {
          description: 'Debe diligenciar los riesgos en función de la situación clínica del paciente.',
          duration: 5000,
        });
        return;
      }

      // 4. Validar firma/huella del paciente (OBLIGATORIA siempre para consentimiento completo)
      const hasPatientSignature = currentPatientSignature && currentPatientSignature.length >= 100;
      const hasFingerprint = currentPatientPhoto && currentPatientPhoto.length > 100;

      if (requiresGuardian) {
        // Si requiere acudiente, se necesita firma del acudiente
        if (!currentGuardianSignature || currentGuardianSignature.length < 100) {
          toast.error('Falta la firma del acudiente', {
            description: 'La firma del acudiente es obligatoria cuando el paciente tiene discapacidad, es adulto mayor o presenta algún impedimento.',
            duration: 5000,
          });
          return;
        }
      } else {
        // Se requiere al menos firma del paciente O huella dactilar
        if (!hasPatientSignature && !hasFingerprint) {
          toast.error('Falta firma o huella del paciente', {
            description: 'Debe proporcionar al menos la firma digital o la huella dactilar del paciente para generar el consentimiento.',
            duration: 5000,
          });
          return;
        }
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
          guardianSignature: currentGuardianSignature,
          hasDisability,
          isMinor,
          clinicalRiskNotes: clinicalRiskNotes || undefined,
          generatedAt: new Date().toISOString()
        },
        professionalName: professionalData?.name,
        professionalDocument: professionalData?.document,
        pdfContent: htmlContent,
        patientSignature: currentPatientSignature || undefined,
        patientPhotoUrl: currentPatientPhoto || undefined,
        // Datos del acudiente
        hasDisability,
        isMinor,
        guardianName: guardianName || undefined,
        guardianDocument: guardianDocument || undefined,
        guardianRelationship: guardianRelationship || undefined,
        guardianPhone: guardianPhone || undefined,
        guardianSignature: currentGuardianSignature || undefined
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
      const message = error instanceof Error ? error.message : 'Error al procesar el consentimiento';
      toast.error(message);
    }
  };

  // Preparar datos para ShareConsentButtons
  // Incluir información del procedimiento para que se muestre en la página de firma pública
  const procedureInfo = formatProcedureInfoForPayload(consentTypeCode || consentType);
  
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
      // Información del procedimiento para mostrar al paciente
      ...procedureInfo,
      // Flags + datos de acudiente para firma remota (cuando aplique)
      hasDisability,
      isMinor,
      guardianName: guardianName || undefined,
      guardianDocument: guardianDocument || undefined,
      guardianRelationship: guardianRelationship || undefined,
      guardianPhone: guardianPhone || undefined,
    }
  };

  return (
    <div className="space-y-6">
      {children}
      
      <Separator />
      
      {/* Botones de acción */}
      <div className="space-y-4">

        {/* ── OPCIÓN 1: Médico pre-diligencia y el paciente solo firma ── */}
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-primary">Firma en consultorio (paciente presente)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                El médico pre-diligencia el formulario con su firma. El paciente escanea el QR y solo
                añade su foto, huella y firma.
              </p>
            </div>
          </div>
          {!preDiligenciadoConsent ? (
            <div className="flex justify-center">
              <Button
                onClick={handlePreDiligenciar}
                disabled={isPreDiligenciando}
                size="lg"
                className="w-full"
                variant="default"
              >
                {isPreDiligenciando ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <ClipboardCheck className="h-5 w-5 mr-2" />
                    Pre-diligenciar y generar QR para firma del paciente
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-accent font-medium text-center">
                ✅ Pre-diligenciado — Muestre el QR al paciente para que firme
              </p>
              <ShareConsentButtons
                consentData={{
                  ...shareConsentData,
                  // Pass existing consent id so it reuses the already-created record
                }}
                onConsentCreated={() => {}}
                existingConsent={preDiligenciadoConsent}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* ── OPCIÓN 2: Generar PDF completo (médico y paciente firman en el momento) ── */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center font-medium">
            — O complete el consentimiento directamente aquí —
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isSaving}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-w-[300px]"
            >
              <FileText className="h-5 w-5 mr-2" />
              {isSaving ? 'Generando...' : 'Generar Consentimiento Completo (PDF)'}
            </Button>
          </div>

          {/* Crear enlace remoto */}
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
        
        {/* Botón Volver */}
        {onBack && (
          <div className="flex justify-center">
            <Button
              onClick={onBack}
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto min-w-[300px]"
            >
              ← Volver
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentFormWrapper;
