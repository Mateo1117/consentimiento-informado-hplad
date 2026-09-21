// ═════════════════════════════════════════════════════════════════════════════
// PARCHE para el nodo "Code in JavaScript1" del flujo original (FLUJO APIS MESA)
//
// Pegar TODO este código dentro del nodo, reemplazando el que tiene.
// Además, la salida "Sin huella" del Switch debe conectarse a ESTE nodo
// (hoy va directa a "Crear Consentimiento2", por eso el POST falla con
// "expects the node's input data to contain a binary file 'data'").
//
// Qué arregla:
//  · La firma que llega como "data:image/png;base64,..." (cuando a la app le
//    falla la subida a Storage) ahora se decodifica aquí; el nodo de descarga
//    no puede con ese esquema y era el "Invalid URL" de las ejecuciones rojas.
//  · Binarios guardados en disco/S3 (data vacío + id) se resuelven igual.
//  · Si hay huella, se compone firma+huella en un PNG gris liviano; ante
//    cualquier problema se manda la firma sola (nunca se pierde la firma).
//  · Ya no se genera ningún PDF/imagen de relleno: sin firma real, el flujo
//    se detiene con un error que explica exactamente qué llegó.
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

// ── Motor PNG (decodificar, componer y recomprimir) ──────────────────────────
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
  // Tamaño contenido a propósito: si el sandbox de n8n no deja usar zlib, el PNG
  // sale sin comprimir y pesa ancho*alto bytes. A 760x340 son ~260 kB en el peor
  // caso (con zlib baja a unas pocas decenas de kB).
  const W = 760, H = 340, PAD = 18, DIV = 3;
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


// ── Resolver las imágenes de esta rama ───────────────────────────────────────
const binFirma = await resolver(
  () => $('firma paciente').first(), 'data', body.paciente_firma, 'firma_paciente.png');

// En la rama "Sin huella" el nodo 'huella paciente' no corre: el try/catch de
// resolver() lo tolera y aquí simplemente no habrá huella.
const binHuella = await resolver(
  () => $('huella paciente').first(), 'data', body.paciente_foto, 'huella_paciente.png');

if (!binFirma) {
  throw new Error(
    'No se pudo obtener la firma del paciente: ' + comoLlego(body.paciente_firma)
    + '. Sin firma real no se crea el consentimiento (antes se enviaba un PDF '
    + 'vacío y quedaban consentimientos sin firma en la historia clínica).'
  );
}

// ── Firma final: compuesta con la huella si se puede, intacta si no ──────────
let firmaFinal = binFirma;
let composicion = binHuella ? 'pendiente' : 'sin_huella';

if (binFirma && binHuella) {
  const ambosPng = String(binFirma.mimeType || '').includes('png')
    && String(binHuella.mimeType || '').includes('png');
  if (!ambosPng) {
    composicion = 'omitida_formato_no_png';
  } else {
    try {
      const compuesto = componerFirmaYHuella(
        pngARgb(Buffer.from(binFirma.data, 'base64')),
        pngARgb(Buffer.from(binHuella.data, 'base64')),
      );
      firmaFinal = { data: compuesto.toString('base64'), mimeType: 'image/png',
                     fileName: 'firma_huella_paciente.png', fileExtension: 'png' };
      composicion = 'ok';
    } catch (e) {
      composicion = 'fallo: ' + e.message; // mejor la firma sola que ninguna
    }
  }
}

return [{
  json: {
    ...$input.first().json,
    _firma: {
      origen_firma: binFirma.origen,
      origen_huella: binHuella ? binHuella.origen : 'ausente',
      composicion,
    },
  },
  binary: { data: soloBinario(firmaFinal) },
}];
