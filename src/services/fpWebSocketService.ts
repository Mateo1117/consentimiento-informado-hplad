// SHU0809 Fingerprint Reader - WebSocket Bridge Service
// Communicates with local FPService on ws://127.0.0.1:21187/fps

export type FpStatus =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'place_finger'
  | 'lift_finger'
  | 'success'
  | 'timeout'
  | 'error';

export interface FpEvent {
  workmsg: number;
  retmsg?: number | string;
  data1?: string;
  image?: string;
}

export interface FpServiceInfo {
  status: FpStatus;
  message: string;
  deviceSN?: string;
  lastImage?: string;
  lastTemplate?: string;
}

type StatusListener = (info: FpServiceInfo) => void;

const WS_URL = 'ws://127.0.0.1:21187/fps';

class FpWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: StatusListener[] = [];
  private info: FpServiceInfo = { status: 'disconnected', message: 'Desconectado' };
  private captureResolve: ((result: { success: boolean; imageBase64?: string; template?: string; error?: string }) => void) | null = null;
  private captureTimeout: ReturnType<typeof setTimeout> | null = null;
  private autoReconnect = false;

  getInfo(): FpServiceInfo {
    return { ...this.info };
  }

  on(listener: StatusListener) {
    this.listeners.push(listener);
  }

  off(listener: StatusListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private emit() {
    const snapshot = { ...this.info };
    this.listeners.forEach(l => l(snapshot));
  }

  private setStatus(status: FpStatus, message: string) {
    this.info.status = status;
    this.info.message = message;
    this.emit();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve(true);

    return new Promise((resolve) => {
      this.setStatus('connecting', 'Conectando con FPService...');
      this.autoReconnect = true;

      try {
        this.ws = new WebSocket(WS_URL);
      } catch {
        this.setStatus('error', 'No se pudo conectar al servicio local FPService');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          this.setStatus('error', 'Tiempo de conexión agotado con FPService');
          resolve(false);
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.setStatus('ready', 'FPService conectado — lector listo');
        // Try to get device serial
        this.send({ cmd: 'getsn', data1: '', data2: '' });
        resolve(true);
      };

      this.ws.onmessage = (evt) => {
        try {
          const obj: FpEvent = JSON.parse(evt.data);
          this.handleMessage(obj);
        } catch {
          // ignore malformed
        }
      };

      this.ws.onclose = () => {
        clearTimeout(timeout);
        this.setStatus('disconnected', 'FPService desconectado');
        if (this.autoReconnect) {
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        this.setStatus('error', 'FPService no detectado. Instale el servicio en su dispositivo.');
        resolve(false);
      };
    });
  }

  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.captureTimeout) {
      clearTimeout(this.captureTimeout);
      this.captureTimeout = null;
    }
    if (this.captureResolve) {
      this.captureResolve({ success: false, error: 'Desconectado' });
      this.captureResolve = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected', 'Desconectado');
  }

  private send(cmd: object) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.setStatus('error', 'FPService no conectado');
      return;
    }
    this.ws.send(JSON.stringify(cmd));
  }

  /**
   * Capture a fingerprint. Returns a promise with the image (base64 PNG/JPEG).
   * The FPService sends workmsg=7 (PNG) or workmsg=18 (JPEG) with the image.
   */
  capture(timeoutMs = 30000): Promise<{ success: boolean; imageBase64?: string; template?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve({ success: false, error: 'FPService no conectado' });
        return;
      }

      this.captureResolve = resolve;

      this.captureTimeout = setTimeout(() => {
        if (this.captureResolve) {
          this.captureResolve({ success: false, error: 'Tiempo de espera agotado' });
          this.captureResolve = null;
        }
        this.setStatus('timeout', 'Tiempo de espera agotado');
      }, timeoutMs);

      // Send capture command
      this.send({ cmd: 'capture', data1: '2', data2: '0' });
      this.setStatus('place_finger', 'Coloque el dedo en el lector...');
    });
  }

  private handleMessage(obj: FpEvent) {
    switch (obj.workmsg) {
      case 1:
        this.setStatus('error', 'Por favor conecte el dispositivo de huella');
        this.resolveCaptureError('Dispositivo no conectado');
        break;

      case 2:
        this.setStatus('place_finger', 'Coloque el dedo en el lector...');
        break;

      case 3:
        this.setStatus('lift_finger', 'Levante el dedo del lector...');
        break;

      case 5: // capture result with template
        if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
          this.info.lastTemplate = obj.data1;
          // Template captured — wait for image (workmsg 7 or 18)
          // If no image comes within 2s, resolve with template only
          setTimeout(() => {
            if (this.captureResolve) {
              this.setStatus('success', 'Huella capturada (template)');
              this.captureResolve({
                success: true,
                template: obj.data1!,
                imageBase64: this.info.lastImage,
              });
              this.captureResolve = null;
              if (this.captureTimeout) clearTimeout(this.captureTimeout);
            }
          }, 2000);
        } else {
          this.setStatus('error', 'Fallo al capturar, intente de nuevo');
          this.resolveCaptureError('Fallo al capturar huella');
        }
        break;

      case 6: // enroll result
        if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
          this.info.lastTemplate = obj.data1;
          this.setStatus('success', 'Huella registrada correctamente');
        }
        break;

      case 7: // PNG image
        if (obj.image && obj.image !== 'null') {
          const base64 = obj.image.startsWith('data:') ? obj.image : `data:image/png;base64,${obj.image}`;
          this.info.lastImage = base64;
          this.setStatus('success', 'Huella capturada correctamente');
          if (this.captureResolve) {
            if (this.captureTimeout) clearTimeout(this.captureTimeout);
            this.captureResolve({
              success: true,
              imageBase64: base64,
              template: this.info.lastTemplate,
            });
            this.captureResolve = null;
          }
        }
        break;

      case 8:
        this.setStatus('timeout', 'Tiempo de espera agotado en el lector');
        this.resolveCaptureError('Tiempo de espera agotado en el lector');
        break;

      case 9: {
        const score = Number(obj.retmsg);
        const matched = score >= 60;
        this.setStatus(matched ? 'success' : 'error',
          matched ? `Match exitoso (score: ${score})` : `No coincide (score: ${score})`);
        break;
      }

      case 15:
        this.setStatus(
          obj.retmsg === 1 ? 'ready' : 'error',
          obj.retmsg === 1 ? 'Dispositivo reconectado' : 'Error al reconectar'
        );
        break;

      case 18: // JPEG image
        if (obj.image && obj.image !== 'null') {
          const base64 = obj.image.startsWith('data:') ? obj.image : `data:image/jpeg;base64,${obj.image}`;
          this.info.lastImage = base64;
          this.setStatus('success', 'Huella capturada correctamente');
          if (this.captureResolve) {
            if (this.captureTimeout) clearTimeout(this.captureTimeout);
            this.captureResolve({
              success: true,
              imageBase64: base64,
              template: this.info.lastTemplate,
            });
            this.captureResolve = null;
          }
        }
        break;

      case 19: // Device serial number
        if (obj.image) {
          this.info.deviceSN = obj.image;
          this.emit();
        }
        break;
    }
  }

  private resolveCaptureError(error: string) {
    if (this.captureResolve) {
      if (this.captureTimeout) clearTimeout(this.captureTimeout);
      this.captureResolve({ success: false, error });
      this.captureResolve = null;
    }
  }
}

export const fpWebSocketService = new FpWebSocketService();
