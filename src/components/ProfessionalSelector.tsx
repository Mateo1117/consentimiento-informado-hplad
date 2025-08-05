import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCheck, Plus } from "lucide-react";
import { ProfessionalSignatureService, type ProfessionalSignature } from "@/services/professionalSignatureService";
import { toast } from "sonner";

interface ProfessionalSelectorProps {
  onProfessionalSelect: (professional: { name: string; document: string; signatureData: string }) => void;
  onNewProfessional: () => void;
  selectedDocument?: string;
}

export const ProfessionalSelector = ({ onProfessionalSelect, onNewProfessional, selectedDocument }: ProfessionalSelectorProps) => {
  const [professionals, setProfessionals] = useState<ProfessionalSignature[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    try {
      setIsLoading(true);
      const professionalSignatures = await ProfessionalSignatureService.getAllSignatures();
      setProfessionals(professionalSignatures);
      
      // Auto-select if there's a matching document
      if (selectedDocument) {
        const matchingProfessional = professionalSignatures.find(p => p.professional_document === selectedDocument);
        if (matchingProfessional) {
          setSelectedProfessionalId(matchingProfessional.id || "");
          onProfessionalSelect({
            name: matchingProfessional.professional_name,
            document: matchingProfessional.professional_document,
            signatureData: matchingProfessional.signature_data
          });
        }
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
      toast.error("Error al cargar los profesionales");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessionalSelect = (professionalId: string) => {
    setSelectedProfessionalId(professionalId);
    const selectedProfessional = professionals.find(p => p.id === professionalId);
    
    if (selectedProfessional) {
      onProfessionalSelect({
        name: selectedProfessional.professional_name,
        document: selectedProfessional.professional_document,
        signatureData: selectedProfessional.signature_data
      });
      toast.success("Datos del profesional cargados automáticamente");
    }
  };

  const handleNewProfessional = () => {
    setSelectedProfessionalId("");
    onNewProfessional();
  };

  if (isLoading) {
    return (
      <Card className="border-medical-blue/20">
        <CardContent className="p-4">
          <div className="text-center text-medical-gray">
            Cargando profesionales...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="medical-field-label">Profesional Registrado</Label>
        <Select value={selectedProfessionalId} onValueChange={handleProfessionalSelect}>
          <SelectTrigger className="medical-button-outline">
            <SelectValue placeholder="Seleccione un profesional registrado" />
          </SelectTrigger>
          <SelectContent>
            {professionals.map((professional) => (
              <SelectItem key={professional.id} value={professional.id || ""}>
                {professional.professional_name} - {professional.professional_document}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleNewProfessional}
          className="medical-button-outline flex-1"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Profesional
        </Button>
      </div>

      {professionals.length === 0 && (
        <div className="text-center p-3 bg-medical-blue-light/30 rounded-lg">
          <p className="medical-field-label">
            No hay profesionales registrados aún.
          </p>
          <p className="text-xs text-medical-gray mt-1">
            Use "Nuevo Profesional" para registrar el primero.
          </p>
        </div>
      )}
    </div>
  );
};