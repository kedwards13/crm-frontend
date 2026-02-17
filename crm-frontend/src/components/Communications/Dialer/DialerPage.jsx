import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";
import { fetchCallLogs, startOutboundCall } from "../../../api/communications";
import { CALL_STATES } from "../../../constants/callStates";
import {
  uploadDialList,
  fetchDialLists,
  fetchDialListContacts,
} from "../../../api/dialLists";
import { getActiveTenant } from "../../../helpers/tenantHelpers";
import { getVoiceDevice } from "../../../services/voiceDevice";
import "../Calls/WebPhone.css";
import "./DialerPage.css";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const getCallId = (payload = {}) =>
  payload.call_id ||
  payload.parameters?.call_id ||
  payload.parameters?.CallSid ||
  payload.parameters?.callSid ||
  payload.callSid ||
  payload.call_sid ||
  "";

const cleanNumber = (value = "") =>
  value
    .replace(/[^\d+]/g, "")
    .replace(/^\+?0+/, "+")
    .trim();

const parseNumbers = (text = "") => {
  const values = text
    .split(/[\n,;]+/)
    .map(cleanNumber)
    .filter(Boolean);
  return Array.from(new Set(values));
};

const normalizeToE164 = (input = "") => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.startsWith("+") && input.length > 1) return input;
  return "";
};

const getSessionId = (session = {}) =>
  session.id || session.public_id || session.uuid || "";

const mergeCalls = (current = [], incoming = []) => {
  const map = new Map();
  incoming.forEach((call) => {
    const key = call.call_sid || call.sid || call.id || `${call.to_number}-${call.created_at}`;
    map.set(key, call);
  });
  current.forEach((call) => {
    const key = call.call_sid || call.sid || call.id || `${call.to_number}-${call.created_at}`;
    if (!map.has(key)) map.set(key, call);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
  );
};

const fetchDialerSessions = async () => {
  const res = await api.get("/comms/dialer/sessions/");
  return res.data || {};
};

const fetchOutboundNumbers = async () => {
  const res = await api.get("/comms/phone-numbers/");
  return res.data?.phone_numbers || res.data || [];
};

const createDialerSession = async (payload) => {
  const res = await api.post("/comms/dialer/sessions/", payload);
  return res.data || {};
};

const addDialerNumbers = async (sessionId, numbers = []) => {
  const res = await api.post(`/comms/dialer/sessions/${sessionId}/items/`, { numbers });
  return res.data || {};
};

const sanitizeDialValue = (value = "") => {
  const cleaned = String(value || "").replace(/[^\d*#+]/g, "");
  if (!cleaned) return "";
  const stripped = cleaned.replace(/\+/g, "");
  return cleaned.startsWith("+") ? `+${stripped}` : stripped;
};

export default function DialerPage() {
  const tenantId = useMemo(() => getActiveTenant()?.id || "", []);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionName, setSessionName] = useState("New Session");
  const [createNumbersText, setCreateNumbersText] = useState("");
  const [createPreview, setCreatePreview] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [queuedNumbers, setQueuedNumbers] = useState([]);
  const [addNumbersText, setAddNumbersText] = useState("");
  const [addPreview, setAddPreview] = useState([]);
  const [fromNumbers, setFromNumbers] = useState([]);
  const [fromNumber, setFromNumber] = useState("");
  const [nextNumber, setNextNumber] = useState("");
  const [dialInput, setDialInput] = useState("");
  const [manualCalling, setManualCalling] = useState(false);
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [dialLists, setDialLists] = useState([]);
  const [dialListContacts, setDialListContacts] = useState([]);
  const [selectedDialListId, setSelectedDialListId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState(null);

  useEffect(() => {
    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const res = await fetchDialerSessions();
        const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : res?.sessions || [];
        setSessions(list);
        if (!activeSessionId && list.length) {
          setActiveSessionId(getSessionId(list[0]));
        }
      } catch (err) {
        setError(err?.message || "Unable to load dialer sessions.");
      } finally {
        setLoadingSessions(false);
      }
    };
    loadSessions();
  }, [activeSessionId]);

  useEffect(() => {
    const loadNumbers = async () => {
      try {
        const res = await fetchOutboundNumbers();
        const mapped = Array.isArray(res) ? res : res?.phone_numbers || res?.results || [];
        const normalized = mapped
          .map((n) => ({
            id: n.id || n.phone_number_id || n.number_id || n.uuid,
            number: n.phone_number || n.number || n.value || "",
            is_primary: n.is_primary || n.primary || n.is_default,
          }))
          .filter((n) => n.id && n.number);
        setFromNumbers(normalized);
        if (normalized.length === 1) {
          setFromNumber(normalized[0].number);
        } else if (normalized.length > 1) {
          const primary = normalized.find((n) => n.is_primary)?.number || normalized[0]?.number || "";
          setFromNumber(primary);
        }
      } catch {
        // ignore; dropdown will stay empty
      }
    };
    loadNumbers();
    const loadDialLists = async () => {
      try {
        const lists = await fetchDialLists();
        setDialLists(lists || []);
      } catch {
        // ignore
      }
    };
    loadDialLists();
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = await fetchCallLogs({ dialing_session_id: activeSessionId });
        const rows = Array.isArray(data) ? data : Array.isArray(data?.calls) ? data.calls : [];
        if (cancelled) return;
        setHistory((prev) => mergeCalls(prev, rows));
        setHistoryError("");
      } catch (err) {
        if (cancelled) return;
        setHistoryError(err?.message || "Unable to load call history.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    const timer = setInterval(loadHistory, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!history.length) {
      setCallState((prev) =>
        prev === CALL_STATES.RINGING || prev === CALL_STATES.FAILED ? prev : CALL_STATES.IDLE
      );
      return;
    }
    const latestStatus = history[0]?.status;
    if (Object.values(CALL_STATES).includes(latestStatus)) {
      setCallState(latestStatus);
    }
  }, [history]);

  const dialpadKey = (key) => {
    setDialInput((prev) => sanitizeDialValue(`${prev || ""}${key}`));
  };

  const handleManualDial = async () => {
    const target = sanitizeDialValue(dialInput);
    if (!fromNumber) {
      setError("Select a from number.");
      return;
    }
    if (!target) {
      setError("Enter a valid number to dial.");
      return;
    }
    const device = getVoiceDevice();
    if (!device) {
      setError("Voice device not ready. Reload Communications.");
      return;
    }

    setManualCalling(true);
    setError("");
    setCallState(CALL_STATES.RINGING);

    try {
      const res = await startOutboundCall(fromNumber, target);
      const callSid = getCallId(res) || null;
      const callRecord = {
        call_sid: callSid,
        status: CALL_STATES.RINGING,
        direction: "outbound",
        to_number: target,
        from_number: fromNumber,
        created_at: new Date().toISOString(),
      };
      setHistory((prev) => mergeCalls([callRecord], prev));
      setDialInput("");
      const params = { params: { call_id: callSid || "" } };
      device.connect(params);
    } catch (err) {
      setError(err?.message || "Unable to start outbound call.");
      setCallState(CALL_STATES.FAILED);
    } finally {
      setManualCalling(false);
    }
  };

  const handleCreateCsv = async (file) => {
    if (!file) return;
    if (!file.type.includes("csv") && !file.name.match(/\.csv$/i)) {
      setError("Use CSV for session numbers, or upload XLSX in Dial Lists.");
      return;
    }
    const text = await file.text();
    setCreatePreview(parseNumbers(text));
  };

  const handleAddCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    setAddPreview(parseNumbers(text));
  };

  const handleCreateSession = async () => {
    const numbers =
      createPreview.length > 0 ? createPreview : parseNumbers(createNumbersText);

    if (!numbers.length) {
      setError("Add at least one phone number for this dialing session.");
      return;
    }
    if (!tenantId) {
      setError("Select a tenant before creating a session.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const payload = {
        name: sessionName || "New Session",
        from_phone_number: fromNumber || undefined,
        source: "csv",
        numbers,
      };
      const res = await createDialerSession(payload);
      const sessionId = getSessionId(res);

      setSessions((prev) => [
        { ...res, name: payload.name, from_phone_number: payload.from_phone_number },
        ...prev.filter((s) => getSessionId(s) !== sessionId),
      ]);
      setActiveSessionId(sessionId);
      setQueuedNumbers(numbers);
      setCreateNumbersText("");
      setCreatePreview([]);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to create session.");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    setQueuedNumbers([]);
    setHistory([]);
  };

  const handleAddNumbers = async () => {
    if (!activeSessionId) {
      setError("Create or select a session first.");
      return;
    }

    const numbers = addPreview.length ? addPreview : parseNumbers(addNumbersText);
    if (!numbers.length) {
      setError("Upload or type the numbers you want to add.");
      return;
    }

    setAdding(true);
    setError("");
    try {
      await addDialerNumbers(activeSessionId, numbers);
      setQueuedNumbers((prev) => {
        const merged = [...prev, ...numbers];
        return Array.from(new Set(merged));
      });
      setAddPreview([]);
      setAddNumbersText("");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to add numbers.");
    } finally {
      setAdding(false);
    }
  };

  const handleDialListUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadInfo(null);
    try {
      const res = await uploadDialList(file);
      setUploadInfo(res);
      const lists = await fetchDialLists();
      setDialLists(lists || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectDialList = async (listId) => {
    setSelectedDialListId(listId);
    try {
      const contacts = await fetchDialListContacts(listId);
      setDialListContacts(contacts || []);
      const queue = (contacts || []).map((c) => normalizeToE164(c.phone_number || c.phone || ""));
      setQueuedNumbers(queue.filter(Boolean));
      setNextNumber("");
    } catch (err) {
      setError(err?.message || "Unable to load contacts.");
    }
  };

  const handleCallNext = async () => {
    if (!activeSessionId) {
      setError("Select a session to start dialing.");
      return;
    }
    const activeContact = dialListContacts.find((c) =>
      normalizeToE164(c.phone_number || c.phone || "") === normalizeToE164(nextNumber || queuedNumbers[0] || "")
    );
    const target = normalizeToE164(nextNumber || queuedNumbers[0] || "");
    if (!target) {
      setError("No numbers queued to dial.");
      return;
    }
    const fromPhone = fromNumber || "";
    if (!fromPhone) {
      setError("Select a from number.");
      return;
    }
    if (!tenantId) {
      setError("Select a tenant before dialing.");
      return;
    }
    const device = getVoiceDevice();
    if (!device) {
      setError("Voice device not ready. Reload Communications.");
      return;
    }

    setCalling(true);
    setError("");
    setCallState(CALL_STATES.RINGING);

    try {
      const res = await startOutboundCall(fromPhone, target);
      const callSid = getCallId(res) || null;

      const callRecord = {
        call_sid: callSid,
        status: CALL_STATES.RINGING,
        direction: "outbound",
        to_number: target,
        from_number: fromPhone,
        created_at: new Date().toISOString(),
        metadata: {
          dialing_session_id: activeSessionId,
          dial_list_id: selectedDialListId || null,
          dial_list_contact_id: activeContact?.id || null,
        },
      };

      setHistory((prev) => mergeCalls([callRecord], prev));
      setDialListContacts((prev) =>
        prev.filter(
          (c) => normalizeToE164(c.phone_number || c.phone || "") !== target
        )
      );
      setQueuedNumbers((prev) => prev.filter((n, idx) => (nextNumber ? n !== target : idx !== 0)));
      setNextNumber("");
      const params = { params: { call_id: callSid || "" } };
      device.connect(params);
    } catch (err) {
      setError(err?.message || "Unable to start outbound call.");
    } finally {
      setCalling(false);
    }
  };

  const activeSession = sessions.find((s) => getSessionId(s) === activeSessionId) || null;

  const renderQueue = () => {
    if (!queuedNumbers.length) {
      return <p className="muted">No numbers queued yet.</p>;
    }
    return (
      <div className="dialer-queue">
        {queuedNumbers.slice(0, 6).map((num, idx) => (
          <span key={`${num}-${idx}`} className="dialer-chip">
            {num}
          </span>
        ))}
        {queuedNumbers.length > 6 && (
          <span className="dialer-chip ghost">+{queuedNumbers.length - 6} more</span>
        )}
      </div>
    );
  };

  return (
    <div className="dialer-page">
      <div className="dialer-header">
        <div>
          <p className="eyebrow">Dialer</p>
          <h2>Dialing sessions</h2>
          <p className="muted">
            Create sessions, upload CSVs, and trigger outbound calls. CRM tracks pacing/status, and
            the browser places audio via Voice/WebRTC.
          </p>
        </div>
        <div className="webphone-status">{tenantId ? `Tenant ${tenantId}` : "No tenant selected"}</div>
      </div>

      {error && <div className="webphone-alert webphone-alert--error">{error}</div>}

      <div className="dialer-grid">
        <div className="dialer-card">
          <div className="dialer-card__header">
            <div>
              <h3>Dial lists</h3>
              <p className="muted tiny">Upload CSV/XLSX, then click to load contacts.</p>
            </div>
            {uploading && <div className="dialer-pill ghost">Uploading…</div>}
          </div>
          <div className="dialer-upload">
            <label className="webphone-btn ghost">
              Upload file
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleDialListUpload(e.target.files?.[0])}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            {uploadInfo && (
              <span className="dialer-pill ghost">
                List {uploadInfo.dial_list_id || ""} • {uploadInfo.created || 0} created
              </span>
            )}
          </div>
          {dialLists.length === 0 ? (
            <p className="muted">No saved dial lists.</p>
          ) : (
            <div className="dialer-table">
              {dialLists.map((list) => (
                <div
                  key={list.id || list.name}
                  className={`dialer-row ${String(list.id) === String(selectedDialListId) ? "active" : ""}`}
                  onClick={() => handleSelectDialList(list.id)}
                >
                  <div>
                    <div className="dialer-row__title">{list.name || "Dial list"}</div>
                    <div className="muted tiny">
                      {list.region || "n/a"} • {list.status || "active"}
                    </div>
                  </div>
                  <div className="dialer-pill ghost">{list.contact_count || list.contacts_count || 0} contacts</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialer-card">
          <div className="dialer-card__header">
            <div>
              <h3>New session</h3>
              <p className="muted tiny">POST /api/comms/dialer/sessions/</p>
            </div>
            <div className="dialer-pill">Draft → Active</div>
          </div>

          <div className="dialer-form">
            <label>Session name</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="June follow-ups"
            />

            <label>From number</label>
            <select
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              disabled={!fromNumbers.length}
            >
              {!fromNumbers.length && <option value="">No numbers available</option>}
              {fromNumbers.map((n) => (
                <option key={n.id} value={n.number}>
                  {n.number} {n.is_primary ? "• Primary" : ""}
                </option>
              ))}
            </select>

            <label>Paste numbers (optional)</label>
            <textarea
              rows="3"
              value={createNumbersText}
              onChange={(e) => setCreateNumbersText(e.target.value)}
              placeholder="+14025550123, +14025550124"
            />

            <label>Upload CSV</label>
            <div className="dialer-upload">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => handleCreateCsv(e.target.files?.[0])}
              />
              {createPreview.length > 0 && (
                <span className="dialer-pill ghost">{createPreview.length} numbers parsed</span>
              )}
            </div>

            <button
              className="webphone-btn primary"
              type="button"
              onClick={handleCreateSession}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create session"}
            </button>
          </div>
        </div>

        <div className="dialer-card">
          <div className="dialer-card__header">
            <div>
              <h3>Active sessions</h3>
              <p className="muted tiny">GET /api/comms/dialer/sessions/</p>
            </div>
            {loadingSessions && <div className="dialer-pill ghost">Loading…</div>}
          </div>

          {sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            <div className="dialer-table">
              {sessions.map((session) => {
                const id = getSessionId(session);
                return (
                  <div
                    key={id}
                    className={`dialer-row ${id === activeSessionId ? "active" : ""}`}
                    onClick={() => handleSelectSession(id)}
                  >
                    <div>
                      <div className="dialer-row__title">{session.name || "Session"}</div>
                      <div className="muted tiny">
                        ID {id} • status {session.status || "draft"}
                      </div>
                    </div>
                    <div className="dialer-pill ghost">
                      {session.items_created ?? session.items ?? 0} numbers
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="dialer-grid">
        <div className="dialer-card">
          <div className="dialer-card__header">
            <div>
              <h3>Manual dialer</h3>
              <p className="muted tiny">POST /voice/webrtc/call</p>
            </div>
            <div className="dialer-pill">{callState.replace(/_/g, " ")}</div>
          </div>

          <label>From number</label>
          <select
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            disabled={!fromNumbers.length}
          >
            {!fromNumbers.length && <option value="">No numbers available</option>}
            {fromNumbers.map((n) => (
              <option key={n.id} value={n.number}>
                {n.number} {n.is_primary ? "• Primary" : ""}
              </option>
            ))}
          </select>

          <label>To number</label>
          <input
            type="tel"
            value={dialInput}
            onChange={(e) => setDialInput(sanitizeDialValue(e.target.value))}
            placeholder="+15551234567"
          />

          <div className="dialpad">
            {KEYPAD_KEYS.map((key) => (
              <button key={key} type="button" className="dialpad__key" onClick={() => dialpadKey(key)}>
                {key}
              </button>
            ))}
            <button
              type="button"
              className="dialpad__key ghost"
              onClick={() => setDialInput((prev) => (prev ? prev.slice(0, -1) : ""))}
            >
              ⌫
            </button>
            <button type="button" className="dialpad__key ghost" onClick={() => setDialInput("")}>
              Clear
            </button>
          </div>

          <div className="dialer-actions">
            <button className="webphone-btn primary" type="button" onClick={handleManualDial} disabled={manualCalling}>
              {manualCalling ? "Dialing…" : "Call"}
            </button>
          </div>
        </div>
      </div>

      {activeSession && (
        <div className="dialer-grid">
        <div className="dialer-card">
          <div className="dialer-card__header">
            <div>
              <h3>Queue</h3>
              <p className="muted tiny">
                  Session {getSessionId(activeSession)} • load contacts by selecting a dial list
              </p>
            </div>
            <div className="dialer-pill">{queuedNumbers.length} queued</div>
          </div>

            {renderQueue()}

            <label>From number (caller ID)</label>
            <select
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              disabled={!fromNumbers.length}
            >
              {!fromNumbers.length && <option value="">No numbers available</option>}
              {fromNumbers.map((n) => (
                <option key={n.id} value={n.number}>
                  {n.number} {n.is_primary ? "• Primary" : ""}
                </option>
              ))}
            </select>

            <label>Next number override (optional)</label>
            <input
              type="text"
              value={nextNumber}
              onChange={(e) => setNextNumber(e.target.value)}
              placeholder="Leave blank to use top of queue"
            />

            <div className="dialer-actions">
              <button
                className="webphone-btn primary"
                type="button"
                onClick={handleCallNext}
                disabled={calling}
              >
                {calling ? "Dialing…" : "Call next"}
              </button>
              <span className="muted tiny">
                POST /voice/webrtc/call
              </span>
            </div>

            <div className="dialer-upload">
              <div>
                <label>Add more numbers</label>
                <textarea
                  rows="2"
                  value={addNumbersText}
                  onChange={(e) => setAddNumbersText(e.target.value)}
                  placeholder="+14025550125"
                />
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleAddCsv(e.target.files?.[0])}
              />
              {addPreview.length > 0 && (
                <span className="dialer-pill ghost">{addPreview.length} parsed</span>
              )}
              <button
                className="webphone-btn ghost"
                type="button"
                onClick={handleAddNumbers}
                disabled={adding}
              >
                {adding ? "Adding…" : "Add numbers"}
              </button>
            </div>
          </div>

          <div className="dialer-card">
            <div className="dialer-card__header">
              <div>
                <h3>History</h3>
                <p className="muted tiny">GET /api/comms/calls/ (polling)</p>
              </div>
              {historyLoading && <div className="dialer-pill ghost">Refreshing…</div>}
            </div>

            {historyError && <div className="webphone-alert webphone-alert--error">{historyError}</div>}

            {history.length === 0 ? (
              <p className="muted">No calls yet for this session.</p>
            ) : (
              <div className="dialer-history">
                {history.map((call) => (
                  <div key={call.call_sid || call.id} className="dialer-history__row">
                    <div>
                      <div className="dialer-row__title">
                        {call.from_number || "Unknown"} → {call.to_number || "Unknown"}
                      </div>
                      <div className="muted tiny">
                        {call.direction?.toUpperCase() || "OUTBOUND"} • {call.status || "unknown"} •{" "}
                        {call.created_at ? new Date(call.created_at).toLocaleString() : "Unknown time"}
                      </div>
                    </div>
                    <div className="dialer-pill ghost">
                      {call.duration_seconds ? `${call.duration_seconds}s` : "pending"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
