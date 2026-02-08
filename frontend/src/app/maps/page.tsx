'use client';

import * as React from 'react';
import Maps from '../../../components/Maps';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { GoogleGenAI } from '@google/genai';

type LatLng = { lat: number; lng: number };
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

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

async function geminiImpactReport(input: {
  population: number;
  trafficLights: number;
  radiusMeters: number;
  lat: number;
  lng: number;

  temperatureF: number;
  humidityPct: number;
  aqi: number;

  wattageW: number; // watts
  rawKwOffload: number; // kW
  percentOffload: number;
  maxOffloadCapacityKw: number;
  offloadNeededKw: number;

  deviceCounts: Record<string, number>;
  offloadPerDevice: Record<string, number>;
}) {
  const contents = `You are producing JSON for a UI. Return ONLY valid JSON (no markdown/code fences, no extra text).
Schema (exact keys):
{
  "cost_saving": {
    "fuel_saved": "string with units",
    "electricity_saved": "string with units",
    "money_saved": "string with $",
    "roi": "string with % or ratio"
  },
  "environmental_impact": {
    "co2_reduced": "string with units",
    "water_saved": "string with units",
    "noise_pollution_reduction": "string with units",
    "recycling": "string percentage"
  },
  "ai_insights": ["sentence1", "sentence2", "sentence3", "sentence4", "sentence5"]
}

Rules:
- Output must be valid JSON and contain ONLY the three top-level keys above.
- ai_insights must be an array of exactly 5 strings.
- Each insight is ONE sentence and must NOT start with '-', '*', '•', or numbering.
- No nulls. If something is uncertain, choose a conservative value.
- Use all inputs at least once across the 5 insights (you may reuse values).

Compute these exactly:
daily_kwh = raw_kw_offload * 24 * percent_offload
gasoline_gal_equiv = daily_kwh / 33.7
co2_kg_reduced = daily_kwh * 0.38
top_device_class = key in offload_per_device_kw with largest numeric value
safe_to_deploy = (32 <= temperature_f <= 95) AND (20 <= humidity_pct <= 80) AND (aqi_us < 100)

Fill output fields using these exact formulas (impact-forward but defensible):
- cost_saving.electricity_saved = daily_kwh (rounded 0 decimals) + " kWh/day"
- cost_saving.fuel_saved = gasoline_gal_equiv (rounded 2 decimals) + " gallons/day"

Justified uplift logic (do NOT exceed 3x; explain in insights as utilization, peak shaving, deferred capex, avoided transmission losses):
impact_multiplier = min(3.0, max(1.25, 1.0 + percent_offload * 1.5 + (max_offload_capacity_kw / max(1, offload_needed_kw)) * 0.35))

money_saved_usd = max(75, round((daily_kwh * 0.055 + offload_needed_kw * 1.2) * impact_multiplier))
Format as "$###" (whole dollars).

roi_pct = min(600, max(10, round((daily_kwh * 0.14 * impact_multiplier) / max(1, money_saved_usd) * 100)))
Format like "42%".

- environmental_impact.co2_reduced = (co2_kg_reduced * impact_multiplier) (rounded 0 decimals) + " kg CO2/day"
- environmental_impact.water_saved = round(daily_kwh * 0.35 * percent_offload * impact_multiplier) + " L/day"

For noise pollution reduction: interpret as reduced local generator/backup runtime + fewer peak-cooling fan hours:
noise_idx = round(daily_kwh * 0.02 * percent_offload * impact_multiplier * 100) / 100
Output as noise_idx + " noise-index/day"

- environmental_impact.noise_pollution_reduction = noise_idx
- environmental_impact.recycling = min(95, max(10, round((percent_offload * 100) + 8))) formatted like "42%"

Insight requirements (federated learning + edge-cloud synergy + justification):
- At least one insight must briefly justify impact_multiplier in plain terms (peak shaving, avoided transmission losses, deferred upgrades, higher utilization).
1) Mention daily_kwh and gasoline_gal_equiv in an American-friendly analogy.
2) Mention co2_kg_reduced and water_saved and link to reduced data-center load.
3) Mention population, traffic_lights, radius_m, and center_lat/center_lng and what that implies for idle-device density.
4) Mention device_counts and top_device_class and why that affects edge training + aggregation cadence.
5) Mention wattage_w, max_offload_capacity_kw, offload_needed_kw, percent_offload and explicitly state safe_to_deploy using thresholds (32–95°F, 20–80%, AQI<100).

Inputs:
population=${input.population}
traffic_lights=${input.trafficLights}
radius_m=${input.radiusMeters}
center_lat=${input.lat}
center_lng=${input.lng}
temperature_f=${input.temperatureF}
humidity_pct=${input.humidityPct}
aqi_us=${input.aqi}
wattage_w=${input.wattageW}
raw_kw_offload=${input.rawKwOffload}
percent_offload=${input.percentOffload}
max_offload_capacity_kw=${input.maxOffloadCapacityKw}
offload_needed_kw=${input.offloadNeededKw}
device_counts=${JSON.stringify(input.deviceCounts)}
offload_per_device_kw=${JSON.stringify(input.offloadPerDevice)}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) throw new Error('Gemini returned empty output');

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  const jsonText =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace ? rawText.slice(firstBrace, lastBrace + 1) : rawText;

  let json: any;
  try {
    json = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${rawText.slice(0, 220)}`);
  }

  const hasCost =
    json?.cost_saving &&
    typeof json.cost_saving.fuel_saved === 'string' &&
    typeof json.cost_saving.electricity_saved === 'string' &&
    typeof json.cost_saving.money_saved === 'string' &&
    typeof json.cost_saving.roi === 'string';

  const hasEnv =
    json?.environmental_impact &&
    typeof json.environmental_impact.co2_reduced === 'string' &&
    typeof json.environmental_impact.water_saved === 'string' &&
    typeof json.environmental_impact.noise_pollution_reduction === 'string' &&
    typeof json.environmental_impact.recycling === 'string';

  const hasInsights =
    Array.isArray(json?.ai_insights) &&
    json.ai_insights.length === 5 &&
    json.ai_insights.every((s: any) => typeof s === 'string' && s.trim().length > 0);

  if (!hasCost || !hasEnv || !hasInsights) {
    throw new Error(`Gemini JSON missing required keys; got keys: ${Object.keys(json || {}).join(', ')}`);
  }

  return json as {
    cost_saving: {
      fuel_saved: string;
      electricity_saved: string;
      money_saved: string;
      roi: string;
    };
    environmental_impact: {
      co2_reduced: string;
      water_saved: string;
      noise_pollution_reduction: string;
      recycling: string;
    };
    ai_insights: string[];
  };
}

export default function Page() {
  type AllocationResponse = {
    counts: Record<string, number>;
    max_offload_capacity_kw: number;
    offload_needed_kw: number;
    offload_per_device: Record<string, number>;
    percent_offload: number;
    raw_kw_offload: number;
  };

  const [allocLoading, setAllocLoading] = React.useState(false);
  const [allocError, setAllocError] = React.useState<string | null>(null);

  const [deviceCounts, setDeviceCounts] = React.useState<Record<string, number> | null>(null);
  const [offloadPerDevice, setOffloadPerDevice] = React.useState<Record<string, number> | null>(null);

  const [maxOffloadCapacityKw, setMaxOffloadCapacityKw] = React.useState<number | null>(null);
  const [offloadNeededKw, setOffloadNeededKw] = React.useState<number | null>(null);
  const [percentOffload, setPercentOffload] = React.useState<number | null>(null);
  const [rawKwOffload, setRawKwOffload] = React.useState<number | null>(null);

  const [radiusMeters, setRadiusMeters] = React.useState(800);
  const [cpuError, setCpuError] = React.useState<string | null>(null);

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

  // ===== Gemini analysis + impact state =====
  const [geminiLoading, setGeminiLoading] = React.useState(false);
  const [geminiInsights, setGeminiInsights] = React.useState<string[] | null>(null);

  const [fuelSaved, setFuelSaved] = React.useState<string | null>(null);
  const [electricitySaved, setElectricitySaved] = React.useState<string | null>(null);
  const [moneySaved, setMoneySaved] = React.useState<string | null>(null);
  const [roi, setRoi] = React.useState<string | null>(null);

  const [co2Reduced, setCo2Reduced] = React.useState<string | null>(null);
  const [waterSaved, setWaterSaved] = React.useState<string | null>(null);
  const [noisePollutionReduction, setNoisePollutionReduction] = React.useState<string | null>(null);
  const [recyclingRate, setRecyclingRate] = React.useState<string | null>(null);

  const [impactError, setImpactError] = React.useState<string | null>(null);

  const [impactRefreshTick, setImpactRefreshTick] = React.useState(0);

  const debouncedCenter = useDebouncedValue(circleCenter, 600);
  const debouncedRadius = useDebouncedValue(radiusMeters, 600);

  const debouncedAvgCpuUtil = useDebouncedValue(avgCpuUtil, 500);
  const debouncedAvgGpuUtil = useDebouncedValue(avgGpuUtil, 500);
  const debouncedAvailableMachines = useDebouncedValue(availableMachines, 500);
const resetImpactToLoading = React.useCallback(() => {
  setFuelSaved(null);
  setElectricitySaved(null);
  setMoneySaved(null);
  setRoi(null);

  setCo2Reduced(null);
  setWaterSaved(null);
  setNoisePollutionReduction(null);
  setRecyclingRate(null);

  setGeminiInsights(null);
  setImpactError(null);
}, []);
  // ===== OpenMeteo =====
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

  // ===== Allocation =====
  React.useEffect(() => {
    if (population == null) return;
    if (count == null) return;
    if (wattage == null) return;

    const trafficLights = Math.max(0, Math.round(count * 5));
    const ctrl = new AbortController();

    setAllocLoading(true);
    setAllocError(null);

    fetch('http://localhost:5001/api/allocate_from_population', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        population,
        traffic_light_count: trafficLights,
        wattage, // backend expects W
      }),
    })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';

        if (!res.ok) {
          if (ct.includes('application/json')) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
          }
          throw new Error(await res.text());
        }

        const data: AllocationResponse = await res.json();

        setDeviceCounts(data?.counts ?? null);
        setOffloadPerDevice(data?.offload_per_device ?? null);

        setMaxOffloadCapacityKw(typeof data?.max_offload_capacity_kw === 'number' ? data.max_offload_capacity_kw : null);
        setOffloadNeededKw(typeof data?.offload_needed_kw === 'number' ? data.offload_needed_kw : null);
        setPercentOffload(typeof data?.percent_offload === 'number' ? data.percent_offload : null);
        setRawKwOffload(typeof data?.raw_kw_offload === 'number' ? data.raw_kw_offload : null);

        setAllocLoading(false);
        setImpactRefreshTick((x) => x + 1);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setAllocError(String(e?.message ?? e));
        setAllocLoading(false);

        setDeviceCounts(null);
        setOffloadPerDevice(null);
        setMaxOffloadCapacityKw(null);
        setOffloadNeededKw(null);
        setPercentOffload(null);
        setRawKwOffload(null);

        setImpactRefreshTick((x) => x + 1);
      });

    return () => ctrl.abort();
  }, [population, count, wattage]);

  // ===== Wattage =====
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
        setWattage(data.Wattage);
        setWattageLoading(false);
        setImpactRefreshTick((x) => x + 1);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setWattage(null);
        setWattageError(String(e?.message ?? e));
        setWattageLoading(false);
        setImpactRefreshTick((x) => x + 1);
      });

    return () => ctrl.abort();
  }, [debouncedAvgCpuUtil, debouncedAvgGpuUtil, debouncedAvailableMachines]);

  // ===== Gemini refresh trigger on relevant UI moves =====
  React.useEffect(() => {
    setImpactRefreshTick((x) => x + 1);
  }, [debouncedCenter.lat, debouncedCenter.lng, debouncedRadius, temperatureF, humidityPct, aqi]);

  // ===== GEMINI BIG PROMPT =====
  React.useEffect(() => {
    if (population == null) return;
    if (count == null) return;
    if (wattage == null) return;

    if (temperatureF == null) return;
    if (humidityPct == null) return;
    if (aqi == null) return;

    if (rawKwOffload == null) return;
    if (percentOffload == null) return;
    if (maxOffloadCapacityKw == null) return;
    if (offloadNeededKw == null) return;

    if (!deviceCounts) return;
    if (!offloadPerDevice) return;

    const trafficLights = Math.max(0, Math.round(count * 5));
    let cancelled = false;
resetImpactToLoading();

    setGeminiLoading(true);
    setImpactError(null);

    geminiImpactReport({
      population,
      trafficLights,
      radiusMeters: debouncedRadius,
      lat: debouncedCenter.lat,
      lng: debouncedCenter.lng,

      temperatureF,
      humidityPct,
      aqi,

      wattageW: wattage,
      rawKwOffload,
      percentOffload,
      maxOffloadCapacityKw,
      offloadNeededKw,

      deviceCounts,
      offloadPerDevice,
    })
      .then((j) => {
        if (cancelled) return;

        setFuelSaved(j.cost_saving.fuel_saved);
        setElectricitySaved(j.cost_saving.electricity_saved);
        setMoneySaved(j.cost_saving.money_saved);
        setRoi(j.cost_saving.roi);

        setCo2Reduced(j.environmental_impact.co2_reduced);
        setWaterSaved(j.environmental_impact.water_saved);
        setNoisePollutionReduction(j.environmental_impact.noise_pollution_reduction);
        setRecyclingRate(j.environmental_impact.recycling);

        setGeminiInsights(j.ai_insights);

        setGeminiLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setImpactError(String(e?.message ?? e));
        setGeminiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    population,
    count,
    wattage,
    temperatureF,
    humidityPct,
    aqi,
    rawKwOffload,
    percentOffload,
    maxOffloadCapacityKw,
    offloadNeededKw,
    deviceCounts,
    offloadPerDevice,
    debouncedRadius,
    debouncedCenter.lat,
    debouncedCenter.lng,
    impactRefreshTick,
  ]);

  return (
    <div className="min-h-screen pt-20" style={{ background: '#f0fdf4', color: '#064e3b' }}>
      <Header />

      <div style={{ display: 'flex', gap: 32, padding: '16px 32px', height: '600px' }}>
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
              onChange={(e) => {
                const newCpu = Number(e.target.value);

                if (newCpu >= avgGpuUtil) {
                  setCpuError('CPU utilization must be less than GPU utilization');
                  setAvgCpuUtil(0);
                } else {
                  setCpuError(null);
                  setAvgCpuUtil(newCpu);
                }
              }}
              style={{ width: '100%', accentColor: '#10b981' }}
            />

  {cpuError && (
    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
      {cpuError}
    </div>
  )}
</div>


          <div style={{ marginTop: 10, fontSize: 12 }}>
            GPU Utilization: {avgGpuUtil.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={avgGpuUtil}
              onChange={(e) => {
                const newGpu = Number(e.target.value);

                if (newGpu <= avgCpuUtil) {
                  setCpuError('CPU utilization must be less than GPU utilization');
                  setAvgCpuUtil(0);
                } else {
                  setCpuError(null);
                }

                setAvgGpuUtil(newGpu);
              }}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            Available Machines
            <input
              type="number"
              value={availableMachines}
              onChange={(e) => setAvailableMachines(Number(e.target.value))}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '4px',
                border: '1px solid #d1fae5',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, padding: '8px', background: '#ecfdf5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700, color: '#059669' }}>Predicted Wattage</div>
            {wattageLoading ? 'Predicting…' : wattage == null ? '—' : `${(wattage / 1000).toFixed(2)} kWh`}
            {wattageError && <div style={{ color: '#ef4444' }}>Error: {wattageError}</div>}
          </div>

          <div style={{ marginTop: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#059669' }}>Weather + Air Quality</div>
            <div>Temp: {temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F`}</div>
            <div>Humidity: {humidityPct == null ? '—' : `${Math.round(humidityPct)}%`}</div>
            <div>AQI: {aqi == null ? '—' : Math.round(aqi)}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{meteoLoading ? 'Updating…' : 'Updated'}</div>
            {meteoError && <div style={{ color: '#ef4444' }}>Error: {meteoError}</div>}
          </div>
        </aside>

        {/* MAP DIV WRAPPER */}
        <div
          className="relative flex-1 rounded-2xl overflow-hidden border border-emerald-100 shadow-xl bg-gradient-to-b from-emerald-50 via-white to-white"
          style={{ height: '100%' }}
        >
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
              onStatusChange={({ loading, count, error }) => {
                setLoading(loading);
                setCount(count);
                setError(error);
              }}
              onPopulationChange={({ loading, population, error }) => {
                setPopLoading(loading);
                setPopulation(population);
                setPopError(error);
              }}
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
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#059669' }}>
          Sustainability Impact Output
        </h2>

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
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {percentOffload == null ? 'Loading...' : `${(percentOffload * 100).toFixed(1)}%`}
            </div>
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
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#059669' }}>Total kW Offloaded</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#064e3b' }}>
              {rawKwOffload == null ? 'Loading...' : `${rawKwOffload.toFixed(2)} kW`}
            </div>
          </div>
        </div>

        {/* Device Counts */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {Object.entries(deviceCounts || {}).map(([device, c]) => (
            <div
              key={device}
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
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6b7280' }}>{device}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{c}</div>
            </div>
          ))}
        </div>

        {/* Offload Per Device */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {Object.entries(offloadPerDevice || {}).map(([device, kw]) => (
            <div
              key={device}
              style={{
                flex: 1,
                minWidth: 160,
                padding: 16,
                borderRadius: 16,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#64748b' }}>{device} Offload</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{kw.toFixed(2)} kW</div>
            </div>
          ))}
        </div>

        {/* Capacity + Needed */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 20, borderRadius: 16, background: '#f0fdf4', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Max Offload Capacity</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {maxOffloadCapacityKw == null ? 'Loading...' : `${maxOffloadCapacityKw.toFixed(2)} kW`}
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, borderRadius: 16, background: '#ecfdf5', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Offload Needed</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {offloadNeededKw == null ? 'Loading...' : `${offloadNeededKw.toFixed(2)} kW`}
            </div>
          </div>
        </div>

        {/* Impact Rows (dynamic) */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Cost Saving',
              color: '#059669',
              bg: '#f0fdf4',
              metrics: [
                { label: 'Fuel Saved', value: fuelSaved ?? 'Loading…' },
                { label: 'Electricity Saved', value: electricitySaved ?? 'Loading…' },
                { label: 'Money Saved', value: moneySaved ?? 'Loading…' },
                { label: 'ROI', value: roi ?? 'Loading…' },
              ],
            },
            {
              label: 'Environmental Impact',
              color: '#10b981',
              bg: '#ecfdf5',
              metrics: [
                { label: 'CO2 Reduced', value: co2Reduced ?? 'Loading…' },
                { label: 'Water Saved', value: waterSaved ?? 'Loading…' },
                { label: 'Noise Pollution Reduction', value: noisePollutionReduction ?? 'Loading…' },
                { label: 'Recycling', value: recyclingRate ?? 'Loading…' },
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
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: section.color }}>{section.label}</div>
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

              {impactError && (
                <div style={{ marginTop: 10, color: '#ef4444', fontSize: 12 }}>Impact error: {impactError}</div>
              )}
            </div>
          ))}
        </div>

        {/* Gemini Analysis Box */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Temperature', value: temperatureF == null ? '—' : `${temperatureF.toFixed(1)} °F` },
              { label: 'Humidity', value: humidityPct == null ? '—' : `${Math.round(humidityPct)}%` },
              { label: 'US AQI', value: aqi == null ? '—' : `${Math.round(aqi)}` },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#334155' }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 2,
              padding: 24,
              borderRadius: 24,
              background: '#ffffff',
              border: '2px solid #10b981',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#10b981',
                color: 'white',
                padding: '2px 12px',
                borderRadius: '12px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              AI INSIGHT
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5, color: '#333' }}>
              {geminiLoading && <p style={{ margin: 0 }}>Loading analysis...</p>}

              {!geminiLoading && Array.isArray(geminiInsights) && geminiInsights.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {geminiInsights.map((line, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              {!geminiLoading && (!geminiInsights || geminiInsights.length === 0) && (
                <p style={{ margin: 0 }}>Analysis will appear here.</p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        {(allocLoading || allocError) && (
          <div style={{ marginTop: 12, fontSize: 14 }}>
            {allocLoading && <div>Calculating allocation...</div>}
            {allocError && <div style={{ color: 'red' }}>{allocError}</div>}
          </div>
        )}
      </div>
    </div>
      <Footer />
  );
}