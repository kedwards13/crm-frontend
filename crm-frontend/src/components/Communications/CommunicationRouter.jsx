// src/components/Communication/CommunicationRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CommsSubnav from "./CommsSubnav"; // ⬅️ Top tab bar
import InboxPage from "./Inbox/InboxPage";
import SMSPage from "./SMS/SMSPage";
import CallsPage from "./Calls/CallsPage";
import EmailPage from "./Email/EmailPage";
import TemplatesPage from "./Templates/TemplatesPage";
import SequencesPage from "./Sequences/SequencesPage";
import "./Comms.css"; // Shared comm styling

export default function CommunicationRouter() {
  return (
    <div className="comm-wrap">
      <CommsSubnav
        section="communication"
        tabs={[
          { key: "inbox", label: "Inbox", to: "inbox" },
          { key: "sms", label: "SMS", to: "sms" },
          { key: "calls", label: "Calls", to: "calls" },
          { key: "email", label: "Email", to: "email" },
          { key: "templates", label: "Templates", to: "templates" },
          { key: "sequences", label: "Sequences", to: "sequences" },
        ]}
      />

      <Routes>
        <Route path="inbox" element={<InboxPage />} />
        <Route path="sms" element={<SMSPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="email" element={<EmailPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="sequences" element={<SequencesPage />} />
        <Route path="*" element={<Navigate to="inbox" replace />} />
      </Routes>
    </div>
  );
}