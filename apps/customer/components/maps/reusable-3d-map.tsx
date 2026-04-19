"use client";

import { MapPinned, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
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
  className?: string;
};

const DEFAULT_VIEW = {
  longitude: -73.98513,
  latitude: 40.758896,
  zoom: 10.8,
  pitch: 50,
  bearing: 12,
};

const CAMERA_DURATION_MS = 1_450;

function enableThreeDimensionalScene(map: MapboxMap) {
  try {
    map.setConfigProperty("basemap", "show3dObjects", true);
    map.setConfigProperty("basemap", "lightPreset", "dawn");
  } catch {
    // Standard style config is not available on every style.
  }

  if (map.getLayer("reusable-3d-buildings")) {
    return;
  }

  const style = map.getStyle();
  const labelLayerId = style.layers?.find(
    (layer) => layer.type === "symbol" && Boolean(layer.layout?.["text-field"]),
  )?.id;

  if (!style.sources || !("composite" in style.sources)) {
    return;
  }

  try {
    map.addLayer(
      {
        id: "reusable-3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": "#f4e7cf",
          "fill-extrusion-opacity": 0.8,
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            0,
            15,
            ["coalesce", ["get", "height"], 0],
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            0,
            15,
            ["coalesce", ["get", "min_height"], 0],
          ],
        },
      },
      labelLayerId,
    );
  } catch {
    // Some styles already manage extrusions internally.
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
  className,
}: Reusable3DMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [popupHover, setPopupHover] = useState(false);

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

  const animateToOverview = useCallback(() => {
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

  const animateToLocation = useCallback(
    (location: MapLocation) => {
      const map = mapRef.current;
      if (!map) return;

      map.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 15,
        pitch: 60,
        bearing: 15,
        duration: CAMERA_DURATION_MS,
        essential: true,
      });
    },
    [],
  );

  useEffect(() => {
    if (!mapReady) return;

    if (selectedLocation) {
      animateToLocation(selectedLocation);
      return;
    }

    animateToOverview();
  }, [animateToLocation, animateToOverview, mapReady, selectedLocation]);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    enableThreeDimensionalScene(map);
    setMapReady(true);
  }, []);

  const handleMapClick = useCallback(() => {
    if (popupHover) return;
    handleSelectLocation(null);
  }, [handleSelectLocation, popupHover]);

  if (!token) {
    return (
      <div className={`reusable-map-shell ${className ?? ""}`}>
        <div className="flex h-full min-h-[26rem] flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPinned size={24} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Mapbox Token Missing</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
              Add <code className="rounded bg-surface px-1.5 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
              your environment to render the reusable 3D map.
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
        mapLib={import("mapbox-gl")}
        mapStyle="mapbox://styles/mapbox/standard"
        initialViewState={overviewCamera}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
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
              anchor="center"
            >
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
            </Marker>
          );
        })}

        {showPopup && selectedLocation ? (
          <Popup
            longitude={selectedLocation.longitude}
            latitude={selectedLocation.latitude}
            anchor="top"
            offset={24}
            closeButton
            closeOnClick={false}
            className="reusable-map-popup"
            onClose={() => handleSelectLocation(null)}
          >
            <div
              className="space-y-3"
              onMouseEnter={() => setPopupHover(true)}
              onMouseLeave={() => setPopupHover(false)}
            >
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

              <div className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant ring-1 ring-outline-variant/15">
                3D focus active
              </div>
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
