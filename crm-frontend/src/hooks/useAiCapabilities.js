import { useEffect, useMemo, useState } from "react";

import api from "../apiClient";

const SYSTEM_AI_ENABLED =
  String(process.env.REACT_APP_AI_ENABLED || "true").trim().toLowerCase() !== "false";

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  }
  return fallback;
};

const buildCapabilities = (preferences = {}, aiContext = {}) => {
  const aiSettings =
    preferences && typeof preferences.ai_settings === "object" && !Array.isArray(preferences.ai_settings)
      ? preferences.ai_settings
      : preferences && typeof preferences.ai === "object" && !Array.isArray(preferences.ai)
      ? preferences.ai
      : {};

  const voiceSettings =
    preferences && typeof preferences.voice === "object" && !Array.isArray(preferences.voice)
      ? preferences.voice
      : {};

  const tenantAiEnabled =
    toBoolean(aiSettings.texting_enabled) ||
    toBoolean(preferences.allow_ai_followups) ||
    toBoolean(aiContext.enabled);

  const voiceEnabled = toBoolean(voiceSettings.voice_enabled, true);
  const voiceAiEnabled = toBoolean(voiceSettings.ai_enabled) && voiceEnabled;
  const intelligenceEnabled = SYSTEM_AI_ENABLED && (tenantAiEnabled || voiceAiEnabled);
  const campaignEnabled = SYSTEM_AI_ENABLED && tenantAiEnabled;

  return {
    systemEnabled: SYSTEM_AI_ENABLED,
    tenantEnabled: tenantAiEnabled,
    intelligenceEnabled,
    campaignEnabled,
    voiceEnabled: SYSTEM_AI_ENABLED && voiceAiEnabled,
    disabledReason: !SYSTEM_AI_ENABLED
      ? "AI is disabled at the system level."
      : intelligenceEnabled
      ? ""
      : "AI is disabled for this tenant. Core CRM data remains fully available.",
  };
};

export default function useAiCapabilities() {
  const [preferences, setPreferences] = useState({});
  const [aiContext, setAiContext] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [preferencesResponse, aiContextResponse] = await Promise.all([
          api.get("/accounts/preferences/"),
          api.get("/accounts/ai-context/").catch((requestError) => {
            const status = Number(requestError?.response?.status || 0);
            if (status === 404 || status === 405) {
              return { data: {} };
            }
            throw requestError;
          }),
        ]);
        if (!mounted) return;
        setPreferences(
          preferencesResponse?.data?.preferences &&
            typeof preferencesResponse.data.preferences === "object"
            ? preferencesResponse.data.preferences
            : {}
        );
        setAiContext(
          aiContextResponse?.data && typeof aiContextResponse.data === "object"
            ? aiContextResponse.data
            : {}
        );
      } catch (requestError) {
        if (!mounted) return;
        setPreferences({});
        setAiContext({});
        setError(
          requestError?.response?.data?.detail ||
            requestError?.message ||
            "AI availability could not be confirmed."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const capabilities = useMemo(
    () => buildCapabilities(preferences, aiContext),
    [preferences, aiContext]
  );

  return {
    ...capabilities,
    loading,
    error,
  };
}

