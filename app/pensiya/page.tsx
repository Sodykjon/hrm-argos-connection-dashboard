import { getLatestPension, getPensionHistory } from "@/lib/data";
import { PensionHero } from "@/components/pension/PensionHero";
import { PensionBoard } from "@/components/pension/PensionBoard";
import { PensionAgeChart } from "@/components/pension/PensionAgeChart";
import { PensionTrend } from "@/components/pension/PensionTrend";
import { StatTile } from "@/components/StatTile";
import { LiveSync } from "@/components/LiveSync";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PensionPage() {
  const S = await getS();
  const { snapshot } = await getLatestPension();
  const history = await getPensionHistory();
  const { overall, regions } = snapshot;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.pension.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.pension.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LiveSync />
          <p className="tnum text-[0.75rem] text-ink-faint">
            {fmtDate(snapshot.date)} {S.pension.asOf}
          </p>
        </div>
      </header>

      <PensionHero stat={overall} />

      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem className="h-full">
          <StatTile label={S.pension.total} value={overall.total} accent="sov" hint={S.pension.totalHint} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.pension.working}
            value={overall.pensionWorking}
            accent="un"
            shareOfTotal={overall.total > 0 ? overall.pensionWorking / overall.total : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.pension.reaching}
            value={overall.reaching}
            accent="och"
            shareOfTotal={overall.total > 0 ? overall.reaching / overall.total : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          {/* Shown as a plain split, with no claim attached: women are 79.7% of
              the workforce, so their 74.1% of this group is BELOW the base rate
              and must never be headlined as a finding. */}
          <StatTile
            label={S.pension.women}
            value={overall.pensionWorkingWomen}
            accent="sov"
            hint={S.pension.womenHint}
          />
        </RevealItem>
      </RevealGroup>

      {regions.length === 0 ? (
        <Reveal>
          <div className="card p-6 text-center">
            <p className="text-[0.95rem] font-semibold">{S.pension.noRegions}</p>
            <p className="mx-auto mt-1.5 max-w-[62ch] text-[0.82rem] text-ink-soft">
              {S.pension.noRegionsHint}
            </p>
          </div>
        </Reveal>
      ) : null}

      {regions.length > 0 && (
        <Reveal>
          <PensionBoard regions={regions} />
        </Reveal>
      )}

      <Reveal>
        <div className="card p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.ageTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.pension.ageHint}</p>
          </div>
          <PensionAgeChart stat={overall} />
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.trendTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.pension.trendSubtitle}</p>
          </div>
          <PensionTrend history={history} />
        </div>
      </Reveal>

      {/* Task 11 inserts the region table here */}
    </div>
  );
}
