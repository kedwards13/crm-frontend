import React from "react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import "./AnalyticsMetricCard.css";

const fmtPct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 1000) / 10}%`;
};

export default function AnalyticsMetricCard({
  title,
  value,
  subtitle,
  trend, // ratio delta (e.g. 0.12 for +12%)
  periodLabel = "vs prior period",
  onClick,
  loading = false,
  tone = "neutral", // neutral | good | bad
  right,
  className = "",
}) {
  const pct = fmtPct(trend);
  const up = typeof trend === "number" && trend > 0;
  const down = typeof trend === "number" && trend < 0;
  const TrendIcon = up ? ArrowUpRight : down ? ArrowDownRight : null;

  return (
    <button
      type="button"
      className={clsx("amc", className, tone && `tone-${tone}`)}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="amc-top">
        <div>
          <div className="amc-title">{title}</div>
          {subtitle ? <div className="amc-subtitle">{subtitle}</div> : null}
        </div>
        {right ? <div className="amc-right">{right}</div> : null}
      </div>

      <div className="amc-value">{loading ? "..." : value ?? "—"}</div>

      <div className="amc-bottom">
        {pct && TrendIcon ? (
          <span className={clsx("amc-trend", up && "is-up", down && "is-down")}>
            <TrendIcon size={14} />
            {pct}
          </span>
        ) : (
          <span className="amc-trend is-flat">—</span>
        )}
        <span className="amc-period">{periodLabel}</span>
      </div>
    </button>
  );
}

