import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import InvoicesPage from "./InvoicesPage";
import PaymentsPage from "./PaymentsPage";
import SubscriptionsPage from "./SubscriptionsPage";
import PricingPage from "./PricingPage";
import BillingPage from "./BillingPage";
import "./FinancePage.css";

const FinancePage = () => {
  return (
    <div className="finance-shell">
      <Routes>
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="*" element={<Navigate to="invoices" replace />} />
      </Routes>
    </div>
  );
};

export default FinancePage;
