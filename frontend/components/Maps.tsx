'use client';

import * as React from 'react';
import { APIProvider, Map, MapCameraChangedEvent } from '@vis.gl/react-google-maps';

export default function Maps() {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: 300,
          height: 300,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <APIProvider
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
          onLoad={() => console.log('Maps API has loaded.')}
        >
          <Map
            defaultZoom={13}
            defaultCenter={{ lat: -33.860664, lng: 151.208138 }}
            onCameraChanged={(ev: MapCameraChangedEvent) =>
              console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
            }
          />
        </APIProvider>
      </div>
    </div>
  );
}