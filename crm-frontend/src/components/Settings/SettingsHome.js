import React from 'react';
import { Link } from 'react-router-dom';
import './SettingsCommon.css';

export default function SettingsHome() {
  const tiles = [
    { to: '/settings/company', title: 'Company Profile', desc: 'Name, domain, timezone, branding' },
    { to: '/settings/preferences', title: 'Preferences', desc: 'Industry presets, pipeline, defaults' },
    { to: '/settings/team', title: 'Team', desc: 'Users, roles, invitations' },
    { to: '/settings/phones', title: 'Phones', desc: 'Numbers, voicemail, routing' },
    { to: '/settings/products', title: 'Products & Services', desc: 'Catalog, pricing, plans' },
    { to: '/settings/automations', title: 'Automations', desc: 'Triggers, sequences, rules' },
    { to: '/settings/billing', title: 'Billing', desc: 'Plan, invoices, payment methods' },
  ];
  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>
      <div className="settings-grid">
        {tiles.map(t => (
          <Link key={t.to} to={t.to} className="settings-tile">
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}