import {
  Minus,
  Plus,
  Maximize,
  RotateCw,
  Trash2,
  Edit3,
} from "lucide-react";

export function Canvas() {
  return (
    <div className="flex-1 bg-surface-container-lowest relative overflow-hidden flex items-center justify-center p-8">
      {/* Grid dots */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(#865300 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-8 right-8 bg-surface/80 backdrop-blur-md p-1.5 rounded-xl shadow-sm flex items-center gap-1 z-10 border border-outline-variant/10">
        <button className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
          <Minus size={16} />
        </button>
        <span className="text-xs font-headline font-semibold text-on-surface px-2">
          100%
        </span>
        <button className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
          <Plus size={16} />
        </button>
        <div className="w-px h-5 bg-outline-variant/30 mx-1" />
        <button className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
          <Maximize size={16} />
        </button>
      </div>

      {/* Floor Plan Canvas */}
      <div className="relative w-[800px] h-[600px] bg-surface rounded-xl border border-outline-variant/20 shadow-sm">
        <div className="absolute inset-4 border-4 border-on-surface-variant/20 rounded-lg pointer-events-none" />

        {/* Entrance */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-surface z-10 flex items-center justify-center">
          <div className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-widest">
            Entrance
          </div>
        </div>

        {/* Main Bar */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-surface-container-high rounded-xl flex items-center justify-center border border-outline-variant/30 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group">
          <div className="text-sm font-headline font-semibold text-on-surface-variant">
            Main Espresso Bar
          </div>
          <button className="absolute -top-3 -right-3 w-8 h-8 bg-surface rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-primary hover:bg-surface-container">
            <Edit3 size={14} />
          </button>
        </div>

        {/* Table 1 - Selected */}
        <div className="absolute top-48 left-20 w-16 h-16 rounded-full border-2 border-primary bg-primary/5 flex items-center justify-center cursor-move shadow-sm ring-4 ring-primary/20 z-20">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          <div className="w-3 h-3 bg-primary rounded-full absolute -top-1.5" />
          <div className="w-3 h-3 bg-primary rounded-full absolute -bottom-1.5" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded-lg text-xs font-headline font-medium whitespace-nowrap flex items-center gap-2 shadow-sm">
            <span>T-01</span>
            <div className="w-px h-3 bg-outline/50" />
            <RotateCw size={12} className="cursor-pointer hover:text-primary-fixed-dim" />
            <Trash2 size={12} className="cursor-pointer hover:text-error" />
          </div>
        </div>

        {/* Table 2 */}
        <div className="absolute top-48 left-48 w-16 h-16 rounded-full border-2 border-outline-variant flex items-center justify-center cursor-move hover:border-primary/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute -top-1.5" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute -bottom-1.5" />
        </div>

        {/* Table 3 - Long */}
        <div className="absolute top-48 right-24 w-24 h-16 border-2 border-outline-variant rounded-lg flex items-center justify-center cursor-move hover:border-primary/50 transition-colors">
          <div className="w-16 h-8 bg-surface-container-highest rounded-sm" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute top-2 -left-1.5" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute bottom-2 -left-1.5" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute top-2 -right-1.5" />
          <div className="w-3 h-3 bg-outline-variant rounded-full absolute bottom-2 -right-1.5" />
        </div>

        {/* Lounge Area */}
        <div className="absolute bottom-16 right-16 w-64 h-48 bg-surface-container-lowest border-2 border-dashed border-outline-variant/40 rounded-[40px] rounded-tl-[10px] flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-headline font-semibold text-on-surface-variant/50 mb-2">
            Lounge Area
          </span>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-surface-container border border-outline-variant/30" />
            <div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant/30" />
            <div className="w-10 h-10 rounded-[10px] bg-surface-container border border-outline-variant/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
