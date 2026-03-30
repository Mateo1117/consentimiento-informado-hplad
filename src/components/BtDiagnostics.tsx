import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { bluetoothFingerprintService } from '@/services/bluetoothFingerprintService';
import { ChevronDown, ChevronUp, Bluetooth } from 'lucide-react';

export const BtDiagnostics: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState(bluetoothFingerprintService.getDiagnostics());

  useEffect(() => {
    const handler = (d: any) => setDiag(d);
    bluetoothFingerprintService.on('diagnostics', handler);
    return () => bluetoothFingerprintService.off('diagnostics', handler);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-muted/20 text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Bluetooth className="h-3 w-3" />
          Diagnóstico Bluetooth
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <span className="text-muted-foreground">Estado:</span>
            <span className="font-mono">{diag.status}</span>
            <span className="text-muted-foreground">Dispositivo:</span>
            <span className="font-mono">{diag.deviceName || '—'}</span>
            <span className="text-muted-foreground">Web Bluetooth:</span>
            <span className="font-mono">{diag.webBluetoothSupported ? '✓' : '✗'}</span>
            <span className="text-muted-foreground">GATT conectado:</span>
            <span className="font-mono">{diag.gattConnected ? '✓' : '✗'}</span>
          </div>

          {diag.lastError && (
            <div className="bg-destructive/10 text-destructive rounded px-2 py-1 text-[10px]">
              {diag.lastError}
            </div>
          )}

          <div className="bg-background rounded border border-border max-h-48 overflow-y-auto">
            {diag.log.length === 0 ? (
              <p className="text-muted-foreground text-center py-2 text-[10px]">Sin actividad</p>
            ) : (
              <div className="divide-y divide-border">
                {diag.log.map((entry: { ts: number; msg: string }, i: number) => (
                  <div key={i} className="px-2 py-1 flex gap-2 text-[10px]">
                    <span className="text-muted-foreground shrink-0 font-mono">
                      {new Date(entry.ts).toLocaleTimeString('es-CO', { hour12: false })}
                    </span>
                    <span className={`font-mono break-all ${
                      entry.msg.startsWith('✗') ? 'text-destructive' :
                      entry.msg.startsWith('✓') ? 'text-green-600 dark:text-green-400' :
                      entry.msg.startsWith('◀') ? 'text-blue-600 dark:text-blue-400' :
                      entry.msg.startsWith('▶') ? 'text-amber-600 dark:text-amber-400' :
                      'text-foreground'
                    }`}>
                      {entry.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
