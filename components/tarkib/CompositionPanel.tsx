import type { TarkibRegion } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

// Same palette and order as CompositionStack — the two views must agree.
const SEGMENTS: Array<{
  keys: string[];
  labelKey: "vrach" | "orta" | "kichik" | "boshqa" | "rest";
  color: string;
}> = [
  { keys: ["vrach"], labelKey: "vrach", color: "var(--color-sov)" },
  { keys: ["orta"], labelKey: "orta", color: "var(--color-ul)" },
  { keys: ["kichik"], labelKey: "kichik", color: "var(--color-goal)" },
  { keys: ["boshqa"], labelKey: "boshqa", color: "var(--color-warn)" },
  { keys: ["notibbiy", "provfarm"], labelKey: "rest", color: "var(--color-och)" },
];

/**
 * The national «Ходимлар таркиби» card. The region pages keep the thin
 * CompositionStack (they have band charts right below it); here the card sits
 * beside a ten-row table, so it carries per-category bars, the gender split
 * and the headline workforce facts to match that height with content.
 */
export async function CompositionPanel({ region }: { region: TarkibRegion }) {
  const S = await getS();
  const total = region.jismoniy || 1;
  const byKey = Object.fromEntries(region.cats.map((c) => [c.key, c.jismoniy]));
  const parts = SEGMENTS.map((seg) => ({
    ...seg,
    value: seg.keys.reduce((acc, k) => acc + (byKey[k] ?? 0), 0),
  }));
  const max = Math.max(...parts.map((p) => p.value), 1);

  const ayolShare = region.ayol / total;
  const sof = region.qabul - region.boshagan;
  const toifasiz = region.toifa[2] ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* per-category bars */}
      <div className="flex flex-col gap-2">
        {parts.map((p) => (
          <div key={p.labelKey} className="flex items-center gap-2.5">
            <span className="w-[11.5rem] shrink-0 truncate text-[0.78rem] text-ink-soft">
              {S.tarkib.cat[p.labelKey]}
            </span>
            <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-line-soft">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(p.value / max) * 100}%`,
                  background: p.color,
                }}
              />
            </span>
            <span className="tnum w-[7.4rem] shrink-0 text-right text-[0.78rem]">
              <b className="font-semibold">{fmtInt(p.value)}</b>{" "}
              <span className="text-ink-faint">· {fmtPct(p.value / total, 1)}</span>
            </span>
          </div>
        ))}
      </div>

      {/* gender split */}
      <div>
        <p className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-ink-faint">
          {S.tarkib.gender.title}
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            style={{ width: `${ayolShare * 100}%`, background: "var(--color-sov)" }}
            className="border-r border-surface"
          />
          <div className="flex-1" style={{ background: "var(--color-och)" }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-[2px]" style={{ background: "var(--color-sov)" }} aria-hidden />
            {S.tarkib.gender.ayol}{" "}
            <b className="tnum font-semibold text-ink">
              {fmtInt(region.ayol)} ({fmtPct(ayolShare, 1)})
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-[2px]" style={{ background: "var(--color-och)" }} aria-hidden />
            {S.tarkib.gender.erkak}{" "}
            <b className="tnum font-semibold text-ink">
              {fmtInt(region.erkak)} ({fmtPct(1 - ayolShare, 1)})
            </b>
          </span>
        </div>
      </div>

      {/* headline workforce facts */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-3 text-[0.78rem]">
        <div>
          <dt className="text-ink-faint">{S.tarkib.facts.dekret}</dt>
          <dd className="tnum mt-0.5 font-semibold">
            {fmtInt(region.dekret)}{" "}
            <span className="font-normal text-ink-faint">
              · {fmtPct(region.dekret / total, 1)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">{S.tarkib.facts.qabul}</dt>
          <dd className="tnum mt-0.5 font-semibold">
            {fmtInt(region.qabul)} / −{fmtInt(region.boshagan)}{" "}
            <span className={`font-normal ${sof < 0 ? "text-un" : "text-ul"}`}>
              ({sof < 0 ? "−" : "+"}
              {fmtInt(Math.abs(sof))})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">{S.tarkib.facts.toifasiz}</dt>
          <dd className="tnum mt-0.5 font-semibold">
            {fmtInt(toifasiz)}{" "}
            <span className="font-normal text-ink-faint">
              · {fmtPct(toifasiz / total, 1)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">{S.tarkib.facts.fan}</dt>
          <dd className="tnum mt-0.5 font-semibold">
            {S.tarkib.facts.fanDetail(region.fanD, region.fanN)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
