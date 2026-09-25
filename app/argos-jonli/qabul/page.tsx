"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useS } from "@/lib/i18n/client";
import { fmtInt } from "@/lib/format";
import { fmtTashkent } from "@/components/argos-live/time";
import type { TreeSnapshot } from "@/lib/argos-live";

// Receiver window opened by the bookmarklet on hrm.argos.uz. ARGOS's CSP blocks
// fetch() to other origins but not postMessage, so the tree arrives here as a
// message and is saved with a same-origin POST (site cookie + admin password).
const ARGOS = "https://hrm.argos.uz";
const PW_KEY = "argos-jonli-pw";

interface Log {
  at: string;
  text: string;
  ok: boolean;
}

export default function ReceiverPage() {
  const S = useS();
  const R = S.argosLive.receiver;
  const [pw, setPw] = useState("");
  const [needPw, setNeedPw] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const pending = useRef<{ tree: TreeSnapshot; source: MessageEventSource | null } | null>(null);

  const add = (text: string, ok: boolean) =>
    setLog((l) => [{ at: new Date().toISOString(), text, ok }, ...l].slice(0, 30));

  async function save(tree: TreeSnapshot, source: MessageEventSource | null, password: string) {
    add(R.received(fmtInt(tree.rows.length)), true);
    let msg = "";
    let ok = false;
    try {
      const r = await fetch("/api/argos-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, tree }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        try {
          sessionStorage.removeItem(PW_KEY);
        } catch {}
        pending.current = { tree, source };
        setNeedPw(true);
        msg = R.errAuth;
      } else if (!r.ok) {
        msg = r.status === 400 ? R.errBad : `${R.errServer}${j.detail ? `: ${j.detail}` : ""}`;
      } else {
        ok = true;
        msg = `${j.changed ? R.saved : R.unchanged} · ${(j.totals.percent * 100).toFixed(1)}%`;
      }
    } catch (e) {
      msg = `${R.errServer}: ${String(e)}`;
    }
    add(msg, ok);
    (source as Window | null)?.postMessage({ type: "argos-jonli-ack", ok, msg }, ARGOS);
  }

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== ARGOS) return;
      const d = e.data as { type?: string; tree?: TreeSnapshot };
      if (d?.type !== "argos-jonli-tree" || !d.tree) return;
      let stored = "";
      try {
        stored = sessionStorage.getItem(PW_KEY) ?? "";
      } catch {}
      if (!stored) {
        pending.current = { tree: d.tree, source: e.source };
        setNeedPw(true);
        return;
      }
      void save(d.tree, e.source, stored);
    };
    window.addEventListener("message", onMsg);
    // Tell the ARGOS tab we are ready to receive.
    window.opener?.postMessage({ type: "argos-jonli-ready" }, ARGOS);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitPw(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem(PW_KEY, pw);
    } catch {}
    setNeedPw(false);
    const p = pending.current;
    pending.current = null;
    if (p) void save(p.tree, p.source, pw);
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4 px-4 py-8">
      <h1 className="text-[1.3rem] font-bold tracking-tight">{R.title}</h1>
      <p className="text-[0.85rem] text-ink-soft">{R.keepOpen}</p>

      {needPw && (
        <form onSubmit={submitPw} className="card space-y-2 p-4">
          <label className="block text-[0.85rem] font-medium">{R.password}</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[0.9rem] outline-none focus:border-sov"
          />
          <p className="text-[0.75rem] text-ink-faint">{R.passwordHint}</p>
          <button className="rounded-lg bg-sov px-4 py-2 text-[0.85rem] font-semibold text-white hover:bg-sov-deep">
            {R.save}
          </button>
        </form>
      )}

      <div className="card divide-y divide-line-soft">
        {log.length === 0 ? (
          <p className="p-4 text-[0.85rem] text-ink-faint">{R.waiting}</p>
        ) : (
          log.map((l, i) => (
            <p key={i} className={`px-4 py-2 text-[0.82rem] ${l.ok ? "text-ink" : "text-un"}`}>
              <span className="tnum mr-2 text-ink-faint">{fmtTashkent(l.at, false)}</span>
              {l.text}
            </p>
          ))
        )}
      </div>

      <Link href="/argos-jonli" target="_blank" className="inline-block text-[0.85rem] font-medium text-sov hover:underline">
        {R.open} →
      </Link>
    </div>
  );
}
