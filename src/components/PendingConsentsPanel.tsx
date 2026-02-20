import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, PenLine, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingConsent {
  id: string;
  consent_type: string;
  created_at: string;
  status: string;
  professional_name: string | null;
  share_token: string;
  payload: any;
}

interface PendingConsentsPanelProps {
  /** Número de documento del paciente para buscar consentimientos pendientes */
  patientDocumentNumber: string;
  /** Callback cuando el usuario quiere firmar un consentimiento desde la plataforma */
  onSignInPlatform: (token: string) => void;
}

const CONSENT_TYPE_LABELS: Record<string, string> = {
  venopuncion: 'Venopunción',
  hiv: 'Prueba VIH',
  frotis_vaginal: 'Frotis Vaginal',
  carga_glucosa: 'Carga de Glucosa',
  hemocomponentes: 'Hemocomponentes',
};

function getConsentLabel(type: string) {
  const lower = type.toLowerCase();
  for (const key of Object.keys(CONSENT_TYPE_LABELS)) {
    if (lower.includes(key)) return CONSENT_TYPE_LABELS[key];
  }
  return type;
}

export const PendingConsentsPanel: React.FC<PendingConsentsPanelProps> = ({
  patientDocumentNumber,
  onSignInPlatform,
}) => {
  const [consents, setConsents] = useState<PendingConsent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!patientDocumentNumber) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('id, consent_type, created_at, status, professional_name, share_token, payload')
        .eq('patient_document_number', patientDocumentNumber)
        .in('status', ['sent', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (err) {
      console.error('Error fetching pending consents:', err);
    } finally {
      setLoading(false);
    }
  }, [patientDocumentNumber]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Buscando consentimientos pendientes...
      </div>
    );
  }

  if (consents.length === 0) return null;

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <ClipboardList className="h-5 w-5" />
          Consentimientos Pendientes de Firma
          <Badge variant="secondary" className="ml-auto text-xs font-semibold">
            {consents.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Este paciente tiene consentimientos pre-diligenciados que aún no han sido firmados.
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {consents.map((consent, idx) => (
          <React.Fragment key={consent.id}>
            {idx > 0 && <Separator />}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {getConsentLabel(consent.consent_type)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-border text-muted-foreground bg-muted"
                  >
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    Pendiente
                  </Badge>
                </div>
                {consent.professional_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Médico: {consent.professional_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Creado: {format(new Date(consent.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>

              <Button
                size="sm"
                variant="default"
                className="shrink-0 gap-1.5"
                onClick={() => onSignInPlatform(consent.share_token)}
              >
                <PenLine className="h-3.5 w-3.5" />
                Firmar aquí
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </React.Fragment>
        ))}

        <div className="pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground w-full"
            onClick={fetchPending}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar lista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
