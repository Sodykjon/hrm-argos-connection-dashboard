"use client";

import { useEffect, useRef } from "react";
import { bookmarkletHref } from "@/lib/argos-bookmarklet";

// React refuses `javascript:` hrefs, so the link target is set on the DOM node
// after mount — built for whichever origin this dashboard is served from.
export function BookmarkletLink({ label, copyLabel }: { label: string; copyLabel: string }) {
  const a = useRef<HTMLAnchorElement>(null);
  const t = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const href = bookmarkletHref(window.location.origin);
    a.current?.setAttribute("href", href);
    if (t.current) t.current.value = href;
  }, []);
  return (
    <div className="card space-y-4 p-5">
      <a
        ref={a}
        onClick={(e) => e.preventDefault()}
        className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-sov px-5 py-2.5 text-[0.95rem] font-semibold text-white shadow hover:bg-sov-deep"
      >
        ★ {label}
      </a>
      <div>
        <p className="mb-1 text-[0.78rem] text-ink-faint">{copyLabel}</p>
        <textarea
          ref={t}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="h-24 w-full rounded-lg border border-line bg-paper p-2 font-mono text-[0.7rem] text-ink-soft"
        />
      </div>
    </div>
  );
}
