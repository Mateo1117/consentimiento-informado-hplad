import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Send, Search, FileCheck, Mail, MessageSquare, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Consent {
  id: string;
  patient_name: string;
  consent_type: string;
  status: string;
  created_at: string;
  share_token: string;
  patient_email?: string;
  patient_phone?: string;
}

const EnviarConsentimiento = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sendMethod, setSendMethod] = useState<string>("");

  useEffect(() => {
    fetchPendingConsents();
  }, []);

  const fetchPendingConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('id, patient_name, consent_type, status, created_at, share_token, patient_email, patient_phone')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error('Error fetching consents:', error);
      toast.error('Error al cargar consentimientos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConsents = consents.filter(consent =>
    consent.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consent.consent_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedConsent || !sendMethod) {
      toast.error('Seleccione un consentimiento y método de envío');
      return;
    }

    // Placeholder for actual sending logic
    toast.success(`Consentimiento enviado por ${sendMethod === 'email' ? 'correo' : sendMethod === 'sms' ? 'SMS' : 'WhatsApp'}`);
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Enviar Consentimiento</h2>
                <p className="text-sm text-muted-foreground">
                  Envíe consentimientos pendientes de firma por email, SMS o WhatsApp
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground pb-4 pt-4">
              <div className="flex items-center gap-3">
                <FileCheck className="h-6 w-6" />
                <CardTitle className="text-lg">
                  Seleccionar Consentimiento
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Buscar consentimiento pendiente
                </Label>
                <Input
                  placeholder="Buscar por nombre del paciente o tipo de consentimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Consent List */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Consentimientos Pendientes</Label>
                <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Cargando...
                    </div>
                  ) : filteredConsents.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay consentimientos pendientes
                    </div>
                  ) : (
                    filteredConsents.map((consent) => (
                      <div
                        key={consent.id}
                        onClick={() => setSelectedConsent(consent)}
                        className={`p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConsent?.id === consent.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{consent.patient_name}</p>
                            <p className="text-sm text-muted-foreground">{consent.consent_type}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(consent.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Send Method */}
              {selectedConsent && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Método de envío</Label>
                    <Select value={sendMethod} onValueChange={setSendMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione cómo enviar el consentimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Correo electrónico
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Info */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Consentimiento seleccionado:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConsent.patient_name} - {selectedConsent.consent_type}
                    </p>
                    {selectedConsent.patient_email && (
                      <p className="text-sm text-muted-foreground">
                        Email: {selectedConsent.patient_email}
                      </p>
                    )}
                    {selectedConsent.patient_phone && (
                      <p className="text-sm text-muted-foreground">
                        Teléfono: {selectedConsent.patient_phone}
                      </p>
                    )}
                  </div>

                  {/* Send Button */}
                  <Button 
                    onClick={handleSend} 
                    className="w-full"
                    disabled={!sendMethod}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Consentimiento
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="px-6 py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa - Sistema de Consentimientos Informados</p>
            <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

export default EnviarConsentimiento;
