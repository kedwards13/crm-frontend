import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import AnalyticsRevenue from "./pages/AnalyticsRevenue";
import AnalyticsTechnicianCapacity from "./pages/AnalyticsTechnicianCapacity";
import AnalyticsRouteLoad from "./pages/AnalyticsRouteLoad";
import AnalyticsMissedRecovery from "./pages/AnalyticsMissedRecovery";
import AnalyticsLeadConversion from "./pages/AnalyticsLeadConversion";
import AnalyticsClv from "./pages/AnalyticsClv";

export default function AnalyticsRouter() {
  return (
    <Routes>
      <Route index element={<AnalyticsDashboard />} />
      <Route path="revenue" element={<AnalyticsRevenue />} />
      <Route path="technicians" element={<AnalyticsTechnicianCapacity />} />
      <Route path="routes" element={<AnalyticsRouteLoad />} />
      <Route path="recovery" element={<AnalyticsMissedRecovery />} />
      <Route path="lead-conversion" element={<AnalyticsLeadConversion />} />
      <Route path="clv" element={<AnalyticsClv />} />

      {/* Back-compat aliases from older nav configs */}
      <Route path="conversion" element={<Navigate to="/analytics/lead-conversion" replace />} />
      <Route path="revenue/*" element={<Navigate to="/analytics/revenue" replace />} />
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Routes>
  );
}

