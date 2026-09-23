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

## Qué cambia (es SU mismo código, sólo con bloques `// ── CORRECCIÓN`)

Se conserva todo lo que ya tenían los nodos (el motor de composición
`buildImagenUnificada`, el `pdfVacio` de respaldo del acudiente, la salida
`data rep`). Las correcciones insertadas:

1. Leer `huella paciente` con try/catch: en la rama "Sin huella" ese nodo no
   corre y leerlo directo tumbaba el nodo.
2. Exigir que el binario descargado traiga contenido de verdad.
3. Si no hay binario, decodificar el `data:image/png;base64,...` que manda la
   app cuando le falla la subida a Storage (la causa de las ejecuciones rojas).
4. Sin firma: error con mensaje claro en vez de dejar reventar el POST.
5. Sólo componer cuando HAY huella; sin huella la firma va tal cual (lo mismo
   que hacía la rama "Sin huella" original). Si la composición falla, se manda
   la firma sola.
6. En la rama del acudiente, `hcpacfir` lleva la firma del paciente cuando
   viene en el webhook (antes iba SIEMPRE el PDF vacío, aunque la firma
   llegara).

Probado en simulador: 11/11 escenarios (data URI, URL descargada, con y sin
huella, sin firma, rama del acudiente).
