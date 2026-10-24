"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import type { NocapPlace, NocapPlaceCategory } from "@/lib/nocap/places";
import type { NocapReview } from "@/lib/nocap/community";
import type { NocapUserPlace } from "@/lib/nocap/community";

export type NocapMapHandle = {
  flyToUser: (lat: number, lng: number, zoom?: number) => void;
  showRadiusCircle: (lat: number, lng: number, radiusKm: number) => void;
  hideRadiusCircle: () => void;
  enterPinMode: () => void;
  exitPinMode: () => void;
};

type NocapMapProps = {
  places: NocapPlace[];
  reviews: NocapReview[];
  userPlaces: NocapUserPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  onSelectUserPlace: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  pendingPin?: { lat: number; lng: number } | null;
  onPinDrop?: (lat: number, lng: number) => void;
};

type MapLibreModule = typeof import("maplibre-gl");
type PlaceFeature = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: { id: string; category: NocapPlaceCategory; label: string; selected: boolean } };
type PlaceFeatureCollection = { type: "FeatureCollection"; features: PlaceFeature[] };

const sourceId = "nocap-places";
const haloLayerId = "nocap-place-halos";
const dotLayerId = "nocap-place-dots";
const radiusSourceId = "nocap-radius";
const radiusLayerId = "nocap-radius-fill";
const radiusBorderLayerId = "nocap-radius-border";
const emptyPlaces: PlaceFeatureCollection = { type: "FeatureCollection", features: [] };
const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY;
const tileUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKey ? `?key=${cartoKey}` : ""}`;

function mapStyle(): StyleSpecification {
  return { version: 8, sources: { nocapBase: { type: "raster", tiles: [tileUrl], tileSize: 256, maxzoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' } }, layers: [{ id: "nocap-background", type: "background", paint: { "background-color": "#e9e7e2" } }, { id: "nocap-base", type: "raster", source: "nocapBase", minzoom: 0, maxzoom: 22, paint: { "raster-fade-duration": 0 } }] } as StyleSpecification;
}

function placeData(places: NocapPlace[], selectedPlaceId: string | null): PlaceFeatureCollection {
  return { type: "FeatureCollection", features: places.map((place) => ({ type: "Feature", geometry: { type: "Point", coordinates: [place.longitude, place.latitude] }, properties: { id: place.id, category: place.category, label: place.category === "eat" ? "F" : place.category === "street" ? "S" : place.category === "park" ? "P" : "C", selected: place.id === selectedPlaceId } })) };
}

function ensurePlaceLayers(map: MapLibreMap) {
  if (!map.getSource(sourceId)) map.addSource(sourceId, { type: "geojson", data: emptyPlaces });
  if (!map.getLayer(haloLayerId)) map.addLayer({ id: haloLayerId, type: "circle", source: sourceId, paint: { "circle-radius": ["case", ["get", "selected"], 16, 12], "circle-color": "#ffffff", "circle-opacity": 0.5, "circle-stroke-width": 0 } });
  if (!map.getLayer(dotLayerId)) map.addLayer({ id: dotLayerId, type: "circle", source: sourceId, paint: { "circle-radius": ["case", ["get", "selected"], 5, 4], "circle-color": ["match", ["get", "category"], "eat", "#d9381e", "street", "#2563eb", "park", "#15803d", "#7c3aed"], "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" } });
}

function radiusGeoJSON(lat: number, lng: number, radiusKm: number) {
  const points = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const dy = radiusKm / 110.574;
    coords.push([lng + dx * Math.cos(angle), lat + dy * Math.sin(angle)]);
  }
  return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [coords] }, properties: {} }] };
}

export const NocapMap = forwardRef<NocapMapHandle, NocapMapProps>(function NocapMap(
  { places, reviews, userPlaces, selectedPlaceId, onSelectPlace, onSelectUserPlace, userLocation, pendingPin, onPinDrop },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placeMarkersRef = useRef<Marker[]>([]);
  const userPlaceMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const pendingPinMarkerRef = useRef<Marker | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSelectUserPlaceRef = useRef(onSelectUserPlace);
  const onPinDropRef = useRef(onPinDrop);
  const pinModeRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  const mapPlaces = useMemo(() => placeData(places, selectedPlaceId), [places, selectedPlaceId]);

  useEffect(() => { onSelectPlaceRef.current = onSelectPlace; }, [onSelectPlace]);
  useEffect(() => { onSelectUserPlaceRef.current = onSelectUserPlace; }, [onSelectUserPlace]);
  useEffect(() => { onPinDropRef.current = onPinDrop; }, [onPinDrop]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    flyToUser(lat: number, lng: number, zoom = 16) {
      const map = mapRef.current;
      if (!map) return;
      const insideBLR = lat >= 12.72 && lat <= 13.2 && lng >= 77.34 && lng <= 77.9;
      if (!insideBLR) {
        // If user is outside Bengaluru bounds, lift maxBounds so map camera can freely zoom to user's real location
        map.setMaxBounds(undefined);
      } else {
        map.setMaxBounds([
          [77.34, 12.72],
          [77.9, 13.2],
        ]);
      }
      map.flyTo({ center: [lng, lat], zoom, duration: 1000, essential: true });
    },
    showRadiusCircle(lat: number, lng: number, radiusKm: number) {
      const map = mapRef.current;
      if (!map) return;
      const data = radiusGeoJSON(lat, lng, radiusKm);
      try {
        if (!map.getSource(radiusSourceId)) {
          if (!map.isStyleLoaded()) {
            map.once("styledata", () => {
              try {
                if (!map.getSource(radiusSourceId)) {
                  map.addSource(radiusSourceId, { type: "geojson", data });
                  map.addLayer({ id: radiusLayerId, type: "fill", source: radiusSourceId, paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 } }, haloLayerId);
                  map.addLayer({ id: radiusBorderLayerId, type: "line", source: radiusSourceId, paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.4, "line-dasharray": [3, 3] } }, haloLayerId);
                }
              } catch (_) {}
            });
            return;
          }
          map.addSource(radiusSourceId, { type: "geojson", data });
          map.addLayer({ id: radiusLayerId, type: "fill", source: radiusSourceId, paint: { "fill-color": "#3b82f6", "fill-opacity": 0.08 } }, haloLayerId);
          map.addLayer({ id: radiusBorderLayerId, type: "line", source: radiusSourceId, paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.4, "line-dasharray": [3, 3] } }, haloLayerId);
        } else {
          (map.getSource(radiusSourceId) as GeoJSONSource).setData(data);
        }
      } catch (_) {}
    },
    hideRadiusCircle() {
      const map = mapRef.current;
      if (!map) return;
      try {
        if (map.getLayer(radiusLayerId)) map.removeLayer(radiusLayerId);
        if (map.getLayer(radiusBorderLayerId)) map.removeLayer(radiusBorderLayerId);
        if (map.getSource(radiusSourceId)) map.removeSource(radiusSourceId);
      } catch (_) {}
    },
    enterPinMode() {
      pinModeRef.current = true;
      const canvas = mapRef.current?.getCanvas();
      if (canvas) canvas.style.cursor = "crosshair";
    },
    exitPinMode() {
      pinModeRef.current = false;
      const canvas = mapRef.current?.getCanvas();
      if (canvas) canvas.style.cursor = "";
    },
  }), [mapReady]);

  // Boot map
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!containerRef.current || mapRef.current) return;
      const maplibregl: MapLibreModule = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle(),
        center: [77.6046, 12.9716],
        zoom: 11,
        minZoom: 10,
        maxZoom: 18,
        maxBounds: [
          [77.34, 12.72],
          [77.9, 13.2],
        ],
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => { if (!cancelled) { ensurePlaceLayers(map); map.resize(); setMapReady(true); } });
      map.on("zoom", () => { setZoomedIn(map.getZoom() >= 13.5); });
      let clickedFeature = false;
      map.on("click", haloLayerId, (event) => {
        if (pinModeRef.current) return; // let the general click handle it
        clickedFeature = true;
        setTimeout(() => { clickedFeature = false; }, 200);
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectPlaceRef.current(id);
      });
      // General map click for dropping a pin / creating a new dot
      map.on("click", (event) => {
        if (clickedFeature) return;
        const { lng, lat } = event.lngLat;
        onPinDropRef.current?.(lat, lng);
      });
      map.on("mouseenter", haloLayerId, () => { if (!pinModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", haloLayerId, () => { if (!pinModeRef.current) map.getCanvas().style.cursor = ""; });
    }
    boot();
    return () => { cancelled = true; placeMarkersRef.current.forEach((m) => m.remove()); userPlaceMarkersRef.current.forEach((m) => m.remove()); userMarkerRef.current?.remove(); mapRef.current?.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Update GeoJSON data
  useEffect(() => { const map = mapRef.current; if (!map || !mapReady) return; ensurePlaceLayers(map); (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData(mapPlaces); }, [mapPlaces, mapReady]);

  // Render photo markers for hardcoded places
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const targetMap = map;
    let cancelled = false;
    async function renderPlaceMarkers() {
      const maplibregl: MapLibreModule = await import("maplibre-gl");
      if (cancelled || mapRef.current !== targetMap) return;
      placeMarkersRef.current.forEach((m) => m.remove());
      placeMarkersRef.current = places.map((place) => {
        const anchor = document.createElement("div");
        const marker = document.createElement("button");
        const label = place.category === "eat" ? "F" : place.category === "street" ? "S" : place.category === "park" ? "P" : "C";
        const image = document.createElement("img");
        marker.type = "button";
        marker.className = `nocap-marker nocap-marker--${place.category}${place.id === selectedPlaceId ? " is-selected" : ""}`;
        marker.setAttribute("aria-label", `Open reviews for ${place.name}`);
        marker.textContent = label;
        image.className = "nocap-marker-photo";
        image.alt = "";
        image.loading = "lazy";
        image.src = `/api/nocap/place-image/${place.id}`;
        image.addEventListener("error", () => image.remove());
        marker.append(image);
        const nameLabel = document.createElement("span");
        nameLabel.className = "nocap-marker-label";
        nameLabel.textContent = place.name.length > 16 ? place.name.slice(0, 14) + "\u2026" : place.name;
        anchor.append(marker);
        if (mapRef.current && mapRef.current.getZoom() >= 13.5) anchor.append(nameLabel);
        marker.addEventListener("click", (event) => { event.stopPropagation(); if (!pinModeRef.current) onSelectPlaceRef.current(place.id); });
        return new maplibregl.Marker({ element: anchor, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(targetMap);
      });
    }
    renderPlaceMarkers();
    return () => { cancelled = true; placeMarkersRef.current.forEach((m) => m.remove()); placeMarkersRef.current = []; };
  }, [mapReady, places, selectedPlaceId, zoomedIn]);

  // Render user-pinned place markers (yellow/orange)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const targetMap = map;
    let cancelled = false;
    async function renderUserPlaceMarkers() {
      const maplibregl: MapLibreModule = await import("maplibre-gl");
      if (cancelled || mapRef.current !== targetMap) return;
      userPlaceMarkersRef.current.forEach((m) => m.remove());
      userPlaceMarkersRef.current = userPlaces.map((up) => {
        const anchor = document.createElement("div");
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = `nocap-marker nocap-marker--user${up.id === selectedPlaceId ? " is-selected" : ""}`;
        marker.setAttribute("aria-label", `Open reviews for ${up.name}`);
        marker.textContent = "U";
        const nameLabel = document.createElement("span");
        nameLabel.className = "nocap-marker-label";
        nameLabel.textContent = up.name.length > 16 ? up.name.slice(0, 14) + "\u2026" : up.name;
        anchor.append(marker);
        if (mapRef.current && mapRef.current.getZoom() >= 13.5) anchor.append(nameLabel);
        marker.addEventListener("click", (event) => { event.stopPropagation(); if (!pinModeRef.current) onSelectUserPlaceRef.current(up.id); });
        return new maplibregl.Marker({ element: anchor, anchor: "center" }).setLngLat([up.longitude, up.latitude]).addTo(targetMap);
      });
    }
    renderUserPlaceMarkers();
    return () => { cancelled = true; userPlaceMarkersRef.current.forEach((m) => m.remove()); userPlaceMarkersRef.current = []; };
  }, [mapReady, userPlaces, selectedPlaceId, zoomedIn]);

  // User location blue dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    async function renderUserDot() {
      if (!userLocation) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
        return;
      }
      const maplibregl: MapLibreModule = await import("maplibre-gl");
      if (cancelled) return;
      const dot = document.createElement("div");
      dot.className = "nocap-user-dot";
      userMarkerRef.current = new maplibregl.Marker({ element: dot, anchor: "center" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map!);
    }
    renderUserDot();
    return () => { cancelled = true; };
  }, [mapReady, userLocation]);

  // Pending pin marker (pulsing amber pin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    async function renderPendingPin() {
      if (!pendingPin) {
        pendingPinMarkerRef.current?.remove();
        pendingPinMarkerRef.current = null;
        return;
      }
      const maplibregl: MapLibreModule = await import("maplibre-gl");
      if (cancelled) return;
      pendingPinMarkerRef.current?.remove();
      const el = document.createElement("div");
      el.className = "nocap-pending-pin-marker";
      el.innerHTML = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translateY(-14px);cursor:pointer;">
          <div style="position:absolute;width:40px;height:40px;border-radius:999px;background:rgba(245,158,11,0.35);animation:nocap-pulse 1.5s ease-in-out infinite;"></div>
          <div style="width:30px;height:30px;border-radius:999px;background:#f59e0b;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;">
            📍
          </div>
        </div>
      `;
      pendingPinMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pendingPin.lng, pendingPin.lat])
        .addTo(map!);
    }
    renderPendingPin();
    return () => { cancelled = true; };
  }, [mapReady, pendingPin]);

  // Fly to selected place
  useEffect(() => { const place = places.find((item) => item.id === selectedPlaceId) || userPlaces.find((item) => item.id === selectedPlaceId); if (place && mapRef.current) mapRef.current.flyTo({ center: [place.longitude, place.latitude], zoom: 14.5, duration: 650, essential: true }); }, [places, userPlaces, selectedPlaceId]);

  return <div className="relative h-full w-full overflow-hidden"><div ref={containerRef} className="h-full w-full" /><div className="pointer-events-none absolute left-3 top-3 z-10 hidden lg:flex overflow-hidden rounded-lg border border-white/80 bg-white/94 text-[11px] font-semibold text-zinc-600 shadow-sm backdrop-blur"><span className="bg-zinc-900 px-3 py-2 text-white">Bengaluru</span><span className="px-3 py-2">Community map</span></div><div className="pointer-events-none absolute bottom-4 left-3 z-10 hidden rounded-lg border border-white/80 bg-white/94 px-3 py-2 text-xs text-zinc-600 shadow-sm backdrop-blur sm:block">Tap any spot to see honest takes and wait times.</div></div>;
});
