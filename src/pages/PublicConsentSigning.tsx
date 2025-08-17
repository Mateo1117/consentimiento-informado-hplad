import React, { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/SignaturePad";
import { CameraCapture, CameraCaptureRef } from "@/components/CameraCapture";
import { consentService } from "@/services/consentService";
import { PhotoService } from "@/services/photoService";
import { toast } from "sonner";
import { CheckCircle, FileText, User, Calendar, AlertCircle } from "lucide-react";

export const PublicConsentSigning: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const cameraRef = useRef<CameraCaptureRef>(null);

  useEffect(() => {
    if (token) {
      loadConsent();
    }
  }, [token]);

  const loadConsent = async () => {
    try {
      setLoading(true);
      console.log('📱 Cargando consentimiento desde móvil, token:', token);
      
      const data = await consentService.getConsentByToken(token!);
      
      if (!data) {
        console.error('❌ Consentimiento no encontrado con token:', token);
        setError('Consentimiento no encontrado o enlace expirado');
        return;
      }

      if (data.status === 'signed') {
        console.log('ℹ️ Consentimiento ya firmado');
        setError('Este consentimiento ya ha sido firmado');
        return;
      }

      console.log('✅ Consentimiento cargado exitosamente:', {
        id: data.id,
        patient_name_masked: data.patient_name_masked,
        status: data.status,
        access_count: data.access_count,
        requires_verification: data.requires_verification
      });
      
      setConsent(data);
    } catch (err) {
      console.error('❌ Error crítico cargando consentimiento:', err);
      setError('Error al cargar el consentimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    console.log('🖊️ Iniciando proceso de firma desde móvil');
    console.log('Validando datos de entrada...');
    console.log('Nombre firmante:', signedByName.trim());
    console.log('Tiene signatureData:', !!signatureData);
    console.log('Longitud signatureData:', signatureData?.length || 0);
    
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Cargando consentimiento...</span>
            </div>
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
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Consentimiento Firmado</h2>
            <p className="text-muted-foreground mb-4">
              Este consentimiento ya ha sido firmado exitosamente.
            </p>
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary mr-2" />
              <CardTitle className="text-2xl">Consentimiento Informado</CardTitle>
            </div>
            <Badge variant="outline" className="mx-auto">
              {consent.consent_type}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Patient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Paciente</Label>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{consent.patient_name_masked}</span>
                  </div>
                </div>
                {consent.patient_document_masked && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Documento</Label>
                    <p className="mt-1">
                      {consent.patient_document_type} {consent.patient_document_masked}
                    </p>
                  </div>
              )}
            </div>

            <Separator />

            {/* Consent Content */}
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-4 text-primary">Información del Procedimiento</h3>
              
              {consent.payload && (
                <div className="space-y-6">
                  {consent.payload.procedures && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-3 text-blue-800 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Procedimientos a Realizar:
                      </h4>
                      <ul className="space-y-2">
                        {consent.payload.procedures.map((proc: any, index: number) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="w-4 h-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-blue-900">{proc.name || proc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consent.payload.risks && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold mb-3 text-yellow-800 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Riesgos Asociados:
                      </h4>
                      <ul className="space-y-2">
                        {consent.payload.risks.map((risk: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-sm text-yellow-900">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consent.payload.benefits && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold mb-3 text-green-800 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Beneficios Esperados:
                      </h4>
                      <ul className="space-y-2">
                        {consent.payload.benefits.map((benefit: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-sm text-green-900">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consent.payload.alternatives && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-semibold mb-3 text-purple-800">
                        Alternativas de Tratamiento:
                      </h4>
                      <ul className="space-y-2">
                        {consent.payload.alternatives.map((alt: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-sm text-purple-900">{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-2 text-gray-800">Declaración de Consentimiento:</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      He sido informado(a) sobre el procedimiento, sus riesgos, beneficios y alternativas. 
                      He tenido la oportunidad de hacer preguntas y todas han sido respondidas satisfactoriamente. 
                      Entiendo que ningún procedimiento médico garantiza resultados al 100%. 
                      Por lo tanto, doy mi consentimiento libre e informado para la realización del procedimiento descrito.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Photo and Signature Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Captura de Foto y Firma</h3>
              
              <div>
                <Label htmlFor="signed-by-name">Nombre completo del firmante *</Label>
                <Input
                  id="signed-by-name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Ingrese su nombre completo"
                  className="mt-1"
                />
              </div>

              <div>
                <CameraCapture
                  ref={cameraRef}
                  title="Foto del Paciente"
                  subtitle="Capture una foto clara del paciente para incluir en el consentimiento"
                  required
                />
              </div>

              <div>
                <Label>Firma Digital *</Label>
                <div className="mt-2">
                  <SignaturePad
                    title="Firma del Paciente"
                    subtitle="Por favor firme en el área siguiente"
                    onSignatureChange={setSignatureData}
                    required
                  />
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleSign}
                  disabled={signing || !signedByName.trim() || !signatureData}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {signing ? 'Procesando...' : 'Firmar Consentimiento'}
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-6">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Enlace válido hasta: {consent.share_expires_at ? 
                  new Date(consent.share_expires_at).toLocaleDateString() : 
                  'Sin expiración'
                }
              </div>
              <p>Al firmar este documento, confirma que ha leído y comprende toda la información proporcionada.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};