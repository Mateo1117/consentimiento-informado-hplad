/**
 * digitalPersonaService.ts
 * Integración con DigitalPersona Lite Client / Authentication Device Client
 * usando las librerías oficiales @digitalpersona/websdk + @digitalpersona/fingerprint.
 *
 * Las librerías se cargan como IIFE en index.html y exponen los globals
 * `WebSdk` y `Fingerprint`.
 */

import { logger } from "@/utils/logger";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ReaderStatus = "disconnected" | "connecting" | "connected" | "capturing" | "error";

export interface ReaderInfo {
  status: ReaderStatus;
  deviceName?: string;
  error?: string;
}

export interface CaptureResult {
  success: boolean;
  imageBase64?: string; // data:image/png;base64,...
  quality?: number;
  error?: string;
}

type EventCallback = (data: any) => void;

// ─── Clase principal ──────────────────────────────────────────────────────────
class DigitalPersonaService {
  private reader: Fingerprint.WebApi | null = null;
  private status: ReaderStatus = "disconnected";
  private deviceName: string | null = null;
  private deviceUid: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private captureResolve: ((result: CaptureResult) => void) | null = null;
  private lastDetectError: string | null = null;

  // Diagnostics
  private _diagLog: Array<{ ts: number; msg: string }> = [];
  private _lastCloseCode: number | null = null;
  private _lastCloseReason: string | null = null;
  private _wsReadyState: number | null = null;
  private _discoveredEndpoint: string | null = null;
  private _attemptedEndpoints: string[] = [];
  private connectedPort: number | null = null;
  private connectedHost: string | null = null;

  // ── Verificar que las librerías están disponibles ─────────────────────
  private isSdkAvailable(): boolean {
    return typeof Fingerprint !== "undefined" && typeof Fingerprint.WebApi === "function";
  }

  // ── Detectar si el Lite Client está corriendo ─────────────────────────
  async detect(): Promise<boolean> {
    if (this.reader && this.status === "connected") {
      return true;
    }

    this.lastDetectError = null;
    this._diagLog = [];
    this._attemptedEndpoints = [];

    if (!this.isSdkAvailable()) {
      this.lastDetectError = "Las librerías DigitalPersona WebSDK no están cargadas. Verifique que los scripts estén incluidos en index.html.";
      this._addDiag("✗ SDK no disponible (Fingerprint.WebApi no encontrado)");
      this.status = "disconnected";
      return false;
    }

    this._addDiag("Inicializando Fingerprint.WebApi (SDK oficial)...");
    this.status = "connecting";
    this.emit("statusChange", this.getInfo());

    try {
      // Crear instancia del reader con opciones por defecto
      // El WebSDK maneja internamente el descubrimiento del broker y la conexión WebSocket
      const reader = new Fingerprint.WebApi({ debug: false });
      this.reader = reader;

      // Configurar event handlers
      this.setupSdkHandlers(reader);

      // Intentar enumerar dispositivos — si funciona, el Lite Client está corriendo
      const devices = await this.withTimeout(
        reader.enumerateDevices(),
        8000,
        "Timeout al conectar con el Lite Client"
      );

      this._addDiag(`Dispositivos encontrados: ${devices.length}`);

      if (devices.length > 0) {
        this.deviceUid = devices[0];
        // Intentar obtener info del dispositivo
        try {
          const info = await this.withTimeout(
            reader.getDeviceInfo(devices[0]),
            5000,
            "Timeout al obtener info del dispositivo"
          );
          this.deviceName = `DigitalPersona (${info.DeviceID})`;
          this._addDiag(`Dispositivo: ${info.DeviceID}`);
        } catch {
          this.deviceName = "DigitalPersona U.are.U";
          this._addDiag("Info del dispositivo no disponible, usando nombre genérico");
        }
      } else {
        this.deviceName = "DigitalPersona (sin lector conectado)";
        this._addDiag("Lite Client activo pero sin lector USB detectado");
      }

      this.status = "connected";
      this.connectedHost = "127.0.0.1";
      this.connectedPort = 52181;
      this._discoveredEndpoint = "WebSDK oficial (broker automático)";
      this.emit("statusChange", this.getInfo());
      this._addDiag("✓ Conectado al Lite Client vía SDK oficial");
      logger.info("[DigitalPersona] Lite Client detectado vía SDK oficial");
      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.lastDetectError = `No se pudo conectar al Lite Client: ${msg}`;
      this._addDiag(`✗ Error: ${msg}`);
      this.status = "disconnected";
      this.reader = null;
      logger.info("[DigitalPersona] Lite Client no detectado:", msg);
      return false;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errMsg)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); }
      );
    });
  }

  // ── Configurar handlers del SDK ──────────────────────────────────────
  private setupSdkHandlers(reader: Fingerprint.WebApi) {
    reader.onDeviceConnected = (event) => {
      this.deviceUid = event.deviceUid;
      this.deviceName = `DigitalPersona (${event.deviceUid})`;
      this.status = "connected";
      this._addDiag(`Dispositivo conectado: ${event.deviceUid}`);
      this.emit("deviceConnected", { name: this.deviceName });
      this.emit("statusChange", this.getInfo());
    };

    reader.onDeviceDisconnected = (event) => {
      this._addDiag(`Dispositivo desconectado: ${event.deviceUid}`);
      if (event.deviceUid === this.deviceUid) {
        this.deviceUid = null;
        this.status = "connected"; // Lite Client still running
        this.emit("deviceDisconnected", {});
        this.emit("statusChange", this.getInfo());
      }
    };

    reader.onSamplesAcquired = (event) => {
      this._addDiag(`Muestras adquiridas (formato: ${event.sampleFormat})`);
      
      // event.samples es un string base64url con los datos
      // Para PngImage, es un JSON array de base64url strings
      let imageBase64: string | null = null;
      const FP = Fingerprint as any; // avoid type conflicts with npm package d.ts
      
      try {
        const samplesData = JSON.parse(FP.b64UrlToUtf8(event.samples));
        if (Array.isArray(samplesData) && samplesData.length > 0) {
          // Cada sample es base64url encoded
          const rawB64 = FP.b64UrlTo64(samplesData[0]);
          imageBase64 = `data:image/png;base64,${rawB64}`;
        }
      } catch {
        // Fallback: try treating samples directly as base64
        try {
          const rawB64 = FP.b64UrlTo64(event.samples);
          imageBase64 = `data:image/png;base64,${rawB64}`;
        } catch {
          this._addDiag("Error al decodificar samples");
        }
      }

      if (imageBase64) {
        this.status = "connected";
        this.emit("statusChange", this.getInfo());
        this.emit("captured", { imageBase64 });

        if (this.captureResolve) {
          this.captureResolve({ success: true, imageBase64 });
          this.captureResolve = null;
        }
      } else {
        this._addDiag("No se pudo extraer imagen de las muestras");
        if (this.captureResolve) {
          this.captureResolve({ success: false, error: "No se pudo decodificar la huella capturada" });
          this.captureResolve = null;
        }
      }
    };

    reader.onQualityReported = (event) => {
      this._addDiag(`Calidad: ${Fingerprint.QualityCode[event.quality] || event.quality}`);
      this.emit("quality", { quality: event.quality });
    };

    reader.onErrorOccurred = (event) => {
      const errorMsg = `Error del lector (código: ${event.error})`;
      this._addDiag(`✗ ${errorMsg}`);
      this.status = "connected";
      this.emit("statusChange", this.getInfo());
      this.emit("error", { error: errorMsg });

      if (this.captureResolve) {
        this.captureResolve({ success: false, error: errorMsg });
        this.captureResolve = null;
      }
    };

    reader.onAcquisitionStarted = (event) => {
      this._addDiag(`Adquisición iniciada en ${event.deviceUid}`);
    };

    reader.onAcquisitionStopped = (event) => {
      this._addDiag(`Adquisición detenida en ${event.deviceUid}`);
    };

    reader.onCommunicationFailed = () => {
      this._addDiag("✗ Comunicación con Lite Client perdida");
      this.status = "error";
      this.lastDetectError = "Se perdió la comunicación con el Lite Client";
      this.emit("statusChange", this.getInfo());

      if (this.captureResolve) {
        this.captureResolve({ success: false, error: "Se perdió la comunicación con el Lite Client" });
        this.captureResolve = null;
      }
    };
  }

  // ── Iniciar captura ────────────────────────────────────────────────────
  async startCapture(): Promise<CaptureResult> {
    if (!this.reader) {
      return { success: false, error: "Lite Client no conectado" };
    }

    this.status = "capturing";
    this.emit("statusChange", this.getInfo());
    this._addDiag("Iniciando captura (formato PngImage)...");

    return new Promise<CaptureResult>(async (resolve) => {
      this.captureResolve = resolve;

      // Timeout de 30 segundos
      const timeout = setTimeout(() => {
        if (this.captureResolve) {
          this.captureResolve = null;
          this.status = "connected";
          this.emit("statusChange", this.getInfo());
          this._addDiag("✗ Timeout de captura (30s)");
          resolve({
            success: false,
            error: "Tiempo de espera agotado. Coloque el dedo en el lector e intente de nuevo.",
          });
        }
      }, 30000);

      // Limpiar timeout cuando se resuelva
      const originalResolve = this.captureResolve;
      this.captureResolve = (result) => {
        clearTimeout(timeout);
        originalResolve?.(result);
      };

      try {
        await this.reader!.startAcquisition(
          Fingerprint.SampleFormat.PngImage,
          this.deviceUid || undefined
        );
        this._addDiag("Esperando huella en el sensor...");
      } catch (err: any) {
        clearTimeout(timeout);
        this.captureResolve = null;
        const msg = err?.message || String(err);
        this._addDiag(`✗ Error al iniciar adquisición: ${msg}`);
        this.status = "connected";
        this.emit("statusChange", this.getInfo());
        resolve({ success: false, error: `Error al iniciar captura: ${msg}` });
      }
    });
  }

  // ── Detener captura ────────────────────────────────────────────────────
  stopCapture() {
    if (this.reader) {
      try {
        this.reader.stopAcquisition(this.deviceUid || undefined);
      } catch {
        // Ignorar errores al detener
      }
    }
    this.status = "connected";
    this.captureResolve = null;
    this.emit("statusChange", this.getInfo());
  }

  // ── Desconectar ────────────────────────────────────────────────────────
  disconnect() {
    this.stopCapture();
    if (this.reader) {
      this.reader.off(); // Remove all handlers
      this.reader = null;
    }
    this.status = "disconnected";
    this.connectedPort = null;
    this.connectedHost = null;
    this.deviceUid = null;
    this.emit("statusChange", this.getInfo());
  }

  // ── Estado ─────────────────────────────────────────────────────────────
  getInfo(): ReaderInfo {
    return {
      status: this.status,
      deviceName: this.deviceName || undefined,
      error: this.lastDetectError || undefined,
    };
  }

  getLastDetectError(): string | null {
    return this.lastDetectError;
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "capturing";
  }

  getDiagnostics() {
    return {
      status: this.status,
      wsReadyState: this.reader ? 1 : null, // SDK manages internally
      connectedPort: this.connectedPort,
      connectedHost: this.connectedHost,
      discoveredEndpoint: this._discoveredEndpoint,
      lastCloseCode: this._lastCloseCode,
      lastCloseReason: this._lastCloseReason,
      lastError: this.lastDetectError,
      attemptedEndpoints: this._attemptedEndpoints,
      log: this._diagLog.slice(-30),
    };
  }

  private _addDiag(msg: string) {
    this._diagLog.push({ ts: Date.now(), msg });
    if (this._diagLog.length > 50) this._diagLog.shift();
    this.emit("diagnostics", this.getDiagnostics());
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(data); } catch (e) { logger.error("[DigitalPersona] Event handler error:", e); }
    });
  }
}

// Singleton
export const digitalPersonaService = new DigitalPersonaService();
