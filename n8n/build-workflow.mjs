#!/usr/bin/env node
// Genera n8n/crear-consentimiento.workflow.json a partir de los nodos Code que
// viven en n8n/src/*.js, para poder revisarlos y versionarlos como código en vez
// de como cadenas escapadas dentro de un JSON gigante.
//
//   node n8n/build-workflow.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const code = (archivo) => readFileSync(join(aqui, 'src', archivo), 'utf8');

const API = 'http://190.145.223.146:99';

const headersAccept = {
  parameters: [{ name: 'accept', value: 'application/json' }],
};

const headersImagen = {
  parameters: [
    { name: 'User-Agent', value: 'n8n-consentimientos' },
    { name: 'Accept', value: 'image/*,*/*' },
  ],
};

// Descarga condicional: la expresión devuelve '' cuando la imagen no vino como
// URL (no vino, o vino como data URI ya decodificado en "Preparar Datos").
// Con URL vacía el nodo falla al instante y `onError: continueRegularOutput`
// deja pasar el item intacto — sin reintentos ni esperas.
const descarga = (nombre, campoUrl, propiedadSalida, posicion) => ({
  parameters: {
    url: `={{ $('Preparar Datos').first().json.${campoUrl} }}`,
    sendHeaders: true,
    headerParameters: headersImagen,
    options: {
      timeout: 20000,
      response: { response: { responseFormat: 'file', outputPropertyName: propiedadSalida } },
    },
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: posicion,
  id: `descarga-${propiedadSalida}`,
  name: nombre,
  alwaysOutputData: true,
  onError: 'continueRegularOutput',
});

// Campos de texto comunes de POST /consentimientos
const camposTexto = () => [
  { name: 'hcnplconsinf', value: '={{ $json.plantilla_oid }}' },
  { name: 'genmedico', value: '={{ $json.medico_oid }}' },
  { name: 'pacnumdoc', value: '={{ $json.paciente_numero_documento }}' },
  { name: 'hcadetdoc', value: '={{ $json.paciente_tipo_documento }}' },
  { name: 'hcaproced', value: '={{ $json.procedimiento_medico }}' },
  { name: 'hccfecdoc', value: '={{ $json.fecha_documento }}' },
  { name: 'hcarieind', value: '={{ $json.riesgos_situacion_clinica }}' },
  { name: 'hcaautinf', value: '={{ $json.estado }}' },
  { name: 'hcaautoproc', value: '={{ $json.estado }}' },
  { name: 'hcaautent', value: '={{ $json.estado }}' },
  { name: 'hcatipaut', value: '={{ $json.tipo_firmante }}' },
];

// Campos del acudiente: sólo se envían cuando hay acudiente, para no crear
// registros con nombre/parentesco vacíos.
const camposAcudiente = () => [
  { name: 'hcaresaut', value: '={{ $json.acudiente_nombre_completo }}' },
  { name: 'hcadocresaut', value: '={{ $json.acudiente_documento }}' },
  { name: 'hcaparent', value: '={{ $json.acudiente_parentesco }}' },
];

const binario = (nombreCampo) => ({
  parameterType: 'formBinaryData',
  name: nombreCampo,
  inputDataFieldName: nombreCampo,
});

const crearConsentimiento = (nombre, id, campos, posicion) => ({
  parameters: {
    method: 'POST',
    url: `${API}/consentimientos`,
    sendHeaders: true,
    headerParameters: headersAccept,
    sendBody: true,
    contentType: 'multipart-form-data',
    bodyParameters: { parameters: campos },
    options: { timeout: 60000 },
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: posicion,
  id,
  name: nombre,
  onError: 'continueErrorOutput',
});

const nodos = [
  {
    parameters: {
      httpMethod: 'POST',
      path: 'crear_consentimiento',
      responseMode: 'responseNode',
      options: {},
    },
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2.1,
    position: [-560, 300],
    id: 'webhook-crear-consentimiento',
    name: 'Webhook Crear Consentimiento',
    webhookId: 'c79c363a-8d30-4f48-8135-7bf21d2feb08',
  },
  {
    parameters: { jsCode: code('01-preparar-datos.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-340, 300],
    id: 'preparar-datos',
    name: 'Preparar Datos',
  },
  {
    parameters: {
      url: `${API}/medicos`,
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'filtro', value: '={{ $json.profesional_nombre_completo }}' },
          { name: 'limit', value: '100' },
        ],
      },
      sendHeaders: true,
      headerParameters: headersAccept,
      options: { timeout: 20000 },
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [-120, 300],
    id: 'buscar-medico',
    name: 'Buscar Medico',
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
  },
  {
    parameters: {
      url: `${API}/plantillas-consentimiento`,
      sendQuery: true,
      queryParameters: {
        parameters: [{ name: 'filtro', value: "={{ $('Preparar Datos').first().json.nombre_consentimiento }}" }],
      },
      sendHeaders: true,
      headerParameters: headersAccept,
      options: { timeout: 20000 },
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [100, 300],
    id: 'buscar-plantilla',
    name: 'Buscar Plantilla',
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
  },

  // Las tres descargas se ejecutan siempre y fallan sin ruido si no aplica.
  descarga('Descargar Firma Paciente', 'url_firma_paciente', 'firma_paciente_dl', [320, 300]),
  descarga('Descargar Firma Acudiente', 'url_firma_acudiente', 'firma_acudiente_dl', [540, 300]),
  descarga('Descargar Huella Paciente', 'url_huella_paciente', 'huella_paciente_dl', [760, 300]),

  {
    parameters: { jsCode: code('02-construir-binarios.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [980, 300],
    id: 'construir-binarios',
    name: 'Construir Binarios',
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [
          {
            id: 'validacion-previa',
            leftValue: '={{ $json.valido }}',
            rightValue: true,
            operator: { type: 'boolean', operation: 'true', singleValue: true },
          },
        ],
        combinator: 'and',
      },
      looseTypeValidation: true,
      options: {},
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [1200, 300],
    id: 'validar-datos',
    name: 'Datos Completos',
  },
  {
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
              conditions: [{
                id: 'modo-paciente',
                leftValue: '={{ $json.modo }}',
                rightValue: 'paciente',
                operator: { type: 'string', operation: 'equals' },
              }],
              combinator: 'and',
            },
            renameOutput: true,
            outputKey: 'Solo paciente',
          },
          {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
              conditions: [{
                id: 'modo-acudiente',
                leftValue: '={{ $json.modo }}',
                rightValue: 'acudiente',
                operator: { type: 'string', operation: 'equals' },
              }],
              combinator: 'and',
            },
            renameOutput: true,
            outputKey: 'Solo acudiente',
          },
          {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
              conditions: [{
                id: 'modo-ambas',
                leftValue: '={{ $json.modo }}',
                rightValue: 'ambas',
                operator: { type: 'string', operation: 'equals' },
              }],
              combinator: 'and',
            },
            renameOutput: true,
            outputKey: 'Paciente y acudiente',
          },
        ],
      },
      looseTypeValidation: true,
      options: { fallbackOutput: 'none' },
    },
    type: 'n8n-nodes-base.switch',
    typeVersion: 3.2,
    position: [1420, 200],
    id: 'switch-firmantes',
    name: 'Firmantes',
  },

  crearConsentimiento(
    'Crear Consentimiento (Paciente)',
    'crear-consentimiento-paciente',
    [...camposTexto(), binario('hcpacfir')],
    [1660, 0],
  ),
  crearConsentimiento(
    'Crear Consentimiento (Acudiente)',
    'crear-consentimiento-acudiente',
    [...camposTexto(), ...camposAcudiente(), binario('hcrepfir')],
    [1660, 200],
  ),
  crearConsentimiento(
    'Crear Consentimiento (Paciente y Acudiente)',
    'crear-consentimiento-ambas',
    [...camposTexto(), ...camposAcudiente(), binario('hcpacfir'), binario('hcrepfir')],
    [1660, 400],
  ),

  {
    parameters: { jsCode: code('03-respuesta-ok.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1940, 160],
    id: 'respuesta-exitosa',
    name: 'Respuesta Exitosa',
  },
  {
    parameters: { jsCode: code('04-respuesta-error.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1940, 500],
    id: 'respuesta-error',
    name: 'Respuesta Con Error',
  },
  {
    parameters: { options: { responseCode: 200 } },
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [2180, 160],
    id: 'responder-ok',
    name: 'Responder OK',
  },
  {
    parameters: { options: { responseCode: 422 } },
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [2180, 500],
    id: 'responder-error',
    name: 'Responder Error',
  },
];

const main = (...destinos) => ({
  main: [destinos.map((nodo) => ({ node: nodo, type: 'main', index: 0 }))],
});

const connections = {
  'Webhook Crear Consentimiento': main('Preparar Datos'),
  'Preparar Datos': main('Buscar Medico'),
  'Buscar Medico': main('Buscar Plantilla'),
  'Buscar Plantilla': main('Descargar Firma Paciente'),
  'Descargar Firma Paciente': main('Descargar Firma Acudiente'),
  'Descargar Firma Acudiente': main('Descargar Huella Paciente'),
  'Descargar Huella Paciente': main('Construir Binarios'),
  'Construir Binarios': main('Datos Completos'),
  'Datos Completos': {
    main: [
      [{ node: 'Firmantes', type: 'main', index: 0 }],
      [{ node: 'Respuesta Con Error', type: 'main', index: 0 }],
    ],
  },
  Firmantes: {
    main: [
      [{ node: 'Crear Consentimiento (Paciente)', type: 'main', index: 0 }],
      [{ node: 'Crear Consentimiento (Acudiente)', type: 'main', index: 0 }],
      [{ node: 'Crear Consentimiento (Paciente y Acudiente)', type: 'main', index: 0 }],
    ],
  },
  // Salida 0 = éxito, salida 1 = error (onError: continueErrorOutput)
  'Crear Consentimiento (Paciente)': {
    main: [
      [{ node: 'Respuesta Exitosa', type: 'main', index: 0 }],
      [{ node: 'Respuesta Con Error', type: 'main', index: 0 }],
    ],
  },
  'Crear Consentimiento (Acudiente)': {
    main: [
      [{ node: 'Respuesta Exitosa', type: 'main', index: 0 }],
      [{ node: 'Respuesta Con Error', type: 'main', index: 0 }],
    ],
  },
  'Crear Consentimiento (Paciente y Acudiente)': {
    main: [
      [{ node: 'Respuesta Exitosa', type: 'main', index: 0 }],
      [{ node: 'Respuesta Con Error', type: 'main', index: 0 }],
    ],
  },
  'Respuesta Exitosa': main('Responder OK'),
  'Respuesta Con Error': main('Responder Error'),
};

const workflow = {
  name: 'Crear Consentimiento (HPLAD)',
  nodes: nodos,
  connections,
  settings: { executionOrder: 'v1' },
  pinData: {},
};

const salida = join(aqui, 'crear-consentimiento.workflow.json');
writeFileSync(salida, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Workflow generado: ${salida} (${nodos.length} nodos)`);
