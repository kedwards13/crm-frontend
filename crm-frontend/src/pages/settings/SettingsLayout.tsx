// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Bot, MessageSquareText, PhoneCall } from 'lucide-react';
import { toast } from 'react-toastify';
import useTenantSettings from '../../hooks/useTenantSettings.ts';
import NotificationSettings from './components/NotificationSettings.tsx';
import AISettings from './components/AISettings.tsx';
import VoiceSettings from './components/VoiceSettings.tsx';
import SMSTemplateSettings from './components/SMSTemplateSettings.tsx';
import './SettingsLayout.css';

const TABS = [
  {
    key: 'notifications',
    label: 'Notifications',
    subtitle: 'Email + digest alerts',
    icon: BellRing,
  },
  {
    key: 'ai_automations',
    label: 'AI & Automation',
    subtitle: 'Persona + auto-response controls',
    icon: Bot,
  },
  {
    key: 'voice',
    label: 'Voice & Routing',
    subtitle: 'Route mode + call handling',
    icon: PhoneCall,
  },
  {
    key: 'sms_templates',
    label: 'SMS Templates',
    subtitle: 'Reusable message content',
    icon: MessageSquareText,
  },
];

function LoadingSkeleton() {
  return (
    <div className="tenant-settings-skeleton" aria-hidden="true">
      <div className="tenant-settings-skeleton-line w-40" />
      <div className="tenant-settings-skeleton-line w-60" />
      <div className="tenant-settings-skeleton-card" />
      <div className="tenant-settings-skeleton-card" />
    </div>
  );
}

export default function SettingsLayout() {
  const [activeTab, setActiveTab] = useState('notifications');

  const {
    settings,
    updateSection,
    saveSettings,
    resetDraft,
    reloadSettings,
    isDirty,
    isLoading,
    isSaving,
    loadError,
    saveWarning,
    backendCoverageNotes,
  } = useTenantSettings();

  useEffect(() => {
    if (saveWarning) {
      toast.warn(saveWarning, {
        autoClose: 4000,
      });
    }
  }, [saveWarning]);

  const activeTabMeta = useMemo(
    () => TABS.find((tab) => tab.key === activeTab) || TABS[0],
    [activeTab]
  );

  const renderTab = () => {
    if (activeTab === 'notifications') {
      return (
        <NotificationSettings
          value={settings.notifications}
          onChange={(patch) => updateSection('notifications', patch)}
        />
      );
    }

    if (activeTab === 'ai_automations') {
      return (
        <AISettings
          value={settings.ai_automations}
          onChange={(patch) => updateSection('ai_automations', patch)}
        />
      );
    }

    if (activeTab === 'voice') {
      return (
        <VoiceSettings
          value={settings.voice}
          onChange={(patch) => updateSection('voice', patch)}
        />
      );
    }

    return (
      <SMSTemplateSettings
        value={settings.sms_templates}
        onChange={(patch) => updateSection('sms_templates', patch)}
      />
    );
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      toast.success('Settings saved successfully.');
    } catch (error) {
      toast.error(error?.message || 'Unable to save settings.');
    }
  };

  const handleRetry = async () => {
    await reloadSettings();
  };

  return (
    <div className="tenant-settings-page">
      <div className="tenant-settings-shell">
        <header className="tenant-settings-header">
          <div>
            <p className="tenant-settings-overline">Tenant Configuration</p>
            <h1>System Settings Dashboard</h1>
            <p>
              Configure notifications, AI automation, voice routing, and reusable SMS templates
              for your active tenant.
            </p>
          </div>
        </header>

        <div className="tenant-settings-grid">
          <aside className="tenant-settings-sidebar" aria-label="Settings sections">
            <nav>
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const selected = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`tenant-settings-nav-btn ${selected ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <TabIcon size={18} aria-hidden="true" />
                    <span>
                      <strong>{tab.label}</strong>
                      <small>{tab.subtitle}</small>
                    </span>
                  </button>
                );
              })}
            </nav>

            <section className="tenant-settings-coverage-card">
              <h4>Backend Coverage Notes</h4>
              <ul>
                {backendCoverageNotes.map((note) => (
                  <li key={note.field}>
                    <span className={`tenant-note-pill ${note.level}`}>{note.level}</span>
                    <p>
                      <strong>{note.field}:</strong> {note.message}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <main className="tenant-settings-main" aria-live="polite">
            <div className="tenant-settings-main-head">
              <div>
                <h2>{activeTabMeta.label}</h2>
                <p>{activeTabMeta.subtitle}</p>
              </div>
              <button
                type="button"
                className="tenant-btn tenant-btn-secondary"
                onClick={handleRetry}
                disabled={isLoading || isSaving}
              >
                Refresh
              </button>
            </div>

            {loadError ? (
              <div className="tenant-settings-alert" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <p>{loadError}</p>
              </div>
            ) : null}

            {isLoading ? <LoadingSkeleton /> : renderTab()}
          </main>
        </div>
      </div>

      {isDirty ? (
        <div className="tenant-save-bar" role="region" aria-label="Unsaved changes">
          <div>
            <strong>Unsaved changes</strong>
            <p>Review your updates and save them to apply across this tenant.</p>
          </div>

          <div className="tenant-save-bar-actions">
            <button
              type="button"
              className="tenant-btn tenant-btn-secondary"
              onClick={resetDraft}
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              type="button"
              className="tenant-btn tenant-btn-primary"
              onClick={handleSave}
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
