import { fmtInt, fmtPct } from "@/lib/format";

/**
 * A compact horizontal bar list for the age / tenure / qualification bands.
 * Widths are relative to the largest band, values printed beside each bar —
 * the same convention as the ranking lists, so nothing needs a tooltip.
 */
export function BandBars({
  title,
  labels,
  values,
  total,
  color,
}: {
  title: string;
  labels: string[];
  values: number[];
  total: number;
  color: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <h3 className="mb-2 text-[0.8rem] font-semibold text-ink-soft">{title}</h3>
      <div className="flex flex-col gap-1.5">
        {labels.map((label, i) => {
          const v = values[i] ?? 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="w-[7.5rem] shrink-0 truncate text-[0.74rem] text-ink-soft">
                {label}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(v / max) * 100}%`, background: color }}
                />
              </span>
              <span className="tnum w-[7rem] shrink-0 text-right text-[0.74rem] text-ink">
                {fmtInt(v)}{" "}
                <span className="text-ink-faint">
                  · {fmtPct(total > 0 ? v / total : 0, 1)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
