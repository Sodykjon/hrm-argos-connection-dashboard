import Link from "next/link";
import { getLatestCompletion, getCompletionHistory } from "@/lib/data";
import { ReadinessRing } from "@/components/ReadinessRing";
import { StatTile } from "@/components/StatTile";
import { LiveFeed } from "@/components/LiveFeed";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { CompletionBoard } from "@/components/completion/CompletionBoard";
import { CompletionRegionTable } from "@/components/completion/CompletionRegionTable";
import { CompletionDistribution } from "@/components/completion/CompletionDistribution";
import { CompletionTrend } from "@/components/completion/CompletionTrend";
import { CompletionTable } from "@/components/completion/CompletionTable";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate, fmtPct, toPct, rampColor } from "@/lib/format";
import { CENTRAL } from "@/lib/regions";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CompletionPage() {
  const S = await getS();
  const { snapshot } = await getLatestCompletion();
  const history = await getCompletionHistory();
  const { overall, regions, orgs } = snapshot;

  const bands = [
    { label: "0%", frac: 0, count: orgs.filter((o) => o.completion === 0).length },
    { label: "1–25%", frac: 0.125, count: orgs.filter((o) => o.completion > 0 && o.completion < 0.25).length },
    { label: "25–50%", frac: 0.375, count: orgs.filter((o) => o.completion >= 0.25 && o.completion < 0.5).length },
    { label: "50–75%", frac: 0.625, count: orgs.filter((o) => o.completion >= 0.5 && o.completion < 0.75).length },
    { label: "75–99%", frac: 0.875, count: orgs.filter((o) => o.completion >= 0.75 && o.completion < 1).length },
    { label: "100%", frac: 1, count: orgs.filter((o) => o.completion === 1).length },
  ];

  const regionNames = regions.map((r) => r.name);
  // Use the "Марказий аппарат" group average so this card matches the region
  // page it links to; fall back to the ministry HQ org (id 1052) if the group
  // is missing. Match on the canonical key — the label is translated.
  const central =
    regions.find((r) => r.name === CENTRAL)?.avg ??
    orgs.find((o) => o.id === "1052")?.completion ??
    0;
  const centralColor = rampColor(central);

  // The campaign-start baseline for the central apparatus. NOT from stored
  // data: every CSV we hold (24.07 onwards) already shows ~90%, so the climb
  // predates the first pull. The figure is the user's own recollection,
  // supplied 07.08.2026 with an explicit instruction to show it without a
  // source. Do not "correct" it from history — history starts too late to
  // contain it. Chip and tick render only while the current value stays above
  // it, so the claim can never invert into nonsense.
  const CENTRAL_BASELINE = 0.48;
  const centralGrew = central > CENTRAL_BASELINE;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.completion.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.completion.subtitle}</p>
        </div>
        <p className="tnum text-[0.75rem] text-ink-faint">
          {fmtDate(snapshot.date)} {S.completion.asOf}
        </p>
      </header>

      {/* live streaming ticker */}
      <LiveFeed regions={regions.map((r) => ({ name: r.name, percent: r.avg }))} />

      {/* KPI row: animated average hero + stat tiles */}
      <section className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="rise card flex flex-col items-center justify-center p-5 text-center">
          <span className="eyebrow">{S.completion.avg}</span>
          <div className="relative my-1 grid place-items-center">
            <ReadinessRing percent={overall.avg} size={176} showLabel={false} />
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <AnimatedNumber
                value={toPct(overall.avg)}
                kind="pct"
                className="text-grad-ul tnum text-[2.1rem] font-bold leading-none"
              />
            </span>
          </div>
          <span className="text-[0.75rem] text-ink-faint">{S.completion.avgHint}</span>
        </div>
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RevealItem className="h-full">
            <StatTile label={S.completion.orgs} value={overall.orgCount} accent="sov" hint={S.completion.orgsHint} />
          </RevealItem>
          <RevealItem className="h-full">
            <StatTile label={S.completion.zero} value={overall.zeroCount} accent="un" hint={S.completion.zeroHint} />
          </RevealItem>
          <RevealItem className="h-full">
            <StatTile label={S.completion.below50} value={overall.below50} accent="un" hint={S.completion.below50Hint} />
          </RevealItem>
        </RevealGroup>
      </section>

      {/* central apparatus highlight */}
      <Reveal>
        <Link
          href="/toldirilish/markaziy-apparat"
          className="card card-link group flex items-center gap-4 p-4 sm:gap-5 sm:p-5"
        >
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
            style={{ background: `${centralColor}1f`, border: `1px solid ${centralColor}55` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9.5 12h.01M14.5 12h.01" stroke={centralColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[0.92rem] font-semibold">{S.completion.central}</span>
            <span className="block text-[0.75rem] text-ink-faint">{S.completion.centralHint}</span>
            {centralGrew ? (
              /* Before/after pair: two lengths side by side say "climbed" at a
                 glance, where a tick on one bar had to be hunted for. */
              <span className="mt-2.5 grid w-full max-w-[360px] grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[0.68rem] uppercase tracking-wide text-ink-faint">
                  {S.completion.centralBefore}
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <span
                    className="block h-full rounded-full bg-och/70"
                    style={{ width: `${CENTRAL_BASELINE * 100}%` }}
                  />
                </span>
                <span className="tnum text-right text-[0.78rem] text-ink-soft">
                  {fmtPct(CENTRAL_BASELINE, 0)}
                </span>

                <span className="text-[0.68rem] uppercase tracking-wide text-ink-faint">
                  {S.completion.centralNow}
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-line-soft">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${central * 100}%`,
                      background: centralColor,
                      boxShadow: `0 0 10px ${centralColor}66`,
                    }}
                  />
                </span>
                <span
                  className="tnum text-right text-[0.78rem] font-semibold"
                  style={{ color: centralColor }}
                >
                  {fmtPct(central, 1)}
                </span>
              </span>
            ) : (
              <span className="mt-2 block h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${central * 100}%`, background: centralColor }}
                />
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            {centralGrew && (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-ul/30 bg-ul-soft px-2 py-0.5 text-[0.72rem] font-bold text-ul">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M6 10V2m0 0L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {S.completion.centralDelta(
                  Math.round((central - CENTRAL_BASELINE) * 100),
                )}
              </span>
            )}
            <span className="block" style={{ color: centralColor }}>
              <AnimatedNumber
                value={toPct(central)}
                kind="pct"
                className="tnum text-[1.9rem] font-bold leading-none"
              />
            </span>
          </div>
        </Link>
      </Reveal>

      {/* map + ranking */}
      <Reveal>
        <CompletionBoard regions={regions} />
      </Reveal>

      {/* regional summary table, leadership-PDF format */}
      <Reveal>
        <CompletionRegionTable
          regions={regions}
          overall={snapshot.overall}
          exportName={`HRM_tuldirilish_hududlar_${snapshot.date}`}
        />
      </Reveal>

      {/* distribution + trend (equal size) */}
      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <Reveal className="h-full">
          <div className="card flex h-full flex-col p-4 sm:p-5">
            <div className="mb-2">
              <h2 className="text-[0.95rem] font-semibold">{S.completion.distributionTitle}</h2>
              <p className="text-[0.78rem] text-ink-soft">{S.completion.distributionHint}</p>
            </div>
            <CompletionDistribution data={bands} />
          </div>
        </Reveal>
        <Reveal className="h-full">
          <div className="card flex h-full flex-col p-4 sm:p-5">
            <div className="mb-2">
              <h2 className="text-[0.95rem] font-semibold">{S.completion.trendTitle}</h2>
              <p className="text-[0.78rem] text-ink-soft">{S.completion.trendSubtitle}</p>
            </div>
            <CompletionTrend history={history} />
          </div>
        </Reveal>
      </div>

      {/* org table */}
      <section className="space-y-3">
        <h2 className="text-[0.95rem] font-semibold">{S.completion.orgList}</h2>
        <CompletionTable
          rows={orgs}
          regions={regionNames}
          exportName={`HRM_tuldirilish_${snapshot.date}`}
        />
      </section>
    </div>
  );
}
