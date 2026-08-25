#!/usr/bin/env node
// Verifica el flujo sin desplegar en n8n ni tocar la API del hospital:
//   1. Ejecuta los nodos Code con payloads reales.
//   2. Valida el grafo del workflow generado (conexiones, binarios, referencias).
//
//   node n8n/test-flujo.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const code = (f) => readFileSync(join(aqui, 'src', f), 'utf8');
const wf = JSON.parse(readFileSync(join(aqui, 'crear-consentimiento.workflow.json'), 'utf8'));

// ── Motor mínimo de nodos Code ───────────────────────────────────────────────
function ejecutar(archivo, items, nodos) {
  const $input = { first: () => items[0], all: () => items, item: items[0] };
  const $ = (nombre) => {
    if (!(nombre in nodos)) throw new Error(`El nodo "${nombre}" no se ejecutó`);
    const v = nodos[nombre];
    if (v === null) throw new Error(`El nodo "${nombre}" falló`);
    return { first: () => v, item: v, all: () => [v] };
  };
  return new Function('$input', '$', code(archivo))($input, $);
}

const URL_FIRMA = 'https://dbhamokkweyadibngphq.supabase.co/storage/v1/object/public/photos/29031127-4ee1/firma_paciente.png';
const URL_ACUD = 'https://dbhamokkweyadibngphq.supabase.co/storage/v1/object/public/photos/29031127-4ee1/firma_acudiente.png';
const DATA_URI = `data:image/png;base64,${'A'.repeat(500)}`;

const respuestaMedicos = { data: [{ oid: 4321, nombre: 'COLLAZOS QUINTERO KAREN SOFIA' }] };
const respuestaPlantillas = { data: [{ oid: 88, nombre: 'VENOPUNCION' }] };

function correr(nombreCaso, body, opciones = {}) {
  const nodos = {};
  const prep = ejecutar('01-preparar-datos.js', [{ json: { body } }], nodos)[0];
  nodos['Preparar Datos'] = prep;
  nodos['Buscar Medico'] = opciones.sinMedico ? { json: { data: [] } } : { json: respuestaMedicos };
  nodos['Buscar Plantilla'] = opciones.sinPlantilla ? { json: { data: [] } } : { json: respuestaPlantillas };

  const oidsOk = !opciones.sinMedico && !opciones.sinPlantilla;
  let final;
  if (prep.json.valido && oidsOk) {
    final = ejecutar('03-respuesta-ok.js', [{ json: { data: { oid: 99001 } } }], nodos)[0];
  } else {
    final = ejecutar('04-respuesta-error.js', [opciones.errorNodo ?? { json: {} }], nodos)[0];
  }

  console.log(`\n── ${nombreCaso}`);
  console.log(`   modo=${prep.json.modo} valido=${prep.json.valido} tipo_firmante=${prep.json.tipo_firmante}`);
  console.log(`   respuesta: success=${final.json.success}${final.json.errores ? ` errores=${JSON.stringify(final.json.errores)}` : ''}`);
  return { prep, final };
}

const base = {
  consent_id: 'f4f5b27f-c2aa-4f2a-bca2-762396ba8fb8',
  paciente_nombre_completo: 'FLOR MARINA AMORTEGUI OLARTE',
  paciente_tipo_documento: 'CC',
  paciente_numero_documento: '20878722',
  procedimiento_medico: 'Toma de Muestra por Venopunción',
  nombre_consentimiento: 'VENOPUNCION',
  aceptacion_procedimiento: 'Aceptado',
  fecha_documento: '2026-08-25',
  profesional_nombre_completo: 'COLLAZOS QUINTERO KAREN SOFIA',
  riesgos_situacion_clinica: 'Hipertensión',
  payload_adicional: { patientData: {}, decision: 'aprobar' },
};

const acud = {
  acudiente_nombre_completo: 'MARIA PEREZ',
  acudiente_documento: '123',
  acudiente_parentesco: 'MADRE',
};

const r1 = correr('Firma del paciente como URL (caso real)', { ...base, paciente_firma: URL_FIRMA });
const r2 = correr('Sólo acudiente (menor de edad)', { ...base, ...acud, acudiente_firma: URL_ACUD });
const r3 = correr('Paciente y acudiente', { ...base, ...acud, paciente_firma: URL_FIRMA, acudiente_firma: URL_ACUD });
const r4 = correr('Firma incrustada en base64 (Storage falló)', { ...base, paciente_firma: DATA_URI });
const r5 = correr('Sin firma alguna', { ...base });
const r6 = correr('Médico no encontrado', { ...base, paciente_firma: URL_FIRMA }, { sinMedico: true });
const r7 = correr('Procedimiento rechazado', { ...base, paciente_firma: URL_FIRMA, aceptacion_procedimiento: 'Rechazado' });
const r8 = correr('Body sin parsear (llega como cadena)', JSON.stringify({ ...base, paciente_firma: URL_FIRMA }));
const r9 = correr('Descarga fallida -> 422 con el motivo', { ...base, paciente_firma: URL_FIRMA },
  { sinMedico: true, errorNodo: { json: { error: { message: 'Request failed with status code 403' } } } });

// ── Resistencia al renombrado que hace n8n al importar ───────────────────────
// Si ya existe un nodo con ese nombre, n8n importa el nuevo como "Nombre2" y
// reescribe las llamadas $('Nombre') que encuentra — pero NO los nombres que
// viajan como cadena suelta. Aquí se simula ese renombrado y se comprueba que
// los nodos Code siguen funcionando.
function simularImportacionN8n(original) {
  const mapa = Object.fromEntries(original.nodes.map((n) => [n.name, `${n.name}2`]));
  let texto = JSON.stringify(original);
  for (const [viejo, nuevo] of Object.entries(mapa)) {
    texto = texto.split(`$('${viejo}')`).join(`$('${nuevo}')`);
  }
  const copia = JSON.parse(texto);
  copia.nodes.forEach((n) => { n.name = mapa[n.name] ?? n.name; });
  copia.connections = Object.fromEntries(Object.entries(copia.connections).map(([k, v]) => [
    mapa[k] ?? k,
    { main: v.main.map((s) => s.map((c) => ({ ...c, node: mapa[c.node] ?? c.node }))) },
  ]));
  return copia;
}

const renombrado = simularImportacionN8n(wf);
const jsDe = (w, nombre) => w.nodes.find((n) => n.name === nombre).parameters.jsCode;

function correrRenombrado(archivoNodo, entradaItem, nodosRenombrados) {
  const $input = { first: () => entradaItem, all: () => [entradaItem], item: entradaItem };
  const $ = (nombre) => {
    if (!(nombre in nodosRenombrados)) throw new Error(`El nodo "${nombre}" no se ejecutó`);
    const v = nodosRenombrados[nombre];
    return { first: () => v, item: v, all: () => [v] };
  };
  return new Function('$input', '$', jsDe(renombrado, archivoNodo))($input, $);
}

const nodosR = {
  'Preparar Datos2': { json: r1.prep.json },
  'Buscar Medico2': { json: respuestaMedicos },
  'Buscar Plantilla2': { json: respuestaPlantillas },
};
const okRenombrado = correrRenombrado('Respuesta Exitosa2', { json: { data: { oid: 99001 } } }, nodosR)[0];
const errRenombrado = correrRenombrado('Respuesta Con Error2', { json: {} }, nodosR)[0];

console.log('\n── Tras el renombrado de n8n (Nombre -> Nombre2)');
console.log(`   Respuesta Exitosa: medico_oid=${okRenombrado.json.medico_oid} plantilla_oid=${okRenombrado.json.plantilla_oid}`);
console.log(`   Respuesta Con Error: errores=${JSON.stringify(errRenombrado.json.errores)}`);

// Las líneas de comentario se descartan antes de analizar el código: ahí los
// $('Nombre') son sólo ejemplos.
const sinComentarios = (js) => js.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ── Validación del grafo ──────────────────────────────────────────────────────
const nombres = wf.nodes.map((n) => n.name);
const porNombre = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
const destinos = new Set();
const problemas = [];

for (const [origen, conexion] of Object.entries(wf.connections)) {
  if (!nombres.includes(origen)) problemas.push(`origen inexistente: ${origen}`);
  for (const salida of conexion.main) {
    for (const c of salida) {
      destinos.add(c.node);
      if (!nombres.includes(c.node)) problemas.push(`destino inexistente: ${c.node}`);
    }
  }
}
for (const n of nombres) {
  if (!destinos.has(n) && n !== 'Webhook Crear Consentimiento') problemas.push(`nodo huérfano: ${n}`);
}
if (nombres.length !== new Set(nombres).size) problemas.push('hay nombres de nodo duplicados');

// Ningún nodo Code puede citar un nombre de nodo como cadena suelta: n8n no lo
// reescribe al renombrar y el lookup queda roto en silencio.
for (const n of wf.nodes) {
  const js = n.parameters?.jsCode && sinComentarios(n.parameters.jsCode);
  if (!js) continue;
  for (const otro of nombres) {
    if (js.includes(`'${otro}'`) && !js.includes(`$('${otro}')`)) {
      problemas.push(`"${n.name}" cita '${otro}' como cadena suelta en vez de $('${otro}')`);
    }
  }
}

// Toda referencia $('Nodo') —en expresiones y en código— debe existir. Las
// líneas de comentario se descartan: ahí los $('Nombre') son sólo ejemplos.
const textoCompleto = JSON.stringify(wf);
const textoEjecutable = JSON.stringify({
  ...wf,
  nodes: wf.nodes.map((n) => (n.parameters?.jsCode
    ? { ...n, parameters: { ...n.parameters, jsCode: sinComentarios(n.parameters.jsCode) } }
    : n)),
});
for (const m of textoEjecutable.matchAll(/\$\('([^']+)'\)/g)) {
  if (!nombres.includes(m[1])) problemas.push(`referencia a nodo inexistente: $('${m[1]}')`);
}

// Cada binario que pide un POST tiene que producirlo alguna descarga de su rama.
const producidoPor = {};
for (const n of wf.nodes) {
  const prop = n.parameters?.options?.response?.response?.outputPropertyName;
  if (prop) (producidoPor[prop] ||= []).push(n.name);
}
function ramaLlegaCon(nodoPost, campo) {
  const visitados = new Set();
  const pendientes = [nodoPost];
  while (pendientes.length) {
    const actual = pendientes.pop();
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    if ((producidoPor[campo] || []).includes(actual)) return true;
    for (const [origen, conexion] of Object.entries(wf.connections)) {
      if (conexion.main.some((s) => s.some((c) => c.node === actual))) pendientes.push(origen);
    }
  }
  return false;
}
for (const n of wf.nodes) {
  for (const p of n.parameters?.bodyParameters?.parameters || []) {
    if (p.parameterType !== 'formBinaryData') continue;
    if (!ramaLlegaCon(n.name, p.inputDataFieldName)) {
      problemas.push(`"${n.name}" pide el binario ${p.inputDataFieldName} pero ninguna descarga de su rama lo produce`);
    }
  }
}

// ── Aserciones ────────────────────────────────────────────────────────────────
const checks = [
  ['1 URL de firma -> modo paciente y válido', r1.prep.json.modo === 'paciente' && r1.prep.json.valido && r1.final.json.success === true],
  ['1 tipo_firmante = 2', r1.prep.json.tipo_firmante === 2],
  ['1 estado aceptado = 1', r1.prep.json.estado === 1],
  ['2 sólo acudiente -> modo acudiente, tipo_firmante 1', r2.prep.json.modo === 'acudiente' && r2.prep.json.tipo_firmante === 1],
  ['3 ambas firmas -> modo ambas', r3.prep.json.modo === 'ambas' && r3.prep.json.valido],
  ['4 base64 incrustado no se da por bueno', r4.prep.json.modo === 'sin_firma' && r4.prep.json.valido === false],
  ['4 el 422 explica que Storage falló', /no la subió a Supabase Storage/.test(r4.final.json.errores.join(' '))],
  ['5 sin firma invalida', r5.prep.json.modo === 'sin_firma' && r5.final.json.success === false],
  ['6 médico faltante invalida', r6.final.json.success === false && /No se encontró el médico/.test(r6.final.json.errores.join(' '))],
  ['7 rechazo -> estado 0', r7.prep.json.estado === 0],
  ['8 body como cadena se parsea igual', r8.prep.json.modo === 'paciente' && r8.prep.json.paciente_numero_documento === '20878722'],
  ['9 el error del nodo llega al 422', /403/.test(r9.final.json.errores.join(' '))],
  ['grafo sin problemas', problemas.length === 0],
  ['ya no existe "Construir Binarios"', !textoCompleto.includes('Construir Binarios')],
  ['las descargas producen hcpacfir y hcrepfir', !!producidoPor.hcpacfir && !!producidoPor.hcrepfir],
  ['renombrado: los OIDs se siguen leyendo', okRenombrado.json.medico_oid === 4321 && okRenombrado.json.plantilla_oid === 88],
  ['renombrado: no inventa "médico no encontrado"', !errRenombrado.json.errores.some((e) => /No se encontró el médico/.test(e))],
  ['renombrado: no inventa "plantilla no encontrada"', !errRenombrado.json.errores.some((e) => /No se encontró la plantilla/.test(e))],
];

console.log('\n── Grafo');
console.log(`   ${wf.nodes.length} nodos, ${problemas.length} problemas${problemas.length ? `: ${problemas.join(' | ')}` : ''}`);

console.log('\n── Aserciones');
let fallos = 0;
for (const [n, ok] of checks) { console.log(`   ${ok ? '✓' : '✗'} ${n}`); if (!ok) fallos++; }
console.log(fallos === 0 ? '\nTODAS LAS ASERCIONES PASAN' : `\n${fallos} ASERCIONES FALLAN`);
process.exit(fallos === 0 ? 0 : 1);
