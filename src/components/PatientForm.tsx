
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
import { Search, User, Calendar as CalendarIcon, MapPin, Phone, IdCard, WifiOff, Clock, ServerCrash, AlertCircle, FileWarning, UserX } from "lucide-react";
import { toast } from "sonner";
import { patientApiService, type PatientData, type PatientSearchResult } from "@/services/patientApi";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingConsentsPanel } from "@/components/PendingConsentsPanel";

interface PatientFormProps {
  onPatientSelect: (patient: PatientData & { hasDisability?: boolean }) => void;
  /** Callback para abrir la firma de un consentimiento pendiente directamente en la plataforma */
  onSignPendingConsent?: (token: string) => void;
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

export const PatientForm = ({ onPatientSelect, onSignPendingConsent }: PatientFormProps) => {
  const [searchDocument, setSearchDocument] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [editableAge, setEditableAge] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<{ message: string; type?: string } | null>(null);
  const [hasDisability, setHasDisability] = useState(false);
  const documentTypes = [
    { value: "NI", label: "NI - Ninguno" },
    { value: "CC", label: "CC - Cédula de Ciudadanía" },
    { value: "CE", label: "CE - Cédula de Extranjería" },
    { value: "TI", label: "TI - Tarjeta de Identidad" },
    { value: "RC", label: "RC - Registro Civil" },
    { value: "PA", label: "PA - Pasaporte" },
    { value: "AS", label: "AS - Adulto sin Identificar" },
    { value: "MS", label: "MS - Menor sin Identificar" },
    { value: "SC", label: "SC - Salvoconducto de Permanencia" },
    { value: "CN", label: "CN - Certificado Nacido Vivo" },
    { value: "CD", label: "CD - Carné Diplomático" },
    { value: "PE", label: "PE - Permiso Especial de Permanencia" },
    { value: "PT", label: "PT - Permiso por Protección Temporal" },
    { value: "DE", label: "DE - Documento Extranjero" },
    { value: "SI", label: "SI - Sin Identificación" }
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
    try {
      // Forzar actualización para obtener datos frescos
      const result = await patientApiService.searchByDocument(searchDocument);
      
      if (result.data) {
        const patient = result.data;

        // Validar que el tipo de documento seleccionado coincida con el del paciente
        // Normalizar tipos de documento (quitar puntos, espacios, guiones) para comparar CC vs C.C.
        const normalizeDocType = (dt: string) => dt?.toUpperCase()?.trim()?.replace(/[.\-\s]/g, '') || '';
        const apiDocType = normalizeDocType(patient.tipoDocumento);
        const selectedDocType = normalizeDocType(documentType);
        if (apiDocType && selectedDocType && apiDocType !== selectedDocType) {
          setSearchError({
            message: `El tipo de documento seleccionado (${documentType}) no corresponde al paciente. El tipo de documento registrado es: ${patient.tipoDocumento}. Por favor seleccione el tipo de documento correcto.`,
            type: 'validation'
          });
          setPatientData(null);
          return;
        }
        
        // Parsear fecha de nacimiento del API (viene como "1997-07-14 00:00:00" o "1997-07-14")
        let parsedBirthDate: Date | undefined;
        if (patient.fechaNacimiento && patient.fechaNacimiento !== "") {
          const fechaStr = patient.fechaNacimiento.split(" ")[0];
          parsedBirthDate = new Date(fechaStr + "T12:00:00");
        }
        
        const apiAge = patient.edad && patient.edad > 0 ? patient.edad : 
          (parsedBirthDate ? calculateAge(parsedBirthDate) : 0);
        
        const finalBirthDate = birthDate ? birthDate : parsedBirthDate;
        const finalAge = birthDate ? calculateAge(birthDate) : apiAge;
        
        const patientWithSedeAndDocType = { 
          ...patient, 
          centroSalud: selectedSede,
          tipoDocumento: documentType,
          fechaNacimiento: patient.fechaNacimiento || "",
        };
        
        setPatientData(patientWithSedeAndDocType);
        setBirthDate(finalBirthDate);
        setEditableAge(finalAge);
        setSearchError(null);
        toast.success("Paciente encontrado exitosamente");
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
      const finalPatientData = { ...patientData, edad: editableAge, hasDisability };
      onPatientSelect(finalPatientData);
      toast.success("Paciente seleccionado para consentimiento");
    }
  };

  return (
    <Card className="w-full border-border shadow-sm overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground py-3 px-6">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5" />
          <CardTitle className="text-base font-semibold">
            Búsqueda de Paciente
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5 pt-5 pb-5">
        {/* Selección de sede */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Sede de Atención
          </Label>
          
          <Select value={selectedSede} onValueChange={setSelectedSede}>
            <SelectTrigger className="h-11 border-input focus:border-primary bg-background">
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

        <Separator className="bg-border" />

        {/* Búsqueda por documento */}
        <div className="space-y-4">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" />
            Buscar por número de documento
          </Label>
          
          {/* Selector de tipo de documento */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Tipo de Documento *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="h-11 border-primary focus:border-primary bg-background">
                <SelectValue placeholder="Seleccione el tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Número de Documento *</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ingrese número de documento..."
                  value={searchDocument}
                  onChange={(e) => setSearchDocument(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(false)}
                  className="h-11 border-input focus:border-primary bg-background"
                />
              </div>
              <Button 
                onClick={() => handleSearch(false)}
                disabled={isLoading || !selectedSede || !documentType}
                className="h-11 px-6"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>

          {/* Casilla de discapacidad - siempre visible */}
          <div className="p-4 bg-medical-amber-light border border-medical-amber/30 rounded-lg">
            <div className="flex items-center gap-2 text-medical-amber font-medium mb-2">
              <AlertCircle className="h-4 w-4" />
              <span>Estado del Paciente</span>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="hasDisability"
                checked={hasDisability}
                onCheckedChange={(checked) => setHasDisability(checked as boolean)}
                className="mt-0.5 border-medical-amber data-[state=checked]:bg-medical-amber data-[state=checked]:border-medical-amber"
              />
              <Label 
                htmlFor="hasDisability" 
                className="cursor-pointer text-sm text-foreground"
              >
                El paciente tiene alguna discapacidad, es adulto mayor o presenta algún impedimento que le impide firmar por sí mismo
              </Label>
            </div>
          </div>
        </div>
        {searchError && !patientData && (
          <Alert className={cn("border-2", getErrorColor(searchError.type))}>
            <div className="flex items-center gap-3">
              {getErrorIcon(searchError.type)}
              <AlertDescription className="font-medium">
                {searchError.message}
              </AlertDescription>
            </div>
            {searchError.type === 'not_found' && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: Verifique que el número de documento sea correcto o registre al paciente en el sistema antes de continuar.
              </p>
            )}
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
            {searchError.type === 'empty_response' && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: El servidor no devolvió información. Contacte al administrador del sistema.
              </p>
            )}
            {searchError.type === 'parse_error' && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: Hubo un problema al procesar la respuesta del servidor. Contacte al soporte técnico.
              </p>
            )}
            {searchError.type === 'validation' && (
              <p className="text-sm mt-2 opacity-80">
                Sugerencia: Complete todos los campos requeridos correctamente.
              </p>
            )}
          </Alert>
        )}

        {/* Datos del paciente encontrado */}
        {patientData && (
          <>
            <Separator className="bg-border" />
            
            <div className="space-y-4">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                Datos del Paciente
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.nombre} {patientData.apellidos}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Documento</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.tipoDocumento} {patientData.numeroDocumento}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Fecha de Nacimiento
                  </Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
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
                  <Label className="text-xs text-muted-foreground">Edad</Label>
                  <Input
                    type="number"
                    value={editableAge || ""}
                    onChange={(e) => setEditableAge(parseInt(e.target.value) || 0)}
                    className="font-medium border-input focus:border-primary"
                    placeholder="Ingrese la edad"
                    min="0"
                    max="120"
                  />
                  {editableAge !== null && (
                    <p className={`text-xs ${editableAge < 18 || hasDisability ? 'text-orange-600' : 'text-accent'}`}>
                      {editableAge < 18 
                        ? '⚠️ Menor de edad - Se solicitarán datos del acudiente' 
                        : hasDisability
                          ? '⚠️ Paciente con discapacidad - Se solicitarán datos del acudiente'
                          : '✓ Mayor de edad'
                      }
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sexo</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.sexo === 'F' ? 'Femenino' : patientData.sexo === 'M' ? 'Masculino' : patientData.sexo || 'No disponible'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">EPS</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.eps}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sede Seleccionada</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.centroSalud}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.telefono}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.email || "No disponible"}
                  </p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Dirección
                  </Label>
                  <p className="font-medium bg-muted/50 p-2 rounded border border-border">
                    {patientData.direccion}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                {/* Panel de consentimientos pendientes de firma */}
                {patientData.numeroDocumento && onSignPendingConsent && (
                  <PendingConsentsPanel
                    patientDocumentNumber={patientData.numeroDocumento}
                    onSignInPlatform={onSignPendingConsent}
                  />
                )}

                <Button 
                  onClick={handleConfirmPatient}
                  disabled={!editableAge || editableAge <= 0}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-3"
                >
                  Continuar con Nuevo Consentimiento
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Webhook status message */}
        <p className="text-xs text-muted-foreground pt-2">
          Conectado al webhook local para consulta de pacientes
        </p>
      </CardContent>
    </Card>
  );
};
