# Flujo n8n · Crear Consentimiento HPLAD

Registra en la historia clínica del hospital el consentimiento que firma el
paciente en la app, **con su firma como imagen**.

- `crear-consentimiento.workflow.json` — el flujo listo para importar.
- `build-workflow.mjs` — lo genera a partir de `src/`.
- `test-flujo.mjs` — pruebas sin necesidad de n8n.
- `src/*.js` — el código de cada nodo Code, uno por fichero.

```bash
node n8n/build-workflow.mjs && node n8n/test-flujo.mjs
```

## Nombres de nodo

Los nodos tienen nombres propios (`Recibir Consentimiento`, `Clasificar
Imagenes`, `Consultar Medicos`, `Armar Binarios`, `Decidir Envio`, ...) que no
chocan con los del flujo viejo ni con importaciones anteriores. Si al importar
algún nombre aparece con un número pegado al final, se importó sobre un lienzo
que no estaba vacío: borre e importe en un workflow **nuevo**.

**Importante:** sólo puede existir un webhook con la ruta
`crear_consentimiento` en toda la instancia. Mientras el flujo viejo (nodo
`wh`) siga existiendo/activo, la app seguirá cayendo en la cadena vieja aunque
la nueva esté perfecta.

## Recorrido

```
Recibir Consentimiento
 └ Clasificar Imagenes       ¿qué llegó en cada imagen? (URL / data URI / nada)
    └ Estado Autorizacion    aceptado → 1, rechazado → 0
       └ Consultar Medicos
          └ Consultar Plantillas
             └ Hay Acudiente
                ├ sí → Bajar Firma Acudiente ┐
                └ no ────────────────────────┴→ Bajar Firma Paciente
                                                 └ Bajar Huella
                                                    └ Armar Binarios
                                                       └ Decidir Envio (por `ruta`)
                                                          ├ Con error     → Armar Respuesta
                                                          ├ Con acudiente → Enviar Con Acudiente
                                                          └ Sin acudiente → Enviar Sin Acudiente
                                                                             └ Armar Respuesta
                                                                                └ Responder Webhook
```

## Qué se arregló y por qué

**La firma llegaba de dos formas y el flujo sólo soportaba una.** La app sube la
firma a Supabase Storage y manda la URL, pero cuando esa subida falla manda el
data URI (`data:image/png;base64,...`) dentro del JSON. Un nodo HTTP Request no
puede resolver el esquema `data:`, así que en ese caso el consentimiento salía
sin firma. Ahora `Code in JavaScript3` distingue los dos casos y
`Code in JavaScript1` decodifica el data URI cuando la descarga no aplica.

**`firma paciente` no pedía el archivo.** Tenía sólo `fullResponse: true`, sin
`responseFormat: "file"`, así que nunca creaba la propiedad binaria `data` que
sube `hcpacfir`. Ese era el "no convierte el binario".

**Los binarios guardados en disco se leían como vacíos.** Con
`N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (o `s3`) la propiedad `binary.x.data`
llega vacía y sólo trae un `id`. Se resuelve la referencia con los helpers.

**El Switch descartaba el item en silencio.** Evaluaba
`payload_adicional.patientPhotoUrl`, un campo que `sanitizeConsentPayload`
borra siempre, con `typeValidation: strict` y `fallbackOutput: none`. Ahora
reparte por el texto `ruta` (`error` / `con_acudiente` / `sin_acudiente`) y lo
que no encaje se va a la rama de error.

**El Switch mandaba todo a "Con error".** Repartía con condiciones booleanas
(`{{ $json.ok }}` *is true*). Al importar, n8n deja el Switch con
`typeValidation: "strict"` y "Convert types where required" apagado, y ahí una
condición booleana con `rightValue` vacío no valida: ninguna regla encaja y todo
cae al *fallback*, que es la salida 0. Ahora se compara un texto —mucho más
tolerante— y los nodos llevan `looseTypeValidation: true`.

**`Crear Consentimiento3` no llevaba a ninguna parte.** Su conexión era
`{"main": [[]]}`: la rama del acudiente terminaba sin responder al webhook.
También tenía `hcaparent` duplicado.

**Se enviaba un PDF vacío como firma.** Cuando faltaba una imagen, el flujo
subía un PDF con el texto "Sin informacion" en `hcpacfir` / `hcrepfir`. Eso
guardaba consentimientos con una "firma" que no era una firma. Ahora, si falta
la firma del paciente no se llama a la API y se responde 422 explicando por qué.

**Los errores no llegaban a la app.** Sólo existía `Responder OK` con 200 fijo,
así que la Edge Function veía éxito pasara lo que pasara. Ahora
`Code in JavaScript2` arma un cuerpo con `ok`, `errores`, `respuesta_api` y
`diagnostico`, y `Responder OK` devuelve 200 o 422 según `ok`.

**Nombres de nodo como texto suelto.** Al importar, n8n añade un sufijo
numérico a los nodos repetidos y reescribe los `$('Nombre')` —también dentro del
`jsCode`—, pero **no** un nombre pasado como argumento de texto
(`primerOid('Medicos')`). Todas las referencias se escriben como `$('Nombre')`
literal, y `test-flujo.mjs` simula el renombrado para comprobarlo.

## Cómo importarlo

1. En n8n, **desactivar** el flujo actual (dos flujos activos no pueden
   compartir la ruta `crear_consentimiento`).
2. Crear un workflow **nuevo y vacío** → *Import from File* →
   `crear-consentimiento.workflow.json`.
3. Revisar que ningún nodo haya quedado con un "2" de más en el nombre. Si pasó,
   es que el flujo viejo seguía abierto: borrar y repetir sobre uno vacío.
4. Activar el nuevo y probar con *Execute Workflow* + un envío real.

## Requisitos del lado del hospital

El POST a `/consentimientos` falla con 404 aunque el flujo esté bien si:

- **El profesional no está en `/medicos`.** El nombre se busca tal cual llega en
  `profesional_nombre_completo`. Tiene que ser el profesional que atendió y
  estar registrado en el hospital con ese mismo nombre.
- **El paciente no tiene folio (`HCNFOLIO`).** `No se encontró un folio
  (HCNFOLIO) para el paciente con OID …` significa que el paciente existe pero
  no tiene historia clínica abierta: hay que admitirlo en el sistema del
  hospital antes de registrar el consentimiento. El flujo no puede crear el
  folio, sólo lo reporta.
- **La plantilla no está en `/plantillas-consentimiento`** con el nombre que
  manda `nombre_consentimiento` (`VENOPUNCION`, `GLUCOSA`, …).

## Pendientes conocidos

- La composición firma + huella se arma en JavaScript puro. Si el sandbox de
  n8n no deja usar `zlib`, el PNG sale sin comprimir (~260 kB); con `zlib`,
  unas decenas de kB. Se hace sólo cuando hay huella *y* ambas son PNG; ante
  cualquier fallo se manda la firma sola.
- No está verificado si la API acepta `image/png` en `hcpacfir` o espera PDF.
  El flujo anterior mandaba `application/pdf` en ese campo, pero era el PDF
  vacío de relleno, así que no prueba nada.
