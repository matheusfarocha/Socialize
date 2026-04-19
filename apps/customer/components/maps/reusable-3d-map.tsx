"use client";

import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import { MapPinned, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl/mapbox";

export type MapLocation = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  category?: string;
  isHighlighted?: boolean;
  markerLabel?: string;
};

type Reusable3DMapProps = {
  locations: MapLocation[];
  selectedLocationId?: string | null;
  onSelectLocation?: (location: MapLocation | null) => void;
  onLocationActivate?: (location: MapLocation) => void;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  showPopup?: boolean;
  showResetControl?: boolean;
  showNavigationControl?: boolean;
  showMarkerLabels?: boolean;
  className?: string;
};

const DEFAULT_VIEW = {
  longitude: -73.98513,
  latitude: 40.758896,
  zoom: 10.8,
  pitch: 48,
  bearing: 12,
};

const SELECTED_VIEW = {
  zoom: 15,
  pitch: 60,
  bearing: 15,
};

const CAMERA_DURATION_MS = 1200;

function configureMapScene(map: MapboxMap) {
  try {
    map.setConfigProperty("basemap", "show3dObjects", true);
    map.setConfigProperty("basemap", "lightPreset", "dawn");
  } catch {
    // Not every Mapbox style supports Standard config properties.
  }
}

export function Reusable3DMap({
  locations,
  selectedLocationId,
  onSelectLocation,
  onLocationActivate,
  initialViewState,
  showPopup = true,
  showResetControl = true,
  showNavigationControl = true,
  showMarkerLabels = false,
  className,
}: Reusable3DMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const overviewCamera = useMemo(
    () => ({
      ...DEFAULT_VIEW,
      ...initialViewState,
      pitch: initialViewState?.pitch ?? DEFAULT_VIEW.pitch,
      bearing: initialViewState?.bearing ?? DEFAULT_VIEW.bearing,
    }),
    [initialViewState],
  );

  const isControlled = selectedLocationId !== undefined;
  const activeSelectedId = isControlled ? selectedLocationId ?? null : internalSelectedId;

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === activeSelectedId) ?? null,
    [activeSelectedId, locations],
  );

  const handleSelectLocation = useCallback(
    (location: MapLocation | null) => {
      if (!isControlled) {
        setInternalSelectedId(location?.id ?? null);
      }
      onSelectLocation?.(location);
    },
    [isControlled, onSelectLocation],
  );

  const flyToOverview = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: [overviewCamera.longitude, overviewCamera.latitude],
      zoom: overviewCamera.zoom,
      pitch: overviewCamera.pitch,
      bearing: overviewCamera.bearing,
      duration: CAMERA_DURATION_MS,
      essential: true,
    });
  }, [overviewCamera]);

  const flyToLocation = useCallback((location: MapLocation) => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: [location.longitude, location.latitude],
      zoom: SELECTED_VIEW.zoom,
      pitch: SELECTED_VIEW.pitch,
      bearing: SELECTED_VIEW.bearing,
      duration: CAMERA_DURATION_MS,
      essential: true,
    });
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    if (selectedLocation) {
      flyToLocation(selectedLocation);
      return;
    }

    flyToOverview();
  }, [flyToLocation, flyToOverview, mapReady, selectedLocation]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    configureMapScene(map);
    setMapReady(true);
  }, []);

  if (!token) {
    return (
      <div className={`reusable-map-shell ${className ?? ""}`}>
        <div className="flex h-full min-h-[26rem] flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPinned size={24} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">
              Mapbox Token Missing
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
              Add <code className="rounded bg-surface px-1.5 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
              your environment to render the map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`reusable-map-shell ${className ?? ""}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapLib={mapboxgl}
        mapStyle="mapbox://styles/mapbox/standard"
        initialViewState={overviewCamera}
        onLoad={handleLoad}
        onClick={() => handleSelectLocation(null)}
        dragRotate
        touchZoomRotate
        maxPitch={70}
        reuseMaps
      >
        {showNavigationControl ? (
          <NavigationControl position="top-right" showCompass showZoom visualizePitch />
        ) : null}

        {locations.map((location) => {
          const isSelected = location.id === selectedLocation?.id;

          return (
            <Marker
              key={location.id}
              longitude={location.longitude}
              latitude={location.latitude}
              anchor="bottom"
            >
              <div className="flex flex-col items-center gap-2">
                {showMarkerLabels ? (
                  <span
                    className={`pointer-events-none whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm backdrop-blur-sm transition-all ${
                      isSelected
                        ? "border-primary/30 bg-primary text-on-primary"
                        : "border-white/70 bg-white/92 text-on-surface"
                    }`}
                  >
                    {location.markerLabel ?? location.title}
                  </span>
                ) : null}

                <button
                  type="button"
                  aria-label={`Focus ${location.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onLocationActivate) {
                      onLocationActivate(location);
                      return;
                    }
                    handleSelectLocation(location);
                  }}
                  className={`reusable-map-marker ${isSelected ? "reusable-map-marker--selected" : ""} ${
                    location.isHighlighted ? "reusable-map-marker--highlighted" : ""
                  }`}
                >
                  <span className="reusable-map-marker__pulse" />
                  <span className="reusable-map-marker__core">
                    <MapPinned size={16} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </Marker>
          );
        })}

        {showPopup && selectedLocation ? (
          <Popup
            longitude={selectedLocation.longitude}
            latitude={selectedLocation.latitude}
            anchor="top"
            offset={26}
            closeButton
            closeOnClick={false}
            className="reusable-map-popup"
            onClose={() => handleSelectLocation(null)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {selectedLocation.category ? (
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      {selectedLocation.category}
                    </p>
                  ) : null}
                  <h3 className="mt-1 text-lg font-extrabold text-on-surface">{selectedLocation.title}</h3>
                </div>
                {selectedLocation.isHighlighted ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    Focus
                  </span>
                ) : null}
              </div>

              {selectedLocation.address ? (
                <p className="text-sm font-medium text-on-surface-variant">{selectedLocation.address}</p>
              ) : null}

              {selectedLocation.description ? (
                <p className="text-sm leading-6 text-on-surface-variant">{selectedLocation.description}</p>
              ) : null}
            </div>
          </Popup>
        ) : null}

        {showResetControl && selectedLocation ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSelectLocation(null);
            }}
            className="reusable-map-reset"
          >
            <RotateCcw size={14} />
            Reset View
          </button>
        ) : null}
      </Map>
    </div>
  );
}
