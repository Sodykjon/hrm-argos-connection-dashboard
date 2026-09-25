import Link from "next/link";
import { notFound } from "next/navigation";
import { getLive } from "@/lib/argos-live-data";
import { StatTile } from "@/components/StatTile";
import { ReadinessRing } from "@/components/ReadinessRing";
import { AutoRefresh } from "@/components/argos-live/AutoRefresh";
import { LiveRegionTable } from "@/components/argos-live/LiveRegionTable";
import { LiveOrgTable } from "@/components/argos-live/LiveOrgTable";
import { fmtTashkent } from "@/components/argos-live/time";
import { regionFromSlug, regionLabel } from "@/lib/regions";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ArgosLiveRegionPage({ params }: { params: Promise<{ region: string }> }) {
  const S = await getS();
  const L = S.argosLive;
  const lang = await getLang();
  const { region: slug } = await params;
  const live = await getLive();
  if (!live) notFound();

  const name = regionFromSlug(slug, live.result.regions.map((r) => r.name));
  const region = live.result.regions.find((r) => r.name === name);
  if (!name || !region) notFound();

  const orgs = live.result.orgs
    .filter((o) => o.region === name)
    .map((o) => ({
      region: o.region,
      district: o.district,
      name: o.name,
      stir: o.stir,
      status: o.status,
      billing: o.billing,
      reason: o.reason,
    }));
  const checkedAt = live.manifest?.checkedAt ?? live.tree.at;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <AutoRefresh checkedAt={checkedAt} />
      <div>
        <Link
          href="/argos-jonli"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {L.back}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">{regionLabel(name, lang)}</h1>
          <p className="text-[0.78rem] text-ink-faint">
            {L.lastChecked}: <span className="tnum">{fmtTashkent(checkedAt)}</span>
          </p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{S.kpi.rate}</span>
          <div className="my-1">
            <ReadinessRing percent={region.percent} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label={S.kpi.total} value={region.total} accent="sov" />
          <StatTile label={S.kpi.ulangan} value={region.ulangan} accent="ul" shareOfTotal={region.percent} />
          <StatTile label={S.kpi.ulanmagan} value={region.ulanmagan} accent="un" />
          <StatTile label={S.kpi.ochirilgan} value={region.ochirilgan} accent="och" />
        </div>
      </section>

      {region.districts.length > 0 && (
        <LiveRegionTable title={L.districts} rows={region.districts} totals={region} isDistrict />
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-line p-3 sm:px-4">
          <h2 className="text-[0.95rem] font-semibold">{L.orgs}</h2>
        </div>
        <LiveOrgTable rows={orgs} />
      </section>
    </div>
  );
}
