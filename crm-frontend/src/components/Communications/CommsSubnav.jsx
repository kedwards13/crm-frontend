import React from "react";
import { NavLink } from "react-router-dom";
import "./Comms.css";

export default function CommsSubnav({ tabs = [] }) {
  if (!tabs.length) return null;
  return (
    <nav className="comms-subnav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          className={({ isActive }) => `comms-subnav__item ${isActive ? "active" : ""}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
