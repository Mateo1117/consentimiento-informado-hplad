/**
 * bluetoothFingerprintService.ts
 * Integración con lector de huellas Bluetooth SHU0809 (Starhightech / HBRT-809)
 * usando Web Bluetooth API (BLE GATT).
 *
 * Compatible con:
 *  - Android (Chrome 56+)
 *  - Windows (Chrome 70+ / Edge 79+)
 *  - macOS (Chrome 56+)
 *  - iOS (Bluefy browser — Chrome iOS no soporta Web Bluetooth)
 *
 * El protocolo de comunicación es tipo UART-over-BLE usando servicios GATT
 * personalizados (0xFFF0) con características de escritura (0xFFF1) y
 * notificación (0xFFF2). El protocolo de paquetes es compatible con los
 * módulos de huella Synochip/ZhianTec (AS608/FPM10A).
 */

/// <reference types="@types/web-bluetooth" />
import { logger } from "@/utils/logger";

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────
// Primary BLE UART service (common for SHU0809 and similar Chinese fingerprint scanners)
const BLE_SERVICE_UUIDS = [
  "0000fff0-0000-1000-8000-00805f9b34fb", // Primary custom service
  "0000ffe0-0000-1000-8000-00805f9b34fb", // Alternative service (some models)
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART Service (NUS) fallback
];

const WRITE_CHAR_UUIDS = [
  "0000fff1-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // NUS RX
];

const NOTIFY_CHAR_UUIDS = [
  "0000fff2-0000-1000-8000-00805f9b34fb",
  "0000ffe2-0000-1000-8000-00805f9b34fb",
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e", // NUS TX
];

// ─── Fingerprint module protocol constants (Synochip compatible) ──────────────
const HEADER = 0xef01;
const DEFAULT_ADDR = 0xffffffff;

// Package identifiers
const PID_COMMAND = 0x01;
const PID_DATA    = 0x02;
const PID_ACK     = 0x07;
const PID_END     = 0x08;

// Instruction codes
const CMD_GEN_IMG     = 0x01; // Capture fingerprint image
const CMD_UP_IMAGE    = 0x0a; // Upload image to host
const CMD_READ_PARAM  = 0x0f; // Read system parameters
const CMD_HANDSHAKE   = 0x40; // Handshake / verify connection (some models use 0x17)
const CMD_AURA_LED    = 0x35; // Control LED (optional)

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
  private responseBuffer: Uint8Array[] = [];
  private captureResolve: ((result: BtCaptureResult) => void) | null = null;
  private lastError: string | null = null;
  private _diagLog: Array<{ ts: number; msg: string }> = [];
  private imageDataChunks: Uint8Array[] = [];
  private expectedImageBytes = 0;
  private receivedImageBytes = 0;
  private isReceivingImage = false;
  private rawDataTimer: ReturnType<typeof setTimeout> | null = null;
  private isCapturing = false;
  private detectedProtocol: "synochip" | "raw" | "unknown" = "unknown";
  private discoveredServiceUuid: string | null = null;
  private discoveredWriteUuid: string | null = null;
  private discoveredNotifyUuid: string | null = null;

  // ── Check Web Bluetooth availability ────────────────────────────────────
  isSupported(): boolean {
    return typeof navigator !== "undefined" &&
           "bluetooth" in navigator &&
           typeof (navigator as any).bluetooth?.requestDevice === "function";
  }

  // ── Platform detection ──────────────────────────────────────────────────
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
      if (platform === "ios") {
        this.lastError = "Web Bluetooth no está disponible en Safari/Chrome iOS. Use el navegador Bluefy para conectar el lector Bluetooth.";
      } else {
        this.lastError = "Web Bluetooth no está disponible en este navegador. Use Chrome o Edge.";
      }
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
      // Request device with fingerprint scanner filters
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUIDS[0]] },
          { services: [BLE_SERVICE_UUIDS[1]] },
          { services: [BLE_SERVICE_UUIDS[2]] },
          { namePrefix: "SH" },       // Starhightech devices
          { namePrefix: "FP" },       // Generic fingerprint
          { namePrefix: "BT809" },    // HBRT-809
          { namePrefix: "HB" },       // HBRT devices
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
      this._addDiag(`Dispositivo seleccionado: ${this.deviceName}`);

      // Listen for disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        this._addDiag("Dispositivo desconectado");
        this.status = "disconnected";
        this.server = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.emit("statusChange", this.getInfo());
        this.emit("disconnected", {});

        if (this.captureResolve) {
          this.captureResolve({ success: false, error: "Dispositivo desconectado durante la captura" });
          this.captureResolve = null;
        }
      });

      // Connect to GATT server
      this._addDiag("Conectando a GATT server...");
      this.server = await this.device.gatt!.connect();
      this._addDiag("GATT server conectado");

      // Discover service and characteristics
      await this.discoverCharacteristics();

      // Try to read battery level
      await this.readBatteryLevel();

      // Send handshake to verify communication
      await this.sendHandshake();

      this.status = "connected";
      this.emit("statusChange", this.getInfo());
      this._addDiag(`✓ Conectado a ${this.deviceName}`);
      logger.info("[BluetoothFP] Connected to", this.deviceName);
      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("cancelled") || msg.includes("canceled") || msg.includes("User cancelled")) {
        this.lastError = "Selección de dispositivo cancelada por el usuario";
      } else {
        this.lastError = `Error al conectar: ${msg}`;
      }
      this._addDiag(`✗ ${this.lastError}`);
      this.status = "disconnected";
      this.emit("statusChange", this.getInfo());
      logger.info("[BluetoothFP] Connection failed:", msg);
      return false;
    }
  }

  // ── Discover BLE characteristics ────────────────────────────────────────
  private async discoverCharacteristics(): Promise<void> {
    if (!this.server) throw new Error("GATT server not connected");

    let service: BluetoothRemoteGATTService | null = null;

    // Try each service UUID until one works
    for (const svcUuid of BLE_SERVICE_UUIDS) {
      try {
        service = await this.server.getPrimaryService(svcUuid);
        this._addDiag(`Servicio encontrado: ${svcUuid}`);
        break;
      } catch {
        this._addDiag(`Servicio ${svcUuid.substring(4, 8)} no disponible`);
      }
    }

    if (!service) {
      // Fallback: enumerate all services
      try {
        const services = await this.server.getPrimaryServices();
        this._addDiag(`Servicios disponibles: ${services.map(s => s.uuid).join(", ")}`);
        if (services.length > 0) {
          service = services[0];
          this._addDiag(`Usando primer servicio: ${service.uuid}`);
        }
      } catch {
        throw new Error("No se encontró ningún servicio GATT compatible");
      }
    }

    if (!service) throw new Error("No se encontró servicio GATT");

    // Get all characteristics
    const chars = await service.getCharacteristics();
    this._addDiag(`Características encontradas: ${chars.length}`);

    for (const char of chars) {
      const props = char.properties;
      this._addDiag(`  ${char.uuid.substring(4, 8)}: W=${props.write || props.writeWithoutResponse} N=${props.notify}`);

      // Find write characteristic
      if (!this.writeChar && (props.write || props.writeWithoutResponse)) {
        if (WRITE_CHAR_UUIDS.includes(char.uuid) || !this.writeChar) {
          this.writeChar = char;
        }
      }

      // Find notify characteristic
      if (!this.notifyChar && props.notify) {
        if (NOTIFY_CHAR_UUIDS.includes(char.uuid) || !this.notifyChar) {
          this.notifyChar = char;
        }
      }
    }

    if (!this.writeChar) throw new Error("No se encontró característica de escritura");
    if (!this.notifyChar) throw new Error("No se encontró característica de notificación");

    this.discoveredServiceUuid = service.uuid;
    this.discoveredWriteUuid = this.writeChar.uuid;
    this.discoveredNotifyUuid = this.notifyChar.uuid;
    this.allChars = chars;

    // Subscribe to notifications
    await this.notifyChar.startNotifications();
    this.notifyChar.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
    this._addDiag("Suscrito a notificaciones");

    // Also subscribe to any additional notify characteristics
    for (const char of chars) {
      if (char.properties.notify && char !== this.notifyChar) {
        try {
          await char.startNotifications();
          char.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
          this._addDiag(`También suscrito a ${char.uuid.substring(4, 8)}`);
        } catch {
          // ignore
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
    
    // Always log raw data for debugging
    const hex = Array.from(data.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    this._addDiag(`◀ RX ${data.length}B: ${hex}${data.length > 32 ? '...' : ''}`);

    if (!this.isCapturing) {
      // Data received outside capture — could be handshake response
      this.responseBuffer.push(data);
      const assembled = this.assemblePacket();
      if (assembled) {
        this._addDiag(`Respuesta: PID=${assembled.pid} datos=${assembled.data.length}B`);
        if (assembled.pid === PID_ACK && assembled.data.length > 0) {
          this._addDiag(`ACK código=${assembled.data[0]} — protocolo Synochip confirmado`);
          this.detectedProtocol = "synochip";
        }
      }
      return;
    }

    // ── During capture: try to interpret incoming data ──
    
    // Check if it looks like a Synochip packet
    if (data.length >= 2 && data[0] === 0xef && data[1] === 0x01) {
      this.detectedProtocol = "synochip";
    }

    if (this.detectedProtocol === "synochip") {
      this.responseBuffer.push(data);
      const assembled = this.assemblePacket();
      if (assembled) {
        this.processResponse(assembled);
      }
      return;
    }

    // ── Raw/unknown protocol: collect all data as potential image ──
    this.imageDataChunks.push(data);
    this.receivedImageBytes += data.length;
    this.emit("progress", { received: this.receivedImageBytes });
    this._addDiag(`Datos acumulados: ${this.receivedImageBytes} bytes`);

    // Debounce: finalize image after 800ms of no new data
    if (this.rawDataTimer) clearTimeout(this.rawDataTimer);
    this.rawDataTimer = setTimeout(() => {
      if (this.isCapturing && this.receivedImageBytes > 500) {
        this._addDiag(`Auto-finalizando con ${this.receivedImageBytes} bytes (sin datos nuevos por 800ms)`);
        this.finalizeImage();
      }
    }, 800);
  }

  // ── Assemble multi-notification packet ──────────────────────────────────
  private assemblePacket(): { pid: number; data: Uint8Array } | null {
    // Concatenate all buffered data
    const totalLen = this.responseBuffer.reduce((s, b) => s + b.length, 0);
    if (totalLen < 12) return null; // Minimum packet size: header(2)+addr(4)+pid(1)+len(2)+data(1)+chk(2) = 12

    const buf = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of this.responseBuffer) {
      buf.set(chunk, offset);
      offset += chunk.length;
    }

    // Find header
    let headerIdx = -1;
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0xef && buf[i + 1] === 0x01) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx < 0) {
      // No header found — might be raw image data
      return null;
    }

    if (buf.length < headerIdx + 9) return null;

    const pid = buf[headerIdx + 6];
    const pktLen = (buf[headerIdx + 7] << 8) | buf[headerIdx + 8];
    const totalPktSize = headerIdx + 9 + pktLen;

    if (buf.length < totalPktSize) return null; // Need more data

    const pktData = buf.slice(headerIdx + 9, totalPktSize - 2); // Exclude checksum
    this.responseBuffer = [];

    // If there's leftover data after the packet, keep it
    if (buf.length > totalPktSize) {
      this.responseBuffer.push(buf.slice(totalPktSize));
    }

    return { pid, data: pktData };
  }

  // ── Process response packet ─────────────────────────────────────────────
  private processResponse(pkt: { pid: number; data: Uint8Array }) {
    if (pkt.pid === PID_ACK && pkt.data.length > 0) {
      const confirmCode = pkt.data[0];
      this._addDiag(`ACK recibido: código=${confirmCode}`);
      this.emit("ack", { code: confirmCode });

      // Handle image upload ACK
      if (confirmCode === 0x00 && this.captureResolve && !this.isReceivingImage) {
        // After GenImg success, request image upload
        this._addDiag("GenImg exitoso, solicitando UpImage...");
        this.sendCommand(CMD_UP_IMAGE).catch(err => {
          this._addDiag(`Error enviando UpImage: ${err?.message}`);
        });
      }
    } else if (pkt.pid === PID_DATA || pkt.pid === PID_END) {
      this.handleImagePacket(pkt);
    }
  }

  // ── Handle image data packets (protocol mode) ──────────────────────────
  private handleImagePacket(pkt: { pid: number; data: Uint8Array }) {
    if (!this.isReceivingImage) {
      this.isReceivingImage = true;
      this.imageDataChunks = [];
      this.receivedImageBytes = 0;
      this._addDiag("Recibiendo imagen de huella...");
    }

    this.imageDataChunks.push(pkt.data);
    this.receivedImageBytes += pkt.data.length;
    this.emit("progress", { received: this.receivedImageBytes });

    if (pkt.pid === PID_END) {
      this._addDiag(`Imagen completa: ${this.receivedImageBytes} bytes`);
      this.finalizeImage();
    }
  }

  // ── Handle raw image data (non-protocol mode) ──────────────────────────
  private handleImageData(data: Uint8Array) {
    this.imageDataChunks.push(data);
    this.receivedImageBytes += data.length;

    // Some scanners send raw image data without protocol framing
    // We detect completion by timeout or expected size
    this.emit("progress", { received: this.receivedImageBytes });

    // If we have a substantial amount of data and it stops flowing,
    // finalize via debounce (handled in capture timeout)
  }

  // ── Finalize captured image ─────────────────────────────────────────────
  private finalizeImage() {
    this.isReceivingImage = false;

    // Concatenate all chunks
    const totalLen = this.imageDataChunks.reduce((s, c) => s + c.length, 0);
    const imageData = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of this.imageDataChunks) {
      imageData.set(chunk, offset);
      offset += chunk.length;
    }

    this.imageDataChunks = [];
    this.receivedImageBytes = 0;

    // Convert raw grayscale image to PNG
    const imageBase64 = this.rawImageToBase64(imageData);

    this.status = "connected";
    this.emit("statusChange", this.getInfo());
    this.emit("captured", { imageBase64 });

    if (this.captureResolve) {
      this.captureResolve({ success: true, imageBase64 });
      this.captureResolve = null;
    }
  }

  // ── Convert raw fingerprint data to base64 PNG ──────────────────────────
  private rawImageToBase64(rawData: Uint8Array): string {
    // SHU0809 outputs 256x288 grayscale @ 500 DPI (or 256x360 for some models)
    // Try to detect the image dimensions from the data size
    const totalPixels = rawData.length;
    let width = 256;
    let height = Math.floor(totalPixels / width);

    // Common sizes for fingerprint scanners
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
      // If we can't determine size, check if it's already a PNG/BMP
      if (this.isPngData(rawData)) {
        return `data:image/png;base64,${this.uint8ToBase64(rawData)}`;
      }
      if (this.isBmpData(rawData)) {
        return `data:image/bmp;base64,${this.uint8ToBase64(rawData)}`;
      }
      // Assume square
      const side = Math.ceil(Math.sqrt(totalPixels));
      width = side;
      height = side;
    }

    this._addDiag(`Imagen: ${width}x${height} (${totalPixels} bytes)`);

    // Render grayscale data to canvas and export as PNG
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
    return data.length > 8 && data[0] === 0x89 && data[1] === 0x50 &&
           data[2] === 0x4e && data[3] === 0x47;
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

  // ── Build and send command packet ───────────────────────────────────────
  private async sendCommand(instruction: number, data: Uint8Array = new Uint8Array()): Promise<void> {
    if (!this.writeChar) throw new Error("No write characteristic");

    const pktLen = data.length + 3; // instruction(1) + data + checksum(2)
    const packet = new Uint8Array(9 + data.length + 2);

    // Header
    packet[0] = (HEADER >> 8) & 0xff;
    packet[1] = HEADER & 0xff;

    // Address (4 bytes)
    packet[2] = (DEFAULT_ADDR >> 24) & 0xff;
    packet[3] = (DEFAULT_ADDR >> 16) & 0xff;
    packet[4] = (DEFAULT_ADDR >> 8) & 0xff;
    packet[5] = DEFAULT_ADDR & 0xff;

    // Package identifier
    packet[6] = PID_COMMAND;

    // Length
    packet[7] = (pktLen >> 8) & 0xff;
    packet[8] = pktLen & 0xff;

    // Instruction
    packet[9] = instruction;

    // Data
    for (let i = 0; i < data.length; i++) {
      packet[10 + i] = data[i];
    }

    // Checksum (sum of pid + length + instruction + data)
    let chksum = PID_COMMAND + ((pktLen >> 8) & 0xff) + (pktLen & 0xff) + instruction;
    for (let i = 0; i < data.length; i++) chksum += data[i];
    const chkIdx = 10 + data.length;
    packet[chkIdx] = (chksum >> 8) & 0xff;
    packet[chkIdx + 1] = chksum & 0xff;

    // BLE has MTU limitations (typically 20 bytes), split if needed
    const mtu = 20;
    for (let i = 0; i < packet.length; i += mtu) {
      const chunk = packet.slice(i, Math.min(i + mtu, packet.length));
      if (this.writeChar.properties.writeWithoutResponse) {
        await this.writeChar.writeValueWithoutResponse(chunk);
      } else {
        await this.writeChar.writeValue(chunk);
      }
      // Small delay between chunks for BLE stability
      if (i + mtu < packet.length) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    this._addDiag(`Comando enviado: 0x${instruction.toString(16).padStart(2, "0")} (${packet.length} bytes)`);
  }

  // ── Send handshake to verify connection ─────────────────────────────────
  private async sendHandshake(): Promise<void> {
    try {
      await this.sendCommand(CMD_READ_PARAM);
      this._addDiag("Handshake enviado (ReadSysPara)");
    } catch (err: any) {
      this._addDiag(`Handshake falló (no crítico): ${err?.message}`);
      // Non-critical — some devices don't respond to handshake
    }
  }

  // ── Read battery level if available ─────────────────────────────────────
  private async readBatteryLevel(): Promise<void> {
    try {
      const battService = await this.server!.getPrimaryService("battery_service");
      const battChar = await battService.getCharacteristic("battery_level");
      const value = await battChar.readValue();
      const level = value.getUint8(0);
      this._addDiag(`Batería: ${level}%`);
      this.emit("battery", { level });
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
    this.isCapturing = true;
    this.emit("statusChange", this.getInfo());
    this._addDiag("Iniciando captura de huella...");
    this._addDiag(`Protocolo detectado: ${this.detectedProtocol}`);
    this._addDiag(`Servicio: ${this.discoveredServiceUuid}`);
    this._addDiag(`Write: ${this.discoveredWriteUuid}, Notify: ${this.discoveredNotifyUuid}`);

    // Reset state
    this.responseBuffer = [];
    this.imageDataChunks = [];
    this.receivedImageBytes = 0;
    this.isReceivingImage = false;
    if (this.rawDataTimer) clearTimeout(this.rawDataTimer);

    return new Promise<BtCaptureResult>(async (resolve) => {
      this.captureResolve = resolve;

      // Timeout
      const timeout = setTimeout(() => {
        if (this.captureResolve) {
          // If we have partial image data, try to finalize it
          if (this.imageDataChunks.length > 0 && this.receivedImageBytes > 500) {
            this._addDiag(`Timeout con ${this.receivedImageBytes} bytes recibidos, finalizando...`);
            this.finalizeImage();
            return;
          }

          this.captureResolve = null;
          this.isCapturing = false;
          this.isReceivingImage = false;
          this.status = "connected";
          this.emit("statusChange", this.getInfo());
          this._addDiag(`✗ Timeout de captura (${this.receivedImageBytes} bytes recibidos)`);
          resolve({
            success: false,
            error: `Tiempo de espera agotado (${this.receivedImageBytes} bytes recibidos). Coloque el dedo en el lector e intente de nuevo.`,
          });
        }
      }, timeoutMs);

      const originalResolve = this.captureResolve;
      this.captureResolve = (result) => {
        clearTimeout(timeout);
        this.isCapturing = false;
        if (this.rawDataTimer) clearTimeout(this.rawDataTimer);
        originalResolve?.(result);
      };

      try {
        // Strategy 1: Try Synochip protocol (GenImg command)
        this._addDiag("Enviando comando GenImg (protocolo Synochip)...");
        try {
          await this.sendCommand(CMD_GEN_IMG);
        } catch (e: any) {
          this._addDiag(`GenImg falló: ${e?.message}`);
        }

        // Wait 2s, if no response try alternative commands
        await new Promise(r => setTimeout(r, 2000));

        if (this.receivedImageBytes === 0 && this.captureResolve) {
          // Strategy 2: Try simple trigger bytes common in BLE fingerprint scanners
          this._addDiag("Sin respuesta. Intentando comandos alternativos...");

          const alternativeCommands = [
            // Common BLE fingerprint scanner trigger commands
            new Uint8Array([0x55, 0xAA, 0x01, 0x00, 0x00, 0x00, 0x01]), // Scan trigger v1
            new Uint8Array([0x40, 0x20]),                                 // Short scan command
            new Uint8Array([0x01]),                                       // Single byte trigger
            new Uint8Array([0xF5, 0x01, 0x00, 0x00, 0x00, 0x01, 0xF5]), // Alt protocol
            new Uint8Array([0x7E, 0x00, 0x01, 0x01, 0x00, 0x02, 0x7E]), // Frame protocol
          ];

          for (const cmd of alternativeCommands) {
            if (this.receivedImageBytes > 0) break; // Something responded
            const hex = Array.from(cmd).map(b => b.toString(16).padStart(2, '0')).join(' ');
            this._addDiag(`▶ TX alt: ${hex}`);
            try {
              if (this.writeChar!.properties.writeWithoutResponse) {
                await this.writeChar!.writeValueWithoutResponse(cmd);
              } else {
                await this.writeChar!.writeValue(cmd);
              }
              await new Promise(r => setTimeout(r, 1000));
            } catch (e: any) {
              this._addDiag(`  falló: ${e?.message}`);
            }
          }

          // Strategy 3: Try reading from all characteristics (some devices use read instead of notify)
          if (this.receivedImageBytes === 0 && this.captureResolve) {
            this._addDiag("Intentando lectura directa de características...");
            for (const char of this.allChars) {
              if (char.properties.read) {
                try {
                  const val = await char.readValue();
                  const data = new Uint8Array(val.buffer);
                  if (data.length > 0) {
                    const hex = Array.from(data.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    this._addDiag(`◀ Read ${char.uuid.substring(4,8)}: ${data.length}B — ${hex}`);
                    if (data.length > 10) {
                      this.imageDataChunks.push(data);
                      this.receivedImageBytes += data.length;
                    }
                  }
                } catch {
                  // skip
                }
              }
            }
          }
        }

        this._addDiag(`Esperando huella en el sensor... (${this.receivedImageBytes} bytes hasta ahora)`);
      } catch (err: any) {
        clearTimeout(timeout);
        this.captureResolve = null;
        this.isCapturing = false;
        const msg = err?.message || String(err);
        this._addDiag(`✗ Error al iniciar captura: ${msg}`);
        this.status = "connected";
        this.emit("statusChange", this.getInfo());
        resolve({ success: false, error: `Error al iniciar captura: ${msg}` });
      }
    });
  }

  // ── Disconnect ──────────────────────────────────────────────────────────
  disconnect() {
    this.captureResolve = null;
    this.isReceivingImage = false;
    this.isCapturing = false;
    if (this.rawDataTimer) clearTimeout(this.rawDataTimer);

    if (this.notifyChar) {
      try {
        this.notifyChar.stopNotifications().catch(() => {});
      } catch {
        // Ignore
      }
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
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

  getLastError(): string | null {
    return this.lastError;
  }

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
      log: this._diagLog.slice(-30),
    };
  }

  private _addDiag(msg: string) {
    this._diagLog.push({ ts: Date.now(), msg });
    if (this._diagLog.length > 50) this._diagLog.shift();
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
