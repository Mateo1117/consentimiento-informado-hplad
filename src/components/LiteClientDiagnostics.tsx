import React, { useState, useEffect, useCallback } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, RefreshCw, Bug } from 'lucide-react';
import { digitalPersonaService } from '@/services/digitalPersonaService';

const WS_STATE_LABELS: Record<number, string> = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
};

export const LiteClientDiagnostics: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState(digitalPersonaService.getDiagnostics());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = (d: any) => setDiag(d);
    digitalPersonaService.on('diagnostics', handler);
    digitalPersonaService.on('statusChange', () => setDiag(digitalPersonaService.getDiagnostics()));
    return () => {
      digitalPersonaService.off('diagnostics', handler);
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await digitalPersonaService.detect();
    setDiag(digitalPersonaService.getDiagnostics());
    setRefreshing(false);
  }, []);

  const statusColor = {
    connected: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
    capturing: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    connecting: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    disconnected: 'bg-muted text-muted-foreground border-border',
    error: 'bg-destructive/15 text-destructive border-destructive/30',
  }[diag.status] || 'bg-muted text-muted-foreground border-border';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-muted/50">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Bug className="h-3 w-3" />
          <span>Diagnóstico Lite Client</span>
          <Badge variant="outline" className={`ml-auto text-[10px] px-1.5 py-0 ${statusColor}`}>
            {diag.status}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-3 text-xs font-mono">
          {/* Status row */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Row label="Estado" value={diag.status} />
            <Row label="WebSocket" value={diag.wsReadyState !== null ? WS_STATE_LABELS[diag.wsReadyState] || String(diag.wsReadyState) : '—'} />
            <Row label="Host" value={diag.connectedHost || '—'} />
            <Row label="Puerto" value={diag.connectedPort !== null ? String(diag.connectedPort) : '—'} />
            <Row label="Close code" value={diag.lastCloseCode !== null ? String(diag.lastCloseCode) : '—'} />
            <Row label="Close reason" value={diag.lastCloseReason || '—'} />
          </div>

          {/* Discovery */}
          {diag.discoveredEndpoint && (
            <div>
              <span className="text-muted-foreground">Discovery endpoint:</span>
              <p className="break-all text-foreground mt-0.5">{diag.discoveredEndpoint}</p>
            </div>
          )}

          {/* Attempted endpoints */}
          {diag.attemptedEndpoints.length > 0 && (
            <div>
              <span className="text-muted-foreground">Endpoints intentados ({diag.attemptedEndpoints.length}):</span>
              <ScrollArea className="max-h-24 mt-1">
                <ul className="space-y-0.5">
                  {diag.attemptedEndpoints.map((ep, i) => (
                    <li key={i} className="text-foreground/80 break-all">• {ep}</li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {/* Last error */}
          {diag.lastError && (
            <div>
              <span className="text-destructive">Último error:</span>
              <p className="break-all text-destructive/80 mt-0.5">{diag.lastError}</p>
            </div>
          )}

          {/* Event log */}
          {diag.log.length > 0 && (
            <div>
              <span className="text-muted-foreground">Log en tiempo real:</span>
              <ScrollArea className="max-h-32 mt-1 rounded bg-background/50 p-2">
                {diag.log.map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                    <span className="text-foreground/90 break-all">{entry.msg}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Re-detectar Lite Client
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}:</span>
    <span className="text-foreground truncate ml-2">{value}</span>
  </div>
);
