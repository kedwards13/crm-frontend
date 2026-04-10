import React, { useEffect, useState } from 'react';
import {
  createCampaign,
  getCampaignAnalytics,
  listCampaigns,
  runCampaign,
} from '../../api/campaignsApi';
import { listTemplates } from '../../api/templatesApi';
import useAiCapabilities from '../../hooks/useAiCapabilities';
import './Campaigns.css';

const emptyForm = {
  name: '',
  description: '',
  channel: 'sms',
  template_id: '',
  target_list: '',
  message: '',
  city: '',
  state: '',
  has_pets: false,
  use_ai_generation: false,
};

export default function Campaigns() {
  const aiCapabilities = useAiCapabilities();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      const [campaignRes, templateRes] = await Promise.all([
        listCampaigns(),
        listTemplates(),
      ]);
      const campaignRows = Array.isArray(campaignRes.data)
        ? campaignRes.data
        : campaignRes.data?.results || [];
      const templateRows = Array.isArray(templateRes.data)
        ? templateRes.data
        : templateRes.data?.results || [];
      setCampaigns(campaignRows);
      setTemplates(templateRows);
    } catch (err) {
      setMsg(err?.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async () => {
    setMsg('');
    if (!form.name.trim()) {
      setMsg('Campaign name is required.');
      return;
    }
    if (!form.template_id && !form.message.trim()) {
      setMsg('Add a template or draft a message before creating the campaign.');
      return;
    }
    const audience_filter = {};
    if (form.target_list) audience_filter.target_list = form.target_list;
    if (form.city) audience_filter.city = form.city;
    if (form.state) audience_filter.state = form.state;
    if (form.has_pets) audience_filter.has_pets = true;

    try {
      const payload = {
        name: form.name,
        description: form.description,
        channel: form.channel,
        template_id: form.template_id || undefined,
        audience_filter,
        ...(form.message.trim()
          ? form.use_ai_generation && aiCapabilities.campaignEnabled
            ? { smart_message: form.message.trim() }
            : { message: form.message.trim() }
          : {}),
      };
      const { data } = await createCampaign(payload);
      setCampaigns((prev) => [data, ...prev]);
      setForm(emptyForm);
      setMsg('Campaign created.');
    } catch {
      setMsg('Failed to create campaign.');
    }
  };

  const handleRun = async (campaignId) => {
    setMsg('');
    try {
      await runCampaign(campaignId);
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, status: 'running' } : c
        )
      );
      setMsg('Campaign started.');
    } catch {
      setMsg('Failed to run campaign.');
    }
  };

  const loadAnalytics = async (campaignId) => {
    setMsg('');
    try {
      const { data } = await getCampaignAnalytics(campaignId);
      setAnalytics(data);
    } catch {
      setMsg('Failed to load analytics.');
    }
  };

  if (loading) {
    return (
      <div className="campaigns-page">
        <p>Loading campaigns…</p>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <div className="campaigns-header">
        <div>
          <h2>Campaigns</h2>
          <p>Launch bulk outreach with deterministic send controls and optional AI-assisted drafting.</p>
        </div>
        <button className="campaigns-refresh" onClick={loadAll}>
          Refresh
        </button>
      </div>

      {msg && <div className="campaigns-msg">{msg}</div>}

      <div className="campaigns-grid">
        <div className="campaigns-card">
          <h3>Create Campaign</h3>
          <div className="campaigns-note">
            <strong>System Data</strong>
            <span>Campaign creation and execution stay on the CRM backend. AI remains draft-only and approval-gated.</span>
          </div>
          {!aiCapabilities.loading && !aiCapabilities.campaignEnabled ? (
            <div className="campaigns-note is-muted">
              <strong>AI Insight</strong>
              <span>{aiCapabilities.error || aiCapabilities.disabledReason}</span>
            </div>
          ) : null}
          <div className="campaigns-form">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              Channel
              <select
                value={form.channel}
                onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value }))}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label>
              Template
              <select
                value={form.template_id}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextTemplateId = e.target.value;
                    const selectedTemplate = templates.find((tpl) => String(tpl.id) === String(nextTemplateId));
                    return {
                      ...prev,
                      template_id: nextTemplateId,
                      message: prev.message || String(selectedTemplate?.body || ''),
                    };
                  })
                }
              >
                <option value="">No template</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name || tpl.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Audience segment
              <select
                value={form.target_list}
                onChange={(e) => setForm((prev) => ({ ...prev, target_list: e.target.value }))}
              >
                <option value="">Manual / filter-based audience</option>
                <option value="customers_with_recurring_issues">Recurring issues</option>
                <option value="customers_with_open_quotes">Open quotes over 7 days</option>
                <option value="customers_with_failed_treatments">Failed treatments</option>
                <option value="customers_with_unpaid_invoices">Unpaid invoices</option>
              </select>
            </label>
            <label>
              Message editor
              <textarea
                rows="4"
                value={form.message}
                placeholder="Draft the approved base message here. AI remains optional and review-only."
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
            </label>
            <label className="campaigns-toggle">
              <input
                type="checkbox"
                checked={form.use_ai_generation}
                disabled={aiCapabilities.loading || !aiCapabilities.campaignEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, use_ai_generation: e.target.checked }))}
              />
              <span>
                AI-assisted draft mode
                <small>
                  {aiCapabilities.campaignEnabled
                    ? 'Uses the CRM-safe AI drafting path only. Sending still stays approval-gated.'
                    : 'Disabled for this tenant. Campaigns still work with system templates and manual drafts.'}
                </small>
              </span>
            </label>
            <div className="campaigns-filters">
              <label>
                City
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </label>
              <label>
                State
                <input
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={form.has_pets}
                  onChange={(e) => setForm((prev) => ({ ...prev, has_pets: e.target.checked }))}
                />
                <span>Has pets</span>
              </label>
            </div>
            <button className="campaigns-primary" onClick={handleCreate}>
              Create Campaign
            </button>
          </div>
        </div>

        <div className="campaigns-card">
          <h3>Active Campaigns</h3>
          {campaigns.length === 0 ? (
            <p className="muted">No campaigns yet.</p>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="campaigns-item">
                <div className="campaigns-item-head">
                  <div>
                    <strong>{campaign.name}</strong>
                    <div className="muted">{campaign.channel?.toUpperCase()}</div>
                  </div>
                  <span className={`campaigns-status ${campaign.status || 'draft'}`}>
                    {campaign.status || 'draft'}
                  </span>
                </div>
                <div className="campaigns-metrics">
                  <span>Total: {campaign.total_targets ?? 0}</span>
                  <span>Sent: {campaign.sent ?? 0}</span>
                  <span>Failed: {campaign.failed ?? 0}</span>
                </div>
                <div className="campaigns-actions">
                  <button onClick={() => handleRun(campaign.id)}>Run</button>
                  <button onClick={() => loadAnalytics(campaign.id)}>Analytics</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="campaigns-card">
          <h3>Analytics</h3>
          {analytics ? (
            <div className="campaigns-analytics">
              <div><span>Status</span><strong>{analytics.status}</strong></div>
              <div><span>Total</span><strong>{analytics.total}</strong></div>
              <div><span>Sent</span><strong>{analytics.sent}</strong></div>
              <div><span>Failed</span><strong>{analytics.failed}</strong></div>
              <div><span>Opened</span><strong>{analytics.opened}</strong></div>
              <div><span>Clicked</span><strong>{analytics.clicked}</strong></div>
              <div><span>Replied</span><strong>{analytics.replied}</strong></div>
            </div>
          ) : (
            <p className="muted">Select a campaign to view analytics.</p>
          )}
        </div>
      </div>
    </div>
  );
}
