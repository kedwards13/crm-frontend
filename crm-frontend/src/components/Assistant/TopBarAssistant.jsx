import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useLocation } from "react-router-dom";
import { FiLoader, FiMessageSquare, FiRefreshCw, FiSend, FiShield, FiX, FiZap } from "react-icons/fi";

import { orchestrateAssistant } from "../../api/assistantApi";
import { getActiveTenant, getUserRole } from "../../helpers/tenantHelpers";
import { formatAssistantMode, getAssistantPageContext } from "./assistantContext";

import "./TopBarAssistant.css";

const toConversation = (messages = []) =>
  messages
    .filter((message) => ["assistant", "user"].includes(message.role))
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.text,
    }));

const buildAssistantMessage = (payload = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role: "assistant",
  text: payload.answer || "No assistant response returned.",
  mode: payload.mode || "chat",
  citations: Array.isArray(payload.citations) ? payload.citations : [],
  actions: Array.isArray(payload.actions) ? payload.actions : [],
  toolsUsed: Array.isArray(payload.tools_used) ? payload.tools_used : [],
  confidence: Number(payload.confidence || 0),
  requiresConfirmation: Boolean(payload.requires_confirmation),
});

const localIndustryLabel = (tenant = {}) =>
  String(tenant?.industry || "general")
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export default function TopBarAssistant({ open, onClose }) {
  const location = useLocation();
  const pageContext = useMemo(
    () => getAssistantPageContext(location),
    [location]
  );
  const pageKey = `${pageContext.path}:${pageContext.entity_type}:${pageContext.entity_id}`;
  const messagesEndRef = useRef(null);
  const bootKeyRef = useRef("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assistantContext, setAssistantContext] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);

  const tenant = getActiveTenant() || {};
  const tenantName = tenant?.name || "";
  const tenantIndustry = tenant?.industry || "";
  const contextChips = useMemo(
    () => [
      assistantContext?.tenant_name || tenantName || "Workspace",
      assistantContext?.role || getUserRole("Member"),
      assistantContext?.industry_label || localIndustryLabel({ industry: tenantIndustry }),
      assistantContext?.page_label || pageContext.title,
    ],
    [assistantContext, pageContext.title, tenantIndustry, tenantName]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const syncResponseContext = (payload = {}) => {
    setAssistantContext(payload.assistant_context || null);
    setAvailableTools(Array.isArray(payload.available_tools) ? payload.available_tools : []);
    setSuggestedPrompts(Array.isArray(payload.suggested_prompts) ? payload.suggested_prompts : []);
  };

  const runAssistant = async ({
    message = "",
    toolKey = "",
    action = null,
    echoUserMessage = "",
    reset = false,
  } = {}) => {
    const userMessage = echoUserMessage
      ? {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: "user",
          text: echoUserMessage,
        }
      : null;
    const draftMessages = reset ? [] : messages;
    const nextMessages = userMessage ? [...draftMessages, userMessage] : draftMessages;
    if (reset) {
      setMessages(userMessage ? [userMessage] : []);
    } else if (userMessage) {
      setMessages(nextMessages);
    }

    setLoading(true);
    setError("");
    try {
      const payload = await orchestrateAssistant({
        mode: action ? "action" : "query",
        message,
        tool_key: toolKey,
        action: action || undefined,
        page_context: pageContext,
        conversation: toConversation(nextMessages),
      });
      syncResponseContext(payload);
      const assistantMessage = buildAssistantMessage(payload);
      setMessages((current) => [...(reset ? (userMessage ? [userMessage] : []) : current), assistantMessage]);
      setInput("");
    } catch (requestError) {
      const messageText =
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Assistant request failed.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (bootKeyRef.current === pageKey && messages.length > 0) return;
    bootKeyRef.current = pageKey;
    runAssistant({ reset: true });
  }, [open, pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const root = document.getElementById("modal-root") || document.body;

  return ReactDOM.createPortal(
    <div className="assistant-overlay-root">
      <button
        type="button"
        className="assistant-overlay-backdrop"
        onClick={onClose}
        aria-label="Close assistant"
      />

      <section className="assistant-overlay-panel" role="dialog" aria-modal="true" aria-label="Abon assistant">
        <header className="assistant-overlay-header">
          <div className="assistant-overlay-title">
            <span className="assistant-orb">
              <FiZap size={16} />
            </span>
            <div>
              <strong>Abon Assistant</strong>
              <span>Tenant-aware command layer</span>
            </div>
          </div>
          <div className="assistant-overlay-controls">
            <button
              type="button"
              className="assistant-header-btn"
              onClick={() => runAssistant({ reset: true })}
              aria-label="Refresh assistant context"
            >
              <FiRefreshCw size={15} />
            </button>
            <button
              type="button"
              className="assistant-header-btn"
              onClick={onClose}
              aria-label="Close assistant"
            >
              <FiX size={16} />
            </button>
          </div>
        </header>

        <div className="assistant-context-chips">
          {contextChips.filter(Boolean).map((chip) => (
            <span key={chip} className="assistant-context-chip">
              {chip}
            </span>
          ))}
        </div>

        <div className="assistant-tools-row">
          {availableTools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              className={`assistant-tool-chip assistant-tool-chip--${tool.kind}`}
              onClick={() =>
                runAssistant({
                  toolKey: tool.key,
                  message: input.trim(),
                  echoUserMessage: input.trim() || tool.label,
                })
              }
              disabled={loading}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="assistant-message-list">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`assistant-message assistant-message--${message.role}`}
            >
              <div className="assistant-message-meta">
                <span className="assistant-message-author">
                  {message.role === "assistant" ? (
                    <>
                      <FiMessageSquare size={13} />
                      Assistant
                    </>
                  ) : (
                    "You"
                  )}
                </span>
                {message.role === "assistant" ? (
                  <span className="assistant-message-mode">{formatAssistantMode(message.mode)}</span>
                ) : null}
              </div>

              <p>{message.text}</p>

              {message.role === "assistant" && message.citations.length > 0 ? (
                <div className="assistant-sources">
                  <div className="assistant-section-label">Sources</div>
                  {message.citations.map((citation, index) => (
                    <div key={`${message.id}-citation-${index}`} className="assistant-source-card">
                      <strong>{citation.title}</strong>
                      <span>{citation.snippet}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {message.role === "assistant" && message.actions.length > 0 ? (
                <div className="assistant-actions">
                  <div className="assistant-section-label">Actions</div>
                  {message.actions.map((action, index) => (
                    <div key={`${message.id}-action-${index}`} className="assistant-action-card">
                      <div className="assistant-action-copy">
                        <strong>{action.label}</strong>
                        <span>{action.summary || action.error || action.action_type}</span>
                      </div>
                      <div className="assistant-action-controls">
                        <span
                          className={`assistant-action-state assistant-action-state--${action.status || "proposed"}`}
                        >
                          {action.status || "proposed"}
                        </span>
                        {action.status === "proposed" ? (
                          <button
                            type="button"
                            className="assistant-confirm-btn"
                            onClick={() =>
                              runAssistant({
                                action: {
                                  ...action,
                                  confirmed: true,
                                },
                                echoUserMessage: `Confirm ${action.label}`,
                              })
                            }
                            disabled={loading}
                          >
                            <FiShield size={14} />
                            Confirm
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {message.role === "assistant" && message.toolsUsed.length > 0 ? (
                <div className="assistant-tools-used">
                  {message.toolsUsed.map((toolName) => (
                    <span key={`${message.id}-${toolName}`} className="assistant-tools-used-chip">
                      {toolName}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {loading ? (
            <div className="assistant-loading-row">
              <FiLoader className="assistant-loading-icon" size={16} />
              <span>Thinking with tenant context…</span>
            </div>
          ) : null}

          {error ? <div className="assistant-error-row">{error}</div> : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="assistant-suggestion-row">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="assistant-suggestion-chip"
              onClick={() =>
                runAssistant({
                  message: prompt,
                  echoUserMessage: prompt,
                })
              }
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <footer className="assistant-input-wrap">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!loading && input.trim()) {
                  runAssistant({
                    message: input.trim(),
                    echoUserMessage: input.trim(),
                  });
                }
              }
            }}
            placeholder="Ask about this tenant, retrieve docs, or stage an action…"
            rows={2}
          />
          <button
            type="button"
            className="assistant-send-btn"
            onClick={() =>
              runAssistant({
                message: input.trim(),
                echoUserMessage: input.trim(),
              })
            }
            disabled={loading || !input.trim()}
          >
            <FiSend size={15} />
          </button>
        </footer>
      </section>
    </div>,
    root
  );
}
