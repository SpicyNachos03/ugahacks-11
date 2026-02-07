'use client';

import * as React from 'react';
import Maps from '../../../components/Maps';
import { Header } from "../../../components/Header";

type LatLng = { lat: number; lng: number };

export default function Page() {
  const [radiusMeters, setRadiusMeters] = React.useState(800);
  const [circleCenter, setCircleCenter] = React.useState<LatLng>({
    lat: 33.753746,
    lng: -84.386330,
  });

  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="min-h-screen pt-24 bg-black"> 
      <Header />
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        gap: 16,
        padding: 16,
        background: '#0b0b0f',
      }}
    >
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
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          Traffic signals
        </div>

        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
          Radius: {radiusMeters} m
        </div>
        <input
          style={{ width: '100%' }}
          type="range"
          min={100}
          max={5000}
          step={50}
          value={radiusMeters}
          onChange={(e) => setRadiusMeters(Number(e.target.value))}
        />

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
          {loading ? 'Searching…' : `Found: ${count}`}
        </div>

        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#ffb4b4' }}>
            Error: {error}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.65 }}>
          Center:
          <br />
          {circleCenter.lat.toFixed(6)}, {circleCenter.lng.toFixed(6)}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.6 }}>
          Tip: click map to move circle
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
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
        />
      </div>
    </div>

    <div
  id="features" // this matches the header anchor
  style={{
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.10)',
  }}
>
  <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
    Output
  </h2>
  <div style={{ fontSize: 14, opacity: 0.85 }}>
    {/* You can display your map results here */}
    Found {count} traffic signals within {radiusMeters} meters of (
    {circleCenter.lat.toFixed(6)}, {circleCenter.lng.toFixed(6)}).
  </div>
</div>

    </div>
  );
}