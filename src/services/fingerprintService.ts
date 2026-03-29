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

export interface FpCallbacks {
  onStatus: (status: FpStatus, message: string) => void;
  onTemplate: (type: 'enroll' | 'capture', template: string) => void;
  onImage: (base64: string, format: 'png' | 'jpeg') => void;
  onMatchScore: (score: number, matched: boolean) => void;
  onDeviceSN: (sn: string) => void;
}

const WS_URL = 'ws://127.0.0.1:21187/fps';

export class FingerprintService {
  private ws: WebSocket | null = null;
  private callbacks: FpCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: FpCallbacks) {
    this.callbacks = callbacks;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.callbacks.onStatus('connecting', 'Conectando con lector de huella...');

    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      this.callbacks.onStatus('error', 'No se pudo conectar al servicio local de huella dactilar');
      return;
    }

    this.ws.onopen = () => {
      this.callbacks.onStatus('ready', 'Lector de huella listo');
    };

    this.ws.onmessage = (evt) => {
      try {
        const obj: FpEvent = JSON.parse(evt.data);
        this.handleMessage(obj);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onStatus('disconnected', 'Lector desconectado');
      // Auto-reconnect after 3s
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.callbacks.onStatus(
        'error',
        'Servicio FPService no detectado. Instale el servicio en su dispositivo.'
      );
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  private send(cmd: object) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.callbacks.onStatus('error', 'Lector no conectado');
      return;
    }
    this.ws.send(JSON.stringify(cmd));
  }

  enroll() {
    this.send({ cmd: 'enrol', data1: '2', data2: '0' }); // green tint, white bg
    this.callbacks.onStatus('place_finger', 'Coloque el dedo (se requieren 2 capturas)');
  }

  capture() {
    this.send({ cmd: 'capture', data1: '2', data2: '0' });
    this.callbacks.onStatus('place_finger', 'Coloque el dedo para verificar');
  }

  match(enrollTemplate: string, captureTemplate: string) {
    this.send({ cmd: 'match', data1: enrollTemplate, data2: captureTemplate });
  }

  openDevice() {
    this.send({ cmd: 'opendevice', data1: '', data2: '' });
  }

  getDeviceSN() {
    this.send({ cmd: 'getsn', data1: '', data2: '' });
  }

  private handleMessage(obj: FpEvent) {
    switch (obj.workmsg) {
      case 1:
        this.callbacks.onStatus('error', 'Por favor abra o conecte el dispositivo');
        break;
      case 2:
        this.callbacks.onStatus('place_finger', 'Coloque el dedo...');
        break;
      case 3:
        this.callbacks.onStatus('lift_finger', 'Levante el dedo...');
        break;
      case 5: // capture result
        if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
          this.callbacks.onStatus('success', 'Huella capturada correctamente');
          this.callbacks.onTemplate('capture', obj.data1);
        } else {
          this.callbacks.onStatus('error', 'Fallo al capturar huella, intente de nuevo');
        }
        break;
      case 6: // enroll result
        if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
          this.callbacks.onStatus('success', 'Huella registrada correctamente');
          this.callbacks.onTemplate('enroll', obj.data1);
        } else {
          this.callbacks.onStatus('error', 'Fallo al registrar huella, intente de nuevo');
        }
        break;
      case 7: // PNG image
        if (obj.image && obj.image !== 'null') {
          this.callbacks.onImage(obj.image, 'png');
        }
        break;
      case 8:
        this.callbacks.onStatus('timeout', 'Tiempo de espera agotado');
        break;
      case 9: {
        const score = Number(obj.retmsg);
        this.callbacks.onMatchScore(score, score >= 60);
        break;
      }
      case 15:
        this.callbacks.onStatus(
          obj.retmsg === 1 ? 'ready' : 'error',
          obj.retmsg === 1 ? 'Dispositivo reconectado' : 'Error al reconectar'
        );
        break;
      case 18: // JPEG image
        if (obj.image && obj.image !== 'null') {
          this.callbacks.onImage(obj.image, 'jpeg');
        }
        break;
      case 19:
        if (obj.image) this.callbacks.onDeviceSN(obj.image);
        break;
    }
  }
}
