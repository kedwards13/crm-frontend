import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type CortexState = 'idle' | 'listening' | 'processing' | 'speaking';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

type CortexProps = {
  state: CortexState;
  isVoiceEnabled: boolean;
  onVoiceStateChange: (isEnabled: boolean) => void;
  onVoiceTranscript: (transcript: string) => void;
  onVoiceError?: (message: string) => void;
  className?: string;
};

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const coreTint: Record<CortexState, string> = {
  idle: 'linear-gradient(145deg, rgba(37,99,235,0.9), rgba(15,23,42,0.85))',
  listening: 'linear-gradient(145deg, rgba(6,182,212,0.95), rgba(14,116,144,0.86))',
  processing: 'linear-gradient(145deg, rgba(250,204,21,0.92), rgba(194,65,12,0.86))',
  speaking: 'linear-gradient(145deg, rgba(16,185,129,0.92), rgba(6,95,70,0.86))'
};

const statusLabel: Record<CortexState, string> = {
  idle: 'STANDBY',
  listening: 'LISTENING',
  processing: 'PROCESSING',
  speaking: 'RESPONDING'
};

function CortexIcon({ state, isVoiceEnabled }: Pick<CortexProps, 'state' | 'isVoiceEnabled'>) {
  if (state === 'processing') {
    return <Loader2 size={22} className='animate-spin text-white' />;
  }

  if (state === 'speaking') {
    return <Volume2 size={22} className='text-white' />;
  }

  if (state === 'listening') {
    return <Mic size={22} className='text-white' />;
  }

  return isVoiceEnabled ? <Mic size={22} className='text-white' /> : <MicOff size={22} className='text-white' />;
}

export default function Cortex({
  state,
  isVoiceEnabled,
  onVoiceStateChange,
  onVoiceTranscript,
  onVoiceError,
  className = ''
}: CortexProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const rings = ['h-44 w-44', 'h-36 w-36', 'h-28 w-28'];

  const stateChangeRef = useRef(onVoiceStateChange);
  const transcriptRef = useRef(onVoiceTranscript);
  const errorRef = useRef(onVoiceError);

  stateChangeRef.current = onVoiceStateChange;
  transcriptRef.current = onVoiceTranscript;
  errorRef.current = onVoiceError;

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      stateChangeRef.current(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      stateChangeRef.current(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      stateChangeRef.current(false);
      errorRef.current?.(`Voice recognition error: ${event.error}`);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult || !lastResult.isFinal) {
        return;
      }

      const transcript = lastResult[0]?.transcript?.trim();
      if (transcript) {
        transcriptRef.current(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const handleToggleListening = () => {
    if (!isSupported || !recognitionRef.current) {
      errorRef.current?.('Speech recognition is not available in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  };

  const visualState: CortexState = isListening ? 'listening' : state;
  const isEnergized = visualState !== 'idle';

  return (
    <div className={cn('relative flex w-full flex-col items-center justify-center py-4', className)}>
      <div className='relative flex h-52 w-52 items-center justify-center'>
        {rings.map((size, index) => (
          <motion.div
            key={size}
            className={cn(
              'absolute rounded-full border',
              size,
              visualState === 'listening' ? 'border-cyan-300/45 bg-cyan-500/5' : 'border-blue-300/30 bg-blue-500/5'
            )}
            animate={
              visualState === 'processing'
                ? { rotate: index % 2 === 0 ? [0, 360] : [360, 0], scale: [1, 1.06, 1], opacity: [0.2, 0.56, 0.2] }
                : visualState === 'listening'
                  ? { rotate: [0, 20, -20, 0], scale: [1, 1.5, 1], opacity: [0.24, 0.88, 0.24] }
                  : { rotate: [0, 6, 0], scale: [1, 1.1, 1], opacity: [0.2, 0.44, 0.2] }
            }
            transition={{
              repeat: Infinity,
              duration:
                visualState === 'processing' ? 2.5 + index * 0.35 : visualState === 'listening' ? 0.95 + index * 0.15 : 4 + index * 0.55,
              ease: visualState === 'processing' ? 'linear' : 'easeInOut',
              delay: index * 0.18
            }}
            style={{
              boxShadow:
                visualState === 'listening'
                  ? '0 0 26px rgba(34,211,238,0.5)'
                  : visualState === 'processing'
                    ? '0 0 26px rgba(250,204,21,0.35)'
                    : '0 0 22px rgba(59,130,246,0.32)'
            }}
          />
        ))}

        <motion.div
          animate={
            visualState === 'listening'
              ? { scale: [1, 1.55, 1], opacity: [0.28, 0.9, 0.28] }
              : { scale: [1, 1.16, 1], opacity: [0.25, 0.46, 0.25] }
          }
          transition={{ repeat: Infinity, duration: visualState === 'listening' ? 1 : 4, ease: 'easeInOut' }}
          className='absolute h-24 w-24 rounded-full bg-blue-500/20 blur-xl'
        />

        <motion.button
          type='button'
          onClick={handleToggleListening}
          className={cn(
            'relative z-10 flex h-24 w-24 items-center justify-center rounded-full border backdrop-blur-xl',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
            visualState === 'processing' ? 'border-amber-300/50' : 'border-cyan-300/45'
          )}
          style={{
            background: coreTint[visualState],
            boxShadow:
              visualState === 'listening'
                ? '0 0 45px rgba(34,211,238,0.65)'
                : '0 0 34px rgba(59,130,246,0.45), inset 0 0 24px rgba(15,23,42,0.5)'
          }}
          animate={
            visualState === 'listening'
              ? { scale: [1, 1.09, 1], rotate: [0, -2, 2, 0] }
              : visualState === 'processing'
                ? { scale: [1, 1.05, 1], rotate: [0, 4, 0, -4, 0] }
                : isEnergized
                  ? { scale: [1, 1.05, 1] }
                  : { scale: [1, 1.03, 1] }
          }
          transition={{ repeat: Infinity, duration: visualState === 'listening' ? 1.05 : 3.8, ease: 'easeInOut' }}
          whileTap={{ scale: 0.96 }}
          aria-pressed={isVoiceEnabled}
          aria-label={isVoiceEnabled ? 'Disable voice interaction' : 'Enable voice interaction'}
        >
          <span className='pointer-events-none absolute inset-2 rounded-full border border-white/20' />
          <span className='relative flex h-full w-full items-center justify-center'>
            <CortexIcon state={visualState} isVoiceEnabled={isVoiceEnabled} />
          </span>
        </motion.button>
      </div>

      <div className='mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/85'>
        <span className={cn('h-2 w-2 rounded-full', visualState === 'listening' ? 'bg-cyan-300 animate-pulse' : 'bg-blue-300')} />
        <span>{isSupported ? statusLabel[visualState] : 'VOICE API UNAVAILABLE'}</span>
      </div>
    </div>
  );
}
