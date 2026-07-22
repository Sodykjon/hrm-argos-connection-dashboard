"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fileToBuffer,
  parseHisobot,
  parseRegistry,
  type ParsedHisobot,
} from "@/lib/parse";
import type { Registry } from "@/lib/types";
import { fmtInt, fmtPct, fmtDate, fmtDateTime } from "@/lib/format";
import { S } from "@/lib/strings";

interface HistoryItem {
  date: string;
  uploadedAt: string;
  totals: { total: number; ulangan: number; ulanmagan: number; percent: number };
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [parsed, setParsed] = useState<ParsedHisobot | null>(null);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [registryCount, setRegistryCount] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((d) => setHistory(d.snapshots ?? []))
      .catch(() => {});
  }, [done]);

  async function onHisobot(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(false);
    setParsing(true);
    try {
      const buf = await fileToBuffer(file);
      setParsed(parseHisobot(buf));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : S.admin.errParse);
    } finally {
      setParsing(false);
    }
  }

  async function onRegistry(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const buf = await fileToBuffer(file);
      const reg = parseRegistry(buf);
      setRegistry(reg);
      setRegistryCount(Object.keys(reg).length);
    } catch {
      setRegistry(null);
      setRegistryCount(0);
    }
  }

  async function publish() {
    if (!parsed || !password) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          snapshot: parsed.snapshot,
          registry,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else if (res.status === 401) setError(S.admin.errAuth);
      else if (res.status === 501) setError(S.admin.errNoStore);
      else if (res.status === 400) setError(S.admin.errParse);
      else setError(S.admin.errGeneric);
    } catch {
      setError(S.admin.errGeneric);
    } finally {
      setPublishing(false);
    }
  }

  const t = parsed?.snapshot.totals;

  return (
    <div className="mx-auto max-w-[900px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
          {S.admin.title}
        </h1>
        <p className="mt-1 text-[0.85rem] text-ink-soft">{S.admin.subtitle}</p>
      </header>

      {done ? (
        <div className="card space-y-4 p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ul-soft">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7" stroke="var(--color-ul)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[1.05rem] font-semibold">{S.admin.success}</p>
            <p className="mt-1 text-[0.83rem] text-ink-soft">{S.admin.successHint}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/" className="rounded-lg bg-sov px-5 py-2.5 text-[0.85rem] font-semibold text-white hover:bg-sov-deep">
              {S.admin.goDashboard}
            </Link>
            <button
              onClick={() => { setDone(false); setParsed(null); setRegistry(null); setRegistryCount(0); }}
              className="rounded-lg border border-line px-5 py-2.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-paper"
            >
              Яна юклаш
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* files */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FileCard
              label={S.admin.hisobotFile}
              hint={S.admin.hisobotHint}
              onPick={onHisobot}
              picked={
                parsed
                  ? `${fmtDate(parsed.snapshot.date)} · ${fmtInt(parsed.snapshot.orgs.length)} ${S.units.org}`
                  : parsing
                    ? S.admin.parsing
                    : undefined
              }
              required
            />
            <FileCard
              label={S.admin.registryFile}
              hint={S.admin.registryHint}
              onPick={onRegistry}
              picked={registryCount ? `${fmtInt(registryCount)} ёзув` : undefined}
            />
          </div>

          {/* preview */}
          {t && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">{S.admin.preview}</span>
                {parsed?.check.ok ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ul-soft px-2.5 py-1 text-[0.72rem] font-medium text-ul">
                    <span className="h-1.5 w-1.5 rounded-full bg-ul" />
                    {S.admin.validated}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-un-soft px-2.5 py-1 text-[0.72rem] font-medium text-un">
                    <span className="h-1.5 w-1.5 rounded-full bg-un" />
                    {S.admin.mismatch}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <PreviewStat label={S.kpi.total} value={fmtInt(t.total)} />
                <PreviewStat label={S.kpi.ulangan} value={fmtInt(t.ulangan)} tone="ul" />
                <PreviewStat label={S.kpi.ulanmagan} value={fmtInt(t.ulanmagan)} tone="un" />
                <PreviewStat label={S.kpi.rate} value={fmtPct(t.percent, 1)} />
              </div>
            </div>
          )}

          {/* password + publish */}
          <div className="card space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-[0.82rem] font-medium text-ink-soft">
                {S.admin.password}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={S.admin.passwordPh}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[0.9rem] outline-none focus:border-sov focus:bg-surface"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-un-soft px-3.5 py-2.5 text-[0.82rem] font-medium text-un">
                {error}
              </p>
            )}

            <button
              onClick={publish}
              disabled={!parsed || !password || publishing}
              className="w-full rounded-lg bg-sov px-5 py-3 text-[0.9rem] font-semibold text-white transition-colors hover:bg-sov-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? S.admin.publishing : S.admin.publish}
            </button>
          </div>
        </div>
      )}

      {/* history */}
      {history.length > 0 && (
        <div className="card p-5">
          <span className="eyebrow">{S.admin.history}</span>
          <ul className="mt-3 divide-y divide-line-soft">
            {[...history].reverse().map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[0.82rem]">
                <span className="tnum font-medium">{fmtDate(h.date)}</span>
                <span className="tnum text-ink-soft">
                  {fmtPct(h.totals.percent, 1)} · {fmtInt(h.totals.ulangan)}/{fmtInt(h.totals.total)}
                </span>
                <span className="tnum text-[0.72rem] text-ink-faint">{fmtDateTime(h.uploadedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FileCard({
  label,
  hint,
  onPick,
  picked,
  required,
}: {
  label: string;
  hint: string;
  onPick: (f: File | undefined) => void;
  picked?: string;
  required?: boolean;
}) {
  return (
    <label className="card flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:border-sov/50">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.85rem] font-semibold">
          {label}
          {required && <span className="text-un"> *</span>}
        </span>
        <svg className="shrink-0 text-sov" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3v9m0-9L6.5 6.5M10 3l3.5 3.5M3.5 14v1.5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-[0.74rem] text-ink-faint">{hint}</span>
      <input
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <span className={`mt-1 truncate text-[0.78rem] font-medium ${picked ? "text-sov" : "text-ink-faint/70"}`}>
        {picked ?? S.admin.pickFile}
      </span>
    </label>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ul" | "un";
}) {
  const color = tone === "ul" ? "text-ul" : tone === "un" ? "text-un" : "text-ink";
  return (
    <div>
      <div className="text-[0.72rem] text-ink-faint">{label}</div>
      <div className={`tnum mt-1 text-[1.4rem] font-semibold ${color}`}>{value}</div>
    </div>
  );
}
