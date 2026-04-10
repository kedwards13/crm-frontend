import React, { useEffect, useMemo, useState } from "react";
import api from "../../../apiClient";

const toRows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const clean = (value) => String(value || "").trim();

const toDigits = (value) => clean(value).replace(/\D+/g, "").slice(-10);

const toLower = (value) => clean(value).toLowerCase();

export default function CustomerCampaignsTab({ record }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const candidateCustomerIds = useMemo(
    () =>
      new Set(
        [record?.id, record?.raw?.id, record?.raw?.customer_id]
          .map((value) => clean(value))
          .filter(Boolean)
      ),
    [record]
  );

  const candidatePhones = useMemo(
    () =>
      new Set(
        [
          ...(Array.isArray(record?.phones) ? record.phones : []),
          record?.raw?.primary_phone,
          record?.raw?.secondary_phone,
          ...(Array.isArray(record?.raw?.all_phones) ? record.raw.all_phones : []),
        ]
          .map((value) => toDigits(value))
          .filter(Boolean)
      ),
    [record]
  );

  const candidateEmails = useMemo(
    () =>
      new Set(
        [
          ...(Array.isArray(record?.emails) ? record.emails : []),
          record?.raw?.primary_email,
          record?.raw?.secondary_email,
          ...(Array.isArray(record?.raw?.all_emails) ? record.raw.all_emails : []),
        ]
          .map((value) => toLower(value))
          .filter(Boolean)
      ),
    [record]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const campaigns = await api
        .get("/campaigns/")
        .then((res) => toRows(res.data))
        .catch(() => []);

      const withMatches = await Promise.all(
        campaigns.slice(0, 20).map(async (campaign) => {
          const recipients = await api
            .get(`/campaigns/${campaign.id}/recipients/`)
            .then((res) => toRows(res.data?.recipients || res.data))
            .catch(() => []);

          const matchedRecipients = recipients.filter((recipient) => {
            const idMatch =
              candidateCustomerIds.size > 0 &&
              candidateCustomerIds.has(clean(recipient.customer_id));
            const phoneMatch =
              candidatePhones.size > 0 &&
              candidatePhones.has(toDigits(recipient.phone || recipient.contact_phone));
            const emailMatch =
              candidateEmails.size > 0 &&
              candidateEmails.has(toLower(recipient.email || recipient.contact_email));
            return idMatch || phoneMatch || emailMatch;
          });

          if (!matchedRecipients.length) return null;
          return {
            campaign,
            recipients: matchedRecipients,
          };
        })
      );

      if (!mounted) return;
      setRows(withMatches.filter(Boolean));
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [candidateCustomerIds, candidateEmails, candidatePhones]);

  const runCampaignNow = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/run/`);
    } catch {
      // Best effort action; list will refresh on next open.
    }
  };

  if (loading) {
    return <div style={{ padding: 16 }}>Loading customer campaign activity...</div>;
  }

  if (!rows.length) {
    return (
      <div style={{ padding: 16 }}>
        No campaigns currently target this profile based on available recipient links.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {rows.map(({ campaign, recipients }) => (
        <div
          key={campaign.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong>{clean(campaign.name) || "Campaign"}</strong>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              {clean(campaign.status) || "draft"}
            </span>
          </div>
          <div style={{ marginTop: 8, color: "#374151", fontSize: 14 }}>
            Sent: {Number(campaign.sent || 0)} • Delivered: {Number(campaign.opened || 0)} •
            Responses: {Number(campaign.replied || 0)}
          </div>
          <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Linked recipients: {recipients.length}
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => runCampaignNow(campaign.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                cursor: "pointer",
              }}
            >
              Run Campaign
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
