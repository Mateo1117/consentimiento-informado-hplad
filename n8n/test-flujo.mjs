#!/usr/bin/env node
// Simulador mínimo de n8n: ejecuta los nodos Code de n8n/src con payloads reales
// y comprueba que el flujo produce los binarios y las decisiones esperadas, sin
// necesidad de desplegar en n8n ni de tocar la API del hospital.
//
//   node n8n/test-flujo.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const aqui = dirname(fileURLToPath(import.meta.url));
const code = (f) => readFileSync(join(aqui, 'src', f), 'utf8');

// ── PNG de firma real (RGBA con transparencia, como los que produce el canvas)
function crc32(buf){const t=[];for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c);}let c=0xFFFFFFFF;for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const u32=n=>Buffer.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const chunk=(t,d)=>{const T=Buffer.from(t,'ascii');return Buffer.concat([u32(d.length),T,d,u32(crc32(Buffer.concat([T,d])))]);};
function firmaPng(w,h){
  const raw=Buffer.alloc(h*(w*4+1));
  for(let y=0;y<h;y++){raw[y*(w*4+1)]=y%5;
    for(let x=0;x<w;x++){const i=y*(w*4+1)+1+x*4;
      const trazo = Math.abs(Math.sin(x/18)*h/3 + h/2 - y) < 3;
      raw[i]=raw[i+1]=raw[i+2]=trazo?20:255; raw[i+3]=trazo?255:0;}}
  return Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR',Buffer.concat([u32(w),u32(h),Buffer.from([8,6,0,0,0])])),
    chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const firmaDataUri = 'data:image/png;base64,' + firmaPng(580,260).toString('base64');
const huellaDataUri = 'data:image/png;base64,' + firmaPng(300,300).toString('base64');

// ── Motor de ejecución de nodos Code ─────────────────────────────────────────
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function ejecutar(archivo, items, nodos) {
  const $input = { first: () => items[0], all: () => items, item: items[0] };
  const $ = (nombre) => {
    if (!(nombre in nodos)) throw new Error(`El nodo "${nombre}" no se ejecutó`);
    const v = nodos[nombre];
    if (v === null) throw new Error(`El nodo "${nombre}" falló`);
    return { first: () => v, item: v, all: () => [v] };
  };
  // Los nodos Code de n8n admiten await en el nivel superior: los evaluamos
  // como funciones async para reproducir ese entorno.
  const fn = new AsyncFunction('$input', '$', code(archivo));
  return fn($input, $);
}

const respuestaMedicos = { data: [{ oid: 4321, nombre: 'COLLAZOS QUINTERO KAREN SOFIA' }] };
const respuestaPlantillas = { data: [{ oid: 88, nombre: 'VENOPUNCION' }] };

async function correr(nombreCaso, body, opciones = {}) {
  const nodos = {};
  const webhook = { json: { body }, binary: {} };

  const prep = (await ejecutar('01-preparar-datos.js', [webhook], nodos))[0];
  if (opciones.modoDisco) {
    // Reproduce N8N_DEFAULT_BINARY_DATA_MODE=filesystem/s3: n8n guarda el
    // binario fuera de memoria y `data` vuelve vacío, sólo con la referencia.
    for (const k of Object.keys(prep.binary || {})) {
      prep.binary[k] = { ...prep.binary[k], data: '', id: `filesystem:${k}` };
    }
  }
  nodos['Preparar Datos'] = prep;
  nodos['Buscar Medico'] = opciones.sinMedico ? { json: { data: [] } } : { json: respuestaMedicos };
  nodos['Buscar Plantilla'] = opciones.sinPlantilla ? { json: { data: [] } } : { json: respuestaPlantillas };
  // Las descargas fallan (URL vacía) salvo que el caso diga lo contrario
  nodos['Descargar Firma Paciente'] = opciones.dlFirmaPaciente ?? null;
  nodos['Descargar Firma Acudiente'] = opciones.dlFirmaAcudiente ?? null;
  nodos['Descargar Huella Paciente'] = opciones.dlHuella ?? null;

  const bin = (await ejecutar('02-construir-binarios.js', [prep], nodos))[0];
  nodos['Construir Binarios'] = bin;

  const camposBin = Object.keys(bin.binary || {});
  const tam = camposBin.map(k => `${k}=${Math.round(Buffer.from(bin.binary[k].data,'base64').length/1024)}KB`).join(' ');

  let final;
  if (bin.json.valido) {
    const apiResp = [{ json: { data: { oid: 99001 } } }];
    final = (await ejecutar('03-respuesta-ok.js', apiResp, nodos))[0];
  } else {
    final = (await ejecutar('04-respuesta-error.js', [bin], nodos))[0];
  }

  console.log(`\n── ${nombreCaso}`);
  console.log(`   modo=${bin.json.modo} valido=${bin.json.valido} composicion=${bin.json.composicion_firma_huella}`);
  console.log(`   binarios: ${camposBin.join(', ') || '(ninguno)'} ${tam}`);
  console.log(`   respuesta: success=${final.json.success}${final.json.errores ? ' errores=' + JSON.stringify(final.json.errores) : ''}`);
  return { bin, final };
}

const base = {
  consent_id: 'f4f5b27f-c2aa-4f2a-bca2-762396ba8fb8',
  paciente_nombre_completo: 'FLOR MARINA AMORTEGUI OLARTE',
  paciente_tipo_documento: 'CC',
  paciente_numero_documento: '20878722',
  paciente_foto: null,
  acudiente_nombre_completo: null, acudiente_documento: null, acudiente_parentesco: null, acudiente_firma: null,
  procedimiento_medico: 'Toma de Muestra por Venopunción',
  nombre_consentimiento: 'VENOPUNCION',
  aceptacion_procedimiento: 'Aceptado',
  fecha_documento: '2026-08-21',
  profesional_nombre_completo: 'COLLAZOS QUINTERO KAREN SOFIA',
  riesgos_situacion_clinica: 'Hipertensión',
  payload_adicional: { patientData: {}, decision: 'aprobar' },  // sin patientPhotoUrl (lo borra el sanitizador)
};

// 1) Caso REAL capturado por el usuario: firma como data URI, sin huella
const r1 = await correr('Firma como data URI (caso real del usuario)', { ...base, paciente_firma: firmaDataUri });

// 2) Firma como URL de Storage (camino feliz previsto por la app)
const r2 = await correr('Firma como URL http', { ...base, paciente_firma: 'https://storage.example/f.png' },
  { dlFirmaPaciente: { json: {}, binary: { firma_paciente_dl: { data: firmaPng(580,260).toString('base64'), mimeType: 'image/png', fileName: 'f.png' } } } });

// 3) Firma + huella -> imagen compuesta
const r3 = await correr('Firma + huella (composición)', { ...base, paciente_firma: firmaDataUri, paciente_foto: huellaDataUri });

// 4) Menor de edad: sólo firma del acudiente
const r4 = await correr('Sólo acudiente (menor de edad)', { ...base, paciente_firma: null, paciente_es_menor: true,
  acudiente_nombre_completo: 'MARIA PEREZ', acudiente_documento: '123', acudiente_parentesco: 'MADRE', acudiente_firma: firmaDataUri });

// 5) Ambas firmas
const r5 = await correr('Paciente y acudiente', { ...base, paciente_firma: firmaDataUri,
  acudiente_nombre_completo: 'MARIA PEREZ', acudiente_documento: '123', acudiente_parentesco: 'MADRE', acudiente_firma: firmaDataUri });

// 6) Médico inexistente -> error explícito
const r6 = await correr('Médico no encontrado', { ...base, paciente_firma: firmaDataUri }, { sinMedico: true });

// 7) Sin ninguna firma -> error explícito
const r7 = await correr('Sin firma alguna', { ...base, paciente_firma: null });

// 8) Rechazo del procedimiento
const r8 = await correr('Procedimiento rechazado', { ...base, paciente_firma: firmaDataUri, aceptacion_procedimiento: 'Rechazado' });

// 9) n8n con binarios en disco: `binary.x.data` llega vacío. Este era el fallo
//    de "no convierte el binario": la firma existe pero el nodo la leía ausente.
const r9 = await correr('Binarios en disco (filesystem/s3)', { ...base, paciente_firma: firmaDataUri }, { modoDisco: true });

// 10) Binarios en disco con firma + huella: la composición también debe salir
const r10 = await correr('Binarios en disco + huella', { ...base, paciente_firma: firmaDataUri, paciente_foto: huellaDataUri }, { modoDisco: true });

// ── Aserciones ────────────────────────────────────────────────────────────────
const checks = [
  ['1 data URI produce hcpacfir', !!r1.bin.binary.hcpacfir && r1.bin.json.valido && r1.bin.json.modo==='paciente'],
  ['2 URL http produce hcpacfir', !!r2.bin.binary.hcpacfir && r2.bin.json.valido],
  ['3 composición ok', r3.bin.json.composicion_firma_huella==='ok' && !!r3.bin.binary.hcpacfir],
  ['3 compuesto pesa < 800KB', Buffer.from(r3.bin.binary.hcpacfir.data,'base64').length < 800*1024],
  ['4 sólo acudiente -> hcrepfir sin hcpacfir', !!r4.bin.binary.hcrepfir && !r4.bin.binary.hcpacfir && r4.bin.json.modo==='acudiente'],
  ['4 tipo_firmante = 1', r4.bin.json.tipo_firmante===1],
  ['5 ambas -> dos binarios', !!r5.bin.binary.hcpacfir && !!r5.bin.binary.hcrepfir && r5.bin.json.modo==='ambas'],
  ['6 médico faltante invalida', r6.bin.json.valido===false && r6.final.json.success===false],
  ['7 sin firma invalida', r7.bin.json.valido===false && r7.bin.json.modo==='sin_firma'],
  ['8 rechazo -> estado 0', r8.bin.json.estado===0],
  ['1 estado aceptado = 1', r1.bin.json.estado===1],
  ['1 tipo_firmante = 2', r1.bin.json.tipo_firmante===2],
  ['1 hcpacfir no va vacío', r1.bin.json.firma_paciente_bytes > 1000],
  ['9 binarios en disco -> hcpacfir igual', !!r9.bin.binary.hcpacfir && r9.bin.json.valido && r9.bin.json.firma_paciente_bytes > 1000],
  ['10 binarios en disco -> composición ok', r10.bin.json.composicion_firma_huella==='ok'],
];
console.log('\n── Aserciones');
let fallos=0;
for (const [n,ok] of checks){ console.log(`   ${ok?'✓':'✗'} ${n}`); if(!ok) fallos++; }
console.log(fallos===0 ? '\nTODAS LAS ASERCIONES PASAN' : `\n${fallos} ASERCIONES FALLAN`);
process.exit(fallos===0?0:1);
