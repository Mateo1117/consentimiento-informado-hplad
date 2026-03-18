/**
 * bluetoothFingerprintService.ts
 * Integración con lector de huellas Bluetooth SHU0809 (Starhightech / HBRT-809)
 * usando Web Bluetooth API (BLE GATT).
 *
 * Protocolo: Synochip/ZhianTec (AS608/FPM10A compatible)
 * Flujo de captura:
 *   1. Enviar GenImg repetidamente hasta que el sensor detecte un dedo (ACK=0x00)
 *   2. Enviar Img2Tz (char buffer 1) para convertir imagen a template
 *   3. Enviar UpImage para recibir la imagen raw del sensor
 *   4. Recibir paquetes DATA/END con la imagen
 *
 * BLE UART: Servicio 0xFFF0, Write 0xFFF1, Notify 0xFFF2
 */

/// <reference types="@types/web-bluetooth" />
import { logger } from "@/utils/logger";

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────
const BLE_SERVICE_UUIDS = [
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
];

const WRITE_CHAR_UUIDS = [
  "0000fff1-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
];

const NOTIFY_CHAR_UUIDS = [
  "0000fff2-0000-1000-8000-00805f9b34fb",
  "0000ffe2-0000-1000-8000-00805f9b34fb",
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
];

// ─── Synochip Protocol Constants ──────────────────────────────────────────────
const HEADER = 0xef01;
const DEFAULT_ADDR = 0xffffffff;

const PID_COMMAND = 0x01;
const PID_DATA    = 0x02;
const PID_ACK     = 0x07;
const PID_END     = 0x08;

// Commands
const CMD_GEN_IMG     = 0x01; // Capture fingerprint image
const CMD_IMG2TZ      = 0x02; // Generate character file from image
const CMD_UP_IMAGE    = 0x0a; // Upload image to host
const CMD_READ_PARAM  = 0x0f; // Read system parameters
const CMD_AURA_LED    = 0x35; // Control LED

// ACK confirmation codes
const ACK_OK             = 0x00;
const ACK_PACKET_ERR     = 0x01;
const ACK_NO_FINGER      = 0x02;
const ACK_ENROLL_FAIL    = 0x03;
const ACK_IMG_MESSY       = 0x06;
const ACK_IMG_SMALL       = 0x07;
const ACK_NO_MATCH        = 0x08;

// ─── Types ────────────────────────────────────────────────────────────────────
export type BtStatus = "unavailable" | "disconnected" | "connecting" | "connected" | "capturing" | "error";

export interface BtReaderInfo {
  status: BtStatus;
  deviceName?: string;
  error?: string;
  batteryLevel?: number;
}

export interface BtCaptureResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

type EventCallback = (data: any) => void;

// ─── Capture state machine ───────────────────────────────────────────────────
type CapturePhase =
  | "idle"
  | "polling_genimg"      // Polling GenImg waiting for finger
  | "waiting_upimage_ack" // Sent UpImage, waiting for ACK
  | "receiving_image"     // Receiving DATA/END packets with image
  ;

// ─── Service class ────────────────────────────────────────────────────────────
class BluetoothFingerprintService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private allChars: BluetoothRemoteGATTCharacteristic[] = [];
  private status: BtStatus = "disconnected";
  private deviceName: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  // Packet assembly
  private rxBuffer: Uint8Array = new Uint8Array(0);

  // Capture state
  private captureResolve: ((result: BtCaptureResult) => void) | null = null;
  private capturePhase: CapturePhase = "idle";
  private genImgTimer: ReturnType<typeof setInterval> | null = null;
  private captureTimeout: ReturnType<typeof setTimeout> | null = null;
  private imageDataChunks: Uint8Array[] = [];
  private receivedImageBytes = 0;
  private genImgAttempts = 0;

  // Diagnostics
  private lastError: string | null = null;
  private _diagLog: Array<{ ts: number; msg: string }> = [];
  private discoveredServiceUuid: string | null = null;
  private discoveredWriteUuid: string | null = null;
  private discoveredNotifyUuid: string | null = null;

  // ── Check Web Bluetooth availability ────────────────────────────────────
  isSupported(): boolean {
    return typeof navigator !== "undefined" &&
           "bluetooth" in navigator &&
           typeof (navigator as any).bluetooth?.requestDevice === "function";
  }

  getPlatform(): "android" | "ios" | "windows" | "macos" | "linux" | "unknown" {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) return "android";
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
    if (ua.includes("windows")) return "windows";
    if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "unknown";
  }

  // ── Connect to BLE fingerprint scanner ──────────────────────────────────
  async connect(): Promise<boolean> {
    this.lastError = null;
    this._diagLog = [];

    if (!this.isSupported()) {
      const platform = this.getPlatform();
      this.lastError = platform === "ios"
        ? "Web Bluetooth no disponible en Safari/Chrome iOS. Use Bluefy."
        : "Web Bluetooth no disponible. Use Chrome o Edge.";
      this._addDiag(`✗ ${this.lastError}`);
      this.status = "unavailable";
      this.emit("statusChange", this.getInfo());
      return false;
    }

    if (this.server?.connected) {
      this._addDiag("Ya conectado");
      return true;
    }

    this.status = "connecting";
    this.emit("statusChange", this.getInfo());
    this._addDiag("Solicitando dispositivo Bluetooth...");

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUIDS[0]] },
          { services: [BLE_SERVICE_UUIDS[1]] },
          { services: [BLE_SERVICE_UUIDS[2]] },
          { namePrefix: "SH" },
          { namePrefix: "FP" },
          { namePrefix: "BT809" },
          { namePrefix: "HB" },
        ],
        optionalServices: [...BLE_SERVICE_UUIDS, "battery_service"],
      });

      if (!this.device) {
        this.lastError = "No se seleccionó ningún dispositivo";
        this.status = "disconnected";
        this.emit("statusChange", this.getInfo());
        return false;
      }

      this.deviceName = this.device.name || "Lector Bluetooth";
      this._addDiag(`Dispositivo: ${this.deviceName}`);

      this.device.addEventListener("gattserverdisconnected", () => {
        this._addDiag("Dispositivo desconectado");
        this.cleanupCapture("Dispositivo desconectado durante la captura");
        this.status = "disconnected";
        this.server = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.emit("statusChange", this.getInfo());
        this.emit("disconnected", {});
      });

      this._addDiag("Conectando GATT...");
      this.server = await this.device.gatt!.connect();
      this._addDiag("GATT conectado");

      await this.discoverCharacteristics();
      await this.readBatteryLevel();

      // Verify connection with ReadSysPara
      this._addDiag("Verificando comunicación (ReadSysPara)...");
      try {
        await this.sendCommand(CMD_READ_PARAM);
        // Wait briefly for response
        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        this._addDiag(`Verificación falló (no crítico): ${err?.message}`);
      }

      this.status = "connected";
      this.emit("statusChange", this.getInfo());
      this._addDiag(`✓ Conectado a ${this.deviceName}`);
      logger.info("[BluetoothFP] Connected to", this.deviceName);
      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.lastError = msg.includes("cancel") ? "Selección cancelada" : `Error: ${msg}`;
      this._addDiag(`✗ ${this.lastError}`);
      this.status = "disconnected";
      this.emit("statusChange", this.getInfo());
      return false;
    }
  }

  // ── Discover BLE characteristics ────────────────────────────────────────
  private async discoverCharacteristics(): Promise<void> {
    if (!this.server) throw new Error("GATT no conectado");

    let service: BluetoothRemoteGATTService | null = null;

    for (const svcUuid of BLE_SERVICE_UUIDS) {
      try {
        service = await this.server.getPrimaryService(svcUuid);
        this._addDiag(`Servicio: ${svcUuid.substring(4, 8).toUpperCase()}`);
        break;
      } catch {
        this._addDiag(`Servicio ${svcUuid.substring(4, 8)} no disponible`);
      }
    }

    if (!service) {
      try {
        const services = await this.server.getPrimaryServices();
        this._addDiag(`Servicios disponibles: ${services.map(s => s.uuid).join(", ")}`);
        if (services.length > 0) {
          service = services[0];
          this._addDiag(`Usando: ${service.uuid}`);
        }
      } catch {
        throw new Error("No se encontró servicio GATT");
      }
    }

    if (!service) throw new Error("No se encontró servicio GATT");

    const chars = await service.getCharacteristics();
    this._addDiag(`Características: ${chars.length}`);

    for (const char of chars) {
      const props = char.properties;
      const shortUuid = char.uuid.substring(4, 8).toUpperCase();
      const w = props.write || props.writeWithoutResponse;
      const n = props.notify;
      this._addDiag(`  ${shortUuid}: W=${w} N=${n} R=${props.read}`);

      if (!this.writeChar && w) {
        this.writeChar = char;
      }
      if (!this.notifyChar && n) {
        this.notifyChar = char;
      }
    }

    if (!this.writeChar) throw new Error("Sin característica de escritura");
    if (!this.notifyChar) throw new Error("Sin característica de notificación");

    this.discoveredServiceUuid = service.uuid;
    this.discoveredWriteUuid = this.writeChar.uuid;
    this.discoveredNotifyUuid = this.notifyChar.uuid;
    this.allChars = chars;

    // Subscribe to notifications on ALL notify characteristics
    for (const char of chars) {
      if (char.properties.notify) {
        try {
          await char.startNotifications();
          char.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
          this._addDiag(`Suscrito: ${char.uuid.substring(4, 8).toUpperCase()}`);
        } catch (e: any) {
          this._addDiag(`Error suscripción ${char.uuid.substring(4, 8)}: ${e?.message}`);
        }
      }
    }
  }

  // ── Handle incoming BLE notifications ───────────────────────────────────
  private handleNotification(event: Event) {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value) return;

    const data = new Uint8Array(value.buffer);
    const hex = Array.from(data.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    this._addDiag(`◀ RX ${data.length}B: ${hex}${data.length > 40 ? '...' : ''}`);

    // Append to reassembly buffer
    const newBuf = new Uint8Array(this.rxBuffer.length + data.length);
    newBuf.set(this.rxBuffer, 0);
    newBuf.set(data, this.rxBuffer.length);
    this.rxBuffer = newBuf;

    // Try to parse complete packets from the buffer
    this.processRxBuffer();
  }

  // ── Parse reassembly buffer for complete Synochip packets ───────────────
  private processRxBuffer(): void {
    while (this.rxBuffer.length >= 12) {
      // Find 0xEF01 header
      let headerIdx = -1;
      for (let i = 0; i < this.rxBuffer.length - 1; i++) {
        if (this.rxBuffer[i] === 0xef && this.rxBuffer[i + 1] === 0x01) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx < 0) {
        // No header found — if capturing image, treat as raw continuation
        if (this.capturePhase === "receiving_image") {
          this.imageDataChunks.push(this.rxBuffer.slice());
          this.receivedImageBytes += this.rxBuffer.length;
          this.emit("progress", { received: this.receivedImageBytes });
        }
        this.rxBuffer = new Uint8Array(0);
        return;
      }

      // Discard bytes before header
      if (headerIdx > 0) {
        if (this.capturePhase === "receiving_image") {
          // Bytes before header during image receive might be image data
          this.imageDataChunks.push(this.rxBuffer.slice(0, headerIdx));
          this.receivedImageBytes += headerIdx;
        }
        this.rxBuffer = this.rxBuffer.slice(headerIdx);
      }

      // Check if we have enough data for the header fields
      if (this.rxBuffer.length < 9) return; // Need more data

      const pid = this.rxBuffer[6];
      const pktLen = (this.rxBuffer[7] << 8) | this.rxBuffer[8];
      const totalPktSize = 9 + pktLen; // header(2)+addr(4)+pid(1)+len(2) + payload+checksum

      if (this.rxBuffer.length < totalPktSize) return; // Need more data

      // Extract packet payload (exclude 2-byte checksum at end)
      const payload = this.rxBuffer.slice(9, 9 + pktLen - 2);
      
      // Move buffer past this packet
      this.rxBuffer = this.rxBuffer.slice(totalPktSize);

      // Process the complete packet
      this.handlePacket(pid, payload);
    }
  }

  // ── Handle a complete parsed packet ─────────────────────────────────────
  private handlePacket(pid: number, payload: Uint8Array): void {
    this._addDiag(`PKT pid=0x${pid.toString(16)} len=${payload.length}`);

    if (pid === PID_ACK) {
      this.handleAck(payload);
    } else if (pid === PID_DATA || pid === PID_END) {
      this.handleImagePacket(pid, payload);
    }
  }

  // ── Handle ACK packets ─────────────────────────────────────────────────
  private handleAck(payload: Uint8Array): void {
    if (payload.length === 0) return;
    const code = payload[0];
    this._addDiag(`ACK código=0x${code.toString(16)} (${this.ackDescription(code)})`);

    switch (this.capturePhase) {
      case "polling_genimg":
        if (code === ACK_OK) {
          // Finger detected, image captured successfully!
          this._addDiag("✓ Dedo detectado, imagen capturada en sensor");
          this.stopGenImgPolling();
          // Now request the image upload
          this.capturePhase = "waiting_upimage_ack";
          this._addDiag("Solicitando UpImage...");
          this.sendCommand(CMD_UP_IMAGE).catch(err => {
            this._addDiag(`✗ Error UpImage: ${err?.message}`);
          });
        } else if (code === ACK_NO_FINGER) {
          // No finger yet — polling will retry
          // Don't log every poll to avoid noise
          this.genImgAttempts++;
          if (this.genImgAttempts % 5 === 0) {
            this._addDiag(`Esperando dedo... (intento ${this.genImgAttempts})`);
          }
        } else if (code === ACK_IMG_MESSY || code === ACK_IMG_SMALL) {
          this._addDiag("Imagen de baja calidad, reintentando...");
          // Continue polling
        } else {
          this._addDiag(`⚠ GenImg error inesperado: 0x${code.toString(16)}`);
        }
        break;

      case "waiting_upimage_ack":
        if (code === ACK_OK) {
          this._addDiag("✓ UpImage aceptado, recibiendo imagen...");
          this.capturePhase = "receiving_image";
          this.imageDataChunks = [];
          this.receivedImageBytes = 0;
        } else {
          this._addDiag(`✗ UpImage rechazado: 0x${code.toString(16)}`);
          this.resolveCapture({ success: false, error: `UpImage rechazado (código ${code})` });
        }
        break;

      default:
        // ACK outside capture (e.g., handshake response)
        this._addDiag(`ACK (fuera de captura): 0x${code.toString(16)}`);
        break;
    }
  }

  // ── Handle image DATA/END packets ──────────────────────────────────────
  private handleImagePacket(pid: number, payload: Uint8Array): void {
    if (this.capturePhase !== "receiving_image") {
      // We received image data but weren't expecting it — switch to receiving
      this._addDiag("Datos de imagen recibidos (inesperado), procesando...");
      this.capturePhase = "receiving_image";
      this.imageDataChunks = [];
      this.receivedImageBytes = 0;
    }

    this.imageDataChunks.push(payload);
    this.receivedImageBytes += payload.length;
    this.emit("progress", { received: this.receivedImageBytes });

    if (pid === PID_END) {
      this._addDiag(`✓ Imagen completa: ${this.receivedImageBytes} bytes`);
      this.finalizeImage();
    }
  }

  // ── Finalize captured image ─────────────────────────────────────────────
  private finalizeImage() {
    const totalLen = this.imageDataChunks.reduce((s, c) => s + c.length, 0);
    const imageData = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of this.imageDataChunks) {
      imageData.set(chunk, offset);
      offset += chunk.length;
    }

    this.imageDataChunks = [];
    this.receivedImageBytes = 0;

    if (totalLen < 100) {
      this._addDiag(`✗ Imagen muy pequeña (${totalLen}B), descartada`);
      this.resolveCapture({ success: false, error: "Imagen capturada demasiado pequeña" });
      return;
    }

    const imageBase64 = this.rawImageToBase64(imageData);

    this.emit("captured", { imageBase64 });
    this.resolveCapture({ success: true, imageBase64 });
  }

  // ── Convert raw fingerprint data to base64 PNG ──────────────────────────
  private rawImageToBase64(rawData: Uint8Array): string {
    // Check if it's already an encoded image (PNG/BMP)
    if (this.isPngData(rawData)) {
      return `data:image/png;base64,${this.uint8ToBase64(rawData)}`;
    }
    if (this.isBmpData(rawData)) {
      return `data:image/bmp;base64,${this.uint8ToBase64(rawData)}`;
    }

    // SHU0809/HBRT-809: 256x288 grayscale @ 500 DPI
    const totalPixels = rawData.length;
    let width = 256;
    let height = Math.floor(totalPixels / width);

    const knownSizes: [number, number][] = [
      [256, 288], [256, 360], [240, 320], [192, 192],
      [160, 160], [256, 256], [320, 480], [200, 200],
    ];

    for (const [w, h] of knownSizes) {
      if (w * h === totalPixels) {
        width = w;
        height = h;
        break;
      }
    }

    if (height <= 0 || height > 2000) {
      const side = Math.ceil(Math.sqrt(totalPixels));
      width = side;
      height = side;
    }

    this._addDiag(`Imagen: ${width}x${height} (${totalPixels}B)`);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height && i < rawData.length; i++) {
      const v = rawData[i];
      imgData.data[i * 4]     = v;
      imgData.data[i * 4 + 1] = v;
      imgData.data[i * 4 + 2] = v;
      imgData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png", 1.0);
  }

  private isPngData(data: Uint8Array): boolean {
    return data.length > 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
  }

  private isBmpData(data: Uint8Array): boolean {
    return data.length > 2 && data[0] === 0x42 && data[1] === 0x4d;
  }

  private uint8ToBase64(data: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  // ── Build and send Synochip command packet ──────────────────────────────
  private async sendCommand(instruction: number, data: Uint8Array = new Uint8Array()): Promise<void> {
    if (!this.writeChar) throw new Error("Sin característica de escritura");

    const payloadLen = data.length + 3; // instruction(1) + checksum(2)
    const packetLength = 12 + data.length; // header(2)+addr(4)+pid(1)+len(2)+instruction(1)+data+checksum(2)
    const packet = new Uint8Array(packetLength);

    // Header 0xEF01
    packet[0] = 0xef;
    packet[1] = 0x01;

    // Address (4 bytes, default 0xFFFFFFFF)
    packet[2] = 0xff;
    packet[3] = 0xff;
    packet[4] = 0xff;
    packet[5] = 0xff;

    // PID = Command
    packet[6] = PID_COMMAND;

    // Length = instruction + data + checksum(2)
    packet[7] = (payloadLen >> 8) & 0xff;
    packet[8] = payloadLen & 0xff;

    // Instruction
    packet[9] = instruction;

    // Data
    for (let i = 0; i < data.length; i++) {
      packet[10 + i] = data[i];
    }

    // Checksum = PID + LEN_H + LEN_L + instruction + data bytes
    let chksum = PID_COMMAND + packet[7] + packet[8] + instruction;
    for (let i = 0; i < data.length; i++) chksum += data[i];

    const chkIdx = 10 + data.length;
    packet[chkIdx] = (chksum >> 8) & 0xff;
    packet[chkIdx + 1] = chksum & 0xff;

    const hex = Array.from(packet).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    this._addDiag(`▶ TX ${packet.length}B: ${hex}`);

    // BLE MTU splitting (typically 20 bytes for BLE 4.x)
    const mtu = 20;
    for (let i = 0; i < packet.length; i += mtu) {
      const chunk = packet.slice(i, Math.min(i + mtu, packet.length));
      try {
        if (this.writeChar.properties.writeWithoutResponse) {
          await this.writeChar.writeValueWithoutResponse(chunk);
        } else {
          await this.writeChar.writeValue(chunk);
        }
      } catch (err: any) {
        this._addDiag(`✗ Error escritura BLE: ${err?.message}`);
        throw err;
      }
      if (i + mtu < packet.length) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
  }

  // ── Read battery level ──────────────────────────────────────────────────
  private async readBatteryLevel(): Promise<void> {
    try {
      const battService = await this.server!.getPrimaryService("battery_service");
      const battChar = await battService.getCharacteristic("battery_level");
      const value = await battChar.readValue();
      this._addDiag(`Batería: ${value.getUint8(0)}%`);
      this.emit("battery", { level: value.getUint8(0) });
    } catch {
      // Battery service not available — normal
    }
  }

  // ── Start fingerprint capture ───────────────────────────────────────────
  async capture(timeoutMs = 30000): Promise<BtCaptureResult> {
    if (!this.server?.connected || !this.writeChar) {
      return { success: false, error: "Lector Bluetooth no conectado" };
    }

    this.status = "capturing";
    this.emit("statusChange", this.getInfo());
    this._addDiag("═══ INICIO CAPTURA ═══");
    this._addDiag(`Servicio: ${this.discoveredServiceUuid?.substring(4, 8)}`);
    this._addDiag(`Write: ${this.discoveredWriteUuid?.substring(4, 8)}, Notify: ${this.discoveredNotifyUuid?.substring(4, 8)}`);

    // Reset state
    this.rxBuffer = new Uint8Array(0);
    this.imageDataChunks = [];
    this.receivedImageBytes = 0;
    this.genImgAttempts = 0;
    this.capturePhase = "polling_genimg";

    return new Promise<BtCaptureResult>((resolve) => {
      this.captureResolve = resolve;

      // Timeout
      this.captureTimeout = setTimeout(() => {
        this._addDiag(`✗ Timeout (${timeoutMs / 1000}s) — ${this.receivedImageBytes}B recibidos, fase: ${this.capturePhase}`);
        
        // If we have partial image data, try to finalize
        if (this.capturePhase === "receiving_image" && this.receivedImageBytes > 500) {
          this._addDiag("Finalizando con datos parciales...");
          this.finalizeImage();
          return;
        }

        this.resolveCapture({
          success: false,
          error: `Tiempo de espera agotado (${this.receivedImageBytes} bytes recibidos, fase: ${this.capturePhase}). Coloque el dedo en el lector e intente de nuevo.`,
        });
      }, timeoutMs);

      // Turn on LED to indicate ready (optional, may fail)
      this.sendLedCommand(true).catch(() => {});

      // Start polling GenImg every 500ms
      this._addDiag("Coloque el dedo en el sensor...");
      this.startGenImgPolling();
    });
  }

  // ── Poll GenImg command ─────────────────────────────────────────────────
  private startGenImgPolling(): void {
    // Send first GenImg immediately
    this.sendCommand(CMD_GEN_IMG).catch(err => {
      this._addDiag(`✗ GenImg error: ${err?.message}`);
    });

    // Then poll every 500ms
    this.genImgTimer = setInterval(() => {
      if (this.capturePhase !== "polling_genimg") {
        this.stopGenImgPolling();
        return;
      }
      this.sendCommand(CMD_GEN_IMG).catch(err => {
        this._addDiag(`✗ GenImg poll error: ${err?.message}`);
      });
    }, 500);
  }

  private stopGenImgPolling(): void {
    if (this.genImgTimer) {
      clearInterval(this.genImgTimer);
      this.genImgTimer = null;
    }
  }

  // ── LED control (optional) ──────────────────────────────────────────────
  private async sendLedCommand(on: boolean): Promise<void> {
    // AuraLed: ctrl=1(breathing), speed=80, color=2(blue), count=0(infinite)
    const ctrl = on ? 0x01 : 0x04; // 1=breathing, 4=off
    const speed = 0x50; // 80
    const color = on ? 0x02 : 0x00; // 2=blue, 0=off
    const count = 0x00;
    await this.sendCommand(CMD_AURA_LED, new Uint8Array([ctrl, speed, color, count]));
  }

  // ── Resolve capture and cleanup ─────────────────────────────────────────
  private resolveCapture(result: BtCaptureResult): void {
    this.cleanupCapture();
    this.status = "connected";
    this.emit("statusChange", this.getInfo());

    if (this.captureResolve) {
      const resolve = this.captureResolve;
      this.captureResolve = null;
      resolve(result);
    }
  }

  private cleanupCapture(disconnectError?: string): void {
    this.stopGenImgPolling();
    if (this.captureTimeout) {
      clearTimeout(this.captureTimeout);
      this.captureTimeout = null;
    }
    this.capturePhase = "idle";

    // Turn off LED
    if (this.server?.connected) {
      this.sendLedCommand(false).catch(() => {});
    }

    if (disconnectError && this.captureResolve) {
      const resolve = this.captureResolve;
      this.captureResolve = null;
      resolve({ success: false, error: disconnectError });
    }
  }

  // ── ACK description helper ─────────────────────────────────────────────
  private ackDescription(code: number): string {
    switch (code) {
      case 0x00: return "OK";
      case 0x01: return "Error de paquete";
      case 0x02: return "Sin dedo";
      case 0x03: return "Fallo registro";
      case 0x06: return "Imagen desordenada";
      case 0x07: return "Imagen pequeña";
      case 0x08: return "No coincide";
      case 0x09: return "No encontrado";
      case 0x0a: return "Error fusión";
      case 0x0d: return "Comando inválido";
      case 0x0f: return "Error lectura params";
      case 0x1a: return "Sensor defectuoso";
      default: return `Desconocido (0x${code.toString(16)})`;
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────
  disconnect() {
    this.cleanupCapture();
    this.captureResolve = null;

    if (this.notifyChar) {
      try { this.notifyChar.stopNotifications().catch(() => {}); } catch {}
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.rxBuffer = new Uint8Array(0);
    this.status = "disconnected";
    this.emit("statusChange", this.getInfo());
    this._addDiag("Desconectado");
  }

  // ── Status getters ──────────────────────────────────────────────────────
  getInfo(): BtReaderInfo {
    return {
      status: this.status,
      deviceName: this.deviceName || undefined,
      error: this.lastError || undefined,
    };
  }

  getLastError(): string | null { return this.lastError; }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "capturing";
  }

  getDiagnostics() {
    return {
      status: this.status,
      deviceName: this.deviceName,
      lastError: this.lastError,
      platform: this.getPlatform(),
      webBluetoothSupported: this.isSupported(),
      gattConnected: this.server?.connected || false,
      capturePhase: this.capturePhase,
      log: this._diagLog.slice(-50),
    };
  }

  private _addDiag(msg: string) {
    this._diagLog.push({ ts: Date.now(), msg });
    if (this._diagLog.length > 80) this._diagLog.shift();
    this.emit("diagnostics", this.getDiagnostics());
  }

  // ── Events ──────────────────────────────────────────────────────────────
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(data); } catch (e) { logger.error("[BluetoothFP] Event handler error:", e); }
    });
  }
}

// Singleton
export const bluetoothFingerprintService = new BluetoothFingerprintService();
