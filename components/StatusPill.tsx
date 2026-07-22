import type { Status } from "@/lib/types";
import { STATUS_META } from "@/lib/format";

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  const soft: Record<Status, string> = {
    ulangan: "bg-ul-soft text-ul",
    ulanmagan: "bg-un-soft text-un",
    ochirilgan: "bg-och-soft text-ink-soft",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium ${soft[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
