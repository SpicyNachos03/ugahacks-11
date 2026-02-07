'use client';

import * as React from 'react';
import { APIProvider, Map, MapCameraChangedEvent, useMap } from '@vis.gl/react-google-maps';

type LatLng = { lat: number; lng: number };

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

  // de-dupe (ways/relations can overlap with nodes sometimes)
  const seen = new Set<string>();
  return points.filter((p) => {
    const k = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

    // clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // add new markers
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

export default function Maps() {
  const [circleCenter, setCircleCenter] = React.useState<LatLng>({
    lat: -33.860664,
    lng: 151.208138,
  });
  const [radiusMeters, setRadiusMeters] = React.useState(800);

  const [signals, setSignals] = React.useState<LatLng[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch traffic lights whenever center/radius changes (with a small debounce)
  React.useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const t = setTimeout(() => {
      fetchTrafficSignals(circleCenter, radiusMeters, ctrl.signal)
        .then((pts) => setSignals(pts))
        .catch((e) => {
          if (e?.name === 'AbortError') return;
          setError(String(e?.message ?? e));
          setSignals([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [circleCenter, radiusMeters]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'transparent' }}>
      <div
        style={{
          width: 800,
          height: 600,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,10,10,0.6)',
          position: 'relative',
        }}
      >
        {/* Controls + status */}
        <div
          style={{
            position: 'absolute',
            zIndex: 2,
            top: 12,
            left: 12,
            padding: 10,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontSize: 12,
            minWidth: 220,
          }}
        >
          <div style={{ marginBottom: 6 }}>Radius: {radiusMeters} m</div>
          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
          />
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            {loading ? 'Searching traffic lights…' : `Traffic lights: ${signals.length}`}
          </div>
          {error && <div style={{ marginTop: 6, color: '#ffb4b4' }}>Error: {error}</div>}
          <div style={{ opacity: 0.8, marginTop: 6 }}>Tip: click map to move circle</div>
        </div>

        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
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
            onCameraChanged={(ev: MapCameraChangedEvent) =>
              console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
            }
          />

          <CircleOverlay center={circleCenter} radiusMeters={radiusMeters} />
          <TrafficSignalsOverlay points={signals} />
        </APIProvider>
      </div>
    </div>
  );
}