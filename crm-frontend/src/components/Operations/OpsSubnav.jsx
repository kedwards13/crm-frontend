import { NavLink } from "react-router-dom";
import "./OpsNav.css";

/**
 * Reusable Operations sub‑nav.
 * - section: picks accent color (fleet | inventory | techs | training | compliance)
 * - size: 'md' (default) or 'sm' for nested tabs
 * - tabs: [{ key, label, to }]
 */
export default function OpsSubnav({
  section = "fleet",
  size = "md",
  tabs = [],
  aiId = "ops-subnav",
  className = "",
}) {
  return (
    <nav
      className={`ops-subnav ops-subnav--${section} ops-subnav--${size} ${className}`}
      data-ai-id={aiId}
      role="tablist"
      aria-orientation="horizontal"
    >
      {tabs.map(t => (
        <NavLink
          key={t.key}
          to={t.to}
          end={t.to === ""}                          // base route needs "end"
          className={({ isActive }) => `ops-tab ${isActive ? "is-active" : ""}`}
          role="tab"
          aria-selected={({ isActive }) => isActive}
          data-ai-id={`${aiId}__${t.key}`}
          title={t.label}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}