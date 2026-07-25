"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fileToBuffer,
  parseHisobot,
  parseRegistry,
  type ParsedHisobot,
} from "@/lib/parse";
import { parseCompletionCsv, type ParsedCompletion } from "@/lib/parse-completion";
import type { Registry } from "@/lib/types";
import { fmtInt, fmtPct, fmtDate, fmtDateTime } from "@/lib/format";
import { S } from "@/lib/strings";

interface HistoryItem {
  date: string;
  uploadedAt: string;
  totals: { total: number; ulangan: number; ulanmagan: number; percent: number };
}

interface CompHistoryItem {
  date: string;
  uploadedAt: string;
  overall: { orgCount: number; avg: number; zeroCount: number; below50: number };
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

  // completion (separate dataset)
  const [compParsed, setCompParsed] = useState<ParsedCompletion | null>(null);
  const [compParsing, setCompParsing] = useState(false);
  const [compPublishing, setCompPublishing] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compDone, setCompDone] = useState(false);
  const [compHistory, setCompHistory] = useState<CompHistoryItem[]>([]);

  // storage cleanup
  const [cleanBusy, setCleanBusy] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [cleanErr, setCleanErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((d) => setHistory(d.snapshots ?? []))
      .catch(() => {});
  }, [done]);

  useEffect(() => {
    fetch("/api/completion")
      .then((r) => r.json())
      .then((d) => setCompHistory(d.snapshots ?? []))
      .catch(() => {});
  }, [compDone]);

  async function onCompletion(file: File | undefined) {
    if (!file) return;
    setCompError(null);
    setCompDone(false);
    setCompParsing(true);
    try {
      const text = await file.text();
      setCompParsed(parseCompletionCsv(text, file.name));
    } catch (e) {
      setCompParsed(null);
      setCompError(e instanceof Error ? e.message : S.admin.compErrParse);
    } finally {
      setCompParsing(false);
    }
  }

  async function publishCompletion() {
    if (!compParsed || !password) return;
    setCompPublishing(true);
    setCompError(null);
    try {
      const res = await fetch("/api/completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, snapshot: compParsed.snapshot }),
      });
      if (res.ok) {
        setCompDone(true);
      } else if (res.status === 401) setCompError(S.admin.errAuth);
      else if (res.status === 501) setCompError(S.admin.errNoStore);
      else if (res.status === 400) setCompError(S.admin.compErrParse);
      else setCompError(S.admin.errGeneric);
    } catch {
      setCompError(S.admin.errGeneric);
    } finally {
      setCompPublishing(false);
    }
  }

  async function onHisobot(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(false);
    setParsing(true);
    try {
      const buf = await fileToBuffer(file);
      setParsed(parseHisobot(buf, file.name));
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

  async function cleanupStorage() {
    if (!password) return;
    setCleanBusy(true);
    setCleanMsg(null);
    setCleanErr(null);
    try {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const d = (await res.json()) as { deleted?: number };
        setCleanMsg(
          d.deleted ? S.admin.cleanupDone(d.deleted) : S.admin.cleanupNone,
        );
      } else if (res.status === 401) setCleanErr(S.admin.errAuth);
      else if (res.status === 501) setCleanErr(S.admin.errNoStore);
      else setCleanErr(S.admin.errGeneric);
    } catch {
      setCleanErr(S.admin.errGeneric);
    } finally {
      setCleanBusy(false);
    }
  }

  const t = parsed?.snapshot.totals;
  const ct = compParsed?.snapshot.overall;

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

      {/* ---- completion (separate daily dataset) ---- */}
      <div className="space-y-4 border-t border-line pt-6">
        <div>
          <h2 className="text-[1.05rem] font-semibold">{S.admin.compSection}</h2>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">{S.admin.compSubtitle}</p>
        </div>

        {compDone ? (
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
              <Link href="/toldirilish" className="rounded-lg bg-sov px-5 py-2.5 text-[0.85rem] font-semibold text-white hover:bg-sov-deep">
                {S.admin.goDashboard}
              </Link>
              <button
                onClick={() => { setCompDone(false); setCompParsed(null); }}
                className="rounded-lg border border-line px-5 py-2.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-paper"
              >
                Яна юклаш
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FileCard
                label={S.admin.compFile}
                hint={S.admin.compHint}
                accept=".csv,text/csv"
                onPick={onCompletion}
                picked={
                  compParsed
                    ? `${fmtDate(compParsed.snapshot.date)} · ${fmtInt(compParsed.snapshot.overall.orgCount)} ${S.units.org}`
                    : compParsing
                      ? S.admin.parsing
                      : undefined
                }
                required
              />
              {ct && (
                <div className="card p-5">
                  <span className="eyebrow">{S.admin.preview}</span>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <PreviewStat label={S.admin.compAvg} value={fmtPct(ct.avg, 1)} />
                    <PreviewStat label={S.admin.compOrgs} value={fmtInt(ct.orgCount)} />
                    <PreviewStat label={S.admin.compZero} value={fmtInt(ct.zeroCount)} tone="un" />
                    <PreviewStat label={S.admin.compBelow50} value={fmtInt(ct.below50)} tone="un" />
                  </div>
                </div>
              )}
            </div>

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

              {compError && (
                <p className="rounded-lg bg-un-soft px-3.5 py-2.5 text-[0.82rem] font-medium text-un">
                  {compError}
                </p>
              )}

              <button
                onClick={publishCompletion}
                disabled={!compParsed || !password || compPublishing}
                className="w-full rounded-lg bg-sov px-5 py-3 text-[0.9rem] font-semibold text-white transition-colors hover:bg-sov-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                {compPublishing ? S.admin.publishing : S.admin.compPublish}
              </button>
            </div>
          </div>
        )}

        {compHistory.length > 0 && (
          <div className="card p-5">
            <span className="eyebrow">{S.admin.compHistory}</span>
            <ul className="mt-3 divide-y divide-line-soft">
              {[...compHistory].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[0.82rem]">
                  <span className="tnum font-medium">{fmtDate(h.date)}</span>
                  <span className="tnum text-ink-soft">
                    {fmtPct(h.overall.avg, 1)} · {fmtInt(h.overall.orgCount)} {S.units.org}
                  </span>
                  <span className="tnum text-[0.72rem] text-ink-faint">{fmtDateTime(h.uploadedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ---- storage cleanup (Vercel Blob) ---- */}
      <div className="space-y-3 border-t border-line pt-6">
        <div>
          <h2 className="text-[1.05rem] font-semibold">{S.admin.cleanupSection}</h2>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">{S.admin.cleanupHint}</p>
        </div>
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
          {cleanMsg && (
            <p className="rounded-lg bg-ul-soft px-3.5 py-2.5 text-[0.82rem] font-medium text-ul">
              {cleanMsg}
            </p>
          )}
          {cleanErr && (
            <p className="rounded-lg bg-un-soft px-3.5 py-2.5 text-[0.82rem] font-medium text-un">
              {cleanErr}
            </p>
          )}
          <button
            onClick={cleanupStorage}
            disabled={!password || cleanBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-5 py-2.5 text-[0.85rem] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cleanBusy ? S.admin.cleanupBusy : S.admin.cleanupBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileCard({
  label,
  hint,
  onPick,
  picked,
  required,
  accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}: {
  label: string;
  hint: string;
  onPick: (f: File | undefined) => void;
  picked?: string;
  required?: boolean;
  accept?: string;
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
        accept={accept}
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
