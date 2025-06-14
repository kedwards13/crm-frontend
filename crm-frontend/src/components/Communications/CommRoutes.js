// src/routes/communicationRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PhoneDialer from '../components/Communication/PhoneDialer';
import Messages from '../components/Communication/Messages';
import Emails from '../components/Communication/Emails';
import CommunicationsDashboard from '../components/Communication/CommunicationsDashboard';

const CommunicationRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CommunicationsDashboard />}>
        <Route path="dialer" element={<PhoneDialer />} />
        <Route path="messages" element={<Messages />} />
        <Route path="emails" element={<Emails />} />
        <Route path="" element={<div>Select an option from the Communications menu.</div>} />
      </Route>
    </Routes>
  );
};

export default CommunicationRoutes;