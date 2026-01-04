import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SettingsHome from './SettingsHome';
import CompanyProfile from './company/CompanyProfile';
import Preferences from './preferences/Preferences';
import TeamManagement from './TeamManagement';
import PhoneSettings from './phones/PhoneSettings';
import ProductCatalog from './products/ProductCatalog';
import Automations from './automations/Automations';
import Billing from './billing/Billing';
import SchedulingSettings from './scheduling/SchedulingSettings';
import ServicesPricing from './services/ServicesPricing';
import RoutingSettings from './routing/RoutingSettings';
import InventorySettings from './inventory/InventorySettings';
import CommsSettings from './comms/CommsSettings';

const Settings = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsHome />} />
      <Route path="/team" element={<TeamManagement />} />
      <Route path="/company" element={<CompanyProfile />} />
      <Route path="/preferences" element={<Preferences />} />
      <Route path="/phones" element={<PhoneSettings />} />
      <Route path="/comms" element={<CommsSettings />} />
      <Route path="/scheduling" element={<SchedulingSettings />} />
      <Route path="/routing" element={<RoutingSettings />} />
      <Route path="/products" element={<ProductCatalog />} />
      <Route path="/services" element={<ServicesPricing />} />
      <Route path="/inventory" element={<InventorySettings />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Settings;
