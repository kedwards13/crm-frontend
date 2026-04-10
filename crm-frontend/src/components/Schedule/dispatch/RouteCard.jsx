import React from "react";
import RouteColumn from "./RouteColumn";

function RouteCard(props) {
  return <RouteColumn {...props} />;
}

export default React.memo(RouteCard);
