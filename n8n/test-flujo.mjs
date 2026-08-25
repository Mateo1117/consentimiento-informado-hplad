// Pruebas del flujo n8n sin necesidad de n8n.
//
//   node n8n/build-workflow.mjs && node n8n/test-flujo.mjs
//
// Ejecuta el código de los nodos Code dentro de un n8n simulado (con $(), $input
// y this.helpers) y revisa el grafo del JSON generado.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const aqui = dirname(fileURLToPath(import.meta.url));
const workflow = JSON.parse(readFileSync(join(aqui, 'crear-consentimiento.workflow.json'), 'utf8'));
const porNombre = Object.fromEntries(workflow.nodes.map((n) => [n.name, n]));

let fallos = 0;
let pruebas = 0;
const afirmar = (cond, texto) => {
  pruebas += 1;
  if (!cond) { fallos += 1; console.error(`  ✗ ${texto}`); } else { console.log(`  ✓ ${texto}`); }
};

// ── n8n simulado ─────────────────────────────────────────────────────────────
function ejecutar(nombreNodo, { nodos, entrada }) {
  const jsCode = porNombre[nombreNodo].parameters.jsCode;

  const item = (n) => {
    if (!(n in nodos)) throw new Error(`El nodo "${n}" no se ejecutó`);
    return nodos[n];
  };
  const acceso = (n) => ({
    first: () => item(n),
    last: () => item(n),
    all: () => [item(n)],
    get item() { return item(n); },
  });

  const contexto = {
    $: acceso,
    $input: {
      first: () => entrada,
      last: () => entrada,
      all: () => [entrada],
      item: entrada,
    },
    helpers: {
      // n8n con binarios en disco: `data` viene vacío y hay que resolver el id.
      binaryToBuffer: async (bin) => Buffer.from(bin.__contenido || '', 'base64'),
    },
  };

  const fn = new Function('$', '$input', `return (async function () {\n${jsCode}\n});`)(
    contexto.$, contexto.$input,
  );
  return fn.call({ helpers: contexto.helpers });
}

// ── Utilidades de imagen para las pruebas ────────────────────────────────────
function crc32(buf) {
  const tabla = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    tabla.push(c);
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = tabla[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngDePrueba(ancho, alto) {
  const u32 = (n) => Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
  const chunk = (tipo, datos) => {
    const t = Buffer.from(tipo, 'ascii');
    return Buffer.concat([u32(datos.length), t, datos, u32(crc32(Buffer.concat([t, datos])))]);
  };
  const filas = Buffer.alloc(alto * (ancho * 3 + 1));
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = y * (ancho * 3 + 1) + 1 + x * 3;
      const v = (x + y) % 2 === 0 ? 20 : 240;
      filas[i] = v; filas[i + 1] = v; filas[i + 2] = v;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', Buffer.concat([u32(ancho), u32(alto), Buffer.from([8, 2, 0, 0, 0])])),
    chunk('IDAT', deflateSync(filas, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PNG_FIRMA = pngDePrueba(240, 90);
const PNG_HUELLA = pngDePrueba(120, 160);
const DATA_URI_FIRMA = `data:image/png;base64,${PNG_FIRMA.toString('base64')}`;

const bodyBase = {
  paciente_numero_documento: '20878722',
  paciente_tipo_documento: 'CC',
  procedimiento_medico: 'Venopunción',
  nombre_consentimiento: 'VENOPUNCION',
  fecha_documento: '2026-08-25',
  riesgos_situacion_clinica: 'Hipertensión',
  aceptacion_procedimiento: 'Aceptado',
  profesional_nombre_completo: 'COLLAZOS QUINTERO KAREN SOFIA',
  acudiente_nombre_completo: null,
  acudiente_documento: null,
  acudiente_parentesco: null,
  paciente_firma: null,
  acudiente_firma: null,
  paciente_foto: null,
};

const binDescargado = (contenido) => ({
  data: contenido.toString('base64'),
  mimeType: 'image/png',
  fileName: 'descarga.png',
  fileExtension: 'png',
});

async function correr(body, {
  descargaFirma, descargaAcudiente, descargaHuella,
  medicos = { data: [{ oid: 4321 }] },
  plantillas = { data: [{ oid: 99 }] },
} = {}) {
  const wh = { json: { body } };
  const clasif = (await ejecutar('Code in JavaScript3', { nodos: { wh }, entrada: wh }))[0];
  const estado = (await ejecutar('Code in JavaScript', { nodos: { wh }, entrada: clasif }))[0];

  const nodos = {
    wh,
    'Code in JavaScript3': clasif,
    'Code in JavaScript': estado,
    Medicos: { json: medicos },
    'Plantilla Consentimiento2': { json: plantillas },
  };
  if (descargaFirma) nodos['firma paciente'] = { json: {}, binary: { data: descargaFirma } };
  if (descargaAcudiente) nodos['firma acudiente'] = { json: {}, binary: { 'data rep': descargaAcudiente } };
  if (descargaHuella) nodos['huella paciente'] = { json: {}, binary: { data: descargaHuella } };

  const bin = (await ejecutar('Code in JavaScript1', {
    nodos, entrada: nodos['huella paciente'] || { json: {} },
  }))[0];

  return { clasif, estado, bin, nodos: { ...nodos, 'Code in JavaScript1': bin } };
}

const respuesta = (contexto, entrada) =>
  ejecutar('Code in JavaScript2', { nodos: contexto.nodos, entrada }).then((r) => r[0]);

// ── Escenarios ───────────────────────────────────────────────────────────────
console.log('\n1) Firma del paciente como URL de Storage (la descarga el nodo HTTP)');
{
  const body = { ...bodyBase, paciente_firma: 'https://storage.supabase.co/firma.png' };
  const r = await correr(body, { descargaFirma: binDescargado(PNG_FIRMA) });
  afirmar(r.clasif.json.url_firma_paciente === body.paciente_firma, 'la URL llega al nodo de descarga');
  afirmar(r.bin.json.ok === true, 'el item queda válido');
  afirmar(!!r.bin.binary.data, 'hcpacfir lleva binario');
  afirmar(r.bin.json.diagnostico.firma_paciente === 'descarga', 'la firma vino de la descarga');
  afirmar(!r.bin.binary['data rep'], 'sin acudiente no se manda hcrepfir');
}

console.log('\n2) Firma del paciente como data URI (falló la subida a Storage)');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA };
  const r = await correr(body);
  afirmar(r.clasif.json.url_firma_paciente === '', 'no se intenta descargar un data URI');
  afirmar(r.clasif.json.tiene_firma_paciente === true, 'aun así se reconoce la firma');
  afirmar(r.bin.json.ok === true, 'el item queda válido');
  afirmar(r.bin.binary.data.data === PNG_FIRMA.toString('base64'), 'el PNG se recupera intacto del webhook');
  afirmar(r.bin.json.diagnostico.firma_paciente === 'webhook_data_uri', 'el diagnóstico dice de dónde salió');
}

console.log('\n3) Firma de acudiente');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA, acudiente_firma: DATA_URI_FIRMA, acudiente_nombre_completo: 'ANA PEREZ' };
  const r = await correr(body);
  afirmar(r.clasif.json.tipo_firmante === 1, 'hcatipaut = 1 (acudiente)');
  afirmar(r.bin.json.con_acudiente === true, 'el Switch irá a "Con acudiente"');
  afirmar(!!r.bin.binary['data rep'], 'hcrepfir lleva la firma del acudiente');
  afirmar(!!r.bin.binary.data, 'hcpacfir sigue llevando la del paciente');
}

console.log('\n4) Sin ninguna firma');
{
  const r = await correr({ ...bodyBase });
  afirmar(r.bin.json.ok === false, 'no se llama a la API');
  afirmar(r.bin.json.errores.some((e) => e.includes('firma del paciente')), 'el error lo explica');
  afirmar(Object.keys(r.bin.binary).length === 0, 'no se inventa ningún binario de relleno');
}

console.log('\n5) El profesional no existe en /medicos');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA, profesional_nombre_completo: 'MATEO LOPEZ' };
  const r = await correr(body, { medicos: { data: [] } });
  afirmar(r.bin.json.ok === false, 'no se manda el POST con genmedico vacío');
  afirmar(r.bin.json.errores.some((e) => e.includes('MATEO LOPEZ')), 'el error nombra al profesional');
}

console.log('\n6) La plantilla de consentimiento no existe');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA };
  const r = await correr(body, { plantillas: { data: [] } });
  afirmar(r.bin.json.ok === false, 'no se manda el POST');
  afirmar(r.bin.json.errores.some((e) => e.includes('VENOPUNCION')), 'el error nombra la plantilla');
}

console.log('\n7) Firma + huella se componen en una sola imagen');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA, paciente_foto: 'https://storage.supabase.co/huella.png' };
  const r = await correr(body, { descargaHuella: binDescargado(PNG_HUELLA) });
  afirmar(r.bin.json.diagnostico.composicion === 'ok', 'la composición se hace');
  const bytes = Buffer.from(r.bin.binary.data.data, 'base64');
  afirmar(bytes.slice(0, 8).toString('hex') === '89504e470d0a1a0a', 'el resultado es un PNG válido');
  afirmar(bytes.length < 300 * 1024, `la imagen compuesta pesa poco (${Math.round(bytes.length / 1024)} kB)`);
}

console.log('\n8) Binarios guardados en disco (N8N_DEFAULT_BINARY_DATA_MODE=filesystem)');
{
  const body = { ...bodyBase, paciente_firma: 'https://storage.supabase.co/firma.png' };
  const enDisco = { data: '', id: 'filesystem:abc', mimeType: 'image/png', __contenido: PNG_FIRMA.toString('base64') };
  const r = await correr(body, { descargaFirma: enDisco });
  afirmar(r.bin.json.ok === true, 'la firma no se pierde');
  afirmar(r.bin.binary.data.data === PNG_FIRMA.toString('base64'), 'se resuelve la referencia al fichero');
}

console.log('\n9) Respuesta al webhook');
{
  const body = { ...bodyBase, paciente_firma: DATA_URI_FIRMA };
  const ctx = await correr(body);
  const ok = await respuesta(ctx, { json: { oid: 5, hcnfolio: 12 } });
  afirmar(ok.json.ok === true, 'éxito → ok true');
  afirmar(ok.json.respuesta_api.oid === 5, 'se devuelve lo que respondió el hospital');

  const fallo = await respuesta(ctx, { json: { error: 'No se encontró un folio (HCNFOLIO) para el paciente' } });
  afirmar(fallo.json.ok === false, 'un 4xx del hospital → ok false');
  afirmar(fallo.json.errores.some((e) => e.includes('HCNFOLIO')), 'el motivo del hospital llega a la app');
}

console.log('\n10) Rama de error del Switch (nunca se llamó a la API)');
{
  const ctx = await correr({ ...bodyBase });
  const r = await respuesta(ctx, ctx.bin);
  afirmar(r.json.ok === false, 'ok false');
  afirmar(r.json.errores.length > 0, 'se explican los motivos');
  afirmar(r.json.respuesta_api === null, 'no se inventa respuesta de la API');
}

// ── Revisión del grafo ───────────────────────────────────────────────────────
console.log('\n11) Grafo del workflow');
{
  const problemas = [];
  const nombres = new Set(workflow.nodes.map((n) => n.name));

  afirmar(nombres.size === workflow.nodes.length, 'no hay nombres de nodo repetidos');

  const destinos = new Set();
  for (const [origen, conexion] of Object.entries(workflow.connections)) {
    if (!nombres.has(origen)) problemas.push(`conexión desde un nodo inexistente: ${origen}`);
    for (const salida of conexion.main) {
      for (const d of salida) {
        if (!nombres.has(d.node)) problemas.push(`${origen} apunta a un nodo inexistente: ${d.node}`);
        destinos.add(d.node);
      }
    }
  }
  for (const n of workflow.nodes) {
    if (n.type === 'n8n-nodes-base.webhook') continue;
    if (!destinos.has(n.name)) problemas.push(`nodo huérfano (nadie lo alimenta): ${n.name}`);
  }

  const sinComentarios = (js) => js.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

  // Toda referencia $('X') debe existir. Al importar, n8n reescribe estas
  // apariciones si renombra un nodo; por eso son seguras.
  const textoNodo = (n) => (n.parameters.jsCode ? sinComentarios(n.parameters.jsCode) : JSON.stringify(n.parameters));
  for (const n of workflow.nodes) {
    for (const m of textoNodo(n).matchAll(/\$\('([^']+)'\)/g)) {
      if (!nombres.has(m[1])) problemas.push(`${n.name} referencia un nodo inexistente: ${m[1]}`);
    }
  }

  // Un nombre de nodo pasado como texto suelto NO lo reescribe n8n al renombrar:
  // fue exactamente el fallo que dejaba el flujo roto tras importarlo.
  for (const n of workflow.nodes) {
    if (!n.parameters.jsCode) continue;
    const js = sinComentarios(n.parameters.jsCode);
    for (const otro of nombres) {
      if (otro === n.name) continue;
      if (js.includes(`'${otro}'`) && !js.includes(`$('${otro}')`)) {
        problemas.push(`${n.name} cita "${otro}" como texto suelto (n8n no lo reescribe al renombrar)`);
      }
    }
  }

  // Cada binario que sube un POST debe existir en su rama.
  const producidos = new Set(['data', 'data rep']);
  for (const n of workflow.nodes) {
    for (const p of n.parameters?.bodyParameters?.parameters || []) {
      if (p.parameterType !== 'formBinaryData') continue;
      if (!producidos.has(p.inputDataFieldName)) {
        problemas.push(`${n.name} sube "${p.inputDataFieldName}" pero nadie lo produce`);
      }
    }
  }

  for (const p of problemas) console.error(`  ✗ ${p}`);
  afirmar(problemas.length === 0, `sin problemas de grafo (${problemas.length})`);
}

console.log('\n12) Simulación del renombrado que hace n8n al importar');
{
  // Al importar sobre un workflow que ya tiene esos nombres, n8n añade "2" a
  // cada nodo y reescribe los $('Nombre') —también dentro del jsCode—.
  const copia = JSON.parse(JSON.stringify(workflow));
  let texto = JSON.stringify(copia);
  for (const n of workflow.nodes) texto = texto.split(`$('${n.name}')`).join(`$('${n.name}2')`);
  const renombrado = JSON.parse(texto);
  const nuevosNombres = new Set(workflow.nodes.map((n) => `${n.name}2`));

  const rotos = [];
  for (const n of renombrado.nodes) {
    const js = n.parameters.jsCode;
    if (!js) continue;
    for (const m of js.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').matchAll(/\$\('([^']+)'\)/g)) {
      if (!nuevosNombres.has(m[1])) rotos.push(`${n.name} quedó apuntando a ${m[1]}`);
    }
  }
  for (const r of rotos) console.error(`  ✗ ${r}`);
  afirmar(rotos.length === 0, 'el flujo sigue entero aunque n8n renombre los nodos');
}

console.log(`\n${fallos === 0 ? 'OK' : 'FALLOS'}: ${pruebas - fallos}/${pruebas} comprobaciones\n`);
process.exit(fallos === 0 ? 0 : 1);
