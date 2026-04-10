import React from "react";
import WidgetPanel from "../../ui/WidgetPanel";
import "./AnalyticsShared.css";

export default function AnalyticsClv() {
  return (
    <div className="analytics-page-shell">
      <header className="analytics-page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Customer Lifetime Value</h1>
          <span>
            CLV depends on invoice/ticket revenue records. During FieldRoutes historical import, this may be empty.
          </span>
        </div>
      </header>

      <WidgetPanel title="CLV" subtitle="Not enough data yet">
        <div className="analytics-empty">
          Once `RevenueRecord` (FieldRoutes tickets/invoices) and service plan history are fully imported, this view will
          compute CLV by customer and cohort. For now, use Revenue + Payments surfaces for operational reporting.
        </div>
      </WidgetPanel>
    </div>
  );
}

