// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Clock, MessageSquare, Save } from 'lucide-react';

type ChatRole = 'agent' | 'user';
type AvailabilitySlot = 'Morning' | 'Afternoon' | 'Evening';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS: AvailabilitySlot[] = ['Morning', 'Afternoon', 'Evening'];

const TEMPLATE_OPTIONS = [
  { value: 'lead_first_touch', label: 'Lead First Touch' },
  { value: 'quote_follow_up', label: 'Quote Follow Up' },
  { value: 'appointment_follow_up', label: 'Appointment Follow Up' },
  { value: 'reactivation_checkin', label: 'Reactivation Check-In' },
];

const PERSONA_LIBRARY = {
  professional_dispatcher:
    'You are a professional dispatcher. Keep communication clear, calm, and confident while guiding leads to a booked appointment.',
  warm_concierge:
    'You are a warm concierge. Keep messages conversational, concise, and reassuring while moving toward a confirmed booking.',
  rapid_response:
    'You are a rapid-response coordinator. Stay concise, direct, and action-focused to secure bookings quickly.',
};

function buildInitialAvailability() {
  return DAYS.reduce((acc, day) => {
    acc[day] = {
      Morning: day !== 'Sun',
      Afternoon: true,
      Evening: day !== 'Sat',
    };
    return acc;
  }, {});
}

function extractDelayMinutes(input: string): number | null {
  const text = input.toLowerCase();
  const numericMatch = text.match(/(\d+)\s*(hours?|hrs?|hr|minutes?|mins?|min)/);
  if (numericMatch) {
    const value = Number(numericMatch[1]);
    const unit = numericMatch[2];
    if (unit.startsWith('hour') || unit === 'hr' || unit === 'hrs') {
      return Math.max(1, Math.min(240, value * 60));
    }
    return Math.max(1, Math.min(240, value));
  }

  if (/(one hour|1 hour|an hour|sixty minutes)/.test(text)) return 60;
  if (/(half hour|30 min|thirty minutes)/.test(text)) return 30;
  return null;
}

function parseChatIntent(input: string) {
  const text = (input || '').trim();
  const lower = text.toLowerCase();
  const patch: Record<string, any> = {};
  const updates: string[] = [];

  if (
    /professional\s+dispatcher|dispatcher\s+persona|sound\s+like\s+a\s+professional\s+dispatcher/.test(
      lower
    )
  ) {
    patch.ai_voice_persona = PERSONA_LIBRARY.professional_dispatcher;
    updates.push("I've updated the persona to 'Professional Dispatcher'. How does this look?");
  } else if (/warm|friendly|concierge/.test(lower)) {
    patch.ai_voice_persona = PERSONA_LIBRARY.warm_concierge;
    updates.push("Updated. Persona is now 'Warm Concierge'.");
  } else if (/direct|fast|rapid|short/.test(lower)) {
    patch.ai_voice_persona = PERSONA_LIBRARY.rapid_response;
    updates.push("Done. Persona is now 'Rapid Response Coordinator'.");
  }

  const delayMinutes = extractDelayMinutes(lower);
  if (lower.includes('delay') && delayMinutes) {
    patch.auto_call_delay_minutes = delayMinutes;
    updates.push(`Ghost protocol delay set to ${delayMinutes} minutes.`);
  }

  if (/template|message|text|sms/.test(lower)) {
    if (/quote|estimate/.test(lower)) {
      patch.first_touch_template = 'quote_follow_up';
      updates.push('Template switched to Quote Follow Up.');
    } else if (/appointment|book/.test(lower)) {
      patch.first_touch_template = 'appointment_follow_up';
      updates.push('Template switched to Appointment Follow Up.');
    } else if (/reactivat|win back/.test(lower)) {
      patch.first_touch_template = 'reactivation_checkin';
      updates.push('Template switched to Reactivation Check-In.');
    }
  }

  if (updates.length === 0) {
    updates.push(
      "I can update persona, delay, and template. Try: 'Set delay to 45 minutes' or 'Use quote follow-up template.'"
    );
  }

  return { patch, reply: updates.join(' ') };
}

function formatTemplateLabel(value: string) {
  return TEMPLATE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function toPercent(value: number, min = 5, max = 240) {
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

export default function SmartConfig() {
  const [settings, setSettings] = useState({
    ai_voice_persona: PERSONA_LIBRARY.warm_concierge,
    auto_call_delay_minutes: 60,
    first_touch_template: 'lead_first_touch',
    staff_availability: buildInitialAvailability(),
  });
  const [input, setInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Apply Changes');
  const [chat, setChat] = useState([
    {
      id: 'a-1',
      role: 'agent' as ChatRole,
      text: "I'm Abon Config. Tell me what to tune and I'll update the live settings on the right.",
      time: new Date().toISOString(),
    },
  ]);

  const templateLabel = useMemo(
    () => formatTemplateLabel(settings.first_touch_template),
    [settings.first_touch_template]
  );

  const submitChat = (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user' as ChatRole,
      text: message,
      time: new Date().toISOString(),
    };
    setChat((prev) => [...prev, userMessage]);
    setInput('');

    const { patch, reply } = parseChatIntent(message);
    if (Object.keys(patch).length > 0) {
      setSettings((prev) => ({ ...prev, ...patch }));
    }

    const agentMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'agent' as ChatRole,
      text: reply,
      time: new Date().toISOString(),
    };
    setTimeout(() => setChat((prev) => [...prev, agentMessage]), 220);
  };

  const updateDelay = (minutes: number) => {
    const clamped = Math.max(5, Math.min(240, Number(minutes) || 5));
    setSettings((prev) => ({ ...prev, auto_call_delay_minutes: clamped }));
  };

  const toggleAvailability = (day: string, slot: AvailabilitySlot) => {
    setSettings((prev) => ({
      ...prev,
      staff_availability: {
        ...prev.staff_availability,
        [day]: {
          ...prev.staff_availability[day],
          [slot]: !prev.staff_availability[day][slot],
        },
      },
    }));
  };

  const applyChanges = () => {
    setIsSaving(true);
    setSaveLabel('Syncing...');
    setTimeout(() => {
      setIsSaving(false);
      setSaveLabel('Synced');
      setTimeout(() => setSaveLabel('Apply Changes'), 1100);
    }, 900);
  };

  return (
    <div
      className="relative h-full min-h-[calc(100vh-70px)] overflow-auto p-4 md:p-6"
      style={{
        backgroundColor: '#050505',
        backgroundImage:
          'radial-gradient(circle at 10% 0%, rgba(59,130,246,0.18), transparent 34%), radial-gradient(circle at 90% 12%, rgba(251,146,60,0.15), transparent 28%), linear-gradient(160deg, #050505 0%, #0a0f19 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 top-16 h-56 w-56 rounded-full"
          style={{ background: 'rgba(59,130,246,0.12)', filter: 'blur(44px)' }}
          animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-28 h-60 w-60 rounded-full"
          style={{ background: 'rgba(251,146,60,0.12)', filter: 'blur(44px)' }}
          animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-white/[0.05] shadow-[0_24px_54px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-500/15 text-blue-200">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-blue-200/80">Live Agent</p>
                <h2 className="text-lg font-semibold text-white">Abon Config</h2>
              </div>
            </div>
          </div>

          <div className="h-[54vh] space-y-3 overflow-y-auto px-4 py-4 md:px-6">
            <AnimatePresence initial={false}>
              {chat.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'border border-blue-300/35 bg-blue-500/18 text-blue-50'
                          : 'border border-white/10 bg-black/35 text-white/90'
                      }`}
                    >
                      <p>{message.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <form onSubmit={submitChat} className="border-t border-white/10 p-4 md:p-6">
            <label htmlFor="smart-config-chat" className="sr-only">
              Message Abon Config
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="smart-config-chat"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type: Make the AI sound like a professional dispatcher."
                className="h-12 flex-1 rounded-xl border border-white/15 bg-black/45 px-4 text-sm text-white outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/35"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-orange-300/40 bg-orange-400/18 px-5 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/28"
              >
                <MessageSquare size={16} />
                Send
              </button>
            </div>
          </form>
        </motion.section>

        <motion.section
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <motion.article
            layout
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl md:p-6"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-300" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-200/90">
                  Persona
                </h3>
              </div>
            </div>

            <motion.textarea
              key={settings.ai_voice_persona}
              initial={{ opacity: 0.7, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              value={settings.ai_voice_persona}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_voice_persona: event.target.value,
                }))
              }
              rows={5}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/90 outline-none focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/30"
            />
          </motion.article>

          <motion.article
            layout
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl md:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-200" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-orange-100/90">
                  Ghost Protocol
                </h3>
              </div>
              <motion.strong
                key={settings.auto_call_delay_minutes}
                initial={{ opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-white"
              >
                {settings.auto_call_delay_minutes} min
              </motion.strong>
            </div>

            <div className="space-y-3">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(59,130,246,0.95) 0%, rgba(251,146,60,0.95) 100%)',
                  }}
                  animate={{
                    width: `${toPercent(settings.auto_call_delay_minutes)}%`,
                  }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                />
              </div>

              <input
                type="range"
                min={5}
                max={240}
                step={5}
                value={settings.auto_call_delay_minutes}
                onChange={(event) => updateDelay(Number(event.target.value))}
                className="w-full accent-blue-400"
              />

              <input
                type="number"
                min={5}
                max={240}
                step={5}
                value={settings.auto_call_delay_minutes}
                onChange={(event) => updateDelay(Number(event.target.value))}
                className="h-10 w-28 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white outline-none focus:border-blue-400/65"
              />
            </div>
          </motion.article>

          <motion.article
            layout
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl md:p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-200/90">
                First Touch Template
              </h3>
            </div>

            <select
              value={settings.first_touch_template}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  first_touch_template: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white outline-none focus:border-blue-400/70"
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-3 text-xs text-white/65">Current: {templateLabel}</p>
          </motion.article>

          <motion.article
            layout
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl md:p-6"
          >
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-white/90">
              Staff Availability
            </h3>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="grid grid-cols-[54px_repeat(3,minmax(0,1fr))] items-center gap-2"
                >
                  <span className="text-xs font-semibold text-white/75">{day}</span>
                  {SLOTS.map((slot) => {
                    const active = !!settings.staff_availability[day][slot];
                    return (
                      <button
                        key={`${day}-${slot}`}
                        type="button"
                        onClick={() => toggleAvailability(day, slot)}
                        className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                          active
                            ? 'border-blue-300/55 bg-blue-500/18 text-blue-100'
                            : 'border-white/12 bg-black/30 text-white/55 hover:border-white/20'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.article>
        </motion.section>
      </div>

      <motion.button
        type="button"
        onClick={applyChanges}
        disabled={isSaving}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: isSaving ? 1 : 1.02 }}
        className="fixed bottom-6 right-6 z-20 inline-flex h-14 items-center gap-2 rounded-full border border-blue-300/35 bg-gradient-to-r from-blue-500/90 to-orange-400/85 px-5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(59,130,246,0.9)]"
      >
        <Save size={16} />
        {saveLabel}
      </motion.button>
    </div>
  );
}
