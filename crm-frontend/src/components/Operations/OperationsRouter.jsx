import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FleetRouter from "./Fleet/FleetRouter";
import InventoryRouter from "./Inventory/InventoryRouter"; // ⬅️ add
import TechniciansPage from "./Technicians/TechniciansPage";
import TrainingPage from "./Training/TrainingPage";
import CompliancePage from "./Compliance/CompliancePage";

export default function OperationsRouter() {
  return (
    <Routes>
      <Route path="technicians" element={<TechniciansPage />} />
      <Route path="fleet/*" element={<FleetRouter />} />
      <Route path="inventory/*" element={<InventoryRouter />} /> {/* ⬅️ add */}
      <Route path="training" element={<TrainingPage />} />
      <Route path="compliance" element={<CompliancePage />} />
      <Route index element={<Navigate to="technicians" replace />} />
    </Routes>
  );
}
