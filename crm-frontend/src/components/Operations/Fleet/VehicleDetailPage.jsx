import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFleetApi from './useFleetApi';
import VehicleDetail from './VehicleDetail';
import './FleetReports.css';

export default function VehicleDetailPage() {
  const { id } = useParams();
  const { getVehicle, listRecords, createRecord } = useFleetApi();

  const [vehicle, setVehicle] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load vehicle and its maintenance records
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVehicle(id);
      setVehicle(v);

      const data = await listRecords(id);
      const arr = Array.isArray(data) ? data : data.results || [];
      setRecords(arr);
    } catch (err) {
      console.error('Failed to load vehicle details', err);
    } finally {
      setLoading(false);
    }
  }, [id, getVehicle, listRecords]);

  useEffect(() => {
    load();
  }, [load]);

  // Quick-add maintenance record
  const quickAddOilChange = async () => {
    try {
      await createRecord({
        vehicle: id,
        title: 'Oil Change',
        type: 'service',
        status: 'open',
        due_miles: (vehicle?.odometer || 0) + 5000,
      });
      await load();
    } catch (err) {
      console.error('Failed to add maintenance record:', err);
    }
  };

  if (loading) return <div className="fleet-skel">Loading…</div>;
  if (!vehicle)
    return (
      <div className="fleet-reports">
        <p className="muted">Vehicle not found.</p>
      </div>
    );

  return (
    <div className="fleet-reports">
      <header className="fleet-reports-head">
        <h1>
          Vehicle • {vehicle.unit_code || vehicle.name || vehicle.vin || '—'}
        </h1>
        <div>
          <Link className="mini" to="edit">Edit</Link>
          <button className="mini" onClick={quickAddOilChange}>
            + Oil Change Task
          </button>
        </div>
      </header>

      {/* show the detail component if it exists */}
      <VehicleDetail vehicle={vehicle} tasks={records} />
    </div>
  );
}