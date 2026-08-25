// ── Nodo "Respuesta Exitosa" (Code · Run Once for All Items) ──────────────────
// Devuelve a la app (edge function `enviar-consentimiento`) el resultado real de
// la carga. Antes el webhook respondía "Workflow was started" antes de intentar
// nada, así que un fallo en la API del hospital era invisible para el sistema.

const datos = $('Preparar Datos').first().json;
const respuestaApi = $input.first().json ?? {};

function primerOid(nombreNodo) {
  try {
    const res = $(nombreNodo).first().json;
    const lista = res?.data || res?.results || (Array.isArray(res) ? res : []);
    return lista && lista.length > 0 ? (lista[0].oid ?? null) : null;
  } catch (e) {
    return null;
  }
}

const oidCreado = respuestaApi?.data?.oid
  ?? respuestaApi?.oid
  ?? (Array.isArray(respuestaApi?.data) ? respuestaApi.data[0]?.oid : null)
  ?? null;

return [{
  json: {
    success: true,
    mensaje: 'Consentimiento cargado en la historia clínica',
    consent_id: datos.consent_id,
    paciente_numero_documento: datos.paciente_numero_documento,
    nombre_consentimiento: datos.nombre_consentimiento,
    modo_firma: datos.modo,
    medico_oid: primerOid('Buscar Medico'),
    plantilla_oid: primerOid('Buscar Plantilla'),
    consentimiento_oid: oidCreado,
    respuesta_api: respuestaApi,
  },
}];
