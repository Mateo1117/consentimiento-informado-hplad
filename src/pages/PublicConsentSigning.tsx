import React, { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/SignaturePad";
import { FingerprintCapture, FingerprintCaptureRef } from "@/components/FingerprintCapture";
import { consentService } from "@/services/consentService";
import { toast } from "sonner";
import {
  CheckCircle, FileText, User, Calendar, AlertCircle,
  Stethoscope, Phone, Mail, CreditCard, Building2, Fingerprint
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateAndUploadSignedPDF } from "@/services/signedConsentPdfService";

export const PublicConsentSigning: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const fingerprintRef = useRef<FingerprintCaptureRef>(null);

  useEffect(() => {
    if (token) loadConsent();
  }, [token]);

  const loadConsent = async () => {
    try {
      setLoading(true);
      const data = await consentService.getConsentByToken(token!);
      if (!data) { setError('Consentimiento no encontrado o enlace expirado'); return; }
      if (data.status === 'signed') { setError('Este consentimiento ya ha sido firmado'); return; }
      setConsent(data);
      // Pre-fill patient name from consent data
      if (data.patient_name) setSignedByName(data.patient_name);
    } catch (err) {
      setError('Error al cargar el consentimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signedByName.trim()) { toast.error('Por favor confirme su nombre completo'); return; }
    const hasSignature = signatureData && signatureData.length >= 100;
    const hasFingerprint = !!fingerprintData;
    if (!hasSignature && !hasFingerprint) { toast.error('Debe proporcionar al menos la firma digital o la huella dactilar'); return; }

    setSigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-sign-consent', {
        body: {
          token: token!,
          signedByName: signedByName.trim(),
          signatureData: signatureData || '',
          patientPhoto: '',
          fingerprintData: fingerprintData || '',
        }
      });

      if (error || !data?.success) {
        toast.error('No se pudo completar la firma', { description: data?.error || error?.message });
        return;
      }

      // Usar datos completos devueltos por la edge function para el PDF
      const consentForPdf = data?.consentData || {
        ...consent,
        status: 'signed',
        signed_at: new Date().toISOString(),
        signed_by_name: signedByName.trim(),
        patient_photo_url: data?.patientPhotoUrl || consent?.patient_photo_url,
      };
      setConsent((prev: any) => ({ ...prev, status: 'signed', signed_at: consentForPdf.signed_at, signed_by_name: signedByName.trim(), patient_photo_url: consentForPdf.patient_photo_url }));
      toast.success('¡Consentimiento firmado exitosamente!');

      // Generar PDF automáticamente con firma + huella y enviar al webhook
      toast.loading('Generando PDF del consentimiento...', { id: 'pdf-gen' });
      generateAndUploadSignedPDF({
        consent: consentForPdf,
        signatureData,
        fingerprintData,
        patientPhotoUrl: data?.patientPhotoUrl || null,
      }).then(({ pdfUrl }) => {
        toast.dismiss('pdf-gen');
        if (pdfUrl) toast.success('PDF generado y guardado correctamente');
      }).catch(() => {
        toast.dismiss('pdf-gen');
      });
    } catch (error: any) {
      toast.error(`Error al firmar: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSigning(false);
    }
  };

  if (!token) return <Navigate to="/404" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span>Cargando consentimiento...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !consent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (consent.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Consentimiento Firmado</h2>
            <p className="text-muted-foreground mb-4">Este consentimiento ya ha sido firmado exitosamente.</p>
            {consent.signed_at && (
              <p className="text-sm text-muted-foreground">
                Firmado el: {new Date(consent.signed_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const payload = consent.payload || {};
  const patientData = payload.patientData || {};
  const professionalData = payload.professionalData || {};
  const hasProfessionalSignature = !!consent.professional_signature_data || !!consent.professional_name;

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 text-primary mr-2" />
              <CardTitle className="text-2xl">Consentimiento Informado</CardTitle>
            </div>
            <Badge variant="outline" className="mx-auto text-sm px-3 py-1">
              {payload.procedureName || consent.consent_type?.toUpperCase()}
            </Badge>
            {hasProfessionalSignature && (
              <div className="mt-3 inline-flex items-center gap-2 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mx-auto">
                <CheckCircle className="h-4 w-4" />
                Pre-diligenciado y firmado por el profesional médico
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* ─── DATOS DEL PACIENTE (pre-diligenciados) ─── */}
            <section>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 text-primary">
                <User className="w-4 h-4" /> Datos del Paciente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 rounded-lg p-4">
                <DataRow icon={<User className="w-3.5 h-3.5" />} label="Nombre completo" value={consent.patient_name} />
                <DataRow
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  label="Documento"
                  value={consent.patient_document_type && consent.patient_document_number
                    ? `${consent.patient_document_type}: ${consent.patient_document_number}`
                    : undefined}
                />
                {(patientData.edad || patientData.fechaNacimiento) && (
                  <DataRow icon={<Calendar className="w-3.5 h-3.5" />} label="Edad / Fecha nac." value={patientData.edad ? `${patientData.edad} años` : patientData.fechaNacimiento} />
                )}
                {patientData.eps && <DataRow label="EPS" value={patientData.eps} />}
                {patientData.centroSalud && <DataRow icon={<Building2 className="w-3.5 h-3.5" />} label="Centro de Salud" value={patientData.centroSalud} />}
                {consent.patient_phone && <DataRow icon={<Phone className="w-3.5 h-3.5" />} label="Teléfono" value={consent.patient_phone} />}
                {consent.patient_email && <DataRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={consent.patient_email} />}
              </div>
            </section>

            {/* ─── DATOS DEL PROFESIONAL ─── */}
            {(consent.professional_name || professionalData.name) && (
              <section>
                <h3 className="text-base font-semibold flex items-center gap-2 mb-3 text-primary">
                  <Stethoscope className="w-4 h-4" /> Profesional Médico
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 rounded-lg p-4">
                  <DataRow label="Nombre" value={consent.professional_name || professionalData.name} />
                  {(consent.professional_document || professionalData.document) && (
                    <DataRow label="Documento" value={consent.professional_document || professionalData.document} />
                  )}
                </div>
                {consent.professional_signature_data && (
                  <div className="mt-3 p-3 border rounded-lg bg-muted/20">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Firma del Profesional:</p>
                    <img
                      src={consent.professional_signature_data}
                      alt="Firma profesional"
                      className="max-h-20 object-contain"
                    />
                  </div>
                )}
              </section>
            )}

            <Separator />

            {/* ─── INFORMACIÓN DEL PROCEDIMIENTO ─── */}
            <section>
              <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-primary">
                <FileText className="w-4 h-4" /> Información del Procedimiento
              </h3>
              <div className="space-y-4">
                {(payload.procedureDescription || payload.procedurePurpose) && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-2 text-primary text-sm">
                      {payload.procedureName || consent.consent_type}
                    </h4>
                    {payload.procedureDescription && (
                      <p className="text-sm text-foreground mb-2">{payload.procedureDescription}</p>
                    )}
                    {payload.procedurePurpose && (
                      <p className="text-sm text-foreground"><strong>Propósito:</strong> {payload.procedurePurpose}</p>
                    )}
                  </div>
                )}

                {payload.benefits && payload.benefits.length > 0 && (
                  <InfoList title="Beneficios Esperados" items={payload.benefits} color="green" icon={<CheckCircle className="w-4 h-4" />} />
                )}
                {payload.risks && payload.risks.length > 0 && (
                  <InfoList title="Riesgos Asociados" items={payload.risks} color="yellow" icon={<AlertCircle className="w-4 h-4" />} />
                )}
                {payload.alternatives && payload.alternatives.length > 0 && (
                  <InfoList title="Alternativas" items={payload.alternatives} color="purple" />
                )}

                <div className="bg-muted/50 p-4 rounded-lg border text-sm text-foreground leading-relaxed">
                  <strong>Al firmar este consentimiento declaro que:</strong> He sido informado(a) sobre el
                  procedimiento, sus riesgos, beneficios y alternativas. He tomado una decisión informada y
                  autorizo al equipo médico a proceder. En cumplimiento de la Ley 1581 de 2012 y el Decreto
                  1377 de 2013, <strong>AUTORIZO</strong> a la E.S.E. Hospital Pedro León Álvarez Díaz de La
                  Mesa para la recolección, almacenamiento, uso y tratamiento de mis datos personales y datos
                  sensibles de salud.
                </div>
              </div>
            </section>

            <Separator />

            {/* ─── SECCIÓN DE FIRMA DEL PACIENTE ─── */}
            <section className="space-y-5">
              <h3 className="text-lg font-semibold text-primary">Firma del Paciente</h3>
              <p className="text-sm text-muted-foreground">
                Los datos del consentimiento ya están diligenciados. Proporcione al menos la huella dactilar o la firma digital para completar el proceso.
              </p>

              {/* Nombre confirmación */}
              <div>
                <Label htmlFor="signed-by-name">Confirme su nombre completo *</Label>
                <Input
                  id="signed-by-name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Ingrese su nombre completo"
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

              {/* Firma */}
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
                {signing ? 'Procesando...' : 'Firmar Consentimiento'}
              </Button>
            </section>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-2">
              <div className="flex items-center justify-center mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                Enlace válido hasta: {consent.share_expires_at
                  ? new Date(consent.share_expires_at).toLocaleDateString()
                  : 'Sin expiración'}
              </div>
              <p>Al firmar este documento, confirma que ha leído y comprende toda la información proporcionada.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Helper components ───────────────────────────────────────────────────────

const DataRow: React.FC<{ icon?: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
};

const colorMap: Record<string, { bg: string; border: string; title: string; text: string; dot: string }> = {
  green:  { bg: 'bg-secondary/30', border: 'border-secondary', title: 'text-foreground', text: 'text-foreground', dot: 'bg-primary' },
  yellow: { bg: 'bg-muted/60',     border: 'border-border',    title: 'text-foreground', text: 'text-foreground', dot: 'bg-muted-foreground' },
  purple: { bg: 'bg-accent/10',    border: 'border-accent/30', title: 'text-foreground', text: 'text-foreground', dot: 'bg-accent' },
};

const InfoList: React.FC<{ title: string; items: string[]; color: 'green' | 'yellow' | 'purple'; icon?: React.ReactNode }> = ({ title, items, color, icon }) => {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} p-4 rounded-lg border ${c.border}`}>
      <h4 className={`font-semibold mb-2 ${c.title} text-sm flex items-center gap-2`}>
        {icon}{title}
      </h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`w-2 h-2 ${c.dot} rounded-full mt-1.5 shrink-0`} />
            <span className={`text-sm ${c.text}`}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
