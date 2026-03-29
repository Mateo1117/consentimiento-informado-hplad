import { useEffect, useRef, useState, useCallback } from 'react';
import { FingerprintService, FpStatus } from '@/services/fingerprintService';

export interface FingerprintState {
  status: FpStatus;
  message: string;
  fingerprintImage: string | null;
  enrollTemplate: string | null;
  captureTemplate: string | null;
  matchScore: number | null;
  matched: boolean | null;
  deviceSN: string | null;
}

export function useFingerprintReader(autoConnect = false) {
  const serviceRef = useRef<FingerprintService | null>(null);
  const [state, setState] = useState<FingerprintState>({
    status: 'disconnected',
    message: 'Lector de huella no conectado',
    fingerprintImage: null,
    enrollTemplate: null,
    captureTemplate: null,
    matchScore: null,
    matched: null,
    deviceSN: null,
  });

  useEffect(() => {
    const service = new FingerprintService({
      onStatus: (status, message) => setState((s) => ({ ...s, status, message })),
      onTemplate: (type, template) =>
        setState((s) =>
          type === 'enroll'
            ? { ...s, enrollTemplate: template }
            : { ...s, captureTemplate: template }
        ),
      onImage: (base64, format) => {
        const prefix = format === 'png' ? 'data:image/png;base64,' : 'data:image/jpeg;base64,';
        const dataUrl = base64.startsWith('data:') ? base64 : `${prefix}${base64}`;
        setState((s) => ({ ...s, fingerprintImage: dataUrl }));
      },
      onMatchScore: (score, matched) =>
        setState((s) => ({ ...s, matchScore: score, matched })),
      onDeviceSN: (sn) =>
        setState((s) => ({ ...s, deviceSN: sn })),
    });

    serviceRef.current = service;
    if (autoConnect) service.connect();

    return () => service.disconnect();
  }, [autoConnect]);

  const connect = useCallback(() => serviceRef.current?.connect(), []);
  const disconnect = useCallback(() => serviceRef.current?.disconnect(), []);
  const enroll = useCallback(() => {
    setState((s) => ({ ...s, enrollTemplate: null, fingerprintImage: null }));
    serviceRef.current?.enroll();
  }, []);
  const capture = useCallback(() => {
    setState((s) => ({ ...s, captureTemplate: null, fingerprintImage: null }));
    serviceRef.current?.capture();
  }, []);
  const match = useCallback((enrollTpl?: string, captureTpl?: string) => {
    const et = enrollTpl || state.enrollTemplate;
    const ct = captureTpl || state.captureTemplate;
    if (et && ct) {
      serviceRef.current?.match(et, ct);
    }
  }, [state.enrollTemplate, state.captureTemplate]);
  const reset = useCallback(() =>
    setState((s) => ({
      ...s,
      fingerprintImage: null,
      enrollTemplate: null,
      captureTemplate: null,
      matchScore: null,
      matched: null,
    })), []);

  return { ...state, connect, disconnect, enroll, capture, match, reset };
}
