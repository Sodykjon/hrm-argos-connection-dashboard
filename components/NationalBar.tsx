import type { Totals } from "@/lib/types";
import { fmtInt, fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

/** One horizontal stacked bar showing the ulangan/ulanmagan/ochirilgan split. */
export function NationalBar({ totals }: { totals: Totals }) {
  const segs = [
    { key: "ul", label: S.status.ulangan, value: totals.ulangan, cls: "bg-ul" },
    { key: "un", label: S.status.ulanmagan, value: totals.ulanmagan, cls: "bg-un" },
    { key: "och", label: S.status.ochirilganShort, value: totals.ochirilgan, cls: "bg-och" },
  ];
  const total = totals.total || 1;

  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-line-soft">
        {segs.map((s) => (
          <div
            key={s.key}
            className={s.cls}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${fmtInt(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.cls}`} />
            <span className="text-[0.8rem] text-ink-soft">{s.label}</span>
            <span className="tnum text-[0.8rem] font-semibold text-ink">
              {fmtInt(s.value)}
            </span>
            <span className="tnum text-[0.72rem] text-ink-faint">
              {fmtPct(s.value / total, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
