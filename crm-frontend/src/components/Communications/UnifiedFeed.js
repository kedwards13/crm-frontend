import React, { useMemo } from 'react';
import { Phone } from 'lucide-react';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.messages)) return value.messages;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const normalizeType = (value = '') => {
  const type = String(value || '').toLowerCase();
  if (type === 'call' || type === 'voice') return 'call';
  if (type === 'email') return 'email';
  return 'sms';
};

const formatDuration = (value) => {
  const total = Number(value);
  if (!Number.isFinite(total) || total <= 0) return '';
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${total % 60}s`;
};

const normalizeEntry = (msg = {}, idx) => {
  const type = normalizeType(msg.type || msg.channel || msg.primaryChannel);
  const duration = msg.duration || msg.duration_seconds || '';
  const body =
    msg.body ||
    msg.body_text ||
    msg.preview ||
    msg.subject ||
    msg.snippet ||
    (type === 'call' ? 'Call' : '');

  return {
    id: msg.id || `${type}-${idx}`,
    direction: msg.direction === 'outbound' ? 'outbound' : 'inbound',
    type,
    duration: type === 'call' ? formatDuration(duration) : '',
    body: String(body || '').trim(),
    created_at: msg.created_at || msg.timestamp || msg.sent_at || new Date().toISOString(),
  };
};


export default function UnifiedFeed({ timeline = [], seedEntries = [] }) {
  const data = useMemo(() => {
    const incoming = [...toArray(seedEntries), ...toArray(timeline)]
      .map((entry, idx) => normalizeEntry(entry, idx))
      .filter((entry) => entry.body || entry.type === 'call');

    return incoming;
  }, [seedEntries, timeline]);

  if (!data.length) {
    return (
      <div className='flex-1 p-6 flex items-center justify-center text-zinc-500 text-sm'>
        No activity yet for this contact.
      </div>
    );
  }

  return (
    <div className='flex-1 p-6 space-y-3 overflow-y-auto'>
      {data.map((msg) => {
        const isMe = msg.direction === 'outbound';
        const bg = isMe
          ? msg.type === 'call'
            ? 'bg-[#30D158]'
            : 'bg-[#0A84FF]'
          : 'bg-[#262626]';

        return (
          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-white text-[15px] ${bg} shadow-sm`}>
              {msg.type === 'call' ? (
                <div className='flex items-center gap-2 font-medium'>
                  <Phone size={14} fill='currentColor' />
                  {msg.duration ? `Call (${msg.duration})` : 'Call'}
                </div>
              ) : (
                msg.body
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
