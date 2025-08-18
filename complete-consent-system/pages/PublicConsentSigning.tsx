import React, { useEffect, useState, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { SignaturePad, type SignatureRef } from "@/components/SignaturePad";
import { CameraCapture, type CameraCaptureRef } from "@/components/CameraCapture";
import { consentService } from "@/services/consentService";
import { PhotoService } from "@/services/photoService";

export const PublicConsentSigning: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const signatureRef = useRef<SignatureRef>(null);
  const cameraRef = useRef<CameraCaptureRef>(null);

  useEffect(() => {
    if (token) {
      loadConsent();
    }
  }, [token]);

  const loadConsent = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const consentData = await consentService.getConsentByToken(token);
      
      if (!consentData) {
        setError('Consentimiento no encontrado o enlace inválido');
        return;
      }

      if (consentData.status === 'signed') {
        setConsent({ ...consentData, alreadySigned: true });
        return;
      }

      setConsent(consentData);
    } catch (error) {
      console.error('Error loading consent:', error);
      setError('Error al cargar el consentimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    console.log('🖊️ Iniciando proceso de firma desde móvil - CORREGIDO');
    console.log('Validando datos de entrada...');
    console.log('Nombre firmante:', signedByName.trim());
    console.log('Tiene signatureData:', !!signatureData);
    console.log('Longitud signatureData:', signatureData?.length || 0);
    console.log('Muestra signatureData:', signatureData?.substring(0, 100) + '...');
    
    if (!signedByName.trim()) {
      console.error('❌ Error: Nombre firmante vacío');
      toast.error('Por favor ingrese su nombre completo');
      return;
    }

    if (!signatureData || signatureData.length < 100) {
      console.error('❌ Error: Firma inválida o vacía');
      console.log('SignatureData:', signatureData?.substring(0, 50) + '...');
      toast.error('Por favor firme en el área designada');
      return;
    }

    // Verificar que se haya capturado la foto
    const capturedPhoto = cameraRef.current?.getCapturedPhoto();
    if (!capturedPhoto) {
      console.error('❌ Error: Foto del paciente no capturada');
      toast.error('Por favor capture una foto antes de firmar');
      return;
    }

    setSigning(true);
    try {
      console.log('📡 Enviando datos al servidor...');
      console.log('Token usado:', token);
      
      // Subir la foto del paciente
      console.log('📸 Subiendo foto del paciente...');
      const photoResult = await PhotoService.uploadPhoto(capturedPhoto, 'patient');
      if (!photoResult) {
        toast.error('Error al subir la foto del paciente');
        return;
      }
      
      const result = await consentService.signConsentByToken(
        token!,
        signatureData,
        signedByName.trim(),
        photoResult.url
      );

      console.log('📥 Respuesta del servidor:', result);

      if (result) {
        console.log('✅ Firma exitosa desde móvil');
        setConsent(prev => ({ 
          ...prev, 
          status: 'signed', 
          signed_at: new Date().toISOString(),
          signed_by_name: signedByName.trim(),
          patient_photo_url: photoResult.url
        }));
        toast.success('¡Consentimiento firmado exitosamente!');
      } else {
        console.error('❌ No se recibió respuesta de la firma');
        toast.error('Error: No se pudo completar la firma. Intente nuevamente.');
      }
    } catch (error: any) {
      console.error('❌ Error crítico en proceso de firma:', error);
      const errorMessage = error?.message || 'Error desconocido';
      console.error('Detalle del error:', errorMessage);
      toast.error(`Error al firmar: ${errorMessage}`);
    } finally {
      setSigning(false);
    }
  };

  if (!token) {
    return <Navigate to="/404" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando consentimiento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (consent?.alreadySigned || consent?.status === 'signed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h2 className="text-xl font-semibold">Consentimiento Ya Firmado</h2>
              <p className="text-muted-foreground">
                Este consentimiento ya ha sido firmado exitosamente.
              </p>
              {consent.signed_at && (
                <p className="text-sm text-muted-foreground">
                  Firmado el: {new Date(consent.signed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payload = consent?.payload || {};
  const procedures = payload.selected_procedures || [];
  const risks = payload.risks || [];
  const benefits = payload.benefits || [];
  const alternatives = payload.alternatives || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Consentimiento Informado
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Por favor revise la información y firme el consentimiento
              </p>
            </CardHeader>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nombre Completo</Label>
                  <p className="text-sm text-muted-foreground">{consent.patient_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Documento</Label>
                  <p className="text-sm text-muted-foreground">
                    {consent.patient_document_type} {consent.patient_document_number}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consent Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Consentimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {procedures.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Procedimientos Autorizados</Label>
                  <ul className="mt-2 space-y-1">
                    {procedures.map((procedure, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <span className="w-2 h-2 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                        {procedure}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {risks.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Riesgos Informados</Label>
                  <ul className="mt-2 space-y-1">
                    {risks.map((risk, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {benefits.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Beneficios Esperados</Label>
                  <ul className="mt-2 space-y-1">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {alternatives.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Alternativas de Tratamiento</Label>
                  <ul className="mt-2 space-y-1">
                    {alternatives.map((alternative, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                        {alternative}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Firma del Consentimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="signed-by-name">Nombre Completo del Firmante *</Label>
                <Input
                  id="signed-by-name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Ingrese su nombre completo"
                  className="mt-1"
                />
              </div>

              <Separator />

              <CameraCapture
                ref={cameraRef}
                title="Foto del Paciente"
                required={false}
              />

              <Separator />

              <SignaturePad
                title="Firma del Paciente"
                subtitle="Por favor firme en el área siguiente"
                onSignatureChange={setSignatureData}
                required
              />

              <div className="flex flex-col space-y-4">
                <Button
                  onClick={handleSign}
                  disabled={signing || !signedByName.trim() || !signatureData}
                  className="w-full"
                  size="lg"
                >
                  {signing ? 'Procesando...' : 'Firmar Consentimiento'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                {consent.share_expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Este enlace expira el: {new Date(consent.share_expires_at).toLocaleDateString()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Al firmar este consentimiento, confirmo que he leído y comprendido la información proporcionada,
                  y otorgo mi consentimiento para el procedimiento descrito.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};