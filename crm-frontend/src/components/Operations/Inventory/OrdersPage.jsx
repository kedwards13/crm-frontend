import React from "react";
import "./Inventory.css";

const ORDERS = [
  {
    id: "PO-1042",
    vendor: "Bayer Pest Supply",
    status: "Approved",
    eta: "Dec 28, 2025",
    total: "$4,240",
    items: 12,
    owner: "K. Edwards",
  },
  {
    id: "PO-1038",
    vendor: "Syngenta Pro",
    status: "Receiving",
    eta: "Dec 23, 2025",
    total: "$2,110",
    items: 6,
    owner: "M. Carter",
  },
  {
    id: "PO-1034",
    vendor: "Univar Solutions",
    status: "Draft",
    eta: "—",
    total: "$980",
    items: 4,
    owner: "Dispatch",
  },
];

const RECEIVING = [
  { id: "RCV-882", po: "PO-1038", dock: "North Bay", status: "QC Hold", notes: "Missing 2 units" },
  { id: "RCV-879", po: "PO-1031", dock: "Main Dock", status: "Complete", notes: "All items verified" },
];

export default function OrdersPage() {
  return (
    <div className="inventory-page">
      <header className="inventory-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">Purchase orders, vendor shipments, and receiving workflow.</p>
        </div>
        <div className="filters">
          <input placeholder="Search PO or vendor…" />
          <select defaultValue="all">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="receiving">Receiving</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn mini">+ New PO</button>
          <button className="btn mini secondary">Create Receiving</button>
        </div>
      </header>

      <section className="inventory-grid">
        <div className="inventory-stat">
          <div className="label">Open POs</div>
          <div className="value">18</div>
        </div>
        <div className="inventory-stat">
          <div className="label">In Transit</div>
          <div className="value">7</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Receiving Today</div>
          <div className="value">3</div>
        </div>
        <div className="inventory-stat">
          <div className="label">Backordered</div>
          <div className="value">2</div>
        </div>
      </section>

      <section className="inventory-card">
        <div
          className="inventory-table"
          style={{ "--inventory-columns": "1.1fr 1.4fr 0.8fr 1fr 0.7fr 0.7fr 0.9fr 0.8fr" }}
        >
          <div className="inventory-thead">
            <div>PO</div>
            <div>Vendor</div>
            <div>Status</div>
            <div>ETA</div>
            <div>Total</div>
            <div>Items</div>
            <div>Owner</div>
            <div></div>
          </div>
          {ORDERS.map((order) => (
            <div key={order.id} className="inventory-row">
              <div className="mono">{order.id}</div>
              <div>{order.vendor}</div>
              <div>
                <span
                  className={`inventory-pill ${
                    order.status === "Approved"
                      ? "success"
                      : order.status === "Receiving"
                      ? "warn"
                      : "muted"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div>{order.eta}</div>
              <div>{order.total}</div>
              <div>{order.items}</div>
              <div>{order.owner}</div>
              <div className="inventory-actions">
                <button className="btn mini secondary">View</button>
                <button className="btn mini">Approve</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="inventory-card">
        <div className="inventory-table" style={{ "--inventory-columns": "0.9fr 1fr 1fr 1.4fr" }}>
          <div className="inventory-thead">
            <div>Receiving ID</div>
            <div>PO</div>
            <div>Dock</div>
            <div>Status / Notes</div>
          </div>
          {RECEIVING.map((row) => (
            <div key={row.id} className="inventory-row">
              <div className="mono">{row.id}</div>
              <div>{row.po}</div>
              <div>{row.dock}</div>
              <div className="muted">
                <span className="inventory-pill">{row.status}</span> {row.notes}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
