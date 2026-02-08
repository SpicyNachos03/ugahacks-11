'use client';

import * as React from 'react';
import Maps from '../../../components/Maps';
import { Header } from '../../../components/Header';

type LatLng = { lat: number; lng: number };

export default function Page() {
  const [radiusMeters, setRadiusMeters] = React.useState(800);
  const [circleCenter, setCircleCenter] = React.useState<LatLng>({
    lat: 33.753746,
    lng: -84.38633,
  });

  // ===== NEW INPUT STATE =====
  const [avgCpuUtil, setAvgCpuUtil] = React.useState(0.5);
  const [avgGpuUtil, setAvgGpuUtil] = React.useState(0.5);
  const [availableMachines, setAvailableMachines] = React.useState(100);
  const [avgMachineLoad, setAvgMachineLoad] = React.useState(0.7);

  // Traffic signals state
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Population state
  const [popLoading, setPopLoading] = React.useState(false);
  const [population, setPopulation] = React.useState<number | null>(null);
  const [popError, setPopError] = React.useState<string | null>(null);

  const handleStatusChange = React.useCallback(
    ({ loading, count, error }: { loading: boolean; count: number; error: string | null }) => {
      setLoading(loading);
      setCount(count);
      setError(error);
    },
    []
  );

  const handlePopulationChange = React.useCallback(
    ({ loading, population, error }: { loading: boolean; population: number | null; error: string | null }) => {
      setPopLoading(loading);
      setPopulation(population);
      setPopError(error);
    },
    []
  );

  return (
    <div className="min-h-screen pt-20 bg-black flex flex-col">
      <Header />

      <div style={{ minHeight: '100vh', display: 'flex', gap: 16, padding: 16, background: '#0b0b0f' }}>
        <aside
          style={{
            width: 300,
            borderRadius: 16,
            padding: 16,
            color: 'white',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Area stats</div>

          {/* Radius */}
          <div style={{ fontSize: 12, opacity: 0.85 }}>Radius: {radiusMeters} m</div>
          <input
            style={{ width: '100%' }}
            type="range"
            min={100}
            max={5000}
            step={50}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
          />

          {/* ===== NEW INPUTS ===== */}
          <div style={{ marginTop: 20, fontWeight: 700, fontSize: 13 }}>Device Metrics</div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            CPU Utilization: {avgCpuUtil.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={avgCpuUtil}
              onChange={(e) => setAvgCpuUtil(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            GPU Utilization: {avgGpuUtil.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={avgGpuUtil}
              onChange={(e) => setAvgGpuUtil(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            Available Machines
            <input
              type="number"
              value={availableMachines}
              onChange={(e) => setAvailableMachines(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            Avg Machine Load
            <input
              type="number"
              step="0.01"
              value={avgMachineLoad}
              onChange={(e) => setAvgMachineLoad(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          {/* Traffic signals */}
          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Traffic signals (OSM)</div>
            {loading ? 'Searching…' : `Found: ${count}`}
            {error && <div style={{ color: '#ffb4b4' }}>Error: {error}</div>}
          </div>

          {/* Population */}
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Population (WorldPop)</div>
            {popLoading ? 'Estimating…' : population?.toLocaleString() ?? '—'}
            {popError && <div style={{ color: '#ffb4b4' }}>Error: {popError}</div>}
          </div>
        </aside>

        <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
          <Maps
            radiusMeters={radiusMeters}
            setRadiusMeters={setRadiusMeters}
            circleCenter={circleCenter}
            setCircleCenter={setCircleCenter}
            onStatusChange={handleStatusChange}
            onPopulationChange={handlePopulationChange}
          />
        </div>
      </div>

      {/* ===== OUTPUT SECTION ===== */}
      <div
        style={{
          margin: 24,
          padding: 16,
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.06)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Output</h2>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Found {count} traffic signals and {population?.toLocaleString() ?? '—'} people within {radiusMeters} meters.
          <br /><br />
          <b>Device Inputs:</b>
          <br />
          avg_cpu_util: {avgCpuUtil.toFixed(2)}
          <br />
          avg_gpu_util: {avgGpuUtil.toFixed(2)}
          <br />
          available_machines: {availableMachines}
          <br />
          average_machine_load: {avgMachineLoad.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
