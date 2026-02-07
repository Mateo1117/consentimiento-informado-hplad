import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface DataProtectionConsentProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  required?: boolean;
}

export const DataProtectionConsent: React.FC<DataProtectionConsentProps> = ({
  accepted,
  onAcceptedChange,
  required = true
}) => {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary text-base">
          <Shield className="h-5 w-5" />
          Autorización para el Tratamiento de Datos Personales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>
            En cumplimiento de la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong> sobre 
            protección de datos personales, la <strong>E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa</strong> le 
            informa que los datos personales recolectados serán utilizados para:
          </p>
          
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestionar su historia clínica y atención en salud</li>
            <li>Cumplir con obligaciones legales y regulatorias del sector salud</li>
            <li>Realizar seguimiento a los procedimientos y tratamientos médicos</li>
            <li>Enviar notificaciones relacionadas con su atención médica</li>
            <li>Generar estadísticas e informes de salud pública (datos anonimizados)</li>
          </ul>

          <p>
            Sus datos serán tratados con estricta confidencialidad y seguridad. Usted tiene derecho a conocer, 
            actualizar, rectificar y solicitar la supresión de sus datos, así como a revocar esta autorización, 
            dirigiendo su solicitud al área de atención al usuario del hospital.
          </p>

          <p className="text-xs text-muted-foreground italic">
            Para más información sobre nuestra política de tratamiento de datos personales, puede consultar 
            en las instalaciones del hospital o solicitar una copia al personal administrativo.
          </p>
        </div>

        <div className="flex items-start space-x-3 pt-2 border-t">
          <Checkbox
            id="data-protection-consent"
            checked={accepted}
            onCheckedChange={(checked) => onAcceptedChange(!!checked)}
            className="mt-1"
          />
          <Label 
            htmlFor="data-protection-consent" 
            className="text-sm cursor-pointer leading-relaxed"
          >
            <span className="font-medium">
              Autorizo de manera libre, expresa e informada a la E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa 
              para la recolección, almacenamiento, uso y tratamiento de mis datos personales y datos sensibles de salud 
              conforme a la política de tratamiento de datos de la institución.
            </span>
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataProtectionConsent;
