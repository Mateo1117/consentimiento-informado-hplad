# Sistema de Consentimientos Informados — E.S.E. Hospital Pedro León Álvarez Díaz (La Mesa)

Aplicación web para generar, enviar, firmar y archivar consentimientos informados
digitales. Permite la firma remota del paciente mediante enlace con token, la firma
presencial en tablet, la captura de huella dactilar y la generación del PDF firmado.

Originalmente construida en Lovable; exportada y ahora autónoma.

## Consentimientos disponibles

| Clave | Consentimiento | Especialidad |
|---|---|---|
| `venopuncion` | Venopunción | Laboratorio Clínico |
| `carga_glucosa` | Curva de Tolerancia a la Glucosa | Laboratorio Clínico |
| `vih` (alias `hiv`) | Prueba de VIH | Laboratorio Clínico |
| `frotis_vaginal` | Frotis Vaginal | Ginecología / Laboratorio |
| `hemocomponentes` | Transfusión de Hemocomponentes | Banco de Sangre / Medicina Transfusional |

El texto de cada uno (descripción, propósito, procedimientos, beneficios, riesgos y
alternativas) vive en `src/data/procedureInfo.ts`. Las etiquetas y los alias de tipo
se normalizan en `src/utils/consentTypeNormalizer.ts`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (PostgreSQL + Auth + Storage + Edge Functions) — proyecto `dbhamokkweyadibngphq`
- jsPDF + html2canvas para la generación del PDF
- react-signature-canvas para la firma
- WebUSB / Web Bluetooth + DigitalPersona para el lector de huella

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:8080
```

## Build de producción

```bash
npm run build        # genera dist/
npm run preview      # sirve dist/ localmente para verificar
```

El resultado es estático: `dist/` se puede servir con cualquier servidor web.
Al ser una SPA con react-router, el servidor debe reescribir todas las rutas a
`index.html` (ver `nginx.conf`).

### Docker

```bash
docker build -t consentimientos-hplad .
docker run -p 8080:80 consentimientos-hplad
```

## Configuración

Las credenciales de Supabase están embebidas por defecto en
`src/integrations/supabase/client.ts` y se pueden sobreescribir en tiempo de
**build** (no de runtime — Vite las hornea en el bundle) mediante `.env`:

```
VITE_SUPABASE_URL="https://<proyecto>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
VITE_PUBLIC_APP_URL="https://<dominio-publico>"
```

`VITE_PUBLIC_APP_URL` es el dominio con el que se construyen los enlaces de firma
remota que se envían al paciente por correo, SMS o WhatsApp.

## Backend

El esquema y las funciones viven en `supabase/`:

- `supabase/migrations/` — historial de migraciones SQL
- `supabase/functions/` — edge functions (Deno): `consulta-paciente`,
  `enviar-consentimiento`, `public-sign-consent`, `upload-signed-pdf`,
  `send-consent-email`, `send-consent-sms`, `send-consent-whatsapp`, `send-email`,
  `send-sms`, `create-user`, `admin-reset-password`, `receive-webhook`,
  `trigger-webhooks`, `test-webhook`

Se despliegan con la CLI de Supabase:

```bash
supabase link --project-ref dbhamokkweyadibngphq
supabase functions deploy <nombre>
```

La función `send-email` construye el enlace al panel administrativo con la variable
de entorno `APP_URL` (configurable en el dashboard de Supabase).

## Tablas principales

- `consents` — consentimientos enviados y firmados (paciente, tipo, estado, token de
  firma, firma del paciente, PDF)
- `profiles`, `user_roles`, `roles`, `role_permissions` — usuarios y permisos
- `professional_signatures` — firmas de los profesionales
- `consent_access_logs`, `consent_signature_logs`, `consent_delivery_logs`,
  `webhook_logs` — auditoría

Todas con Row Level Security activada.
