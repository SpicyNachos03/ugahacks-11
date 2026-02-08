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

async function fetchOpenMeteoAQI(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<{ aqi: number | null }> {
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

  // Traffic signals state
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Population state
  const [popLoading, setPopLoading] = React.useState(false);
  const [population, setPopulation] = React.useState<number | null>(null);
  const [popError, setPopError] = React.useState<string | null>(null);

  // Weather + AQI state
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

  return (
    <div className="min-h-screen pt-20" style={{ background: '#f5f5f5', color: '#333' }}>
      <Header />

      <div
        style={{
          display: 'flex',
          gap: 32,
          padding: '16px 32px',
          height: '600px', // shorter input + map section
        }}
      >
        {/* INPUT DIV */}
        <aside
          style={{
            width: 300,
            borderRadius: 16,
            padding: 16,
            background: '#fff',
            border: '1px solid #ccc',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            color: '#333',
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

          {/* Device Metrics */}
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

          {/* Weather + AQI */}
          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Weather + Air Quality</div>
            <div>
              Temperature (°F): {temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F`}
            </div>
            <div>
              Humidity (%): {humidityPct == null ? '—' : `${Math.round(humidityPct)}%`}
            </div>
            <div>Air Quality Index (US AQI): {aqi == null ? '—' : Math.round(aqi)}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {meteoLoading ? 'Updating…' : 'Updated'}
            </div>
            {meteoError && <div style={{ color: '#ff4d4f' }}>Error: {meteoError}</div>}
          </div>

          {/* Traffic signals */}
          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Traffic signals (OSM)</div>
            {loading ? 'Searching…' : `Found: ${count}`}
            {error && <div style={{ color: '#ff4d4f' }}>Error: {error}</div>}
          </div>

          {/* Population */}
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700 }}>Population (WorldPop)</div>
            {popLoading ? 'Estimating…' : population?.toLocaleString() ?? '—'}
            {popError && <div style={{ color: '#ff4d4f' }}>Error: {popError}</div>}
          </div>
        </aside>

        {/* MAP DIV */}
        <div
          style={{
            flex: 1,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #ccc',
            background: '#e6e6e6',
          }}
        >
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

      {/* OUTPUT SECTION */}
      {/* ===== OUTPUT SECTION ===== */}
<div
  style={{
    marginLeft: 70,
    marginRight: 70,
    marginTop: 32,
    marginBottom: 50,
    padding: 16,
    borderRadius: 16,
    background: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  }}
>
  <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Output</h2>

  {/* Top Row: 2 Cards */}
  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
    <div
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 12,
        background: '#f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Possible Offload</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{((avgCpuUtil + avgGpuUtil) / 2 * 100).toFixed(1)}%</div>
    </div>

    <div
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 12,
        background: '#f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Total kmh Offloaded</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>
        {(availableMachines * avgMachineLoad * 0.8).toFixed(1)} kmh
      </div>
    </div>
  </div>

  {/* Bottom Row: 5 Cards */}
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {[
      { label: '# of Traffic Lights', value: count },
      { label: '# of Phones', value: 1200 },
      { label: '# of Laptops', value: 450 },
      { label: '# of Desktops', value: 320 },
      { label: '# of House Appliances', value: 780 },
    ].map((item) => (
      <div
        key={item.label}
        style={{
          flex: 1,
          minWidth: 120,
          padding: 12,
          borderRadius: 12,
          background: '#f9f9f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
      </div>
    ))}
  </div>

    {/* ===== COST SAVING & ENVIRONMENTAL IMPACT ROW ===== */}
<div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
  {[
    { 
      label: 'Cost Saving', 
      metrics: [
        { label: 'Fuel Saved', value: '1200 L' },
        { label: 'Electricity Saved', value: '450 kWh' },
        { label: 'Maintenance', value: '$320' },
        { label: 'Operational Cost', value: '$780' },
      ],
    },
    { 
      label: 'Environmental Impact', 
      metrics: [
        { label: 'CO2 Reduced', value: '1.2 t' },
        { label: 'Water Saved', value: '500 L' },
        { label: 'Waste Reduced', value: '120 kg' },
        { label: 'Recycling', value: '80%' },
      ],
    },
  ].map((section) => (
    <div
      key={section.label}
      style={{
        flex: 1,
        minWidth: 280,
        padding: 16,
        borderRadius: 12,
        background: '#f0f0f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
        {section.label}
      </div>

      {/* Inner 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {section.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              padding: 12,
              borderRadius: 10,
              background: '#ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{metric.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>

    </div>
    </div>
  );
}
