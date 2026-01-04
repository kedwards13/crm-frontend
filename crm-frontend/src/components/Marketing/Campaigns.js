import React, { useEffect, useState } from 'react';
import {
  createCampaign,
  getCampaignAnalytics,
  listCampaigns,
  runCampaign,
} from '../../api/campaignsApi';
import { listTemplates } from '../../api/templatesApi';
import './Campaigns.css';

const emptyForm = {
  name: '',
  description: '',
  channel: 'sms',
  template_id: '',
  city: '',
  state: '',
  has_pets: false,
};

export default function Campaigns() {
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
    const audience_filter = {};
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
          <p>Launch bulk outreach and monitor results.</p>
        </div>
        <button className="campaigns-refresh" onClick={loadAll}>
          Refresh
        </button>
      </div>

      {msg && <div className="campaigns-msg">{msg}</div>}

      <div className="campaigns-grid">
        <div className="campaigns-card">
          <h3>Create Campaign</h3>
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
                onChange={(e) => setForm((prev) => ({ ...prev, template_id: e.target.value }))}
              >
                <option value="">No template</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name || tpl.id}
                  </option>
                ))}
              </select>
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
