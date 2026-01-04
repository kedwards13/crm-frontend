import React from 'react';
import { Link } from 'react-router-dom';
import './SettingsCommon.css';

export default function SettingsHome() {
  const tiles = [
    { to: '/settings/company', title: 'Company Profile', desc: 'Name, domain, timezone, branding' },
    { to: '/settings/preferences', title: 'Preferences', desc: 'Industry presets, pipeline, defaults' },
    { to: '/settings/team', title: 'Team', desc: 'Users, roles, invitations' },
    { to: '/settings/scheduling', title: 'Scheduling', desc: 'Service types, hours, availability' },
    { to: '/settings/services', title: 'Services & Pricing', desc: 'Service catalog, tiers, pricing rules' },
    { to: '/settings/routing', title: 'Scheduling & Routing', desc: 'Dispatch rules, travel buffers' },
    { to: '/settings/inventory', title: 'Products & Inventory', desc: 'Reorder rules, approvals, alerts' },
    { to: '/settings/comms', title: 'Phone/SMS/Email', desc: 'Numbers, templates, delivery settings' },
    { to: '/settings/products', title: 'Product Catalog', desc: 'SKU list and service pricing sheet' },
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
