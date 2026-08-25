// ── Nodo "Respuesta Con Error" (Code · Run Once for All Items) ────────────────
// Se ejecuta cuando la validación previa falla, cuando no se pudo descargar una
// firma, o cuando la API del hospital rechaza la carga. Responde 422 con el
// motivo, en vez de fallar en silencio o guardar un consentimiento sin firma.

// OJO al editar: los nombres de nodo se escriben SIEMPRE como `$('Nombre')`
// literal, nunca en una variable ni como argumento de una función. Al importar,
// n8n renombra los nodos si ya existe otro con ese nombre ("Buscar Medico" ->
// "Buscar Medico2") y reescribe las llamadas `$('...')` que encuentre — pero no
// toca un nombre que viaje como cadena suelta. Cuando eso pasaba, el lookup
// fallaba y este nodo inventaba un "no se encontró el médico" que no era cierto.
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
const entrada = $input.first().json ?? {};

const medico = oidDe(() => $('Buscar Medico').first().json);
const plantilla = oidDe(() => $('Buscar Plantilla').first().json);

const errores = Array.isArray(datos.errores) ? [...datos.errores] : [];

// Sólo se acusa de "no encontrado" si la búsqueda SÍ se ejecutó y vino vacía.
// Si el nodo no se pudo consultar es otro problema, y decirlo así ahorra horas.
if (medico.encontrado && !medico.oid) {
  errores.push(`No se encontró el médico "${datos.profesional_nombre_completo}" en /medicos`);
} else if (!medico.encontrado) {
  errores.push('No se pudo leer la respuesta del nodo "Buscar Medico" (¿lo renombró n8n al importar?)');
}
if (plantilla.encontrado && !plantilla.oid) {
  errores.push(`No se encontró la plantilla "${datos.nombre_consentimiento}" en /plantillas-consentimiento`);
} else if (!plantilla.encontrado) {
  errores.push('No se pudo leer la respuesta del nodo "Buscar Plantilla" (¿lo renombró n8n al importar?)');
}

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
      medico_oid: medico.oid,
      plantilla_oid: plantilla.oid,
      url_firma_paciente: datos.url_firma_paciente,
      url_firma_acudiente: datos.url_firma_acudiente,
      entrada: datos.diagnostico_entrada,
    },
  },
}];
