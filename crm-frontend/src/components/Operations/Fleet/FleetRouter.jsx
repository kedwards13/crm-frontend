import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import VehiclesPage from "./VehiclesPage";
import VehicleDetailPage from "./VehicleDetailPage";
import VehicleForm from "./VehicleForm";
import FleetDashboard from "./FleetDashboard";
import FleetReports from "./FleetReports";
import OpsSubnav from "../OpsSubnav";              // ⬅️ use shared nav
import "../OpsNav.css";                            // ⬅️ import once here (or inside OpsSubnav.jsx)

import "./FleetReports.css";                       // your page styling (tables/forms/etc)

export default function FleetRouter() {
  return (
    <div className="fleet-wrap">
      <OpsSubnav
        section="fleet"
        tabs={[
          { key: "vehicles", label: "Vehicles", to: "" },
          { key: "overview", label: "Overview", to: "overview" },
          { key: "reports",  label: "Reports",  to: "reports" },
        ]}
      />

      <Routes>
        <Route index element={<VehiclesPage />} />
        <Route path="new" element={<VehicleForm />} />
        <Route path=":id" element={<VehicleDetailPage />} />
        <Route path=":id/edit" element={<VehicleForm />} />
        <Route path="overview" element={<FleetDashboard />} />
        <Route path="reports" element={<FleetReports />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}