import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import OpsSubnav from "../OpsSubnav";
import OverviewPage from "./OverviewPage";
import ProductsPage from "./ProductsPage";
import ProductForm from "./ProductForm";
import StockPage from "./StockPage";
import OrdersPage from "./OrdersPage";
import VendorsPage from "./VendorsPage";
import CompliancePage from "./CompliancePage";
import "../OpsNav.css";
import "./Inventory.css";

export default function InventoryRouter(){
  return (
    <div className="inventory-wrap">
      <OpsSubnav
        section="inventory"
        tabs={[
          { key: "overview", label: "Overview", to: "" },
          { key: "products", label: "Products", to: "products" },
          { key: "stock",    label: "Stock",    to: "stock" },
          { key: "orders",   label: "Orders",   to: "orders" },
          { key: "vendors",  label: "Vendors",  to: "vendors" },
          { key: "compliance", label: "Compliance", to: "compliance" },
        ]}
      />
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}