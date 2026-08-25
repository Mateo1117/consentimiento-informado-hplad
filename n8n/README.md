# Flujo n8n · Crear Consentimiento (HPLAD)

Automatización que recibe el consentimiento firmado desde la app y lo carga en la
historia clínica del hospital (`POST /consentimientos` en `190.145.223.146:99`).

- **Webhook:** `https://webhook.mcmasociados.tech/webhook/crear_consentimiento`
- **Lo dispara:** `supabase/functions/enviar-consentimiento/index.ts`, llamado por
  `appConsentService.sendConsentToWebhook()`.

---

## Cómo quedó el flujo

```
Webhook ─► Preparar Datos ─► Buscar Medico ─► Buscar Plantilla ─► Datos Completos
                                                                        │
                                            ┌───────────── no ──────────┘
                                            ▼
                                   Respuesta Con Error ─► Responder Error (422)
                                            ▲
        ┌──────────────── sí ───────────────┼──────────────────────────┐
        ▼                                   │ (errores de descarga y   │
    Firmantes ─┬─ Solo paciente  ─► Descargar Firma Paciente  ─► POST hcpacfir
               ├─ Solo acudiente ─► Descargar Firma Acudiente ─► POST hcrepfir
               └─ Ambas ─┬─ Descargar Firma Paciente (Ambas) ─┐
                         └─ Descargar Firma Acudiente (Ambas)─┴─► Unir Firmas ─► POST hcpacfir + hcrepfir
                                                                                        │
                                                                    ┌── ok ─────────────┘
                                                                    ▼
                                              Respuesta Exitosa ─► Responder OK (200)
```

18 nodos. La cadena termina siempre en `Responder OK` o `Responder Error`.

### Por qué las descargas van *después* del Switch

Un nodo HTTP Request con `responseFormat: "file"` **reemplaza** el binario del
item, no lo suma. Tres descargas encadenadas dejan sólo la última, así que cada
rama baja únicamente la firma que su POST necesita. La rama de ambas firmas usa
un nodo **Merge** (*combine by position*) para juntar los dos binarios en un
único item antes del POST.

### Por qué ya no hay nodo "Construir Binarios"

Porque no hace falta: el nodo de descarga ya entrega la firma como archivo, y su
propiedad de salida se llama **directamente `hcpacfir` / `hcrepfir`**, que es el
nombre que espera el multipart de la API. Los OIDs de médico y plantilla los leen
los POST de sus nodos de origen:

```
hcnplconsinf → {{ $('Buscar Plantilla').first().json.data[0].oid }}
genmedico    → {{ $('Buscar Medico').first().json.data[0].oid }}
pacnumdoc    → {{ $('Preparar Datos').first().json.paciente_numero_documento }}
```

Ojo con esto al editar: el item que llega al POST viene de una descarga, así que
su `$json` **no** es el de `Preparar Datos`. Cualquier campo que se lea con
`$json.loQueSea` saldrá vacío; hay que nombrar el nodo de origen.

---

## Qué hace "Preparar Datos"

Normaliza el body del webhook y decide la rama. Tres detalles que importan:

- **Sólo una URL http(s) es descargable.** Si la firma llega como data URI
  (`data:image/png;base64,…`) significa que `PhotoService.uploadPhoto()` falló en
  la app y mandó la imagen incrustada. Un HTTP Request no puede resolver el
  esquema `data:`, así que eso se reporta como error en vez de dejar que el
  consentimiento se guarde sin firma.
- **Tolera el body sin parsear.** Si llega como cadena (Content-Type inesperado),
  intenta `JSON.parse` antes de rendirse.
- **Busca cada firma en varios nombres**: `paciente_firma`, `firma_paciente`,
  `patientSignature`, `payload_adicional.patientSignature`, con los equivalentes
  del acudiente. Un cambio de nombre en la app no cuesta la firma.

Emite `modo` (`paciente` | `acudiente` | `ambas` | `sin_firma`), que es lo único
que mira el Switch, y `diagnostico_entrada`, que dice en qué campo se encontró
cada firma y de qué tipo es — sin volcar la imagen.

---

## Diagnóstico cuando algo falla

La respuesta 422 trae todo lo necesario para saber dónde se rompió:

```jsonc
{
  "success": false,
  "errores": ["La firma del paciente llegó como data_uri … Storage (PhotoService.uploadPhoto falló)."],
  "diagnostico": {
    "modo": "sin_firma",
    "medico_oid": 4321,
    "plantilla_oid": 88,
    "url_firma_paciente": "",
    "entrada": {
      "claves_body": ["consent_id", "paciente_firma", "…"],
      "firma_paciente": { "campo": "paciente_firma", "tipo": "data_uri", "descargable": false }
    }
  }
}
```

| `tipo` | Qué pasa |
|---|---|
| `url` | Todo bien, la descarga la baja |
| `data_uri` / `base64_sin_encabezado` | La app no subió la firma a Storage |
| `ausente` | La app no mandó la firma |

Si la descarga falla (bucket privado, URL firmada vencida, 403), el item se va
por la salida de error del nodo hacia el 422 con el mensaje de la petición. Nunca
se sube un consentimiento sin la firma que dice tener.

---

## Errores del flujo original

El flujo anterior fallaba en `Crear Consentimiento2` con *"This operation expects
the node's input data to contain a binary file"*. La cadena de defectos era:

1. **Las firmas podían llegar como data URI base64.** Los nodos hacían un GET
   contra `{{ $('Webhook1').item.json.body.paciente_firma }}`, que a veces valía
   `data:image/png;base64,…`. El nodo fallaba, `onError: continueRegularOutput`
   silenciaba el fallo y el item seguía sin binario. Encima `maxTries: 5`
   reintentaba cinco veces algo que no podía funcionar.
2. **El Switch decidía sobre un campo que el backend borra siempre.** Evaluaba
   `payload_adicional.patientPhotoUrl`, y `src/utils/sanitizeConsentPayload.ts`
   elimina esa clave antes de enviar el webhook. Con `typeValidation: "strict"` y
   `fallbackOutput: "none"` el item se descartaba y la rama del paciente moría.
3. **`firma paciente` no pedía `responseFormat: "file"`** (`firma acudiente` sí),
   así que la propiedad binaria que exige el POST no se creaba nunca.
4. **Al faltar la firma se subía un PDF vacío** en `hcpacfir`, guardando
   consentimientos cuya firma no era una firma.

Menores corregidos de paso: `hcaparent` duplicado en `Crear Consentimiento3`, ese
nodo sin salida conectada, ausencia de `Respond to Webhook` (el webhook
contestaba "Workflow was started" antes de intentar nada, así que la app nunca se
enteraba de los fallos) y `data[0].oid` sin validar en médico/plantilla.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `crear-consentimiento.workflow.json` | El workflow listo para importar |
| `src/01-preparar-datos.js` | Código del nodo "Preparar Datos" |
| `src/03-respuesta-ok.js` | Código del nodo "Respuesta Exitosa" |
| `src/04-respuesta-error.js` | Código del nodo "Respuesta Con Error" |
| `build-workflow.mjs` | Genera el JSON a partir de los `.js` |
| `test-flujo.mjs` | Simula el flujo y valida el grafo |

Los nodos Code se editan como archivos `.js` y el JSON se regenera con
`node n8n/build-workflow.mjs`. Nunca se edita el `jsCode` dentro del JSON.

`node n8n/test-flujo.mjs` cubre nueve escenarios (firma por URL, sólo acudiente,
ambas firmas, base64 incrustado, sin firma, médico inexistente, procedimiento
rechazado, body sin parsear, descarga fallida) y valida el grafo: sin nodos
huérfanos ni conexiones colgando, sin referencias `$('Nodo')` a nodos que no
existen, y cada binario que pide un POST lo produce alguna descarga de su rama.
Además simula el renombrado que hace n8n al importar (`Nombre` → `Nombre2`) y
comprueba que los nodos Code siguen resolviendo los OIDs, y que ningún nodo Code
cita un nombre de nodo como cadena suelta. 18 aserciones, todas pasan.

---

## Importar en n8n

**Importa en un workflow NUEVO y vacío, y borra o desactiva el viejo antes.** Los
dos puntos siguientes son la causa de que una importación "correcta" siga sin
funcionar:

- **Un solo workflow activo puede escuchar el path `crear_consentimiento`.** Si el
  viejo sigue activo, es él quien atiende las peticiones y el nuevo no se entera
  de nada, por muy bien importado que esté.
- **Si un nombre de nodo ya existe, n8n renombra el nuevo** (`Buscar Medico` →
  `Buscar Medico2`). Reescribe las llamadas `$('Buscar Medico')` que encuentra,
  pero **no** un nombre que viaje como cadena suelta. Por eso en los nodos Code
  los lookups se escriben siempre `$('Nombre')` literal — nunca en una variable
  ni como argumento de una función. Si ves nodos acabados en `2` o `3`, estás
  importando encima de una copia vieja.

Pasos:

1. **Duplica el workflow actual antes de tocar nada** (⋯ → Duplicate), por si hay
   que volver.
2. **Desactiva y renombra o borra el workflow viejo.** Que no quede ningún nodo
   con estos nombres ni ningún webhook activo en `crear_consentimiento`.
3. Crea un workflow nuevo y vacío → *Import from File* →
   `crear-consentimiento.workflow.json`. Importa el archivo completo; copiar
   nodos sueltos pierde las conexiones y el código.
4. Comprueba que **ningún nodo tenga sufijo numérico** y que el lienzo tenga
   **18 nodos**, con la cadena llegando hasta `Responder OK` / `Responder Error`.
5. Verifica que el `webhookId` no haya cambiado; si n8n genera uno nuevo, la URL
   pública cambia y hay que actualizar `WEBHOOK_URL` en
   `supabase/functions/enviar-consentimiento/index.ts`.
6. Activa el nuevo.

> `Buscar Medico` y `Buscar Plantilla` filtran por nombre exacto
> (`profesional_nombre_completo` en mayúsculas y `nombre_consentimiento`). Si la
> API no encuentra coincidencia, la respuesta 422 lo dice con el nombre buscado.

---

## Pendientes conocidos

- **La huella (`paciente_foto`) ya no se compone junto a la firma.** El montaje
  de las dos imágenes en un PNG vivía en el nodo que se eliminó. La API recibe
  ahora la firma sola. Si hace falta recuperarlo, el sitio natural es un nodo
  entre la descarga y el POST, o hacerlo en la app antes de subir a Storage.
- **La rama de "ambas firmas" usa un nodo Merge** para juntar los dos binarios.
  Es el único camino que no se pudo probar contra un n8n real: si el POST de
  paciente+acudiente se queja de que falta `hcpacfir` o `hcrepfir`, el Merge no
  está arrastrando el binario y habría que revisarlo.
- **Que la firma llegue alguna vez como data URI** significa que
  `PhotoService.uploadPhoto()` falla en silencio: en
  `src/services/appConsentService.ts` el resultado se ignora con
  `if (uploaded?.url)`. Conviene registrar ese fallo del lado de la app.
