'use client';

import * as React from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

type LatLng = { lat: number; lng: number };

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

async function fetchTrafficSignals(center: LatLng, radiusMeters: number, signal?: AbortSignal) {
  const query = `
[out:json];
(
  node(around:${radiusMeters},${center.lat},${center.lng})["highway"="traffic_signals"];
  way(around:${radiusMeters},${center.lat},${center.lng})["highway"="traffic_signals"];
  relation(around:${radiusMeters},${center.lat},${center.lng})["highway"="traffic_signals"];
);
out center;
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ data: query }),
    signal,
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status} ${res.statusText}`);
  const json = await res.json();

  const points: LatLng[] = (json.elements || [])
    .map((el: any) => {
      if (typeof el.lat === 'number' && typeof el.lon === 'number') return { lat: el.lat, lng: el.lon };
      if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number')
        return { lat: el.center.lat, lng: el.center.lon };
      return null;
    })
    .filter(Boolean);

  const seen = new Set<string>();
  return points.filter((p) => {
    const k = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function circleToGeoJSON(center: LatLng, radiusMeters: number, steps = 48) {
  const g = (window as any).google;
  const computeOffset = g?.maps?.geometry?.spherical?.computeOffset;
  if (!computeOffset) {
    throw new Error('Google Maps geometry library not loaded. Ensure APIProvider has libraries={["geometry"]}.');
  }

  const centerLL = new g.maps.LatLng(center.lat, center.lng);
  const coords: number[][] = [];

  for (let i = 0; i < steps; i++) {
    const heading = (i * 360) / steps;
    const p = computeOffset(centerLL, radiusMeters, heading);
    coords.push([p.lng(), p.lat()]);
  }
  coords.push(coords[0]);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coords] },
      },
    ],
  };
}

async function fetchWorldPopPopulation(geojson: any, year = 2020, signal?: AbortSignal) {
  const res = await fetch('/api/worldpop-population', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      dataset: 'wpgppop',
      year,
      geojson,
      runasync: false,
    }),
  });

  // Try JSON first; if it’s not JSON, fall back to text for debugging
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? JSON.stringify(j) ?? `HTTP ${res.status}`);
    }
    throw new Error(await res.text());
  }

  return res.json() as Promise<{ total_population: number | null }>;
}

function CircleOverlay({ center, radiusMeters }: { center: LatLng; radiusMeters: number }) {
  const map = useMap();
  const circleRef = React.useRef<google.maps.Circle | null>(null);

  React.useEffect(() => {
    if (!map || !(window as any).google?.maps) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: radiusMeters,
        clickable: false,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillOpacity: 0.2,
      });
      return;
    }

    circleRef.current.setCenter(center);
    circleRef.current.setRadius(radiusMeters);
  }, [map, center, radiusMeters]);

  React.useEffect(() => {
    return () => {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, []);

  return null;
}

function TrafficSignalsOverlay({ points }: { points: LatLng[] }) {
  const map = useMap();
  const markersRef = React.useRef<google.maps.Marker[]>([]);

  React.useEffect(() => {
    if (!map || !(window as any).google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markersRef.current = points.map(
      (p) =>
        new google.maps.Marker({
          map,
          position: p,
          title: 'Traffic signal (OSM)',
        })
    );

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, points]);

  return null;
}

export default function Maps({
  radiusMeters,
  setRadiusMeters, // unused for now
  circleCenter,
  setCircleCenter,
  onStatusChange,
  onPopulationChange,
}: {
  radiusMeters: number;
  setRadiusMeters: React.Dispatch<React.SetStateAction<number>>;
  circleCenter: LatLng;
  setCircleCenter: React.Dispatch<React.SetStateAction<LatLng>>;
  onStatusChange: (s: { loading: boolean; count: number; error: string | null }) => void;
  onPopulationChange: (s: { loading: boolean; population: number | null; error: string | null }) => void;
}) {
  const [signals, setSignals] = React.useState<LatLng[]>([]);
  const [lastPop, setLastPop] = React.useState<number | null>(null);

  // Debounce inputs for POP only (so slider drag/click spam doesn’t explode)
  const debouncedCenter = useDebouncedValue(circleCenter, 650);
  const debouncedRadius = useDebouncedValue(radiusMeters, 650);

  // Traffic signals lookup (keep as-is, small debounce already)
  React.useEffect(() => {
    const ctrl = new AbortController();
    onStatusChange({ loading: true, count: signals.length, error: null });

    const t = setTimeout(() => {
      fetchTrafficSignals(circleCenter, radiusMeters, ctrl.signal)
        .then((pts) => {
          setSignals(pts);
          onStatusChange({ loading: false, count: pts.length, error: null });
        })
        .catch((e) => {
          if (e?.name === 'AbortError') return;
          setSignals([]);
          onStatusChange({ loading: false, count: 0, error: String(e?.message ?? e) });
        });
    }, 350);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleCenter, radiusMeters]);

  // Population lookup (debounced, abort-safe, preserves last value during loading)
  React.useEffect(() => {
    const ctrl = new AbortController();

    // keep lastPop on screen while loading
    onPopulationChange({ loading: true, population: lastPop, error: null });

    const t = setTimeout(() => {
      let geojson: any;
      try {
        geojson = circleToGeoJSON(debouncedCenter, debouncedRadius, 48); // fewer points => smaller payload, faster
      } catch (e: any) {
        onPopulationChange({ loading: false, population: lastPop, error: String(e?.message ?? e) });
        return;
      }

      fetchWorldPopPopulation(geojson, 2020, ctrl.signal)
        .then((out) => {
          const pop = typeof out.total_population === 'number' ? out.total_population : null;
          setLastPop(pop);
          onPopulationChange({ loading: false, population: pop, error: null });
        })
        .catch((e) => {
          if (e?.name === 'AbortError') return;
          onPopulationChange({ loading: false, population: lastPop, error: String(e?.message ?? e) });
        });
    }, 50);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCenter, debouncedRadius]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['geometry']}>
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          defaultZoom={13}
          defaultCenter={circleCenter}
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling="greedy"
          onClick={(e) => {
            const ll = e.detail.latLng;
            if (!ll) return;
            setCircleCenter({ lat: ll.lat, lng: ll.lng });
          }}
        />

        <CircleOverlay center={circleCenter} radiusMeters={radiusMeters} />
        <TrafficSignalsOverlay points={signals} />
      </APIProvider>
    </div>
  );
}