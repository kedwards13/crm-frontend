// src/routes/communicationRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CallsPage from './Calls/CallsPage';
import DialerPage from './Dialer/DialerPage';

const CommunicationRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CallsPage />} />
      <Route path="calls" element={<CallsPage />} />
      <Route path="dialer" element={<DialerPage />} />
      <Route path="*" element={<CallsPage />} />
    </Routes>
  );
};

export default CommunicationRoutes;
