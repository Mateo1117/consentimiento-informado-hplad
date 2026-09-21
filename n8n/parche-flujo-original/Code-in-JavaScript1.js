let item = $input.item;

const firmaItem  = $('firma paciente').item;

// ── CORRECCIÓN 1: en la rama "Sin huella" el nodo 'huella paciente' no corre;
// leerlo directo tumbaba este nodo. ──
let huellaItem = null;
try { huellaItem = $('huella paciente').item; } catch (e) { huellaItem = null; }

// ── CORRECCIÓN 2: exigir que el binario traiga contenido de verdad
// (cuando la descarga falla queda el item sin binario o con data vacío). ──
let hasFirma  = !!(firmaItem  && firmaItem.binary  && firmaItem.binary.data  && firmaItem.binary.data.data);
let hasHuella = !!(huellaItem && huellaItem.binary && huellaItem.binary.data && huellaItem.binary.data.data);

// ── CORRECCIÓN 3: cuando a la app le falla la subida a Storage manda la imagen
// como "data:image/png;base64,..." y el nodo de descarga falla con Invalid URL.
// Aquí se decodifica ese caso para no perder la firma (era la causa de las
// ejecuciones rojas: "expects ... binary file 'data', but none was found"). ──
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

let firmaBinario = hasFirma ? firmaItem.binary.data : null;
if (!firmaBinario) {
  firmaBinario = desdeDataUri(cuerpoWh.paciente_firma, 'firma_paciente.png');
  hasFirma = !!firmaBinario;
}

let huellaBinario = hasHuella ? huellaItem.binary.data : null;
if (!huellaBinario) {
  huellaBinario = desdeDataUri(cuerpoWh.paciente_foto, 'huella_paciente.png');
  hasHuella = !!huellaBinario;
}

const pdfVacio = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+Pj4+Pj4vQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNTU+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFNpbiBpbmZvcm1hY2lvbikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyODYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozOTEKJSVFT0Y=';

// ─── Inflate puro sin librerías ───────────────────────────────────────────────
function inflateSync(compressed) {
  let bytePos = 2, bitBuf = 0, bitLen = 0;
  function needBits(n) { while (bitLen < n) { bitBuf |= compressed[bytePos++] << bitLen; bitLen += 8; } }
  function takeBits(n) { needBits(n); const v = bitBuf & ((1 << n) - 1); bitBuf >>= n; bitLen -= n; return v; }
  function buildTable(lengths, maxSym) {
    const maxLen = Math.max(...lengths);
    if (maxLen === 0) return { byLen: [], maxLen: 0 };
    const count = new Array(maxLen + 1).fill(0);
    for (let i = 0; i <= maxSym; i++) if (lengths[i]) count[lengths[i]]++;
    const startC = new Array(maxLen + 1).fill(0); let c = 0;
    for (let l = 1; l <= maxLen; l++) { c = (c + count[l - 1]) << 1; startC[l] = c; }
    const byLen = []; for (let l = 0; l <= maxLen; l++) byLen.push({});
    for (let i = 0; i <= maxSym; i++) { const l = lengths[i]; if (l > 0) { byLen[l][startC[l]] = i; startC[l]++; } }
    return { byLen: byLen, maxLen: maxLen };
  }
  function readSym(tree) {
    let code = 0;
    for (let len = 1; len <= tree.maxLen; len++) { code = (code << 1) | takeBits(1); const sym = tree.byLen[len][code]; if (sym !== undefined) return sym; }
    throw new Error('bad sym');
  }
  const fixLL = []; for (let i=0;i<144;i++) fixLL.push(8); for (let i=144;i<256;i++) fixLL.push(9); for (let i=256;i<280;i++) fixLL.push(7); for (let i=280;i<288;i++) fixLL.push(8);
  const fixD = new Array(32).fill(5);
  const lEx = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const lBs = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const dEx = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const dBs = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const out = [];
  function block(lt, dt) {
    while (true) {
      const s = readSym(lt);
      if (s < 256) { out.push(s); }
      else if (s === 256) { break; }
      else { const ei=s-257; const length=lBs[ei]+takeBits(lEx[ei]); const ds=readSym(dt); const dist=dBs[ds]+takeBits(dEx[ds]); const st=out.length-dist; for (let i=0;i<length;i++) out.push(out[st+i]); }
    }
  }
  let fin = 0;
  while (!fin) {
    fin = takeBits(1); const tp = takeBits(2);
    if (tp === 0) { bitBuf=0; bitLen=0; const len=compressed[bytePos]|(compressed[bytePos+1]<<8); bytePos+=4; for (let i=0;i<len;i++) out.push(compressed[bytePos++]); }
    else if (tp === 1) { block(buildTable(fixLL, 287), buildTable(fixD, 31)); }
    else if (tp === 2) {
      const hl=takeBits(5)+257, hd=takeBits(5)+1, hc=takeBits(4)+4;
      const clo=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
      const cl=new Array(19).fill(0); for (let i=0;i<hc;i++) cl[clo[i]]=takeBits(3);
      const ct=buildTable(cl,18); const lens=[];
      while (lens.length < hl+hd) {
        const s=readSym(ct);
        if (s<16) { lens.push(s); }
        else if (s===16) { const r=takeBits(2)+3; const p=lens[lens.length-1]; for (let i=0;i<r;i++) lens.push(p); }
        else if (s===17) { const r=takeBits(3)+3; for (let i=0;i<r;i++) lens.push(0); }
        else { const r=takeBits(7)+11; for (let i=0;i<r;i++) lens.push(0); }
      }
      block(buildTable(lens.slice(0,hl),hl-1), buildTable(lens.slice(hl),hd-1));
    }
  }
  return Buffer.from(out);
}

// ─── PNG → pixels RGB raw ─────────────────────────────────────────────────────
function pngToRgb(pngBuffer) {
  let width, height, colorType;
  const idatChunks = [];
  let offset = 8;
  while (offset < pngBuffer.length - 8) {
    const chunkLen = pngBuffer.readUInt32BE(offset);
    const chunkType = pngBuffer.slice(offset+4, offset+8).toString('ascii');
    const chunkData = pngBuffer.slice(offset+8, offset+8+chunkLen);
    if (chunkType === 'IHDR') { width=chunkData.readUInt32BE(0); height=chunkData.readUInt32BE(4); colorType=chunkData[9]; }
    else if (chunkType === 'IDAT') { idatChunks.push(chunkData); }
    else if (chunkType === 'IEND') { break; }
    offset += 12 + chunkLen;
  }
  const decompressed = inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType===6?4:colorType===4?2:colorType===0?1:3;
  const isGray = colorType===0||colorType===4;
  const stride = width * bpp;
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const ft = decompressed[y*(stride+1)];
    const row = decompressed.slice(y*(stride+1)+1, y*(stride+1)+1+stride);
    const out = Buffer.alloc(stride);
    const prev = rawRows[y-1] || Buffer.alloc(stride, 0);
    for (let x = 0; x < stride; x++) {
      const a=x>=bpp?out[x-bpp]:0, b=prev[x], c=x>=bpp?prev[x-bpp]:0;
      if (ft===0) out[x]=row[x];
      else if (ft===1) out[x]=(row[x]+a)&0xFF;
      else if (ft===2) out[x]=(row[x]+b)&0xFF;
      else if (ft===3) out[x]=(row[x]+Math.floor((a+b)/2))&0xFF;
      else if (ft===4) { const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); out[x]=(row[x]+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&0xFF; }
      else out[x]=row[x];
    }
    rawRows.push(out);
  }
  const rgb = Buffer.alloc(width*height*3);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const row = rawRows[y];
    for (let x = 0; x < width; x++) {
      if (isGray) { const g=row[x*bpp]; rgb[pos++]=g; rgb[pos++]=g; rgb[pos++]=g; }
      else { rgb[pos++]=row[x*bpp]; rgb[pos++]=row[x*bpp+1]; rgb[pos++]=row[x*bpp+2]; }
    }
  }
  return { width: width, height: height, rgb: rgb };
}

// ─── Decodificar imagen (PNG o JPEG→PNG raw) ──────────────────────────────────
function decodeImg(binaryData) {
  const buf = Buffer.from(binaryData.data, 'base64');
  const isPng = binaryData.mimeType.includes('png');
  if (isPng) {
    return pngToRgb(buf);
  } else {
    // JPEG: leer dimensiones
    let w = 400, h = 400;
    for (let i = 0; i < buf.length-8; i++) {
      if (buf[i]===0xFF && (buf[i+1]===0xC0||buf[i+1]===0xC2)) { h=buf.readUInt16BE(i+5); w=buf.readUInt16BE(i+7); break; }
    }
    // Para JPEG sin decodificador, crear imagen gris placeholder con dimensiones correctas
    const rgb = Buffer.alloc(w*h*3, 180);
    return { width: w, height: h, rgb: rgb, isJpegPlaceholder: true, jpegBuf: buf };
  }
}

// ─── CRC32 para PNG ───────────────────────────────────────────────────────────
function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1;
    table.push(c);
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

// ─── Deflate nivel 0 (sin compresión, compatible con todos los viewers) ───────
function deflateNoCompress(data) {
  const BLOCK = 65535;
  const blocks = [];
  // zlib header: CMF=0x78, FLG=0x01 (no compression)
  blocks.push(Buffer.from([0x78, 0x01]));
  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + BLOCK, data.length);
    const chunk = data.slice(offset, end);
    const isLast = end >= data.length ? 1 : 0;
    const len = chunk.length;
    const nlen = (~len) & 0xFFFF;
    blocks.push(Buffer.from([
      isLast,
      len & 0xFF, (len >> 8) & 0xFF,
      nlen & 0xFF, (nlen >> 8) & 0xFF
    ]));
    blocks.push(chunk);
    offset = end;
  }
  // Adler-32 checksum
  let s1 = 1, s2 = 0;
  for (let i = 0; i < data.length; i++) { s1=(s1+data[i])%65521; s2=(s2+s1)%65521; }
  const adler = (s2<<16)|s1;
  blocks.push(Buffer.from([(adler>>24)&0xFF,(adler>>16)&0xFF,(adler>>8)&0xFF,adler&0xFF]));
  return Buffer.concat(blocks);
}

// ─── Construir PNG desde pixels RGB ──────────────────────────────────────────
function buildPng(width, height, rgbBuf) {
  function u32be(n) { return Buffer.from([(n>>24)&0xFF,(n>>16)&0xFF,(n>>8)&0xFF,n&0xFF]); }
  function pngChunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const crcVal = crc32(Buffer.concat([t, d]));
    return Buffer.concat([u32be(d.length), t, d, u32be(crcVal)]);
  }

  // IHDR
  const ihdr = Buffer.concat([u32be(width), u32be(height), Buffer.from([8, 2, 0, 0, 0])]);

  // Aplicar filtro 0 (None) a cada fila para los datos IDAT
  const rawRows = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    rawRows[y * (width*3+1)] = 0; // filtro None
    rgbBuf.copy(rawRows, y*(width*3+1)+1, y*width*3, (y+1)*width*3);
  }

  const compressed = deflateNoCompress(rawRows);
  const idat = pngChunk('IDAT', compressed);
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), idat, pngChunk('IEND', Buffer.alloc(0))]);
}

// ─── Componer imagen unificada: firma izquierda | huella derecha ──────────────
function buildImagenUnificada(img1, img2) {
  const OUT_W = 1200;
  const OUT_H = 600;
  const PADDING = 30;
  const DIVIDER = 4;
  const halfW = Math.floor(OUT_W / 2);
  const imgAreaW = halfW - PADDING * 2;
  const imgAreaH = OUT_H - PADDING * 2;

  // Canvas RGB blanco
  const canvas = Buffer.alloc(OUT_W * OUT_H * 3, 255);

  function setPixel(x, y, r, g, b) {
    if (x < 0 || x >= OUT_W || y < 0 || y >= OUT_H) return;
    const i = (y * OUT_W + x) * 3;
    canvas[i] = r; canvas[i+1] = g; canvas[i+2] = b;
  }

  function getPixel(x, y) {
    if (x < 0 || x >= OUT_W || y < 0 || y >= OUT_H) return [255,255,255];
    const i = (y * OUT_W + x) * 3;
    return [canvas[i], canvas[i+1], canvas[i+2]];
  }

  // Dibujar línea divisoria vertical gris
  for (let y = 0; y < OUT_H; y++) {
    for (let d = 0; d < DIVIDER; d++) {
      setPixel(halfW - Math.floor(DIVIDER/2) + d, y, 180, 180, 180);
    }
  }

  // Escalar y copiar imagen con nearest-neighbor
  function drawImg(img, destX, destY, destW, destH) {
    if (!img) return;
    // Calcular tamaño manteniendo aspect ratio
    const ratioW = destW / img.width;
    const ratioH = destH / img.height;
    const ratio = Math.min(ratioW, ratioH);
    const drawW = Math.round(img.width * ratio);
    const drawH = Math.round(img.height * ratio);
    // Centrar en el área
    const offX = destX + Math.round((destW - drawW) / 2);
    const offY = destY + Math.round((destH - drawH) / 2);

    for (let py = 0; py < drawH; py++) {
      for (let px = 0; px < drawW; px++) {
        const srcX = Math.floor(px / ratio);
        const srcY = Math.floor(py / ratio);
        const si = (srcY * img.width + srcX) * 3;
        const r = img.rgb[si], g = img.rgb[si+1], b = img.rgb[si+2];
        setPixel(offX + px, offY + py, r, g, b);
      }
    }
  }

  // Dibujar firma (izquierda)
  if (img1 && !img1.isJpegPlaceholder) {
    drawImg(img1, PADDING, PADDING, imgAreaW, imgAreaH);
  } else {
    // Sin firma: texto indicador (dibujar rectángulo gris claro)
    for (let y = PADDING; y < OUT_H-PADDING; y++) {
      for (let x = PADDING; x < halfW-PADDING; x++) {
        setPixel(x, y, 240, 240, 240);
      }
    }
  }

  // Dibujar huella (derecha)
  if (img2 && !img2.isJpegPlaceholder) {
    drawImg(img2, halfW + PADDING, PADDING, imgAreaW, imgAreaH);
  } else {
    for (let y = PADDING; y < OUT_H-PADDING; y++) {
      for (let x = halfW+PADDING; x < OUT_W-PADDING; x++) {
        setPixel(x, y, 240, 240, 240);
      }
    }
  }

  return buildPng(OUT_W, OUT_H, canvas);
}

// ─── Ejecutar ─────────────────────────────────────────────────────────────────
// ── CORRECCIÓN 4: sin firma no hay nada que enviar; parar aquí con un mensaje
// claro en vez de dejar que el POST falle sin explicación. ──
if (!hasFirma) {
  throw new Error('No llegó la firma del paciente: ni la descargó "firma paciente" ni venía como data URI en paciente_firma.');
}

// ── CORRECCIÓN 5: sólo se compone cuando HAY huella; sin huella la firma va
// tal cual (que es lo que hacía la rama "Sin huella" cuando iba directa al
// POST). Y si la composición falla por lo que sea, se manda la firma sola:
// mejor perder la composición que perder la firma. ──
let binarioFirmaFinal = firmaBinario;
if (hasHuella) {
  try {
    const img1 = decodeImg(firmaBinario);
    const img2 = decodeImg(huellaBinario);
    const pngUnificado = buildImagenUnificada(img1, img2);
    binarioFirmaFinal = {
      data: pngUnificado.toString('base64'),
      mimeType: 'image/png',
      fileName: 'firma_huella_paciente.png',
      fileExtension: 'png'
    };
  } catch (e) {
    binarioFirmaFinal = firmaBinario;
  }
}

const output = {
  json: {
    ...item.json,
    _binarios: { firma_presente: hasFirma, huella_presente: hasHuella }
  },
  binary: {
    data: binarioFirmaFinal,
    'data rep': (function() {
      const W = 400, H = 200;
      const blankRgb = Buffer.alloc(W * H * 3, 255);
      const blankPng = buildPng(W, H, blankRgb);
      return {
        data: blankPng.toString('base64'),
        mimeType: 'image/png',
        fileName: 'sin_firma_acudiente.png',
        fileExtension: 'png'
      };
    })()
  }
};

return output;