// ── Nodo "Preparar Datos" (Code · Run Once for All Items) ──────────────────────
// Normaliza el body del webhook y decide por qué rama va el consentimiento.
//
// No construye binarios: de eso se encargan los propios nodos de descarga, que
// ya sacan la firma como archivo (`hcpacfir` / `hcrepfir`) directamente desde la
// URL de Supabase Storage. Aquí sólo se prepara el terreno.

function leerBody() {
  const entrada = $input.first().json || {};
  let b = entrada.body !== undefined ? entrada.body : entrada;
  // Si el webhook no pudo parsear el JSON (Content-Type inesperado, raw body),
  // llega como cadena. Mejor intentarlo aquí que perder toda la carga.
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
    if (typeof v === 'string' && v.trim()) return { valor: v.trim(), clave };
  }
  return { valor: '', clave: '' };
}

// ── Aceptación del procedimiento ──────────────────────────────────────────────
const aceptacion = String(body.aceptacion_procedimiento || '').toLowerCase().trim();
const aceptado = aceptacion === 'aceptado' || aceptacion === 'aprobar' || aceptacion === 'aprobado';

// ── Clasificación de cada imagen ──────────────────────────────────────────────
// Sólo una URL http(s) es descargable. Un data URI base64 significa que
// PhotoService.uploadPhoto() falló en la app y mandó la imagen incrustada: el
// nodo HTTP Request no puede resolver el esquema `data:`, así que eso se
// reporta como error en vez de dejar que el consentimiento se guarde sin firma.
function clasificar(origen) {
  const v = origen.valor;
  if (!v) return { url: '', tipo: 'ausente', descargable: false, presente: false, campo: '' };
  if (/^https?:\/\//i.test(v)) {
    return { url: v, tipo: 'url', descargable: true, presente: true, campo: origen.clave };
  }
  if (/^data:/i.test(v)) {
    return { url: '', tipo: 'data_uri', descargable: false, presente: true, campo: origen.clave };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(v) && v.length > 100) {
    return { url: '', tipo: 'base64_sin_encabezado', descargable: false, presente: true, campo: origen.clave };
  }
  return { url: '', tipo: 'texto_no_reconocido', descargable: false, presente: true, campo: origen.clave };
}

const origenFirmaPaciente = primerValor([
  'paciente_firma', 'firma_paciente', 'patientSignature', 'firma',
  'payload_adicional.patientSignature',
]);
const origenFirmaAcudiente = primerValor([
  'acudiente_firma', 'firma_acudiente', 'guardianSignature',
  'payload_adicional.guardianSignature',
]);

const firmaPaciente = clasificar(origenFirmaPaciente);
const firmaAcudiente = clasificar(origenFirmaAcudiente);

// ── Modo: define a qué rama del Switch va el item ─────────────────────────────
// Se decide por firmas DESCARGABLES: una firma que no se puede bajar es como no
// tenerla, y así el error sale antes de tocar la historia clínica.
let modo;
if (firmaPaciente.descargable && firmaAcudiente.descargable) modo = 'ambas';
else if (firmaAcudiente.descargable) modo = 'acudiente';
else if (firmaPaciente.descargable) modo = 'paciente';
else modo = 'sin_firma';

// ── Quién firma: 1 = acudiente/responsable, 2 = paciente ──────────────────────
const tipoFirmante = firmaAcudiente.descargable ? 1 : 2;

// ── Errores detectables antes de llamar a la API ──────────────────────────────
const errores = [];
const paciente_numero_documento = body.paciente_numero_documento || '';
if (!paciente_numero_documento) errores.push('Falta el número de documento del paciente');

for (const [quien, f] of [['paciente', firmaPaciente], ['acudiente', firmaAcudiente]]) {
  if (f.presente && !f.descargable) {
    errores.push(
      `La firma del ${quien} llegó como ${f.tipo} en el campo "${f.campo}" en vez de como URL: ` +
      'la app no la subió a Supabase Storage (PhotoService.uploadPhoto falló).'
    );
  }
}
if (modo === 'sin_firma') errores.push('No hay ninguna firma descargable (ni del paciente ni del acudiente)');

return [{
  json: {
    consent_id: body.consent_id || '',

    // Paciente
    paciente_nombre_completo: body.paciente_nombre_completo || '',
    paciente_tipo_documento: body.paciente_tipo_documento || 'CC',
    paciente_numero_documento,

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

    // URLs que descargarán los nodos HTTP de cada rama
    url_firma_paciente: firmaPaciente.url,
    url_firma_acudiente: firmaAcudiente.url,

    // Ruta que tomará el Switch
    modo,

    // Diagnóstico: qué llegó de verdad, sin volcar la imagen
    diagnostico_entrada: {
      claves_body: Object.keys(body),
      firma_paciente: { campo: firmaPaciente.campo || null, tipo: firmaPaciente.tipo, descargable: firmaPaciente.descargable },
      firma_acudiente: { campo: firmaAcudiente.campo || null, tipo: firmaAcudiente.tipo, descargable: firmaAcudiente.descargable },
    },

    valido: errores.length === 0,
    errores,
  },
}];
