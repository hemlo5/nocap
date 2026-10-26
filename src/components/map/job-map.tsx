"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Marker,
  Popup,
  StyleSpecification,
} from "maplibre-gl";
import type { Coordinates, MapEntity, MapEntityType, NormalizedJob } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type JobMapProps = {
  jobs: NormalizedJob[];
  entities?: MapEntity[];
  center: Coordinates;
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  landing?: boolean;
  loading?: boolean;
};

type MapLibreModule = typeof import("maplibre-gl");
type JobMarkerType = "internship" | "fulltime" | "remote";
type MarkerKind = "job" | "entity";

type JobFeatureProperties = {
  id: string;
  markerType: JobMarkerType;
  title: string;
  company: string;
  location: string;
  distance: string;
  applyUrl: string;
  logoText: string;
  logoUrl: string;
};

type JobFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: JobFeatureProperties;
};

type EntityFeatureProperties = {
  id: string;
  type: MapEntityType;
  name: string;
  description: string;
  source: string;
  location: string;
  distance: string;
  confidence: string;
  url: string;
  logoText: string;
  logoUrl: string;
};

type EntityFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: EntityFeatureProperties;
};

type JobMarkerGroup = {
  id: string;
  primary: JobFeature;
  features: JobFeature[];
};

type EntityMarkerGroup = {
  id: string;
  primary: EntityFeature;
  features: EntityFeature[];
};

type RenderFeatureProperties = {
  kind: MarkerKind;
  groupId: string;
  id: string;
  count: number;
  color: string;
  stroke: string;
  label: string;
  markerType?: JobMarkerType;
  entityType?: MapEntityType;
};

type RenderFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: RenderFeatureProperties;
};

type RenderFeatureCollection = {
  type: "FeatureCollection";
  features: RenderFeature[];
};

type MapStyleId = "voyager" | "positron" | "dark-matter";
type HemloMapStyle = {
  id: MapStyleId;
  label: string;
  background: string;
  tileUrls: string[];
};

const BASE_SOURCE_ID = "hemlo-osm-base";
const BASE_BACKGROUND_LAYER_ID = "hemlo-map-background";
const BASE_RASTER_LAYER_ID = "hemlo-osm-tiles";
const JOB_SOURCE_ID = "hemlo-job-points";
const ENTITY_SOURCE_ID = "hemlo-entity-points";
const JOB_CIRCLE_LAYER_ID = "hemlo-job-circles";
const JOB_SELECTED_LAYER_ID = "hemlo-job-selected";
const ENTITY_CIRCLE_LAYER_ID = "hemlo-entity-circles";

const cartoBasemapKey = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY;

function cartoTiles(style: "voyager" | "light_all" | "dark_all") {
  const keySuffix = cartoBasemapKey ? `?key=${cartoBasemapKey}` : "";
  return [
    `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png${keySuffix}`,
  ];
}

const mapStyles: HemloMapStyle[] = [
  {
    id: "voyager",
    label: "Voyager",
    background: "#edf2e8",
    tileUrls: cartoTiles("voyager"),
  },
  {
    id: "positron",
    label: "Positron",
    background: "#f4f4f2",
    tileUrls: cartoTiles("light_all"),
  },
  {
    id: "dark-matter",
    label: "Dark Matter",
    background: "#111111",
    tileUrls: cartoTiles("dark_all"),
  },
] satisfies HemloMapStyle[];

function createRasterStyle(style: HemloMapStyle): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BASE_SOURCE_ID]: {
        type: "raster",
        tiles: style.tileUrls,
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: BASE_BACKGROUND_LAYER_ID,
        type: "background",
        paint: { "background-color": style.background },
      },
      {
        id: BASE_RASTER_LAYER_ID,
        type: "raster",
        source: BASE_SOURCE_ID,
        minzoom: 0,
        maxzoom: 22,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  } as StyleSpecification;
}

const emptyCollection: RenderFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export default function JobMap({
  jobs,
  entities = [],
  center,
  selectedJobId,
  onSelectJob,
  landing = false,
  loading = false,
}: JobMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const currentMarkerRef = useRef<Marker | null>(null);
  const liteJobMarkersRef = useRef<Map<string, Marker>>(new Map());
  const liteEntityMarkersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<Popup | null>(null);
  const onSelectJobRef = useRef(onSelectJob);
  const jobCollectionRef = useRef<RenderFeatureCollection>(emptyCollection);
  const entityCollectionRef = useRef<RenderFeatureCollection>(emptyCollection);
  const jobGroupsRef = useRef<Map<string, JobMarkerGroup>>(new Map());
  const entityGroupsRef = useRef<Map<string, EntityMarkerGroup>>(new Map());
  const logoImageCacheRef = useRef<Map<string, HTMLImageElement | "loading" | "error">>(new Map());
  const redrawCanvasMarkersRef = useRef<() => void>(() => {});
  const selectedGroupRef = useRef<string | null>(null);
  const interactionsReadyRef = useRef(false);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeBurstRef = useRef<number | null>(null);
  const [styleId, setStyleId] = useState<MapStyleId>("voyager");
  const [isMapReady, setIsMapReady] = useState(false);

  const activeStyle = mapStyles.find((style) => style.id === styleId) ?? mapStyles[0];

  const jobFeatures = useMemo<JobFeature[]>(
    () =>
      jobs.flatMap((job): JobFeature[] => {
        if (
          typeof job.latitude !== "number" ||
          typeof job.longitude !== "number"
        ) {
          return [];
        }

        return [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [job.longitude, job.latitude],
            },
            properties: {
              id: job.id,
              markerType: markerType(job),
              title: job.title,
              company: job.companyName,
              location: job.locationText,
              distance: distanceLabel(job),
              applyUrl: job.applyUrl,
              logoText: companyInitials(job.companyName),
              logoUrl: companyLogoUrl(job),
            },
          },
        ];
      }),
    [jobs],
  );

  const entityFeatures = useMemo<EntityFeature[]>(
    () =>
      entities
        .filter(
          (entity) =>
            typeof entity.latitude === "number" &&
            typeof entity.longitude === "number" &&
            (entity.locationConfidence === "exact_office" || entity.type === "radar"),
        )
        .map((entity) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [entity.longitude, entity.latitude],
          },
          properties: {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            description: entity.description ?? entityLabel(entity.type),
            source: entity.source,
            location: entity.locationText,
            distance: entityDistanceLabel(entity),
            confidence: confidenceLabel(entity.locationConfidence),
            url: entity.url ?? entity.sourceUrl ?? "",
            logoText: entityLogoText(entity),
            logoUrl: entity.logoUrl ?? "",
          },
        })),
    [entities],
  );

  const jobGroups = useMemo(() => groupFeaturesByMarker(jobFeatures), [jobFeatures]);
  const entityGroups = useMemo(
    () => groupEntityFeaturesByMarker(entityFeatures),
    [entityFeatures],
  );

  const jobCollection = useMemo(
    () => markerCollectionFromJobGroups(jobGroups),
    [jobGroups],
  );
  const entityCollection = useMemo(
    () => markerCollectionFromEntityGroups(entityGroups),
    [entityGroups],
  );

  const showJobPopup = useCallback((group: JobMarkerGroup) => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) return;

    const coordinates = group.primary.geometry.coordinates;
    map.easeTo({
      center: coordinates,
      duration: 220,
    });

    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnMove: false,
      focusAfterOpen: false,
      maxWidth: "340px",
      offset: 14,
      className: "hemlo-map-popup",
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml(group))
      .addTo(map);
  }, []);

  const showEntityPopup = useCallback((group: EntityMarkerGroup) => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) return;

    const coordinates = group.primary.geometry.coordinates;
    map.easeTo({
      center: coordinates,
      duration: 220,
    });

    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnMove: false,
      focusAfterOpen: false,
      maxWidth: "340px",
      offset: 14,
      className: "hemlo-map-popup",
    })
      .setLngLat(coordinates)
      .setHTML(entityPopupHtml(group))
      .addTo(map);
  }, []);

  const updateSelectedLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(JOB_SELECTED_LAYER_ID)) return;

    map.setFilter(
      JOB_SELECTED_LAYER_ID,
      selectedGroupRef.current
        ? ["==", ["get", "groupId"], selectedGroupRef.current]
        : ["==", ["get", "groupId"], "__none__"],
    );
  }, []);

  const setSelectedJob = useCallback(
    (id: string | null, shouldNotify = false) => {
      let selectedGroup: JobMarkerGroup | null = null;
      if (id) {
        for (const group of jobGroupsRef.current.values()) {
          if (group.features.some((feature) => feature.properties.id === id)) {
            selectedGroup = group;
            break;
          }
        }
      }

      selectedGroupRef.current = selectedGroup?.id ?? null;
      updateSelectedLayer();

      if (selectedGroup) {
        if (shouldNotify) onSelectJobRef.current(id ?? selectedGroup.primary.properties.id);
        showJobPopup(selectedGroup);
      } else {
        popupRef.current?.remove();
      }
    },
    [showJobPopup, updateSelectedLayer],
  );

  const updateMapData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    ensurePointLayers(map);

    const jobSource = map.getSource(JOB_SOURCE_ID) as GeoJSONSource | undefined;
    const entitySource = map.getSource(ENTITY_SOURCE_ID) as GeoJSONSource | undefined;
    jobSource?.setData(jobCollectionRef.current);
    entitySource?.setData(entityCollectionRef.current);
    updateSelectedLayer();
  }, [updateSelectedLayer]);

  const renderLiteMarkers = useCallback(() => {
    const map = mapRef.current;
    const canvas = markerCanvasRef.current;

    liteJobMarkersRef.current.forEach((marker) => marker.remove());
    liteEntityMarkersRef.current.forEach((marker) => marker.remove());
    liteJobMarkersRef.current.clear();
    liteEntityMarkersRef.current.clear();

    if (!map || !canvas || landing) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getLogoImage = (url: string) => {
      if (!url) return null;
      const cached = logoImageCacheRef.current.get(url);
      if (cached instanceof HTMLImageElement) {
        return cached.complete && cached.naturalWidth > 0 ? cached : null;
      }
      if (cached === "loading" || cached === "error") return null;

      logoImageCacheRef.current.set(url, "loading");
      const image = new Image();
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.onload = () => {
        logoImageCacheRef.current.set(url, image);
        redrawCanvasMarkersRef.current();
      };
      image.onerror = () => {
        logoImageCacheRef.current.set(url, "error");
        redrawCanvasMarkersRef.current();
      };
      image.src = url;
      return null;
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const drawMarker = ({
      coordinates,
      color,
      label,
      logoUrl,
      count,
      selected = false,
      compact = false,
    }: {
      coordinates: [number, number];
      color: string;
      label: string;
      logoUrl: string;
      count: number;
      selected?: boolean;
      compact?: boolean;
    }) => {
      const point = map.project(coordinates);
      const radius = selected ? 13 : compact ? 9 : 11;
      const x = point.x;
      const y = point.y;

      if (
        x < -radius - 12 ||
        y < -radius - 12 ||
        x > width + radius + 12 ||
        y > height + radius + 12
      ) {
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#18181B" : color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      const logoImage = getLogoImage(logoUrl);
      if (logoImage) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
          ctx.clip();
          const imageSize = (radius - 2) * 2;
          ctx.drawImage(logoImage, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
          ctx.restore();
        } catch {
          ctx.restore();
          logoImageCacheRef.current.set(logoUrl, "error");
        }
      } else {
        ctx.fillStyle = "#18181B";
        ctx.font = `${compact ? 7 : 8}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillText(label.slice(0, compact ? 3 : 2), x, y + 0.5);
      }

      if (count > 1) {
        const badgeText = String(Math.min(count, 99));
        const badgeRadius = badgeText.length > 1 ? 8 : 7;
        const badgeX = x + radius - 1;
        const badgeY = y - radius + 1;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#18181B";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
        ctx.fillText(badgeText, badgeX, badgeY + 0.5);
      }

      ctx.restore();
    };

    for (const group of jobGroupsRef.current.values()) {
      drawMarker({
        coordinates: group.primary.geometry.coordinates,
        color: jobColor(group.primary.properties.markerType),
        label: group.primary.properties.logoText,
        logoUrl: group.primary.properties.logoUrl,
        count: group.features.length,
        selected: group.id === selectedGroupRef.current,
      });
    }

    for (const group of entityGroupsRef.current.values()) {
      const type = group.primary.properties.type;
      drawMarker({
        coordinates: group.primary.geometry.coordinates,
        color: entityColor(type),
        label: group.primary.properties.logoText || entityShortLabel(type),
        logoUrl: group.primary.properties.logoUrl,
        count: group.features.length,
        compact: type === "radar",
      });
    }
  }, [landing]);

  const registerInteractions = useCallback(() => {
    const map = mapRef.current;
    if (!map || interactionsReadyRef.current) return;

    interactionsReadyRef.current = true;
    let markerHoverActive = false;

    const pickNearestMarker = (point: { x: number; y: number }) => {
      let nearestJob: JobMarkerGroup | null = null;
      let nearestEntity: EntityMarkerGroup | null = null;
      let nearestDistanceSq = Number.POSITIVE_INFINITY;

      for (const group of jobGroupsRef.current.values()) {
        const projected = map.project(group.primary.geometry.coordinates);
        const distanceSq = markerHitDistanceSq(
          projected,
          point,
          group.id === selectedGroupRef.current ? 13 : 11,
          group.features.length,
        );
        if (distanceSq !== null && distanceSq < nearestDistanceSq) {
          nearestJob = group;
          nearestDistanceSq = distanceSq;
        }
      }

      if (nearestJob) {
        return { kind: "job" as const, group: nearestJob };
      }

      for (const group of entityGroupsRef.current.values()) {
        const type = group.primary.properties.type;
        const projected = map.project(group.primary.geometry.coordinates);
        const distanceSq = markerHitDistanceSq(
          projected,
          point,
          type === "radar" ? 9 : 11,
          group.features.length,
        );
        if (distanceSq !== null && distanceSq < nearestDistanceSq) {
          nearestEntity = group;
          nearestDistanceSq = distanceSq;
        }
      }

      if (nearestEntity) {
        return { kind: "entity" as const, group: nearestEntity };
      }
      return null;
    };

    const setMarkerHover = (active: boolean) => {
      if (markerHoverActive === active) return;
      markerHoverActive = active;

      const cursor = active ? "pointer" : "";
      map.getCanvas().style.cursor = cursor;
      map.getCanvasContainer().style.cursor = cursor;

      if (active) {
        map.dragPan.disable();
      } else {
        map.dragPan.enable();
      }
    };

    map.on("click", JOB_CIRCLE_LAYER_ID, (event: MapLayerMouseEvent) => {
      const nearest = pickNearestMarker(event.point);
      if (nearest?.kind === "job") {
        setSelectedJob(nearest.group.primary.properties.id, true);
      }
    });

    map.on("click", ENTITY_CIRCLE_LAYER_ID, (event: MapLayerMouseEvent) => {
      const nearest = pickNearestMarker(event.point);
      if (!nearest) return;

      if (nearest.kind === "job") {
        setSelectedJob(nearest.group.primary.properties.id, true);
        return;
      }

      selectedGroupRef.current = null;
      updateSelectedLayer();
      showEntityPopup(nearest.group);
    });

    map.on("click", (event) => {
      const nearest = pickNearestMarker(event.point);
      if (!nearest) return;

      if (nearest.kind === "job") {
        setSelectedJob(nearest.group.primary.properties.id, true);
        return;
      }

      selectedGroupRef.current = null;
      updateSelectedLayer();
      showEntityPopup(nearest.group);
    });

    map.on("mousemove", (event) => {
      const nearest = pickNearestMarker(event.point);
      setMarkerHover(Boolean(nearest));
    });

    map.on("mousedown", (event) => {
      if (pickNearestMarker(event.point)) {
        map.dragPan.disable();
        map.getCanvas().style.cursor = "pointer";
        map.getCanvasContainer().style.cursor = "pointer";
      }
    });

    map.on("mouseup", (event) => {
      setMarkerHover(Boolean(pickNearestMarker(event.point)));
    });

    map.on("mouseout", () => {
      setMarkerHover(false);
    });
  }, [setSelectedJob, showEntityPopup, updateSelectedLayer]);

  useEffect(() => {
    redrawCanvasMarkersRef.current = renderLiteMarkers;
  }, [renderLiteMarkers]);

  const resizeMap = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      mapRef.current?.resize();
    });
  }, []);

  useEffect(() => {
    onSelectJobRef.current = onSelectJob;
  }, [onSelectJob]);

  useEffect(() => {
    jobCollectionRef.current = jobCollection;
    entityCollectionRef.current = entityCollection;
    jobGroupsRef.current = new Map(jobGroups.map((group) => [group.id, group]));
    entityGroupsRef.current = new Map(entityGroups.map((group) => [group.id, group]));
    updateMapData();
    setSelectedJob(selectedJobId, false);
    renderLiteMarkers();
  }, [
    entityCollection,
    entityGroups,
    jobCollection,
    jobGroups,
    selectedJobId,
    renderLiteMarkers,
    setSelectedJob,
    updateMapData,
  ]);

  useEffect(() => {
    setSelectedJob(selectedJobId, false);
    renderLiteMarkers();
  }, [renderLiteMarkers, selectedJobId, setSelectedJob]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(BASE_RASTER_LAYER_ID)) return;

    const source = map.getSource(BASE_SOURCE_ID) as
      | { setTiles?: (tiles: string[]) => unknown }
      | undefined;
    source?.setTiles?.(activeStyle.tileUrls);
    map.setPaintProperty(
      BASE_BACKGROUND_LAYER_ID,
      "background-color",
      activeStyle.background,
    );
  }, [activeStyle]);

  useEffect(() => {
    let cancelled = false;
    const liteJobMarkers = liteJobMarkersRef.current;
    const liteEntityMarkers = liteEntityMarkersRef.current;

    async function boot() {
      if (!containerRef.current || mapRef.current) return;

      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibreRef.current = maplibregl;
      interactionsReadyRef.current = false;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: createRasterStyle(mapStyles[0]),
        center: [center.lng, center.lat],
        zoom: landing ? 12 : 12.2,
        pitch: 0,
        bearing: 0,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        minZoom: landing ? 9 : 10,
        maxZoom: 17,
        maxBounds: landing
          ? undefined
          : [
              [77.34, 12.72],
              [77.9, 13.2],
            ],
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

      currentMarkerRef.current = new maplibregl.Marker({
        element: createCurrentLocationElement(),
        anchor: "center",
      })
        .setLngLat([center.lng, center.lat])
        .addTo(map);

      const completeStyleLoad = () => {
        if (cancelled) return;
        setIsMapReady(true);
        ensurePointLayers(map);
        updateMapData();
        registerInteractions();
        renderLiteMarkers();
        resizeMap();
      };

      map.on("load", completeStyleLoad);
      map.on("style.load", completeStyleLoad);

      map.on("styledata", () => {
        if (cancelled || !map.isStyleLoaded()) return;
        ensurePointLayers(map);
        updateMapData();
        registerInteractions();
        renderLiteMarkers();
      });

      map.on("render", renderLiteMarkers);
    }

    boot();

    return () => {
      cancelled = true;
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
      if (resizeBurstRef.current !== null) {
        window.clearInterval(resizeBurstRef.current);
      }
      popupRef.current?.remove();
      currentMarkerRef.current?.remove();
      interactionsReadyRef.current = false;
      const map = mapRef.current;
      if (map) {
        map.dragPan.enable();
        map.getCanvas().style.cursor = "";
        map.getCanvasContainer().style.cursor = "";
      }
      liteJobMarkers.forEach((marker) => marker.remove());
      liteEntityMarkers.forEach((marker) => marker.remove());
      liteJobMarkers.clear();
      liteEntityMarkers.clear();
      map?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [
    center.lat,
    center.lng,
    landing,
    registerInteractions,
    renderLiteMarkers,
    resizeMap,
    updateMapData,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    currentMarkerRef.current?.setLngLat([center.lng, center.lat]);
    if (landing) {
      map.easeTo({ center: [center.lng, center.lat], zoom: 12, duration: 500 });
    }
  }, [center.lat, center.lng, landing]);

  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;

    const observer = new ResizeObserver(() => resizeMap());
    observer.observe(el);

    const burstResize = () => {
      resizeMap();
      if (resizeBurstRef.current !== null) window.clearInterval(resizeBurstRef.current);
      resizeBurstRef.current = window.setInterval(resizeMap, 80);
      window.setTimeout(() => {
        if (resizeBurstRef.current !== null) {
          window.clearInterval(resizeBurstRef.current);
          resizeBurstRef.current = null;
        }
        resizeMap();
      }, 620);
    };

    el.addEventListener("transitionstart", burstResize);
    el.addEventListener("transitionend", resizeMap);

    return () => {
      observer.disconnect();
      el.removeEventListener("transitionstart", burstResize);
      el.removeEventListener("transitionend", resizeMap);
      if (resizeBurstRef.current !== null) {
        window.clearInterval(resizeBurstRef.current);
        resizeBurstRef.current = null;
      }
    };
  }, [isMapReady, resizeMap]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      <canvas
        ref={markerCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      />
      {!isMapReady && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-white/24">
          <div className="absolute bottom-4 left-4 rounded-md border border-white/70 bg-white/95 px-3 py-2 text-xs font-semibold text-[#374151] shadow-sm">
            Loading map
          </div>
        </div>
      )}
      {loading && isMapReady && (
        <div className="pointer-events-none absolute right-14 top-3 z-10 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 shadow-sm">
          Updating
        </div>
      )}
      {!landing && (
        <div className="pointer-events-auto absolute left-3 top-3 z-10 flex rounded-lg border border-white/70 bg-white/92 p-1 shadow-sm backdrop-blur">
          {mapStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setStyleId(style.id)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-semibold transition-colors",
                style.id === styleId
                  ? "bg-[#111827] text-white"
                  : "text-[#374151] hover:bg-[#F3F4F6]",
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      )}
      {!landing && (
        <div className="pointer-events-auto absolute right-3 top-3 z-10 grid overflow-hidden rounded-lg border border-white/70 bg-white/92 shadow-sm backdrop-blur">
          <MapButton label="Zoom in" onClick={() => mapRef.current?.zoomIn({ duration: 180 })}>
            <Plus className="h-4 w-4" />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => mapRef.current?.zoomOut({ duration: 180 })}>
            <Minus className="h-4 w-4" />
          </MapButton>
          <MapButton
            label="Recenter map"
            onClick={() =>
              mapRef.current?.easeTo({
                center: [center.lng, center.lat],
                zoom: Math.max(mapRef.current.getZoom(), 12),
                pitch: 0,
                bearing: 0,
                duration: 320,
              })
            }
          >
            <LocateFixed className="h-4 w-4" />
          </MapButton>
        </div>
      )}
      {!landing && (
        <div className="pointer-events-none absolute bottom-7 right-3 z-10 grid gap-1 rounded-xl border border-zinc-200/80 bg-white/95 p-2 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur-md">
          <LegendDot color="#16A34A" label="Internship" />
          <LegendDot color="#2563EB" label="Full-time" />
          <LegendDot color="#0EA5E9" label="Remote" />
          <LegendDot color="#64748B" label="Company" />
          <LegendDot color="#14B8A6" label="Startup" />
          <LegendDot color="#F59E0B" label="Investor" />
          <LegendDot color="#E11D48" label="Event" />
          <LegendDot color="#8B5CF6" label="Scanning (18h)" />
        </div>
      )}
      {!landing && entities.length > 0 && (
        <div className="pointer-events-none absolute bottom-7 left-3 z-10 rounded-full border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-zinc-700 shadow-sm backdrop-blur-md">
          {entities.length} ecosystem dots loaded
        </div>
      )}
    </div>
  );
}

function ensurePointLayers(map: MapLibreMap) {
  if (!map.getSource(JOB_SOURCE_ID)) {
    map.addSource(JOB_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection,
    });
  }

  if (!map.getSource(ENTITY_SOURCE_ID)) {
    map.addSource(ENTITY_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection,
    });
  }

  if (!map.getLayer(ENTITY_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: ENTITY_CIRCLE_LAYER_ID,
      type: "circle",
      source: ENTITY_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 14, 12, 17, 16],
        "circle-color": [
          "match",
          ["get", "entityType"],
          "company",
          "#64748B",
          "startup",
          "#14B8A6",
          "investor",
          "#F59E0B",
          "event",
          "#E11D48",
          "radar",
          "#8B5CF6",
          "#14B8A6",
        ],
        "circle-opacity": 0.01,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 0,
      },
    });
  }

  if (!map.getLayer(JOB_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: JOB_CIRCLE_LAYER_ID,
      type: "circle",
      source: JOB_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 14, 17, 18],
        "circle-color": [
          "match",
          ["get", "markerType"],
          "internship",
          "#16A34A",
          "remote",
          "#0EA5E9",
          "fulltime",
          "#2563EB",
          "#2563EB",
        ],
        "circle-opacity": 0.01,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 0,
      },
    });
  }

  if (!map.getLayer(JOB_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: JOB_SELECTED_LAYER_ID,
      type: "circle",
      source: JOB_SOURCE_ID,
      filter: ["==", ["get", "groupId"], "__none__"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 12, 14, 19, 17, 25],
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-color": "#18181B",
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 0,
      },
    });
  }

  // Keep marker rendering in circle layers only. Symbol/text layers require a
  // glyphs endpoint in the map style; without one MapLibre throws before data is set.
}

function markerCollectionFromJobGroups(groups: JobMarkerGroup[]): RenderFeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((group) => ({
      type: "Feature",
      geometry: group.primary.geometry,
      properties: {
        kind: "job",
        groupId: group.id,
        id: group.primary.properties.id,
        count: group.features.length,
        color: jobColor(group.primary.properties.markerType),
        stroke: "#ffffff",
        label: group.features.length > 1 ? String(group.features.length) : "",
        markerType: group.primary.properties.markerType,
      },
    })),
  };
}

function markerCollectionFromEntityGroups(groups: EntityMarkerGroup[]): RenderFeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((group) => ({
      type: "Feature",
      geometry: group.primary.geometry,
      properties: {
        kind: "entity",
        groupId: group.id,
        id: group.primary.properties.id,
        count: group.features.length,
        color: entityColor(group.primary.properties.type),
        stroke: "#ffffff",
        label:
          group.features.length > 1
            ? String(group.features.length)
            : entityShortLabel(group.primary.properties.type),
        entityType: group.primary.properties.type,
      },
    })),
  };
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center border-b border-zinc-200/80 text-zinc-800 transition-colors last:border-b-0 hover:bg-zinc-50 active:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 touch-manipulation sm:h-9 sm:w-9"
    >
      {children}
    </button>
  );
}

function markerHitDistanceSq(
  markerPoint: { x: number; y: number },
  clickPoint: { x: number; y: number },
  radius: number,
  count: number,
): number | null {
  const dx = markerPoint.x - clickPoint.x;
  const dy = markerPoint.y - clickPoint.y;
  const centerDistanceSq = dx * dx + dy * dy;
  const centerHitRadius = radius + 11;

  if (centerDistanceSq <= centerHitRadius * centerHitRadius) {
    return centerDistanceSq;
  }

  if (count > 1) {
    const badgeText = String(Math.min(count, 99));
    const badgeRadius = (badgeText.length > 1 ? 8 : 7) + 7;
    const badgeX = markerPoint.x + radius - 1;
    const badgeY = markerPoint.y - radius + 1;
    const badgeDx = badgeX - clickPoint.x;
    const badgeDy = badgeY - clickPoint.y;
    const badgeDistanceSq = badgeDx * badgeDx + badgeDy * badgeDy;
    if (badgeDistanceSq <= badgeRadius * badgeRadius) {
      return badgeDistanceSq;
    }
  }

  return null;
}

function markerType(job: NormalizedJob): JobMarkerType {
  if (job.workMode === "remote") return "remote";
  return job.employmentType === "internship" ? "internship" : "fulltime";
}

function groupFeaturesByMarker(features: JobFeature[]): JobMarkerGroup[] {
  const grouped = new Map<string, JobFeature[]>();
  for (const feature of features) {
    const key = [
      feature.properties.markerType,
      feature.geometry.coordinates[0].toFixed(5),
      feature.geometry.coordinates[1].toFixed(5),
    ].join(":");
    const group = grouped.get(key);
    if (group) group.push(feature);
    else grouped.set(key, [feature]);
  }

  return [...grouped.entries()].map(([id, group]) => ({
    id,
    primary: group[0],
    features: group,
  }));
}

function groupEntityFeaturesByMarker(features: EntityFeature[]): EntityMarkerGroup[] {
  const grouped = new Map<string, EntityFeature[]>();
  for (const feature of features) {
    const key = [
      feature.properties.type,
      feature.geometry.coordinates[0].toFixed(5),
      feature.geometry.coordinates[1].toFixed(5),
    ].join(":");
    const group = grouped.get(key);
    if (group) group.push(feature);
    else grouped.set(key, [feature]);
  }

  return [...grouped.entries()].map(([id, group]) => ({
    id,
    primary: group[0],
    features: group,
  }));
}

function jobColor(type: JobMarkerType): string {
  const colors: Record<JobMarkerType, string> = {
    internship: "#16A34A",
    fulltime: "#2563EB",
    remote: "#0EA5E9",
  };
  return colors[type];
}

function entityColor(type: MapEntityType): string {
  const colors: Record<MapEntityType, string> = {
    company: "#64748B",
    startup: "#14B8A6",
    investor: "#F59E0B",
    event: "#E11D48",
    radar: "#8B5CF6",
  };
  return colors[type];
}

function entityShortLabel(type: MapEntityType): string {
  const labels: Record<MapEntityType, string> = {
    company: "CO",
    startup: "S",
    investor: "VC",
    event: "EV",
    radar: "18h",
  };
  return labels[type];
}

function companyInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function companyLogoUrl(job: NormalizedJob): string {
  if (job.company?.logoUrl) return job.company.logoUrl;

  const website = job.company?.website;
  if (!website) return "";

  try {
    const { hostname } = new URL(website);
    if (isAtsHost(hostname)) return "";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function isAtsHost(hostname: string): boolean {
  return /(ashbyhq|greenhouse|lever|workable)\.com$|lever\.co$/.test(hostname);
}

function distanceLabel(job: NormalizedJob): string {
  if (job.workMode === "remote") return "Remote role";
  if (typeof job.distanceKm === "number") {
    return `${job.distanceKm.toFixed(job.distanceKm < 10 ? 1 : 0)} km away`;
  }
  return "Distance unavailable";
}

function entityDistanceLabel(entity: MapEntity): string {
  if (typeof entity.distanceKm === "number") {
    return `${entity.distanceKm.toFixed(entity.distanceKm < 10 ? 1 : 0)} km away`;
  }
  return "Distance unavailable";
}

function entityLogoText(entity: MapEntity): string {
  if (entity.type === "radar") return "18h";
  if (entity.type === "investor") return "VC";
  if (entity.type === "event") return "EV";
  return companyInitials(entity.name);
}

function entityLabel(type: MapEntityType): string {
  const labels: Record<MapEntityType, string> = {
    company: "Company",
    startup: "Startup",
    investor: "Investor",
    event: "Event venue",
    radar: "Scanning sector",
  };
  return labels[type];
}

function entityLabelPlural(type: MapEntityType): string {
  const labels: Record<MapEntityType, string> = {
    company: "companies",
    startup: "startups",
    investor: "investor offices",
    event: "event venues",
    radar: "scanning sectors",
  };
  return labels[type];
}

function confidenceLabel(confidence: MapEntity["locationConfidence"]): string {
  const labels: Record<MapEntity["locationConfidence"], string> = {
    exact_office: "Exact office/venue",
    city_level: "City-level location",
    region_level: "Region-level location",
    country_level: "Country-level location",
    remote: "Remote",
    unknown: "Unknown precision",
  };
  return labels[confidence];
}

function createCurrentLocationElement(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "hemlo-current-location";
  element.title = "Search location";
  return element;
}

function popupHtml(group: JobMarkerGroup): string {
  const properties = group.primary.properties;
  const visibleJobs = group.features.slice(0, 8);
  const jobItems = visibleJobs
    .map(
      (feature) => `
        <li class="hemlo-popup-job">
          <div class="hemlo-popup-job-main">
            <b>${escapeHtml(feature.properties.title)}</b>
            <small>${escapeHtml(feature.properties.company)} - ${escapeHtml(feature.properties.distance)}</small>
          </div>
          <div class="hemlo-popup-actions">
            <a class="hemlo-popup-apply" href="${escapeAttribute(feature.properties.applyUrl)}" target="_blank" rel="noreferrer">Apply</a>
            <a class="hemlo-popup-details" href="/jobs/${encodeURIComponent(feature.properties.id)}">Details</a>
          </div>
        </li>`,
    )
    .join("");
  const hiddenCount = Math.max(group.features.length - visibleJobs.length, 0);
  const title =
    group.features.length > 1
      ? `${group.features.length} roles here`
      : properties.title;

  return `
    <div class="hemlo-popup-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(properties.company)}</span>
      <small>${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
      ${
        group.features.length > 1
          ? `<ul class="hemlo-popup-list">${jobItems}${
              hiddenCount > 0 ? `<li class="hemlo-popup-more">+${hiddenCount} more roles in this dot. Use the sidebar for the full list.</li>` : ""
            }</ul>`
          : `<div class="hemlo-popup-actions hemlo-popup-actions--single">
              <a class="hemlo-popup-apply" href="${escapeAttribute(properties.applyUrl)}" target="_blank" rel="noreferrer">Apply</a>
              <a class="hemlo-popup-details" href="/jobs/${encodeURIComponent(properties.id)}">Details</a>
            </div>`
      }
    </div>
  `;
}

function entityPopupHtml(group: EntityMarkerGroup): string {
  const properties = group.primary.properties;

  if (properties.type === "radar") {
    return `
      <div class="hemlo-popup-card hemlo-radar-popup" style="min-width: 250px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#8b5cf6;"></span>
          <span style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#7c3aed;text-transform:uppercase;">Discovery Radar - 18h Countdown</span>
        </div>
        <strong style="font-size:15px;font-weight:700;color:#111827;display:block;margin-bottom:2px;">${escapeHtml(properties.name)}</strong>
        <small style="display:block;color:#6b7280;margin-bottom:10px;">${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;margin-bottom:10px;">
          <div style="font-size:12px;color:#4c1d95;line-height:1.45;">
            <strong>Companies being indexed:</strong> New tech firms, GCCs, and startups in this sector are being verified and mapped.
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #c4b5fd;font-size:11px;color:#6d28d9;display:flex;align-items:center;justify-content:space-between;">
            <span><strong>Countdown:</strong> Updating in 18 hrs</span>
            <span>Live Indexing</span>
          </div>
        </div>
      </div>
    `;
  }

  const extraItems = group.features
    .slice(0, 6)
    .map(
      (feature) =>
        `<li>${escapeHtml(feature.properties.name)} <small>${escapeHtml(
          feature.properties.source,
        )}</small></li>`,
    )
    .join("");
  const hiddenCount = Math.max(group.features.length - 6, 0);
  const title =
    group.features.length > 1
      ? `${group.features.length} ${entityLabelPlural(properties.type)}`
      : properties.name;
  const linkLabel = properties.type === "startup" ? "Open company" : "Visit website";
  const link = properties.url
    ? `<a href="${escapeAttribute(properties.url)}" target="_blank" rel="noreferrer">${linkLabel}</a>`
    : "";

  return `
    <div class="hemlo-popup-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(entityLabel(properties.type))}</span>
      <small>${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
      ${
        group.features.length > 1
          ? `<ul class="hemlo-popup-list">${extraItems}${
              hiddenCount > 0 ? `<li>+${hiddenCount} more</li>` : ""
            }</ul>`
          : `<span>${escapeHtml(properties.description)}</span>`
      }
      ${link}
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
