import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'critical';
export type ActivityTone = 'cyan' | 'emerald' | 'amber' | 'slate';

export type ActivityEvent = {
  id: string;
  type: string;
  source: string;
  message: string;
  severity: ActivitySeverity;
  tone: ActivityTone;
  timestamp: string;
};

export type ActivityInput = {
  type: string;
  source: string;
  message: string;
  severity?: ActivitySeverity;
};

type UseActivityStreamOptions = {
  maxEntries?: number;
  heartbeatMs?: number;
  wsUrl?: string;
  enableMock?: boolean;
};

const severityTone: Record<ActivitySeverity, ActivityTone> = {
  info: 'cyan',
  success: 'emerald',
  warning: 'amber',
  critical: 'slate'
};

const mockEvents: ActivityInput[] = [
  { type: 'VOICE_ACT', source: 'Voice Bot', message: 'Booking confirmed for James at 3:30 PM.', severity: 'success' },
  { type: 'AUDIT', source: 'Auditor', message: 'FieldRoutes sync active. No drift detected.', severity: 'info' },
  { type: 'SMS', source: 'Comms', message: 'Outbound SMS delivered to +1 (239) 555-0132.', severity: 'info' },
  { type: 'CALL', source: 'Telephony', message: 'Incoming call routed to Service Desk.', severity: 'warning' },
  { type: 'CRM', source: 'Leads', message: 'Pipeline score updated for James Carter.', severity: 'success' }
];

function makeTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toActivityEvent(input: ActivityInput): ActivityEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: input.type,
    source: input.source,
    message: input.message,
    severity: input.severity || 'info',
    tone: severityTone[input.severity || 'info'],
    timestamp: makeTimestamp()
  };
}

export function useActivityStream(options: UseActivityStreamOptions = {}) {
  const { maxEntries = 18, heartbeatMs = 9000, wsUrl, enableMock = true } = options;
  const [events, setEvents] = useState<ActivityEvent[]>(() => [
    toActivityEvent({ type: 'BOOT', source: 'Cortex', message: 'Neural stream initialized.', severity: 'success' }),
    toActivityEvent({ type: 'AUDIT', source: 'Auditor', message: 'Policy and compliance heartbeat passed.', severity: 'info' }),
    toActivityEvent({ type: 'ROUTER', source: 'Dispatch', message: 'Route optimizer standing by.', severity: 'info' })
  ]);
  const mockCursorRef = useRef(0);

  const pushEvent = useCallback(
    (input: ActivityInput) => {
      setEvents((current) => [toActivityEvent(input), ...current].slice(0, maxEntries));
    },
    [maxEntries]
  );

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.message) {
          return;
        }

        pushEvent({
          type: data.type || 'EVENT',
          source: data.source || 'Backend',
          message: data.message,
          severity: data.severity || 'info'
        });
      } catch {
        pushEvent({
          type: 'STREAM_ERR',
          source: 'Neural Feed',
          message: 'Received malformed event payload from backend stream.',
          severity: 'warning'
        });
      }
    };

    socket.onerror = () => {
      pushEvent({
        type: 'STREAM_ERR',
        source: 'Neural Feed',
        message: 'Realtime socket error detected. Falling back to heartbeat feed.',
        severity: 'warning'
      });
    };

    return () => socket.close();
  }, [pushEvent, wsUrl]);

  useEffect(() => {
    if (!enableMock) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const next = mockEvents[mockCursorRef.current % mockEvents.length];
      mockCursorRef.current += 1;
      pushEvent(next);
    }, heartbeatMs);

    return () => window.clearInterval(intervalId);
  }, [enableMock, heartbeatMs, pushEvent]);

  return useMemo(() => ({ events, pushEvent }), [events, pushEvent]);
}
