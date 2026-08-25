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
const PREP = "$('Preparar Datos').first().json";

const headersAccept = { parameters: [{ name: 'accept', value: 'application/json' }] };

// Descarga de una firma desde Supabase Storage. El nombre de la propiedad de
// salida es DIRECTAMENTE el campo que espera la API del hospital (hcpacfir /
// hcrepfir), así no hace falta ningún nodo intermedio que renombre el binario.
//
// Ojo: un HTTP Request con responseFormat "file" REEMPLAZA el binario del item,
// no lo suma. Por eso las descargas van después del Switch, y cada rama baja
// sólo la firma que su POST necesita.
const descarga = (nombre, campoUrl, propiedadSalida, posicion) => ({
  parameters: {
    url: `={{ ${PREP}.${campoUrl} }}`,
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'User-Agent', value: 'n8n-consentimientos' },
        { name: 'Accept', value: 'image/*,*/*' },
      ],
    },
    options: {
      timeout: 20000,
      response: { response: { responseFormat: 'file', outputPropertyName: propiedadSalida } },
    },
  },
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: posicion,
  id: `descarga-${propiedadSalida}-${nombre.includes('Ambas') ? 'ambas' : 'solo'}`,
  name: nombre,
  // Si la firma no se puede bajar, el item se va por la salida de error hacia el
  // 422. Nunca se sube un consentimiento sin la firma que dice tener.
  onError: 'continueErrorOutput',
});

// Campos de texto comunes de POST /consentimientos. Se leen de los nodos que los
// produjeron, no de $json, porque el item que llega al POST viene de una
// descarga y su json ya no es el de "Preparar Datos".
const camposTexto = () => [
  { name: 'hcnplconsinf', value: "={{ $('Buscar Plantilla').first().json.data[0].oid }}" },
  { name: 'genmedico', value: "={{ $('Buscar Medico').first().json.data[0].oid }}" },
  { name: 'pacnumdoc', value: `={{ ${PREP}.paciente_numero_documento }}` },
  { name: 'hcadetdoc', value: `={{ ${PREP}.paciente_tipo_documento }}` },
  { name: 'hcaproced', value: `={{ ${PREP}.procedimiento_medico }}` },
  { name: 'hccfecdoc', value: `={{ ${PREP}.fecha_documento }}` },
  { name: 'hcarieind', value: `={{ ${PREP}.riesgos_situacion_clinica }}` },
  { name: 'hcaautinf', value: `={{ ${PREP}.estado }}` },
  { name: 'hcaautoproc', value: `={{ ${PREP}.estado }}` },
  { name: 'hcaautent', value: `={{ ${PREP}.estado }}` },
  { name: 'hcatipaut', value: `={{ ${PREP}.tipo_firmante }}` },
];

// Campos del acudiente: sólo se envían cuando hay acudiente, para no crear
// registros con nombre/parentesco vacíos.
const camposAcudiente = () => [
  { name: 'hcaresaut', value: `={{ ${PREP}.acudiente_nombre_completo }}` },
  { name: 'hcadocresaut', value: `={{ ${PREP}.acudiente_documento }}` },
  { name: 'hcaparent', value: `={{ ${PREP}.acudiente_parentesco }}` },
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

const reglaModo = (valor, etiqueta) => ({
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
    conditions: [{
      id: `modo-${valor}`,
      leftValue: `={{ ${PREP}.modo }}`,
      rightValue: valor,
      operator: { type: 'string', operation: 'equals' },
    }],
    combinator: 'and',
  },
  renameOutput: true,
  outputKey: etiqueta,
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
          { name: 'filtro', value: `={{ ${PREP}.profesional_nombre_completo }}` },
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
        parameters: [{ name: 'filtro', value: `={{ ${PREP}.nombre_consentimiento }}` }],
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
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'validacion-previa',
          leftValue: `={{ ${PREP}.valido && !!$('Buscar Medico').first().json.data?.[0]?.oid && !!$('Buscar Plantilla').first().json.data?.[0]?.oid }}`,
          rightValue: true,
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        }],
        combinator: 'and',
      },
      looseTypeValidation: true,
      options: {},
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [320, 300],
    id: 'validar-datos',
    name: 'Datos Completos',
  },
  {
    parameters: {
      rules: {
        values: [
          reglaModo('paciente', 'Solo paciente'),
          reglaModo('acudiente', 'Solo acudiente'),
          reglaModo('ambas', 'Paciente y acudiente'),
        ],
      },
      looseTypeValidation: true,
      options: { fallbackOutput: 'none' },
    },
    type: 'n8n-nodes-base.switch',
    typeVersion: 3.2,
    position: [540, 200],
    id: 'switch-firmantes',
    name: 'Firmantes',
  },

  descarga('Descargar Firma Paciente', 'url_firma_paciente', 'hcpacfir', [780, 0]),
  descarga('Descargar Firma Acudiente', 'url_firma_acudiente', 'hcrepfir', [780, 200]),
  descarga('Descargar Firma Paciente (Ambas)', 'url_firma_paciente', 'hcpacfir', [780, 400]),
  descarga('Descargar Firma Acudiente (Ambas)', 'url_firma_acudiente', 'hcrepfir', [780, 580]),

  {
    // Une los dos binarios en un solo item: el POST de "ambas" necesita hcpacfir
    // y hcrepfir a la vez, y cada descarga sólo trae el suyo.
    parameters: { mode: 'combine', combineBy: 'combineByPosition', options: {} },
    type: 'n8n-nodes-base.merge',
    typeVersion: 3,
    position: [1020, 490],
    id: 'unir-firmas',
    name: 'Unir Firmas',
  },

  crearConsentimiento(
    'Crear Consentimiento (Paciente)',
    'crear-consentimiento-paciente',
    [...camposTexto(), binario('hcpacfir')],
    [1260, 0],
  ),
  crearConsentimiento(
    'Crear Consentimiento (Acudiente)',
    'crear-consentimiento-acudiente',
    [...camposTexto(), ...camposAcudiente(), binario('hcrepfir')],
    [1260, 200],
  ),
  crearConsentimiento(
    'Crear Consentimiento (Paciente y Acudiente)',
    'crear-consentimiento-ambas',
    [...camposTexto(), ...camposAcudiente(), binario('hcpacfir'), binario('hcrepfir')],
    [1260, 490],
  ),

  {
    parameters: { jsCode: code('03-respuesta-ok.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1540, 160],
    id: 'respuesta-exitosa',
    name: 'Respuesta Exitosa',
  },
  {
    parameters: { jsCode: code('04-respuesta-error.js') },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1540, 700],
    id: 'respuesta-error',
    name: 'Respuesta Con Error',
  },
  {
    parameters: { options: { responseCode: 200 } },
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [1780, 160],
    id: 'responder-ok',
    name: 'Responder OK',
  },
  {
    parameters: { options: { responseCode: 422 } },
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [1780, 700],
    id: 'responder-error',
    name: 'Responder Error',
  },
];

const a = (nodo, index = 0) => ({ node: nodo, type: 'main', index });
const main = (...destinos) => ({ main: [destinos.map((n) => a(n))] });
// Nodos con dos salidas: 0 = ok, 1 = error (onError: continueErrorOutput)
const okError = (destinoOk, indiceOk = 0) => ({
  main: [[a(destinoOk, indiceOk)], [a('Respuesta Con Error')]],
});

const connections = {
  'Webhook Crear Consentimiento': main('Preparar Datos'),
  'Preparar Datos': main('Buscar Medico'),
  'Buscar Medico': main('Buscar Plantilla'),
  'Buscar Plantilla': main('Datos Completos'),
  'Datos Completos': {
    main: [[a('Firmantes')], [a('Respuesta Con Error')]],
  },
  Firmantes: {
    main: [
      [a('Descargar Firma Paciente')],
      [a('Descargar Firma Acudiente')],
      [a('Descargar Firma Paciente (Ambas)'), a('Descargar Firma Acudiente (Ambas)')],
    ],
  },
  'Descargar Firma Paciente': okError('Crear Consentimiento (Paciente)'),
  'Descargar Firma Acudiente': okError('Crear Consentimiento (Acudiente)'),
  'Descargar Firma Paciente (Ambas)': okError('Unir Firmas', 0),
  'Descargar Firma Acudiente (Ambas)': okError('Unir Firmas', 1),
  'Unir Firmas': main('Crear Consentimiento (Paciente y Acudiente)'),
  'Crear Consentimiento (Paciente)': okError('Respuesta Exitosa'),
  'Crear Consentimiento (Acudiente)': okError('Respuesta Exitosa'),
  'Crear Consentimiento (Paciente y Acudiente)': okError('Respuesta Exitosa'),
  'Respuesta Exitosa': main('Responder OK'),
  'Respuesta Con Error': main('Responder Error'),
};

const workflow = {
  name: 'Crear Consentimiento (HPLAD)',
  nodes: nodos,
  connections,
  pinData: {},
  settings: { executionOrder: 'v1' },
  meta: { instanceId: '6b404500015b4bdb962b14619a625e79e7b607ba534845ca7821d24c61f8eb86' },
};

const salida = join(aqui, 'crear-consentimiento.workflow.json');
writeFileSync(salida, `${JSON.stringify(workflow, null, 2)}\n`);
console.log(`Workflow generado: ${salida} (${nodos.length} nodos)`);
