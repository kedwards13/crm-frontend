export type OffHoursBehavior = 'voicemail' | 'ai_assistant' | 'forward';

export type InboundRouteMode = 'ring_group' | 'single_user' | 'ai_first';

export interface TenantNotificationSettings {
  /**
   * Explicit recipients for new lead dossier emails.
   * Backend mapping: preferences.notifications.new_lead_email.recipients.
   * Note: backend may also include tenant admin/support and role-based users unless disabled.
   */
  lead_notification_emails: string[];

  /**
   * Recipients for high-priority SMS alerts.
   * Backend mapping: tenant preferences notifications block (custom key).
   */
  sms_alert_numbers: string[];

  /**
   * Enables/disables daily summary notifications.
   * Backend mapping: tenant preferences notifications block (custom key).
   */
  daily_digest_enabled: boolean;
}

export interface TenantAIAutomationSettings {
  /**
   * Master switch for AI texting.
   * Backend mapping: preferences.ai_settings.texting_enabled (fallbacks: preferences.ai.texting_enabled, tenant.allow_ai_followups).
   * Note: even when true, AI auto-reply is blocked after manual/human outbound messages and for booked/converted/closed/scheduled leads.
   */
  texting_enabled: boolean;

  /**
   * Natural pause before AI responses (seconds).
   * Backend currently uses sms_delay_min_seconds/sms_delay_max_seconds and quiet-hour delay logic for automated first-touch sends.
   */
  auto_reply_delay_seconds: number;

  /**
   * Start of tenant-defined AI active response window (24h HH:mm).
   * Backend mapping: preferences.ai_settings.auto_response_start.
   */
  auto_response_start: string;

  /**
   * End of tenant-defined AI active response window (24h HH:mm).
   * Backend mapping: preferences.ai_settings.auto_response_end.
   */
  auto_response_end: string;

  /**
   * Off-hours behavior abstraction for UI.
   * Typical backend mapping:
   * - voicemail -> voice_profile.after_hours_route_mode = "voicemail"
   * - ai_assistant -> "ai_terminal" or "ai_then_route" (with ai.enabled = true)
   * - forward -> "ring_group" or "single_user"
   */
  off_hours_behavior: OffHoursBehavior;

  /**
   * Tenant AI personality label (for example: Professional, Friendly, Direct).
   * Backend sources: TenantAIContext.tone and/or tenant preferences AI block.
   */
  ai_persona: string;
}

export interface TenantVoiceSettings {
  /**
   * Inbound call routing mode.
   * Backend mapping:
   * - ring_group -> TenantVoiceProfile.route_mode = "ring_group"
   * - single_user -> TenantVoiceProfile.route_mode = "single_user"
   * - ai_first -> TenantVoiceProfile.route_mode = "ai_terminal" or "ai_then_route"
   */
  inbound_route_mode: InboundRouteMode;

  /**
   * ElevenLabs voice identifier used by voice AI runtime.
   * Stored as pass-through voice config (commonly in voice_profile.ai payload).
   */
  voice_id: string;

  /**
   * Targets to ring/forward for voice calls.
   * Backend mapping: TenantVoiceProfile.dial_targets.
   * Validation rules: ring_group requires >= 1 target; single_user requires exactly 1 target.
   */
  ring_group_targets: string[];

  /**
   * Enables call recording.
   * Backend mapping: TenantVoiceProfile.recording.enabled -> Call.recording_enabled at route resolution.
   */
  record_calls: boolean;
}

export interface TenantSMSTemplateSettings {
  /**
   * Appointment confirmation/reminder template body.
   * Backend source typically resolves from MessageTemplate (event_type: appointment_reminder, channel: sms/email).
   */
  appointment_confirmation_template: string;

  /**
   * Review request template body.
   * Backend source typically resolves from MessageTemplate (event_type: review_request).
   */
  review_request_template: string;
}

export interface TenantSettings {
  notifications: TenantNotificationSettings;
  ai_automations: TenantAIAutomationSettings;
  voice: TenantVoiceSettings;
  sms_templates: TenantSMSTemplateSettings;
}

export interface TenantSettingsApiResponse {
  tenant_id: number;
  settings: TenantSettings;
}

export interface TenantSettingsPatchRequest {
  notifications?: Partial<TenantNotificationSettings>;
  ai_automations?: Partial<TenantAIAutomationSettings>;
  voice?: Partial<TenantVoiceSettings>;
  sms_templates?: Partial<TenantSMSTemplateSettings>;
}
