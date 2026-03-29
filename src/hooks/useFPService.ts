import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionMode = 'fpservice' | 'liteclient';
export type FpStatus = 'idle' | 'connecting' | 'ready' | 'place_finger' | 'lift_finger' | 'success' | 'error' | 'timeout';

interface FpState {
  status: FpStatus;
  message: string;
  image: string | null;
  template: string | null;
  matchScore: number | null;
  matched: boolean | null;
}

const FP_WS_URL = 'ws://127.0.0.1:21187/fps';
const LITE_WS_URL = 'ws://127.0.0.1:8888/fps';

export function useFPService() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnect = useRef(false);
  const wasConnected = useRef(false);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<ConnectionMode>('fpservice');
  const [state, setState] = useState<FpState>({
    status: 'idle',
    message: '',
    image: null,
    template: null,
    matchScore: null,
    matched: null,
  });

  const wsUrl = mode === 'fpservice' ? FP_WS_URL : LITE_WS_URL;

  const send = useCallback((cmd: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const disconnect = useCallback(() => {
    manualDisconnect.current = true;
    wasConnected.current = false;
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setState(s => ({ ...s, status: 'idle', message: 'Desconectado' }));
  }, []);

  const connect = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = null;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    manualDisconnect.current = false;
    setState(s => ({ ...s, status: 'connecting', message: 'Conectando al servicio de huella...' }));

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setState(s => ({ ...s, status: 'error', message: 'No se pudo crear la conexión WebSocket' }));
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      wasConnected.current = true;
      setConnected(true);
      setState(s => ({ ...s, status: 'ready', message: 'Lector listo' }));
    };

    ws.onerror = () => {
      if (manualDisconnect.current) return;
      setConnected(false);
      setState(s => ({ ...s, status: 'error', message: 'Servicio no disponible. Instale FPService.' }));
    };

    ws.onclose = () => {
      if (manualDisconnect.current) return;
      setConnected(false);
      // Only auto-reconnect if we had a successful connection before
      if (wasConnected.current) {
        setState(s => ({ ...s, status: 'idle', message: 'Desconectado. Reintentando...' }));
        retryRef.current = setTimeout(() => connect(), 4000);
      } else {
        setState(s => ({ ...s, status: 'idle', message: 'No se pudo conectar al servicio' }));
      }
    };

    ws.onmessage = (evt) => {
      try {
        const obj = JSON.parse(evt.data);
        switch (obj.workmsg) {
          case 1:
            setState(s => ({ ...s, status: 'error', message: 'Conecte el dispositivo Bluetooth primero' }));
            break;
          case 2:
            setState(s => ({ ...s, status: 'place_finger', message: 'Coloque el dedo en el lector...' }));
            break;
          case 3:
            setState(s => ({ ...s, status: 'lift_finger', message: 'Levante el dedo...' }));
            break;
          case 5: // capture template
            if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
              setState(s => ({ ...s, status: 'success', message: 'Huella capturada', template: obj.data1 }));
            } else {
              setState(s => ({ ...s, status: 'error', message: 'Fallo en captura, intente de nuevo' }));
            }
            break;
          case 6: // enroll template
            if (obj.retmsg === 1 && obj.data1 && obj.data1 !== 'null') {
              setState(s => ({ ...s, status: 'success', message: 'Huella registrada exitosamente', template: obj.data1 }));
            } else {
              setState(s => ({ ...s, status: 'error', message: 'Fallo al registrar, intente de nuevo' }));
            }
            break;
          case 7: // PNG image
            if (obj.image && obj.image !== 'null') {
              setState(s => ({ ...s, image: obj.image }));
            }
            break;
          case 8:
            setState(s => ({ ...s, status: 'timeout', message: 'Tiempo agotado, intente de nuevo' }));
            break;
          case 9: { // match score
            const score = Number(obj.retmsg);
            const matched = score >= 60;
            setState(s => ({
              ...s,
              matchScore: score,
              matched,
              status: matched ? 'success' : 'error',
              message: matched
                ? `Identidad verificada ✓ (puntaje: ${score})`
                : `No coincide ✗ (puntaje: ${score})`,
            }));
            break;
          }
          case 15:
            setState(s => ({
              ...s,
              status: obj.retmsg === 1 ? 'ready' : 'error',
              message: obj.retmsg === 1 ? 'Dispositivo reconectado' : 'Error al reconectar',
            }));
            break;
          case 18: // JPEG image fallback
            if (obj.image && obj.image !== 'null') {
              setState(s => ({ ...s, image: obj.image }));
            }
            break;
          case 19: // Device SN
            break;
        }
      } catch { /* ignore malformed */ }
    };
  }, [wsUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manualDisconnect.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Reconnect when mode changes (if was connected)
  useEffect(() => {
    if (connected || wasConnected.current) {
      disconnect();
    }
  }, [mode]);

  const enroll = useCallback(() => {
    setState(s => ({ ...s, image: null, template: null, status: 'place_finger', message: 'Coloque el dedo (2 capturas necesarias)' }));
    send({ cmd: 'enrol', data1: '2', data2: '0' });
  }, [send]);

  const capture = useCallback(() => {
    setState(s => ({ ...s, image: null, template: null, status: 'place_finger', message: 'Coloque el dedo para verificar' }));
    send({ cmd: 'capture', data1: '2', data2: '0' });
  }, [send]);

  const matchTemplates = useCallback((enrolledTemplate: string, capturedTemplate: string) => {
    send({ cmd: 'match', data1: enrolledTemplate, data2: capturedTemplate });
  }, [send]);

  const reset = useCallback(() => {
    setState(s => ({
      ...s,
      image: null,
      template: null,
      matchScore: null,
      matched: null,
      status: connected ? 'ready' : 'idle',
      message: '',
    }));
  }, [connected]);

  return { ...state, connected, mode, setMode, connect, disconnect, enroll, capture, matchTemplates, reset };
}
