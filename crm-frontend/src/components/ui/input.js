// src/components/ui/input.js
import React from "react";
import clsx from "clsx";

export const Input = React.forwardRef(
  (
    {
      type = "text",
      placeholder = "",
      value,
      onChange,
      className = "",
      size = "md",
      disabled = false,
      ...props
    },
    ref
  ) => {
    const base =
      "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";

    const sizes = {
      sm: "px-2.5 py-1.5 text-sm",
      md: "px-3 py-2 text-sm",
      lg: "px-4 py-2.5 text-base",
    };

    return (
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={clsx(base, sizes[size], className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";