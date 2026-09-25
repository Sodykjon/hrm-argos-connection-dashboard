import Link from "next/link";
import { getLive } from "@/lib/argos-live-data";
import { StatTile } from "@/components/StatTile";
import { ReadinessRing } from "@/components/ReadinessRing";
import { StatusPill } from "@/components/StatusPill";
import { AutoRefresh } from "@/components/argos-live/AutoRefresh";
import { AttentionTabs } from "@/components/argos-live/AttentionTabs";
import { LiveRegionTable } from "@/components/argos-live/LiveRegionTable";
import type { LiveOrgRow } from "@/components/argos-live/LiveOrgTable";
import { fmtTashkent, isStale } from "@/components/argos-live/time";
import type { LiveOrg } from "@/lib/argos-live";
import { fmtInt } from "@/lib/format";
import { regionLabel, regionSlug } from "@/lib/regions";
import { getLang, getS } from "@/lib/i18n/server";
import { fmtPct, rampColor } from "@/lib/format";

export const dynamic = "force-dynamic";

const row = (o: LiveOrg): LiveOrgRow => ({
  region: o.region,
  district: o.district,
  name: o.name,
  stir: o.stir,
  status: o.status,
  billing: o.billing,
  reason: o.reason,
});

export default async function ArgosLivePage() {
  const S = await getS();
  const L = S.argosLive;
  const lang = await getLang();
  const live = await getLive();

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">{L.title}</h1>
        <p className="mt-1 max-w-[720px] text-[0.82rem] text-ink-soft">{L.subtitle}</p>
      </div>
      <Link
        href="/argos-jonli/ornatish"
        className="rounded-lg border border-line px-3 py-1.5 text-[0.8rem] font-medium text-sov hover:bg-paper"
      >
        {L.setup}
      </Link>
    </header>
  );

  if (!live) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-6 sm:px-6">
        {header}
        <div className="card p-6 text-[0.9rem] text-ink-soft">{L.empty}</div>
      </div>
    );
  }

  const { result, tree, manifest, changes, prevAt } = live;
  const { totals } = result;
  const checkedAt = manifest?.checkedAt ?? tree.at;
  const stale = isStale(checkedAt);

  const newConn = result.orgs.filter((o) => o.reason === "newBilling0").map(row);
  const billingOff = result.orgs.filter((o) => o.reason === "billingOff").map(row);
  const missing = result.orgs.filter((o) => o.reason === "missing" && o.reestr === "ulangan").map(row);

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <AutoRefresh checkedAt={checkedAt} />
      {header}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.78rem] text-ink-soft">
        <span>
          {L.lastChecked}: <b className="tnum text-ink">{fmtTashkent(checkedAt)}</b>
        </span>
        <span>
          {L.lastRead}: <span className="tnum">{fmtTashkent(tree.at)}</span>
        </span>
        <span className="tnum">{L.orgsInTree(fmtInt(tree.rows.length))}</span>
        <span className="text-ink-faint">{L.autoRefresh}</span>
      </div>
      {stale && (
        <div className="rounded-lg border border-un/40 bg-un-soft px-4 py-2 text-[0.8rem] text-un">{L.stale}</div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{S.kpi.rate}</span>
          <div className="my-1">
            <ReadinessRing percent={totals.percent} showLabel={false} />
          </div>
          <span className="tnum text-[2rem] font-semibold leading-none" style={{ color: rampColor(totals.percent) }}>
            {fmtPct(totals.percent, 1)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label={S.kpi.total} value={totals.total} accent="sov" />
          <StatTile label={S.kpi.ulangan} value={totals.ulangan} accent="ul" shareOfTotal={totals.percent} />
          <StatTile
            label={S.kpi.ulanmagan}
            value={totals.ulanmagan}
            accent="un"
            shareOfTotal={totals.total ? totals.ulanmagan / totals.total : 0}
          />
          <StatTile
            label={S.kpi.ochirilgan}
            value={totals.ochirilgan}
            accent="och"
            shareOfTotal={totals.total ? totals.ochirilgan / totals.total : 0}
          />
        </div>
      </section>

      <LiveRegionTable
        title={L.regionTableTitle}
        hint={L.regionTableHint}
        rows={result.regions.map((r) => ({ ...r, href: `/argos-jonli/${regionSlug(r.name)}` }))}
        totals={totals}
        exportHref="/api/argos-tree/xlsx"
      />

      {prevAt && (
        <section className="card overflow-hidden">
          <div className="border-b border-line p-3 sm:px-4">
            <h2 className="text-[0.95rem] font-semibold">
              {L.changesTitle} <span className="tnum text-ink-faint">({fmtInt(changes.length)})</span>
            </h2>
            <p className="text-[0.75rem] text-ink-faint">{L.changesHint(fmtTashkent(prevAt))}</p>
          </div>
          {changes.length === 0 ? (
            <p className="p-4 text-[0.82rem] text-ink-faint">{L.noChanges}</p>
          ) : (
            <div className="scroll-quiet max-h-[360px] overflow-auto">
              <table className="w-full border-collapse text-left text-[0.8rem]">
                <tbody>
                  {changes.map((c, i) => (
                    <tr key={i} className="border-b border-line-soft">
                      <td className="px-3 py-1.5 text-ink-soft sm:pl-4">{regionLabel(c.org.region, lang)}</td>
                      <td className="px-3 py-1.5 text-ink-soft">{c.org.district ?? "—"}</td>
                      <td className="px-3 py-1.5">{c.org.name}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 sm:pr-4">
                        <StatusPill status={c.from} /> <span className="text-ink-faint">→</span>{" "}
                        <StatusPill status={c.to} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <AttentionTabs
        newConn={newConn}
        billingOff={billingOff}
        missing={missing}
        stirGroups={result.stirGroups}
        extra={result.extraInTree}
      />
    </div>
  );
}
