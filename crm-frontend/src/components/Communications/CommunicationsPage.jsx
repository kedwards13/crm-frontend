// src/components/Communication/CommunicationsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSubNavForPage, getIndustryKey } from "../../constants/uiRegistry";
import TopBar from "../../components/Layout/TopBar";
import InboxPage from "./Inbox/InboxPage";
import SMSPage from "./SMS/SMSPage";
import CallsPage from "./Calls/CallsPage";
import EmailPage from "./Email/EmailPage";
import TemplatesPage from "./Templates/TemplatesPage";
import SequencesPage from "./Sequences/SequencesPage"; // start with inbox
import { AuthContext } from "../../App";

export default function CommunicationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);

  const industry = getIndustryKey();
  const tabs = getSubNavForPage("/communication", industry);

  const [activeTab, setActiveTab] = useState(() => {
    const match = tabs.find(t => location.pathname.includes(t.path));
    return match?.key || "inbox";
  });

  useEffect(() => {
    if (!isAuthenticated) return navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const match = tabs.find(t => location.pathname.includes(t.path));
    if (match) setActiveTab(match.key);
  }, [location.pathname, tabs]);

  const onTabChange = (key) => {
    const tab = tabs.find(t => t.key === key);
    if (tab) {
      setActiveTab(key);
      navigate(tab.path);
    }
  };

  return (
    <div className="communications-page">
      <TopBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        inboxCount={0} // ⬅️ Replace with real unread count
      />

      {/* ⬇️ Conditional rendering for now — later move into router */}
      {activeTab === "inbox" && <InboxPage />}
      {activeTab === "sms" && <SMSPage />}
      {activeTab === "calls" && <CallsPage />}
      {activeTab === "email" && <EmailPage />}
      {activeTab === "templates" && <TemplatesPage />}
      {activeTab === "sequences" && <SequencesPage />}
      {/* Add other tabs here later (SMSPage, CallsPage, etc) */}
    </div>
  );
}