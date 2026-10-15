import Link from "next/link";
import { MASULLAR, getTaq } from "@/lib/taqsimlash-data";
import { filterRegions, masulSummaries, previousDay } from "@/lib/taqsimlash";
import { StatTile } from "@/components/StatTile";
import { ReadinessRing } from "@/components/ReadinessRing";
import { TaqsimTree } from "@/components/taqsimlash/TaqsimTree";
import { TaqTrend } from "@/components/taqsimlash/TaqTrend";
import { fmtTashkent } from "@/components/argos-live/time";
import { tashkentDate } from "@/lib/store";
import { fmtDate, fmtInt, fmtPct, rampCss } from "@/lib/format";
import { regionLabelShort } from "@/lib/regions";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TaqsimlashPage({ searchParams }: { searchParams: Promise<{ masul?: string }> }) {
  const S = await getS();
  const T = S.taqsimlash;
  const lang = await getLang();
  const sp = await searchParams;
  const data = await getTaq();

  const header = (
    <header>
      <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">{T.title}</h1>
      <p className="mt-1 max-w-[820px] text-[0.82rem] text-ink-soft">{T.subtitle}</p>
    </header>
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-6 sm:px-6">
        {header}
        <div className="card p-6 text-[0.9rem] text-ink-soft">{T.empty}</div>
      </div>
    );
  }

  const { staff, history, tree } = data;
  const mi = sp.masul !== undefined ? Number(sp.masul) : NaN;
  const masul = Number.isInteger(mi) ? MASULLAR[mi] : undefined;
  const result = masul ? filterRegions(data.result, masul.hududlar) : data.result;
  const { totals } = result;

  const staffDate = staff ? tashkentDate(staff.at) : null;
  const today = tashkentDate(new Date().toISOString());
  const prev = staffDate ? previousDay(history, staffDate) : null;
  const cards = masulSummaries(MASULLAR, data.result, prev);
  const share = (n: number) => (totals.total ? n / totals.total : 0);

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      {header}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.78rem] text-ink-soft">
        {staff && (
          <span>
            {T.lastPull}: <b className="tnum text-ink">{fmtTashkent(staff.at)}</b>
          </span>
        )}
        <span>
          {T.treeAt}: <span className="tnum">{fmtTashkent(tree.at)}</span>
        </span>
        <span className="text-ink-faint">{T.scope(fmtInt(data.result.totals.total))}</span>
      </div>
      {!staff && (
        <div className="rounded-lg border border-un/40 bg-un-soft px-4 py-2 text-[0.8rem] text-un">{T.noStaff}</div>
      )}
      {staff && staffDate !== today && (
        <div className="rounded-lg border border-un/40 bg-un-soft px-4 py-2 text-[0.8rem] text-un">
          {T.oldStaff(fmtDate(staffDate!))}
        </div>
      )}

      <section className="card p-4 sm:p-5">
        <h2 className="text-[0.95rem] font-semibold">{T.masul.title}</h2>
        <p className="mb-3 text-[0.75rem] text-ink-faint">{T.masul.hint}</p>
        {cards.length === 0 ? (
          <p className="text-[0.82rem] text-ink-faint">{T.masul.empty}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/taqsimlash"
              scroll={false}
              aria-current={!masul ? "page" : undefined}
              className={`rounded-lg border p-3 transition-colors ${!masul ? "border-sov bg-sov-soft" : "border-line hover:bg-paper"}`}
            >
              <div className="text-[0.85rem] font-semibold">{T.masul.all}</div>
              <Pct pct={data.result.totals.percent} />
              <div className="tnum text-[0.75rem] text-ink-soft">
                {T.masul.of(fmtInt(data.result.totals.otkazilgan), fmtInt(data.result.totals.total))}
              </div>
            </Link>
            {cards.map((c, i) => (
              <Link
                key={c.ism}
                href={`/taqsimlash?masul=${i}`}
                scroll={false}
                aria-current={masul === MASULLAR[i] ? "page" : undefined}
                className={`rounded-lg border p-3 transition-colors ${masul === MASULLAR[i] ? "border-sov bg-sov-soft" : "border-line hover:bg-paper"}`}
              >
                <div className="text-[0.85rem] font-semibold">{c.ism}</div>
                <div className="text-[0.72rem] text-ink-faint">{c.hududlar.map((h) => regionLabelShort(h, lang)).join(", ")}</div>
                <Pct pct={c.percent} />
                <div className="tnum text-[0.75rem] text-ink-soft">{T.masul.of(fmtInt(c.otkazilgan), fmtInt(c.total))}</div>
                {c.delta !== null && c.delta > 0 && (
                  <div className="tnum text-[0.75rem] font-medium text-ul">{T.masul.today(fmtInt(c.delta))}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{masul ? `${T.rate} · ${masul.ism}` : T.rate}</span>
          <div className="my-1">
            <ReadinessRing percent={totals.percent} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatTile label={T.kpi.total} value={totals.total} accent="sov" />
          <StatTile label={T.kpi.otkazilgan} value={totals.otkazilgan} accent="ul" shareOfTotal={totals.percent} />
          <StatTile label={T.kpi.ttbda} value={totals.ttbda} accent="un" shareOfTotal={share(totals.ttbda)} />
          <StatTile label={T.kpi.stirYoq} value={totals.stirYoq} accent="och" shareOfTotal={share(totals.stirYoq)} />
          <StatTile label={T.kpi.daraxtdaYoq} value={totals.daraxtdaYoq} accent="och" shareOfTotal={share(totals.daraxtdaYoq)} />
          <StatTile label={T.kpi.staff} value={totals.staff} accent="sov" />
        </div>
      </section>

      <TaqsimTree
        key={masul?.ism ?? "all"}
        regions={result.regions}
        exportHref={`/api/taqsimlash/xlsx${masul ? `?masul=${mi}` : ""}`}
      />

      <TaqTrend history={history} hududlar={masul?.hududlar} />
    </div>
  );
}

function Pct({ pct }: { pct: number }) {
  const color = rampCss(pct);
  return (
    <div className="my-1.5 flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </span>
      <span className="tnum text-[0.95rem] font-bold" style={{ color }}>
        {fmtPct(pct, 1)}
      </span>
    </div>
  );
}
