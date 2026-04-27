import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import D2DSaleForm from './D2DSaleForm';
import SyncStatusPage from './SyncStatusPage';

export default function SalesRouter() {
  return (
    <Routes>
      <Route path="d2d" element={<D2DSaleForm />} />
      <Route path="sync" element={<SyncStatusPage />} />
      <Route path="*" element={<Navigate to="d2d" replace />} />
    </Routes>
  );
}
