import AppointmentCard from "./AppointmentCard";
import RouteColumn from "./RouteColumn";
import TechnicianHeader from "./TechnicianHeader";
import StatusIndicator from "./StatusIndicator";

const defaultRegistry = {
  AppointmentCard,
  RouteColumn,
  TechnicianHeader,
  StatusIndicator,
};

const registries = {
  default: defaultRegistry,
  pest_control: defaultRegistry,
  landscaping: defaultRegistry,
  general: defaultRegistry,
};

export const getDispatchRegistry = (industryKey = "default") =>
  registries[String(industryKey || "default").toLowerCase()] || defaultRegistry;
