'use client';

import * as React from 'react';
import Maps from '../../../components/Maps';
import { Header } from '../../../components/Header';

type LatLng = { lat: number; lng: number };

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

async function fetchOpenMeteoWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<{ temperatureF: number | null; humidityPct: number | null }> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { signal });
  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.reason || j?.error || `Weather HTTP ${res.status}`);
    }
    throw new Error(await res.text());
  }

  const j = await res.json();
  const t = typeof j?.current?.temperature_2m === 'number' ? j.current.temperature_2m : null;
  const h = typeof j?.current?.relative_humidity_2m === 'number' ? j.current.relative_humidity_2m : null;

  return { temperatureF: t, humidityPct: h };
}

async function fetchOpenMeteoAQI(lat: number, lng: number, signal?: AbortSignal): Promise<{ aqi: number | null }> {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'us_aqi');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { signal });
  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.reason || j?.error || `AQI HTTP ${res.status}`);
    }
    throw new Error(await res.text());
  }

  const j = await res.json();
  const aqi = typeof j?.current?.us_aqi === 'number' ? j.current.us_aqi : null;
  return { aqi };
}

export default function Page() {
  const [radiusMeters, setRadiusMeters] = React.useState(800);
  const [circleCenter, setCircleCenter] = React.useState<LatLng>({
    lat: 33.753746,
    lng: -84.38633,
  });

  // ===== DEVICE INPUT STATE =====
  const [avgCpuUtil, setAvgCpuUtil] = React.useState(0.5);
  const [avgGpuUtil, setAvgGpuUtil] = React.useState(0.5);
  const [availableMachines, setAvailableMachines] = React.useState(100);
  const [avgMachineLoad, setAvgMachineLoad] = React.useState(0.7);

  // ===== WATTAGE STATE (NEW) =====
  const [wattageLoading, setWattageLoading] = React.useState(false);
  const [wattage, setWattage] = React.useState<number | null>(null);
  const [wattageError, setWattageError] = React.useState<string | null>(null);

  // Traffic signals state
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Population state
  const [popLoading, setPopLoading] = React.useState(false);
  const [population, setPopulation] = React.useState<number | null>(null);
  const [popError, setPopError] = React.useState<string | null>(null);

  // Open-Meteo weather + AQI state
  const [meteoLoading, setMeteoLoading] = React.useState(false);
  const [meteoError, setMeteoError] = React.useState<string | null>(null);
  const [temperatureF, setTemperatureF] = React.useState<number | null>(null);
  const [humidityPct, setHumidityPct] = React.useState<number | null>(null);
  const [aqi, setAqi] = React.useState<number | null>(null);

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

  const debouncedCenter = useDebouncedValue(circleCenter, 600);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setMeteoLoading(true);
    setMeteoError(null);

    Promise.all([
      fetchOpenMeteoWeather(debouncedCenter.lat, debouncedCenter.lng, ctrl.signal),
      fetchOpenMeteoAQI(debouncedCenter.lat, debouncedCenter.lng, ctrl.signal),
    ])
      .then(([w, a]) => {
        setTemperatureF(w.temperatureF);
        setHumidityPct(w.humidityPct);
        setAqi(a.aqi);
        setMeteoLoading(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setMeteoError(String(e?.message ?? e));
        setMeteoLoading(false);
      });

    return () => ctrl.abort();
  }, [debouncedCenter.lat, debouncedCenter.lng]);

  // ===== WATTAGE POST (NEW) =====
  const debouncedAvgCpuUtil = useDebouncedValue(avgCpuUtil, 500);
  const debouncedAvgGpuUtil = useDebouncedValue(avgGpuUtil, 500);
  const debouncedAvailableMachines = useDebouncedValue(availableMachines, 500);
  const debouncedAvgMachineLoad = useDebouncedValue(avgMachineLoad, 500);

  React.useEffect(() => {
    const ctrl = new AbortController();

    setWattageLoading(true);
    setWattageError(null);

    fetch('http://localhost:5001/api/wattage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avg_cpu_util: debouncedAvgCpuUtil,
        avg_gpu_util: debouncedAvgGpuUtil,
        active_machines: debouncedAvailableMachines,
        machine_load_1_mean: debouncedAvgMachineLoad,
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok) {
          const msg = ct.includes('application/json')
            ? (await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`
            : await res.text();
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data: any) => {
        if (typeof data?.Wattage !== 'number' || Number.isNaN(data.Wattage)) {
          throw new Error('Unexpected response format (expected { Wattage: number })');
        }
        setWattage(data.Wattage);
        setWattageLoading(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setWattage(null);
        setWattageError(String(e?.message ?? e));
        setWattageLoading(false);
      });

    return () => ctrl.abort();
  }, [debouncedAvgCpuUtil, debouncedAvgGpuUtil, debouncedAvailableMachines, debouncedAvgMachineLoad]);

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
            max={10000}
            step={50}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
          />

          {/* ===== DEVICE METRICS ===== */}
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

          {/* ===== WATTAGE DISPLAY (NEW) ===== */}
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Predicted Wattage</div>
            {wattageLoading ? 'Predicting…' : wattage == null ? '—' : `${wattage.toFixed(2)} W`}
            {wattageError && <div style={{ color: '#ffb4b4' }}>Error: {wattageError}</div>}
          </div>

          {/* Weather + AQI */}
          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Weather + Air Quality</div>
            <div>Temperature (°F): {temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F`}</div>
            <div>Humidity (%): {humidityPct == null ? '—' : `${Math.round(humidityPct)}%`}</div>
            <div>Air Quality Index (US AQI): {aqi == null ? '—' : Math.round(aqi)}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{meteoLoading ? 'Updating…' : 'Updated'}</div>
            {meteoError && <div style={{ color: '#ffb4b4' }}>Error: {meteoError}</div>}
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
          <br />
          <br />
          <b>Device Inputs:</b>
          <br />
          avg_cpu_util: {avgCpuUtil.toFixed(2)}
          <br />
          avg_gpu_util: {avgGpuUtil.toFixed(2)}
          <br />
          available_machines: {availableMachines}
          <br />
          average_machine_load: {avgMachineLoad.toFixed(2)}
          <br />
          <br />
          <b>Predicted Wattage:</b>
          <br />
          {wattageLoading ? 'Predicting…' : wattage == null ? '—' : `${wattage.toFixed(2)} W`}
          {wattageError && (
            <>
              <br />
              <span style={{ color: '#ffb4b4' }}>Error: {wattageError}</span>
            </>
          )}
          <br />
          <br />
          <b>Weather + AQI:</b>
          <br />
          Temperature: {temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F`}
          <br />
          Humidity: {humidityPct == null ? '—' : `${Math.round(humidityPct)}%`}
          <br />
          AQI: {aqi == null ? '—' : Math.round(aqi)}
        </div>
      </div>
    </div>
  );
}