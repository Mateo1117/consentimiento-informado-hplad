import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

// Supabase Auth (OAuth 2.1) beta namespace wrapper.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Falta authorization_id en la URL.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("El servidor de autorización no devolvió redirect.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-medical-blue-light to-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-medical-blue mb-2">
              No se pudo procesar la solicitud
            </h1>
            <p className="text-sm text-medical-gray">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-medical-blue" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "Una aplicación externa";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-medical-blue-light to-background">
      <Card className="w-full max-w-md border-medical-blue/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-medical-blue">
            Conectar {clientName} a su cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-medical-gray">
            <strong>{clientName}</strong> solicita acceso a los consentimientos
            informados a los que usted tiene permiso, actuando en su nombre.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              disabled={busy}
              onClick={() => decide(true)}
              className="bg-medical-blue hover:bg-medical-blue/90"
            >
              {busy ? "Procesando..." : "Aprobar"}
            </Button>
            <Button
              disabled={busy}
              onClick={() => decide(false)}
              variant="outline"
              className="border-medical-blue/30"
            >
              Denegar
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}