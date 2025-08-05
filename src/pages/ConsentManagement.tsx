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
import { ArrowLeft, Search, FileText, Calendar, User, Eye, Download, Filter, Settings } from "lucide-react"
import { toast } from "sonner"
import { consentService, type ConsentForm, isSupabaseConfigured } from "@/services/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useNavigate } from "react-router-dom"

export default function ConsentManagement() {
  const navigate = useNavigate()
  const [consents, setConsents] = useState<ConsentForm[]>([])
  const [filteredConsents, setFilteredConsents] = useState<ConsentForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConsent, setSelectedConsent] = useState<ConsentForm | null>(null)
  
  // Filtros simplificados
  const [filters, setFilters] = useState({
    documentType: "all",
    documentNumber: ""
  })

  const documentTypes = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
    { value: "RC", label: "Registro Civil (RC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PA", label: "Pasaporte (PA)" },
    { value: "MS", label: "Menor sin Identificación (MS)" }
  ]

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

  const applyFilters = () => {
    let filtered = consents

    if (filters.documentType && filters.documentType !== "all") {
      filtered = filtered.filter(consent => consent.document_type === filters.documentType)
    }

    if (filters.documentNumber) {
      filtered = filtered.filter(consent => 
        consent.document_number.toLowerCase().includes(filters.documentNumber.toLowerCase())
      )
    }

    setFilteredConsents(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    applyFilters()
  }

  const clearFilters = () => {
    setFilters({
      documentType: "all",
      documentNumber: ""
    })
    setFilteredConsents(consents) // Mostrar todos los consentimientos al limpiar filtros
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getConsentStatusBadge = (decision: string) => {
    return decision === "aprobar" ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        ✓ Aprobado
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        ✗ Denegado
      </Badge>
    )
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
                Consulta y administra todos los consentimientos informados generados
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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

              <div className="flex items-end gap-2">
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
                  <div className="text-sm text-yellow-600 bg-yellow-100 p-3 rounded">
                    <p className="font-medium mb-2">Pasos para configurar:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Haz clic en el botón verde "Supabase" (arriba a la derecha)</li>
                      <li>Sigue las instrucciones para conectar tu proyecto</li>
                      <li>Ejecuta el script SQL proporcionado en tu base de datos</li>
                    </ol>
                  </div>
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
                {Object.values(filters).some(f => f) && (
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
                      <TableHead>Edad</TableHead>
                      <TableHead>Centro de Salud</TableHead>
                      <TableHead>Estado</TableHead>
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
                              {consent.patient_name} {consent.patient_surname}
                            </p>
                            <p className="text-sm text-medical-gray">{consent.eps}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{consent.document_type}</p>
                            <p className="text-sm text-medical-gray">{consent.document_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{consent.age} años</TableCell>
                        <TableCell className="text-sm">
                          {consent.healthcare_center}
                        </TableCell>
                        <TableCell>
                          {getConsentStatusBadge(consent.consent_decision)}
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
            <strong>Nombre:</strong> {consent.patient_name} {consent.patient_surname}
          </div>
          <div>
            <strong>Documento:</strong> {consent.document_type} {consent.document_number}
          </div>
          <div>
            <strong>Fecha de Nacimiento:</strong> {format(new Date(consent.birth_date), "dd/MM/yyyy")}
          </div>
          <div>
            <strong>Edad:</strong> {consent.age} años
          </div>
          <div>
            <strong>EPS:</strong> {consent.eps}
          </div>
          <div>
            <strong>Teléfono:</strong> {consent.phone}
          </div>
          <div className="col-span-2">
            <strong>Dirección:</strong> {consent.address}
          </div>
          <div className="col-span-2">
            <strong>Centro de Salud:</strong> {consent.healthcare_center}
          </div>
        </div>
      </div>

      <Separator />

      {/* Acudiente (si aplica) */}
      {consent.guardian_name && (
        <>
          <div>
            <h3 className="font-semibold text-medical-blue mb-3">
              Información del Acudiente
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Nombre:</strong> {consent.guardian_name}
              </div>
              <div>
                <strong>Documento:</strong> {consent.guardian_document}
              </div>
              <div className="col-span-2">
                <strong>Parentesco:</strong> {consent.guardian_relationship}
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Procedimientos */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Procedimientos Seleccionados
        </h3>
        <div className="space-y-2">
          {consent.selected_procedures.map((procedure, index) => (
            <Badge key={index} variant="secondary" className="mr-2 mb-2">
              {procedure}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Enfoque Diferencial */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Enfoque Diferencial
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Género: {consent.differential_approach.gender ? "Sí" : "No"}</div>
          <div>Etnia: {consent.differential_approach.ethnicity ? "Sí" : "No"}</div>
          <div>Ciclo Vital: {consent.differential_approach.vital_cycle ? "Sí" : "No"}</div>
          <div>No Aplica: {consent.differential_approach.not_applicable ? "Sí" : "No"}</div>
          <div>Posición Social: {consent.differential_approach.social_position ? "Sí" : "No"}</div>
          <div>Discapacidad: {consent.differential_approach.disability ? "Sí" : "No"}</div>
        </div>
      </div>

      <Separator />

      {/* Decisión y Profesional */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Decisión del Consentimiento
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Decisión:</strong> {consent.consent_decision === 'aprobar' ? 'APROBADO' : 'DENEGADO'}
          </div>
          <div>
            <strong>Profesional:</strong> {consent.professional_name}
          </div>
          <div>
            <strong>Documento del Profesional:</strong> {consent.professional_document}
          </div>
          {consent.additional_info && (
            <div>
              <strong>Información Adicional:</strong> {consent.additional_info}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Firmas y Fotos */}
      <div>
        <h3 className="font-semibold text-medical-blue mb-3">
          Firmas y Fotografías
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Paciente/Acudiente */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">
              {consent.guardian_name ? 'Acudiente' : 'Paciente'}
            </h4>
            <div className="flex gap-4">
              {/* Firma */}
              <div className="flex-1">
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
              <div className="flex-1">
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
            <div className="flex gap-4">
              {/* Firma */}
              <div className="flex-1">
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
              <div className="flex-1">
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
        <div className="text-sm">
              <div>
                <strong>Fecha de Creación:</strong> {consent.created_at && format(new Date(consent.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
          {consent.pdf_filename && (
            <div>
              <strong>Archivo PDF:</strong> {consent.pdf_filename}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}