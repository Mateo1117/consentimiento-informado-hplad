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
const WH = "$('wh').first().json.body";
const CLASIF = "$('Code in JavaScript3').first().json";
const ESTADO = "$('Code in JavaScript').first().json";
const BIN = "$('Code in JavaScript1').first().json";

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
          { name: 'filtro', value: `={{ ${WH}.${campoFiltro} }}` },
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
    'wh',
    'n8n-nodes-base.webhook',
    2.1,
    { httpMethod: 'POST', path: 'crear_consentimiento', responseMode: 'responseNode', options: {} },
    { position: [-620, 0], webhookId: 'c79c363a-8d30-4f48-8135-7bf21d2feb08' },
  ),

  code('Code in JavaScript3', 'code3-clasificar.js', [-420, 0]),
  code('Code in JavaScript', 'code-estado.js', [-220, 0]),

  busqueda('Medicos', '/medicos', 'profesional_nombre_completo', [{ name: 'limit', value: '100' }], [-20, 0]),
  busqueda('Plantilla Consentimiento2', '/plantillas-consentimiento', 'nombre_consentimiento', [], [180, 0]),

  // ¿Hay firma de acudiente? Sólo entonces se intenta descargarla.
  nodo(
    'If',
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

  descarga('firma acudiente', 'url_firma_acudiente', 'data rep', [580, -120]),
  descarga('firma paciente', 'url_firma_paciente', 'data', [780, 0]),
  descarga('huella paciente', 'url_huella', 'data', [980, 0]),

  code('Code in JavaScript1', 'code1-binarios.js', [1180, 0]),

  // Reparto final: error / con acudiente / sin acudiente.
  // Se compara el texto `ruta` en vez de dos booleanos: n8n importa el Switch
  // con typeValidation "strict" y ahí una condición booleana sin rightValue
  // válido no encaja, así que TODO se iba al fallback (la rama de error).
  nodo(
    'Switch',
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

  crearConsentimiento('Crear Consentimiento3', true, [1600, -120]),
  crearConsentimiento('Crear Consentimiento2', false, [1600, 120]),

  code('Code in JavaScript2', 'code2-respuesta.js', [1820, 0]),

  nodo(
    'Responder OK',
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
  wh: a('Code in JavaScript3'),
  'Code in JavaScript3': a('Code in JavaScript'),
  'Code in JavaScript': a('Medicos'),
  Medicos: a('Plantilla Consentimiento2'),
  'Plantilla Consentimiento2': a('If'),
  If: {
    main: [
      [{ node: 'firma acudiente', type: 'main', index: 0 }],
      [{ node: 'firma paciente', type: 'main', index: 0 }],
    ],
  },
  'firma acudiente': a('firma paciente'),
  'firma paciente': a('huella paciente'),
  'huella paciente': a('Code in JavaScript1'),
  'Code in JavaScript1': a('Switch'),
  Switch: {
    main: [
      [{ node: 'Code in JavaScript2', type: 'main', index: 0 }],
      [{ node: 'Crear Consentimiento3', type: 'main', index: 0 }],
      [{ node: 'Crear Consentimiento2', type: 'main', index: 0 }],
    ],
  },
  'Crear Consentimiento3': a('Code in JavaScript2'),
  'Crear Consentimiento2': a('Code in JavaScript2'),
  'Code in JavaScript2': a('Responder OK'),
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

const workflow = {
  name: 'Crear Consentimiento HPLAD',
  nodes,
  connections,
  settings: { executionOrder: 'v1' },
  pinData: {},
};

writeFileSync(join(aqui, 'crear-consentimiento.workflow.json'), `${JSON.stringify(workflow, null, 2)}\n`);
console.log(`OK: ${nodes.length} nodos, ${Object.keys(connections).length} conexiones`);
