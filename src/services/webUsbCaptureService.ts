/**
 * webUsbCaptureService.ts
 * Captura de huella dactilar vía WebUSB directo (sin agente local).
 *
 * Basado en el protocolo del DigitalPersona U.are.U 4500:
 *   Vendor ID:  0x05BA
 *   Product ID: 0x000A
 *   Imagen:     338 × 384 px (raw 8-bit grayscale)
 *
 * Referencia: github.com/kspionjak/dp4500 y libfprint/uru4000
 */

import { logger } from "@/utils/logger";

const DP_VENDOR_ID  = 0x05ba;
const DP_PRODUCT_ID = 0x000a;

// Image dimensions for the U.are.U 4500
const IMG_WIDTH  = 338;
const IMG_HEIGHT = 384;
const IMG_SIZE   = IMG_WIDTH * IMG_HEIGHT; // 129,792 bytes

export type WebUsbCaptureStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "capturing"
  | "error";

export interface WebUsbCaptureResult {
  success: boolean;
  imageBase64?: string; // data:image/png;base64,...
  width?: number;
  height?: number;
  error?: string;
}

type StatusCallback = (status: WebUsbCaptureStatus, message?: string) => void;

class WebUsbCaptureService {
  private device: any = null; // USBDevice (WebUSB API)
  private status: WebUsbCaptureStatus = "disconnected";
  private listeners: Set<StatusCallback> = new Set();
  private captureAbort: AbortController | null = null;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.usb;
  }

  getStatus(): WebUsbCaptureStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.device !== null && this.status === "connected";
  }

  /**
   * Connect to an already-paired DigitalPersona device, or prompt user to select one.
   */
  async connect(promptIfNeeded = true): Promise<boolean> {
    if (!this.isSupported()) {
      this.setStatus("error", "WebUSB no soportado en este navegador");
      return false;
    }

    this.setStatus("connecting");

    try {
      // First try to find an already-paired device
      const devices = await navigator.usb!.getDevices();
      let dp = devices.find(
        (d) => d.vendorId === DP_VENDOR_ID
      );

      // If not paired yet, prompt user
      if (!dp && promptIfNeeded) {
        try {
          dp = await navigator.usb!.requestDevice({
            filters: [{ vendorId: DP_VENDOR_ID }],
          });
        } catch (e: any) {
          if (e?.name === "NotFoundError") {
            this.setStatus("disconnected");
            return false; // User cancelled
          }
          throw e;
        }
      }

      if (!dp) {
        this.setStatus("disconnected");
        return false;
      }

      this.device = dp;

      // Open and claim
      await dp.open();
      logger.info("[WebUSB Capture] Device opened");

      if (dp.configuration === null) {
        await dp.selectConfiguration(1);
      }
      logger.info("[WebUSB Capture] Configuration selected:", dp.configuration?.configurationValue);

      await dp.claimInterface(0);
      logger.info("[WebUSB Capture] Interface 0 claimed");

      // Initialize the device
      await this.initializeDevice();

      this.setStatus("connected");
      logger.info("[WebUSB Capture] Connected to", dp.productName || "DigitalPersona device");
      return true;
    } catch (err: any) {
      logger.error("[WebUSB Capture] Connection error:", err);
      this.setStatus("error", err?.message || "Error de conexión");
      // Try to clean up
      try { await this.device?.close(); } catch { }
      this.device = null;
      return false;
    }
  }

  /**
   * Initialize the DigitalPersona device.
   * Sends vendor-specific control transfer to prepare for capture.
   */
  private async initializeDevice(): Promise<void> {
    if (!this.device) throw new Error("Device not connected");

    try {
      // Send initialization control transfer
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
      // Some devices may not need this exact init; continue anyway
      logger.warn("[WebUSB Capture] Init control transfer warning (may be ok):", e);
    }
  }

  /**
   * Start capture — waits for finger and reads image.
   * Returns a PNG base64 string.
   */
  async capture(timeoutMs = 30000): Promise<WebUsbCaptureResult> {
    if (!this.device) {
      return { success: false, error: "Huellero no conectado. Presione 'Vincular Huellero' primero." };
    }

    this.setStatus("capturing");
    this.captureAbort = new AbortController();

    try {
      // Send start capture command
      await this.startCapture();

      // Wait for finger presence
      const fingerDetected = await this.waitForFinger(timeoutMs);
      if (!fingerDetected) {
        this.setStatus("connected");
        return {
          success: false,
          error: "Tiempo de espera agotado. Coloque el dedo en el lector e intente de nuevo.",
        };
      }

      // Read fingerprint image
      const rawImage = await this.readImageData();

      // Convert raw grayscale to PNG base64
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
      logger.error("[WebUSB Capture] Capture error:", err);
      this.setStatus("connected");
      return {
        success: false,
        error: err?.message || "Error al capturar la huella",
      };
    } finally {
      this.captureAbort = null;
    }
  }

  /**
   * Send start capture command via control transfer.
   */
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

  /**
   * Poll finger status via control transfer.
   */
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
        // Some reads may fail intermittently, keep trying
        logger.warn("[WebUSB Capture] Finger status read warning:", e);
      }

      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  /**
   * Read raw image data from bulk IN endpoint.
   */
  private async readImageData(): Promise<Uint8Array> {
    // Read image data in chunks — endpoint 1 (IN)
    const chunks: Uint8Array[] = [];
    let totalRead = 0;
    const maxRead = IMG_SIZE + 1024; // some padding

    while (totalRead < IMG_SIZE) {
      const remaining = Math.min(16384, maxRead - totalRead); // 16KB chunks
      const result = await this.device!.transferIn(1, remaining);

      if (result.data && result.data.byteLength > 0) {
        const chunk = new Uint8Array(result.data.buffer);
        chunks.push(chunk);
        totalRead += chunk.length;
        logger.info(`[WebUSB Capture] Read ${totalRead}/${IMG_SIZE} bytes`);
      } else {
        break;
      }
    }

    // Merge chunks
    const merged = new Uint8Array(totalRead);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Trim or pad to exact image size
    if (merged.length >= IMG_SIZE) {
      return merged.slice(0, IMG_SIZE);
    }

    // If we got less data, pad with white
    const padded = new Uint8Array(IMG_SIZE);
    padded.fill(255);
    padded.set(merged);
    return padded;
  }

  /**
   * Convert raw 8-bit grayscale to PNG via canvas.
   */
  private rawToPngBase64(raw: Uint8Array, w: number, h: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;

    for (let i = 0; i < w * h; i++) {
      const v = raw[i] || 255;
      d[i * 4] = v;
      d[i * 4 + 1] = v;
      d[i * 4 + 2] = v;
      d[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  /**
   * Cancel an ongoing capture.
   */
  cancelCapture(): void {
    this.captureAbort?.abort();
    this.setStatus("connected");
  }

  /**
   * Disconnect and release the device.
   */
  async disconnect(): Promise<void> {
    this.cancelCapture();
    try {
      if (this.device) {
        await this.device.releaseInterface(0).catch(() => { });
        await this.device.close().catch(() => { });
      }
    } catch { }
    this.device = null;
    this.setStatus("disconnected");
    logger.info("[WebUSB Capture] Disconnected");
  }

  // ── Events ─────────────────────────────────────────────────
  onStatusChange(cb: StatusCallback) {
    this.listeners.add(cb);
  }
  offStatusChange(cb: StatusCallback) {
    this.listeners.delete(cb);
  }

  private setStatus(status: WebUsbCaptureStatus, message?: string) {
    this.status = status;
    this.listeners.forEach((cb) => {
      try { cb(status, message); } catch { }
    });
  }
}

export const webUsbCaptureService = new WebUsbCaptureService();
