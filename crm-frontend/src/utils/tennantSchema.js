// src/utils/tenantSchema.js
export const setTenantSchema = (tenant) => {
    if (tenant && tenant.schema_name) {
      // Using Django's connection.cursor via an API endpoint might not be directly available in JS,
      // but on the backend (views) you can use this pattern.
      // This utility is meant as a reference or to be used in Python code.
      return `SET search_path TO ${tenant.schema_name}, public;`;
    }
    return 'SET search_path TO public;';
  };