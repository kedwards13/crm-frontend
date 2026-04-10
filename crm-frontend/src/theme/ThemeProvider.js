import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'crm.theme.preferences';
const STORAGE_VERSION = 2;
const LEGACY_MODE_KEY = 'theme';
const LEGACY_ACCENT_KEY = 'themeAccent';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const ACCENT_PRESETS = {
  emerald: { key: 'emerald', label: 'Emerald', primary: '#22c55e', secondary: '#10b981' },
  violet: { key: 'violet', label: 'Violet', primary: '#7c3aed', secondary: '#a855f7' },
  blue: { key: 'blue', label: 'Blue', primary: '#2563eb', secondary: '#0ea5e9' },
  orange: { key: 'orange', label: 'Orange', primary: '#f97316', secondary: '#f59e0b' },
  teal: { key: 'teal', label: 'Teal', primary: '#0f766e', secondary: '#14b8a6' },
};

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getPreferenceScope() {
  const user = safeParse(localStorage.getItem('user')) || {};
  const tenant = safeParse(localStorage.getItem('activeTenant')) || {};
  const userId = user?.id || user?.user_id || user?.pk || user?.email || 'anonymous';
  const tenantId = tenant?.id || tenant?.tenant_id || tenant?.domain || 'default';
  return `${userId}:${tenantId}`;
}

function getScopedStorageKey(scope) {
  return `${STORAGE_KEY}.${scope}`;
}

function toRgbParts(value = '#22c55e') {
  const input = String(value).trim();
  if (!HEX.test(input)) return [34, 197, 94];
  const raw = input.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((chunk) => `${chunk}${chunk}`)
          .join('')
      : raw;
  const parsed = Number.parseInt(full, 16);
  if (!Number.isFinite(parsed)) return [34, 197, 94];
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function toRgbTuple(value = '#22c55e') {
  const [red, green, blue] = toRgbParts(value);
  return `${red}, ${green}, ${blue}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex([red, green, blue]) {
  const value = [red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('');
  return `#${value}`;
}

function mixHex(a, b, weight = 0.5) {
  const left = toRgbParts(a);
  const right = toRgbParts(b);
  const ratio = clamp(weight, 0, 1);
  return rgbToHex([
    left[0] + (right[0] - left[0]) * ratio,
    left[1] + (right[1] - left[1]) * ratio,
    left[2] + (right[2] - left[2]) * ratio,
  ]);
}

function getContrastingInk(color) {
  const [r, g, b] = toRgbParts(color).map((value) => value / 255);
  const normalized = [r, g, b].map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  const luminance = normalized[0] * 0.2126 + normalized[1] * 0.7152 + normalized[2] * 0.0722;
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

function normalizePreference(raw) {
  const mode = raw?.mode === 'light' ? 'light' : 'dark';
  const accent = ACCENT_PRESETS[raw?.accent] ? raw.accent : 'emerald';
  return { mode, accent };
}

function readStoredPreference(scope) {
  const scopedRaw = safeParse(localStorage.getItem(getScopedStorageKey(scope)));
  if (scopedRaw && typeof scopedRaw === 'object') {
    return normalizePreference(scopedRaw);
  }

  const sharedRaw = safeParse(localStorage.getItem(STORAGE_KEY));
  if (sharedRaw && typeof sharedRaw === 'object') {
    if (sharedRaw?.version === STORAGE_VERSION && sharedRaw?.byScope?.[scope]) {
      return normalizePreference(sharedRaw.byScope[scope]);
    }
    if (sharedRaw?.mode || sharedRaw?.accent) {
      return normalizePreference(sharedRaw);
    }
  }

  const fallbackMode = localStorage.getItem(LEGACY_MODE_KEY);
  const fallbackAccent = localStorage.getItem(LEGACY_ACCENT_KEY);
  return normalizePreference({
    mode: fallbackMode === 'light' ? 'light' : 'dark',
    accent: fallbackAccent,
  });
}

function writeStoredPreference(scope, preference) {
  const normalized = normalizePreference(preference);
  localStorage.setItem(getScopedStorageKey(scope), JSON.stringify(normalized));

  const sharedRaw = safeParse(localStorage.getItem(STORAGE_KEY));
  const byScope =
    sharedRaw && typeof sharedRaw === 'object' && sharedRaw.byScope && typeof sharedRaw.byScope === 'object'
      ? { ...sharedRaw.byScope }
      : {};
  byScope[scope] = normalized;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      mode: normalized.mode,
      accent: normalized.accent,
      lastScope: scope,
      byScope,
    })
  );
}

function applyTheme({ mode, accent }) {
  const palette = ACCENT_PRESETS[accent] || ACCENT_PRESETS.emerald;
  const root = document.documentElement;
  const body = document.body;
  const accentRgb = toRgbTuple(palette.primary);
  const secondaryRgb = toRgbTuple(palette.secondary);
  const dimAlpha = mode === 'light' ? 0.12 : 0.16;
  const glowAlpha = mode === 'light' ? 0.24 : 0.34;
  const softAlpha = mode === 'light' ? 0.1 : 0.18;
  const accentText = mode === 'light' ? mixHex(palette.primary, '#0f172a', 0.24) : mixHex(palette.primary, '#ffffff', 0.36);
  const accentOne = mode === 'light' ? mixHex(palette.primary, '#ffffff', 0.16) : mixHex(palette.primary, '#ffffff', 0.26);
  const focusAlpha = mode === 'light' ? 0.24 : 0.34;

  body.dataset.theme = mode;
  root.dataset.theme = mode;
  body.classList.toggle('dark-mode', mode === 'dark');
  body.classList.toggle('light-mode', mode === 'light');
  body.classList.toggle('dark', mode === 'dark');
  body.classList.toggle('light', mode === 'light');

  root.style.setProperty('--accentPrimary', palette.primary);
  root.style.setProperty('--accent', palette.primary);
  root.style.setProperty('--accentSecondary', palette.secondary);
  root.style.setProperty('--accent-primary', palette.primary);
  root.style.setProperty('--accent-secondary', palette.secondary);
  root.style.setProperty('--color-accent', palette.primary);
  root.style.setProperty('--accent-rgb', accentRgb);
  root.style.setProperty('--accent-secondary-rgb', secondaryRgb);
  root.style.setProperty('--accent-dim', `rgba(${accentRgb}, ${dimAlpha})`);
  root.style.setProperty('--accent-soft', `rgba(${accentRgb}, ${softAlpha})`);
  root.style.setProperty('--accent-glow', `rgba(${accentRgb}, ${glowAlpha})`);
  root.style.setProperty(
    '--accent-gradient',
    `linear-gradient(132deg, ${palette.primary} 0%, ${palette.secondary} 55%, rgba(${secondaryRgb}, 0.88) 100%)`
  );
  root.style.setProperty('--accent-text', accentText);
  root.style.setProperty('--accent-ink', getContrastingInk(palette.primary));
  root.style.setProperty('--accent-0', palette.primary);
  root.style.setProperty('--accent-1', accentOne);
  root.style.setProperty('--focus-ring', `0 0 0 2px rgba(${accentRgb}, ${focusAlpha})`);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const scope = useMemo(() => getPreferenceScope(), []);
  const initial = useMemo(() => readStoredPreference(scope), [scope]);
  const [mode, setMode] = useState(initial.mode === 'light' ? 'light' : 'dark');
  const [accent, setAccent] = useState(ACCENT_PRESETS[initial.accent] ? initial.accent : 'emerald');

  useEffect(() => {
    applyTheme({ mode, accent });
    writeStoredPreference(scope, { mode, accent });
    localStorage.setItem(LEGACY_MODE_KEY, mode);
    localStorage.setItem(LEGACY_ACCENT_KEY, accent);
  }, [accent, mode, scope]);

  const value = useMemo(
    () => ({
      mode,
      accent,
      setMode: (nextMode) => setMode(nextMode === 'light' ? 'light' : 'dark'),
      toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
      setAccent: (nextAccent) => {
        if (ACCENT_PRESETS[nextAccent]) setAccent(nextAccent);
      },
      presets: Object.values(ACCENT_PRESETS),
    }),
    [mode, accent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
