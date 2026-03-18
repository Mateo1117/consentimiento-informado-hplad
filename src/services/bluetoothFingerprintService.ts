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
 * BLE UART: Servicio 0xFFF0, Write 0xFFF1, Notify/Indicate 0xFFF2
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
const PID_DATA = 0x02;
const PID_ACK = 0x07;
const PID_END = 0x08;

// Commands
const CMD_GEN_IMG = 0x01;
const CMD_IMG2TZ = 0x02;
const CMD_UP_IMAGE = 0x0a;
const CMD_READ_PARAM = 0x0f;
const CMD_AURA_LED = 0x35;

// ACK confirmation codes
const ACK_OK = 0x00;
const ACK_NO_FINGER = 0x02;
const ACK_IMG_MESSY = 0x06;
const ACK_IMG_SMALL = 0x07;

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

type AckWaiter = {
  resolve: (payload: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type CapturePhase =
  | "idle"
  | "polling_genimg"
  | "waiting_upimage_ack"
  | "receiving_image";

class BluetoothFingerprintService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private allChars: BluetoothRemoteGATTCharacteristic[] = [];
  private writeCandidates: BluetoothRemoteGATTCharacteristic[] = [];
  private notifyCandidates: BluetoothRemoteGATTCharacteristic[] = [];
  private captureWriteProbeIndex = 0;
  private status: BtStatus = "disconnected";
  private deviceName: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private batteryLevel?: number;
  private notificationHandler = this.handleNotification.bind(this);
  private pendingAckWaiters: AckWaiter[] = [];

  private rxBuffer: Uint8Array = new Uint8Array(0);
  private captureResolve: ((result: BtCaptureResult) => void) | null = null;
  private capturePhase: CapturePhase = "idle";
  private genImgTimer: ReturnType<typeof setInterval> | null = null;
  private captureTimeout: ReturnType<typeof setTimeout> | null = null;
  private imageDataChunks: Uint8Array[] = [];
  private receivedImageBytes = 0;
  private genImgAttempts = 0;

  private lastError: string | null = null;
  private _diagLog: Array<{ ts: number; msg: string }> = [];
  private discoveredServiceUuid: string | null = null;
  private discoveredWriteUuid: string | null = null;
  private discoveredNotifyUuid: string | null = null;

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

  private shortUuid(uuid?: string | null): string {
    if (!uuid) return "—";
    const normalized = uuid.toLowerCase();
    return normalized.startsWith("0000") ? normalized.slice(4, 8).toUpperCase() : normalized;
  }

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

    if (this.server?.connected && this.writeChar && this.notifyChar) {
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
        this.server = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.writeCandidates = [];
        this.notifyCandidates = [];
        this.status = "disconnected";
        this.emit("statusChange", this.getInfo());
        this.emit("disconnected", {});
      });

      this._addDiag("Conectando GATT...");
      this.server = await this.device.gatt!.connect();
      this._addDiag("GATT conectado");

      await this.discoverCharacteristics();
      await this.readBatteryLevel();

      this._addDiag("Verificando canal del protocolo SHU0809...");
      const protocolReady = await this.verifyProtocolChannel();
      if (!protocolReady) {
        this._addDiag("⚠ Sin ACK inicial; se probarán automáticamente los canales BLE durante la captura.");
      }
      this.lastError = null;

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

  private async discoverCharacteristics(): Promise<void> {
    if (!this.server) throw new Error("GATT no conectado");

    const services = await this.server.getPrimaryServices();
    if (services.length === 0) throw new Error("No se encontró ningún servicio GATT");

    this._addDiag(`Servicios disponibles: ${services.map((service) => this.shortUuid(service.uuid)).join(", ")}`);

    this.allChars = [];
    this.writeCandidates = [];
    this.notifyCandidates = [];

    const preferredServices = [
      ...services.filter((service) => BLE_SERVICE_UUIDS.includes(service.uuid.toLowerCase())),
      ...services.filter((service) => !BLE_SERVICE_UUIDS.includes(service.uuid.toLowerCase())),
    ];

    for (const service of preferredServices) {
      const chars = await service.getCharacteristics();
      this._addDiag(`Servicio ${this.shortUuid(service.uuid)}: ${chars.length} características`);
      this.allChars.push(...chars);

      for (const char of chars) {
        const props = char.properties as BluetoothCharacteristicProperties & {
          writeWithoutResponse?: boolean;
          indicate?: boolean;
        };
        const canWrite = Boolean(props.write || props.writeWithoutResponse);
        const canReceive = Boolean(props.notify || props.indicate);
        const canRead = Boolean(props.read);

        this._addDiag(
          `  ${this.shortUuid(char.uuid)}: W=${canWrite} WR=${Boolean(props.write)} WNR=${Boolean(props.writeWithoutResponse)} N=${Boolean(props.notify)} I=${Boolean(props.indicate)} R=${canRead}`,
        );

        if (canWrite && !this.writeCandidates.includes(char)) {
          this.writeCandidates.push(char);
        }
        if (canReceive && !this.notifyCandidates.includes(char)) {
          this.notifyCandidates.push(char);
        }
      }
    }

    if (this.writeCandidates.length === 0) throw new Error("Sin característica de escritura");
    if (this.notifyCandidates.length === 0) throw new Error("Sin característica de notificación/indicación");

    this.writeChar = this.pickPreferredCharacteristic(this.writeCandidates, WRITE_CHAR_UUIDS, true);
    this.notifyChar = this.pickPreferredCharacteristic(this.notifyCandidates, NOTIFY_CHAR_UUIDS, false);

    this.discoveredWriteUuid = this.writeChar.uuid;
    this.discoveredNotifyUuid = this.notifyChar.uuid;
    this.discoveredServiceUuid =
      ((this.writeChar as any)?.service?.uuid as string | undefined) ||
      ((this.notifyChar as any)?.service?.uuid as string | undefined) ||
      services[0].uuid;

    this._addDiag(`TX seleccionado: ${this.shortUuid(this.discoveredWriteUuid)}`);
    this._addDiag(`RX seleccionado: ${this.shortUuid(this.discoveredNotifyUuid)}`);

    for (const char of this.notifyCandidates) {
      try {
        char.removeEventListener("characteristicvaluechanged", this.notificationHandler as EventListener);
      } catch {
        // noop
      }

      try {
        await char.startNotifications();
        char.addEventListener("characteristicvaluechanged", this.notificationHandler as EventListener);
        this._addDiag(`Suscrito RX: ${this.shortUuid(char.uuid)}`);
      } catch (e: any) {
        this._addDiag(`Error suscripción ${this.shortUuid(char.uuid)}: ${e?.message || e}`);
      }
    }
  }

  private pickPreferredCharacteristic(
    candidates: BluetoothRemoteGATTCharacteristic[],
    preferredUuids: string[],
    preferWriteWithResponse: boolean,
  ): BluetoothRemoteGATTCharacteristic {
    for (const uuid of preferredUuids) {
      const exact = candidates.find((char) => char.uuid.toLowerCase() === uuid);
      if (exact) return exact;
    }

    const sorted = [...candidates].sort((a, b) => {
      const score = (char: BluetoothRemoteGATTCharacteristic) => {
        const props = char.properties as BluetoothCharacteristicProperties & {
          writeWithoutResponse?: boolean;
          indicate?: boolean;
        };
        if (preferWriteWithResponse) {
          if (props.write) return 0;
          if (props.writeWithoutResponse) return 1;
        } else {
          if (props.notify) return 0;
          if (props.indicate) return 1;
        }
        return 2;
      };
      return score(a) - score(b);
    });

    return sorted[0];
  }

  private async verifyProtocolChannel(): Promise<boolean> {
    if (this.writeCandidates.length === 0) return false;

    for (const candidate of this.writeCandidates) {
      this.writeChar = candidate;
      this.discoveredWriteUuid = candidate.uuid;
      this.rxBuffer = new Uint8Array(0);

      this._addDiag(`Probando canal TX ${this.shortUuid(candidate.uuid)} con ReadSysPara...`);

      try {
        const ack = await this.sendCommandAndWaitAck(CMD_READ_PARAM, new Uint8Array(), 1200, candidate);
        this._addDiag(`✓ ReadSysPara respondió por ${this.shortUuid(candidate.uuid)} con ACK 0x${(ack[0] ?? 0).toString(16)}`);
        this.captureWriteProbeIndex = this.writeCandidates.findIndex((item) => item.uuid === candidate.uuid);
        return true;
      } catch (err: any) {
        this._addDiag(`Sin respuesta por ${this.shortUuid(candidate.uuid)}: ${err?.message || err}`);
      }
    }

    this.captureWriteProbeIndex = 0;
    this.writeChar = this.writeCandidates[0] || null;
    this.discoveredWriteUuid = this.writeChar?.uuid || null;
    return false;
  }

  private async sendCommandAndWaitAck(
    instruction: number,
    data: Uint8Array = new Uint8Array(),
    timeoutMs = 1200,
    writeTarget?: BluetoothRemoteGATTCharacteristic,
  ): Promise<Uint8Array> {
    return new Promise<Uint8Array>(async (resolve, reject) => {
      const cleanup = (waiter: AckWaiter) => {
        clearTimeout(waiter.timer);
        this.pendingAckWaiters = this.pendingAckWaiters.filter((item) => item !== waiter);
      };

      const waiter: AckWaiter = {
        resolve: (payload) => {
          cleanup(waiter);
          resolve(payload);
        },
        reject: (error) => {
          cleanup(waiter);
          reject(error);
        },
        timer: setTimeout(() => {
          cleanup(waiter);
          reject(new Error("Sin ACK del lector"));
        }, timeoutMs),
      };

      this.pendingAckWaiters.push(waiter);

      try {
        await this.sendCommand(instruction, data, writeTarget);
      } catch (err: any) {
        cleanup(waiter);
        reject(err);
      }
    });
  }

  private handleNotification(event: Event) {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const value = char.value;
    if (!value) return;

    const data = new Uint8Array(value.buffer);
    const hex = Array.from(data.slice(0, 40)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    this._addDiag(`◀ RX ${data.length}B ${this.shortUuid(char.uuid)}: ${hex}${data.length > 40 ? "..." : ""}`);

    const newBuf = new Uint8Array(this.rxBuffer.length + data.length);
    newBuf.set(this.rxBuffer, 0);
    newBuf.set(data, this.rxBuffer.length);
    this.rxBuffer = newBuf;

    this.processRxBuffer();
  }

  private processRxBuffer(): void {
    while (this.rxBuffer.length >= 12) {
      let headerIdx = -1;
      for (let i = 0; i < this.rxBuffer.length - 1; i++) {
        if (this.rxBuffer[i] === 0xef && this.rxBuffer[i + 1] === 0x01) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx < 0) {
        if (this.capturePhase === "receiving_image") {
          this.imageDataChunks.push(this.rxBuffer.slice());
          this.receivedImageBytes += this.rxBuffer.length;
          this.emit("progress", { received: this.receivedImageBytes });
        }
        this.rxBuffer = new Uint8Array(0);
        return;
      }

      if (headerIdx > 0) {
        if (this.capturePhase === "receiving_image") {
          this.imageDataChunks.push(this.rxBuffer.slice(0, headerIdx));
          this.receivedImageBytes += headerIdx;
        }
        this.rxBuffer = this.rxBuffer.slice(headerIdx);
      }

      if (this.rxBuffer.length < 9) return;

      const pid = this.rxBuffer[6];
      const pktLen = (this.rxBuffer[7] << 8) | this.rxBuffer[8];
      const totalPktSize = 9 + pktLen;

      if (this.rxBuffer.length < totalPktSize) return;

      const payload = this.rxBuffer.slice(9, 9 + pktLen - 2);
      this.rxBuffer = this.rxBuffer.slice(totalPktSize);
      this.handlePacket(pid, payload);
    }
  }

  private handlePacket(pid: number, payload: Uint8Array): void {
    this._addDiag(`PKT pid=0x${pid.toString(16)} len=${payload.length}`);

    if (pid === PID_ACK) {
      this.handleAck(payload);
    } else if (pid === PID_DATA || pid === PID_END) {
      this.handleImagePacket(pid, payload);
    }
  }

  private handleAck(payload: Uint8Array): void {
    if (payload.length === 0) return;
    const code = payload[0];
    this._addDiag(`ACK código=0x${code.toString(16)} (${this.ackDescription(code)})`);

    const waiter = this.pendingAckWaiters.shift();
    waiter?.resolve(payload);

    switch (this.capturePhase) {
      case "polling_genimg":
        if (code === ACK_OK) {
          this._addDiag("✓ Dedo detectado, imagen capturada en sensor");
          this.stopGenImgPolling();
          this.capturePhase = "waiting_upimage_ack";
          this._addDiag("Solicitando UpImage...");
          this.sendCommand(CMD_UP_IMAGE).catch((err) => {
            this._addDiag(`✗ Error UpImage: ${err?.message}`);
          });
        } else if (code === ACK_NO_FINGER) {
          if (this.genImgAttempts % 5 === 0) {
            this._addDiag(`Esperando dedo... (intento ${this.genImgAttempts})`);
          }
        } else if (code === ACK_IMG_MESSY || code === ACK_IMG_SMALL) {
          this._addDiag("Imagen de baja calidad, reintentando...");
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
        this._addDiag(`ACK (fuera de captura): 0x${code.toString(16)}`);
        break;
    }
  }

  private handleImagePacket(pid: number, payload: Uint8Array): void {
    if (this.capturePhase !== "receiving_image") {
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

  private rawImageToBase64(rawData: Uint8Array): string {
    if (this.isPngData(rawData)) {
      return `data:image/png;base64,${this.uint8ToBase64(rawData)}`;
    }
    if (this.isBmpData(rawData)) {
      return `data:image/bmp;base64,${this.uint8ToBase64(rawData)}`;
    }

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
      imgData.data[i * 4] = v;
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

  private async sendCommand(
    instruction: number,
    data: Uint8Array = new Uint8Array(),
    writeTarget?: BluetoothRemoteGATTCharacteristic,
  ): Promise<void> {
    const target = writeTarget || this.writeChar;
    if (!target) throw new Error("Sin característica de escritura");

    const payloadLen = data.length + 3;
    const packetLength = 12 + data.length;
    const packet = new Uint8Array(packetLength);

    packet[0] = (HEADER >> 8) & 0xff;
    packet[1] = HEADER & 0xff;
    packet[2] = (DEFAULT_ADDR >> 24) & 0xff;
    packet[3] = (DEFAULT_ADDR >> 16) & 0xff;
    packet[4] = (DEFAULT_ADDR >> 8) & 0xff;
    packet[5] = DEFAULT_ADDR & 0xff;
    packet[6] = PID_COMMAND;
    packet[7] = (payloadLen >> 8) & 0xff;
    packet[8] = payloadLen & 0xff;
    packet[9] = instruction;

    for (let i = 0; i < data.length; i++) {
      packet[10 + i] = data[i];
    }

    let chksum = PID_COMMAND + packet[7] + packet[8] + instruction;
    for (let i = 0; i < data.length; i++) chksum += data[i];

    const chkIdx = 10 + data.length;
    packet[chkIdx] = (chksum >> 8) & 0xff;
    packet[chkIdx + 1] = chksum & 0xff;

    const hex = Array.from(packet).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    this._addDiag(`▶ TX ${packet.length}B ${this.shortUuid(target.uuid)}: ${hex}`);

    const props = target.properties as BluetoothCharacteristicProperties & {
      writeWithoutResponse?: boolean;
    };

    const mtu = 20;
    for (let i = 0; i < packet.length; i += mtu) {
      const chunk = packet.slice(i, Math.min(i + mtu, packet.length));
      try {
        if (props.write && typeof (target as any).writeValueWithResponse === "function") {
          await (target as any).writeValueWithResponse(chunk);
        } else if (props.writeWithoutResponse && typeof (target as any).writeValueWithoutResponse === "function") {
          await (target as any).writeValueWithoutResponse(chunk);
        } else {
          await target.writeValue(chunk);
        }
      } catch (err: any) {
        this._addDiag(`✗ Error escritura BLE ${this.shortUuid(target.uuid)}: ${err?.message}`);
        throw err;
      }
      if (i + mtu < packet.length) {
        await new Promise((r) => setTimeout(r, 20));
      }
    }
  }

  private async readBatteryLevel(): Promise<void> {
    try {
      const battService = await this.server!.getPrimaryService("battery_service");
      const battChar = await battService.getCharacteristic("battery_level");
      const value = await battChar.readValue();
      this.batteryLevel = value.getUint8(0);
      this._addDiag(`Batería: ${this.batteryLevel}%`);
      this.emit("battery", { level: this.batteryLevel });
    } catch {
      // noop
    }
  }

  async capture(timeoutMs = 30000): Promise<BtCaptureResult> {
    if (!this.server?.connected || !this.writeChar) {
      return { success: false, error: "Lector Bluetooth no conectado" };
    }

    this.status = "capturing";
    this.emit("statusChange", this.getInfo());
    this._addDiag("═══ INICIO CAPTURA ═══");
    this._addDiag(`Servicio: ${this.shortUuid(this.discoveredServiceUuid)}`);
    this._addDiag(`Write: ${this.shortUuid(this.discoveredWriteUuid)}, Notify: ${this.shortUuid(this.discoveredNotifyUuid)}`);

    this.rxBuffer = new Uint8Array(0);
    this.imageDataChunks = [];
    this.receivedImageBytes = 0;
    this.genImgAttempts = 0;
    this.captureWriteProbeIndex = Math.max(0, this.writeCandidates.findIndex((char) => char.uuid === this.discoveredWriteUuid));
    this.capturePhase = "polling_genimg";

    return new Promise<BtCaptureResult>((resolve) => {
      this.captureResolve = resolve;

      this.captureTimeout = setTimeout(() => {
        this._addDiag(`✗ Timeout (${timeoutMs / 1000}s) — ${this.receivedImageBytes}B recibidos, fase: ${this.capturePhase}`);

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

      this.sendLedCommand(true).catch(() => {});
      this._addDiag("Coloque el dedo en el sensor...");
      this.startGenImgPolling();
    });
  }

  private async sendGenImgPoll(): Promise<void> {
    if (this.writeCandidates.length === 0) {
      await this.sendCommand(CMD_GEN_IMG);
      return;
    }

    const shouldRotate = this.genImgAttempts > 0 && this.genImgAttempts % 4 === 0;
    if (shouldRotate && this.writeCandidates.length > 1) {
      this.captureWriteProbeIndex = (this.captureWriteProbeIndex + 1) % this.writeCandidates.length;
      const nextTarget = this.writeCandidates[this.captureWriteProbeIndex];
      this.writeChar = nextTarget;
      this.discoveredWriteUuid = nextTarget.uuid;
      this._addDiag(`↺ Cambiando canal TX a ${this.shortUuid(nextTarget.uuid)} para GenImg`);
    }

    const target = this.writeCandidates[this.captureWriteProbeIndex] || this.writeChar;
    if (!target) throw new Error("Sin característica de escritura");

    this.genImgAttempts += 1;
    await this.sendCommand(CMD_GEN_IMG, new Uint8Array(), target);
  }

  private startGenImgPolling(): void {
    this.sendGenImgPoll().catch((err) => {
      this._addDiag(`✗ GenImg error: ${err?.message}`);
    });

    this.genImgTimer = setInterval(() => {
      if (this.capturePhase !== "polling_genimg") {
        this.stopGenImgPolling();
        return;
      }
      this.sendGenImgPoll().catch((err) => {
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

  private async sendLedCommand(on: boolean): Promise<void> {
    const ctrl = on ? 0x01 : 0x04;
    const speed = 0x50;
    const color = on ? 0x02 : 0x00;
    const count = 0x00;
    await this.sendCommand(CMD_AURA_LED, new Uint8Array([ctrl, speed, color, count]));
  }

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

    for (const waiter of [...this.pendingAckWaiters]) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Captura interrumpida"));
    }
    this.pendingAckWaiters = [];

    if (this.server?.connected) {
      this.sendLedCommand(false).catch(() => {});
    }

    if (disconnectError && this.captureResolve) {
      const resolve = this.captureResolve;
      this.captureResolve = null;
      resolve({ success: false, error: disconnectError });
    }
  }

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

  disconnect() {
    this.cleanupCapture();
    this.captureResolve = null;

    for (const char of this.notifyCandidates) {
      try {
        char.removeEventListener("characteristicvaluechanged", this.notificationHandler as EventListener);
        char.stopNotifications().catch(() => {});
      } catch {
        // noop
      }
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.writeCandidates = [];
    this.notifyCandidates = [];
    this.allChars = [];
    this.rxBuffer = new Uint8Array(0);
    this.status = "disconnected";
    this.emit("statusChange", this.getInfo());
    this._addDiag("Desconectado");
  }

  getInfo(): BtReaderInfo {
    return {
      status: this.status,
      deviceName: this.deviceName || undefined,
      error: this.lastError || undefined,
      batteryLevel: this.batteryLevel,
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
      capturePhase: this.capturePhase,
      log: this._diagLog.slice(-50),
    };
  }

  private _addDiag(msg: string) {
    this._diagLog.push({ ts: Date.now(), msg });
    if (this._diagLog.length > 80) this._diagLog.shift();
    this.emit("diagnostics", this.getDiagnostics());
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        logger.error("[BluetoothFP] Event handler error:", e);
      }
    });
  }
}

export const bluetoothFingerprintService = new BluetoothFingerprintService();