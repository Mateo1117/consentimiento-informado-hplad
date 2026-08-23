// ── Nodo "Respuesta Con Error" (Code · Run Once for All Items) ────────────────
// Se ejecuta cuando la validación previa falla o cuando la API del hospital
// rechaza la carga. Responde 422 con el motivo, en vez de fallar en silencio.

const datos = $('Construir Binarios').first().json;
const entrada = $input.first().json ?? {};

const erroresValidacion = Array.isArray(datos.errores) ? datos.errores : [];
const errorApi = entrada?.error?.message || entrada?.message || entrada?.error || null;

const errores = erroresValidacion.length > 0
  ? erroresValidacion
  : [errorApi || 'La API de historia clínica rechazó el consentimiento'];

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
      medico_oid: datos.medico_oid,
      plantilla_oid: datos.plantilla_oid,
      firma_paciente: datos.firma_paciente_disponible,
      firma_acudiente: datos.firma_acudiente_disponible,
      huella: datos.huella_disponible,
      modo: datos.modo,
      // De dónde salió cada imagen (o por qué no salió): evita tener que abrir
      // nodo por nodo en el editor para saber dónde se perdió la firma.
      origen_firma_paciente: datos.origen_firma_paciente,
      origen_firma_acudiente: datos.origen_firma_acudiente,
      origen_huella_paciente: datos.origen_huella_paciente,
      firma_paciente_bytes: datos.firma_paciente_bytes,
      entrada: datos.diagnostico_entrada,
    },
  },
}];
