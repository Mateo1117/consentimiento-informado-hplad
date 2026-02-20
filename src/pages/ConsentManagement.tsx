import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Calendar, User, Eye, Download, Filter, Camera, PenTool, Trash2, Monitor, Smartphone, Layers, Clock, CheckCircle2, RefreshCw, Share2, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { consentManagementService as consentService, isSupabaseConfigured, type ConsentManagementData as ConsentForm } from "@/services/consentManagementService";
import { appConsentService } from "@/services/appConsentService"
import { format, isAfter } from "date-fns"
import { es } from "date-fns/locale"

export default function ConsentManagement() {
  const [consents, setConsents] = useState<ConsentForm[]>([])
  const [filteredConsents, setFilteredConsents] = useState<ConsentForm[]>([])
  const [pendingConsents, setPendingConsents] = useState<ConsentForm[]>([])
  const [signedConsents, setSignedConsents] = useState<ConsentForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPendingLoading, setIsPendingLoading] = useState(false)
  const [isSignedLoading, setIsSignedLoading] = useState(false)
  const [selectedConsent, setSelectedConsent] = useState<ConsentForm | null>(null)
  const [activeTab, setActiveTab] = useState("todos")
  
  // Filtros mejorados
  const [filters, setFilters] = useState({
    documentType: "all",
    documentNumber: "",
    patientName: "",
    status: "all",
    source: "all"
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

  const sourceTypes = [
    { value: "web", label: "Aplicación Web" },
    { value: "app", label: "Dispositivo Móvil" }
  ];

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      toast.error("Base de datos no configurada. Las credenciales de Supabase son necesarias para el módulo de gestión.")
      return
    }
    loadConsents()
    loadPendingConsents()
    loadSignedConsents()
  }, [])

  useEffect(() => {
    setFilteredConsents(consents)
  }, [consents])

  useEffect(() => {
    if (activeTab === 'pendientes') loadPendingConsents()
    if (activeTab === 'firmados') loadSignedConsents()
  }, [activeTab])

  const loadPendingConsents = async () => {
    if (!isSupabaseConfigured()) return
    setIsPendingLoading(true)
    try {
      const data = await consentService.getConsentsByStatus('sent')
      // Filter only non-expired
      const now = new Date()
      const active = data.filter(c => !c.share_expires_at || isAfter(new Date(c.share_expires_at), now))
      setPendingConsents(active)
    } catch (error) {
      toast.error("Error al cargar consentimientos pendientes")
    } finally {
      setIsPendingLoading(false)
    }
  }

  const loadSignedConsents = async () => {
    if (!isSupabaseConfigured()) return
    setIsSignedLoading(true)
    try {
      const data = await consentService.getConsentsByStatus('signed')
      setSignedConsents(data)
    } catch (error) {
      toast.error("Error al cargar consentimientos firmados")
    } finally {
      setIsSignedLoading(false)
    }
  }

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

      if (filters.source && filters.source !== "all") {
        searchFilters.source = filters.source;
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
      status: "all",
      source: "all"
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

  const handleDeleteConsent = async (consentId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este consentimiento? Esta acción no se puede deshacer.')) {
      try {
        const success = await appConsentService.deleteConsent(consentId);
        if (success) {
          toast.success('Consentimiento eliminado exitosamente');
          loadConsents(); // Reload the list
        } else {
          toast.error('Error al eliminar el consentimiento');
        }
      } catch (error) {
        toast.error('Error al eliminar el consentimiento');
      }
    }
  };

  const handleDownloadPDF = async (consentId: string) => {
    try {
      const pdfUrl = await appConsentService.getConsentPDFUrl(consentId);
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      } else {
        toast.error('PDF no disponible para este consentimiento');
      }
    } catch (error) {
      toast.error('Error al descargar el PDF');
    }
  };

  const getSourceIcon = (source: string) => {
    return source === 'app' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />;
  };

  const getSourceBadge = (source: string) => {
    if (source === 'web') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Monitor className="h-3 w-3 mr-1" />
          App Web
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Smartphone className="h-3 w-3 mr-1" />
          Móvil
        </Badge>
      );
    }
  };

  const CONSENT_TYPE_LABELS: Record<string, string> = {
    venopuncion: 'Venopunción',
    hiv: 'Prueba VIH',
    frotis_vaginal: 'Frotis Vaginal',
    carga_glucosa: 'Carga de Glucosa',
    hemocomponentes: 'Hemocomponentes',
  }

  const getConsentLabel = (type: string) => {
    const lower = type.toLowerCase()
    for (const key of Object.keys(CONSENT_TYPE_LABELS)) {
      if (lower.includes(key)) return CONSENT_TYPE_LABELS[key]
    }
    return type
  }

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/consent/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Enlace copiado al portapapeles')
  }

  const openShareLink = (token: string) => {
    const url = `${window.location.origin}/consent/${token}`
    window.open(url, '_blank')
  }

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-primary">Consentimientos Creados</h2>
                <p className="text-sm text-muted-foreground">
                  Consulta y administra todos los consentimientos informados generados
                </p>
              </div>
              {pendingConsents.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-sm px-3 py-1">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  {pendingConsents.length} pendiente{pendingConsents.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-card border border-border h-12 p-1 grid grid-cols-3 mb-6">
            <TabsTrigger
              value="todos"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 text-sm font-medium"
            >
              <Layers className="h-4 w-4" />
              Todos
              <Badge variant="secondary" className="ml-1 text-xs">{consents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="pendientes"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium"
            >
              <Clock className="h-4 w-4" />
              Pendientes de Firma
              {pendingConsents.length > 0 && (
                <Badge className="ml-1 text-xs bg-amber-200 text-amber-900 border-0">
                  {pendingConsents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="firmados"
              className="flex items-center justify-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Firmados
              {signedConsents.length > 0 && (
                <Badge className="ml-1 text-xs bg-green-200 text-green-900 border-0">
                  {signedConsents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: Todos los consentimientos */}
          <TabsContent value="todos">
            {/* Filtros */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
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
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                          <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Origen</Label>
                    <Select value={filters.source} onValueChange={(value) => handleFilterChange("source", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los orígenes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los orígenes</SelectItem>
                        {sourceTypes.map((source) => (
                          <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar Filtros
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Total de consentimientos:</strong> {filteredConsents.length} de {consents.length}
                </div>
              </CardContent>
            </Card>

            {/* Tabla todos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Consentimientos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {!isSupabaseConfigured() ? (
                  <div className="text-center py-8">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Base de Datos No Configurada</h3>
                      <p className="text-yellow-700 mb-4">Para usar el módulo de gestión de consentimientos, necesitas configurar las credenciales de Supabase.</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                    <p>Cargando consentimientos...</p>
                  </div>
                ) : filteredConsents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
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
                          <TableHead>Origen</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Firma</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConsents.map((consent) => (
                          <TableRow key={consent.id}>
                            <TableCell className="text-sm">{consent.created_at && formatDate(consent.created_at)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{consent.patient_name}</p>
                                {consent.patient_email && <p className="text-sm text-muted-foreground">{consent.patient_email}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{consent.patient_document_type}</p>
                                <p className="text-sm text-muted-foreground">{consent.patient_document_number}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="secondary">{consent.consent_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{getSourceBadge(consent.source || 'app')}</TableCell>
                            <TableCell>{getConsentStatusBadge(consent.status, consent.signed_at || undefined)}</TableCell>
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
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedConsent(consent)}>
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
                                {consent.pdf_url && (
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(consent.id)} title="Descargar PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {consent.source === 'web' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteConsent(consent.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Eliminar consentimiento"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Pendientes de Firma */}
          <TabsContent value="pendientes">
            <Card className="mb-4 border-amber-200 bg-amber-50/50">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Consentimientos enviados que aún <strong>no han sido firmados</strong> por el paciente y cuyo enlace sigue vigente.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={loadPendingConsents}
                  disabled={isPendingLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPendingLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                  Pendientes de Firma
                  <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">
                    {pendingConsents.length} registro{pendingConsents.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPendingLoading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                    <p>Cargando pendientes...</p>
                  </div>
                ) : pendingConsents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-green-400" />
                    <p className="font-medium">¡Sin pendientes!</p>
                    <p className="text-sm mt-1">Todos los consentimientos enviados han sido firmados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha Creación</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Profesional</TableHead>
                          <TableHead>Expira</TableHead>
                          <TableHead>Enlace</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingConsents.map((consent) => {
                          const expiresAt = consent.share_expires_at ? new Date(consent.share_expires_at) : null
                          const now = new Date()
                          const hoursLeft = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)) : null
                          const isExpiringSoon = hoursLeft !== null && hoursLeft < 24

                          return (
                            <TableRow key={consent.id} className="hover:bg-amber-50/30">
                              <TableCell className="text-sm text-muted-foreground">
                                {consent.created_at && formatDate(consent.created_at)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{consent.patient_name}</p>
                                  {consent.patient_email && <p className="text-xs text-muted-foreground">{consent.patient_email}</p>}
                                  {consent.patient_phone && <p className="text-xs text-muted-foreground">{consent.patient_phone}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{consent.patient_document_type}</p>
                                  <p className="text-xs text-muted-foreground">{consent.patient_document_number}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {getConsentLabel(consent.consent_type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {consent.professional_name || '—'}
                              </TableCell>
                              <TableCell>
                                {expiresAt ? (
                                  <div className={`text-xs font-medium ${isExpiringSoon ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {isExpiringSoon && <span className="mr-1">⚠️</span>}
                                    {format(expiresAt, "dd/MM/yyyy", { locale: es })}
                                    {hoursLeft !== null && hoursLeft < 72 && (
                                      <p className="text-[10px] font-normal">
                                        {hoursLeft < 1 ? 'Expira pronto' : `${hoursLeft}h restantes`}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin límite</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => copyShareLink(consent.share_token)}
                                    title="Copiar enlace"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                                    onClick={() => openShareLink(consent.share_token)}
                                    title="Abrir enlace"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" onClick={() => setSelectedConsent(consent)} className="h-8 text-xs">
                                        <Eye className="h-3.5 w-3.5 mr-1" />
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                                    onClick={() => openShareLink(consent.share_token)}
                                  >
                                    <Share2 className="h-3.5 w-3.5 mr-1" />
                                    Enviar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Firmados */}
          <TabsContent value="firmados">
            <Card className="mb-4 border-green-200 bg-green-50/50">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  Consentimientos que ya fueron <strong>firmados por el paciente</strong>. Incluye todos los registros independientemente del profesional que los creó.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto shrink-0 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={loadSignedConsents}
                  disabled={isSignedLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSignedLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Consentimientos Firmados
                  <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                    {signedConsents.length} registro{signedConsents.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSignedLoading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                    <p>Cargando firmados...</p>
                  </div>
                ) : signedConsents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-14 w-14 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Sin consentimientos firmados</p>
                    <p className="text-sm mt-1">Aún no hay consentimientos firmados en el sistema.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha Firma</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Profesional</TableHead>
                          <TableHead>Firmado por</TableHead>
                          <TableHead>Firma / Foto</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {signedConsents.map((consent) => (
                          <TableRow key={consent.id} className="hover:bg-green-50/30">
                            <TableCell className="text-sm text-muted-foreground">
                              {consent.signed_at
                                ? format(new Date(consent.signed_at), "dd/MM/yyyy HH:mm", { locale: es })
                                : consent.created_at && formatDate(consent.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{consent.patient_name}</p>
                                {consent.patient_email && <p className="text-xs text-muted-foreground">{consent.patient_email}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{consent.patient_document_type}</p>
                                <p className="text-xs text-muted-foreground">{consent.patient_document_number}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {getConsentLabel(consent.consent_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {consent.professional_name || '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {consent.signed_by_name ? (
                                <span className="text-green-700 font-medium">{consent.signed_by_name}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {consent.patient_signature_data && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <PenTool className="h-4 w-4" />
                                    <span className="text-xs">Firma</span>
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
                              <div className="flex items-center gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedConsent(consent)} className="h-8 text-xs">
                                      <Eye className="h-3.5 w-3.5 mr-1" />
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
                                {consent.pdf_url && (
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(consent.id)} className="h-8" title="Descargar PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
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