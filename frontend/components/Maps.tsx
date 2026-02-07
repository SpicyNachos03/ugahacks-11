'use client';

import * as React from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

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
  setRadiusMeters, // not used right now, but left in for future
  circleCenter,
  setCircleCenter,
  onStatusChange,
}: {
  radiusMeters: number;
  setRadiusMeters: React.Dispatch<React.SetStateAction<number>>;
  circleCenter: LatLng;
  setCircleCenter: React.Dispatch<React.SetStateAction<LatLng>>;
  onStatusChange: (s: { loading: boolean; count: number; error: string | null }) => void;
}) {
  const [signals, setSignals] = React.useState<LatLng[]>([]);

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

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
        />

        <CircleOverlay center={circleCenter} radiusMeters={radiusMeters} />
        <TrafficSignalsOverlay points={signals} />
      </APIProvider>
    </div>
  );
}