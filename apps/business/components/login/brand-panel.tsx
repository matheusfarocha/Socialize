import { Coffee } from "lucide-react";

export function BrandPanel() {
  return (
    <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-[#3d2b1f] via-[#5c3d2e] to-[#2a1f15]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-on-surface/40 to-transparent" />
      </div>

      <div className="relative z-10 p-16 flex flex-col justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg">
            <Coffee size={20} className="text-surface" />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-surface-bright font-headline">
            Socialize
          </span>
        </div>

        <div className="max-w-md">
          <h2 className="text-5xl font-extrabold tracking-tight text-surface-bright mb-6 leading-tight font-headline">
            Cultivate your <br />
            <span className="text-primary-fixed">community.</span>
          </h2>
          <p className="text-surface-bright/80 text-lg font-medium leading-relaxed">
            The modern hearth for business owners. Manage your space, connect
            with regulars, and grow your brand in one curated dashboard.
          </p>
        </div>

        <div className="flex gap-8 text-surface-bright/60 text-sm tracking-widest uppercase">
          <span>Est. 2024</span>
          <span>Boutique Management</span>
        </div>
      </div>
    </section>
  );
}
