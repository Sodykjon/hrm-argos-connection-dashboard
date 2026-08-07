import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TARKIB,
  vrachTaminlShare,
  risk5Share,
} from "@/lib/tarkib";
import { regionFromSlug, regionLabel } from "@/lib/regions";
import { TarkibHero } from "@/components/tarkib/TarkibHero";
import { CompositionStack } from "@/components/tarkib/CompositionStack";
import { CatsTable } from "@/components/tarkib/CatsTable";
import { DistrictTable } from "@/components/tarkib/DistrictTable";
import { GapsTable } from "@/components/tarkib/GapsTable";
import { BandBars } from "@/components/tarkib/BandBars";
import { StatTile } from "@/components/StatTile";
import { fmtDate, fmtInt } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TarkibRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const S = await getS();
  const lang = await getLang();
  const { region: slug } = await params;

  const known = Object.keys(TARKIB.regions);
  const name = regionFromSlug(slug, known);
  if (!name) notFound();

  const region = TARKIB.regions[name];
  if (!region) notFound();

  // Rank 1 = the lowest doctor coverage, matching the board's ordering.
  const rankOrder = known
    .map((n) => ({ n, share: vrachTaminlShare(TARKIB.regions[n]) }))
    .sort((a, b) => a.share - b.share);
  const rank = rankOrder.findIndex((r) => r.n === name) + 1;

  const sof = region.qabul - region.boshagan;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/tarkib"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.tarkib.navTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">
            {regionLabel(name, lang)}
          </h1>
          <p className="text-[0.78rem] text-ink-faint">
            {S.tarkib.rankOf(rank, known.length)} ·{" "}
            <span className="tnum">{fmtDate(TARKIB.date)}</span> {S.tarkib.asOf}
          </p>
        </div>
      </div>

      <TarkibHero region={region} />

      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.sourceNote(fmtDate(TARKIB.date))}
      </p>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={S.tarkib.shtat}
          value={region.shtat}
          accent="sov"
          hint={S.tarkib.shtatHint}
        />
        <StatTile
          label={S.tarkib.jismoniy}
          value={region.jismoniy}
          accent="ul"
          hint={S.tarkib.jismoniyHint}
        />
        <StatTile
          label={S.tarkib.pensTile}
          value={region.pens}
          accent="och"
          shareOfTotal={
            region.jismoniy > 0 ? region.pens / region.jismoniy : undefined
          }
        />
        <StatTile
          label={S.tarkib.riskTile}
          value={region.pens + region.yaqin}
          accent="un"
          shareOfTotal={region.jismoniy > 0 ? risk5Share(region) : undefined}
          hint={S.tarkib.riskTileHint}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 text-[0.95rem] font-semibold">{S.tarkib.catsTitle}</h2>
        <CatsTable region={region} />
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-[0.95rem] font-semibold">{S.tarkib.compTitle}</h2>
          <p className="text-[0.78rem] text-ink-soft">
            {fmtInt(region.jismoniy)} {S.tarkib.compHint}
          </p>
        </div>
        <div className="mb-5">
          <CompositionStack region={region} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <BandBars
            title={S.tarkib.bandsYosh}
            labels={S.tarkib.yosh}
            values={region.yosh}
            total={region.jismoniy}
            color="var(--color-sov)"
          />
          <BandBars
            title={S.tarkib.bandsStaj}
            labels={S.tarkib.staj}
            values={region.staj}
            total={region.jismoniy}
            color="var(--color-ul)"
          />
          <BandBars
            title={S.tarkib.bandsToifa}
            labels={S.tarkib.toifa}
            values={region.toifa}
            total={region.jismoniy}
            color="var(--color-goal)"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.95rem] font-semibold">{S.tarkib.distTitle}</h2>
            <span className="eyebrow">{S.tarkib.distHint}</span>
          </div>
          <DistrictTable districts={region.districts} />
        </section>
        <section className="card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-[0.95rem] font-semibold">{S.tarkib.gapsTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.tarkib.gapsHint}</p>
          </div>
          <GapsTable gaps={region.gaps} />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-[0.78rem]">
            <Fact label={S.tarkib.facts.dekret} value={fmtInt(region.dekret)} />
            <Fact
              label={S.tarkib.facts.qabul}
              value={`${fmtInt(region.qabul)} / −${fmtInt(region.boshagan)} (${
                sof < 0 ? "−" : "+"
              }${fmtInt(Math.abs(sof))})`}
            />
            <Fact
              label={S.tarkib.facts.fan}
              value={S.tarkib.facts.fanDetail(region.fanD, region.fanN)}
            />
            <Fact label={S.tarkib.facts.toifasiz} value={fmtInt(region.toifa[2] ?? 0)} />
          </dl>
        </section>
      </div>

      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.qualityNote}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tnum mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
