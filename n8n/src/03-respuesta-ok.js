// ── Nodo "Respuesta Exitosa" (Code · Run Once for All Items) ──────────────────
// Devuelve a la app (edge function `enviar-consentimiento`) el resultado real de
// la carga. Antes el webhook respondía "Workflow was started" antes de intentar
// nada, así que un fallo en la API del hospital era invisible para el sistema.

// OJO al editar: los nombres de nodo se escriben SIEMPRE como `$('Nombre')`
// literal, nunca en una variable ni como argumento de una función. Al importar,
// n8n renombra los nodos si ya existe otro con ese nombre ("Buscar Medico" ->
// "Buscar Medico2") y reescribe las llamadas `$('...')` que encuentre — pero no
// toca un nombre que viaje como cadena suelta, y ese lookup queda roto.
function oidDe(buscar) {
  try {
    const res = buscar();
    const lista = res?.data || res?.results || (Array.isArray(res) ? res : []);
    return { encontrado: true, oid: lista && lista.length > 0 ? (lista[0].oid ?? null) : null };
  } catch (e) {
    return { encontrado: false, oid: null }; // el nodo no existe o no se ejecutó
  }
}

const datos = $('Preparar Datos').first().json;
const respuestaApi = $input.first().json ?? {};

const medico = oidDe(() => $('Buscar Medico').first().json);
const plantilla = oidDe(() => $('Buscar Plantilla').first().json);

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
    medico_oid: medico.oid,
    plantilla_oid: plantilla.oid,
    consentimiento_oid: oidCreado,
    respuesta_api: respuestaApi,
  },
}];
