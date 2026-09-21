let item = $input.item;

// ── CORRECCIÓN 1: decodificar imágenes que llegan como "data:image/...;base64,"
// dentro del webhook (cuando a la app le falla la subida a Storage el nodo de
// descarga no puede con ese esquema). ──
function desdeDataUri(texto, nombre) {
  const m = /^data:(image\/[a-z0-9.+-]+)?;?base64,([\s\S]+)$/i.exec(String(texto || '').trim());
  if (!m) return null;
  return {
    data: m[2].replace(/\s+/g, ''),
    mimeType: m[1] || 'image/png',
    fileName: nombre,
    fileExtension: 'png',
  };
}

const cuerpoWh = $('wh').item.json.body || {};

// Verificar si el PDF de firma acudiente existe
// ── CORRECCIÓN 2: exigir contenido de verdad (la descarga fallida deja el
// binario vacío) y, si no está, recuperar la firma del acudiente del webhook. ──
const acudienteDescargada = item.binary && item.binary['data rep'] && item.binary['data rep'].data
  ? item.binary['data rep'] : null;
const acudienteBinario = acudienteDescargada || desdeDataUri(cuerpoWh.acudiente_firma, 'firma_acudiente.png');
const hasAcudientePDF = !!acudienteBinario;

// ── CORRECCIÓN 3: en esta rama el nodo 'firma paciente' nunca corre, así que
// la firma del paciente se recupera del propio webhook. ──
const pacienteBinario = desdeDataUri(cuerpoWh.paciente_firma, 'firma_paciente.png');

// PDF vacío base64
const pdfVacio = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+Pj4+Pj4vQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNTU+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFNpbiBpbmZvcm1hY2lvbikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyODYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozOTEKJSVFT0Y=';

// Preparar el objeto de salida
let output = {
  json: item.json,
  binary: {}
};

// Campo "data rep": firma del acudiente (o PDF vacío si no existe)
if (hasAcudientePDF) {
  output.binary['data rep'] = acudienteBinario;
} else {
  output.binary['data rep'] = {
    data: pdfVacio,
    mimeType: 'application/pdf',
    fileName: 'sin_firma_acudiente.pdf',
    fileExtension: 'pdf'
  };
}

// Campo data: firma del paciente si vino en el webhook; si no, PDF vacío
// (── CORRECCIÓN 4: antes era SIEMPRE el PDF vacío, aunque la firma sí llegara ──)
output.binary.data = pacienteBinario || {
  data: pdfVacio,
  mimeType: 'application/pdf',
  fileName: 'sin_firma_paciente.pdf',
  fileExtension: 'pdf'
};

return output;