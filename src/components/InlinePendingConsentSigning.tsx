import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateAndUploadSignedPDF } from '@/services/signedConsentPdfService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/SignaturePad';
import { FingerprintCapture, FingerprintCaptureRef } from '@/components/FingerprintCapture';
import { toast } from 'sonner';
import {
  CheckCircle, FileText, User, Calendar, AlertCircle,
  Stethoscope, Phone, Mail, CreditCard, Building2, Loader2
} from 'lucide-react';

interface InlinePendingConsentSigningProps {
  token: string;
  onSigned: () => void;
  onBack: () => void;
}

export const InlinePendingConsentSigning: React.FC<InlinePendingConsentSigningProps> = ({
  token,
  onSigned,
  onBack,
}) => {
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fingerprintRef = useRef<FingerprintCaptureRef>(null);

  useEffect(() => {
    loadConsent();
  }, [token]);

  const loadConsent = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .rpc('get_consent_by_token_secure', { p_token: token });

      if (error) throw error;
      if (!data || data.length === 0) {
        setError('Consentimiento no encontrado o enlace expirado');
        return;
      }

      const c = data[0];
      if (c.status === 'signed') {
        setError('Este consentimiento ya ha sido firmado');
        return;
      }

      setConsent(c);
      if (c.patient_name) setSignedByName(c.patient_name);
    } catch (err: any) {
      setError('Error al cargar el consentimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signedByName.trim()) { toast.error('Confirme el nombre del paciente'); return; }
    const hasSignature = signatureData && signatureData.length >= 100;
    const hasFingerprint = !!fingerprintData;
    if (!hasSignature && !hasFingerprint) { toast.error('Debe proporcionar al menos la firma digital o la huella dactilar'); return; }

    setSigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-sign-consent', {
        body: {
          token,
          signedByName: signedByName.trim(),
          signatureData,
          patientPhoto: fingerprintData,
          fingerprintData: fingerprintData,
        }
      });

      if (error || !data?.success) {
        toast.error('No se pudo completar la firma', { description: data?.error || error?.message });
        return;
      }

      toast.success('¡Consentimiento firmado exitosamente!');

      // Generar PDF automáticamente con firma + huella, guardarlo y actualizar pdf_url
      const consentForPdf = data?.consentData || {
        ...consent,
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_by_name: signedByName.trim(),
        patient_photo_url: data?.patientPhotoUrl || consent?.patient_photo_url,
      };

      toast.loading('Generando PDF del consentimiento...', { id: 'pdf-gen' });
      try {
        const { pdfUrl, pdfPath } = await generateAndUploadSignedPDF({
          consent: consentForPdf,
          signatureData,
          fingerprintData,
          patientPhotoUrl: data?.patientPhotoUrl || null,
        });
        toast.dismiss('pdf-gen');
        if (pdfUrl) {
          toast.success('PDF generado y guardado correctamente');
        } else {
          toast.warning('Consentimiento firmado, pero no se pudo generar el PDF');
        }
      } catch {
        toast.dismiss('pdf-gen');
        toast.warning('Consentimiento firmado, pero no se pudo generar el PDF');
      }

      onSigned();
    } catch (err: any) {
      toast.error(`Error al firmar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Cargando consentimiento...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="font-semibold text-destructive">{error}</p>
          <Button variant="outline" onClick={onBack}>Volver</Button>
        </CardContent>
      </Card>
    );
  }

  if (!consent) return null;

  const payload = consent.payload || {};
  const patientData = payload.patientData || {};
  const hasProfessionalSignature = !!consent.professional_signature_data || !!consent.professional_name;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary mr-2" />
            <CardTitle>Consentimiento Pre-diligenciado</CardTitle>
          </div>
          <Badge variant="outline" className="mx-auto">
            {payload.procedureName || consent.consent_type?.toUpperCase()}
          </Badge>
          {hasProfessionalSignature && (
            <div className="mt-2 inline-flex items-center gap-2 bg-accent/10 text-accent text-xs px-3 py-1 rounded-full mx-auto">
              <CheckCircle className="h-3.5 w-3.5" />
              Firmado por el profesional médico
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {/* Datos del paciente */}
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
              <User className="w-4 h-4" /> Datos del Paciente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 rounded-lg p-3">
              <DataRow label="Nombre completo" value={consent.patient_name} />
              <DataRow
                label="Documento"
                value={consent.patient_document_type && consent.patient_document_number
                  ? `${consent.patient_document_type}: ${consent.patient_document_number}`
                  : undefined}
              />
              {patientData.eps && <DataRow label="EPS" value={patientData.eps} />}
              {patientData.centroSalud && <DataRow label="Centro de Salud" value={patientData.centroSalud} />}
              {consent.patient_phone && <DataRow label="Teléfono" value={consent.patient_phone} />}
            </div>
          </section>

          {/* Firma del profesional */}
          {(consent.professional_name || consent.professional_signature_data) && (
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
                <Stethoscope className="w-4 h-4" /> Profesional Médico
              </h3>
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                {consent.professional_name && <DataRow label="Nombre" value={consent.professional_name} />}
                {consent.professional_signature_data && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Firma del Profesional:</p>
                    <img
                      src={consent.professional_signature_data}
                      alt="Firma profesional"
                      className="max-h-16 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          <Separator />

          {/* Información del procedimiento */}
          {(payload.procedureDescription || payload.risks?.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary">
                <FileText className="w-4 h-4" /> Información del Procedimiento
              </h3>
              <div className="space-y-3">
                {payload.procedureDescription && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-sm">
                    {payload.procedureDescription}
                  </div>
                )}
                {payload.risks?.length > 0 && (
                  <InfoList title="Riesgos" items={payload.risks} />
                )}
                {payload.benefits?.length > 0 && (
                  <InfoList title="Beneficios" items={payload.benefits} />
                )}
              </div>
            </section>
          )}

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-foreground leading-relaxed">
            <strong>Al firmar declaro que:</strong> He sido informado(a) sobre el procedimiento, sus riesgos,
            beneficios y alternativas. Autorizo al equipo médico a proceder y al hospital a tratar mis datos
            personales y de salud conforme a la Ley 1581 de 2012.
          </div>

          <Separator />

          {/* SECCIÓN DE FIRMA DEL PACIENTE */}
          <section className="space-y-5">
            <h3 className="text-base font-semibold text-primary">Firma del Paciente</h3>
            <p className="text-sm text-muted-foreground">
              Confirme su nombre y proporcione al menos la huella dactilar o la firma digital.
            </p>

            <div>
              <Label htmlFor="name-confirm">Confirme su nombre completo *</Label>
              <Input
                id="name-confirm"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                placeholder="Nombre completo del paciente"
                className="mt-1"
              />
            </div>

            {/* Foto de Huella Dactilar */}
            <FingerprintCapture
              ref={fingerprintRef}
              title="Huella Dactilar"
              subtitle="Capture la huella del paciente (opcional si firma digitalmente)"
              onFingerprintChange={setFingerprintData}
            />

            <div>
              <Label>Firma Digital (opcional si captura huella)</Label>
              <div className="mt-2">
                <SignaturePad
                  title="Firma del Paciente"
                  subtitle="Firme en el área siguiente"
                  onSignatureChange={setSignatureData}
                />
              </div>
            </div>

            <Button
              onClick={handleSign}
              disabled={signing || !signedByName.trim() || (!signatureData && !fingerprintData)}
              size="lg"
              className="w-full"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Firmar Consentimiento'
              )}
            </Button>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DataRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
};

const InfoList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="bg-muted/50 p-3 rounded-lg border border-border">
    <p className="text-xs font-semibold mb-2 text-foreground">{title}</p>
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);
