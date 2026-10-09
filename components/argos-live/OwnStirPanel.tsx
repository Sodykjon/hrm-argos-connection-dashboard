"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnStirApplied, OwnStirPending } from "@/lib/argos-match";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

// STIRs the dashboard found in the ARGOS tree for STIR-less registry rows (lib/argos-match.ts):
// the applied ones can be rejected, the waiting ones approved or rejected. The admin password is
// the one the bookmarklet's receiving page keeps for the session.
const PW_KEY = "argos-jonli-pw";

type ErrKey = "auth" | "billing" | "taken" | "tin" | "row" | "other";

export function OwnStirPanel({ applied, pending }: { applied: OwnStirApplied[]; pending: OwnStirPending[] }) {
  const S = useS();
  const L = S.argosLive;
  const A = L.attention;
  const lang = useLang();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ key: string; msg: ErrKey } | null>(null);

  async function decide(key: string, tin: string, action: "approve" | "reject") {
    let password = pw;
    if (!password)
      try {
        password = sessionStorage.getItem(PW_KEY) ?? ""; // typed on the bookmarklet's page this session
      } catch {}
    if (!password) {
      setErr({ key, msg: "auth" });
      return;
    }
    setBusy(`${key}|${tin}`);
    setErr(null);
    try {
      const r = await fetch("/api/argos-tree/stir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, key, tin, action }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        const e = j.error as ErrKey | undefined;
        setErr({ key, msg: e && e in A.ownErr ? e : "other" });
        return;
      }
      try {
        sessionStorage.setItem(PW_KEY, password);
      } catch {}
      router.refresh();
    } catch {
      setErr({ key, msg: "other" });
    } finally {
      setBusy(null);
    }
  }

  const billing = (b: 0 | 1 | null) =>
    b === null ? (
      <span className="text-ink-faint">{L.notInTree}</span>
    ) : b ? (
      <span className="text-ul">{L.billingOn}</span>
    ) : (
      <span className="text-un">{L.billingOff}</span>
    );

  const btn =
    "rounded-md border px-2 py-0.5 text-[0.75rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  const head = (extra: string) => (
    <thead>
      <tr className="border-b border-line text-[0.75rem] uppercase tracking-wide text-ink-faint">
        <th className="px-3 py-2 font-medium sm:pl-4">{L.col.region}</th>
        <th className="px-3 py-2 font-medium">{L.col.district}</th>
        <th className="px-3 py-2 font-medium">{L.col.name}</th>
        <th className="tnum px-3 py-2 font-medium">{L.col.stir}</th>
        <th className="px-3 py-2 font-medium">{A.ownArgos}</th>
        <th className="px-3 py-2 font-medium">{L.col.billing}</th>
        <th className="px-3 py-2 font-medium">{extra}</th>
        <th className="px-3 py-2 sm:pr-4" />
      </tr>
    </thead>
  );

  const errFor = (key: string) =>
    err?.key === key ? <div className="mt-1 text-[0.72rem] text-un">{A.ownErr[err.msg]}</div> : null;

  return (
    <div>
      <p className="border-b border-line-soft px-3 py-2 text-[0.78rem] text-ink-soft sm:px-4">{A.ownHint}</p>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2 sm:px-4">
        <label className="text-[0.78rem] font-medium" htmlFor="own-pw">
          {A.ownPassword}
        </label>
        <input
          id="own-pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          className="w-44 rounded-md border border-line bg-surface px-2 py-1 text-[0.8rem]"
        />
        <span className="text-[0.75rem] text-ink-faint">{A.ownPasswordHint}</span>
      </div>

      <h3 className="px-3 pb-1 pt-3 text-[0.85rem] font-semibold sm:px-4">
        {A.ownPending} <span className="tnum text-ink-faint">({pending.length})</span>
      </h3>
      {pending.length ? (
        <div className="scroll-quiet overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.8rem]">
            {head(A.ownMatch)}
            <tbody>
              {pending.map((m) => (
                <tr key={`${m.key}|${m.tin}`} className="border-b border-line-soft align-top hover:bg-paper">
                  <td className="px-3 py-1.5 text-ink-soft sm:pl-4">{regionLabel(m.region, lang)}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{m.district ?? "—"}</td>
                  <td className="px-3 py-1.5">{m.name}</td>
                  <td className="tnum px-3 py-1.5">{m.tin}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{m.label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">{billing(m.billing)}</td>
                  <td className="px-3 py-1.5 text-[0.75rem] text-ink-soft">
                    {m.strength === "strong" ? A.ownStrong : A.ownWeak}
                    {!m.billing && <div className="text-ink-faint">{A.ownWaitBilling}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right sm:pr-4">
                    {m.billing === 1 && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => decide(m.key, m.tin, "approve")}
                        className={`${btn} mr-1.5 border-ul/50 text-ul hover:bg-ul-soft`}
                      >
                        {A.ownApprove}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => decide(m.key, m.tin, "reject")}
                      className={`${btn} border-line text-ink-soft hover:bg-paper`}
                    >
                      {A.ownReject}
                    </button>
                    {errFor(m.key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 pb-3 text-[0.82rem] text-ink-faint sm:px-4">{A.none}</p>
      )}

      <h3 className="border-t border-line-soft px-3 pb-1 pt-3 text-[0.85rem] font-semibold sm:px-4">
        {A.ownApplied} <span className="tnum text-ink-faint">({applied.length})</span>
      </h3>
      {applied.length ? (
        <div className="scroll-quiet overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.8rem]">
            {head(L.col.reason)}
            <tbody>
              {applied.map((a) => (
                <tr key={a.key} className="border-b border-line-soft align-top hover:bg-paper">
                  <td className="px-3 py-1.5 text-ink-soft sm:pl-4">{regionLabel(a.region, lang)}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{a.district ?? "—"}</td>
                  <td className="px-3 py-1.5">{a.name}</td>
                  <td className="tnum px-3 py-1.5">{a.tin}</td>
                  <td className="px-3 py-1.5 text-ink-soft">{a.label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">{billing(a.billing)}</td>
                  <td className="px-3 py-1.5 text-[0.75rem] text-ink-soft">
                    {a.mode === "auto" ? A.ownAuto : A.ownApproved}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right sm:pr-4">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => decide(a.key, a.tin, "reject")}
                      className={`${btn} border-line text-ink-soft hover:bg-paper`}
                    >
                      {A.ownReject}
                    </button>
                    {errFor(a.key)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 pb-3 text-[0.82rem] text-ink-faint sm:px-4">{A.none}</p>
      )}
    </div>
  );
}
