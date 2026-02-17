import React, { useEffect, useState } from "react";
import api from "../../../apiClient";
import { CALL_STATES } from "../../../constants/callStates";
import {
  startOutboundCall,
  acceptVoiceCall,
  rejectVoiceCall,
} from "../../../api/communications";
import {
  getVoiceDevice,
  getLastIncoming,
  getActiveConnection,
  setLastIncoming,
  setActiveConnection as setDeviceActiveConnection,
} from "../../../services/voiceDevice";
import "./WebPhone.css";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const getCallId = (payload = {}) =>
  payload.call_id ||
  payload.parameters?.call_id ||
  payload.parameters?.CallSid ||
  payload.parameters?.callSid ||
  payload.callSid ||
  payload.call_sid ||
  "";

export function IncomingCall({ call, accept, reject }) {
  if (!call) return null;
  const fromLabel =
    call.parameters?.From ||
    call.parameters?.Caller ||
    call.parameters?.from ||
    call.from ||
    "Incoming call";

  return (
    <div className="incoming-card">
      <div>
        <p className="eyebrow">Incoming</p>
        <h3>{fromLabel}</h3>
      </div>
      <div className="incoming-card__actions">
        <button className="webphone-btn primary" onClick={accept}>
          Accept
        </button>
        <button className="webphone-btn ghost" onClick={reject}>
          Reject
        </button>
      </div>
    </div>
  );
}

export default function WebPhone() {
  const [fromNumbers, setFromNumbers] = useState([]);
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [dialing, setDialing] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [activeCallSid, setActiveCallSid] = useState("");
  const [activeConnection, setActiveConnection] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deviceReady, setDeviceReady] = useState(false);

  useEffect(() => {
    const device = getVoiceDevice();
    if (device) setDeviceReady(true);

    const initialIncoming = getLastIncoming();
    if (initialIncoming) {
      setIncomingCall(initialIncoming);
      setActiveCallSid(getCallId(initialIncoming));
      setCallState(CALL_STATES.RINGING);
    }

    const initialConnection = getActiveConnection();
    if (initialConnection) {
      setActiveConnection(initialConnection);
      setActiveCallSid(getCallId(initialConnection));
      setCallState(CALL_STATES.IN_PROGRESS);
    }

    const handleRegistered = () => {
      setDeviceReady(true);
      setCallState((prev) => (prev === CALL_STATES.IDLE ? CALL_STATES.IDLE : prev));
    };

    const handleIncoming = (event) => {
      const call = event?.detail?.call;
      if (!call) return;
      const callSid = getCallId(call);
      setIncomingCall(call);
      setActiveCallSid(callSid);
      setCallState(CALL_STATES.RINGING);
      setError("");
    };

    const handleConnect = (event) => {
      const connection = event?.detail?.connection;
      if (!connection) return;
      const callSid = getCallId(connection);
      setCallState(CALL_STATES.IN_PROGRESS);
      setActiveConnection(connection);
      setActiveCallSid(callSid);
      setIncomingCall(null);
      setMessage("Call connected.");
      setDeviceActiveConnection(connection);
    };

    const handleDisconnect = () => {
      setCallState(CALL_STATES.COMPLETED);
      setActiveConnection(null);
      setActiveCallSid("");
      setIncomingCall(null);
      setDeviceActiveConnection(null);
      setLastIncoming(null);
    };

    const handleError = (event) => {
      const err = event?.detail?.error;
      setError(err?.message || "Voice error.");
      setCallState(CALL_STATES.FAILED);
    };

    window.addEventListener("voice-device-registered", handleRegistered);
    window.addEventListener("voice-registered", handleRegistered);
    window.addEventListener("voice-incoming", handleIncoming);
    window.addEventListener("voice-connect", handleConnect);
    window.addEventListener("voice-disconnect", handleDisconnect);
    window.addEventListener("voice-error", handleError);

    return () => {
      window.removeEventListener("voice-device-registered", handleRegistered);
      window.removeEventListener("voice-registered", handleRegistered);
      window.removeEventListener("voice-incoming", handleIncoming);
      window.removeEventListener("voice-connect", handleConnect);
      window.removeEventListener("voice-disconnect", handleDisconnect);
      window.removeEventListener("voice-error", handleError);
    };
  }, []);

  useEffect(() => {
    const loadNumbers = async () => {
      try {
        const res = await api.get("/comms/phone-numbers/");
        const rows = Array.isArray(res.data?.phone_numbers) ? res.data.phone_numbers : res.data || [];
        const mapped = rows
          .map((n) => ({
            id: n.id || n.phone_number_id || n.number_id || n.uuid || n.public_id,
            number: n.phone_number || n.number || n.value || "",
            is_primary: Boolean(n.is_primary || n.primary || n.is_default),
          }))
          .filter((n) => n.id && n.number);
        setFromNumbers(mapped);
        if (mapped.length) {
          const primary = mapped.find((n) => n.is_primary);
          setFromNumber((prev) => prev || (primary || mapped[0]).number);
        }
      } catch {
        setFromNumbers([]);
      }
    };
    loadNumbers();
  }, []);

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    setError("");
    try {
      const callSid = getCallId(incomingCall) || activeCallSid;
      if (!callSid) {
        setError("Missing call id for accept.");
        return;
      }
      if (typeof incomingCall.accept !== "function") {
        setError("Voice device not ready to accept this call.");
        return;
      }
      await acceptVoiceCall(callSid);
      incomingCall.accept();
      setActiveConnection(incomingCall);
      setDeviceActiveConnection(incomingCall);
      setLastIncoming(null);
      setIncomingCall(null);
      setCallState(CALL_STATES.IN_PROGRESS);
      setMessage("Incoming call accepted.");
    } catch (err) {
      setError(err?.message || "Unable to accept call.");
    }
  };

  const rejectIncoming = async () => {
    if (!incomingCall) return;
    setError("");
    try {
      const callSid = getCallId(incomingCall) || activeCallSid;
      if (!callSid) {
        setError("Missing call id for reject.");
        return;
      }
      if (typeof incomingCall.reject !== "function") {
        setError("Voice device not ready to reject this call.");
        return;
      }
      await rejectVoiceCall(callSid);
      incomingCall.reject();
    } catch (err) {
      setError(err?.message || "Unable to reject call.");
    } finally {
      setIncomingCall(null);
      setLastIncoming(null);
      setMessage("Incoming call rejected.");
    }
  };

  const dialpadKey = (key) => {
    if (activeConnection && typeof activeConnection.sendDigits === "function") {
      activeConnection.sendDigits(key);
      return;
    }
    setToNumber((prev) => `${prev || ""}${key}`);
  };

  const handleOutbound = async () => {
    if (!fromNumber || !toNumber) {
      setError("From and to numbers are required.");
      return;
    }
    const device = getVoiceDevice();
    if (!device) {
      setError("Voice device not ready. Try reloading Communications.");
      return;
    }
    setDialing(true);
    setError("");
    setMessage("");
    setCallState(CALL_STATES.RINGING);

    try {
      const res = await startOutboundCall(fromNumber, toNumber);
      const callSid = getCallId(res);
      setActiveCallSid(callSid);
      setMessage("Outbound call started.");
      const params = { params: { call_id: callSid || "" } };
      const connection = device.connect(params);
      setActiveConnection(connection || null);
      setCallState(CALL_STATES.RINGING);
    } catch (err) {
      setError(err?.message || "Unable to start outbound call.");
      setCallState(CALL_STATES.FAILED);
    } finally {
      setDialing(false);
    }
  };

  return (
    <div className="webphone-card">
      <div className="webphone-card__header">
        <h2>Web Phone</h2>
        <div className="status-pill">{callState.replace(/_/g, " ")}</div>
      </div>

      {error && <div className="webphone-alert webphone-alert--error">{error}</div>}
      {message && !error && <div className="webphone-alert">{message}</div>}

      <div className="webphone-grid">
        <div className="webphone-panel">
          <div className="webphone-panel__header">
            <h4>Outbound</h4>
          </div>
          <div className="webphone-field">
            <label>From number</label>
            {fromNumbers.length ? (
              <select value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}>
                <option value="">Select a number</option>
                {fromNumbers.map((n) => (
                  <option key={n.id} value={n.number}>
                    {n.number} {n.is_primary ? "• Primary" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="tel"
                placeholder="+15551234567"
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
              />
            )}
          </div>

          <div className="webphone-field">
            <label>To number</label>
            <input
              type="tel"
              placeholder="+15551234567"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
            />
          </div>

          <div className="dialpad">
            {KEYPAD_KEYS.map((key) => (
              <button key={key} type="button" className="dialpad__key" onClick={() => dialpadKey(key)}>
                {key}
              </button>
            ))}
            <button type="button" className="dialpad__key ghost" onClick={() => setToNumber((prev) => (prev ? prev.slice(0, -1) : ""))}>
              ⌫
            </button>
            <button type="button" className="dialpad__key ghost" onClick={() => setToNumber("")}>
              Clear
            </button>
          </div>

          <div className="webphone-actions">
            <button
              className="webphone-btn primary"
              type="button"
              onClick={handleOutbound}
              disabled={dialing || !deviceReady}
            >
              {dialing ? "Calling…" : "Call"}
            </button>
          </div>
        </div>

        <div className="webphone-panel">
          <div className="webphone-panel__header">
            <h4>Incoming calls</h4>
          </div>
          <IncomingCall call={incomingCall} accept={acceptIncoming} reject={rejectIncoming} />
          {!incomingCall && <p className="muted">Waiting for incoming calls.</p>}
        </div>
      </div>
    </div>
  );
}
