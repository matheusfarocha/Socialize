"use client";

import React from "react";
import {
  Minus,
  Plus,
  Maximize,
  RotateCw,
  Trash2,
  PenTool,
  DoorOpen,
  Undo2,
} from "lucide-react";

export interface FloorPoint {
  x: number;
  y: number;
}

export interface PlacedElement {
  id: string;
  kind: "table" | "structural";
  type: string;
  x: number;
  y: number;
  rotation: number;
  seats?: number;
  label?: string;
  w?: number;
  h?: number;
}

interface CanvasProps {
  outline: FloorPoint[];
  width: number;
  height: number;
  editingShape: boolean;
  selectedElementId: string | null;
  elements: PlacedElement[];
  onToggleShapeEdit: () => void;
  onOutlineChange: (outline: FloorPoint[]) => void;
  onOutlineSet: (outline: FloorPoint[]) => void;
  onSelectElement: (id: string | null) => void;
  onElementsChange: (elements: PlacedElement[]) => void;
  onUndo?: () => void;
}

function outlineToSvgPath(points: FloorPoint[]): string {
  if (points.length < 3) return "";
  return (
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ") + " Z"
  );
}

const GRID_SIZE = 5;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function pointToSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function findNearestEdgeIndex(outline: FloorPoint[], px: number, py: number): number {
  let bestDist = Infinity;
  let bestIdx = outline.length - 1;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const dist = pointToSegmentDistance(px, py, a.x, a.y, b.x, b.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

const defaultSeats: Record<string, number> = {
  round: 2,
  square: 2,
  long: 4,
  booth: 4,
};

function nextElementId(elements: PlacedElement[], kind: string, type: string): string {
  const prefix =
    kind === "table"
      ? "T"
      : type === "bar"
        ? "BAR"
        : type === "wall"
          ? "W"
          : "ENT";
  const existing = elements.filter((e) => e.id.startsWith(prefix + "-"));
  const maxNum = existing.reduce((max, e) => {
    const num = parseInt(e.id.split("-")[1] || "0");
    return Math.max(max, isNaN(num) ? 0 : num);
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(2, "0")}`;
}

export function Canvas({
  outline,
  width,
  height,
  editingShape,
  selectedElementId,
  elements,
  onToggleShapeEdit,
  onOutlineChange,
  onOutlineSet,
  onSelectElement,
  onElementsChange,
  onUndo,
}: CanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(0);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const zoomRef = React.useRef(zoom);
  const panRef = React.useRef(pan);
  const outlineRef = React.useRef(outline);
  zoomRef.current = zoom;
  panRef.current = pan;
  outlineRef.current = outline;

  const widthRef = React.useRef(width);
  const heightRef = React.useRef(height);
  widthRef.current = width;
  heightRef.current = height;

  const fitToView = React.useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 100;
    const w = widthRef.current;
    const h = heightRef.current;
    const fit = Math.min(
      (clientWidth - padding) / w,
      (clientHeight - padding) / h,
      1.2,
    );
    const z = Math.max(MIN_ZOOM, fit);
    setZoom(z);
    setPan({
      x: (clientWidth - w * z) / 2,
      y: (clientHeight - h * z) / 2,
    });
  }, []);

  React.useEffect(() => {
    fitToView();
  }, [fitToView]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const oldZ = zoomRef.current;
        const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZ * factor));
        const p = panRef.current;
        setPan({
          x: mx - (mx - p.x) * (newZ / oldZ),
          y: my - (my - p.y) * (newZ / oldZ),
        });
        setZoom(newZ);
      } else {
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleBackgroundMouseDown(e: React.MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = { ...panRef.current };
    let panned = false;

    function onMove(me: MouseEvent) {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!panned && dx * dx + dy * dy < 16) return;
      panned = true;
      document.body.style.cursor = "grabbing";
      setPan({ x: startPan.x + dx, y: startPan.y + dy });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      if (!panned && !editingShape) onSelectElement(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!editingShape) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const snapped = {
      x: snapToGrid(Math.max(0, Math.min(100, x))),
      y: snapToGrid(Math.max(0, Math.min(100, y))),
    };
    const duplicate = outline.some((p) => p.x === snapped.x && p.y === snapped.y);
    if (duplicate) return;
    if (outline.length < 3) {
      onOutlineChange([...outline, snapped]);
    } else {
      const idx = findNearestEdgeIndex(outline, snapped.x, snapped.y);
      const updated = [...outline];
      updated.splice(idx + 1, 0, snapped);
      onOutlineChange(updated);
    }
  }

  function handlePointDrag(index: number, e: React.MouseEvent) {
    if (!editingShape) return;
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).closest("svg")!;
    const rect = svg.getBoundingClientRect();
    const snapshot = [...outline];
    let moved = false;

    function onMove(me: MouseEvent) {
      if (!moved) {
        moved = true;
        onOutlineChange(snapshot);
      }
      const x = ((me.clientX - rect.left) / rect.width) * 100;
      const y = ((me.clientY - rect.top) / rect.height) * 100;
      const clamped = {
        x: snapToGrid(Math.max(0, Math.min(100, x))),
        y: snapToGrid(Math.max(0, Math.min(100, y))),
      };
      const updated = [...outlineRef.current];
      updated[index] = clamped;
      onOutlineSet(updated);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const latest = outlineRef.current;
      if (latest.length > 3) {
        const current = latest[index];
        const overlapIdx = latest.findIndex(
          (p, i) => i !== index && p.x === current.x && p.y === current.y,
        );
        if (overlapIdx !== -1) {
          onOutlineSet(latest.filter((_, i) => i !== index));
        }
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handlePointRightClick(index: number, e: React.MouseEvent) {
    e.preventDefault();
    if (!editingShape || outline.length <= 3) return;
    onOutlineChange(outline.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    const { kind, type } = JSON.parse(data);
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = nextElementId(elements, kind, type);
    const el: PlacedElement = {
      id,
      kind,
      type,
      x: Math.round(Math.max(5, Math.min(95, x)) * 10) / 10,
      y: Math.round(Math.max(5, Math.min(95, y)) * 10) / 10,
      rotation: 0,
      seats: defaultSeats[type],
      label:
        type === "bar"
          ? "Bar"
          : type === "entrance"
            ? "Entrance"
            : undefined,
    };
    onElementsChange([...elements, el]);
    onSelectElement(el.id);
  }

  const dragRef = React.useRef(false);

  function handleElementDrag(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const container = target.closest("[data-canvas]") as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let finalX = 0;
    let finalY = 0;
    let raf = 0;
    let started = false;
    dragRef.current = false;

    function onMove(me: MouseEvent) {
      me.preventDefault();
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!started && dx * dx + dy * dy < 25) return;
      if (!started) {
        started = true;
        dragRef.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      const x = ((me.clientX - rect.left) / rect.width) * 100;
      const y = ((me.clientY - rect.top) / rect.height) * 100;
      finalX = Math.round(Math.max(5, Math.min(95, x)) * 10) / 10;
      finalY = Math.round(Math.max(5, Math.min(95, y)) * 10) / 10;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        target.style.left = `${finalX}%`;
        target.style.top = `${finalY}%`;
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (started && finalX && finalY) {
        onElementsChange(
          elements.map((el) =>
            el.id === id ? { ...el, x: finalX, y: finalY } : el,
          ),
        );
      }
      setTimeout(() => { dragRef.current = false; }, 0);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleRotate(id: string) {
    onElementsChange(
      elements.map((el) =>
        el.id === id ? { ...el, rotation: (el.rotation + 90) % 360 } : el,
      ),
    );
  }

  function handleDelete(id: string) {
    onElementsChange(elements.filter((el) => el.id !== id));
    if (selectedElementId === id) onSelectElement(null);
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-surface-container-lowest relative overflow-hidden"
      onMouseDown={handleBackgroundMouseDown}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#865300 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
        }}
      />

      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={onToggleShapeEdit}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-headline font-semibold transition-colors ${
            editingShape
              ? "bg-primary text-on-primary shadow-sm"
              : "bg-surface/80 backdrop-blur-md text-on-surface-variant hover:bg-surface-container border border-outline-variant/10"
          }`}
        >
          <PenTool size={16} />
          {editingShape ? "Done Editing Shape" : "Edit Floor Shape"}
        </button>
        {editingShape && onUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-headline font-semibold bg-surface/80 backdrop-blur-md text-on-surface-variant hover:bg-surface-container border border-outline-variant/10 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
            Undo
          </button>
        )}
      </div>

      <div className="absolute bottom-8 right-8 bg-surface/80 backdrop-blur-md p-1.5 rounded-xl shadow-sm flex items-center gap-1 z-10 border border-outline-variant/10">
        <button
          onClick={() => {
            const newZ = Math.max(MIN_ZOOM, zoom * 0.85);
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            const cx = clientWidth / 2;
            const cy = clientHeight / 2;
            setPan((p) => ({
              x: cx - (cx - p.x) * (newZ / zoom),
              y: cy - (cy - p.y) * (newZ / zoom),
            }));
            setZoom(newZ);
          }}
          className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
        >
          <Minus size={16} />
        </button>
        <span className="text-xs font-headline font-semibold text-on-surface px-2 min-w-[3rem] text-center">
          {zoomPct}%
        </span>
        <button
          onClick={() => {
            const newZ = Math.min(MAX_ZOOM, zoom * 1.15);
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            const cx = clientWidth / 2;
            const cy = clientHeight / 2;
            setPan((p) => ({
              x: cx - (cx - p.x) * (newZ / zoom),
              y: cy - (cy - p.y) * (newZ / zoom),
            }));
            setZoom(newZ);
          }}
          className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
        >
          <Plus size={16} />
        </button>
        <div className="w-px h-5 bg-outline-variant/30 mx-1" />
        <button
          onClick={fitToView}
          className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
        >
          <Maximize size={16} />
        </button>
      </div>

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width,
          height,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <div
          data-canvas
          className="relative select-none"
          style={{ width, height }}
          onClick={() => {
            if (!editingShape) onSelectElement(null);
          }}
          onDragOver={(e) => {
            if (!editingShape) e.preventDefault();
          }}
          onDrop={!editingShape ? handleDrop : undefined}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            overflow="visible"
            className={`absolute inset-0 w-full h-full ${editingShape ? "cursor-crosshair" : ""}`}
            onMouseDown={editingShape ? (e) => e.stopPropagation() : undefined}
            onClick={handleCanvasClick}
          >
            <defs>
              <filter id="floorShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="0.5" stdDeviation="1.5" floodColor="#514437" floodOpacity="0.15" />
              </filter>
            </defs>
            <path
              d={outlineToSvgPath(outline)}
              fill="#f7f3ed"
              stroke="#514437"
              strokeWidth="0.5"
              strokeOpacity="0.3"
              filter="url(#floorShadow)"
            />
            <defs>
              <pattern
                id="grid"
                width="5"
                height="5"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.15" />
              </pattern>
              {editingShape && (
                <pattern
                  id="editGrid"
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#865300" strokeWidth="0.15" opacity="0.3" />
                </pattern>
              )}
              <clipPath id="floorClip">
                <path d={outlineToSvgPath(outline)} />
              </clipPath>
            </defs>
            <rect
              width="100"
              height="100"
              fill="url(#grid)"
              clipPath="url(#floorClip)"
            />
            {editingShape && (
              <rect
                width="100"
                height="100"
                fill="url(#editGrid)"
                clipPath="url(#floorClip)"
              />
            )}
            <path
              d={outlineToSvgPath(outline)}
              fill="none"
              stroke="#514437"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />

            {editingShape &&
              (() => {
                const aspect = width / height;
                const rx = 2;
                const ry = rx * aspect;
                return outline.map((point, i) => (
                  <g key={i}>
                    <line
                      x1={point.x}
                      y1={point.y}
                      x2={outline[(i + 1) % outline.length].x}
                      y2={outline[(i + 1) % outline.length].y}
                      stroke="#865300"
                      strokeWidth="0.6"
                      strokeDasharray="1.5 1"
                      opacity="0.6"
                    />
                    <ellipse
                      cx={point.x}
                      cy={point.y}
                      rx={rx}
                      ry={ry}
                      fill="#865300"
                      stroke="white"
                      strokeWidth="0.6"
                      className="cursor-move"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => handlePointDrag(i, e)}
                      onContextMenu={(e) => handlePointRightClick(i, e)}
                    />
                  </g>
                ));
              })()}
          </svg>

          {!editingShape &&
            elements.map((el) => {
              const isSelected = selectedElementId === el.id;
              return (
                <ElementView
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  dragRef={dragRef}
                  onSelect={() =>
                    onSelectElement(isSelected ? null : el.id)
                  }
                  onMouseDown={(e) => handleElementDrag(el.id, e)}
                  onRotate={() => handleRotate(el.id)}
                  onDelete={() => handleDelete(el.id)}
                />
              );
            })}

          {editingShape && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-inverse-surface/90 text-inverse-on-surface px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap z-20">
              Click to add points — Drag to move — Right-click to remove — Ctrl+Z to undo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FloatingLabel({
  id,
  onRotate,
  onDelete,
  offset = -48,
}: {
  id: string;
  onRotate: () => void;
  onDelete: () => void;
  offset?: number;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded-lg text-xs font-headline font-medium whitespace-nowrap flex items-center gap-2 shadow-sm z-30"
      style={{ top: offset }}
    >
      <span>{id}</span>
      <div className="w-px h-3 bg-outline/50" />
      <RotateCw
        size={12}
        className="cursor-pointer hover:text-primary-fixed-dim"
        onClick={(e) => {
          e.stopPropagation();
          onRotate();
        }}
      />
      <Trash2
        size={12}
        className="cursor-pointer hover:text-error"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}

function ElementView({
  element,
  isSelected,
  dragRef,
  onSelect,
  onMouseDown,
  onRotate,
  onDelete,
}: {
  element: PlacedElement;
  isSelected: boolean;
  dragRef: React.RefObject<boolean>;
  onSelect: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onRotate: () => void;
  onDelete: () => void;
}) {
  const pos: React.CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
  };

  const sel = isSelected
    ? "ring-4 ring-primary/20 border-primary z-20"
    : "";
  const hover = !isSelected ? "hover:border-primary/50" : "";
  const borderColor = isSelected
    ? "border-primary bg-primary/5"
    : "border-outline-variant";

  const common = {
    style: pos,
    draggable: false as const,
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!dragRef.current) onSelect();
    },
    onMouseDown,
  };

  const label = isSelected ? (
    <FloatingLabel id={element.id} onRotate={onRotate} onDelete={onDelete} />
  ) : null;

  switch (element.type) {
    case "round":
      return (
        <div
          className={`absolute w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors ${sel} ${hover} ${borderColor}`}
          {...common}
        >
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          {label}
        </div>
      );
    case "square":
      return (
        <div
          className={`absolute w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${sel} ${hover} ${borderColor}`}
          {...common}
        >
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
          {label}
        </div>
      );
    case "long":
      return (
        <div
          className={`absolute w-24 h-16 border-2 rounded-lg flex items-center justify-center transition-colors ${sel} ${hover} ${borderColor}`}
          {...common}
        >
          <div className="w-16 h-8 bg-surface-container-highest rounded-sm" />
          {label}
        </div>
      );
    case "booth":
      return (
        <div
          className={`absolute w-14 h-14 border-2 rounded-[10px] rounded-tl-[24px] flex items-center justify-center transition-colors ${sel} ${hover} ${borderColor}`}
          {...common}
        >
          <div className="w-8 h-8 rounded-[6px] rounded-tl-[16px] bg-surface-container-highest" />
          {label}
        </div>
      );
    case "bar": {
      const barW = element.w ?? 256;
      const barH = element.h ?? 96;
      return (
        <div
          className={`absolute bg-surface-container-high rounded-xl flex items-center justify-center border shadow-sm transition-colors ${
            isSelected
              ? "border-primary ring-4 ring-primary/20 z-20"
              : "border-outline-variant/30 hover:ring-2 hover:ring-primary/40"
          }`}
          {...common}
          style={{ ...pos, width: barW, height: barH }}
        >
          <div className="text-sm font-headline font-semibold text-on-surface-variant">
            {element.label || "Bar"}
          </div>
          {label}
        </div>
      );
    }
    case "entrance":
      return (
        <div
          className={`absolute w-24 h-8 flex items-center justify-center transition-colors border-2 border-dashed rounded-md ${
            isSelected
              ? "border-primary bg-primary/5 ring-4 ring-primary/20 z-20"
              : "border-primary/30 bg-primary/5 hover:border-primary/50"
          }`}
          {...common}
        >
          <DoorOpen size={12} className="text-primary mr-1" />
          <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-widest">
            {element.label || "Entrance"}
          </span>
          {isSelected && (
            <FloatingLabel
              id={element.id}
              onRotate={onRotate}
              onDelete={onDelete}
              offset={-36}
            />
          )}
        </div>
      );
    case "wall": {
      const wallW = element.w ?? 96;
      return (
        <div
          className={`absolute h-2 rounded-full transition-colors ${
            isSelected
              ? "bg-on-surface ring-4 ring-primary/20 z-20"
              : "bg-on-surface-variant/40 hover:bg-on-surface-variant/60"
          }`}
          {...common}
          style={{ ...pos, width: wallW }}
        >
          {isSelected && (
            <FloatingLabel
              id={element.id}
              onRotate={onRotate}
              onDelete={onDelete}
              offset={-36}
            />
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
