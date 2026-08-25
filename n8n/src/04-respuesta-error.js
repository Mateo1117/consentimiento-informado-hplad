// ── Nodo "Respuesta Con Error" (Code · Run Once for All Items) ────────────────
// Se ejecuta cuando la validación previa falla, cuando no se pudo descargar una
// firma, o cuando la API del hospital rechaza la carga. Responde 422 con el
// motivo, en vez de fallar en silencio o guardar un consentimiento sin firma.

const datos = $('Preparar Datos').first().json;
const entrada = $input.first().json ?? {};

function primerOid(nombreNodo) {
  try {
    const res = $(nombreNodo).first().json;
    const lista = res?.data || res?.results || (Array.isArray(res) ? res : []);
    return lista && lista.length > 0 ? (lista[0].oid ?? null) : null;
  } catch (e) {
    return null;
  }
}

const medicoOid = primerOid('Buscar Medico');
const plantillaOid = primerOid('Buscar Plantilla');

const errores = Array.isArray(datos.errores) ? [...datos.errores] : [];
if (!medicoOid) errores.push(`No se encontró el médico "${datos.profesional_nombre_completo}" en /medicos`);
if (!plantillaOid) errores.push(`No se encontró la plantilla "${datos.nombre_consentimiento}" en /plantillas-consentimiento`);

// Error que venga del nodo anterior (descarga fallida o rechazo de la API).
const errorNodo = entrada?.error?.message || entrada?.message
  || (typeof entrada?.error === 'string' ? entrada.error : null);
if (errorNodo) errores.push(errorNodo);

if (errores.length === 0) errores.push('La API de historia clínica rechazó el consentimiento');

return [{
  json: {
    success: false,
    mensaje: 'No se pudo cargar el consentimiento',
    errores,
    consent_id: datos.consent_id,
    paciente_nombre_completo: datos.paciente_nombre_completo,
    paciente_numero_documento: datos.paciente_numero_documento,
    nombre_consentimiento: datos.nombre_consentimiento,
    profesional_nombre_completo: datos.profesional_nombre_completo,
    diagnostico: {
      modo: datos.modo,
      medico_oid: medicoOid,
      plantilla_oid: plantillaOid,
      url_firma_paciente: datos.url_firma_paciente,
      url_firma_acudiente: datos.url_firma_acudiente,
      entrada: datos.diagnostico_entrada,
    },
  },
}];
