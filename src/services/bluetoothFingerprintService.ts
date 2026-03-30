/**
 * bluetoothFingerprintService.ts
 * Integración con lector de huellas Bluetooth LRB SHU0809
 * usando Web Bluetooth API (BLE GATT).
 *
 * Protocolo: LRB/FT (header 0x46 0x54)
 * - Igual al SDK iOS (BluetoothControl.m) y Android (BluetoothReader.java)
 *
 * BLE UART:
 *   Servicio : fff0
 *   TX (notify, datos del dispositivo → app): fff1
 *   RX (write, comandos app → dispositivo):   fff2
 *
 * Formato de comando:
 *   [0x46, 0x54, 0x00, 0x00, cmd, lenL, lenH, ...data, csumL, csumH]
 *
 * Comandos usados:
 *   0x11 CMD_GETDEVTYPE  → detecta tipo de sensor → determina tamaño imagen
 *   0x30 CMD_GETSTDIMAGE → captura imagen estándar (256×288 o 152×200)
 *   0x32 CMD_GETRESIMAGE → captura imagen real (256×360)
 */

/// <reference types="@types/web-bluetooth" />

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────
const SERVICE_UUID  = "0000fff0-0000-1000-8000-00805f9b34fb";
const TX_CHAR_UUID  = "0000fff1-0000-1000-8000-00805f9b34fb"; // notify (device→app)
const RX_CHAR_UUID  = "0000fff2-0000-1000-8000-00805f9b34fb"; // write  (app→device)

// ─── LRB/FT Protocol ──────────────────────────────────────────────────────────
const CMD_GETDEVTYPE  = 0x11;
const CMD_GETSTDIMAGE = 0x30;
const CMD_GETRESIMAGE = 0x32;
const CMD_AURA_LED    = 0x35;

// Device types → image size
const DEVTYPE_BFM  = 0x01021701;
const DEVTYPE_BFMF = 0x05021701;
const DEVTYPE_IMD  = 0x01021601;
const DEVTYPE_IMDF = 0x05021601;
const DEVTYPE_FPC  = 0x01021101;
const DEVTYPE_FPCF = 0x05021101;

interface ImageConfig {
  revSize: number;   // compressed bytes to receive
  width:   number;
  height:  number;
  cmd:     number;   // which capture command to use
}

function getImageConfig(devType: number): ImageConfig {
  switch (devType) {
    case DEVTYPE_BFM:
    case DEVTYPE_BFMF:
    case DEVTYPE_IMD:
    case DEVTYPE_IMDF:
      return { revSize: 46080, width: 256, height: 360, cmd: CMD_GETRESIMAGE };
    case DEVTYPE_FPC:
    case DEVTYPE_FPCF:
      return { revSize: 15200, width: 152, height: 200, cmd: CMD_GETSTDIMAGE };
    default:
      return { revSize: 36864, width: 256, height: 288, cmd: CMD_GETSTDIMAGE };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type BtStatus =
  | "unavailable"
  | "disconnected"
  | "connecting"
  | "connected"
  | "capturing"
  | "error";

export interface BtReaderInfo {
  status:      BtStatus;
  deviceName?: string;
  error?:      string;
}

export interface BtCaptureResult {
  success:        boolean;
  imageBase64?:   string;
  error?:         string;
}

type EventCallback = (data: any) => void;

// ─── Service ──────────────────────────────────────────────────────────────────
class BluetoothFingerprintService {
  private device:     BluetoothDevice | null = null;
  private server:     BluetoothRemoteGATTServer | null = null;
  private txChar:     BluetoothRemoteGATTCharacteristic | null = null; // notify
  private rxChar:     BluetoothRemoteGATTCharacteristic | null = null; // write
  private status:     BtStatus = "disconnected";
  private deviceName: string | null = null;
  private lastError:  string | null = null;

  // Image assembly
  private imgBuf:     Uint8Array = new Uint8Array(0);
  private imgConfig:  ImageConfig = getImageConfig(0);
  private isCapturing = false;
  private captureResolve: ((r: BtCaptureResult) => void) | null = null;
  private captureTimeout: ReturnType<typeof setTimeout> | null = null;

  // Command response
  private cmdBuf:     Uint8Array = new Uint8Array(0);
  private pendingCmd: number | null = null;
  private cmdResolve: ((payload: Uint8Array) => void) | null = null;
  private cmdReject:  ((err: Error) => void) | null = null;
  private cmdTimer:   ReturnType<typeof setTimeout> | null = null;

  // Diagnostics
  private _diagLog: { ts: number; msg: string }[] = [];

  private listeners: Map<string, Set<EventCallback>> = new Map();

  // ── Public API ───────────────────────────────────────────────────────────────

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "capturing";
  }

  getInfo(): BtReaderInfo {
    return {
      status:     this.status,
      deviceName: this.deviceName ?? undefined,
      error:      this.lastError  ?? undefined,
    };
  }

  getDiagnostics() {
    return {
      status:               this.status,
      deviceName:           this.deviceName,
      lastError:            this.lastError,
      webBluetoothSupported: this.isSupported(),
      gattConnected:        this.server?.connected ?? false,
      log:                  this._diagLog.slice(-60),
    };
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("Web Bluetooth no está soportado en este navegador");
    }

    this._setStatus("connecting");
    this._addDiag("▶ Solicitando dispositivo BLE...");

    try {
      // Mostrar TODOS los dispositivos BLE para que el usuario seleccione el SHU0809
      const device = await (navigator.bluetooth as any).requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });

      this.device     = device;
      this.deviceName = device.name ?? "SHU0809";
      this._addDiag(`✓ Dispositivo: ${this.deviceName}`);

      device.addEventListener("gattserverdisconnected", () => {
        this._addDiag("✗ GATT desconectado");
        this._cleanup();
        this._setStatus("disconnected");
      });

      const server = await device.gatt!.connect();
      this.server = server;
      this._addDiag("✓ GATT conectado");

      const service = await server.getPrimaryService(SERVICE_UUID);
      this._addDiag("✓ Servicio fff0 encontrado");

      // TX = notify (fff1) — datos del sensor hacia la app
      this.txChar = await service.getCharacteristic(TX_CHAR_UUID);
      await this.txChar.startNotifications();
      this.txChar.addEventListener(
        "characteristicvaluechanged",
        this._onNotify.bind(this) as EventListener,
      );
      this._addDiag("✓ Notifications activadas (fff1)");

      // RX = write (fff2) — comandos de la app hacia el sensor
      this.rxChar = await service.getCharacteristic(RX_CHAR_UUID);
      this._addDiag("✓ Write char listo (fff2)");

      // Query device type to set correct image size
      try {
        await this._queryDeviceType();
      } catch {
        this._addDiag("! No se obtuvo tipo de dispositivo — usando 256×288");
      }

      this._setStatus("connected");
      this._addDiag("✓ Listo para capturar");
    } catch (err: any) {
      this.lastError = err?.message ?? "Error de conexión";
      this._addDiag(`✗ ${this.lastError}`);
      this._setStatus("error");
      throw err;
    }
  }

  async startCapture(timeoutMs = 30000): Promise<BtCaptureResult> {
    if (!this.isConnected() || !this.rxChar) {
      return { success: false, error: "Lector no conectado" };
    }
    if (this.isCapturing) {
      return { success: false, error: "Captura ya en progreso" };
    }

    return new Promise<BtCaptureResult>((resolve) => {
      this.captureResolve = resolve;
      this.isCapturing    = true;
      this.imgBuf         = new Uint8Array(0);
      this._setStatus("capturing");
      this._addDiag("▶ Iniciando captura...");

      this.captureTimeout = setTimeout(() => {
        const bytes = this.imgBuf.length;
        this._addDiag(`✗ Timeout (${bytes} bytes, fase: ${this.isCapturing ? "capturando" : "idle"})`);
        this._finishCapture({
          success: false,
          error:   `Tiempo de espera agotado (${bytes} bytes recibidos). Coloque el dedo en el lector e intente de nuevo.`,
        });
      }, timeoutMs);

      // Send LED on + capture command
      this._sendLed(true)
        .then(() => this._sendCommand(this.imgConfig.cmd))
        .catch((err) => {
          this._finishCapture({
            success: false,
            error: err?.message ?? "Error enviando comando de captura",
          });
        });
    });
  }

  cancelCapture(): void {
    if (this.isCapturing) {
      this._finishCapture({ success: false, error: "Cancelado por el usuario" });
    }
  }

  disconnect(): void {
    this._cleanup();
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device     = null;
    this.server     = null;
    this.deviceName = null;
    this._setStatus("disconnected");
    this._addDiag("Desconectado");
  }

  on(event: string, cb: EventCallback)  {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }
  off(event: string, cb: EventCallback) {
    this.listeners.get(event)?.delete(cb);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private async _queryDeviceType(): Promise<void> {
    this._addDiag("▶ Consultando tipo de dispositivo...");
    const payload = await this._sendCommandAndWaitResponse(CMD_GETDEVTYPE, 3000);
    // Response: [result(1), devType(4 bytes big-endian)]
    if (payload.length >= 5 && payload[0] === 1) {
      const devType =
        (payload[1] << 24) | (payload[2] << 16) | (payload[3] << 8) | payload[4];
      this.imgConfig = getImageConfig(devType >>> 0);
      this._addDiag(
        `✓ DevType: 0x${(devType >>> 0).toString(16)} → ${this.imgConfig.width}×${this.imgConfig.height}`,
      );
    }
  }

  /** Send a command and wait for the ACK response payload */
  private _sendCommandAndWaitResponse(cmd: number, timeoutMs: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.pendingCmd  = cmd;
      this.cmdBuf      = new Uint8Array(0);
      this.cmdResolve  = resolve;
      this.cmdReject   = reject;
      this.cmdTimer    = setTimeout(() => {
        this.pendingCmd = null;
        this.cmdResolve = null;
        this.cmdReject  = null;
        reject(new Error(`Timeout esperando respuesta al comando 0x${cmd.toString(16)}`));
      }, timeoutMs);

      this._sendCommand(cmd).catch(reject);
    });
  }

  /** Build and send LRB/FT command packet */
  private async _sendCommand(cmd: number, data?: Uint8Array): Promise<void> {
    if (!this.rxChar) throw new Error("Sin característica de escritura");

    const dataLen = data?.length ?? 0;
    const buf = new Uint8Array(dataLen + 9);
    buf[0] = 0x46;  // 'F'
    buf[1] = 0x54;  // 'T'
    buf[2] = 0x00;
    buf[3] = 0x00;
    buf[4] = cmd;
    buf[5] = dataLen & 0xFF;
    buf[6] = (dataLen >> 8) & 0xFF;
    if (data) buf.set(data, 7);

    let sum = 0;
    for (let i = 0; i < 7 + dataLen; i++) sum += buf[i];
    buf[7 + dataLen] = sum & 0xFF;
    buf[8 + dataLen] = (sum >> 8) & 0xFF;

    // BLE MTU ≈ 20 bytes — split into chunks
    const CHUNK = 20;
    for (let i = 0; i < buf.length; i += CHUNK) {
      const chunk = buf.slice(i, i + CHUNK);
      await this.rxChar.writeValueWithoutResponse(chunk);
    }

    this._addDiag(`▶ CMD 0x${cmd.toString(16)} (${buf.length} bytes)`);
  }

  private async _sendLed(on: boolean): Promise<void> {
    const ctrl  = on ? 0x01 : 0x04;
    const color = on ? 0x02 : 0x00;
    await this._sendCommand(CMD_AURA_LED, new Uint8Array([ctrl, 0x50, color, 0x00]));
  }

  /** Handle incoming BLE notifications */
  private _onNotify(event: Event): void {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;

    const chunk = new Uint8Array(char.value.buffer);
    this._addDiag(`◀ ${chunk.length} bytes`);

    if (this.isCapturing) {
      // Accumulate image bytes
      const merged = new Uint8Array(this.imgBuf.length + chunk.length);
      merged.set(this.imgBuf);
      merged.set(chunk, this.imgBuf.length);
      this.imgBuf = merged;

      if (this.imgBuf.length >= this.imgConfig.revSize) {
        this._addDiag(`✓ Imagen completa (${this.imgBuf.length} bytes)`);
        const raw = this.imgBuf.slice(0, this.imgConfig.revSize);
        const base64 = this._buildPng(raw);
        this._finishCapture({ success: true, imageBase64: base64 });
      }
    } else if (this.pendingCmd !== null) {
      // Accumulate command response
      const merged = new Uint8Array(this.cmdBuf.length + chunk.length);
      merged.set(this.cmdBuf);
      merged.set(chunk, this.cmdBuf.length);
      this.cmdBuf = merged;

      // Parse LRB response: [0x46, 0x54, 0x00, 0x00, cmd, lenL, lenH, ...payload, csumL, csumH]
      if (this.cmdBuf.length >= 9) {
        const dataLen = this.cmdBuf[5] + (this.cmdBuf[6] << 8);
        const totalLen = dataLen + 9;
        if (this.cmdBuf.length >= totalLen &&
            this.cmdBuf[0] === 0x46 && this.cmdBuf[1] === 0x54) {
          const payload = this.cmdBuf.slice(7, 7 + dataLen);
          if (this.cmdTimer) clearTimeout(this.cmdTimer);
          const resolve = this.cmdResolve;
          this.cmdResolve  = null;
          this.cmdReject   = null;
          this.pendingCmd  = null;
          this.cmdBuf      = new Uint8Array(0);
          resolve?.(payload);
        }
      }
    }
  }

  /** Build PNG from raw 4-bit packed image data */
  private _buildPng(raw: Uint8Array): string {
    const { width, height } = this.imgConfig;
    const pixels = new Uint8Array(width * height);

    // Expand 4-bit nibbles to 8-bit pixels
    for (let i = 0; i < raw.length && i * 2 < pixels.length; i++) {
      pixels[i * 2]     = raw[i] & 0xF0;
      if (i * 2 + 1 < pixels.length) {
        pixels[i * 2 + 1] = (raw[i] << 4) & 0xF0;
      }
    }

    // Flip vertically (BMP is bottom-up)
    for (let row = 0; row < Math.floor(height / 2); row++) {
      const top = row * width;
      const bot = (height - 1 - row) * width;
      for (let col = 0; col < width; col++) {
        const tmp = pixels[top + col];
        pixels[top + col] = pixels[bot + col];
        pixels[bot + col] = tmp;
      }
    }

    // Draw to canvas and export as PNG base64
    const canvas  = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < pixels.length; i++) {
      imgData.data[i * 4]     = pixels[i]; // R
      imgData.data[i * 4 + 1] = pixels[i]; // G
      imgData.data[i * 4 + 2] = pixels[i]; // B
      imgData.data[i * 4 + 3] = 255;       // A
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  private _finishCapture(result: BtCaptureResult): void {
    if (this.captureTimeout) {
      clearTimeout(this.captureTimeout);
      this.captureTimeout = null;
    }
    this.isCapturing = false;
    this.imgBuf      = new Uint8Array(0);
    this._sendLed(false).catch(() => {});
    this._setStatus("connected");

    const resolve       = this.captureResolve;
    this.captureResolve = null;
    resolve?.(result);
  }

  private _cleanup(): void {
    if (this.captureTimeout) clearTimeout(this.captureTimeout);
    if (this.cmdTimer)       clearTimeout(this.cmdTimer);
    this.isCapturing    = false;
    this.captureResolve = null;
    this.cmdResolve     = null;
    this.cmdReject      = null;
    this.pendingCmd     = null;
    this.imgBuf         = new Uint8Array(0);
    this.cmdBuf         = new Uint8Array(0);
  }

  private _setStatus(s: BtStatus): void {
    this.status = s;
    this.emit("statusChange", this.getInfo());
  }

  private _addDiag(msg: string): void {
    this._diagLog.push({ ts: Date.now(), msg });
    if (this._diagLog.length > 80) this._diagLog.shift();
    this.emit("diagnostics", this.getDiagnostics());
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(data); } catch { /* ignore */ }
    });
  }
}

export const bluetoothFingerprintService = new BluetoothFingerprintService();
