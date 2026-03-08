/**
 * webUsbCaptureService.ts
 * Captura de huella dactilar vía WebUSB directo (sin agente local).
 *
 * Basado en el protocolo del DigitalPersona U.are.U 4500:
 *   Vendor ID:  0x05BA
 *   Product ID: 0x000A
 *   Imagen:     338 × 384 px (raw 8-bit grayscale)
 */

import { logger } from "@/utils/logger";

const DP_VENDOR_ID = 0x05ba;
const DP_PRODUCT_ID = 0x000a;

const IMG_WIDTH = 338;
const IMG_HEIGHT = 384;
const IMG_SIZE = IMG_WIDTH * IMG_HEIGHT;

export type WebUsbCaptureStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "capturing"
  | "error";

export interface WebUsbCaptureResult {
  success: boolean;
  imageBase64?: string;
  width?: number;
  height?: number;
  error?: string;
}

type StatusCallback = (status: WebUsbCaptureStatus, message?: string) => void;

class WebUsbCaptureService {
  private device: any = null;
  private status: WebUsbCaptureStatus = "disconnected";
  private listeners: Set<StatusCallback> = new Set();
  private captureAbort: AbortController | null = null;
  private inEndpointNumber: number | null = null;
  private claimedInterfaceNumber: number | null = null;
  private lastError: string | null = null;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.usb;
  }

  getStatus(): WebUsbCaptureStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  isConnected(): boolean {
    return this.device !== null && this.status === "connected";
  }

  async connect(promptIfNeeded = true): Promise<boolean> {
    if (!this.isSupported()) {
      const message = "WebUSB no soportado en este navegador";
      this.lastError = message;
      this.setStatus("error", message);
      return false;
    }

    this.lastError = null;
    this.setStatus("connecting");

    try {
      const devices = await navigator.usb!.getDevices();
      let dp = devices.find(
        (d) => d.vendorId === DP_VENDOR_ID && d.productId === DP_PRODUCT_ID
      );

      if (!dp) {
        dp = devices.find((d) => d.vendorId === DP_VENDOR_ID);
      }

      if (!dp && promptIfNeeded) {
        try {
          dp = await navigator.usb!.requestDevice({
            filters: [{ vendorId: DP_VENDOR_ID, productId: DP_PRODUCT_ID }, { vendorId: DP_VENDOR_ID }],
          });
        } catch (e: any) {
          if (e?.name === "NotFoundError") {
            this.setStatus("disconnected");
            return false;
          }
          throw e;
        }
      }

      if (!dp) {
        this.lastError = "No se encontró un dispositivo DigitalPersona pareado en Chrome.";
        this.setStatus("disconnected", this.lastError);
        return false;
      }

      this.device = dp;

      if (!dp.opened) {
        await dp.open();
      }
      logger.info("[WebUSB Capture] Device opened", {
        productName: dp.productName,
        vendorId: dp.vendorId,
        productId: dp.productId,
      });

      if (dp.configuration === null) {
        const fallbackConfiguration = dp.configurations[0]?.configurationValue ?? 1;
        await dp.selectConfiguration(fallbackConfiguration);
      }

      await this.claimCaptureInterface();
      await this.initializeDevice();

      this.setStatus("connected");
      logger.info("[WebUSB Capture] Connected to", dp.productName || "DigitalPersona device");
      return true;
    } catch (err: any) {
      const message = this.formatWebUsbError(err);
      this.lastError = message;
      logger.error("[WebUSB Capture] Connection error:", {
        message,
        name: err?.name,
        code: err?.code,
        raw: err,
      });
      this.setStatus("error", message);
      await this.cleanupConnection();
      return false;
    }
  }

  private async claimCaptureInterface(): Promise<void> {
    if (!this.device) throw new Error("Device not connected");
    if (!this.device.configuration) throw new Error("No se encontró configuración USB del dispositivo.");

    const interfaces = this.device.configuration.interfaces ?? [];
    let selectedInterface: number | null = null;
    let selectedAlternate: number | null = null;
    let selectedEndpoint: number | null = null;

    for (const intf of interfaces) {
      for (const alt of intf.alternates) {
        const endpoint = alt.endpoints.find(
          (ep) => ep.direction === "in" && (ep.type === "bulk" || ep.type === "interrupt")
        );

        if (endpoint) {
          selectedInterface = intf.interfaceNumber;
          selectedAlternate = alt.alternateSetting;
          selectedEndpoint = endpoint.endpointNumber;
          break;
        }
      }
      if (selectedInterface !== null) break;
    }

    if (selectedInterface === null || selectedEndpoint === null) {
      throw new Error("No se encontró una interfaz de captura válida en el huellero USB.");
    }

    if (selectedAlternate !== null && selectedAlternate > 0) {
      await this.device.selectAlternateInterface(selectedInterface, selectedAlternate);
    }

    await this.device.claimInterface(selectedInterface);

    this.claimedInterfaceNumber = selectedInterface;
    this.inEndpointNumber = selectedEndpoint;

    logger.info("[WebUSB Capture] Interface/endpoint claimed", {
      interfaceNumber: selectedInterface,
      alternateSetting: selectedAlternate,
      endpointIn: selectedEndpoint,
    });
  }

  private async initializeDevice(): Promise<void> {
    if (!this.device) throw new Error("Device not connected");

    try {
      const initCmd = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      await this.device.controlTransferOut(
        {
          requestType: "vendor",
          recipient: "device",
          request: 0x04,
          value: 0x0000,
          index: 0x0000,
        },
        initCmd
      );
      logger.info("[WebUSB Capture] Device initialized");
    } catch (e) {
      logger.warn("[WebUSB Capture] Init control transfer warning (may be ok):", e);
    }
  }

  async capture(timeoutMs = 30000): Promise<WebUsbCaptureResult> {
    if (!this.device) {
      return { success: false, error: "Huellero no conectado. Presione 'Vincular Huellero' primero." };
    }

    this.setStatus("capturing");
    this.captureAbort = new AbortController();

    try {
      await this.startCapture();

      const fingerDetected = await this.waitForFinger(timeoutMs);
      if (!fingerDetected) {
        this.setStatus("connected");
        return {
          success: false,
          error: "Tiempo de espera agotado. Coloque el dedo en el lector e intente de nuevo.",
        };
      }

      const rawImage = await this.readImageData();
      const pngBase64 = this.rawToPngBase64(rawImage, IMG_WIDTH, IMG_HEIGHT);

      this.setStatus("connected");
      logger.info("[WebUSB Capture] Fingerprint captured successfully");

      return {
        success: true,
        imageBase64: pngBase64,
        width: IMG_WIDTH,
        height: IMG_HEIGHT,
      };
    } catch (err: any) {
      const message = this.formatWebUsbError(err);
      this.lastError = message;
      logger.error("[WebUSB Capture] Capture error:", {
        message,
        name: err?.name,
        code: err?.code,
        raw: err,
      });
      this.setStatus("connected");
      return {
        success: false,
        error: message,
      };
    } finally {
      this.captureAbort = null;
    }
  }

  private async startCapture(): Promise<void> {
    const cmd = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    await this.device!.controlTransferOut(
      {
        requestType: "vendor",
        recipient: "device",
        request: 0x02,
        value: 0x0000,
        index: 0x0000,
      },
      cmd
    );
    logger.info("[WebUSB Capture] Capture started, waiting for finger...");
  }

  private async waitForFinger(timeoutMs: number): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (this.captureAbort?.signal.aborted) return false;

      try {
        const result = await this.device!.controlTransferIn(
          {
            requestType: "vendor",
            recipient: "device",
            request: 0x03,
            value: 0x0000,
            index: 0x0000,
          },
          1
        );

        if (result.data && result.data.getUint8(0) === 1) {
          logger.info("[WebUSB Capture] Finger detected");
          return true;
        }
      } catch (e) {
        logger.warn("[WebUSB Capture] Finger status read warning:", e);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return false;
  }

  private async readImageData(): Promise<Uint8Array> {
    if (!this.inEndpointNumber) {
      throw new Error("No hay endpoint de lectura USB disponible.");
    }

    const chunks: Uint8Array[] = [];
    let totalRead = 0;
    const maxRead = IMG_SIZE + 1024;

    while (totalRead < IMG_SIZE) {
      const remaining = Math.min(16384, maxRead - totalRead);
      const result = await this.device!.transferIn(this.inEndpointNumber, remaining);

      if (result.data && result.data.byteLength > 0) {
        const chunk = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
        chunks.push(chunk);
        totalRead += chunk.length;
      } else {
        break;
      }
    }

    const merged = new Uint8Array(totalRead);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    if (merged.length >= IMG_SIZE) {
      return merged.slice(0, IMG_SIZE);
    }

    const padded = new Uint8Array(IMG_SIZE);
    padded.fill(255);
    padded.set(merged);
    return padded;
  }

  private rawToPngBase64(raw: Uint8Array, w: number, h: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el contexto de imagen para la huella.");

    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;

    for (let i = 0; i < w * h; i++) {
      const v = raw[i] ?? 255;
      d[i * 4] = v;
      d[i * 4 + 1] = v;
      d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  cancelCapture(): void {
    this.captureAbort?.abort();
    this.setStatus("connected");
  }

  async disconnect(): Promise<void> {
    this.cancelCapture();
    await this.cleanupConnection();
    this.setStatus("disconnected");
    logger.info("[WebUSB Capture] Disconnected");
  }

  private async cleanupConnection(): Promise<void> {
    try {
      if (this.device) {
        if (this.claimedInterfaceNumber !== null) {
          await this.device.releaseInterface(this.claimedInterfaceNumber).catch(() => {});
        }
        await this.device.close().catch(() => {});
      }
    } finally {
      this.device = null;
      this.inEndpointNumber = null;
      this.claimedInterfaceNumber = null;
    }
  }

  private formatWebUsbError(err: any): string {
    const name = err?.name ? String(err.name) : "";
    const message = err?.message ? String(err.message) : "";

    if (name === "NotFoundError") {
      return "No se seleccionó el huellero en el diálogo de Chrome.";
    }

    if (name === "SecurityError") {
      return "WebUSB bloqueado: abra la aplicación desde la URL publicada (no desde el preview/iframe). Chrome requiere HTTPS y contexto de primer nivel.";
    }

    if (name === "NetworkError" || /claim/i.test(message)) {
      return "No se pudo reclamar la interfaz USB. Cierre software de DigitalPersona/SDK y reconecte el huellero.";
    }

    if (name === "InvalidStateError") {
      return "Estado USB inválido. Desconecte y vuelva a conectar el huellero.";
    }

    if (message) return message;
    return "Error de conexión WebUSB con el huellero.";
  }

  onStatusChange(cb: StatusCallback) {
    this.listeners.add(cb);
  }

  offStatusChange(cb: StatusCallback) {
    this.listeners.delete(cb);
  }

  private setStatus(status: WebUsbCaptureStatus, message?: string) {
    this.status = status;
    this.listeners.forEach((cb) => {
      try {
        cb(status, message);
      } catch {
        // noop
      }
    });
  }
}

export const webUsbCaptureService = new WebUsbCaptureService();
