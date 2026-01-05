
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, User, Calendar as CalendarIcon, MapPin, Phone, IdCard, Wifi, WifiOff, Clock, ServerCrash, AlertCircle, FileWarning, UserX, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { patientApiService, type PatientData, type PatientSearchResult } from "@/services/patientApi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PatientFormProps {
  onPatientSelect: (patient: PatientData) => void;
}

// Función para obtener el icono según el tipo de error
const getErrorIcon = (errorType?: string) => {
  switch (errorType) {
    case 'network':
      return <WifiOff className="h-5 w-5" />;
    case 'timeout':
      return <Clock className="h-5 w-5" />;
    case 'http':
    case 'empty_response':
    case 'parse_error':
      return <ServerCrash className="h-5 w-5" />;
    case 'not_found':
      return <UserX className="h-5 w-5" />;
    case 'validation':
      return <FileWarning className="h-5 w-5" />;
    case 'api_error':
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
};

// Función para obtener el color según el tipo de error
const getErrorColor = (errorType?: string) => {
  switch (errorType) {
    case 'network':
    case 'timeout':
      return 'border-orange-500 bg-orange-50 text-orange-800';
    case 'http':
    case 'empty_response':
    case 'parse_error':
      return 'border-red-500 bg-red-50 text-red-800';
    case 'not_found':
      return 'border-yellow-500 bg-yellow-50 text-yellow-800';
    case 'validation':
      return 'border-blue-500 bg-blue-50 text-blue-800';
    default:
      return 'border-red-500 bg-red-50 text-red-800';
  }
};

export const PatientForm = ({ onPatientSelect }: PatientFormProps) => {
  const [searchDocument, setSearchDocument] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [editableAge, setEditableAge] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<{ message: string; type?: string } | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

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
    "Centro de salud Anapoima",
    "Centro de salud Cachipay",
    "Centro de salud San Antonio",
    "Centro de salud La Paz",
    "Centro de salud San Javier",
    "Centro de salud Peña Negra",
    "Centro de salud San Joaquín",
    "Centro de salud La Esperanza",
    "Centro de salud Tena",
    "Centro de salud La Gran Vía"
  ];

  const handleSearch = async (forceRefresh: boolean = false) => {
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
    setSearchError(null);
    setIsFromCache(false);
    try {
      // Forzar actualización para obtener datos frescos
      const result = await patientApiService.searchByDocument(searchDocument, forceRefresh);
      
      if (result.data) {
        const patient = result.data;
        
        // Parsear fecha de nacimiento del API (viene como "1997-07-14 00:00:00" o "1997-07-14")
        let parsedBirthDate: Date | undefined;
        if (patient.fechaNacimiento && patient.fechaNacimiento !== "") {
          const fechaStr = patient.fechaNacimiento.split(" ")[0]; // Tomar solo la fecha sin hora
          parsedBirthDate = new Date(fechaStr + "T12:00:00"); // Agregar hora para evitar problemas de timezone
        }
        
        // Usar edad del API primero, si no calcularla
        const apiAge = patient.edad && patient.edad > 0 ? patient.edad : 
          (parsedBirthDate ? calculateAge(parsedBirthDate) : 0);
        
        // Si el usuario ya seleccionó una fecha manual, usarla
        const finalBirthDate = birthDate ? birthDate : parsedBirthDate;
        const finalAge = birthDate ? calculateAge(birthDate) : apiAge;
        
        const patientWithSedeAndDocType = { 
          ...patient, 
          centroSalud: selectedSede,
          tipoDocumento: documentType,
          fechaNacimiento: patient.fechaNacimiento || "", // Mantener la fecha original del API
        };
        
        setPatientData(patientWithSedeAndDocType);
        setBirthDate(finalBirthDate); // Establecer la fecha parseada
        setEditableAge(finalAge);
        setSearchError(null);
        setIsFromCache(result.fromCache || false);
        toast.success(result.fromCache ? "Paciente encontrado (desde caché)" : "Paciente encontrado exitosamente");
      } else {
        // Mostrar mensaje de error específico con indicador visual
        setSearchError({ 
          message: result.error || "No se encontró paciente con este documento",
          type: result.errorType
        });
        setPatientData(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al buscar paciente";
      setSearchError({ message: errorMessage, type: 'unknown' });
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(false)}
                  className="border-medical-blue/30 focus:border-medical-blue"
                />
              </div>
              <Button 
                onClick={() => handleSearch(false)}
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

        {/* Indicador visual de error */}
        {searchError && !patientData && (
          <Alert className={cn("border-2", getErrorColor(searchError.type))}>
            <div className="flex items-center gap-3">
              {getErrorIcon(searchError.type)}
              <AlertDescription className="font-medium">
                {searchError.message}
              </AlertDescription>
            </div>
            {(searchError.type === 'network' || searchError.type === 'timeout') && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: Verifique su conexión a internet o intente nuevamente en unos momentos.
              </p>
            )}
            {searchError.type === 'http' && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: El servidor puede estar experimentando problemas. Intente nuevamente más tarde.
              </p>
            )}
          </Alert>
        )}

        {/* Datos del paciente encontrado */}
        {patientData && (
          <>
            <Separator className="bg-medical-blue/20" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-medical-blue flex items-center gap-2">
                  <IdCard className="h-4 w-4" />
                  Datos del Paciente
                  {isFromCache && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Desde caché
                    </span>
                  )}
                </h3>
                {isFromCache && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(true)}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar datos
                  </Button>
                )}
              </div>
              
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
                    {patientData.fechaNacimiento 
                      ? (() => {
                          const fechaStr = patientData.fechaNacimiento.split(" ")[0];
                          const [year, month, day] = fechaStr.split("-");
                          return `${day}/${month}/${year}`;
                        })()
                      : "No disponible"}
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
                  <Label className="text-xs text-medical-gray">Sexo</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.sexo || "No especificado"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">EPS</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.eps}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Sede de Atención (Webhook)</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.sedeAtencion || "No disponible"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Sede Seleccionada</Label>
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
                
                <div className="space-y-2">
                  <Label className="text-xs text-medical-gray">Email</Label>
                  <p className="font-medium bg-signature-area p-2 rounded border">
                    {patientData.email || "No disponible"}
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
