// src/components/Communication/CommunicationsPage.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSubNavForPage, getIndustryKey } from "../../constants/uiRegistry";
import InboxPage from "./Inbox/InboxPage";
import SMSPage from "./SMS/SMSPage";
import CallsPage from "./Calls/CallsPage";
import EmailPage from "./Email/EmailPage";
import TemplatesPage from "./Templates/TemplatesPage";
import SequencesPage from "./Sequences/SequencesPage"; // start with inbox
import DialerPage from "./Dialer/DialerPage";
import { AuthContext } from "../../App";
import {
  fetchVoiceClientToken,
  registerVoiceDevice,
} from "../../api/communications";
import {
  initVoiceDevice,
  getVoiceDevice,
  setLastIncoming,
  setActiveConnection,
} from "../../services/voiceDevice";

export default function CommunicationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, tenant } = useContext(AuthContext);
  const voiceEventsAttached = useRef(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const activeTenantId = tenant?.id;

  const industry = getIndustryKey();
  const tabs = getSubNavForPage("/communication", industry);

  const [activeTab, setActiveTab] = useState(() => {
    const match = tabs.find(t => location.pathname.includes(t.path));
    return match?.key || "inbox";
  });

  const attachDeviceEvents = React.useCallback((device) => {
    if (!device || voiceEventsAttached.current || device.__voiceListenersAttached) return;
    voiceEventsAttached.current = true;
    device.__voiceListenersAttached = true;

    const emit = (name, detail) => {
      try {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      } catch {
        // ignore
      }
    };

    device.on("incoming", (call) => {
      setLastIncoming(call);
      emit("voice-incoming", { call });
    });
    device.on("connect", (connection) => {
      setActiveConnection(connection);
      setLastIncoming(null);
      emit("voice-connect", { connection });
    });
    device.on("disconnect", () => {
      setActiveConnection(null);
      setLastIncoming(null);
      emit("voice-disconnect", {});
    });
    device.on("error", (error) => emit("voice-error", { error }));
    device.on("registered", () => emit("voice-registered", {}));
    device.on("registrationFailed", (error) =>
      emit("voice-registration-failed", { error })
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return navigate("/login");
  }, [isAuthenticated, navigate]);

  const handleEnableVoice = React.useCallback(async () => {
    if (voiceLoading || voiceReady) return;
    if (!isAuthenticated) return navigate("/login");
    if (!activeTenantId) {
      console.error("[VOICE] missing tenant id");
      return;
    }
    setVoiceLoading(true);
    console.log("[VOICE] click");
    console.log("[VOICE] tenant", activeTenantId);

    const emitVoiceError = (message, error) => {
      const err = error instanceof Error ? error : new Error(message);
      try {
        window.dispatchEvent(new CustomEvent("voice-error", { detail: { error: err } }));
      } catch {
        // ignore
      }
      console.error(message, error);
    };

    try {
      const clientToken = await fetchVoiceClientToken(activeTenantId);
      console.log("[VOICE] CRM token OK");

      const registration = await registerVoiceDevice(clientToken, activeTenantId);
      console.log("[VOICE] voice registered");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        console.log("[VOICE] Mic permission granted");
      } catch (micErr) {
        emitVoiceError("Microphone permission is required.", micErr);
        return;
      }

      const device = await initVoiceDevice(
        registration?.webrtcToken || registration?.client_token || registration?.access_token || clientToken,
        { iceServers: registration?.iceServers }
      );
      attachDeviceEvents(device);
      setVoiceReady(true);
      console.log("[VOICE] device ready");
    } catch (err) {
      const status = err?.response?.status;
      let message = err?.message || "Voice setup failed.";
      if (status === 401 || status === 403) {
        message = "Voice service rejected registration (unauthorized).";
      } else if (message?.toLowerCase().includes("sdp")) {
        message = "Unable to negotiate WebRTC (SDP).";
      }
      emitVoiceError(message, err);
    } finally {
      setVoiceLoading(false);
    }
  }, [activeTenantId, attachDeviceEvents, isAuthenticated, navigate, voiceLoading, voiceReady]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const attachIfReady = () => {
      const device = getVoiceDevice();
      if (!device) return;
      attachDeviceEvents(device);
    };

    window.addEventListener("voice-device-registered", attachIfReady);
    attachIfReady();
    return () => {
      window.removeEventListener("voice-device-registered", attachIfReady);
    };
  }, [attachDeviceEvents, isAuthenticated]);

  useEffect(() => {
    const match = tabs.find(t => location.pathname.includes(t.path));
    if (match) setActiveTab(match.key);
  }, [location.pathname, tabs]);

  return (
    <div className="communications-page">
      <div className="voice-enable-bar">
        <button
          type="button"
          className="webphone-btn primary"
          onClick={handleEnableVoice}
          disabled={voiceLoading || voiceReady}
        >
          {voiceReady ? "Calling Enabled" : voiceLoading ? "Enabling…" : "Enable Calling"}
        </button>
      </div>
      {/* ⬇️ Conditional rendering for now — later move into router */}
      {activeTab === "inbox" && <InboxPage />}
      {activeTab === "sms" && <SMSPage />}
      {activeTab === "calls" && <CallsPage />}
      {activeTab === "dialer" && <DialerPage />}
      {activeTab === "email" && <EmailPage />}
      {activeTab === "templates" && <TemplatesPage />}
      {activeTab === "sequences" && <SequencesPage />}
      {/* Add other tabs here later (SMSPage, CallsPage, etc) */}
    </div>
  );
}
