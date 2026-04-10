import React from "react";
import Badge from "./badge";

const clean = (value) => String(value || "").trim().toLowerCase();

const STATUS_COLOR = {
  scheduled: "blue",
  confirmed: "blue",
  pending: "gray",
  in_progress: "yellow",
  en_route: "yellow",
  completed: "emerald",
  cancelled: "gray",
  canceled: "gray",
  missed: "red",
  no_show: "red",
  noshow: "red",
};

const STATUS_LABEL = {
  in_progress: "In Progress",
  en_route: "En Route",
  no_show: "Missed",
};

export default function StatusPill({ status, className = "" }) {
  const key = clean(status) || "scheduled";
  const color = STATUS_COLOR[key] || "gray";
  const label = STATUS_LABEL[key] || (key ? key.replace(/_/g, " ") : "Scheduled");
  const pretty = label
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

  return (
    <Badge color={color} className={className}>
      {pretty}
    </Badge>
  );
}

