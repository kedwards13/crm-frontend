import React from "react";

export default function ConstraintPanel({
  constraints,
  onChange,
  modifiedCount,
  routeAlertCount,
  optimizationWindowLabel,
}) {
  const updateField = (key) => (event) =>
    onChange?.({
      ...constraints,
      [key]: Number(event.target.value || 0),
    });

  const updateOptionalField = (key) => (event) =>
    onChange?.({
      ...constraints,
      [key]: event.target.value === "" ? "" : Number(event.target.value || 0),
    });

  const updateBoolean = (key) => (event) =>
    onChange?.({
      ...constraints,
      [key]: Boolean(event.target.checked),
    });

  const updatePriority = (key) => (event) =>
    onChange?.({
      ...constraints,
      priorities: {
        ...constraints.priorities,
        [key]: Number(event.target.value || 0),
      },
    });

  return (
    <section className="dispatch-constraint-panel">
      <header className="dispatch-panel-head">
        <div>
          <h3>Constraint Panel</h3>
          <p>
            Optimizer weights stay local until you run a preview or finalize the active window.
          </p>
        </div>
      </header>

      <div className="dispatch-constraint-grid">
        <label>
          <span>Max appointments / tech</span>
          <input
            type="number"
            min="0"
            value={constraints.maxAppointmentsPerTech}
            onChange={updateField("maxAppointmentsPerTech")}
          />
        </label>
        <label>
          <span>Max drive minutes</span>
          <input
            type="number"
            min="0"
            value={constraints.maxDriveMinutes}
            onChange={updateField("maxDriveMinutes")}
          />
        </label>
        <label>
          <span>Route value target</span>
          <input
            type="number"
            min="0"
            step="50"
            value={constraints.valueTarget}
            onChange={updateField("valueTarget")}
          />
        </label>
        <label>
          <span>Max due-date deviation</span>
          <input
            type="number"
            min="0"
            value={constraints.maxDueDateDeviation}
            onChange={updateOptionalField("maxDueDateDeviation")}
          />
        </label>
        <label className="dispatch-constraint-checkbox">
          <input
            type="checkbox"
            checked={Boolean(constraints.balanceRoutes)}
            onChange={updateBoolean("balanceRoutes")}
          />
          <span>Balance route loads</span>
        </label>
      </div>

      <div className="dispatch-constraint-grid dispatch-constraint-grid-weights">
        <label>
          <span>Drive priority</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={constraints.priorities?.drive}
            onChange={updatePriority("drive")}
          />
        </label>
        <label>
          <span>Value priority</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={constraints.priorities?.value}
            onChange={updatePriority("value")}
          />
        </label>
        <label>
          <span>Cadence priority</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={constraints.priorities?.cadence}
            onChange={updatePriority("cadence")}
          />
        </label>
      </div>

      <div className="dispatch-constraint-summary">
        <div>
          <strong>{modifiedCount}</strong>
          <span>Modified appointments</span>
        </div>
        <div>
          <strong>{routeAlertCount}</strong>
          <span>Routes over local limits</span>
        </div>
        <div>
          <strong>{optimizationWindowLabel || "60 days"}</strong>
          <span>Optimization window</span>
        </div>
      </div>
    </section>
  );
}
