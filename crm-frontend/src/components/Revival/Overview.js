import React, { useEffect, useState, useRef } from 'react';
import revivalApi from '../../api/revivalApi';
import Scanner from './Scanner';
import CustomerPopup from '../Profile/CustomerPopup';
import { formatCurrency } from '../../utils/formatters';
import Badge from '../ui/badge';
import { Button } from '../ui/button';
import {
  EllipsisVertical,
  MessageSquareText,
  FileText,
  Trash2,
  SendHorizonal,
  Sparkles,
  CheckSquare,
  FileSearch
} from 'lucide-react';

export default function RevivalOverview() {
  const [stats, setStats] = useState(null);
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    loadData();
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, recentRes] = await Promise.all([
        revivalApi.getSummary(),
        revivalApi.getRecentScans(),
      ]);
      const quotes = Array.isArray(recentRes.data)
        ? recentRes.data
        : recentRes.data?.results || [];
      setStats(summaryRes.data);
      setRecentQuotes(quotes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOutsideClick = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setActiveDropdown(null);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredQuotes.length) {
      setSelected([]);
    } else {
      setSelected(filteredQuotes.map((q) => q.id));
    }
  };

  const handleAction = (action, quote) => {
    setActiveDropdown(null);
    switch (action) {
      case 'view':
        setSelectedQuote(quote);
        break;
      case 'message':
        console.log('💬 Opening message thread for:', quote.customer_name);
        break;
      case 'delete':
        if (window.confirm('Delete this quote?')) {
          revivalApi.deleteQuote(quote.id)
            .then(() =>
              setRecentQuotes((prev) => prev.filter((q) => q.id !== quote.id))
            )
            .catch((err) => alert('Delete failed: ' + err.message));
        }
        break;
      default:
        break;
    }
  };

  const filteredQuotes = recentQuotes.filter((q) => {
    return tab === 'all' || (q.status || 'draft') === tab;
  });

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (sortBy === 'price') return b.estimated_total - a.estimated_total;
    if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  });

  const summary = stats || {};
  const kpiCards = [
    {
      label: "Total Scanned",
      value: formatCurrency(summary.total_scanned_value || 0),
      tone: "blue",
      delta: "+12% vs last 30d",
    },
    {
      label: "Total Collected",
      value: formatCurrency(summary.total_collected || 0),
      tone: "green",
      delta: "+$8.4k this month",
    },
    {
      label: "Unpaid Remaining",
      value: formatCurrency(summary.unpaid_remaining || 0),
      tone: "amber",
      delta: "14 invoices pending",
    },
    {
      label: "Partially Paid",
      value: summary.partially_paid_quotes || 0,
      tone: "red",
      delta: "3 need follow-up",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'green';
      case 'rejected': return 'red';
      case 'converted': return 'blue';
      case 'sent': return 'purple';
      case 'draft': return 'yellow';
      case 'partial': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="revival-overview px-6 py-8 text-gray-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <FileSearch size={28} className="text-blue-400" /> Revival Overview
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Track recovered revenue, payment risk, and revival pipeline health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Revival Playbook</Button>
          <Button variant="primary" className="shadow-lg">+ Start Campaign</Button>
        </div>
      </div>

      {/* KPI + Scanner */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 mb-10">
        {loading ? (
          <div className="text-gray-400">Loading metrics...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <KPI
                key={card.label}
                label={card.label}
                value={card.value}
                delta={card.delta}
                tone={card.tone}
              />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-gray-700/40 bg-gray-900/30 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AI Quote Scanner</h3>
            <Badge color="blue">Smart Intake</Badge>
          </div>
          <Scanner />
        </div>
      </div>

      {/* Tabs + Sorting */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex gap-2">
          {['all', 'accepted', 'rejected', 'converted', 'sent', 'draft'].map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                tab === key
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow'
                  : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-300">
          Sort by:{' '}
          <select
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Most Recent</option>
            <option value="price">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="mb-4 flex items-center gap-3 text-sm bg-gray-900/40 border border-gray-700/60 p-3 rounded-md shadow-sm backdrop-blur-sm">
          <span className="text-gray-300">{selected.length} selected</span>
          <Button variant="primary" size="sm">
            <SendHorizonal size={16} className="mr-1" /> Send SMS
          </Button>
          <Button variant="outline" size="sm">
            <CheckSquare size={16} className="mr-1" /> Update Status
          </Button>
          <Button variant="outline" size="sm">
            <Sparkles size={16} className="mr-1" /> Enrich via AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Table (scrollable panel) */}
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/20 p-5 shadow-inner">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="py-3 px-3 text-left w-[40px]">
                <input
                  type="checkbox"
                  checked={selected.length === sortedQuotes.length && sortedQuotes.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="py-3 px-3 text-left">Customer</th>
              <th className="py-3 px-3 text-left">Service</th>
              <th className="py-3 px-3 text-left">Quote Total</th>
              <th className="py-3 px-3 text-left">Status</th>
              <th className="py-3 px-3 text-left">Scanned</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedQuotes.map((q) => (
              <tr
                key={q.id}
                className="border-b border-gray-800 hover:bg-gray-800/60 transition-all cursor-pointer"
                onClick={() => setSelectedQuote(q)}
              >
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                  />
                </td>
                <td className="py-3 px-3 font-medium text-gray-100">{q.customer_name || '-'}</td>
                <td className="py-3 px-3 text-gray-400">{q.service_type || '-'}</td>
                <td className="py-3 px-3 text-gray-100">{formatCurrency(q.estimated_total)}</td>
                <td className="py-3 px-3">
                  <Badge color={getStatusColor(q.status)}>{q.status || 'Draft'}</Badge>
                </td>
                <td className="py-3 px-3 text-gray-400">
                  {q.created_at ? new Date(q.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="py-3 px-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={() => setActiveDropdown(activeDropdown === q.id ? null : q.id)}
                  >
                    <EllipsisVertical size={18} />
                  </button>
                  {activeDropdown === q.id && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50"
                    >
                      <button
                        onClick={() => handleAction('message', q)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        <MessageSquareText size={14} /> Message
                      </button>
                      <button
                        onClick={() => handleAction('view', q)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        <FileText size={14} /> View Details
                      </button>
                      <button
                        onClick={() => handleAction('delete', q)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Chat */}
      <div className="fixed bottom-6 right-6">
        <button className="p-4 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-xl hover:scale-105 transition-transform">
          💬
        </button>
      </div>

      {/* Popup */}
      {selectedQuote && selectedQuote.id && (
        <CustomerPopup
          lead={selectedQuote}
          leadType="revival"
          onClose={() => setSelectedQuote(null)}
        />
      )}
    </div>
  );
}

function KPI({ label, value, delta, tone = "blue" }) {
  const toneStyles = {
    blue: "border-blue-500/40 from-blue-500/20 text-blue-300",
    green: "border-emerald-500/40 from-emerald-500/20 text-emerald-300",
    amber: "border-amber-500/40 from-amber-500/20 text-amber-300",
    red: "border-rose-500/40 from-rose-500/20 text-rose-300",
    gray: "border-gray-500/40 from-gray-500/20 text-gray-300",
  };
  const toneClass = toneStyles[tone] || toneStyles.gray;
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${toneClass} to-transparent border text-center shadow-sm`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-sm text-gray-300">{label}</div>
      {delta && <div className="mt-2 text-xs text-gray-400">{delta}</div>}
    </div>
  );
}
