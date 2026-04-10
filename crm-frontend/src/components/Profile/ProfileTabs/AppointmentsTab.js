import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";
import "../../Customers/CustomerDetailPage.css";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const toDate = (value) => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleString() : "Unknown";
};

const matchesRecord = (appt, record) => {
  const partyId = clean(record?.universal_id || record?.raw?.universal_id);
  if (partyId && clean(appt.party_universal_id) === partyId) return true;

  if (record?.object === "lead") {
    const leadId = clean(record?.id || record?.raw?.id);
    if (leadId && clean(appt.lead) === leadId) return true;
  }

  if (record?.object === "customer") {
    const customerPk = clean(record?.raw?.id);
    const customerUuid = clean(record?.id || record?.raw?.customer_id);
    if (customerPk && clean(appt.customer) === customerPk) return true;
    if (customerUuid && clean(appt.customer_id) === customerUuid) return true;
  }

  return false;
};

export default function AppointmentsTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const rows = await api
        .get("/appointments/appointments/")
        .then((res) => toRows(res.data))
        .catch(() => []);
      if (!mounted) return;
      setAppointments(rows);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [record]);

  const filtered = useMemo(
    () =>
      appointments
        .filter((row) => matchesRecord(row, record))
        .sort(
          (a, b) =>
            new Date(b.start_time || b.created_at || 0) -
            new Date(a.start_time || a.created_at || 0)
        ),
    [appointments, record]
  );

  const grouped = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];

    filtered.forEach((row) => {
      const start = toDate(row.start_time || row.created_at)?.getTime() || 0;
      if (start >= now) upcoming.push(row);
      else past.push(row);
    });

    return { upcoming, past };
  }, [filtered]);

  if (loading) {
    return <div className="cdp-empty">Loading appointments...</div>;
  }

  if (!filtered.length) {
    return <div className="cdp-empty">No appointments were linked to this customer from the current API response set.</div>;
  }

  return (
    <div className="cdp-stack">
      {[
        ["Upcoming", grouped.upcoming],
        ["Past", grouped.past],
      ].map(([label, rows]) => (
        <section key={label} className="cdp-group">
          <div className="cdp-group-head">
            <h4>{label}</h4>
            <span>{rows.length}</span>
          </div>
          {!rows.length ? (
            <div className="cdp-empty">No {label.toLowerCase()} appointments.</div>
          ) : (
            <div className="cdp-group-grid">
              {rows.map((appt) => (
                <article key={appt.id} className="cdp-item-card">
                  <div className="cdp-item-row">
                    <strong>{clean(appt.service_type) || "Appointment"}</strong>
                    <span className="cdp-item-meta">{clean(appt.status) || "scheduled"}</span>
                  </div>
                  <div className="cdp-item-meta">{formatDate(appt.start_time)}</div>
                  {appt.notes ? <div>{clean(appt.notes)}</div> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
