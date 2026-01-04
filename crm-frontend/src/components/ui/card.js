// src/components/ui/card.js
import React from "react";
import clsx from "clsx";

export const Card = ({ children, className = "", ...props }) => (
  <div
    className={clsx(
      "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }) => (
  <div
    className={clsx(
      "border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-t-xl",
      className
    )}
  >
    {children}
  </div>
);

export const CardContent = ({ children, className = "" }) => (
  <div
    className={clsx("p-4 text-sm text-gray-900 dark:text-gray-100", className)}
  >
    {children}
  </div>
);