'use client';

// components/MapView.tsx
//
// Renders the markers/center produced by the backend's geospatial route.
// Requires: npm install mapbox-gl @types/mapbox-gl
// Requires: NEXT_PUBLIC_MAPBOX_TOKEN or VITE_MAPBOX_TOKEN set in your .env.

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { BotMessage } from '../../../lib/types';

interface MapViewProps {
  mapData: NonNullable<BotMessage['mapData']>;
}

export default function MapView({ mapData }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const token = typeof process !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || '')
    : '';

  useEffect(() => {
    if (token) {
      mapboxgl.accessToken = token;
    }
  }, [token]);

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [mapData.center.lng, mapData.center.lat],
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = mapData.markers.map((marker) =>
      new mapboxgl.Marker({ color: '#0d9488' })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(marker.label))
        .addTo(map)
    );

    if (mapData.markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      mapData.markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
    }
  }, [mapData.markers]);

  if (!token) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm p-4 text-center">
        Mapbox token missing. Set NEXT_PUBLIC_MAPBOX_TOKEN in your .env file to render this map.
      </div>
    );
  }

  return <div ref={containerRef} className="h-64 w-full rounded-lg overflow-hidden" />;
}
