# Sistema de Consentimientos Informados — E.S.E. Hospital Pedro León Álvarez Díaz (La Mesa)

Aplicación web para generar, enviar, firmar y archivar consentimientos informados
digitales. Permite la firma remota del paciente mediante enlace con token, la firma
presencial en tablet, la captura de huella dactilar y la generación del PDF firmado.

Originalmente construida en Lovable; exportada y ahora autónoma.

## Consentimientos disponibles

Cada consentimiento corresponde a **un formato aprobado del hospital**, y su PDF
estampa el código y la versión de ese formato (definidos en el `documentMeta` de
su generador, en `src/utils/pdfGenerator<Tipo>.ts`).

| Clave | Consentimiento | Formato | Versión | Aprobación |
|---|---|---|---|---|
| `venopuncion` | Toma de muestras por venopunción | `SC-M-09.37` | 02 | 28-12-2022 |
| `carga_glucosa` | Carga de glucosa | `SC-M-09.119` | 01 | 20-10-2024 |
| `vih` (alias `hiv`) | Prueba presuntiva de VIH | `SC-M-09.39` | 02 | 28-12-2022 |
| `frotis_vaginal` | Frotis vaginal | `SC-M-09.319` | 01 | 16-06-2022 |
| `hemocomponentes` | Transfusión de hemocomponentes | `SC-M-09.320` | 01 | 15-03-2023 |
| `radiografia` | Toma de radiografía | `SC-F-09.31` | 0.3 | 11-09-2026 |
| `rx_gestante` | Radiografía para gestante | `SC-M-09.32` | 03 | 11-09-2026 |
| `mamografia` | Toma de mamografía | `SC-M-09.33` | 03 | 11-09-2026 |
| `ultrasonido` | Ultrasonido | `SC-F-09.34` | 0.3 | 11-09-2026 |
| `eco_tv` | Ultrasonido transvaginal | `SC-F-09.35` | 0.3 | 11-09-2026 |
| `tac` | Tomografía axial computarizada | `SC-F-09.36` | 0.3 | 11-09-2026 |

El texto que ve el paciente al firmar por enlace vive en `src/data/procedureInfo.ts`.
Las etiquetas y los alias de tipo se normalizan en `src/utils/consentTypeNormalizer.ts`.

### Añadir un consentimiento nuevo

Un formato aprobado por separado es un consentimiento separado, aunque lo preste
el mismo servicio. El código y la versión se leen de la cabecera del .docx y se
llevan al PDF tal cual; si el formato no trae alguna sección, se omite la fila.

No hay formulario genérico: cada tipo es un clon. Lo probado es copiar el par
(formulario + generador) del tipo más parecido y luego actualizar los mapas:

1. `src/utils/pdfGenerator<Tipo>.ts` — `documentMeta` y las filas del documento
2. `src/components/ConsentForm<Tipo>.tsx` — envuelto en `ConsentFormWrapper`
3. `src/pages/Index.tsx` — import, `consentTypes`, unión de tipos del `useState` y
   `case` en `renderConsentForm`
4. `src/pages/EnviarConsentimiento.tsx` — la misma entrada, para el envío remoto
5. `src/utils/consentTypeNormalizer.ts` — alias, etiqueta y especialidad
6. `src/data/procedureInfo.ts` — ficha que ve el paciente
7. `src/components/PendingConsentsPanel.tsx` — etiqueta
8. `src/pages/ConsentManagement.tsx` — etiqueta
9. `src/services/signedConsentPdfService.ts` — nombre para mostrar y del procedimiento
10. `src/services/appConsentService.ts` — alias y ambos nombres

`src/components/InformedConsentApp.tsx` tiene su propio catálogo pero ningún router
lo referencia: es código muerto, no hay que actualizarlo.

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

### Despliegue en el VPS (EasyPanel)

Mismo esquema que el sistema de Funza, que corre en el VPS `149.130.184.133`
dentro del proyecto `consentimientos_informados`. La Mesa necesita **su propio
servicio** en ese proyecto; no comparte el de Funza (`consentimiento_inf_hnsmf`).

Pasos para dejarlo montado la primera vez:

1. En EasyPanel, crear un servicio de tipo **App** dentro del proyecto
   `consentimientos_informados`.
2. Origen: este repositorio, rama `main`. Método de compilación: **Dockerfile**
   (el de la raíz; no hace falta configurar buildpacks).
3. Puerto expuesto: **80** — es el que publica nginx en la imagen.
4. Dominio: `consentimientohplad.mcmasociados.tech`, con certificado gestionado
   por EasyPanel.
5. Variables de entorno de build, si se quieren distintas a los valores por
   defecto de `src/integrations/supabase/client.ts`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_PUBLIC_APP_URL`.

A partir de ahí, desplegar es: `push` a `main` y pulsar **Implementar** en
EasyPanel.

> El dominio `consentimientohplad.mcmasociados.tech` apunta hoy a Lovable. Al
> cortar, hay que repuntar el DNS al VPS; hasta entonces el servicio de EasyPanel
> se puede probar con el subdominio temporal que asigna el panel.

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
