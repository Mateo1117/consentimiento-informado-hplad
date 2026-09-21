# Parche del flujo original (FLUJO APIS MESA)

Arregla, **sin importar nada**, las ejecuciones que fallan con
`Invalid URL: data:image/png;base64,...` seguido de
`This operation expects the node's input data to contain a binary file 'data'`.

La causa: la app manda la firma como URL de Storage o, cuando esa subida
falla, como `data:image/png;base64,...`. El nodo `firma paciente` no puede
descargar el esquema `data:` y el POST llega sin binario. Además la salida
"Sin huella" del Switch va directa al POST, sin nadie que arme el binario.

## Pasos (en el workflow activo, sin importar JSON)

1. Abrir el nodo **Code in JavaScript1** → borrar su código → pegar completo
   `Code-in-JavaScript1.js`.
2. Abrir el nodo **Code in JavaScript2** → borrar su código → pegar completo
   `Code-in-JavaScript2.js`.
3. **Mover una conexión:** la salida **"Sin huella"** del `Switch` debe ir a
   **`Code in JavaScript1`** (arrastrar la flecha que hoy va directa a
   `Crear Consentimiento2`). La salida "Con huella" queda como está
   (`huella paciente` → `Code in JavaScript1`).
4. En el nodo **`firma paciente`**: Options → Response → **Response Format =
   File** (property name `data`). Si ya está, no tocar.
5. Conectar **`Crear Consentimiento3` → `Responder OK`** (hoy la rama del
   acudiente termina sin responderle a la app).
6. Guardar. No hay que desactivar ni reimportar nada.

## Qué cambia

- La firma en `data:image/png;base64,...` se decodifica dentro del Code node.
- Los binarios guardados en disco/S3 (`data` vacío + `id`) se resuelven.
- Si la imagen vino como URL y el nodo de descarga no corrió o quedó mal
  configurado, el Code node la descarga directamente como último recurso.
- Con huella: se compone firma+huella en un PNG gris liviano; si algo falla,
  se manda la firma sola (nunca se pierde la firma).
- Se eliminan los PDF vacíos "Sin informacion": si no hay firma real, la
  ejecución falla con un mensaje que dice exactamente qué llegó, en vez de
  registrar un consentimiento con una firma falsa.

Probado con `node <scratchpad>/probar-parche.mjs`: 12/12 escenarios
(data URI, URL descargada, binario en disco, descarga directa, composición
con huella, sin firma, y la rama del acudiente completa).
