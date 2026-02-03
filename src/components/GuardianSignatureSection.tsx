import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad, SignatureRef } from './SignaturePad';
import { Shield, AlertTriangle, UserCheck } from 'lucide-react';

const RELATIONSHIP_OPTIONS = [
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'tutor_legal', label: 'Tutor Legal' },
  { value: 'cuidador', label: 'Cuidador' },
  { value: 'abuelo', label: 'Abuelo/a' },
  { value: 'hermano', label: 'Hermano/a' },
  { value: 'tio', label: 'Tío/a' },
  { value: 'conyugue', label: 'Cónyuge' },
  { value: 'hijo', label: 'Hijo/a' },
  { value: 'otro', label: 'Otro familiar' },
];

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
      {/* Alerta de menor de edad */}
      {isMinor && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <UserCheck className="h-5 w-5" />
              <span className="font-medium">
                El paciente es menor de edad (menor de 18 años) - Se requiere firma del acudiente o representante legal
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de discapacidad */}
      {hasDisability && !isMinor && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                El paciente tiene discapacidad que le impide firmar - Se requiere firma del acudiente o representante legal
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
                <Select
                  value={guardianRelationship}
                  onValueChange={onGuardianRelationshipChange}
                >
                  <SelectTrigger className="border-medical-blue/30 focus:border-medical-blue bg-white">
                    <SelectValue placeholder="Seleccione el parentesco" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
