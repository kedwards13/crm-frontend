// src/components/Customers/CustomersPage.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CustomerList from './CustomerList';
import CustomerCare from './CustomerCare';
import CustomerInsights from './CustomerInsights';
import CustomerImport from './CustomerImport'; // if you have an import page
import CustomersDashboard from './CustomersDashboard'; // your main landing page for /customers
import CustomerDetailPage from './CustomerDetailPage';

const CustomersPage = () => {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  const customerSegment = segments[1] || '';
  const reservedRoutes = new Set(['', 'list', 'care', 'ai', 'import']);
  const isFieldRoutesDetail = customerSegment === 'fr' && Boolean(segments[2]);
  const isCustomerDetail =
    segments[0] === 'customers' &&
    !reservedRoutes.has(customerSegment) &&
    !isFieldRoutesDetail;

  if (isFieldRoutesDetail || isCustomerDetail) {
    return (
      <>
        <CustomerList />
        <CustomerDetailPage />
      </>
    );
  }

  return (
    <Routes>
      {/*
        1) If the user visits /customers with NO extra path,
           show your main "Customers" dashboard or “list” by default.
           <Route index> means "empty sub-path under /customers".
      */}
      <Route index element={<CustomersDashboard />} />

      {/* 2) Then define each sub-route under /customers/... */}
      <Route path="fr/:externalId" element={<CustomerDetailPage />} />
      <Route path=":customerId" element={<CustomerDetailPage />} />
      <Route path="list" element={<CustomerList />} />
      <Route path="care" element={<CustomerCare />} />
      <Route path="ai" element={<CustomerInsights />} />
      <Route path="import" element={<CustomerImport />} />

      {/* 3) Optionally handle unknown sub-paths within /customers */}
      <Route path="*" element={<Navigate to="list" replace />} />
    </Routes>
  );
};

export default CustomersPage;
