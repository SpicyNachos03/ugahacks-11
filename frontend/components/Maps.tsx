'use client';

import React, { useEffect, useState } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';


export default function Maps() {
  const [apiKey, setApiKey] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const tryLoadKey = () => {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (key && typeof key === 'string' && key.length > 0) {
        if (!cancelled) setApiKey(key);
        return;
      }

      if (!cancelled) setAttempts((a) => a + 1);

      // retry
      setTimeout(tryLoadKey, 250);
    };

    tryLoadKey();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!apiKey) {
    return (
      <div style={{ width: '50%', height: '50%', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div>Waiting for GOOGLE_MAPS_API_KEY…</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Attempts: {attempts}</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            If you just added it to <code>.env.local</code>, restart <code>npm run dev</code>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <APIProvider apiKey={apiKey} onLoad={() => console.log('Maps API has loaded.')}>
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: -33.860664, lng: 151.208138 }}
        />
      </APIProvider>
    </div>
  );
}