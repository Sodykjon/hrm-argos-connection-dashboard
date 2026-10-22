"use client";

import { useEffect, useRef, useState } from "react";
import { IZOH_MAX, type Izoh } from "@/lib/izoh";
import { fmtDateTime, fmtInt } from "@/lib/format";
import { useS } from "@/lib/i18n/client";

/**
 * A row's note (lib/izoh.ts): the text and when it was saved; a click opens it for
 * editing in place. `onSaved` lifts the saved note to LiveTree, so it survives the
 * table folding and unfolding without a page reload.
 */
export function IzohCell({
  orgKey,
  org,
  izoh,
  onSaved,
}: {
  orgKey: string;
  org: string;
  izoh: Izoh | null;
  onSaved: (key: string, izoh: Izoh | null) => void;
}) {
  const T = useS().argosLive.tree;
  const Z = T.izoh;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);

  const start = () => {
    setText(izoh?.text ?? "");
    setErr(null);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/argos-tree/izoh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: orgKey, text }),
      });
      const j = (await res.json().catch(() => ({}))) as { izoh?: Izoh | null; error?: string };
      if (!res.ok) {
        setErr(j.error === "long" ? Z.err.long : j.error === "row" ? Z.err.row : Z.err.other);
        return;
      }
      onSaved(orgKey, j.izoh ?? null);
      setOpen(false);
    } catch {
      setErr(Z.err.other);
    } finally {
      setBusy(false);
    }
  };

  if (open) {
    const left = IZOH_MAX - text.trim().length;
    return (
      <div className="space-y-1.5">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void save();
          }}
          rows={3}
          maxLength={IZOH_MAX + 50}
          placeholder={Z.placeholder}
          aria-label={Z.edit(org)}
          className="w-full resize-y rounded-md border border-line bg-surface px-2 py-1.5 text-[0.78rem] text-ink outline-none focus:border-sov"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || left < 0}
            className="rounded-md bg-sov px-2.5 py-1 text-[0.75rem] font-semibold text-on-sov hover:bg-sov-deep disabled:opacity-50"
          >
            {busy ? Z.saving : Z.save}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-md border border-line px-2.5 py-1 text-[0.75rem] text-ink-soft hover:bg-paper"
          >
            {Z.cancel}
          </button>
          <span className={`tnum text-[0.7rem] ${left < 0 ? "text-un" : "text-ink-faint"}`}>{Z.left(fmtInt(left))}</span>
        </div>
        {izoh && <div className="text-[0.7rem] text-ink-faint">{Z.clearHint}</div>}
        {err && (
          <div role="alert" className="text-[0.75rem] text-un">
            {err}
          </div>
        )}
      </div>
    );
  }

  if (!izoh) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label={Z.edit(org)}
        className="text-[0.75rem] text-ink-faint opacity-0 transition-opacity hover:text-sov focus-visible:opacity-100 group-hover:opacity-100"
      >
        {Z.add}
      </button>
    );
  }

  return (
    <button type="button" onClick={start} aria-label={Z.edit(org)} title={izoh.text} className="block w-full text-left">
      <span className="line-clamp-3 whitespace-pre-line text-ink">{izoh.text}</span>
      <span className="tnum mt-0.5 block text-[0.7rem] text-ink-faint">{fmtDateTime(izoh.at)}</span>
    </button>
  );
}
