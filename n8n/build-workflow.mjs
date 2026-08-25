// Genera n8n/crear-consentimiento.workflow.json a partir de los nodos Code de
// n8n/src. Conserva los nombres de nodo del flujo original en producción
// ("wh", "Code in JavaScript3", "Medicos", ...) para que se pueda pegar encima
// del que ya existe sin renombrar nada.
//
//   node n8n/build-workflow.mjs
//   node n8n/test-flujo.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const codigo = (archivo) => readFileSync(join(aqui, 'src', archivo), 'utf8').trimEnd();

const API = 'http://190.145.223.146:99';

// Todas las referencias entre nodos se escriben como $('Nombre') literal: si al
// importar n8n renombra un nodo, reescribe esas apariciones (incluso dentro del
// jsCode). Un nombre pasado como texto suelto NO se reescribe.
const WH = "$('Recibir Consentimiento').first().json.body";
const CLASIF = "$('Clasificar Imagenes').first().json";
const ESTADO = "$('Estado Autorizacion').first().json";
const BIN = "$('Armar Binarios').first().json";

const nodo = (name, type, typeVersion, parameters, extra = {}) => ({
  parameters,
  type,
  typeVersion,
  position: extra.position || [0, 0],
  id: extra.id,
  name,
  ...Object.fromEntries(Object.entries(extra).filter(([k]) => !['position', 'id'].includes(k))),
});

const code = (name, archivo, position) =>
  nodo(name, 'n8n-nodes-base.code', 2, { jsCode: codigo(archivo) }, { position });

// Descarga de imagen. La URL llega vacía cuando la firma no vino como http(s):
// el nodo falla a propósito y "Code in JavaScript1" la recupera del webhook.
const descarga = (name, campoUrl, propiedad, position) =>
  nodo(
    name,
    'n8n-nodes-base.httpRequest',
    4.2,
    {
      url: `={{ ${CLASIF}.${campoUrl} }}`,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'n8n-image-downloader' },
          { name: 'Accept', value: 'image/*,*/*' },
        ],
      },
      options: {
        timeout: 20000,
        response: { response: { responseFormat: 'file', outputPropertyName: propiedad } },
      },
    },
    { position, alwaysOutputData: true, onError: 'continueRegularOutput' },
  );

const busqueda = (name, ruta, campoFiltro, extraQuery, position) =>
  nodo(
    name,
    'n8n-nodes-base.httpRequest',
    4.2,
    {
      url: `${API}${ruta}`,
      sendQuery: true,
      queryParameters: {
        parameters: [
          // trim: un espacio al final (pasa al digitar nombres) vacía la búsqueda
          { name: 'filtro', value: `={{ (${WH}.${campoFiltro} || '').trim() }}` },
          ...extraQuery,
        ],
      },
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
      options: { timeout: 20000 },
    },
    { position, alwaysOutputData: true, onError: 'continueRegularOutput' },
  );

// Campos de texto del multipart. Los del acudiente van con ?? '' porque llegan
// null cuando firma el propio paciente y un null se enviaría como "null".
const camposTexto = () => [
  { name: 'hcnplconsinf', value: `={{ ${BIN}.plantilla_oid }}` },
  { name: 'genmedico', value: `={{ ${BIN}.medico_oid }}` },
  { name: 'pacnumdoc', value: `={{ ${WH}.paciente_numero_documento }}` },
  { name: 'hcadetdoc', value: `={{ ${WH}.paciente_tipo_documento }}` },
  { name: 'hcaproced', value: `={{ ${WH}.procedimiento_medico }}` },
  { name: 'hccfecdoc', value: `={{ ${WH}.fecha_documento }}` },
  { name: 'hcarieind', value: `={{ ${WH}.riesgos_situacion_clinica ?? '' }}` },
  { name: 'hcaautinf', value: `={{ ${ESTADO}.estado }}` },
  { name: 'hcaautoproc', value: `={{ ${ESTADO}.estado }}` },
  { name: 'hcaautent', value: `={{ ${ESTADO}.estado }}` },
  { name: 'hcatipaut', value: `={{ ${CLASIF}.tipo_firmante }}` },
  { name: 'hcaresaut', value: `={{ ${WH}.acudiente_nombre_completo ?? '' }}` },
  { name: 'hcadocresaut', value: `={{ ${WH}.acudiente_documento ?? '' }}` },
  { name: 'hcaparent', value: `={{ ${WH}.acudiente_parentesco ?? '' }}` },
];

const crearConsentimiento = (name, conAcudiente, position) =>
  nodo(
    name,
    'n8n-nodes-base.httpRequest',
    4.2,
    {
      method: 'POST',
      url: `${API}/consentimientos`,
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          ...camposTexto(),
          { parameterType: 'formBinaryData', name: 'hcpacfir', inputDataFieldName: 'data' },
          ...(conAcudiente
            ? [{ parameterType: 'formBinaryData', name: 'hcrepfir', inputDataFieldName: 'data rep' }]
            : []),
        ],
      },
      options: { timeout: 60000 },
    },
    { position, alwaysOutputData: true, onError: 'continueRegularOutput' },
  );

// Los operadores booleanos de un solo valor no llevan rightValue: con
// validación estricta, un rightValue vacío no valida y la regla nunca encaja.
const condicionBooleana = (id, expresion, valor) => ({
  id,
  leftValue: `={{ ${expresion} }}`,
  operator: { type: 'boolean', operation: valor ? 'true' : 'false', singleValue: true },
});

const condicionTexto = (id, expresion, valor) => ({
  id,
  leftValue: `={{ ${expresion} }}`,
  rightValue: valor,
  operator: { type: 'string', operation: 'equals' },
});

const opcionesCondicion = {
  caseSensitive: true,
  leftValue: '',
  typeValidation: 'loose',
  version: 2,
};

const regla = (outputKey, condiciones) => ({
  conditions: { options: opcionesCondicion, conditions: condiciones, combinator: 'and' },
  renameOutput: true,
  outputKey,
});

const nodes = [
  nodo(
    'Recibir Consentimiento',
    'n8n-nodes-base.webhook',
    2.1,
    { httpMethod: 'POST', path: 'crear_consentimiento', responseMode: 'responseNode', options: {} },
    // Sin webhookId fijo: el viejo sigue vivo en la instancia y chocarían.
    { position: [-620, 40] },
  ),

  code('Clasificar Imagenes', 'code3-clasificar.js', [-420, 40]),
  code('Estado Autorizacion', 'code-estado.js', [-220, 40]),

  busqueda('Consultar Medicos', '/medicos', 'profesional_nombre_completo', [{ name: 'limit', value: '100' }], [-20, 40]),
  busqueda('Consultar Plantillas', '/plantillas-consentimiento', 'nombre_consentimiento', [], [180, 40]),

  // ¿Hay firma de acudiente? Sólo entonces se intenta descargarla.
  nodo(
    'Hay Acudiente',
    'n8n-nodes-base.if',
    2.2,
    {
      conditions: {
        options: opcionesCondicion,
        conditions: [
          condicionBooleana('99260089-f874-4605-a5fb-735154a3ef60', `${CLASIF}.tiene_firma_acudiente`, true),
        ],
        combinator: 'and',
      },
      looseTypeValidation: true,
      options: {},
    },
    { position: [380, 0] },
  ),

  descarga('Bajar Firma Acudiente', 'url_firma_acudiente', 'data rep', [580, -80]),
  descarga('Bajar Firma Paciente', 'url_firma_paciente', 'data', [780, 40]),
  descarga('Bajar Huella', 'url_huella', 'data', [980, 40]),

  code('Armar Binarios', 'code1-binarios.js', [1180, 40]),

  // Reparto final: error / con acudiente / sin acudiente.
  // Se compara el texto `ruta` en vez de dos booleanos: n8n importa el Switch
  // con typeValidation "strict" y ahí una condición booleana sin rightValue
  // válido no encaja, así que TODO se iba al fallback (la rama de error).
  nodo(
    'Decidir Envio',
    'n8n-nodes-base.switch',
    3.2,
    {
      rules: {
        values: [
          regla('Con error', [
            condicionTexto('b176c321-1a52-42e1-9206-20d05a6197a0', '$json.ruta', 'error'),
          ]),
          regla('Con acudiente', [
            condicionTexto('11d0b6e6-4621-4964-8d00-7299d1322d5f', '$json.ruta', 'con_acudiente'),
          ]),
          regla('Sin acudiente', [
            condicionTexto('7c1e3a55-4f2b-4a77-9a10-52d8e3f0c4a9', '$json.ruta', 'sin_acudiente'),
          ]),
        ],
      },
      looseTypeValidation: true,
      // Lo que no encaje se va a la salida 0 (error): nunca se descarta en silencio.
      options: { fallbackOutput: 0 },
    },
    { position: [1380, 0] },
  ),

  crearConsentimiento('Enviar Con Acudiente', true, [1600, -80]),
  crearConsentimiento('Enviar Sin Acudiente', false, [1600, 160]),

  code('Armar Respuesta', 'code2-respuesta.js', [1820, 40]),

  nodo(
    'Responder Webhook',
    'n8n-nodes-base.respondToWebhook',
    1.1,
    {
      respondWith: 'json',
      responseBody: '={{ JSON.stringify($json) }}',
      options: { responseCode: '={{ $json.ok ? 200 : 422 }}' },
    },
    { position: [2020, 0] },
  ),
];

const a = (...destinos) => ({
  main: [destinos.map((d) => ({ node: d, type: 'main', index: 0 }))],
});

const connections = {
  'Recibir Consentimiento': a('Clasificar Imagenes'),
  'Clasificar Imagenes': a('Estado Autorizacion'),
  'Estado Autorizacion': a('Consultar Medicos'),
  'Consultar Medicos': a('Consultar Plantillas'),
  'Consultar Plantillas': a('Hay Acudiente'),
  'Hay Acudiente': {
    main: [
      [{ node: 'Bajar Firma Acudiente', type: 'main', index: 0 }],
      [{ node: 'Bajar Firma Paciente', type: 'main', index: 0 }],
    ],
  },
  'Bajar Firma Acudiente': a('Bajar Firma Paciente'),
  'Bajar Firma Paciente': a('Bajar Huella'),
  'Bajar Huella': a('Armar Binarios'),
  'Armar Binarios': a('Decidir Envio'),
  'Decidir Envio': {
    main: [
      [{ node: 'Armar Respuesta', type: 'main', index: 0 }],
      [{ node: 'Enviar Con Acudiente', type: 'main', index: 0 }],
      [{ node: 'Enviar Sin Acudiente', type: 'main', index: 0 }],
    ],
  },
  'Enviar Con Acudiente': a('Armar Respuesta'),
  'Enviar Sin Acudiente': a('Armar Respuesta'),
  'Armar Respuesta': a('Responder Webhook'),
};

// ids estables para que el diff del JSON no cambie en cada build
let semilla = 0x2f6e1a3b;
const idEstable = () => {
  const hex = [];
  for (let i = 0; i < 32; i++) {
    semilla = (semilla * 1664525 + 1013904223) >>> 0;
    hex.push((semilla >>> 24).toString(16).padStart(2, '0')[0]);
  }
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
};

for (const n of nodes) if (!n.id) n.id = idEstable();

// Nota visible en el lienzo con las condiciones para que el flujo reciba tráfico.
nodes.unshift({
  parameters: {
    content: [
      '## ⚠️ Antes de activar',
      '',
      'Sólo puede existir **un** webhook con la ruta `crear_consentimiento` en todo n8n.',
      '',
      '1. Borre o desactive el flujo viejo (el nodo `wh` y toda su cadena, y cualquier copia anterior).',
      '2. Si algún nodo de este flujo quedó con un número pegado al final (p. ej. `Recibir Consentimiento1`), se importó sobre un lienzo que no estaba vacío: borre e importe de nuevo en un workflow NUEVO.',
      '3. Active este flujo y pruebe desde la app.',
      '',
      'Si la ejecución cae en **Con error**, el motivo exacto está en el campo `errores` (pestaña JSON de "Decidir Envio") y también le llega a la app en la respuesta 422.',
    ].join('\n'),
    height: 340,
    width: 460,
    color: 3,
  },
  type: 'n8n-nodes-base.stickyNote',
  typeVersion: 1,
  position: [-640, -360],
  name: 'Leame',
});

const workflow = {
  name: 'Crear Consentimiento HPLAD v2',
  nodes,
  connections,
  settings: { executionOrder: 'v1' },
  pinData: {},
};

writeFileSync(join(aqui, 'crear-consentimiento.workflow.json'), `${JSON.stringify(workflow, null, 2)}\n`);
console.log(`OK: ${nodes.length} nodos, ${Object.keys(connections).length} conexiones`);
