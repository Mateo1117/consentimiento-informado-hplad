// ── Nodo "Code in JavaScript2" (Code · Run Once for All Items) ────────────────
// Único punto de salida: arma el cuerpo que "Responder OK" devuelve a la app.
// Recibe tres orígenes distintos:
//   · la respuesta de "Crear Consentimiento2" (sin acudiente)
//   · la respuesta de "Crear Consentimiento3" (con acudiente)
//   · la rama de error del Switch, cuando ni siquiera se intentó el POST
//
// Siempre responde con un `ok` explícito para que la app pueda distinguir
// "guardado" de "no guardado" sin tener que leer logs de n8n.

const construccion = $('Code in JavaScript1').first().json;
const entrada = $input.first().json || {};

// Un POST con onError=continueRegularOutput deja el fallo dentro del item.
const errorPost = entrada && entrada.error ? entrada.error : null;

const errores = Array.isArray(construccion.errores) ? construccion.errores.slice() : [];

let ok;
let respuestaApi = null;

if (!construccion.ok) {
  ok = false;
} else if (errorPost) {
  ok = false;
  const detalle = typeof errorPost === 'string' ? errorPost : (errorPost.message || JSON.stringify(errorPost));
  errores.push('El hospital rechazó el consentimiento: ' + detalle);

  // Causa operativa habitual, y no se entiende leyendo el mensaje crudo.
  if (detalle.includes('HCNFOLIO') || detalle.toLowerCase().includes('folio')) {
    errores.push(
      'El paciente existe en el hospital pero no tiene un folio de historia '
      + 'clínica abierto. Hay que admitirlo / abrirle el folio en el sistema del '
      + 'hospital antes de registrar el consentimiento.'
    );
  }
} else {
  ok = true;
  respuestaApi = entrada;
}

return [{
  json: {
    ok,
    mensaje: ok
      ? 'Consentimiento creado en la historia clínica'
      : 'No se pudo crear el consentimiento',
    errores,
    respuesta_api: respuestaApi,
    diagnostico: construccion.diagnostico,
  },
}];
