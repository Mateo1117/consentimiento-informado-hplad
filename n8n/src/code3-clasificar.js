// ── Nodo "Clasificar Imagenes" (Code · Run Once for All Items) ────────────────
// Primer nodo después del webhook. Mira qué llegó realmente en cada imagen y
// deja decidido:
//
//   · tipo_firmante        -> 1 acudiente, 2 paciente (campo hcatipaut)
//   · url_*                -> SÓLO si la imagen vino como http(s). Los nodos de
//                             descarga usan estas URLs; si están vacías el nodo
//                             falla a propósito y "Armar Binarios" recupera
//                             la imagen del propio webhook.
//   · tiene_*              -> hay imagen, venga como URL o como data URI
//
// El motivo de separar "url" de "tiene": la app a veces sube la firma a Storage
// y manda una URL, y a veces (cuando la subida falla) manda el data URI dentro
// del JSON. Un nodo HTTP Request no puede resolver "data:image/png;base64,...",
// así que ese caso hay que decodificarlo a mano más adelante.

const entrada = $input.first().json || {};

let body = entrada.body !== undefined ? entrada.body : entrada;
if (typeof body === 'string') {
  try { body = JSON.parse(body); } catch (e) { /* se queda como texto */ }
}
if (!body || typeof body !== 'object') body = {};

function clasificar(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto || texto === 'null' || texto === 'undefined') {
    return { presente: false, tipo: 'ausente', url: '' };
  }
  if (/^https?:\/\//i.test(texto)) {
    return { presente: true, tipo: 'url', url: texto };
  }
  if (/^data:/i.test(texto)) {
    return { presente: true, tipo: 'data_uri', url: '' };
  }
  if (texto.length > 100 && /^[A-Za-z0-9+/\s]+={0,2}$/.test(texto)) {
    return { presente: true, tipo: 'base64_sin_encabezado', url: '' };
  }
  return { presente: false, tipo: 'texto_no_reconocido', url: '' };
}

const firmaPaciente = clasificar(body.paciente_firma);
const firmaAcudiente = clasificar(body.acudiente_firma);
const huella = clasificar(body.paciente_foto);

// Quién firma: si hay acudiente manda el acudiente.
const tipoFirmante = firmaAcudiente.presente ? 1 : 2;

return [{
  json: {
    tipo_firmante: tipoFirmante,
    descripcion_firmante: tipoFirmante === 1 ? 'acudiente' : 'paciente',

    url_firma_paciente: firmaPaciente.url,
    url_firma_acudiente: firmaAcudiente.url,
    url_huella: huella.url,

    tiene_firma_paciente: firmaPaciente.presente,
    tiene_firma_acudiente: firmaAcudiente.presente,
    tiene_huella: huella.presente,

    // Para ver de un vistazo en la respuesta qué mandó la app.
    diagnostico_entrada: {
      claves_body: Object.keys(body),
      firma_paciente: firmaPaciente.tipo,
      firma_acudiente: firmaAcudiente.tipo,
      huella: huella.tipo,
      profesional_nombre_completo: body.profesional_nombre_completo || null,
      profesional_documento: body.profesional_documento || null,
      nombre_consentimiento: body.nombre_consentimiento || null,
    },
  },
}];
