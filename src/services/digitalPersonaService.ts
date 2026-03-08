/**
 * digitalPersonaService.ts
 * Comunicación con el agente local DigitalPersona Lite Client
 * para el lector de huella USB U.are.U 4500.
 *
 * El Lite Client corre como servicio Windows y expone un WebSocket
 * en wss://127.0.0.1:9986 (puerto configurable).
 *
 * Protocolo: JSON sobre WebSocket — comandos enumerativos y respuestas
 * con base64 de la imagen PNG de la huella.
 */

import { logger } from "@/utils/logger";

// ─── Configuración ────────────────────────────────────────────────────────────
const DEFAULT_PORTS = [9986, 9987, 9000, 9001]; // puertos comunes del Lite Client/Web SDK
const DEFAULT_HOSTS = ["127.0.0.1", "localhost", "[::1]"]; // variantes localhost
const WS_PROTOCOLS = ["ws", "wss"]; // preferir ws local para evitar problemas de TLS/certificados
const DISCOVERY_PORTS = [52181, 52182]; // broker de conexión usado por WebSDK moderno
const DISCOVERY_PROTOCOLS = ["https", "http"];
const CONNECTION_TIMEOUT = 1200; // ms
const DETECTION_RETRIES = 1;

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
  private ws: WebSocket | null = null;
  private status: ReaderStatus = "disconnected";
  private deviceName: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private captureResolve: ((result: CaptureResult) => void) | null = null;
  private connectedPort: number | null = null;
  private connectedHost: string | null = null;
  private lastDetectError: string | null = null;

  // ── Detectar si el Lite Client está corriendo ──────────────────────────
  async detect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN && this.isConnected()) {
      return true;
    }

    this.lastDetectError = null;
    const attemptedEndpoints = new Set<string>();
    const attemptErrors: string[] = [];

    const dynamicEndpoint = await this.discoverWebSdkEndpoint();
    const endpoints = this.buildCandidateEndpoints(dynamicEndpoint || undefined);

    for (let retry = 1; retry <= DETECTION_RETRIES; retry++) {
      for (const endpoint of endpoints) {
        attemptedEndpoints.add(endpoint.url);

        const result = await this.tryConnect(endpoint);
        if (result.ok) {
          this.connectedPort = endpoint.port;
          this.connectedHost = endpoint.host;
          this.lastDetectError = null;
          logger.info(`[DigitalPersona] Lite Client detectado en ${endpoint.url}`);
          return true;
        }

        if (result.error) {
          attemptErrors.push(`${endpoint.url} (${result.error})`);
        }
      }
    }

    const endpointList = Array.from(attemptedEndpoints).join(", ");
    const diagnosis = attemptErrors.length
      ? ` | Diagnóstico: ${attemptErrors.slice(0, 4).join("; ")}`
      : "";

    this.lastDetectError = `No hubo respuesta del Lite Client en: ${endpointList}${diagnosis}`;
    this.status = "disconnected";
    logger.info("[DigitalPersona] Lite Client no detectado");
    return false;
  }

  private async discoverWebSdkEndpoint(): Promise<{ protocol: string; host: string; port: number; path: string; url: string } | null> {
    for (const protocol of DISCOVERY_PROTOCOLS) {
      for (const host of DEFAULT_HOSTS) {
        for (const port of DISCOVERY_PORTS) {
          const discoveryUrl = `${protocol}://${host}:${port}/get_connection`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

          try {
            const response = await fetch(discoveryUrl, {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            });
            if (!response.ok) continue;

            const payload = await response.json().catch(() => null);
            const endpoint = payload?.endpoint || payload?.Endpoint;
            if (typeof endpoint !== "string") continue;

            const parsed = new URL(endpoint);
            const wsProtocol = parsed.protocol === "https:" ? "wss" : "ws";
            const hostValue = parsed.hostname;
            const portValue = parsed.port ? Number(parsed.port) : wsProtocol === "wss" ? 443 : 80;
            const pathValue = `${parsed.pathname}${parsed.search}`;
            const wsUrl = `${wsProtocol}://${hostValue}:${portValue}${pathValue}`;

            logger.info(`[DigitalPersona] Endpoint WebSDK descubierto en ${discoveryUrl}: ${wsUrl}`);
            return {
              protocol: wsProtocol,
              host: hostValue,
              port: portValue,
              path: pathValue,
              url: wsUrl,
            };
          } catch {
            // ignorar fallos en discovery y continuar
          } finally {
            clearTimeout(timeout);
          }
        }
      }
    }

    return null;
  }

  private buildCandidateEndpoints(
    preferredEndpoint?: { protocol: string; host: string; port: number; path: string; url: string }
  ): Array<{ protocol: string; host: string; port: number; path: string; url: string }> {
    const hosts = this.connectedHost
      ? [this.connectedHost, ...DEFAULT_HOSTS.filter((h) => h !== this.connectedHost)]
      : [...DEFAULT_HOSTS];

    const ports = this.connectedPort
      ? [this.connectedPort, ...DEFAULT_PORTS.filter((p) => p !== this.connectedPort)]
      : [...DEFAULT_PORTS];

    const endpoints: Array<{ protocol: string; host: string; port: number; path: string; url: string }> = [];
    const seen = new Set<string>();

    if (preferredEndpoint) {
      seen.add(preferredEndpoint.url);
      endpoints.push(preferredEndpoint);
    }

    for (const protocol of WS_PROTOCOLS) {
      for (const host of hosts) {
        for (const port of ports) {
          const url = `${protocol}://${host}:${port}`;
          if (seen.has(url)) continue;
          seen.add(url);
          endpoints.push({ protocol, host, port, path: "", url });
        }
      }
    }

    return endpoints;
  }

  private tryConnect(
    endpoint: { protocol: string; host: string; port: number; path: string; url: string }
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      let ws: WebSocket;
      let settled = false;
      let openGraceTimeout: ReturnType<typeof setTimeout> | null = null;
      let transientError: string | undefined;

      const settle = (ok: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        if (openGraceTimeout) clearTimeout(openGraceTimeout);
        resolve({ ok, error });
      };

      try {
        ws = new WebSocket(`${protocol}://${host}:${port}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "constructor_error";
        settle(false, message);
        return;
      }

      const timeout = setTimeout(() => {
        try { ws.close(); } catch {}
        settle(false, "timeout");
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        // Algunos Lite Client aceptan conexión pero demoran/omiten la primera respuesta.
        // Si el socket abre correctamente, damos una ventana corta antes de descartar.
        openGraceTimeout = setTimeout(() => {
          clearTimeout(timeout);
          this.ws = ws;
          this.status = "connected";
          this.deviceName = this.deviceName || "DigitalPersona U.are.U";
          this.setupListeners(ws);
          this.emit("statusChange", this.getInfo());
          settle(true);
        }, 500);

        try {
          ws.send(JSON.stringify({
            Action: "wireformat.QueryDevices",
            Type: "cyclic"
          }));
        } catch {
          // Si falla el send, dejamos que timeout/onclose resuelvan el intento.
        }
      };

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        if (openGraceTimeout) clearTimeout(openGraceTimeout);

        try {
          const data = JSON.parse(event.data);

          // Respuesta típica del Lite Client (con o sin dispositivo conectado)
          const looksLikeLiteClient =
            data.Devices !== undefined ||
            data.DeviceID !== undefined ||
            (typeof data.Action === "string" && data.Action.startsWith("wireformat."));

          if (looksLikeLiteClient) {
            this.ws = ws;
            this.status = "connected";
            this.setupListeners(ws);
            if (Array.isArray(data.Devices) && data.Devices.length > 0) {
              this.deviceName = data.Devices[0].DeviceName || "U.are.U 4500";
            } else {
              this.deviceName = "DigitalPersona U.are.U";
            }
            this.emit("statusChange", this.getInfo());
            settle(true);
          } else {
            ws.close();
            settle(false, "unexpected_payload");
          }
        } catch {
          // Si el mensaje no es JSON, pero el socket ya abrió, aceptamos como servicio local activo.
          this.ws = ws;
          this.status = "connected";
          this.deviceName = this.deviceName || "DigitalPersona U.are.U";
          this.setupListeners(ws);
          this.emit("statusChange", this.getInfo());
          settle(true);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        transientError = transientError || "socket_error";
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        settle(false, transientError || `closed_${event.code || 0}`);
      };
    });
  }

  private setupListeners(ws: WebSocket) {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        logger.error("[DigitalPersona] Error parsing message:", e);
      }
    };

    ws.onclose = () => {
      this.status = "disconnected";
      this.ws = null;
      this.emit("statusChange", this.getInfo());
      logger.info("[DigitalPersona] WebSocket cerrado");
    };

    ws.onerror = (e) => {
      this.status = "error";
      this.emit("statusChange", this.getInfo());
      logger.error("[DigitalPersona] WebSocket error:", e);
    };
  }

  private handleMessage(data: any) {
    // Dispositivo conectado/desconectado
    if (data.Action === "wireformat.DeviceConnected") {
      this.deviceName = data.DeviceName || "U.are.U 4500";
      this.status = "connected";
      this.emit("deviceConnected", { name: this.deviceName });
      this.emit("statusChange", this.getInfo());
    }

    if (data.Action === "wireformat.DeviceDisconnected") {
      this.status = "disconnected";
      this.emit("deviceDisconnected", {});
      this.emit("statusChange", this.getInfo());
    }

    // Reporte de calidad durante captura
    if (data.Action === "wireformat.QualityReported") {
      this.emit("quality", { quality: data.Quality });
    }

    // Muestras adquiridas (la huella)
    if (data.Action === "wireformat.SamplesAcquired" || data.Samples) {
      const samples = data.Samples || [];
      if (samples.length > 0) {
        const imageData = samples[0]; // Base64 PNG
        const imageBase64 = imageData.startsWith("data:")
          ? imageData
          : `data:image/png;base64,${imageData}`;

        this.status = "connected";
        this.emit("statusChange", this.getInfo());
        this.emit("captured", { imageBase64, quality: data.Quality });

        if (this.captureResolve) {
          this.captureResolve({
            success: true,
            imageBase64,
            quality: data.Quality,
          });
          this.captureResolve = null;
        }
      }
    }

    // Error durante captura
    if (data.Action === "wireformat.ErrorOccurred" || data.Error) {
      const error = data.Error || data.Message || "Error del lector";
      this.status = "connected";
      this.emit("statusChange", this.getInfo());
      this.emit("error", { error });

      if (this.captureResolve) {
        this.captureResolve({ success: false, error });
        this.captureResolve = null;
      }
    }
  }

  // ── Iniciar captura ────────────────────────────────────────────────────
  async startCapture(): Promise<CaptureResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: "Lector no conectado" };
    }

    this.status = "capturing";
    this.emit("statusChange", this.getInfo());

    return new Promise((resolve) => {
      this.captureResolve = resolve;

      // Timeout de 30 segundos para la captura
      const timeout = setTimeout(() => {
        if (this.captureResolve) {
          this.captureResolve = null;
          this.status = "connected";
          this.emit("statusChange", this.getInfo());
          resolve({
            success: false,
            error: "Tiempo de espera agotado. Coloque el dedo en el lector e intente de nuevo.",
          });
        }
      }, 30000);

      // Enviar comando de captura (formato PNG)
      this.ws!.send(JSON.stringify({
        Action: "wireformat.StartAcquisition",
        SampleFormat: 3, // PngImage = 3 en el enum de DigitalPersona
      }));

      // Limpiar timeout cuando se resuelva
      const originalResolve = this.captureResolve;
      this.captureResolve = (result) => {
        clearTimeout(timeout);
        originalResolve?.(result);
        resolve(result);
      };
    });
  }

  // ── Detener captura ────────────────────────────────────────────────────
  stopCapture() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        Action: "wireformat.StopAcquisition",
      }));
    }
    this.status = "connected";
    this.captureResolve = null;
    this.emit("statusChange", this.getInfo());
  }

  // ── Desconectar ────────────────────────────────────────────────────────
  disconnect() {
    this.stopCapture();
    this.ws?.close();
    this.ws = null;
    this.status = "disconnected";
    this.connectedPort = null;
    this.connectedHost = null;
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
