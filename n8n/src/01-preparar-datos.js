// ── Nodo "Preparar Datos" (Code · Run Once for All Items) ──────────────────────
// Normaliza el body del webhook antes de tocar la API del hospital.
//
// Corrige el problema raíz del flujo anterior: las firmas NO siempre son URLs.
// `appConsentService` intenta subirlas a Supabase Storage y enviar una URL, pero
// si esa subida falla envía el data URI base64 crudo. Un nodo HTTP Request no
// puede descargar `data:image/png;base64,...`, así que la firma se perdía.
// Aquí clasificamos cada imagen: URL http(s) -> se descarga después;
// data URI -> se decodifica ya mismo a binario.

function leerBody() {
  const entrada = $input.first().json || {};
  let b = entrada.body !== undefined ? entrada.body : entrada;
  // Si el webhook no pudo parsear el JSON (Content-Type raro, raw body), llega
  // como cadena. Mejor intentarlo aquí que perder toda la carga.
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch (e) { /* no era JSON */ }
  }
  return (b && typeof b === 'object') ? b : {};
}

const body = leerBody();

// Busca el primer campo con contenido entre varios nombres posibles. La app ha
// cambiado de nombre alguna vez y un nombre distinto no debe costar la firma.
function primerValor(claves) {
  for (const clave of claves) {
    const partes = clave.split('.');
    let v = body;
    for (const parte of partes) v = (v && typeof v === 'object') ? v[parte] : undefined;
    if (typeof v === 'string' && v.trim()) return { valor: v, clave };
  }
  return { valor: null, clave: '' };
}

// ── Aceptación del procedimiento ──────────────────────────────────────────────
const aceptacion = String(body.aceptacion_procedimiento || '').toLowerCase().trim();
const aceptado = aceptacion === 'aceptado' || aceptacion === 'aprobar' || aceptacion === 'aprobado';

// ── Clasificación de imágenes ─────────────────────────────────────────────────
// Devuelve { url, dataUri, mimeType, extension, presente }
function clasificarImagen(valor) {
  const vacio = { url: '', dataUri: '', mimeType: '', extension: '', presente: false };
  if (!valor || typeof valor !== 'string') return vacio;

  const v = valor.trim();
  if (!v) return vacio;

  if (/^https?:\/\//i.test(v)) {
    return { url: v, dataUri: '', mimeType: '', extension: '', presente: true };
  }

  const match = /^data:([^;,]+);base64,(.+)$/i.exec(v);
  if (match) {
    const mimeType = match[1];
    const extension = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
    return { url: '', dataUri: match[2], mimeType, extension, presente: true };
  }

  // Base64 pelado, sin encabezado data:
  if (/^[A-Za-z0-9+/=\s]+$/.test(v) && v.length > 100) {
    return { url: '', dataUri: v.replace(/\s+/g, ''), mimeType: 'image/png', extension: 'png', presente: true };
  }

  return vacio;
}

const origenFirmaPaciente = primerValor([
  'paciente_firma', 'firma_paciente', 'patientSignature', 'firma',
  'payload_adicional.patientSignature',
]);
const origenFirmaAcudiente = primerValor([
  'acudiente_firma', 'firma_acudiente', 'guardianSignature',
  'payload_adicional.guardianSignature',
]);
// La "huella" viaja en paciente_foto. OJO: payload_adicional.patientPhotoUrl NO
// existe nunca — sanitizeConsentPayload() la borra antes de enviar el webhook.
const origenHuella = primerValor([
  'paciente_foto', 'huella_paciente', 'patientPhotoUrl',
  'payload_adicional.patientPhotoUrl',
]);

const firmaPaciente = clasificarImagen(origenFirmaPaciente.valor);
const firmaAcudiente = clasificarImagen(origenFirmaAcudiente.valor);
const huellaPaciente = clasificarImagen(origenHuella.valor);

// ── Diagnóstico de lo que realmente llegó ─────────────────────────────────────
// Sin esto hay que ir abriendo nodos a ciegas cuando la firma no aparece. Nunca
// vuelca la imagen entera: sólo tipo, tamaño y los primeros caracteres.
function describir(origen, clasificada) {
  if (!origen.valor) return { encontrado_en: null, tipo: 'ausente', longitud: 0, muestra: '' };
  const v = origen.valor.trim();
  let tipo = 'texto_no_reconocido';
  if (clasificada.url) tipo = 'url';
  else if (/^data:/i.test(v)) tipo = 'data_uri';
  else if (clasificada.dataUri) tipo = 'base64_sin_encabezado';
  return {
    encontrado_en: origen.clave,
    tipo,
    longitud: v.length,
    muestra: v.slice(0, 80),
  };
}

// ── Quién firma: 1 = acudiente/responsable, 2 = paciente ──────────────────────
const tipoFirmante = firmaAcudiente.presente ? 1 : 2;

return [{
  json: {
    consent_id: body.consent_id || '',

    // Paciente
    paciente_nombre_completo: body.paciente_nombre_completo || '',
    paciente_tipo_documento: body.paciente_tipo_documento || 'CC',
    paciente_numero_documento: body.paciente_numero_documento || '',

    // Acudiente
    acudiente_nombre_completo: body.acudiente_nombre_completo || '',
    acudiente_documento: body.acudiente_documento || '',
    acudiente_parentesco: body.acudiente_parentesco || '',

    // Consentimiento
    nombre_consentimiento: body.nombre_consentimiento || '',
    procedimiento_medico: body.procedimiento_medico || body.tipo_procedimiento || '',
    riesgos_situacion_clinica: body.riesgos_situacion_clinica || '',
    fecha_documento: body.fecha_documento || new Date().toISOString().split('T')[0],

    // Profesional
    profesional_nombre_completo: body.profesional_nombre_completo || '',
    profesional_documento: body.profesional_documento || '',

    // Autorización (la API espera 1/0)
    estado: aceptado ? 1 : 0,
    descripcion_estado: aceptado ? 'aceptado' : 'rechazado',

    // Firmante
    tipo_firmante: tipoFirmante,
    descripcion_firmante: tipoFirmante === 1 ? 'acudiente' : 'paciente',

    // URLs a descargar (vacías si la imagen vino como data URI o no vino)
    url_firma_paciente: firmaPaciente.url,
    url_firma_acudiente: firmaAcudiente.url,
    url_huella_paciente: huellaPaciente.url,

    // Base64 crudo de las imágenes que ya venían embebidas.
    // Va también en el JSON, no sólo en `binary`, a propósito: cuando n8n corre
    // con N8N_DEFAULT_BINARY_DATA_MODE=filesystem (o s3) los binarios se
    // guardan en disco y `$('Preparar Datos').first().binary.x.data` vuelve
    // VACÍO (sólo trae `id`). Ese es el motivo por el que "Construir Binarios"
    // se quedaba sin firma aunque la firma sí venía en el webhook. Con el
    // base64 aquí, el paso siguiente siempre tiene de dónde reconstruirla.
    b64_firma_paciente: firmaPaciente.dataUri,
    mime_firma_paciente: firmaPaciente.mimeType,
    ext_firma_paciente: firmaPaciente.extension,

    b64_firma_acudiente: firmaAcudiente.dataUri,
    mime_firma_acudiente: firmaAcudiente.mimeType,
    ext_firma_acudiente: firmaAcudiente.extension,

    b64_huella_paciente: huellaPaciente.dataUri,
    mime_huella_paciente: huellaPaciente.mimeType,
    ext_huella_paciente: huellaPaciente.extension,

    // Qué llegó exactamente en el webhook, para diagnosticar sin abrir nodos.
    diagnostico_entrada: {
      claves_body: Object.keys(body),
      firma_paciente: describir(origenFirmaPaciente, firmaPaciente),
      firma_acudiente: describir(origenFirmaAcudiente, firmaAcudiente),
      huella_paciente: describir(origenHuella, huellaPaciente),
    },

    // Flags de presencia
    tiene_firma_paciente: firmaPaciente.presente,
    tiene_firma_acudiente: firmaAcudiente.presente,
    tiene_huella_paciente: huellaPaciente.presente,
  },
  // Las imágenes que llegaron como data URI ya quedan como binarios aquí.
  binary: {
    ...(firmaPaciente.dataUri && {
      firma_paciente_inline: {
        data: firmaPaciente.dataUri,
        mimeType: firmaPaciente.mimeType,
        fileName: `firma_paciente.${firmaPaciente.extension}`,
        fileExtension: firmaPaciente.extension,
      },
    }),
    ...(firmaAcudiente.dataUri && {
      firma_acudiente_inline: {
        data: firmaAcudiente.dataUri,
        mimeType: firmaAcudiente.mimeType,
        fileName: `firma_acudiente.${firmaAcudiente.extension}`,
        fileExtension: firmaAcudiente.extension,
      },
    }),
    ...(huellaPaciente.dataUri && {
      huella_paciente_inline: {
        data: huellaPaciente.dataUri,
        mimeType: huellaPaciente.mimeType,
        fileName: `huella_paciente.${huellaPaciente.extension}`,
        fileExtension: huellaPaciente.extension,
      },
    }),
  },
}];
