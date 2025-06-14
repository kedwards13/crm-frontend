import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GeneralSettings from './GeneralSettings.js';
import TeamManagement from './TeamManagement.js';

const Settings = () => {
  return (
    <Routes>
      <Route path="/" element={<GeneralSettings />} />
      <Route path="/team" element={<TeamManagement />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default Settings;