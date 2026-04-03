import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Send,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  previewMonthFill,
  getMonthPlan,
  getMonthPlanDay,
  getDispatchBoard,
  advanceMonthPlan,
  getMonthPlanIssues,
  getMonthPlanProjections,
} from "../../../api/schedulingApi";
import "./MonthPlanView.css";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATES = ["draft", "review", "approved", "finalized"];
const ST_LABEL = { draft: "Draft", review: "Review", approved: "Approved", finalized: "Finalized" };

const ms = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const pm = (s) => { const [y, m] = s.split("-").map(Number); return new Date(y, m - 1, 1); };
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const fmt = (n) => (n || 0).toLocaleString();

function utilClass(pct) {
  if (pct > 95) return "mp-util-critical";
  if (pct > 85) return "mp-util-high";
  if (pct > 60) return "mp-util-good";
  if (pct > 30) return "mp-util-low";
  return "mp-util-empty";
}

function scoreClass(s) {
  if (s >= 90) return "mp-score-high";
  if (s >= 70) return "mp-score-med";
  return "mp-score-low";
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */

export default function MonthPlanView() {
  const [monthStr, setMonthStr] = useState(() => ms(new Date().getFullYear(), new Date().getMonth()));
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [selDay, setSelDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [projections, setProjections] = useState(null);
  const [err, setErr] = useState(null);
  const [existing, setExisting] = useState(null); // {date_str: count} from dispatch board

  const md = useMemo(() => pm(monthStr), [monthStr]);
  const yr = md.getFullYear();
  const mo = md.getMonth();
  const total = dim(yr, mo);
  const pad = ((new Date(yr, mo, 1).getDay() || 7) - 1);

  // Fetch existing FieldRoutes appointments on month change
  useEffect(() => {
    let cancelled = false;
    const startDate = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
    const endDate = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(total).padStart(2, "0")}`;
    getDispatchBoard({ start_date: startDate, end_date: endDate, view: "month" })
      .then(({ data }) => {
        if (cancelled) return;
        // Build per-day count from dispatch board days or routes
        const counts = {};
        const days = data?.days || [];
        for (const day of days) {
          const ds = day.date || day.day;
          const jobs = day.total_jobs || day.job_count || day.stops || 0;
          if (ds && jobs) counts[ds] = jobs;
        }
        // Fallback: count from baseline_items
        if (!days.length && data?.baseline_items) {
          for (const item of data.baseline_items) {
            const d = (item.scheduled_start || item.date || "").slice(0, 10);
            if (d) counts[d] = (counts[d] || 0) + 1;
          }
        }
        setExisting(counts);
      })
      .catch(() => { if (!cancelled) setExisting(null); });
    return () => { cancelled = true; };
  }, [yr, mo, total]);

  const loadMeta = useCallback(async (pid) => {
    try {
      const [{ data: p }, { data: i }, { data: pr }] = await Promise.all([
        getMonthPlan(pid), getMonthPlanIssues(pid), getMonthPlanProjections(pid),
      ]);
      setPlan(p); setIssues(i?.issues || []); setProjections(pr?.projections || null); setErr(null);
    } catch (e) { setErr(e?.response?.data?.detail || "Load failed"); }
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true); setErr(null);
    try {
      const { data } = await previewMonthFill(monthStr);
      setPlan(data);
      if (data.plan_id) {
        const [{ data: i }, { data: pr }] = await Promise.all([
          getMonthPlanIssues(data.plan_id), getMonthPlanProjections(data.plan_id),
        ]);
        setIssues(i?.issues || []); setProjections(pr?.projections || null);
      }
    } catch (e) { setErr(e?.response?.data?.detail || "Generation failed"); }
    finally { setGenerating(false); }
  }, [monthStr]);

  const optimize = useCallback(async () => {
    if (!plan?.plan_id) return;
    setOptimizing(true); setErr(null);
    try {
      const { data } = await previewMonthFill(monthStr, {}, {}, true);
      setPlan(data);
      if (data.plan_id) {
        const [{ data: i }, { data: pr }] = await Promise.all([
          getMonthPlanIssues(data.plan_id), getMonthPlanProjections(data.plan_id),
        ]);
        setIssues(i?.issues || []); setProjections(pr?.projections || null);
      }
    } catch (e) { setErr(e?.response?.data?.detail || "Optimize failed"); }
    finally { setOptimizing(false); }
  }, [monthStr, plan]);

  const advance = useCallback(async (to) => {
    if (!plan?.plan_id) return;
    try { await advanceMonthPlan(plan.plan_id, to); await loadMeta(plan.plan_id); }
    catch (e) { setErr(e?.response?.data?.detail || `Advance failed`); }
  }, [plan, loadMeta]);

  useEffect(() => {
    if (!selDay || !plan?.plan_id) { setDayDetail(null); return; }
    let c = false;
    setDayLoading(true);
    getMonthPlanDay(plan.plan_id, selDay)
      .then(({ data }) => { if (!c) setDayDetail(data); })
      .catch(() => { if (!c) setDayDetail(null); })
      .finally(() => { if (!c) setDayLoading(false); });
    return () => { c = true; };
  }, [selDay, plan?.plan_id]);

  const shift = useCallback((d) => {
    const x = pm(monthStr); x.setMonth(x.getMonth() + d);
    setMonthStr(ms(x.getFullYear(), x.getMonth()));
    setPlan(null); setSelDay(null); setDayDetail(null);
  }, [monthStr]);

  const cells = useMemo(() => {
    const sums = plan?.day_summaries || {};
    return Array.from({ length: total }, (_, i) => {
      const d = i + 1;
      const ds = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(yr, mo, d).getDay();
      const ex = (existing || {})[ds] || 0;
      return { d, ds, we: dow === 0 || dow === 6, sum: sums[ds], iss: (issues || []).filter((x) => x.date === ds), existing: ex };
    });
  }, [plan, issues, existing, total, yr, mo]);

  const st = plan?.stats || {};
  const state = plan?.state;

  return (
    <div className="mp-shell">
      {/* Header */}
      <header className="mp-header">
        <div className="mp-header-left">
          <Calendar className="mp-icon-sm mp-text-muted" />
          <button onClick={() => shift(-1)} className="mp-nav-btn"><ChevronLeft className="mp-icon-sm" /></button>
          <span className="mp-month-label">
            {md.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => shift(1)} className="mp-nav-btn"><ChevronRight className="mp-icon-sm" /></button>
        </div>

        {state && (
          <div className="mp-state-bar">
            {STATES.map((s, i) => (
              <React.Fragment key={s}>
                <span className={`mp-state-pill ${s === state ? "mp-state-active" : ""}`} data-state={s}>
                  {ST_LABEL[s]}
                </span>
                {i < 3 && <span className="mp-state-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="mp-header-actions">
          {(!state || state === "draft") && (
            <button onClick={generate} disabled={generating} className="mp-btn mp-btn-accent">
              {generating ? <Loader2 className="mp-icon-sm mp-spin" /> : <Sparkles className="mp-icon-sm" />}
              {generating ? "Generating…" : plan ? "Re-fill" : "Auto-Fill"}
            </button>
          )}
          {state === "draft" && plan && (
            <>
              <button onClick={optimize} disabled={optimizing} className="mp-btn mp-btn-info">
                {optimizing ? <Loader2 className="mp-icon-sm mp-spin" /> : <Settings2 className="mp-icon-sm" />}
                {optimizing ? "Optimizing…" : "Optimize"}
              </button>
              <button onClick={() => advance("review")} className="mp-btn mp-btn-info">
                <Send className="mp-icon-sm" />Review
              </button>
            </>
          )}
          {state === "review" && (
            <>
              <button onClick={() => advance("draft")} className="mp-btn mp-btn-muted">Back</button>
              <button onClick={() => advance("approved")} className="mp-btn mp-btn-accent">
                <CheckCircle2 className="mp-icon-sm" />Approve
              </button>
            </>
          )}
          {state === "approved" && (
            <>
              <button onClick={() => advance("review")} className="mp-btn mp-btn-muted">Reopen</button>
              <button onClick={() => advance("finalized")} className="mp-btn mp-btn-purple">
                <CheckCircle2 className="mp-icon-sm" />Finalize
              </button>
            </>
          )}
        </div>
      </header>

      {err && (
        <div className="mp-error">
          <XCircle className="mp-icon-sm" />{err}
        </div>
      )}

      {/* Stats bar */}
      {plan && (
        <div className="mp-stats-bar">
          <span><Target className="mp-icon-xs mp-clr-accent" /><b>{fmt(st.assigned)}</b>/{fmt(st.total_jobs)}</span>
          <span><Users className="mp-icon-xs mp-clr-info" /><b>{st.familiar_tech_rate}%</b> familiar</span>
          <span><TrendingUp className="mp-icon-xs mp-clr-warn" /><b>{st.avg_score}</b> score</span>
          <span><Clock className="mp-icon-xs mp-text-muted" />{st.tech_count} techs · {st.working_days}d</span>
          {st.unassignable > 0 && <span className="mp-clr-danger"><AlertTriangle className="mp-icon-xs" />{st.unassignable} unplaced</span>}
          {st.optimized > 0 && <span className="mp-clr-info"><Settings2 className="mp-icon-xs" />{st.optimized} optimized</span>}
        </div>
      )}

      <div className="mp-body">
        {/* Grid + detail */}
        <div className="mp-main">
          <div className="mp-grid-header">
            {WD.map((d) => <div key={d} className="mp-grid-day-label">{d}</div>)}
          </div>
          <div className="mp-grid">
            {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} className="mp-cell mp-cell-pad" />)}
            {cells.map((c) => (
              <Cell key={c.d} c={c} sel={selDay === c.ds} onClick={() => setSelDay(selDay === c.ds ? null : c.ds)} />
            ))}
          </div>
          {selDay && <DayPanel date={selDay} detail={dayDetail} loading={dayLoading} />}
        </div>

        {/* Sidebar */}
        <aside className="mp-sidebar">
          <Sidebar plan={plan} issues={issues} proj={projections} onDay={setSelDay} />
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CELL
   ═══════════════════════════════════════════════════════════════ */

function Cell({ c, sel, onClick }) {
  if (c.we) return <div className="mp-cell mp-cell-weekend"><span>{c.d}</span></div>;

  const newJobs = c.sum?.total_jobs || 0;
  const ex = c.existing || 0;
  const techs = c.sum?.tech_utilization || [];
  const avg = techs.length ? Math.round(techs.reduce((s, t) => s + (t.utilization_pct || 0), 0) / techs.length) : 0;
  const hi = c.iss.length > 0;
  const hasAny = newJobs > 0 || ex > 0;

  return (
    <button onClick={onClick} className={`mp-cell mp-cell-day ${sel ? "mp-cell-sel" : ""}`}>
      <div className="mp-cell-top">
        <span className="mp-cell-num">{c.d}</span>
        {hi && <AlertTriangle className="mp-icon-xs mp-clr-warn" />}
      </div>
      {hasAny ? (
        <>
          <span className="mp-cell-jobs">
            {ex > 0 && <span className="mp-clr-info">{ex} existing</span>}
            {ex > 0 && newJobs > 0 && <span className="mp-text-muted"> · </span>}
            {newJobs > 0 && <span className="mp-clr-accent">{newJobs} new</span>}
          </span>
          {newJobs > 0 && (
            <div className="mp-cell-bar-wrap">
              <div className="mp-cell-bar-track">
                <div className={`mp-cell-bar-fill ${utilClass(avg)}`} style={{ width: `${Math.min(avg, 100)}%` }} />
              </div>
              <span className={`mp-cell-bar-label ${utilClass(avg)}`}>{avg}%</span>
            </div>
          )}
        </>
      ) : (
        <span className="mp-cell-empty">—</span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DAY PANEL
   ═══════════════════════════════════════════════════════════════ */

function DayPanel({ date, detail, loading }) {
  if (loading) return <div className="mp-day-loading"><Loader2 className="mp-icon-sm mp-spin" />Loading…</div>;
  if (!detail) return null;

  const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const groups = detail.by_tech || {};
  const sum = detail.summary || {};

  return (
    <div className="mp-day-panel">
      <div className="mp-day-header">
        <span className="mp-day-title">{label}</span>
        <span className="mp-text-muted mp-mono">{sum.total_jobs || 0} jobs · {Math.round((sum.total_duration || 0) / 60 * 10) / 10}h</span>
      </div>
      <div className="mp-day-techs">
        {Object.entries(groups).map(([tech, jobs]) => {
          const mins = jobs.reduce((s, j) => s + (j.duration || 0), 0);
          const fam = jobs.filter((j) => j.is_familiar_tech).length;
          return (
            <div key={tech} className="mp-tech-section">
              <div className="mp-tech-header">
                <span className="mp-tech-name">{tech}</span>
                <div className="mp-tech-meta">
                  <span>{jobs.length} jobs</span>
                  <span>{Math.round(mins / 60 * 10) / 10}h</span>
                  <span className="mp-clr-accent">{fam}/{jobs.length} fam</span>
                </div>
              </div>
              <table className="mp-job-table">
                <tbody>
                  {jobs.map((j, i) => (
                    <tr key={j.job_id || i} className="mp-job-row">
                      <td className="mp-job-num">{i + 1}</td>
                      <td className="mp-job-customer">{j.customer_name}</td>
                      <td className="mp-job-service">{j.service_type}</td>
                      <td className="mp-job-dur mp-mono">{Math.max(j.duration, 0)}m</td>
                      <td className={`mp-job-score mp-mono ${scoreClass(j.score)}`}>{Math.round(j.score)}</td>
                      <td className="mp-job-fam">{j.is_familiar_tech && <MapPin className="mp-icon-xs mp-clr-accent" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */

function Sidebar({ plan, issues, proj, onDay }) {
  if (!plan) return (
    <div className="mp-sidebar-empty">
      <p className="mp-text-muted">No plan yet</p>
      <p>Click <b className="mp-clr-accent">Auto-Fill</b> to generate.</p>
    </div>
  );

  const st = plan.stats || {};
  const un = plan.unassignable || [];
  const pc = proj?.count || 0;

  return (
    <div className="mp-sidebar-content">
      <Section title="Plan">
        <Row l="Assigned" v={`${st.assigned}/${st.total_jobs}`} cls="mp-clr-accent" />
        <Row l="Familiar Tech" v={`${st.familiar_tech_rate}%`} cls="mp-clr-accent" />
        <Row l="Avg Score" v={st.avg_score} cls="mp-clr-warn" />
        <Row l="Techs" v={st.tech_count} />
        <Row l="Work Days" v={st.working_days} />
        {st.unassignable > 0 && <Row l="Unplaced" v={st.unassignable} cls="mp-clr-danger" />}
        {st.optimized > 0 && <Row l="Optimized" v={st.optimized} cls="mp-clr-info" />}
      </Section>

      {issues.length > 0 && (
        <Section title={`Issues · ${issues.length}`} cls="mp-section-warn">
          <div className="mp-list mp-list-sm">
            {issues.slice(0, 20).map((iss, i) => (
              <button key={i} onClick={() => iss.date && onDay(iss.date)} className="mp-list-item mp-list-item-warn">
                <span className="mp-mono mp-clr-warn">{iss.date?.slice(5)}</span>
                <span className="mp-text-muted">{iss.type}{iss.tech ? ` · ${iss.tech}` : ""}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {un.length > 0 && (
        <Section title={`Unplaced · ${un.length}`} cls="mp-section-danger">
          <div className="mp-list">
            {un.slice(0, 25).map((u, i) => (
              <div key={i} className="mp-list-item mp-list-item-danger">
                <div>{u.customer_name}</div>
                <div className="mp-text-muted">{u.service_type} · {u.reason?.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {pc > 0 && (
        <Section title={`Next Month · ${pc}`} cls="mp-section-purple">
          <div className="mp-list mp-list-sm">
            {(proj?.items || []).slice(0, 8).map((p, i) => (
              <div key={i} className="mp-list-item mp-list-item-row">
                <span className="mp-text-truncate">{p.customer_name}</span>
                <span className="mp-mono mp-text-muted">{p.frequency_days}d</span>
              </div>
            ))}
            {pc > 8 && <div className="mp-text-muted">+{pc - 8} more</div>}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, cls = "", children }) {
  return (
    <div className={`mp-section ${cls}`}>
      <h4 className="mp-section-title">{title}</h4>
      {children}
    </div>
  );
}

function Row({ l, v, cls = "" }) {
  return (
    <div className="mp-row">
      <span className="mp-text-muted">{l}</span>
      <span className={`mp-mono ${cls}`}>{v}</span>
    </div>
  );
}
