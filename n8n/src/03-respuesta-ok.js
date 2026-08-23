// ── Nodo "Respuesta Exitosa" (Code · Run Once for All Items) ──────────────────
// Devuelve a la app (edge function `enviar-consentimiento`) el resultado real de
// la carga. Antes el webhook respondía "Workflow was started" antes de intentar
// nada, así que un fallo en la API del hospital era invisible para el sistema.

const datos = $('Construir Binarios').first().json;
const respuestaApi = $input.first().json ?? {};

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
    firma_paciente: datos.firma_paciente_disponible,
    firma_acudiente: datos.firma_acudiente_disponible,
    huella_incluida: datos.huella_disponible,
    composicion_firma_huella: datos.composicion_firma_huella,
    origen_firma_paciente: datos.origen_firma_paciente,
    firma_paciente_bytes: datos.firma_paciente_bytes,
    entrada: datos.diagnostico_entrada,
    medico_oid: datos.medico_oid,
    plantilla_oid: datos.plantilla_oid,
    consentimiento_oid: oidCreado,
    respuesta_api: respuestaApi,
  },
}];
