// ═════════════════════════════════════════════════════════════════════════════
// PARCHE para el nodo "Code in JavaScript2" del flujo original (FLUJO APIS MESA)
//
// Pegar TODO este código dentro del nodo, reemplazando el que tiene.
// Rama del acudiente: If (sí hay firma de acudiente) → firma acudiente →
// ESTE nodo → Crear Consentimiento3. Recomendado además conectar
// "Crear Consentimiento3" → "Responder OK" (hoy no lleva a ninguna parte).
//
// Qué arregla:
//  · La firma del acudiente que llega como data URI se decodifica aquí.
//  · La firma del PACIENTE también se resuelve en esta rama (el nodo
//    'firma paciente' no corre aquí): del data URI del webhook o, si vino como
//    URL, descargándola directamente desde este nodo.
//  · Se eliminan los PDF vacíos "Sin informacion": nunca más una "firma" falsa
//    en la historia clínica. Si falta una firma real, el flujo se detiene con
//    un error que dice qué llegó.
// ═════════════════════════════════════════════════════════════════════════════

const body = $('wh').first().json.body || {};

const ayudantes = (() => {
  try { return (typeof this !== 'undefined' && this && this.helpers) ? this.helpers : null; }
  catch (e) { return null; }
})();

// Resuelve el binario aunque n8n guarde los archivos en disco/S3 (ahí
// `binary.x.data` llega vacío y sólo trae un `id` de referencia).
async function aBase64(bin) {
  if (!bin) return '';
  if (typeof bin.data === 'string' && bin.data.length > 0) return bin.data;
  if (bin.id && ayudantes) {
    for (const metodo of ['binaryToBuffer', 'getBinaryStream', 'getBinaryDataBuffer']) {
      try {
        if (typeof ayudantes[metodo] !== 'function') continue;
        const buf = await ayudantes[metodo](bin);
        if (buf && buf.length) return Buffer.from(buf).toString('base64');
      } catch (e) { /* método no disponible en esta versión de n8n */ }
    }
  }
  return '';
}

// La app manda la imagen como URL de Storage o, cuando esa subida falla, como
// "data:image/png;base64,..." dentro del JSON. Esto decodifica el segundo caso.
function desdeTexto(valor, nombreArchivo) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return null;
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/i.exec(texto);
  if (m) {
    const mime = m[1] || 'image/png';
    const cuerpo = (m[3] || '').replace(/\s+/g, '');
    if (!cuerpo) return null;
    const data = m[2] ? cuerpo : Buffer.from(decodeURIComponent(cuerpo), 'binary').toString('base64');
    const ext = (mime.split('/')[1] || 'png').split('+')[0];
    return { data, mimeType: mime, fileName: nombreArchivo, fileExtension: ext, origen: 'webhook_data_uri' };
  }
  const limpio = texto.replace(/\s+/g, '');
  if (limpio.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    return { data: limpio, mimeType: 'image/png', fileName: nombreArchivo, fileExtension: 'png', origen: 'webhook_base64' };
  }
  return null;
}

// Último recurso: si la imagen vino como URL pero el nodo de descarga no corrió
// en esta rama (o quedó mal configurado), se intenta descargar desde aquí.
async function descargarDirecto(url, nombreArchivo) {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  if (!ayudantes || typeof ayudantes.httpRequest !== 'function') return null;
  try {
    const r = await ayudantes.httpRequest({
      url, method: 'GET', encoding: 'arraybuffer', returnFullResponse: true, timeout: 20000,
      headers: { 'User-Agent': 'n8n-image-downloader', Accept: 'image/*,*/*' },
    });
    const cuerpo = r && r.body != null ? Buffer.from(r.body) : null;
    if (!cuerpo || !cuerpo.length) return null;
    const mime = String((r.headers && r.headers['content-type']) || 'image/png').split(';')[0];
    return { data: cuerpo.toString('base64'), mimeType: mime, fileName: nombreArchivo,
             fileExtension: (mime.split('/')[1] || 'png').split('+')[0], origen: 'descarga_directa' };
  } catch (e) { return null; }
}

// `leerDescarga` va como función con el $('Nodo') literal adentro: si n8n
// renombra el nodo, reescribe esa referencia; un nombre en texto suelto no.
async function resolver(leerDescarga, propiedad, crudo, nombreArchivo) {
  try {
    const item = leerDescarga();
    const bin = item && item.binary ? item.binary[propiedad] : null;
    const data = await aBase64(bin);
    if (data) {
      return { data, mimeType: bin.mimeType || 'image/png', fileName: bin.fileName || nombreArchivo,
               fileExtension: bin.fileExtension || 'png', origen: 'descarga' };
    }
  } catch (e) { /* el nodo no corrió en esta rama o falló: seguimos */ }
  const inline = desdeTexto(crudo, nombreArchivo);
  if (inline) return inline;
  return await descargarDirecto(crudo, nombreArchivo);
}

function soloBinario(bin) {
  if (!bin) return null;
  return { data: bin.data, mimeType: bin.mimeType, fileName: bin.fileName, fileExtension: bin.fileExtension };
}

function comoLlego(valor) {
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (!t || t === 'null') return 'no venía en el webhook';
  if (/^https?:\/\//i.test(t)) return 'venía como URL pero no se pudo descargar';
  if (/^data:/i.test(t)) return 'venía como data URI pero no se pudo decodificar';
  return 'venía en un formato no reconocido';
}

// ── Resolver las dos firmas de esta rama ─────────────────────────────────────
const binAcudiente = await resolver(
  () => $('firma acudiente').first(), 'data rep', body.acudiente_firma, 'firma_acudiente.png');

// 'firma paciente' no corre en esta rama; resolver() lo tolera y usa el
// webhook o la descarga directa.
const binPaciente = await resolver(
  () => $('firma paciente').first(), 'data', body.paciente_firma, 'firma_paciente.png');

if (!binAcudiente) {
  throw new Error(
    'Esta rama es la del acudiente pero su firma no se pudo obtener: '
    + comoLlego(body.acudiente_firma) + '.'
  );
}
if (!binPaciente) {
  throw new Error(
    'No se pudo obtener la firma del paciente para hcpacfir: '
    + comoLlego(body.paciente_firma)
    + '. "Crear Consentimiento3" sube hcpacfir y hcrepfir; sin la del paciente '
    + 'fallaría igual, así que se detiene aquí con el motivo claro. (Antes se '
    + 'enviaba un PDF vacío: consentimientos sin firma en la historia clínica.)'
  );
}

return [{
  json: {
    ...$input.first().json,
    _firma: {
      origen_firma_paciente: binPaciente.origen,
      origen_firma_acudiente: binAcudiente.origen,
    },
  },
  binary: {
    data: soloBinario(binPaciente),        // hcpacfir
    'data rep': soloBinario(binAcudiente), // hcrepfir
  },
}];
