import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad, SignatureRef } from './SignaturePad';
import { Shield, AlertTriangle, UserCheck } from 'lucide-react';

export interface GuardianData {
  name: string;
  document: string;
  relationship: string;
  phone?: string;
}

export interface GuardianSignatureRef {
  getSignatureData: () => string | null;
  getGuardianData: () => GuardianData;
  isEmpty: () => boolean;
  clear: () => void;
}

interface GuardianSignatureSectionProps {
  isMinor: boolean;
  hasDisability: boolean;
  onDisabilityChange: (checked: boolean) => void;
  guardianName: string;
  onGuardianNameChange: (value: string) => void;
  guardianDocument: string;
  onGuardianDocumentChange: (value: string) => void;
  guardianRelationship: string;
  onGuardianRelationshipChange: (value: string) => void;
  guardianPhone?: string;
  onGuardianPhoneChange?: (value: string) => void;
  guardianSignature: string | null;
  onGuardianSignatureChange: (signature: string | null) => void;
}

export const GuardianSignatureSection = forwardRef<GuardianSignatureRef, GuardianSignatureSectionProps>(({
  isMinor,
  hasDisability,
  onDisabilityChange,
  guardianName,
  onGuardianNameChange,
  guardianDocument,
  onGuardianDocumentChange,
  guardianRelationship,
  onGuardianRelationshipChange,
  guardianPhone = '',
  onGuardianPhoneChange,
  guardianSignature,
  onGuardianSignatureChange
}, ref) => {
  const guardianSignatureRef = useRef<SignatureRef>(null);

  // Mostrar la sección si es menor de edad O tiene discapacidad
  const requiresGuardian = isMinor || hasDisability;

  useImperativeHandle(ref, () => ({
    getSignatureData: () => guardianSignatureRef.current?.getSignatureData() || null,
    getGuardianData: () => ({
      name: guardianName,
      document: guardianDocument,
      relationship: guardianRelationship,
      phone: guardianPhone
    }),
    isEmpty: () => guardianSignatureRef.current?.isEmpty() ?? true,
    clear: () => guardianSignatureRef.current?.clear()
  }));

  return (
    <div className="space-y-4">
      {/* Checkbox de discapacidad - siempre visible */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="hasDisability"
              checked={hasDisability}
              onCheckedChange={(checked) => onDisabilityChange(checked as boolean)}
              className="mt-1 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
            />
            <div className="flex-1">
              <Label 
                htmlFor="hasDisability" 
                className="cursor-pointer text-amber-800 font-medium flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                El paciente tiene algún tipo de discapacidad que le impide firmar
              </Label>
              <p className="text-sm text-amber-700 mt-1">
                Marque esta casilla si el paciente presenta alguna condición de discapacidad que le impida firmar el consentimiento por sí mismo. En este caso, un acudiente o representante legal deberá firmar en su nombre.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de menor de edad */}
      {isMinor && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <UserCheck className="h-5 w-5" />
              <span className="font-medium">
                El paciente es menor de edad ({isMinor ? 'menor de 18 años' : ''}) - Se requiere firma del acudiente o representante legal
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección de datos y firma del acudiente */}
      {requiresGuardian && (
        <Card className="border-medical-blue/30 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-medical-blue flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Información y Firma del Acudiente o Representante Legal
              <span className="text-red-500">*</span>
            </CardTitle>
            <p className="text-sm text-medical-gray mt-1">
              {isMinor && hasDisability 
                ? 'El paciente es menor de edad y presenta discapacidad. Se requiere la información y firma del acudiente.'
                : isMinor 
                  ? 'El paciente es menor de edad. Se requiere la información y firma del acudiente o representante legal.'
                  : 'El paciente presenta una condición de discapacidad. Se requiere la información y firma del acudiente o representante legal.'
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Datos del acudiente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guardianName" className="text-medical-blue font-medium">
                  Nombre Completo del Acudiente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => onGuardianNameChange(e.target.value)}
                  placeholder="Nombre completo del acudiente"
                  className="border-medical-blue/30 focus:border-medical-blue"
                />
              </div>
              <div>
                <Label htmlFor="guardianDocument" className="text-medical-blue font-medium">
                  Documento del Acudiente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="guardianDocument"
                  value={guardianDocument}
                  onChange={(e) => onGuardianDocumentChange(e.target.value)}
                  placeholder="Número de documento"
                  className="border-medical-blue/30 focus:border-medical-blue"
                />
              </div>
              <div>
                <Label htmlFor="guardianRelationship" className="text-medical-blue font-medium">
                  Parentesco / Relación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(e) => onGuardianRelationshipChange(e.target.value)}
                  placeholder="Ej: Padre, Madre, Tutor legal, Cuidador"
                  className="border-medical-blue/30 focus:border-medical-blue"
                />
              </div>
              {onGuardianPhoneChange && (
                <div>
                  <Label htmlFor="guardianPhone" className="text-medical-blue font-medium">
                    Teléfono del Acudiente
                  </Label>
                  <Input
                    id="guardianPhone"
                    value={guardianPhone}
                    onChange={(e) => onGuardianPhoneChange(e.target.value)}
                    placeholder="Número de teléfono"
                    className="border-medical-blue/30 focus:border-medical-blue"
                  />
                </div>
              )}
            </div>

            {/* Firma del acudiente */}
            <div className="border-t border-medical-blue/20 pt-4">
              <SignaturePad
                ref={guardianSignatureRef}
                title="Firma del Acudiente o Representante Legal"
                subtitle="Firma requerida para autorizar el procedimiento en nombre del paciente"
                required
                onSignatureChange={onGuardianSignatureChange}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

GuardianSignatureSection.displayName = 'GuardianSignatureSection';

export default GuardianSignatureSection;
