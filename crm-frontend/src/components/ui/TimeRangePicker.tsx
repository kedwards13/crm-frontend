// @ts-nocheck
import React from 'react';

const DEFAULT_RANGE = { start: '08:00', end: '17:00' };

export default function TimeRangePicker({
  label,
  value = DEFAULT_RANGE,
  onChange,
  startLabel = 'Start Time',
  endLabel = 'End Time',
  disabled = false,
  required = false,
  className = '',
}) {
  const safeRange = {
    start: value?.start || DEFAULT_RANGE.start,
    end: value?.end || DEFAULT_RANGE.end,
  };

  const update = (field, nextValue) => {
    onChange?.({
      ...safeRange,
      [field]: nextValue,
    });
  };

  return (
    <div className={`time-range-picker ${className}`.trim()}>
      {label ? <p className="time-range-picker-label">{label}</p> : null}

      <div className="time-range-picker-grid">
        <label>
          {startLabel}
          <input
            type="time"
            value={safeRange.start}
            onChange={(event) => update('start', event.target.value)}
            disabled={disabled}
            required={required}
          />
        </label>

        <label>
          {endLabel}
          <input
            type="time"
            value={safeRange.end}
            onChange={(event) => update('end', event.target.value)}
            disabled={disabled}
            required={required}
          />
        </label>
      </div>
    </div>
  );
}
