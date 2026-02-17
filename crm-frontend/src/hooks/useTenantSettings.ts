// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../apiClient';
import type {
  InboundRouteMode,
  OffHoursBehavior,
  TenantSettings,
  TenantSettingsPatchRequest,
} from '../pages/settings/settings_contract.ts';

const PERSONA_LABELS = ['Professional', 'Friendly', 'Direct'];
const APPOINTMENT_EVENT_TYPE = 'appointment_reminder';
const REVIEW_EVENT_TYPE = 'review_request';
const APPOINTMENT_TEMPLATE_NAME = 'Appointment Confirmation (SMS)';
const REVIEW_TEMPLATE_NAME = 'Review Request (SMS)';

const DEFAULT_SETTINGS: TenantSettings = {
  notifications: {
    lead_notification_emails: [],
    sms_alert_numbers: [],
    daily_digest_enabled: false,
  },
  ai_automations: {
    texting_enabled: false,
    auto_reply_delay_seconds: 0,
    auto_response_start: '',
    auto_response_end: '',
    off_hours_behavior: 'voicemail',
    ai_persona: 'Professional',
  },
  voice: {
    inbound_route_mode: 'ring_group',
    voice_id: '',
    ring_group_targets: [],
    record_calls: false,
  },
  sms_templates: {
    appointment_confirmation_template: '',
    review_request_template: '',
  },
};

const BACKEND_COVERAGE_NOTES = [
  {
    field: 'voice.inbound_route_mode / voice.ring_group_targets / voice.record_calls',
    level: 'warning',
    message:
      'No public TenantVoiceProfile GET/PATCH endpoint was found. These values persist via preferences.voice fallback keys.',
  },
  {
    field: 'sms_templates.*',
    level: 'info',
    message:
      'SMS template bodies sync through /templates/templates/ (event_type: appointment_reminder, review_request) and are also mirrored in preferences.sms_templates for fallback compatibility.',
  },
  {
    field: 'ai_automations.auto_reply_delay_seconds',
    level: 'info',
    message:
      'Backend automation currently also references sms_delay_min_seconds/sms_delay_max_seconds. Save writes all three keys for compatibility.',
  },
  {
    field: 'tenant settings aggregate endpoint',
    level: 'info',
    message:
      'No single /tenant/settings endpoint was found. This hook composes /accounts/preferences/ with /accounts/ai-context/.',
  },
];

function cloneSettings(settings: TenantSettings): TenantSettings {
  return JSON.parse(JSON.stringify(settings || DEFAULT_SETTINGS));
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = [];
  value.forEach((item) => {
    const normalized = typeof item === 'string' ? item.trim() : '';
    if (normalized && !deduped.includes(normalized)) deduped.push(normalized);
  });
  return deduped;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function normalizeDelaySeconds(value: unknown): number {
  const numeric = Number(value);
  if (Number.isNaN(numeric) || !Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(300, Math.round(numeric)));
}

function normalizeTimeOfDay(value: unknown, fallback = ''): string {
  const raw = normalizeString(value, fallback);
  if (!raw) return fallback;

  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return fallback;
  return `${match[1]}:${match[2]}`;
}

function normalizeTemplateList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function canonicalPersona(value: unknown): string {
  const incoming = normalizeString(value, '');
  if (!incoming) return 'Professional';

  const matched = PERSONA_LABELS.find(
    (label) => label.toLowerCase() === incoming.toLowerCase()
  );
  return matched || incoming;
}

function routeModeToInbound(value: unknown): InboundRouteMode {
  const normalized = normalizeString(value, '').toLowerCase();
  if (normalized === 'ring_group') return 'ring_group';
  if (normalized === 'single_user') return 'single_user';
  if (normalized === 'ai_first') return 'ai_first';
  if (normalized === 'ai_terminal' || normalized === 'ai_then_route') return 'ai_first';
  return 'ring_group';
}

function inboundToRouteMode(value: InboundRouteMode): string {
  if (value === 'ai_first') return 'ai_then_route';
  return value;
}

function afterHoursToBehavior(value: unknown): OffHoursBehavior {
  const normalized = normalizeString(value, '').toLowerCase();
  if (normalized === 'ring_group' || normalized === 'single_user') return 'forward';
  if (normalized === 'ai_terminal' || normalized === 'ai_then_route') return 'ai_assistant';
  return 'voicemail';
}

function behaviorToAfterHours(value: OffHoursBehavior): string {
  if (value === 'forward') return 'ring_group';
  if (value === 'ai_assistant') return 'ai_then_route';
  return 'voicemail';
}

function normalizeSettings(partial?: Partial<TenantSettings>): TenantSettings {
  const notifications = partial?.notifications || {};
  const aiAutomations = partial?.ai_automations || {};
  const voice = partial?.voice || {};
  const smsTemplates = partial?.sms_templates || {};

  return {
    notifications: {
      lead_notification_emails: normalizeStringArray(
        notifications.lead_notification_emails
      ),
      sms_alert_numbers: normalizeStringArray(notifications.sms_alert_numbers),
      daily_digest_enabled: normalizeBoolean(notifications.daily_digest_enabled),
    },
    ai_automations: {
      texting_enabled: normalizeBoolean(aiAutomations.texting_enabled),
      auto_reply_delay_seconds: normalizeDelaySeconds(
        aiAutomations.auto_reply_delay_seconds
      ),
      auto_response_start: normalizeTimeOfDay(aiAutomations.auto_response_start),
      auto_response_end: normalizeTimeOfDay(aiAutomations.auto_response_end),
      off_hours_behavior:
        aiAutomations.off_hours_behavior || DEFAULT_SETTINGS.ai_automations.off_hours_behavior,
      ai_persona: canonicalPersona(aiAutomations.ai_persona),
    },
    voice: {
      inbound_route_mode:
        voice.inbound_route_mode || DEFAULT_SETTINGS.voice.inbound_route_mode,
      voice_id: normalizeString(voice.voice_id),
      ring_group_targets: normalizeStringArray(voice.ring_group_targets),
      record_calls: normalizeBoolean(voice.record_calls),
    },
    sms_templates: {
      appointment_confirmation_template: normalizeString(
        smsTemplates.appointment_confirmation_template
      ),
      review_request_template: normalizeString(smsTemplates.review_request_template),
    },
  };
}

export function mapPreferencesToTenantSettings(
  preferences: Record<string, any> = {},
  aiContext: Record<string, any> = {}
): TenantSettings {
  const notifications = isObject(preferences.notifications)
    ? preferences.notifications
    : {};

  const aiSettings = isObject(preferences.ai_settings)
    ? preferences.ai_settings
    : isObject(preferences.ai)
    ? preferences.ai
    : {};

  const voiceSettings = isObject(preferences.voice) ? preferences.voice : {};
  const smsTemplates = isObject(preferences.sms_templates)
    ? preferences.sms_templates
    : {};

  const leadNotificationEmails = normalizeStringArray(
    notifications.lead_notification_emails ||
      (isObject(notifications.new_lead_email)
        ? notifications.new_lead_email.recipients
        : [])
  );

  const inboundRouteMode = routeModeToInbound(
    voiceSettings.inbound_route_mode || voiceSettings.route_mode
  );

  const offHoursBehavior = afterHoursToBehavior(
    voiceSettings.after_hours_route_mode || aiSettings.after_hours_route_mode
  );

  const autoReplyDelaySeconds = normalizeDelaySeconds(
    aiSettings.auto_reply_delay_seconds ||
      aiSettings.sms_delay_min_seconds ||
      aiSettings.sms_delay_max_seconds ||
      preferences.sms_delay_min_seconds ||
      preferences.sms_delay_max_seconds
  );
  const autoResponseStart = normalizeTimeOfDay(
    aiSettings.auto_response_start || aiSettings.auto_response_window_start
  );
  const autoResponseEnd = normalizeTimeOfDay(
    aiSettings.auto_response_end || aiSettings.auto_response_window_end
  );

  const aiPersona = canonicalPersona(
    aiContext.tone || aiSettings.ai_persona || preferences.ai_persona
  );

  return normalizeSettings({
    notifications: {
      lead_notification_emails: leadNotificationEmails,
      sms_alert_numbers: normalizeStringArray(notifications.sms_alert_numbers),
      daily_digest_enabled: normalizeBoolean(notifications.daily_digest_enabled),
    },
    ai_automations: {
      texting_enabled: normalizeBoolean(
        aiSettings.texting_enabled,
        normalizeBoolean(preferences.allow_ai_followups, false)
      ),
      auto_reply_delay_seconds: autoReplyDelaySeconds,
      auto_response_start: autoResponseStart,
      auto_response_end: autoResponseEnd,
      off_hours_behavior: offHoursBehavior,
      ai_persona: aiPersona,
    },
    voice: {
      inbound_route_mode: inboundRouteMode,
      voice_id: normalizeString(voiceSettings.voice_id || voiceSettings.ai?.voice_id),
      ring_group_targets: normalizeStringArray(
        voiceSettings.ring_group_targets || voiceSettings.dial_targets
      ),
      record_calls: normalizeBoolean(
        voiceSettings.record_calls,
        normalizeBoolean(
          isObject(voiceSettings.recording)
            ? voiceSettings.recording.enabled
            : voiceSettings.recording_enabled,
          false
        )
      ),
    },
    sms_templates: {
      appointment_confirmation_template: normalizeString(
        smsTemplates.appointment_confirmation_template
      ),
      review_request_template: normalizeString(
        smsTemplates.review_request_template
      ),
    },
  });
}

export function mapTenantSettingsToPreferencesPatch(
  settings: TenantSettings
): Record<string, any> {
  const normalized = normalizeSettings(settings);
  return {
    notifications: {
      lead_notification_emails: normalized.notifications.lead_notification_emails,
      new_lead_email: {
        recipients: normalized.notifications.lead_notification_emails,
      },
      sms_alert_numbers: normalized.notifications.sms_alert_numbers,
      daily_digest_enabled: normalized.notifications.daily_digest_enabled,
    },
    ai_settings: {
      texting_enabled: normalized.ai_automations.texting_enabled,
      auto_reply_delay_seconds: normalized.ai_automations.auto_reply_delay_seconds,
      auto_response_start: normalized.ai_automations.auto_response_start,
      auto_response_end: normalized.ai_automations.auto_response_end,
      sms_delay_min_seconds: normalized.ai_automations.auto_reply_delay_seconds,
      sms_delay_max_seconds: normalized.ai_automations.auto_reply_delay_seconds,
      ai_persona: normalized.ai_automations.ai_persona,
      off_hours_behavior: normalized.ai_automations.off_hours_behavior,
    },
    ai_persona: normalized.ai_automations.ai_persona,
    voice: {
      inbound_route_mode: normalized.voice.inbound_route_mode,
      route_mode: inboundToRouteMode(normalized.voice.inbound_route_mode),
      after_hours_route_mode: behaviorToAfterHours(
        normalized.ai_automations.off_hours_behavior
      ),
      voice_id: normalized.voice.voice_id,
      ring_group_targets: normalized.voice.ring_group_targets,
      dial_targets: normalized.voice.ring_group_targets,
      record_calls: normalized.voice.record_calls,
      recording: {
        enabled: normalized.voice.record_calls,
      },
    },
    sms_templates: {
      appointment_confirmation_template:
        normalized.sms_templates.appointment_confirmation_template,
      review_request_template: normalized.sms_templates.review_request_template,
    },
  };
}

function deriveErrorMessage(error: any, fallback: string): string {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function useTenantSettings() {
  const [storedSettings, setStoredSettings] = useState<TenantSettings>(
    cloneSettings(DEFAULT_SETTINGS)
  );
  const [draftSettings, setDraftSettings] = useState<TenantSettings>(
    cloneSettings(DEFAULT_SETTINGS)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [templateRefs, setTemplateRefs] = useState({
    appointmentTemplateId: null,
    reviewTemplateId: null,
  });

  const isDirty = useMemo(
    () => JSON.stringify(storedSettings) !== JSON.stringify(draftSettings),
    [storedSettings, draftSettings]
  );

  const updateSection = useCallback(
    <SectionKey extends keyof TenantSettings>(
      section: SectionKey,
      patch: Partial<TenantSettings[SectionKey]>
    ) => {
      setDraftSettings((previous) =>
        normalizeSettings({
          ...previous,
          [section]: {
            ...(previous[section] || {}),
            ...(patch || {}),
          },
        })
      );
    },
    []
  );

  const reloadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveWarning(null);

    try {
      const [preferencesResponse, aiContextResponse, templatesResponse] = await Promise.all([
        api.get('/accounts/preferences/'),
        api.get('/accounts/ai-context/').catch((error) => {
          if (error?.response?.status === 404 || error?.response?.status === 405) {
            return { data: {} };
          }
          return { data: {} };
        }),
        api.get('/templates/templates/').catch((error) => {
          if (error?.response?.status === 404 || error?.response?.status === 405) {
            return { data: [] };
          }
          return { data: [] };
        }),
      ]);

      const preferences = isObject(preferencesResponse?.data?.preferences)
        ? preferencesResponse.data.preferences
        : {};
      const aiContext = isObject(aiContextResponse?.data)
        ? aiContextResponse.data
        : {};
      const templates = normalizeTemplateList(templatesResponse?.data);

      const appointmentTemplate = templates.find(
        (template) =>
          template?.channel === 'sms' && template?.event_type === APPOINTMENT_EVENT_TYPE
      );
      const reviewTemplate = templates.find(
        (template) => template?.channel === 'sms' && template?.event_type === REVIEW_EVENT_TYPE
      );

      const resolvedSettings = mapPreferencesToTenantSettings(preferences, aiContext);
      const nextSettings = normalizeSettings({
        ...resolvedSettings,
        sms_templates: {
          ...resolvedSettings.sms_templates,
          appointment_confirmation_template:
            normalizeString(appointmentTemplate?.body) ||
            resolvedSettings.sms_templates.appointment_confirmation_template,
          review_request_template:
            normalizeString(reviewTemplate?.body) ||
            resolvedSettings.sms_templates.review_request_template,
        },
      });

      setTemplateRefs({
        appointmentTemplateId: appointmentTemplate?.id || null,
        reviewTemplateId: reviewTemplate?.id || null,
      });
      setStoredSettings(nextSettings);
      setDraftSettings(nextSettings);
    } catch (error) {
      setLoadError(deriveErrorMessage(error, 'Failed to load tenant settings.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const validateBeforeSave = useCallback((candidate: TenantSettings): string | null => {
    if (
      candidate.voice.inbound_route_mode === 'ring_group' &&
      candidate.voice.ring_group_targets.length < 1
    ) {
      return 'Ring Group mode requires at least one target phone number.';
    }

    if (
      candidate.voice.inbound_route_mode === 'single_user' &&
      candidate.voice.ring_group_targets.length !== 1
    ) {
      return 'Single User mode requires exactly one target phone number.';
    }

    return null;
  }, []);

  const saveSettings = useCallback(async () => {
    const normalizedDraft = normalizeSettings(draftSettings);
    const validationError = validateBeforeSave(normalizedDraft);
    if (validationError) {
      setLoadError(validationError);
      throw new Error(validationError);
    }

    setIsSaving(true);
    setLoadError(null);
    setSaveWarning(null);

    try {
      const preferencesPatch = mapTenantSettingsToPreferencesPatch(normalizedDraft);
      const tenantPatch: TenantSettingsPatchRequest = {
        notifications: normalizedDraft.notifications,
        ai_automations: normalizedDraft.ai_automations,
        voice: normalizedDraft.voice,
        sms_templates: normalizedDraft.sms_templates,
      };

      await api.patch('/accounts/preferences/', {
        preferences: preferencesPatch,
        tenant_settings_contract: tenantPatch,
      });

      const warningMessages = [];
      const nextTemplateRefs = {
        appointmentTemplateId: templateRefs.appointmentTemplateId,
        reviewTemplateId: templateRefs.reviewTemplateId,
      };

      try {
        const appointmentBody =
          normalizedDraft.sms_templates.appointment_confirmation_template;
        if (appointmentBody || nextTemplateRefs.appointmentTemplateId) {
          if (nextTemplateRefs.appointmentTemplateId) {
            await api.patch(
              `/templates/templates/${nextTemplateRefs.appointmentTemplateId}/`,
              {
                name: APPOINTMENT_TEMPLATE_NAME,
                body: appointmentBody,
                channel: 'sms',
                event_type: APPOINTMENT_EVENT_TYPE,
              }
            );
          } else {
            const createdAppointmentTemplate = await api.post('/templates/templates/', {
              name: APPOINTMENT_TEMPLATE_NAME,
              body: appointmentBody,
              channel: 'sms',
              event_type: APPOINTMENT_EVENT_TYPE,
            });
            nextTemplateRefs.appointmentTemplateId =
              createdAppointmentTemplate?.data?.id || null;
          }
        }

        const reviewBody = normalizedDraft.sms_templates.review_request_template;
        if (reviewBody || nextTemplateRefs.reviewTemplateId) {
          if (nextTemplateRefs.reviewTemplateId) {
            await api.patch(
              `/templates/templates/${nextTemplateRefs.reviewTemplateId}/`,
              {
                name: REVIEW_TEMPLATE_NAME,
                body: reviewBody,
                channel: 'sms',
                event_type: REVIEW_EVENT_TYPE,
              }
            );
          } else {
            const createdReviewTemplate = await api.post('/templates/templates/', {
              name: REVIEW_TEMPLATE_NAME,
              body: reviewBody,
              channel: 'sms',
              event_type: REVIEW_EVENT_TYPE,
            });
            nextTemplateRefs.reviewTemplateId = createdReviewTemplate?.data?.id || null;
          }
        }
      } catch (templateError) {
        warningMessages.push(
          deriveErrorMessage(
            templateError,
            'Settings were saved, but SMS templates could not be synced to /templates/templates/.'
          )
        );
      }

      try {
        await api.patch('/accounts/ai-context/', {
          tone: normalizedDraft.ai_automations.ai_persona,
        });
      } catch (personaError) {
        warningMessages.push(
          deriveErrorMessage(
            personaError,
            'Settings were saved, but AI persona could not be synced to /accounts/ai-context/.'
          )
        );
      }

      setTemplateRefs(nextTemplateRefs);
      if (warningMessages.length) setSaveWarning(warningMessages.join(' '));

      setStoredSettings(cloneSettings(normalizedDraft));
      setDraftSettings(cloneSettings(normalizedDraft));
      return normalizedDraft;
    } catch (error) {
      const message = deriveErrorMessage(error, 'Failed to save tenant settings.');
      setLoadError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [draftSettings, templateRefs, validateBeforeSave]);

  const resetDraft = useCallback(() => {
    setDraftSettings(cloneSettings(storedSettings));
    setLoadError(null);
    setSaveWarning(null);
  }, [storedSettings]);

  return {
    settings: draftSettings,
    persistedSettings: storedSettings,
    setDraftSettings,
    updateSection,
    saveSettings,
    reloadSettings,
    resetDraft,
    isDirty,
    isLoading,
    isSaving,
    loadError,
    saveWarning,
    backendCoverageNotes: BACKEND_COVERAGE_NOTES,
  };
}

export default useTenantSettings;
