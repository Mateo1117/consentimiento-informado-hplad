# Flujo n8n · Crear Consentimiento (HPLAD)

Automatización que recibe el consentimiento firmado desde la app y lo carga en la
historia clínica del hospital (`POST /consentimientos` en `190.145.223.146:99`).

- **Webhook:** `https://webhook.mcmasociados.tech/webhook/crear_consentimiento`
- **Lo dispara:** `supabase/functions/enviar-consentimiento/index.ts`, llamado por
  `appConsentService.sendConsentToWebhook()`.

---

## Por qué no estaba subiendo el consentimiento

El flujo anterior fallaba en el nodo `Crear Consentimiento2` con *"This operation
expects the node's input data to contain a binary file"*. Ese error es el síntoma
final de seis defectos encadenados; los dos primeros bastan para que **nunca**
se cargue un consentimiento, y el quinto es el que hacía que el consentimiento sí
se creara pero **sin firma**.

### 1. Las firmas llegan como base64, no como URL — y un HTTP Request no puede descargarlas

Los nodos `firma paciente`, `firma acudiente` y `huella paciente` hacían un GET
contra el valor del campo:

```
url: {{ $('Webhook1').item.json.body.paciente_firma }}
```

Pero en el payload real ese campo vale `data:image/png;base64,iVBORw0KGgo...`.
`appConsentService` *intenta* subir la firma a Supabase Storage para mandar una
URL corta, pero si la subida falla envía el data URI crudo — que es justo lo que
se ve en los datos capturados. Un nodo HTTP Request no puede resolver un esquema
`data:`, así que el nodo fallaba; con `onError: continueRegularOutput` el fallo
quedaba silenciado y el item seguía **sin ningún binario**.

Lo mismo ocurría cuando el campo era `null` (`acudiente_firma`, `paciente_foto`
en el caso capturado): la URL quedaba vacía, y encima con `maxTries: 5` y
`waitBetweenTries: 300` se reintentaba cinco veces algo que jamás podía funcionar.

### 2. El Switch evaluaba un campo que el backend borra siempre

```
leftValue: {{ $('Webhook1').item.json.body.payload_adicional.patientPhotoUrl }}
```

`src/utils/sanitizeConsentPayload.ts` elimina `patientPhotoUrl` de
`payload_adicional` antes de guardar y de enviar el webhook (junto con
`patientSignature` y `guardianSignature`, para no duplicar cientos de KB en la
base). Ese campo, por tanto, es **siempre `undefined`**.

Con `typeValidation: "strict"` comparar `undefined` con un operador de tipo
string es un error de validación, y con `fallbackOutput: "none"` ninguna rama
recibe el item. Resultado: la rama del paciente moría en el Switch.

La huella viaja en el campo raíz `paciente_foto`, no dentro de `payload_adicional`.

### 3. `firma paciente` nunca pedía el archivo como binario

```jsonc
// firma paciente  → sólo fullResponse
"response": { "response": { "fullResponse": true } }

// firma acudiente → sí pedía el archivo
"response": { "response": { "fullResponse": true, "responseFormat": "file", "outputPropertyName": "data rep" } }
```

Sin `responseFormat: "file"` la respuesta se interpreta como JSON/texto y no se
crea la propiedad binaria `data`. Aunque la firma hubiera llegado como URL válida,
`Crear Consentimiento2` —que exige `inputDataFieldName: "data"`— habría fallado
igual. Y en la rama *"Sin huella"* el Switch iba directo al POST, sin pasar por
ningún nodo que construyera ese binario.

### 4. Cuando no había firma, se subía un PDF vacío haciéndose pasar por firma

`Code in JavaScript2` rellenaba `hcpacfir` con un PDF de una página que dice
"Sin informacion" (`application/pdf`) cuando la descarga fallaba. En el mejor de
los casos la API lo rechaza; en el peor guarda un consentimiento cuya "firma" no
es una firma. Un consentimiento informado sin firma real no debería llegar nunca
a la historia clínica: es mejor devolver error.

### 5. n8n guarda los binarios en disco y `binary.x.data` llega vacío

Este es el fallo de *«no convierte el binario»*, y es el que quedaba vivo después
de la primera corrección.

`Construir Binarios` recogía cada imagen leyendo la propiedad `data` del binario
de un nodo anterior:

```js
const bin = $('Preparar Datos').first().binary?.firma_paciente_inline;
if (bin && bin.data && bin.data.length > 0) return bin;   // ← aquí se perdía
```

Eso sólo funciona cuando n8n mantiene los binarios en memoria. Con
`N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (o `s3`) —lo normal en self-hosted y en
n8n Cloud— n8n escribe el binario fuera del item y devuelve `data: ''` con un
`id` de referencia. La firma existía, el nodo la leía como ausente, y el item
salía **sin `hcpacfir`**: el consentimiento se creaba en la historia clínica, pero
sin firma. Exactamente el síntoma reportado.

La corrección tiene dos partes:

1. `Preparar Datos` deja también el base64 crudo en el **JSON**
   (`b64_firma_paciente`, `b64_firma_acudiente`, `b64_huella_paciente`), que no
   depende del modo de almacenamiento de binarios.
2. `Construir Binarios` resuelve cada imagen en cascada: binario del nodo de
   descarga → referencia en disco vía `helpers` → binario inline de
   `Preparar Datos` → **base64 del JSON**. El último eslabón nunca falla si la
   firma venía en el webhook.

La salida de `Construir Binarios` ahora incluye `firma_paciente_bytes` /
`firma_acudiente_bytes` (si valen `0`, la firma no llegó) y
`origen_firma_paciente`, que dice de dónde salió la imagen:

| Valor | Significado |
|---|---|
| `inline` | data URI decodificado en `Preparar Datos` (el caso normal) |
| `descarga` | bajada por HTTP desde una URL de Supabase Storage |
| `entrada` | binario que venía en la entrada inmediata del nodo |
| `json_base64` | base64 del JSON — n8n guarda los binarios fuera de memoria |
| `ninguno (…)` | no se pudo resolver, con el motivo entre paréntesis |

Esos mismos campos viajan en la respuesta del webhook (200 y 422), así que no hace
falta abrir nodo por nodo en el editor para saber dónde se perdió la firma.

`Preparar Datos` añade además `diagnostico_entrada`, que dice qué llegó de verdad
en el webhook sin volcar la imagen entera:

```jsonc
"diagnostico_entrada": {
  "claves_body": ["consent_id", "paciente_firma", "..."],
  "firma_paciente": {
    "encontrado_en": "paciente_firma",   // null si no vino en ningún campo conocido
    "tipo": "data_uri",                  // url | data_uri | base64_sin_encabezado | texto_no_reconocido | ausente
    "longitud": 41231,
    "muestra": "data:image/png;base64,iVBORw0KGgo…"   // 80 caracteres, no más
  }
}
```

Con `tipo` y `origen_firma_paciente` juntos el diagnóstico es inmediato:

| `tipo` | `origen_firma_paciente` | Qué pasa |
|---|---|---|
| `data_uri` | `inline` / `json_base64` | Todo bien |
| `url` | `descarga` | Todo bien |
| `url` | `ninguno (la URL … no se pudo descargar: …)` | El bucket de Storage es privado o la URL firmada venció |
| `ausente` | `ninguno (no venía en el webhook)` | La app no mandó la firma |

`Preparar Datos` también tolera que el body llegue como cadena sin parsear y busca
la firma en varios nombres (`paciente_firma`, `firma_paciente`, `patientSignature`,
`payload_adicional.patientSignature`), para que un cambio de nombre en la app no
cueste la firma.

### 6. El flujo importado quedaba cortado en `Construir Binarios`

En el JSON del workflow en uso, las conexiones terminaban así:

```json
"Construir Binarios": { "main": [[]] }
```

Sin `Datos Completos`, sin `Firmantes`, sin ningún `Crear Consentimiento (…)` y
sin los nodos de respuesta. El binario se construía y se quedaba ahí: nada hacía
`POST /consentimientos` con la firma. Si aun así aparecían consentimientos en la
historia clínica, los estaba creando el flujo viejo (`Crear Consentimiento2` /
`Crear Consentimiento3`), que es justamente el que no manda la firma.

Al importar, comprueba que el lienzo tenga **17 nodos** y que la cadena llegue
hasta `Responder OK` / `Responder Error`. Si copias y pegas nodos sueltos en vez
de importar el archivo completo, las conexiones se pierden.

### Defectos menores corregidos de paso

| Defecto | Efecto |
|---|---|
| `hcaparent` duplicado en `Crear Consentimiento3` | Campo repetido en el multipart |
| `Crear Consentimiento3` sin conexión de salida | La rama del acudiente terminaba en el aire |
| Sin `Respond to Webhook` | El webhook contestaba "Workflow was started" antes de intentar nada: cualquier fallo era invisible para la app |
| `data[0].oid` sin validar en `Medicos` / `Plantilla Consentimiento2` | Si el médico o la plantilla no existen, el flujo revienta sin decir por qué |
| PNG compuesto en RGB con DEFLATE *stored* | 2,1 MB por consentimiento |

---

## Cómo quedó el flujo

```
Webhook ─► Preparar Datos ─► Buscar Medico ─► Buscar Plantilla
                                                   │
        ┌──────────────────────────────────────────┘
        ▼
  Descargar Firma Paciente ─► Descargar Firma Acudiente ─► Descargar Huella
        │  (sólo si el campo es una URL http; si no, falla al instante y sigue)
        ▼
  Construir Binarios ─► Datos Completos ─┬─ no ─► Respuesta Con Error ─► Responder Error (422)
                                         │
                                         └─ sí ─► Firmantes ─┬─ Solo paciente          ─► POST hcpacfir
                                                             ├─ Solo acudiente         ─► POST hcrepfir
                                                             └─ Paciente y acudiente   ─► POST hcpacfir + hcrepfir
                                                                        │
                                                                        ├─ ok    ─► Respuesta Exitosa ─► Responder OK (200)
                                                                        └─ error ─► Respuesta Con Error ─► Responder Error (422)
```

Decisiones de diseño:

- **`Preparar Datos` clasifica cada imagen** en URL http, data URI o ausente. Los
  data URI se decodifican a binario ahí mismo; sólo las URLs se descargan. Así
  funciona tanto si Storage responde como si la app cae al base64 de respaldo.
- **Las descargas siempre se ejecutan** con `onError: continueRegularOutput`. Si
  la imagen no era una URL, la expresión devuelve cadena vacía, el nodo falla al
  instante (sin reintentos) y el item sigue intacto. Evita tres pares de IF/Merge.
- **Tres nodos POST en vez de uno** — uno por combinación de firmantes. Un
  `formBinaryData` exige que el binario exista, así que enviar campos condicionales
  desde un único nodo obligaría a inventar binarios de relleno.
- **Nada de rellenos.** Si falta una firma, el consentimiento no se sube y la app
  recibe 422 con el motivo.
- **Los campos del acudiente sólo se envían cuando hay acudiente**, para no crear
  registros con nombre y parentesco vacíos.

### La huella se sigue componiendo junto a la firma

Igual que en el flujo original, cuando llega `paciente_foto` la imagen se compone
con la firma (firma a la izquierda, huella a la derecha, separador en medio) y se
envía como un único `hcpacfir`, porque la API sólo tiene ese campo para la firma
del paciente.

El decodificador PNG e `inflate` viven en `src/02-construir-binarios.js` porque el
sandbox del nodo Code no permite instalar librerías. Frente al original:

- aplana la transparencia sobre blanco (antes una firma RGBA con fondo
  transparente se volvía negra sobre negro al descartar el canal alfa);
- compone en escala de grises y usa `zlib` si el sandbox lo permite: la imagen
  pasó de ~2,1 MB a ~450 KB (~25 KB con zlib disponible);
- **ante cualquier fallo devuelve la firma intacta** en vez de un rectángulo gris.
  Perder la composición es aceptable; perder la firma no.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `crear-consentimiento.workflow.json` | Workflow listo para importar en n8n |
| `build-workflow.mjs` | Genera ese JSON a partir de `src/*.js` |
| `src/01-preparar-datos.js` | Normaliza el body y clasifica las imágenes |
| `src/02-construir-binarios.js` | Reúne binarios, compone firma+huella, valida |
| `src/03-respuesta-ok.js` / `src/04-respuesta-error.js` | Respuesta al webhook |
| `test-flujo.mjs` | Simula el flujo con 8 escenarios reales |

Los nodos Code se editan como archivos `.js` normales y luego se regenera el JSON,
en vez de editarse como cadenas escapadas dentro del workflow.

```bash
node n8n/test-flujo.mjs        # 8 escenarios, sin tocar n8n ni la API
node n8n/build-workflow.mjs    # regenera el JSON tras editar src/*.js
```

## Importar en n8n

1. **Duplica el workflow actual antes de tocar nada** (⋯ → Duplicate), para poder
   volver atrás.
2. n8n → *Import from File* → `crear-consentimiento.workflow.json`.
3. Verifica que el path del webhook siga siendo `crear_consentimiento` y que el
   `webhookId` coincida con el del flujo viejo (ya viene puesto). Si n8n genera uno
   nuevo, la URL pública cambia y hay que actualizar `WEBHOOK_URL` en
   `supabase/functions/enviar-consentimiento/index.ts`.
4. **Desactiva el workflow viejo antes de activar este**: dos flujos activos con
   el mismo path se pisan.
5. **Cuenta los nodos: deben ser 17** y la última conexión debe llegar a
   `Responder OK` / `Responder Error`. Si el lienzo termina en `Construir Binarios`,
   la importación quedó a medias y la firma nunca se envía.
6. Prueba con *Execute Workflow* usando un consentimiento real y revisa la salida
   de `Construir Binarios`: `modo`, `valido`, `errores`, `composicion_firma_huella`
   y sobre todo `firma_paciente_bytes` dicen exactamente qué pasó.
7. Abre el nodo `Crear Consentimiento (…)` que se haya ejecutado y mira su pestaña
   **INPUT → Binary**: si ahí no está `hcpacfir`, la firma se perdió antes del POST;
   si está, salió hacia la API y lo que falle está del lado del hospital.

> `Buscar Medico` y `Buscar Plantilla` filtran por nombre exacto
> (`profesional_nombre_completo` en mayúsculas y `nombre_consentimiento`). Si la
> API no encuentra coincidencia, la respuesta 422 lo dice con el nombre buscado.

## Recomendación aparte (app, no n8n)

Que la firma llegue a veces como data URI significa que
`PhotoService.uploadPhoto()` está fallando en silencio: en
`src/services/appConsentService.ts` el resultado se ignora con
`if (uploaded?.url)`. El flujo ya tolera ambos formatos, pero conviene registrar
ese fallo — un data URI de 300 KB por consentimiento infla cada request.
