import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FleetRouter from "./Fleet/FleetRouter";
import InventoryRouter from "./Inventory/InventoryRouter"; // ⬅️ add

export default function OperationsRouter() {
  return (
    <Routes>
      <Route path="fleet/*" element={<FleetRouter />} />
      <Route path="inventory/*" element={<InventoryRouter />} /> {/* ⬅️ add */}
      <Route index element={<Navigate to="fleet" replace />} />
    </Routes>
  );
}