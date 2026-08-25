// ── Nodo "Code in JavaScript" (Code · Run Once for All Items) ─────────────────
// Traduce la decisión del paciente al 1/0 que espera la API del hospital en
// hcaautinf, hcaautoproc y hcaautent.

const body = $('wh').first().json.body || {};
const aceptacion = String(body.aceptacion_procedimiento || '').toLowerCase().trim();

const aceptado = aceptacion === 'aceptado' || aceptacion === 'aprobar' || aceptacion === 'aprobado';

return [{
  json: {
    estado: aceptado ? 1 : 0,
    descripcion: aceptado ? 'aceptado' : 'rechazado',
  },
}];
