import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader"
import { ArrowLeft, Search, FileText, Calendar, User, Eye, Download, Filter, Camera, PenTool } from "lucide-react"
import { toast } from "sonner"
import { consentManagementService as consentService, isSupabaseConfigured, type ConsentManagementData as ConsentForm } from "@/services/consentManagementService";
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useNavigate } from "react-router-dom"

export default function ConsentManagement() {
  const navigate = useNavigate()
  const [consents, setConsents] = useState<ConsentForm[]>([])
  const [filteredConsents, setFilteredConsents] = useState<ConsentForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConsent, setSelectedConsent] = useState<ConsentForm | null>(null)
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    documentType: "all",
    documentNumber: "",
    patientName: "",
    status: "all"
  })

  const documentTypes = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
    { value: "RC", label: "Registro Civil (RC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PA", label: "Pasaporte (PA)" },
    { value: "MS", label: "Menor sin Identificación (MS)" }
  ];

  const statusTypes = [
    { value: "sent", label: "Enviado" },
    { value: "signed", label: "Firmado" },
    { value: "expired", label: "Expirado" }
  ];

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast.error("Base de datos no configurada. Las credenciales de Supabase son necesarias para el módulo de gestión.")
      return
    }
    loadConsents()
  }, [])

  useEffect(() => {
    // Solo cargar todos los consentimientos al inicio, no aplicar filtros automáticamente
    setFilteredConsents(consents)
  }, [consents])

  const loadConsents = async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const data = await consentService.getAllConsents()
      setConsents(data)
    } catch (error) {
      toast.error("Error al cargar los consentimientos")
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = async () => {
    try {
      setIsLoading(true);
      
      const searchFilters: any = {};
      
      if (filters.documentType && filters.documentType !== "all") {
        searchFilters.documentType = filters.documentType;
      }
      
      if (filters.documentNumber) {
        searchFilters.documentNumber = filters.documentNumber;
      }
      
      if (filters.patientName) {
        searchFilters.patientName = filters.patientName;
      }
      
      if (filters.status && filters.status !== "all") {
        searchFilters.status = filters.status;
      }
      
      const data = await consentService.searchConsents(searchFilters);
      setFilteredConsents(data);
    } catch (error) {
      toast.error("Error al aplicar filtros");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    applyFilters();
  };

  const clearFilters = async () => {
    setFilters({
      documentType: "all",
      documentNumber: "",
      patientName: "",
      status: "all"
    });
    
    try {
      setIsLoading(true);
      const data = await consentService.getAllConsents();
      setFilteredConsents(data);
    } catch (error) {
      toast.error("Error al limpiar filtros");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getConsentStatusBadge = (status: string, signed_at?: string) => {
    if (status === 'signed') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          ✓ Firmado
        </Badge>
      );
    } else if (status === 'sent') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          📤 Enviado
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          📄 Pendiente
        </Badge>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background">
      <AuthenticatedHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-medical-blue/30 hover:bg-medical-blue/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-medical-blue flex items-center gap-3">
                <FileText className="h-8 w-8" />
                Gestión de Consentimientos
              </h1>
              <p className="text-medical-gray mt-2">
                Consulta y administra todos los consentimientos informados generados (app y móvil)
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-medical-blue">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={filters.documentType} onValueChange={(value) => handleFilterChange("documentType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número de Documento</Label>
                <Input
                  placeholder="Buscar por documento..."
                  value={filters.documentNumber}
                  onChange={(e) => handleFilterChange("documentNumber", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre del Paciente</Label>
                <Input
                  placeholder="Buscar por nombre..."
                  value={filters.patientName}
                  onChange={(e) => handleFilterChange("patientName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {statusTypes.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                onClick={handleSearch}
                className="bg-medical-blue hover:bg-medical-blue/90 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              
              <Button
                variant="outline"
                onClick={clearFilters}
              >
                Limpiar Filtros
              </Button>
            </div>

            <div className="text-sm text-medical-gray">
              <strong>Total de consentimientos:</strong> {filteredConsents.length} de {consents.length}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de consentimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-medical-blue">
              Consentimientos Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured() ? (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Base de Datos No Configurada
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    Para usar el módulo de gestión de consentimientos, necesitas configurar las credenciales de Supabase.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <p>Cargando consentimientos...</p>
              </div>
            ) : filteredConsents.length === 0 ? (
              <div className="text-center py-8 text-medical-gray">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron consentimientos</p>
                {Object.values(filters).some(f => f !== "all" && f) && (
                  <p className="text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo Consentimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Firma</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsents.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell className="text-sm">
                          {consent.created_at && formatDate(consent.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {consent.patient_name}
                            </p>
                            {consent.patient_email && (
                              <p className="text-sm text-medical-gray">{consent.patient_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{consent.patient_document_type}</p>
                            <p className="text-sm text-medical-gray">{consent.patient_document_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="secondary">
                            {consent.consent_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getConsentStatusBadge(consent.status, consent.signed_at || undefined)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {consent.patient_signature_data && (
                              <div className="flex items-center gap-1 text-green-600">
                                <PenTool className="h-4 w-4" />
                                <span className="text-xs">Firmado</span>
                              </div>
                            )}
                            {consent.patient_photo_url && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Camera className="h-4 w-4" />
                                <span className="text-xs">Foto</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedConsent(consent)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <FileText className="h-5 w-5" />
                                  Detalles del Consentimiento
                                </DialogTitle>
                              </DialogHeader>
                              {selectedConsent && (
                                <ScrollArea className="max-h-[70vh]">
                                  <ConsentDetails consent={selectedConsent} />
                                </ScrollArea>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ConsentDetails({ consent }: { consent: ConsentForm }) {
  return (
    <div className="space-y-6 p-4">
      {/* Información del Paciente */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Información del Paciente
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Nombre:</strong> {consent.patient_name}
          </div>
          <div>
            <strong>Documento:</strong> {consent.patient_document_type} {consent.patient_document_number}
          </div>
          {consent.patient_email && (
            <div>
              <strong>Email:</strong> {consent.patient_email}
            </div>
          )}
          {consent.patient_phone && (
            <div>
              <strong>Teléfono:</strong> {consent.patient_phone}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Información del Consentimiento */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Información del Consentimiento
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Tipo:</strong> {consent.consent_type}
          </div>
          <div>
            <strong>Estado:</strong> {consent.status}
          </div>
          {consent.signed_at && (
            <div>
              <strong>Fecha de Firma:</strong> {format(new Date(consent.signed_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          )}
          {consent.signed_by_name && (
            <div>
              <strong>Firmado por:</strong> {consent.signed_by_name}
            </div>
          )}
          {consent.professional_name && (
            <div>
              <strong>Profesional:</strong> {consent.professional_name}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Procedimientos y Payload */}
      {consent.payload && (
        <div>
          <h3 className="font-semibold text-medical-blue mb-3">
            Contenido del Consentimiento
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {(consent.payload as any)?.procedures && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-medical-blue">Procedimientos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(consent.payload as any).procedures.map((proc: any, index: number) => (
                    <li key={index}>{proc.name || proc}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(consent.payload as any)?.risks && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-medical-blue">Riesgos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(consent.payload as any).risks.map((risk: string, index: number) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(consent.payload as any)?.benefits && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-medical-blue">Beneficios:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(consent.payload as any).benefits.map((benefit: string, index: number) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(consent.payload as any)?.alternatives && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-medical-blue">Alternativas:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(consent.payload as any).alternatives.map((alt: string, index: number) => (
                    <li key={index}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(consent.payload as any)?.decision && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-medical-blue">Decisión:</h4>
                <p className="text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    (consent.payload as any).decision === 'aprobar' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(consent.payload as any).decision === 'aprobar' ? 'Aprobado' : 'Rechazado'}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Firmas y Fotos */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Firmas y Fotografías
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Paciente */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Paciente</h4>
            <div className="space-y-3">
              {/* Firma */}
              <div>
                <Label className="text-xs text-gray-600">Firma</Label>
                {consent.patient_signature_data ? (
                  <div className="border rounded-lg p-2 bg-gray-50">
                    <img 
                      src={consent.patient_signature_data} 
                      alt="Firma del paciente" 
                      className="max-w-full max-h-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Sin firma registrada
                  </div>
                )}
              </div>
              {/* Foto */}
              <div>
                <Label className="text-xs text-gray-600">Foto</Label>
                {consent.patient_photo_url ? (
                  <div className="border rounded-lg p-2 bg-gray-50">
                    <img 
                      src={consent.patient_photo_url} 
                      alt="Foto del paciente" 
                      className="max-w-full max-h-24 object-cover rounded"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Sin foto registrada
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profesional */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Profesional</h4>
            <div className="space-y-3">
              {/* Firma */}
              <div>
                <Label className="text-xs text-gray-600">Firma</Label>
                {consent.professional_signature_data ? (
                  <div className="border rounded-lg p-2 bg-gray-50">
                    <img 
                      src={consent.professional_signature_data} 
                      alt="Firma del profesional" 
                      className="max-w-full max-h-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Sin firma registrada
                  </div>
                )}
              </div>
              {/* Foto */}
              <div>
                <Label className="text-xs text-gray-600">Foto</Label>
                {consent.professional_photo_url ? (
                  <div className="border rounded-lg p-2 bg-gray-50">
                    <img 
                      src={consent.professional_photo_url} 
                      alt="Foto del profesional" 
                      className="max-w-full max-h-24 object-cover rounded"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-gray-50 text-xs text-gray-500 text-center">
                    Sin foto registrada
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Información de Registro */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Información de Registro
        </h3>
        <div className="text-sm space-y-1">
          <div>
            <strong>Fecha de Creación:</strong> {consent.created_at && format(new Date(consent.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
          {consent.updated_at && (
            <div>
              <strong>Última Actualización:</strong> {format(new Date(consent.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          )}
          {consent.share_expires_at && (
            <div>
              <strong>Enlace Expira:</strong> {format(new Date(consent.share_expires_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          )}
          {consent.pdf_url && (
            <div>
              <strong>PDF Generado:</strong> 
              <a href={consent.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                Ver PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}