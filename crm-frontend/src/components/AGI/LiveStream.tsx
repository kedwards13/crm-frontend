import React from 'react';
import { motion } from 'framer-motion';
import { useActivityStream } from '../../hooks/useActivityStream.ts';

const DEFAULT_WS_URL = 'wss://ai.abon.ai/ws/dashboard';
const severityColor: Record<string, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-rose-400',
  info: 'text-cyan-400'
};

const LiveStream = () => {
  const wsUrl = process.env.REACT_APP_ACTIVITY_WS_URL || DEFAULT_WS_URL;
  const enableMock = process.env.REACT_APP_ACTIVITY_ENABLE_MOCK === '1';
  const { events } = useActivityStream({
    wsUrl,
    enableMock
  });

  return (
    <div className='h-full w-full rounded-xl border border-slate-800 bg-black/60 backdrop-blur-md overflow-hidden flex flex-col'>
      <div className='p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center'>
        <span className='text-xs font-bold uppercase tracking-widest text-slate-400'>Neural Feed</span>
        <div className='h-2 w-2 rounded-full bg-emerald-500 animate-ping' />
      </div>

      <div className='flex-1 p-4 space-y-3 overflow-y-auto font-mono text-sm relative'>
        <div className='absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none z-10' />

        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className='flex gap-3 border-l border-slate-800 pl-3 py-1'
          >
            <span className='text-slate-600 text-xs shrink-0 pt-1'>{event.timestamp}</span>
            <div className='flex flex-col'>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${severityColor[event.severity] || severityColor.info}`}>
                {event.source}
              </span>
              <span className='text-slate-300 leading-tight'>{event.message}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LiveStream;
