import { getLatestKadrlar } from "@/lib/data";
import { vacancyMetrics } from "@/lib/vakansiya-metrics";
import { VakansiyaHero } from "@/components/vakansiya/VakansiyaHero";
import { VakansiyaBoard } from "@/components/vakansiya/VakansiyaBoard";
import { VakansiyaTable } from "@/components/vakansiya/VakansiyaTable";
import { StatTile } from "@/components/StatTile";
import { LiveSync } from "@/components/LiveSync";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function VakansiyaPage() {
  const S = await getS();
  const { snapshot } = await getLatestKadrlar();
  const { overall, regions } = snapshot;
  const m = vacancyMetrics(overall);

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.vakansiya.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.vakansiya.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LiveSync />
          <p className="tnum text-[0.75rem] text-ink-faint">
            {fmtDate(snapshot.date)} {S.vakansiya.asOf}
          </p>
        </div>
      </header>

      <VakansiyaHero stat={overall} />

      {/* ARGOS publishes several staff totals; the note names which one the
          denominator came from, and how the rate is computed. */}
      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.vakansiya.sourceNote(fmtDate(snapshot.date))}
      </p>

      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem className="h-full">
          <StatTile label={S.vakansiya.stavka} value={m.stavka} accent="sov" hint={S.vakansiya.stavkaHint} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.vakansiya.filled}
            value={m.filled}
            accent="ul"
            shareOfTotal={m.stavka > 0 ? m.filled / m.stavka : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.vakansiya.vacant}
            value={m.vacant}
            accent="un"
            shareOfTotal={m.stavka > 0 ? m.rate : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.vakansiya.accepted}
            value={m.accepted}
            accent="och"
            hint={`${S.vakansiya.dismissed}: ${m.dismissed}`}
          />
        </RevealItem>
      </RevealGroup>

      {regions.length === 0 ? (
        <Reveal>
          <div className="card p-6 text-center">
            <p className="text-[0.95rem] font-semibold">{S.vakansiya.noRegions}</p>
            <p className="mx-auto mt-1.5 max-w-[62ch] text-[0.82rem] text-ink-soft">
              {S.vakansiya.noRegionsHint}
            </p>
          </div>
        </Reveal>
      ) : null}

      {regions.length > 0 && (
        <Reveal>
          <VakansiyaBoard regions={regions} />
        </Reveal>
      )}

      {/* No turnover chart. Verified 06.08.2026 that the regional accepted
          figures largely measure bulk onboarding into ARGOS, not hiring —
          133 of Samarkand's 224 orgs entered 80%+ of their whole staff as
          "accepted" in the period. A chart of that is disinformation with a
          legend; the raw columns stay available in the table below. */}

      {regions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[0.95rem] font-semibold">{S.vakansiya.tableTitle}</h2>
          <VakansiyaTable
            rows={regions}
            exportName={`HRM_vakansiya_${snapshot.date}`}
          />
        </section>
      )}
    </div>
  );
}
