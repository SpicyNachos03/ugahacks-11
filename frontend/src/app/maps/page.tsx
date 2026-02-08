'use client';

import * as React from 'react';
import Maps from '../../../components/Maps';
import { Header } from '../../../components/Header';
import { GoogleGenAI } from '@google/genai';

type LatLng = { lat: number; lng: number };
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
async function geminiWeatherAnalysis(
  temperatureF: number,
  humidityPct: number,
  aqi: number
) {
  const contents = `Evaluate whether this location is suitable for deploying small edge devices to participate in federated learning model training from AI data centers. Consider these environmental constraints:

Weather Data:
- Temperature: ${temperatureF}°F
- Humidity: ${humidityPct}%
- Air Quality (US AQI): ${aqi}

Suitability Criteria:
- Temperature: Optimal range is 32°F to 95°F. Below 32°F or above 95°F is NOT suitable due to device performance degradation and thermal stress.
- Humidity: Optimal range is 20% to 80%. Below 20% risks static electricity damage. Above 80% risks condensation and corrosion.
- Air Quality: AQI below 100 is suitable. AQI above 100 indicates poor air quality that can affect device cooling systems and longevity.

Based on these thresholds, determine:
1. Whether this location is SUITABLE or NOT SUITABLE for federated learning device deployment
2. Which environmental factors (if any) are problematic
3. Brief explanation of the decision`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
  });
  console.log(response.text);
  return response.text;
}
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

  const [avgCpuUtil, setAvgCpuUtil] = React.useState(0.85);
  const [avgGpuUtil, setAvgGpuUtil] = React.useState(0.85);
  const [availableMachines, setAvailableMachines] = React.useState(100);

  const [wattageLoading, setWattageLoading] = React.useState(false);
  const [wattage, setWattage] = React.useState<number | null>(null);
  const [wattageError, setWattageError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const [popLoading, setPopLoading] = React.useState(false);
  const [population, setPopulation] = React.useState<number | null>(null);
  const [popError, setPopError] = React.useState<string | null>(null);

  const [meteoLoading, setMeteoLoading] = React.useState(false);
  const [meteoError, setMeteoError] = React.useState<string | null>(null);
  const [temperatureF, setTemperatureF] = React.useState<number | null>(null);
  const [humidityPct, setHumidityPct] = React.useState<number | null>(null);
  const [aqi, setAqi] = React.useState<number | null>(null);

  // Gemini analysis state
  const [geminiLoading, setGeminiLoading] = React.useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = React.useState<string | null>(null);

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

  // Call Gemini analysis when weather variables are updated
  React.useEffect(() => {
    if (temperatureF !== null && humidityPct !== null && aqi !== null) {
      setGeminiLoading(true);
      geminiWeatherAnalysis(temperatureF, humidityPct, aqi)
        .then((result) => {
          setGeminiAnalysis(result ?? null);
          setGeminiLoading(false);
        })
        .catch((error) => {
          console.error('Gemini analysis error:', error);
          setGeminiLoading(false);
        });
    }
  }, [temperatureF, humidityPct, aqi]);

  // ===== WATTAGE POST (NEW) =====
  const debouncedAvgCpuUtil = useDebouncedValue(avgCpuUtil, 500);
  const debouncedAvgGpuUtil = useDebouncedValue(avgGpuUtil, 500);
  const debouncedAvailableMachines = useDebouncedValue(availableMachines, 500);

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
          throw new Error('Unexpected response format');
        }
        console.log('Wattage from backend:', data.Wattage);
        setWattage(data.Wattage / 1000); // Convert Wh to kWh
        setWattageLoading(false);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setWattage(null);
        setWattageError(String(e?.message ?? e));
        setWattageLoading(false);
      });

    return () => ctrl.abort();
  }, [debouncedAvgCpuUtil, debouncedAvgGpuUtil, debouncedAvailableMachines]);

  return (
    <div className="min-h-screen pt-20" style={{ background: '#f0fdf4', color: '#064e3b' }}>
      <Header />

      <div
        style={{
          display: 'flex',
          gap: 32,
          padding: '16px 32px',
          height: '600px',
        }}
      >
        {/* INPUT DIV */}
        <aside
          style={{
            width: 300,
            borderRadius: 16,
            padding: 16,
            background: '#ffffff',
            border: '1px solid #d1fae5',
            boxShadow: '0 4px 12px rgba(6, 78, 59, 0.05)',
            color: '#064e3b',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#059669' }}>Area stats</div>

          <div style={{ fontSize: 12, opacity: 0.85 }}>Radius: {radiusMeters} m</div>
          <input
            style={{ width: '100%', accentColor: '#10b981' }}
            type="range"
            min={100}
            max={10000}
            step={50}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
          />

          <div style={{ marginTop: 20, fontWeight: 700, fontSize: 13, color: '#059669' }}>Device Metrics</div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            CPU Utilization: {avgCpuUtil.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={avgCpuUtil}
              onChange={(e) => setAvgCpuUtil(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
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
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            Available Machines
            <input
              type="number"
              value={availableMachines}
              onChange={(e) => setAvailableMachines(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4, padding: '4px', border: '1px solid #d1fae5', borderRadius: '4px' }}
            />
          </div>



          <div style={{ marginTop: 12, fontSize: 12, padding: '8px', background: '#ecfdf5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: '#059669' }}>Predicted Wattage</div>
            {wattageLoading ? 'Predicting…' : wattage == null ? '—' : `${wattage.toFixed(2)} kWh`}
            {wattageError && <div style={{ color: '#ef4444' }}>Error: {wattageError}</div>}
          </div>

          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#059669' }}>Weather + Air Quality</div>
            <div>Temp: {temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F`}</div>
            <div>Humidity: {humidityPct == null ? '—' : `${Math.round(humidityPct)}%`}</div>
            <div>AQI: {aqi == null ? '—' : Math.round(aqi)}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{meteoLoading ? 'Updating…' : 'Updated'}</div>
          </div>
        </aside>

        {/* MAP DIV */}
        {/* MAP DIV WRAPPER */}
<div
  className="relative flex-1 rounded-2xl overflow-hidden border border-emerald-100 shadow-xl bg-gradient-to-b from-emerald-50 via-white to-white"
  style={{
    height: '100%',
  }}
>
  {/* Decorative Background Blobs - These sit behind the map */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
    <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-green-400/20 rounded-full blur-3xl"></div>
  </div>

  <div className="relative z-10 h-full w-full">
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
      </div>

      {/* OUTPUT SECTION */}
      <div
        style={{
          margin: '32px 70px 50px 70px',
          padding: 24,
          borderRadius: 24,
          background: '#ffffff',
          color: '#064e3b',
          border: '1px solid #d1fae5',
          boxShadow: '0 10px 25px rgba(6, 78, 59, 0.05)',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#059669' }}>Sustainability Impact Output</h2>

        {/* Top Row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              flex: 1,
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>Possible Offload</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{((avgCpuUtil + avgGpuUtil) / 2 * 100).toFixed(1)}%</div>
          </div>

          <div
            style={{
              flex: 1,
              padding: 20,
              borderRadius: 16,
              background: '#ecfdf5',
              border: '1px solid #10b981',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#059669' }}>Total kWh Offloaded</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#064e3b' }}>
              {(availableMachines * 0.8).toFixed(1)} kWh
            </div>
          </div>
        </div>

        {/* Device Grid */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Traffic Lights', value: count * 5 },
            { label: 'Phones', value: 1200 },
            { label: 'Laptops', value: 450 },
            { label: 'Desktops', value: 320 },
            { label: 'House Appliances', value: 780 },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                minWidth: 140,
                padding: 16,
                borderRadius: 16,
                background: '#ffffff',
                border: '1px solid #f0fdf4',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Impact Rows */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Cost Saving',
              color: '#059669',
              bg: '#f0fdf4',
              metrics: [
                { label: 'Fuel Saved', value: '1200 L' },
                { label: 'Electricity Saved', value: '450 kWh' },
                { label: 'Maintenance', value: '$320' },
                { label: 'Operational Cost', value: '$780' },
              ],
            },
            {
              label: 'Environmental Impact',
              color: '#10b981',
              bg: '#ecfdf5',
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
                minWidth: 300,
                padding: 20,
                borderRadius: 20,
                background: section.bg,
                border: `1px solid ${section.bg === '#f0fdf4' ? '#d1fae5' : '#a7f3d0'}`,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: section.color }}>
                {section.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {section.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: '#ffffff',
                      textAlign: 'center',
                      boxShadow: '0 2px 4px rgba(6, 78, 59, 0.03)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{metric.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#064e3b' }}>{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Gemini & Weather Grid */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Temperature', value: temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F` },
              { label: 'Humidity', value: humidityPct == null ? '—' : `${Math.round(humidityPct)}%` },
              { label: 'US AQI', value: aqi == null ? '—' : `${Math.round(aqi)}` },
            ].map((m) => (
              <div key={m.label} style={{ padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#334155' }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 2, padding: 24, borderRadius: 24, background: '#ffffff', border: '2px solid #10b981', position: 'relative' }}>
             <div style={{ position: 'absolute', top: -12, left: 24, background: '#10b981', color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: 12, fontWeight: 700 }}>
                AI INSIGHT
             </div>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5, color: '#333' }}>
                  {geminiLoading && <p style={{ margin: 0 }}>Loading analysis...</p>}
                  {geminiAnalysis && <p style={{ margin: 0 }}>{geminiAnalysis}</p>}
                  {!geminiLoading && !geminiAnalysis && <p style={{ margin: 0 }}>Analysis will appear here.</p>}
                </div>
          </div>
        </div>
      </div>
    </div>
  );
}