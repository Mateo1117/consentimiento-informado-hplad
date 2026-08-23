// ── Nodo "Construir Binarios" (Code · Run Once for All Items) ─────────────────
// Reúne las imágenes vengan de donde vengan (descarga HTTP o data URI ya
// decodificado en "Preparar Datos") y deja listos los binarios que consume la
// API del hospital:
//
//   hcpacfir -> firma del paciente (con la huella compuesta al lado, si existe)
//   hcrepfir -> firma del acudiente / representante
//
// Nunca genera binarios de relleno: si una firma no existe, el campo no se
// envía. El flujo anterior mandaba un PDF vacío en `hcpacfir`, lo que producía
// consentimientos guardados con una "firma" que no era una firma.

const datos = $('Preparar Datos').first();
const json = datos.json;

// ── Resolución de cada imagen ─────────────────────────────────────────────────
// Antes esto leía únicamente `$('Nodo').first().binary.x.data`, y ahí estaba el
// fallo de "no convierte el binario": cuando n8n guarda los binarios fuera de
// memoria (N8N_DEFAULT_BINARY_DATA_MODE=filesystem o s3, que es lo habitual en
// self-hosted y en n8n Cloud) esa propiedad `data` llega VACÍA y sólo trae un
// `id` de referencia. La firma existía, pero aquí se leía como ausente y el
// item salía sin `hcpacfir`.
//
// Ahora se intenta en cascada y el último eslabón —el base64 que "Preparar
// Datos" deja en el JSON— no depende del modo de almacenamiento de n8n, así
// que si la firma vino en el webhook, sale sí o sí.
const ayudantes = (() => {
  try { return (typeof this !== 'undefined' && this && this.helpers) ? this.helpers : null; }
  catch (e) { return null; }
})();

async function aBase64(bin) {
  if (!bin) return '';
  if (typeof bin.data === 'string' && bin.data.length > 0) return bin.data;
  // Binario almacenado en disco/S3: hay que resolver la referencia.
  if (bin.id && ayudantes) {
    for (const metodo of ['binaryToBuffer', 'getBinaryStream', 'getBinaryDataBuffer']) {
      try {
        if (typeof ayudantes[metodo] !== 'function') continue;
        const buf = await ayudantes[metodo](bin);
        if (buf && buf.length) return Buffer.from(buf).toString('base64');
      } catch (e) {
        // Método no disponible o firma distinta según la versión de n8n.
      }
    }
  }
  return '';
}

async function resolverImagen(nodoDescarga, propDescarga, propInline, prefijo) {
  const mimePorDefecto = json['mime_' + prefijo] || 'image/png';
  const extPorDefecto = json['ext_' + prefijo] || 'png';
  const nombrePorDefecto = `${prefijo}.${extPorDefecto}`;

  const normalizar = async (bin) => {
    const data = await aBase64(bin);
    if (!data) return null;
    return {
      data,
      mimeType: bin.mimeType || mimePorDefecto,
      fileName: bin.fileName || nombrePorDefecto,
      fileExtension: bin.fileExtension || extPorDefecto,
    };
  };

  // 1) Lo que bajó el nodo HTTP (imágenes que llegaron como URL http/https).
  try {
    const r = await normalizar($(nodoDescarga).first().binary?.[propDescarga]);
    if (r) return r;
  } catch (e) {
    // El nodo no corrió o falló (onError: continueRegularOutput): seguimos.
  }

  // 2) El binario que "Preparar Datos" ya había decodificado.
  try {
    const r = await normalizar(datos.binary?.[propInline]);
    if (r) return r;
  } catch (e) { /* seguimos */ }

  // 3) El binario que venga en la entrada inmediata de este nodo.
  try {
    const entrada = $input.first();
    const r = await normalizar(entrada.binary?.[propInline] || entrada.binary?.[propDescarga]);
    if (r) return r;
  } catch (e) { /* seguimos */ }

  // 4) Base64 crudo en el JSON. Independiente del modo de binarios de n8n.
  const b64 = json['b64_' + prefijo];
  if (typeof b64 === 'string' && b64.length > 0) {
    return {
      data: b64,
      mimeType: mimePorDefecto,
      fileName: nombrePorDefecto,
      fileExtension: extPorDefecto,
    };
  }

  return null;
}

const binFirmaPaciente = await resolverImagen(
  'Descargar Firma Paciente', 'firma_paciente_dl', 'firma_paciente_inline', 'firma_paciente');

const binFirmaAcudiente = await resolverImagen(
  'Descargar Firma Acudiente', 'firma_acudiente_dl', 'firma_acudiente_inline', 'firma_acudiente');

const binHuella = await resolverImagen(
  'Descargar Huella Paciente', 'huella_paciente_dl', 'huella_paciente_inline', 'huella_paciente');

// ── Datos maestros de la API ──────────────────────────────────────────────────
function primerOid(nombreNodo) {
  try {
    const res = $(nombreNodo).first().json;
    const lista = res?.data || res?.results || (Array.isArray(res) ? res : []);
    return lista && lista.length > 0 ? (lista[0].oid ?? null) : null;
  } catch (e) {
    return null;
  }
}

const medicoOid = primerOid('Buscar Medico');
const plantillaOid = primerOid('Buscar Plantilla');

// ══ Composición firma + huella en una sola imagen ═════════════════════════════
// Sólo se intenta cuando hay huella Y ambas son PNG. Ante cualquier problema se
// devuelve la firma intacta: es preferible perder la composición que perder la
// firma, que es lo que ocurría antes.

function inflate(comprimido) {
  let pos = 2, buf = 0, len = 0;
  const bits = (n) => {
    while (len < n) { buf |= comprimido[pos++] << len; len += 8; }
    const v = buf & ((1 << n) - 1);
    buf >>= n; len -= n;
    return v;
  };
  const tabla = (longitudes, maxSym) => {
    const maxLen = Math.max(...longitudes);
    if (maxLen === 0) return { porLongitud: [], maxLen: 0 };
    const cuenta = new Array(maxLen + 1).fill(0);
    for (let i = 0; i <= maxSym; i++) if (longitudes[i]) cuenta[longitudes[i]]++;
    const inicio = new Array(maxLen + 1).fill(0);
    let c = 0;
    for (let l = 1; l <= maxLen; l++) { c = (c + cuenta[l - 1]) << 1; inicio[l] = c; }
    const porLongitud = [];
    for (let l = 0; l <= maxLen; l++) porLongitud.push({});
    for (let i = 0; i <= maxSym; i++) {
      const l = longitudes[i];
      if (l > 0) { porLongitud[l][inicio[l]] = i; inicio[l]++; }
    }
    return { porLongitud, maxLen };
  };
  const leerSimbolo = (arbol) => {
    let code = 0;
    for (let l = 1; l <= arbol.maxLen; l++) {
      code = (code << 1) | bits(1);
      const sym = arbol.porLongitud[l][code];
      if (sym !== undefined) return sym;
    }
    throw new Error('simbolo huffman invalido');
  };

  const fijoLL = [];
  for (let i = 0; i < 144; i++) fijoLL.push(8);
  for (let i = 144; i < 256; i++) fijoLL.push(9);
  for (let i = 256; i < 280; i++) fijoLL.push(7);
  for (let i = 280; i < 288; i++) fijoLL.push(8);
  const fijoD = new Array(32).fill(5);

  const lExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const lBase = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const dExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const dBase = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];

  const salida = [];
  const bloque = (lt, dt) => {
    for (;;) {
      const s = leerSimbolo(lt);
      if (s < 256) { salida.push(s); continue; }
      if (s === 256) break;
      const ei = s - 257;
      const longitud = lBase[ei] + bits(lExtra[ei]);
      const ds = leerSimbolo(dt);
      const dist = dBase[ds] + bits(dExtra[ds]);
      const desde = salida.length - dist;
      for (let i = 0; i < longitud; i++) salida.push(salida[desde + i]);
    }
  };

  let final = 0;
  while (!final) {
    final = bits(1);
    const tipo = bits(2);
    if (tipo === 0) {
      buf = 0; len = 0;
      const n = comprimido[pos] | (comprimido[pos + 1] << 8);
      pos += 4;
      for (let i = 0; i < n; i++) salida.push(comprimido[pos++]);
    } else if (tipo === 1) {
      bloque(tabla(fijoLL, 287), tabla(fijoD, 31));
    } else if (tipo === 2) {
      const hl = bits(5) + 257, hd = bits(5) + 1, hc = bits(4) + 4;
      const orden = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
      const cl = new Array(19).fill(0);
      for (let i = 0; i < hc; i++) cl[orden[i]] = bits(3);
      const ct = tabla(cl, 18);
      const longitudes = [];
      while (longitudes.length < hl + hd) {
        const s = leerSimbolo(ct);
        if (s < 16) longitudes.push(s);
        else if (s === 16) { const r = bits(2) + 3, p = longitudes[longitudes.length - 1]; for (let i = 0; i < r; i++) longitudes.push(p); }
        else if (s === 17) { const r = bits(3) + 3; for (let i = 0; i < r; i++) longitudes.push(0); }
        else { const r = bits(7) + 11; for (let i = 0; i < r; i++) longitudes.push(0); }
      }
      bloque(tabla(longitudes.slice(0, hl), hl - 1), tabla(longitudes.slice(hl), hd - 1));
    } else {
      throw new Error('bloque deflate reservado');
    }
  }
  return Buffer.from(salida);
}

function pngARgb(png) {
  let ancho, alto, tipoColor;
  const idat = [];
  let off = 8;
  while (off < png.length - 8) {
    const largo = png.readUInt32BE(off);
    const tipo = png.slice(off + 4, off + 8).toString('ascii');
    const datos = png.slice(off + 8, off + 8 + largo);
    if (tipo === 'IHDR') { ancho = datos.readUInt32BE(0); alto = datos.readUInt32BE(4); tipoColor = datos[9]; }
    else if (tipo === 'IDAT') idat.push(datos);
    else if (tipo === 'IEND') break;
    off += 12 + largo;
  }
  if (!ancho || !alto) throw new Error('PNG sin IHDR');
  if (![0, 2, 4, 6].includes(tipoColor)) throw new Error('PNG con paleta no soportado');

  const crudo = inflate(Buffer.concat(idat));
  const bpp = tipoColor === 6 ? 4 : tipoColor === 4 ? 2 : tipoColor === 0 ? 1 : 3;
  const gris = tipoColor === 0 || tipoColor === 4;
  const conAlfa = tipoColor === 4 || tipoColor === 6;
  const stride = ancho * bpp;

  const filas = [];
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (stride + 1)];
    const fila = crudo.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = Buffer.alloc(stride);
    const prev = filas[y - 1] || Buffer.alloc(stride, 0);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      if (filtro === 0) out[x] = fila[x];
      else if (filtro === 1) out[x] = (fila[x] + a) & 0xFF;
      else if (filtro === 2) out[x] = (fila[x] + b) & 0xFF;
      else if (filtro === 3) out[x] = (fila[x] + Math.floor((a + b) / 2)) & 0xFF;
      else if (filtro === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        out[x] = (fila[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF;
      } else out[x] = fila[x];
    }
    filas.push(out);
  }

  // Aplana sobre blanco: las firmas suelen venir con fondo transparente y sin
  // esto quedarían negras sobre negro al quitar el canal alfa.
  const rgb = Buffer.alloc(ancho * alto * 3);
  let p = 0;
  for (let y = 0; y < alto; y++) {
    const fila = filas[y];
    for (let x = 0; x < ancho; x++) {
      const i = x * bpp;
      let r, g, b;
      if (gris) { r = g = b = fila[i]; } else { r = fila[i]; g = fila[i + 1]; b = fila[i + 2]; }
      if (conAlfa) {
        const alfa = fila[i + bpp - 1] / 255;
        r = Math.round(r * alfa + 255 * (1 - alfa));
        g = Math.round(g * alfa + 255 * (1 - alfa));
        b = Math.round(b * alfa + 255 * (1 - alfa));
      }
      rgb[p++] = r; rgb[p++] = g; rgb[p++] = b;
    }
  }
  return { ancho, alto, rgb };
}

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

// Comprime con zlib si el sandbox de n8n lo permite; si no, emite bloques
// DEFLATE "stored" (válidos y legibles por cualquier visor, sólo más pesados).
function comprimir(datos) {
  try {
    // eslint-disable-next-line
    const zlib = require('zlib');
    if (zlib && zlib.deflateSync) return zlib.deflateSync(datos, { level: 9 });
  } catch (e) {
    // require no disponible en el sandbox: seguimos con "stored".
  }
  const BLOQUE = 65535;
  const partes = [Buffer.from([0x78, 0x01])];
  let off = 0;
  for (;;) {
    const fin = Math.min(off + BLOQUE, datos.length);
    const trozo = datos.slice(off, fin);
    const ultimo = fin >= datos.length ? 1 : 0;
    const n = trozo.length, nn = (~n) & 0xFFFF;
    partes.push(Buffer.from([ultimo, n & 0xFF, (n >> 8) & 0xFF, nn & 0xFF, (nn >> 8) & 0xFF]));
    partes.push(trozo);
    off = fin;
    if (ultimo) break;
  }
  let s1 = 1, s2 = 0;
  for (let i = 0; i < datos.length; i++) { s1 = (s1 + datos[i]) % 65521; s2 = (s2 + s1) % 65521; }
  const adler = ((s2 << 16) | s1) >>> 0;
  partes.push(Buffer.from([(adler >>> 24) & 0xFF, (adler >>> 16) & 0xFF, (adler >>> 8) & 0xFF, adler & 0xFF]));
  return Buffer.concat(partes);
}

// PNG en escala de grises (8 bits, 1 canal): una firma y una huella no necesitan
// color, y así la imagen compuesta pesa un tercio.
function construirPngGris(ancho, alto, gris) {
  const u32 = (n) => Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
  const chunk = (tipo, datos) => {
    const t = Buffer.from(tipo, 'ascii');
    const d = Buffer.isBuffer(datos) ? datos : Buffer.from(datos);
    return Buffer.concat([u32(d.length), t, d, u32(crc32(Buffer.concat([t, d])))]);
  };
  const ihdr = Buffer.concat([u32(ancho), u32(alto), Buffer.from([8, 0, 0, 0, 0])]);
  const filas = Buffer.alloc(alto * (ancho + 1));
  for (let y = 0; y < alto; y++) {
    filas[y * (ancho + 1)] = 0; // filtro None
    gris.copy(filas, y * (ancho + 1) + 1, y * ancho, (y + 1) * ancho);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', comprimir(filas)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function componerFirmaYHuella(imgIzq, imgDer) {
  const W = 1000, H = 460, PAD = 24, DIV = 3;
  const mitad = Math.floor(W / 2);
  const lienzo = Buffer.alloc(W * H, 255);

  const pintar = (x, y, v) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    lienzo[y * W + x] = v;
  };

  // Separador vertical
  for (let y = 0; y < H; y++) {
    for (let d = 0; d < DIV; d++) pintar(mitad - Math.floor(DIV / 2) + d, y, 180);
  }

  const dibujar = (img, destX, destY, destW, destH) => {
    const ratio = Math.min(destW / img.ancho, destH / img.alto);
    const w = Math.max(1, Math.round(img.ancho * ratio));
    const h = Math.max(1, Math.round(img.alto * ratio));
    const offX = destX + Math.round((destW - w) / 2);
    const offY = destY + Math.round((destH - h) / 2);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (Math.floor(py / ratio) * img.ancho + Math.floor(px / ratio)) * 3;
        // Luminancia BT.601
        const v = Math.round(0.299 * img.rgb[i] + 0.587 * img.rgb[i + 1] + 0.114 * img.rgb[i + 2]);
        pintar(offX + px, offY + py, v);
      }
    }
  };

  const areaW = mitad - PAD * 2;
  const areaH = H - PAD * 2;
  dibujar(imgIzq, PAD, PAD, areaW, areaH);
  dibujar(imgDer, mitad + PAD, PAD, areaW, areaH);

  return construirPngGris(W, H, lienzo);
}

// ── Firma del paciente final (compuesta o intacta) ────────────────────────────
let firmaPacienteFinal = binFirmaPaciente;
let composicion = 'no_aplica';

if (binFirmaPaciente && binHuella) {
  const ambosPng = String(binFirmaPaciente.mimeType || '').includes('png')
    && String(binHuella.mimeType || '').includes('png');
  if (!ambosPng) {
    composicion = 'omitida_formato_no_png';
  } else {
    try {
      const compuesto = componerFirmaYHuella(
        pngARgb(Buffer.from(binFirmaPaciente.data, 'base64')),
        pngARgb(Buffer.from(binHuella.data, 'base64')),
      );
      firmaPacienteFinal = {
        data: compuesto.toString('base64'),
        mimeType: 'image/png',
        fileName: 'firma_huella_paciente.png',
        fileExtension: 'png',
      };
      composicion = 'ok';
    } catch (e) {
      // Fallback deliberado: mejor la firma sola que ninguna firma.
      composicion = `fallo: ${e.message}`;
    }
  }
}

// ── Modo de envío: define a qué rama va el Switch ─────────────────────────────
let modo;
if (firmaPacienteFinal && binFirmaAcudiente) modo = 'ambas';
else if (binFirmaAcudiente) modo = 'acudiente';
else if (firmaPacienteFinal) modo = 'paciente';
else modo = 'sin_firma';

// ── Validaciones antes de tocar la API ────────────────────────────────────────
const errores = [];
if (!medicoOid) errores.push(`No se encontró el médico "${json.profesional_nombre_completo}" en /medicos`);
if (!plantillaOid) errores.push(`No se encontró la plantilla "${json.nombre_consentimiento}" en /plantillas-consentimiento`);
if (modo === 'sin_firma') errores.push('No se pudo obtener ninguna firma (ni del paciente ni del acudiente)');
if (!json.paciente_numero_documento) errores.push('Falta el número de documento del paciente');

return [{
  json: {
    ...json,
    medico_oid: medicoOid,
    plantilla_oid: plantillaOid,
    modo,
    composicion_firma_huella: composicion,
    firma_paciente_disponible: !!firmaPacienteFinal,
    firma_acudiente_disponible: !!binFirmaAcudiente,
    huella_disponible: !!binHuella,
    // Diagnóstico: tamaño real de lo que se manda. 0 = la firma no llegó.
    firma_paciente_bytes: firmaPacienteFinal ? Buffer.from(firmaPacienteFinal.data, 'base64').length : 0,
    firma_acudiente_bytes: binFirmaAcudiente ? Buffer.from(binFirmaAcudiente.data, 'base64').length : 0,
    valido: errores.length === 0,
    errores,
  },
  binary: {
    ...(firmaPacienteFinal && { hcpacfir: firmaPacienteFinal }),
    ...(binFirmaAcudiente && { hcrepfir: binFirmaAcudiente }),
  },
}];
