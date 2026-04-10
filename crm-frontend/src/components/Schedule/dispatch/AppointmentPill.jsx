import React from "react";
import AppointmentCard from "./AppointmentCard";

function AppointmentPill(props) {
  return <AppointmentCard {...props} />;
}

export default React.memo(AppointmentPill);
