import { useCallback } from "react";
import api from "../../../apiClient";

export default function useFleetApi() {
  // -----------------------------
  // 🚗 VEHICLES
  // -----------------------------
  const listVehicles = useCallback(async () => {
    const res = await api.get("/fleet/vehicles/");
    return res.data;
  }, []);

  const getVehicle = useCallback(async (id) => {
    const res = await api.get(`/fleet/vehicles/${id}/`);
    return res.data;
  }, []);

  const createVehicle = useCallback(async (data) => {
    const res = await api.post("/fleet/vehicles/", data);
    return res.data;
  }, []);

  const updateVehicle = useCallback(async (id, data) => {
    const res = await api.patch(`/fleet/vehicles/${id}/`, data);
    return res.data;
  }, []);

  const deleteVehicle = useCallback(async (id) => {
    const res = await api.delete(`/fleet/vehicles/${id}/`);
    return res.data;
  }, []);

  // -----------------------------
  // 🧰 MAINTENANCE
  // -----------------------------
  const listPlans = useCallback(async () => {
    const res = await api.get("/fleet/maintenance-plans/");
    return res.data;
  }, []);

  const listRecords = useCallback(async (vehicleId) => {
    const res = await api.get("/fleet/maintenance-records/", {
      params: { vehicle: vehicleId },
    });
    return res.data;
  }, []);

  const createRecord = useCallback(async (data) => {
    const res = await api.post("/fleet/maintenance-records/", data);
    return res.data;
  }, []);

  const completeAndRoll = useCallback(async (data) => {
    const res = await api.post(
      "/fleet/maintenance-records/complete-and-roll/",
      data
    );
    return res.data;
  }, []);

  // -----------------------------
  // ⛽ FUEL / INSURANCE
  // -----------------------------
  const listFuelLogs = useCallback(async (vehicleId) => {
    const res = await api.get("/fleet/fuel-logs/", {
      params: { vehicle: vehicleId },
    });
    return res.data;
  }, []);

  const listInsurance = useCallback(async (vehicleId) => {
    const res = await api.get("/fleet/insurance-policies/", {
      params: { vehicle: vehicleId },
    });
    return res.data;
  }, []);

  // -----------------------------
  // ✅ CLEAN EXPORT (no useMemo)
  // -----------------------------
  return {
    listVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    listPlans,
    listRecords,
    createRecord,
    completeAndRoll,
    listFuelLogs,
    listInsurance,
  };
}
