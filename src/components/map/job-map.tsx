"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type {
  Map as MapLibreMap,
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
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: JobFeatureProperties;
};
type JobFeatureCollection = {
  type: "FeatureCollection";
  features: JobFeature[];
};
type JobMarkerGroup = {
  id: string;
  primary: JobFeature;
  features: JobFeature[];
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
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: EntityFeatureProperties;
};
type EntityMarkerGroup = {
  id: string;
  primary: EntityFeature;
  features: EntityFeature[];
};

type MapStyleId = "street" | "light" | "night";
type NearHireMapStyle = {
  id: MapStyleId;
  label: string;
  style: StyleSpecification;
};

const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const osmTileUrls = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];

function createRasterStyle(
  sourceId: string,
  backgroundColor: string,
  paint: Record<string, number> = {},
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: osmTileUrls,
        tileSize: 256,
        maxzoom: 19,
        attribution: osmAttribution,
      },
    },
    layers: [
      {
        id: `${sourceId}-background`,
        type: "background",
        paint: {
          "background-color": backgroundColor,
        },
      },
      {
        id: `${sourceId}-tiles`,
        type: "raster",
        source: sourceId,
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-fade-duration": 100,
          ...paint,
        },
      },
    ],
  } as StyleSpecification;
}

const mapStyles: NearHireMapStyle[] = [
  {
    id: "street",
    label: "Street",
    style: createRasterStyle("osm-street", "#e7eee9"),
  },
  {
    id: "light",
    label: "Light",
    style: createRasterStyle("osm-light", "#eef1f4", {
      "raster-brightness-min": 0.08,
      "raster-brightness-max": 1,
      "raster-saturation": -0.35,
      "raster-contrast": -0.1,
    }),
  },
  {
    id: "night",
    label: "Night",
    style: createRasterStyle("osm-night", "#111827", {
      "raster-brightness-min": 0,
      "raster-brightness-max": 0.42,
      "raster-saturation": -0.75,
      "raster-contrast": 0.35,
    }),
  },
] satisfies NearHireMapStyle[];

function cloneStyle(style: StyleSpecification): StyleSpecification {
  return JSON.parse(JSON.stringify(style)) as StyleSpecification;
}

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
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const initialCenterRef = useRef(center);
  const initialStyleRef = useRef(mapStyles[0].style);
  const currentMarkerRef = useRef<Marker | null>(null);
  const jobMarkersRef = useRef<Map<string, Marker>>(new Map());
  const entityMarkersRef = useRef<Map<string, Marker>>(new Map());
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popupRef = useRef<Popup | null>(null);
  const selectedRef = useRef<string | null>(null);
  const onSelectJobRef = useRef(onSelectJob);
  const featureCollectionRef = useRef<JobFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const entityFeaturesRef = useRef<EntityFeature[]>([]);
  const [styleId, setStyleId] = useState<MapStyleId>("street");
  const [isMapReady, setIsMapReady] = useState(false);

  const activeStyle = mapStyles.find((style) => style.id === styleId) ?? mapStyles[0];

  const featureCollection = useMemo<JobFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: jobs.flatMap((job): JobFeature[] => {
        if (
          typeof job.latitude !== "number" ||
          typeof job.longitude !== "number" ||
          job.locationConfidence !== "exact_office"
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
            entity.locationConfidence === "exact_office",
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

  const showPopup = useCallback((feature: JobFeature) => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) {
      return;
    }

    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnMove: false,
      offset: 18,
      className: "nearhire-map-popup",
    })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(popupHtml(feature.properties))
      .addTo(map);
  }, []);

  const showEntityPopup = useCallback((group: EntityMarkerGroup) => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) {
      return;
    }

    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnMove: false,
      offset: 18,
      className: "nearhire-map-popup",
    })
      .setLngLat(group.primary.geometry.coordinates)
      .setHTML(entityPopupHtml(group))
      .addTo(map);
  }, []);

    const lastSelectedElementRef = useRef<HTMLButtonElement | null>(null);

  const updateSelectedMarker = useCallback(() => {
    const nextElement = selectedRef.current
      ? (markerElementsRef.current.get(selectedRef.current) as HTMLButtonElement | null)
      : null;

    if (lastSelectedElementRef.current === nextElement) {
      return;
    }

    if (lastSelectedElementRef.current) {
      lastSelectedElementRef.current.classList.remove("is-selected");
    }

    if (nextElement) {
      nextElement.classList.add("is-selected");
    }

    lastSelectedElementRef.current = nextElement ?? null;
  }, []);

  const renderJobMarkers = useCallback(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || landing) {
      return;
    }

    const groups = groupFeaturesByMarker(featureCollectionRef.current.features);
    const nextIds = new Set(groups.map((g) => g.id));

    // Remove markers that no longer exist in the new data
    for (const [id, marker] of jobMarkersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        jobMarkersRef.current.delete(id);
      }
    }
    // Rebuild element refs from scratch (IDs within a group can shift)
    markerElementsRef.current.clear();

    for (const group of groups) {
      if (!jobMarkersRef.current.has(group.id)) {
        // New coordinate group — create element and add marker
        const element = createJobMarkerElement(
          group.primary.properties,
          group.features.length,
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          const id = group.primary.properties.id;
          const selectedFeature = featureCollectionRef.current.features.find(
            (item) => item.properties.id === id,
          );
          if (!selectedFeature) {
            return;
          }
          selectedRef.current = id;
          onSelectJobRef.current(id);
          updateSelectedMarker();
          showPopup(selectedFeature);
        });

        const marker = new maplibregl.Marker({
          element,
          anchor: "center",
        })
          .setLngLat(group.primary.geometry.coordinates)
          .addTo(map);

        jobMarkersRef.current.set(group.id, marker);
      }

      // Re-register all job IDs → their shared marker element
      const existingElement = jobMarkersRef.current
        .get(group.id)
        ?.getElement() as HTMLButtonElement | undefined;
      if (existingElement) {
        for (const feature of group.features) {
          markerElementsRef.current.set(feature.properties.id, existingElement);
        }
      }
    }
    updateSelectedMarker();
  }, [landing, showPopup, updateSelectedMarker]);

  const renderEntityMarkers = useCallback(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || landing) {
      return;
    }

    const groups = groupEntityFeaturesByMarker(entityFeaturesRef.current);
    const nextIds = new Set(groups.map((g) => g.id));

    // Remove entity markers that no longer exist
    for (const [id, marker] of entityMarkersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        entityMarkersRef.current.delete(id);
      }
    }

    for (const group of groups) {
      if (!entityMarkersRef.current.has(group.id)) {
        const element = createEntityMarkerElement(
          group.primary.properties,
          group.features.length,
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          selectedRef.current = null;
          updateSelectedMarker();
          showEntityPopup(group);
        });

        const marker = new maplibregl.Marker({
          element,
          anchor: "center",
        })
          .setLngLat(group.primary.geometry.coordinates)
          .addTo(map);

        entityMarkersRef.current.set(group.id, marker);
      }
    }
  }, [landing, showEntityPopup, updateSelectedMarker]);

  const fitJobs = useCallback(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    const features = [
      ...featureCollectionRef.current.features,
      ...entityFeaturesRef.current,
    ];
    if (!map || !maplibregl || landing || features.length === 0) {
      return;
    }

    const bounds = features.reduce(
      (nextBounds, feature) => nextBounds.extend(feature.geometry.coordinates),
      new maplibregl.LngLatBounds(
        features[0].geometry.coordinates,
        features[0].geometry.coordinates,
      ),
    );

    map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 13.5,
      duration: 650,
    });
  }, [landing]);

  useEffect(() => {
    onSelectJobRef.current = onSelectJob;
  }, [onSelectJob]);

  useEffect(() => {
    featureCollectionRef.current = featureCollection;
    renderJobMarkers();
  }, [featureCollection, renderJobMarkers]);

  useEffect(() => {
    entityFeaturesRef.current = entityFeatures;
    renderEntityMarkers();
  }, [entityFeatures, renderEntityMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    const previousSelectedId = selectedRef.current;
    selectedRef.current = selectedJobId;
    updateSelectedMarker();

    if (!map) {
      return;
    }

    const feature = featureCollectionRef.current.features.find(
      (item) => item.properties.id === selectedJobId,
    );
    if (!feature) {
      popupRef.current?.remove();
      selectedRef.current = null;
      return;
    }

    if (previousSelectedId !== selectedJobId) {
      map.easeTo({
        center: feature.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 13),
        pitch: 0,
        duration: 500,
      });
      showPopup(feature);
    }
  }, [selectedJobId, showPopup, updateSelectedMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setIsMapReady(false);
      map.setStyle(cloneStyle(activeStyle.style));
    }
  }, [activeStyle.style]);

  useEffect(() => {
    let cancelled = false;
    const jobMarkers = jobMarkersRef.current;
    const entityMarkers = entityMarkersRef.current;
    const markerElements = markerElementsRef.current;

    async function boot() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) {
        return;
      }

      maplibreRef.current = maplibregl;

      const initialCenter = initialCenterRef.current;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: cloneStyle(initialStyleRef.current),
        center: [initialCenter.lng, initialCenter.lat],
        zoom: 12.2,
        pitch: 0,
        bearing: 0,
        pixelRatio: window.devicePixelRatio || 1,
        minZoom: 11,
        maxZoom: 17,
        maxBounds: [[77.45, 12.82], [77.78, 13.10]],
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      currentMarkerRef.current = new maplibregl.Marker({
        element: createCurrentLocationElement(),
        anchor: "center",
      })
        .setLngLat([initialCenter.lng, initialCenter.lat])
        .addTo(map);

      map.on("load", () => {
        if (!cancelled) {
          setIsMapReady(true);
        }
        map.resize();
        renderJobMarkers();
        renderEntityMarkers();
      });

      map.on("style.load", () => {
        if (!cancelled) {
          setIsMapReady(true);
        }
        renderJobMarkers();
        renderEntityMarkers();
      });
    }

    boot();

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      currentMarkerRef.current?.remove();
      jobMarkers.forEach((marker) => marker.remove());
      entityMarkers.forEach((marker) => marker.remove());
      jobMarkers.clear();
      entityMarkers.clear();
      markerElements.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [
    fitJobs,
    landing,
    renderEntityMarkers,
    renderJobMarkers,
    showPopup,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    currentMarkerRef.current?.setLngLat([center.lng, center.lat]);
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: 13.8,
      duration: 750,
      essential: true,
    });
  }, [center.lat, center.lng]);
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) {
      return;
    }

    let timer: number;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        mapRef.current?.resize();
      }, 100);
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [isMapReady]);
  return (
    <div className="relative h-full w-full overflow-hidden touch-none">
      <div ref={containerRef} className="h-full w-full touch-none" />
      {(loading || !isMapReady) && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-white/28 backdrop-blur-[1px]">
          <div className="absolute left-3 top-3 grid gap-2 rounded-lg border border-white/70 bg-white/92 p-3 shadow-lg">
            <div className="h-3 w-28 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-[#E5E7EB]" />
          </div>
          <div className="absolute bottom-4 left-4 rounded-md border border-white/70 bg-white/92 px-3 py-2 text-xs font-semibold text-[#374151] shadow-lg">
            {loading ? "Updating nearby jobs" : "Loading vector map"}
          </div>
        </div>
      )}
      {!landing && (
        <div className="pointer-events-auto absolute left-3 top-3 z-10 flex rounded-lg border border-white/70 bg-white/92 p-1 shadow-lg backdrop-blur">
          {mapStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setStyleId(style.id)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-semibold transition",
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
        <div className="pointer-events-auto absolute right-3 top-3 z-10 grid overflow-hidden rounded-lg border border-white/70 bg-white/92 shadow-lg backdrop-blur">
          <MapButton label="Zoom in" onClick={() => mapRef.current?.zoomIn({ duration: 220 })}>
            <Plus className="h-4 w-4" />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => mapRef.current?.zoomOut({ duration: 220 })}>
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
                duration: 420,
              })
            }
          >
            <LocateFixed className="h-4 w-4" />
          </MapButton>
        </div>
      )}
      {!landing && (
        <div className="pointer-events-none absolute bottom-7 right-3 z-10 grid gap-1 rounded-lg border border-zinc-200/80 bg-white/95 p-2 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur-md rounded-xl">
          <LegendDot color="#16A34A" label="Internship" />
          <LegendDot color="#2563EB" label="Full-time" />
          <LegendDot color="#0EA5E9" label="Remote" />
          <LegendDot color="#14B8A6" label="Startup" />
          <LegendDot color="#F59E0B" label="Investor" />
          <LegendDot color="#E11D48" label="Event" />
          <LegendDot color="#8B5CF6" label="Scanning (18h)" />
        </div>
      )}
    </div>
  );
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
      className="flex h-9 w-9 items-center justify-center border-b border-zinc-200/80 text-zinc-800 transition last:border-b-0 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      {children}
    </button>
  );
}

function markerType(job: NormalizedJob): JobMarkerType {
  if (job.workMode === "remote") {
    return "remote";
  }
  return job.employmentType === "internship" ? "internship" : "fulltime";
}

function groupFeaturesByMarker(features: JobFeature[]): JobMarkerGroup[] {
  const grouped = new Map<string, JobFeature[]>();
  for (const feature of features) {
    // Group by marker type so remote jobs form their own cyan dots
    const key = [
      feature.properties.markerType,
      feature.geometry.coordinates[0].toFixed(5),
      feature.geometry.coordinates[1].toFixed(5),
    ].join(":");
    const group = grouped.get(key);
    if (group) {
      group.push(feature);
    } else {
      grouped.set(key, [feature]);
    }
  }

  // Check which coordinates have onsite markers so overlapping remote markers can be offset slightly
  const hasOnsiteAtCoord = new Set<string>();
  for (const group of grouped.values()) {
    if (group[0].properties.markerType !== "remote") {
      const coordKey = [
        group[0].geometry.coordinates[0].toFixed(5),
        group[0].geometry.coordinates[1].toFixed(5),
      ].join(":");
      hasOnsiteAtCoord.add(coordKey);
    }
  }

  return [...grouped.entries()].map(([id, group]) => {
    let primary = group[0];
    const isRemote = primary.properties.markerType === "remote";
    const coordKey = [
      primary.geometry.coordinates[0].toFixed(5),
      primary.geometry.coordinates[1].toFixed(5),
    ].join(":");

    // If an office has both onsite and remote roles, offset the remote dot slightly East (~180m)
    // so both the purple office dot and cyan remote dot are clearly visible side-by-side
    if (isRemote && hasOnsiteAtCoord.has(coordKey)) {
      primary = {
        ...primary,
        geometry: {
          ...primary.geometry,
          coordinates: [
            primary.geometry.coordinates[0] + 0.002,
            primary.geometry.coordinates[1],
          ],
        },
      };
    }

    return {
      id,
      primary,
      features: group,
    };
  });
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
    if (group) {
      group.push(feature);
    } else {
      grouped.set(key, [feature]);
    }
  }

  return [...grouped.entries()].map(([id, group]) => ({
    id,
    primary: group[0],
    features: group,
  }));
}

function normalizeMarkerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createJobMarkerElement(
  properties: JobFeatureProperties,
  count: number,
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `nearhire-job-marker nearhire-job-marker--${properties.markerType}`;
  element.title =
    count > 1
      ? `${properties.company} - ${count} roles at this office`
      : `${properties.company} - ${properties.title}`;
  element.setAttribute("aria-label", element.title);

  const glow = document.createElement("span");
  glow.className = "nearhire-marker-glow";
  element.appendChild(glow);

  const ripple = document.createElement("span");
  ripple.className = "nearhire-marker-ripple";
  element.appendChild(ripple);

  const face = document.createElement("span");
  face.className = "nearhire-marker-face";
  element.appendChild(face);

  if (properties.logoUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = properties.logoUrl;
    image.addEventListener("load", () => element.classList.add("has-logo"));
    image.addEventListener("error", () => image.remove());
    face.appendChild(image);
  }

  const initials = document.createElement("span");
  initials.className = "nearhire-marker-initials";
  initials.textContent = properties.logoText;
  face.appendChild(initials);

  if (count > 1) {
    const badge = document.createElement("span");
    badge.className = "nearhire-marker-count";
    badge.textContent = String(count);
    element.appendChild(badge);
  }

  return element;
}

function createEntityMarkerElement(
  properties: EntityFeatureProperties,
  count: number,
): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `nearhire-entity-marker nearhire-entity-marker--${properties.type}`;
  element.title =
    count > 1
      ? `${count} ${entityLabelPlural(properties.type)} at this location`
      : `${entityLabel(properties.type)} - ${properties.name}`;
  element.setAttribute("aria-label", element.title);

  const glow = document.createElement("span");
  glow.className = "nearhire-marker-glow";
  element.appendChild(glow);

  if (properties.type !== "radar") {
    const ripple = document.createElement("span");
    ripple.className = "nearhire-marker-ripple";
    element.appendChild(ripple);
  }

  const face = document.createElement("span");
  face.className = "nearhire-marker-face";
  element.appendChild(face);

  if (properties.logoUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = properties.logoUrl;
    image.addEventListener("load", () => element.classList.add("has-logo"));
    image.addEventListener("error", () => image.remove());
    face.appendChild(image);
  }

  const initials = document.createElement("span");
  initials.className = "nearhire-marker-initials";
  initials.textContent = properties.logoText;
  face.appendChild(initials);

  if (count > 1) {
    const badge = document.createElement("span");
    badge.className = "nearhire-marker-count";
    badge.textContent = String(count);
    element.appendChild(badge);
  }

  return element;
}

function companyInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function companyLogoUrl(job: NormalizedJob): string {
  if (job.company?.logoUrl) {
    return job.company.logoUrl;
  }

  const website = job.company?.website;
  if (!website) {
    return "";
  }

  try {
    const { hostname } = new URL(website);
    if (isAtsHost(hostname)) {
      return "";
    }
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function isAtsHost(hostname: string): boolean {
  return /(ashbyhq|greenhouse|lever|workable)\.com$|lever\.co$/.test(hostname);
}

function distanceLabel(job: NormalizedJob): string {
  if (job.workMode === "remote") {
    return "Remote role";
  }
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
  if (entity.type === "radar") {
    return "18h";
  }
  if (entity.type === "investor") {
    return "VC";
  }
  if (entity.type === "event") {
    return "EV";
  }
  return companyInitials(entity.name);
}

function entityLabel(type: MapEntityType): string {
  const labels: Record<MapEntityType, string> = {
    startup: "Startup",
    investor: "Investor",
    event: "Event venue",
    radar: "Scanning sector",
  };
  return labels[type];
}

function entityLabelPlural(type: MapEntityType): string {
  const labels: Record<MapEntityType, string> = {
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
    city_level: "City-level location, spread visually",
    region_level: "Region-level location",
    country_level: "Country-level location",
    remote: "Remote",
    unknown: "Unknown precision",
  };
  return labels[confidence];
}

function createCurrentLocationElement(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "nearhire-current-location";
  element.title = "Search location";
  return element;
}

function popupHtml(properties: JobFeatureProperties): string {
  return `
    <div class="nearhire-popup-card">
      <strong>${escapeHtml(properties.title)}</strong>
      <span>${escapeHtml(properties.company)}</span>
      <small>${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
      <a href="${escapeAttribute(properties.applyUrl)}" target="_blank" rel="noreferrer">Apply directly</a>
    </div>
  `;
}

function entityPopupHtml(group: EntityMarkerGroup): string {
  const properties = group.primary.properties;

  if (properties.type === "radar") {
    return `
      <div class="nearhire-popup-card nearhire-radar-popup" style="min-width: 250px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 10px #8b5cf6;"></span>
          <span style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#7c3aed;text-transform:uppercase;">Discovery Radar · 18h Countdown</span>
        </div>
        <strong style="font-size:15px;font-weight:700;color:#111827;display:block;margin-bottom:2px;">${escapeHtml(properties.name)}</strong>
        <small style="display:block;color:#6b7280;margin-bottom:10px;">${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
        
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;margin-bottom:10px;">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            
            <div style="font-size:12px;color:#4c1d95;line-height:1.45;">
              <strong>Companies being indexed:</strong> New tech firms, GCCs, and startups in this sector are being verified and mapped.
            </div>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #c4b5fd;font-size:11px;color:#6d28d9;display:flex;align-items:center;justify-content:space-between;">
            <span><strong>Countdown:</strong> Updating in 18 hrs</span>
            <span>Live Indexing</span>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#7c3aed;font-weight:600;padding:2px 4px;">
          <span>Coverage target: Active hiring</span>
          <span style="color:#059669;">● Live sync</span>
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
    <div class="nearhire-popup-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(entityLabel(properties.type))}</span>
      <small>${escapeHtml(properties.location)} - ${escapeHtml(properties.distance)}</small>
      
      ${
        group.features.length > 1
          ? `<ul class="nearhire-popup-list">${extraItems}${
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
