import { Droplet, FlaskConical, HeartPulse, LucideIcon, ScanLine, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ícono y color por servicio. Un servicio que no esté aquí cae en el genérico,
 * de modo que añadir un consentimiento de un servicio nuevo nunca rompe la pantalla.
 */
const SERVICE_STYLE: Record<string, { icon: LucideIcon; bg: string; fg: string }> = {
  "Laboratorio Clínico": { icon: FlaskConical, bg: "bg-primary/10", fg: "text-primary" },
  "Ginecología / Laboratorio": { icon: HeartPulse, bg: "bg-pink-100", fg: "text-pink-600" },
  "Imágenes Diagnósticas": { icon: ScanLine, bg: "bg-indigo-100", fg: "text-indigo-600" },
  "Banco de Sangre / Medicina Transfusional": { icon: Droplet, bg: "bg-red-100", fg: "text-red-600" },
};

const DEFAULT_STYLE = { icon: Stethoscope, bg: "bg-muted", fg: "text-muted-foreground" };

interface ConsentServiceHeaderProps {
  service: string;
  count: number;
}

export function ConsentServiceHeader({ service, count }: ConsentServiceHeaderProps) {
  const { icon: Icon, bg, fg } = SERVICE_STYLE[service] ?? DEFAULT_STYLE;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("h-5 w-5", fg)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{service}</p>
        <p className="text-xs text-muted-foreground">
          {count} {count === 1 ? "consentimiento" : "consentimientos"}
        </p>
      </div>
      <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        {count}
      </span>
    </div>
  );
}
