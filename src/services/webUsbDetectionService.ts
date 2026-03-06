/**
 * webUsbDetectionService.ts
 * Detección WebUSB del lector DigitalPersona U.are.U 4500.
 *
 * Solo detecta si el dispositivo está conectado físicamente al USB.
 * NO intenta leer huellas — la captura real sigue usando el Lite Client o la cámara.
 *
 * Vendor ID:  0x05BA  (DigitalPersona, Inc.)
 */

import { logger } from "@/utils/logger";

const DP_VENDOR_ID = 0x05ba;

const KNOWN_PRODUCTS: Record<number, string> = {
  0x0007: "U.are.U 4000B",
  0x000a: "U.are.U 4500",
  0x0008: "U.are.U 5000",
};

export interface WebUsbDeviceInfo {
  connected: boolean;
  productName: string | null;
  manufacturerName: string | null;
  serialNumber: string | null;
}

type WebUsbCallback = (info: WebUsbDeviceInfo) => void;

const EMPTY_INFO: WebUsbDeviceInfo = { connected: false, productName: null, manufacturerName: null, serialNumber: null };

class WebUsbDetectionService {
  private listeners: Set<WebUsbCallback> = new Set();
  private lastInfo: WebUsbDeviceInfo = { ...EMPTY_INFO };

  constructor() {
    if (this.isSupported()) {
      const usb = (navigator as any).usb;
      usb.addEventListener("connect", () => this.detectPaired());
      usb.addEventListener("disconnect", () => setTimeout(() => this.detectPaired(), 300));
    }
  }

  isSupported(): boolean {
    return typeof navigator !== "undefined" && !!(navigator as any).usb;
  }

  /** Silently check already-paired devices (no permission prompt) */
  async detectPaired(): Promise<WebUsbDeviceInfo> {
    if (!this.isSupported()) return this.emit({ ...EMPTY_INFO });

    try {
      const usb = (navigator as any).usb;
      const devices: any[] = await usb.getDevices();
      const dp = devices.find((d: any) => d.vendorId === DP_VENDOR_ID);
      if (dp) {
        const info: WebUsbDeviceInfo = {
          connected: true,
          productName: dp.productName || KNOWN_PRODUCTS[dp.productId] || `DigitalPersona (0x${dp.productId.toString(16)})`,
          manufacturerName: dp.manufacturerName || "DigitalPersona, Inc.",
          serialNumber: dp.serialNumber || null,
        };
        logger.info("[WebUSB] Dispositivo pareado detectado:", info.productName);
        return this.emit(info);
      }
    } catch (e) {
      logger.warn("[WebUSB] Error al buscar dispositivos pareados:", e);
    }
    return this.emit({ ...EMPTY_INFO });
  }

  /**
   * Prompt the user to select the DigitalPersona device.
   * REQUIRES a user gesture (click). Once paired, detectPaired() finds it automatically.
   */
  async requestDevice(): Promise<WebUsbDeviceInfo> {
    if (!this.isSupported()) return { ...EMPTY_INFO };

    try {
      const usb = (navigator as any).usb;
      const device = await usb.requestDevice({ filters: [{ vendorId: DP_VENDOR_ID }] });
      const info: WebUsbDeviceInfo = {
        connected: true,
        productName: device.productName || KNOWN_PRODUCTS[device.productId] || `DigitalPersona (0x${device.productId.toString(16)})`,
        manufacturerName: device.manufacturerName || "DigitalPersona, Inc.",
        serialNumber: device.serialNumber || null,
      };
      logger.info("[WebUSB] Dispositivo seleccionado:", info.productName);
      return this.emit(info);
    } catch (e: any) {
      if (e?.name === "NotFoundError") {
        logger.info("[WebUSB] Usuario canceló la selección");
      } else {
        logger.warn("[WebUSB] Error al solicitar dispositivo:", e);
      }
      return { ...EMPTY_INFO };
    }
  }

  onChange(cb: WebUsbCallback) { this.listeners.add(cb); }
  offChange(cb: WebUsbCallback) { this.listeners.delete(cb); }
  getLastInfo(): WebUsbDeviceInfo { return this.lastInfo; }

  private emit(info: WebUsbDeviceInfo): WebUsbDeviceInfo {
    this.lastInfo = info;
    this.listeners.forEach((cb) => { try { cb(info); } catch {} });
    return info;
  }
}

export const webUsbDetectionService = new WebUsbDetectionService();
