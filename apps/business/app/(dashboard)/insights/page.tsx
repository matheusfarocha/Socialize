import { TopBar } from "@/components/top-bar";
import { Droplets, Leaf, Package } from "lucide-react";
import { insights } from "@/lib/mock-data";

export default function InsightsPage() {
  return (
    <>
      <TopBar />
      <div className="flex-1 pt-24 pb-12 px-4 md:px-12 max-w-5xl mx-auto w-full overflow-y-auto">
        <div className="mb-12 max-w-3xl">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-4 leading-tight">
            Here&apos;s what we&apos;ve brewed up for you today.
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed">
            Based on recent patterns, we&apos;ve spotted some interesting trends
            that might help you run things a bit smoother.
          </p>
        </div>

        <div className="space-y-10">
          {insights.map((insight) => {
            const TagIcon = insight.tagIcon;
            return (
              <article
                key={insight.title}
                className="bg-surface-container-low rounded-[2rem] p-6 md:p-10 flex flex-col gap-8 items-center group hover:bg-surface-container-high transition-colors duration-300"
              >
                <div className="flex-1 space-y-4 max-w-3xl">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold tracking-wide ${insight.tagColor}`}
                  >
                    <TagIcon size={14} />
                    {insight.tag}
                  </div>
                  <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                    {insight.title}
                  </h2>
                  <p className="text-lg text-on-surface-variant leading-relaxed">
                    {insight.description}
                  </p>
                  <button className="mt-4 bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-medium hover:bg-primary-fixed transition-colors">
                    {insight.cta}
                  </button>
                </div>
              </article>
            );
          })}

          {/* Inventory Insight with data cards */}
          <article className="bg-surface-container-low rounded-[2rem] p-6 md:p-10 group hover:bg-surface-container-high transition-colors duration-300">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container/50 text-secondary rounded-full text-sm font-semibold tracking-wide">
                  <Package size={14} />
                  Inventory Check
                </div>
                <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
                  Oat milk is outpacing Almond.
                </h2>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  It finally happened. For the first time this quarter, Oat milk
                  requests have surpassed Almond milk by a wide margin. We might
                  run low before the weekend delivery.
                </p>
                <button className="mt-4 bg-secondary text-on-secondary px-6 py-3 rounded-full font-medium hover:opacity-90 transition-colors">
                  Adjust Next Order
                </button>
              </div>
              <div className="w-full md:w-5/12 grid grid-cols-2 gap-4">
                <div className="bg-surface-container-highest rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                  <Droplets
                    size={32}
                    className="text-secondary mb-2"
                  />
                  <span className="text-2xl font-bold text-on-surface mb-1">
                    68%
                  </span>
                  <span className="text-sm text-on-surface-variant">
                    Oat Preference
                  </span>
                </div>
                <div className="bg-surface-container-highest rounded-2xl p-6 flex flex-col justify-center items-center text-center opacity-70">
                  <Leaf
                    size={32}
                    className="text-on-surface-variant mb-2"
                  />
                  <span className="text-2xl font-bold text-on-surface-variant mb-1">
                    32%
                  </span>
                  <span className="text-sm text-on-surface-variant">
                    Almond Preference
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
