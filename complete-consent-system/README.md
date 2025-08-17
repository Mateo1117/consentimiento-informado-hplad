# Sistema Completo de Consentimiento Informado con Firma Digital

Este sistema permite crear enlaces de consentimiento informado que los pacientes pueden firmar digitalmente desde sus dispositivos móviles.

## Características Principales

- ✅ Creación de enlaces para firma digital
- ✅ Captura de firma digital con SignaturePad
- ✅ Captura de foto del paciente con cámara
- ✅ Gestión de firmas profesionales
- ✅ Notificaciones por WhatsApp, SMS y Email
- ✅ Base de datos segura con RLS (Row Level Security)
- ✅ Auditoría de accesos y firmas
- ✅ Expiración automática de enlaces
- ✅ Diseño responsive y accesible

## Instalación

### 1. Dependencias Required

```bash
npm install @supabase/supabase-js
npm install react-signature-canvas
npm install @types/react-signature-canvas
npm install sonner
npm install lucide-react
npm install react-router-dom
```

### 2. Configuración de Supabase

1. Crear un proyecto en Supabase
2. Ejecutar el SQL del archivo `database-setup.sql` en el SQL Editor
3. Configurar el storage bucket 'photos' como público
4. Actualizar las credenciales en `integrations/supabase/client.ts`

### 3. Estructura de Archivos

```
src/
├── components/
│   ├── ShareConsentButtons.tsx    # Botones para compartir enlace
│   ├── SignaturePad.tsx          # Componente de firma digital
│   ├── CameraCapture.tsx         # Captura de foto con cámara
│   └── ui/                       # Componentes UI de shadcn
├── services/
│   ├── consentService.ts         # Lógica principal del sistema
│   ├── photoService.ts           # Gestión de fotos
│   └── professionalSignatureService.ts # Firmas profesionales
├── pages/
│   └── PublicConsentSigning.tsx  # Página pública para firmar
├── types/
│   └── consent.ts               # Tipos TypeScript
├── utils/
│   └── logger.ts               # Utilidades de logging
└── integrations/
    └── supabase/
        ├── client.ts           # Cliente Supabase
        └── types.ts            # Tipos generados
```

## Uso Básico

### 1. Crear Enlace de Firma

```tsx
import { ShareConsentButtons } from '@/components/ShareConsentButtons';
import { consentService } from '@/services/consentService';

const consentData = {
  patientName: "Juan Pérez",
  patientDocumentType: "CC",
  patientDocumentNumber: "12345678",
  patientEmail: "juan@email.com",
  patientPhone: "+57 300 123 4567",
  consentType: "cirugia_general",
  payload: {
    selected_procedures: ["Procedimiento 1", "Procedimiento 2"],
    risks: ["Riesgo 1", "Riesgo 2"],
    benefits: ["Beneficio 1", "Beneficio 2"],
    alternatives: ["Alternativa 1", "Alternativa 2"]
  }
};

<ShareConsentButtons 
  consentData={consentData}
  onConsentCreated={(shareableConsent) => {
    console.log('Enlace creado:', shareableConsent.shareUrl);
  }}
/>
```

### 2. Configurar Rutas

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicConsentSigning } from '@/pages/PublicConsentSigning';

<BrowserRouter>
  <Routes>
    <Route path="/consent/:token" element={<PublicConsentSigning />} />
    {/* Otras rutas */}
  </Routes>
</BrowserRouter>
```

### 3. Configurar Estilos

Incluir el archivo `index.css` y `tailwind.config.ts` para el sistema de diseño completo.

## Funcionalidades Avanzadas

### Firmas Profesionales

```tsx
// Guardar firma profesional para reutilizar
const signature = await ProfessionalSignatureService.saveSignature({
  professional_name: "Dr. Juan Médico",
  professional_document: "12345678",
  signature_data: signatureDataBase64,
  created_by: userId
});
```

### Captura de Fotos

```tsx
// Componente incluye captura automática con cámara
<CameraCapture
  title="Foto del Paciente"
  onPhotoCapture={(photoData) => {
    console.log('Foto capturada:', photoData);
  }}
/>
```

### Notificaciones

```tsx
// El sistema genera automáticamente enlaces para:
const whatsappLink = consentService.generateWhatsAppLink(shareUrl, patientName);
const smsLink = consentService.generateSMSLink(phone, shareUrl, patientName);
const emailLink = consentService.generateEmailLink(email, shareUrl, patientName);
```

## Seguridad

- **RLS (Row Level Security)**: Cada usuario solo puede ver sus propios consentimientos
- **Tokens seguros**: Enlaces con tokens únicos y fecha de expiración
- **Auditoría completa**: Registro de todos los accesos y firmas
- **Validación de datos**: Validación en frontend y backend
- **Almacenamiento seguro**: Fotos y firmas en Supabase Storage

## Personalización

### Modificar Estilos

El sistema usa Tailwind CSS con tokens semánticos. Modificar `index.css` y `tailwind.config.ts` para personalizar colores y estilos.

### Agregar Campos

1. Actualizar interface `ConsentData` en `services/consentService.ts`
2. Modificar tabla `consents` en la base de datos
3. Actualizar componentes según necesidad

### Integrar con Edge Functions

El sistema incluye ejemplos de Edge Functions para envío de emails y SMS automáticos.

## Licencia

MIT License - Puedes usar este código en cualquier proyecto comercial o personal.

## Soporte

Para dudas o mejoras, revisar la documentación de cada componente y servicio incluido.