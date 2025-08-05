
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Search, User, Calendar as CalendarIcon, MapPin, Phone, IdCard } from "lucide-react";
import { toast } from "sonner";
import { patientApiService, type PatientData } from "@/services/patientApi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PatientFormProps {
  onPatientSelect: (patient: PatientData) => void;
}

export const PatientForm = ({ onPatientSelect }: PatientFormProps) => {
  const [searchDocument, setSearchDocument] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [editableAge, setEditableAge] = useState<number | null>(null);

  const documentTypes = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
    { value: "RC", label: "Registro Civil (RC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PA", label: "Pasaporte (PA)" },
    { value: "MS", label: "Menor sin Identificación (MS)" }
  ];

  // Function to calculate age from birth date
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  };

  // Handle birth date change and auto-calculate age
  const handleBirthDateChange = (date: Date | undefined) => {
    setBirthDate(date);
    if (date) {
      const calculatedAge = calculateAge(date);
      setEditableAge(calculatedAge);
    }
  };

  const sedes = [
    "Hospital Pedro Leon Alvarez Diaz de la Mesa",
    "Centro de salud Bojaca",
    "Centro de salud el Rosal",
    "Centro de salud el Sociego",
    "Centro de salud Puente Piedra",
    "Centro de salud Zipacon"
  ];

  const handleSearch = async () => {
    if (!selectedSede) {
      toast.error("Por favor seleccione una sede de atención");
      return;
    }
    
    if (!documentType) {
      toast.error("Por favor seleccione el tipo de documento");
      return;
    }
    
    if (!searchDocument) {
      toast.error("Por favor ingrese un número de documento");
      return;
    }

    setIsLoading(true);
    try {
      const patient = await patientApiService.searchByDocument(searchDocument);
      
      if (patient) {
        // Asignar la sede seleccionada y el tipo de documento seleccionado al paciente
        const finalBirthDate = birthDate ? birthDate.toISOString() : patient.fechaNacimiento;
        const finalAge = birthDate ? calculateAge(birthDate) : (editableAge || patient.edad || 0);
        
        const patientWithSedeAndDocType = { 
          ...patient, 
          centroSalud: selectedSede,
          tipoDocumento: documentType,
          fechaNacimiento: finalBirthDate,
          edad: finalAge
        };
        setPatientData(patientWithSedeAndDocType);
        setEditableAge(finalAge);
        toast.success("Paciente encontrado exitosamente");
      } else {
        toast.error("No se encontró paciente con este documento");
        setPatientData(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al buscar paciente";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPatient = () => {
    if (patientData && editableAge !== null) {
      const finalPatientData = { ...patientData, edad: editableAge };
      onPatientSelect(finalPatientData);
      toast.success("Paciente seleccionado para consentimiento");
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-card to-medical-blue-light border-medical-blue/20">
      <CardHeader className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <User className="h-6 w-6" />
          Búsqueda de Paciente
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Selección de sede */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-medical-gray">
            <MapPin className="h-4 w-4" />
            <Label className="text-sm font-medium">Sede de Atención</Label>
          </div>
          
          <Select value={selectedSede} onValueChange={setSelectedSede}>
            <SelectTrigger className="border-medical-blue/30 focus:border-medical-blue">
              <SelectValue placeholder="Seleccione la sede donde será atendido el paciente" />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((sede) => (
                <SelectItem key={sede} value={sede}>
                  {sede}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-medical-blue/20" />

        {/* Búsqueda por documento */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-medical-gray">
            <Search className="h-4 w-4" />
            <Label className="text-sm font-medium">Buscar por número de documento</Label>
          </div>
          
          {/* Selector de tipo de documento */}
          <div className="space-y-2">
            <Label className="text-xs text-medical-gray">Tipo de Documento *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="border-medical-blue/30 focus:border-medical-blue bg-white">
                <SelectValue placeholder="Seleccione el tipo de documento" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="hover:bg-gray-100">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          
          <div className="space-y-2">
            <Label className="text-xs text-medical-gray">Número de Documento *</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ingrese número de documento..."
                  value={searchDocument}
                  onChange={(e) => setSearchDocument(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="border-medical-blue/30 focus:border-medical-blue"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !selectedSede || !documentType}
                className="bg-medical-blue hover:bg-medical-blue/90 text-white px-6 disabled:bg-gray-400"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-medical-gray">
            Conectado al webhook local para consulta de pacientes
          </p>
        </div>

        {/* Datos del paciente encontrado */}
        {patientData && (
          <>
            <Separator className="bg-medical-blue/20" />
            
            <div className="space-y-4">
              <h3 className="font-semibold text-medical-blue flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                Datos del Paciente
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Nombre Completo</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.nombre} {patientData.apellidos}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Documento</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.tipoDocumento} {patientData.numeroDocumento}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Fecha de Nacimiento
                  </Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {new Date(patientData.fechaNacimiento).toLocaleDateString('es-CO')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Edad</Label>
                  <Input
                    type="number"
                    value={editableAge || ""}
                    onChange={(e) => setEditableAge(parseInt(e.target.value) || 0)}
                    className="font-medium border-medical-blue/30 focus:border-medical-blue"
                    placeholder="Ingrese la edad"
                    min="0"
                    max="120"
                  />
                  {editableAge !== null && (
                    <p className={`text-xs ${editableAge < 18 ? 'text-amber-600' : 'text-green-600'}`}>
                      {editableAge < 18 
                        ? '⚠️ Menor de edad - Se solicitarán datos del acudiente' 
                        : '✓ Mayor de edad'
                      }
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">EPS</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.eps}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Sede de Atención</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.centroSalud}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.telefono}
                  </p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-medical-gray flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Dirección
                  </Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.direccion}
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={handleConfirmPatient}
                  disabled={!editableAge || editableAge <= 0}
                  className="w-full bg-medical-green hover:bg-medical-green/90 text-white font-medium py-3 disabled:bg-gray-400"
                >
                  Continuar con Consentimiento Informado
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
