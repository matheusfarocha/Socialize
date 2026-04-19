"use client";

import type { PresenceProfile, TableSummary } from "@/lib/presence";

interface PresenceProfileModalProps {
  open: boolean;
  venueName: string;
  draft: PresenceProfile | null;
  tables: TableSummary[];
  tableOccupancy?: Record<string, number>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChange: (field: keyof PresenceProfile, value: string | null) => void;
  onSave: () => void;
}

export function PresenceProfileModal({
  open,
  venueName,
  draft,
  tables,
  tableOccupancy,
  saving,
  error,
  onClose,
  onChange,
  onSave,
}: PresenceProfileModalProps) {
  if (!open || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/35 px-4 py-6 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-xl rounded-[2rem] bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              People At The Cafe
            </p>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">Set your public cafe profile</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Only initials, occupation, interests, and your current table are shared inside {venueName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface"
          >
            Later
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-on-surface">
              <span>Initials</span>
              <input
                value={draft.initials}
                onChange={(event) => onChange("initials", event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm uppercase outline-none transition focus:border-primary"
                maxLength={4}
                placeholder="JS"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-on-surface">
              <span>Occupation</span>
              <input
                value={draft.occupation}
                onChange={(event) => onChange("occupation", event.target.value)}
                className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                maxLength={80}
                placeholder="Product designer"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-on-surface">
            <span>Interests</span>
            <textarea
              value={draft.interests}
              onChange={(event) => onChange("interests", event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
              maxLength={120}
              placeholder="Coffee roasting, UX systems, startup weekends"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-on-surface">
            <span>Current table</span>
            <select
              value={draft.tableId ?? ""}
              onChange={(event) => onChange("tableId", event.target.value || null)}
              className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="">Walking around / not seated yet</option>
              {tables.map((table) => {
                const occupancy = tableOccupancy?.[table.id] ?? 0;
                return (
                  <option key={table.id} value={table.id}>
                    {table.label} - {table.zoneName}
                    {table.seats ? ` - ${occupancy}/${table.seats} seats` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-container-high px-5 py-3 text-sm font-semibold text-on-surface"
          >
            Keep browsing
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Go visible"}
          </button>
        </div>
      </div>
    </div>
  );
}
