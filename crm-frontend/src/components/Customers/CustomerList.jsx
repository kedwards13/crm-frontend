// src/components/Customers/CustomerList.jsx
import React, { useState, useEffect, useRef } from "react";
import { getIndustry } from "../../utils/tenantHelpers";
import CustomerCard from "../Profile/CustomerPopup"; // new popup component

const endpointMap = {
  base: "/api/customers/base",
  pest_control: "/api/customers/pest",
  fitness: "/api/customers/fitness",
  real_estate: "/api/customers/real-estate",
  insurance: "/api/customers/insurance",
};

export default function CustomerList() {
  const industryKey = getIndustry();
  const endpoint = endpointMap[industryKey] || endpointMap.base;

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCols, setVisibleCols] = useState({
    phone: true,
    email: true,
    address: true,
    city: true,
  });

  // Debounce
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch
  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load customers.");
      setCustomers(await res.json());
    } catch (err) {
      console.error(err);
      setError(err.message);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const toggleCol = (key) =>
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-4">
      {/* Search + column toggles */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded p-2 flex-1"
        />
        <div className="flex gap-2 text-sm">
          {Object.keys(visibleCols).map((key) => (
            <label key={key} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={visibleCols[key]}
                onChange={() => toggleCol(key)}
              />
              <span>{key}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : !customers.length ? (
        <div className="text-gray-600">No customers found.</div>
      ) : (
        <table className="min-w-full border text-sm bg-white shadow rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              {visibleCols.phone && <th className="px-4 py-2">Phone</th>}
              {visibleCols.email && <th className="px-4 py-2">Email</th>}
              {visibleCols.address && <th className="px-4 py-2">Address</th>}
              {visibleCols.city && <th className="px-4 py-2">City</th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.customer_id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <td className="px-4 py-2 font-medium">
                  {c.first_name} {c.last_name}
                </td>
                {visibleCols.phone && <td className="px-4 py-2">{c.primary_phone || "—"}</td>}
                {visibleCols.email && <td className="px-4 py-2">{c.primary_email || "—"}</td>}
                {visibleCols.address && <td className="px-4 py-2">{c.address || "—"}</td>}
                {visibleCols.city && <td className="px-4 py-2">{c.city || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Popup modal */}
      {selected && (
        <CustomerCard
          customer={selected}
          onClose={() => setSelected(null)}
          refresh={fetchCustomers}
        />
      )}
    </div>
  );
}