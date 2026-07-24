"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { S } from "@/lib/strings";

const EASE = [0.2, 0.7, 0.2, 1] as const;

type Status = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [shaking, setShaking] = useState(false);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => n.toString().padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "success" || !password) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus("success");
        const from =
          new URLSearchParams(window.location.search).get("from") || "/";
        setTimeout(() => {
          router.push(from);
          router.refresh();
        }, 650);
      } else {
        setStatus("error");
        if (!reduce) {
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
        }
      }
    } catch {
      setStatus("error");
      if (!reduce) {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    }
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  };
  const mi = reduce ? {} : { variants: item };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(63,182,255,0.13), transparent 62%)",
        }}
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={
          reduce
            ? { opacity: 1, y: 0, scale: 1 }
            : shaking
              ? { opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0, scale: 1, x: 0 }
        }
        transition={{ duration: shaking ? 0.45 : 0.6, ease: EASE }}
        className="border-live card relative w-full max-w-[400px] p-7 sm:p-8"
      >
        <motion.div
          {...(reduce
            ? {}
            : { variants: container, initial: "hidden", animate: "show" })}
        >
          {/* live status strip */}
          <motion.div
            {...mi}
            className="mb-6 flex items-center justify-between gap-2 font-mono text-[0.66rem] tracking-wide text-ink-faint"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-ul" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ul" />
              </span>
              <span className="text-ul/90">{S.live.active}</span>
            </span>
            <span className="tnum text-ink-soft" suppressHydrationWarning>
              {clock}
            </span>
            <span className="text-ink-faint/70">{S.argosDomain}</span>
          </motion.div>

          {/* emblem */}
          <motion.div {...mi} className="flex justify-center">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white p-1.5 shadow-[0_6px_30px_rgba(63,182,255,0.45)]">
              <Image
                src="/moh-logo.jpg"
                alt={S.login.ministry}
                width={80}
                height={80}
                className="h-full w-full rounded-full object-contain"
                priority
              />
            </span>
          </motion.div>

          {/* title + identity */}
          <motion.h1
            {...mi}
            className="text-grad mt-5 text-center text-[1.5rem] font-bold leading-tight"
          >
            {S.login.title}
          </motion.h1>
          <motion.p
            {...mi}
            className="mt-1.5 text-center font-mono text-[0.66rem] uppercase leading-relaxed tracking-[0.14em] text-ink-faint"
          >
            {S.login.ministry}
          </motion.p>
          <motion.p {...mi} className="mt-3 text-center text-[0.85rem] text-ink-soft">
            {S.login.subtitle}
          </motion.p>

          {/* form */}
          <motion.form {...mi} onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="pw" className="eyebrow mb-1.5 block">
                {S.login.passwordLabel}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <rect x="4" y="8.5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.5 8.5V6.5a3.5 3.5 0 1 1 7 0v2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <input
                  id="pw"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  autoFocus
                  autoComplete="current-password"
                  placeholder={S.login.passwordPh}
                  className={`w-full rounded-xl border bg-paper/70 px-10 py-3 text-[0.95rem] text-ink outline-none transition-colors focus:bg-surface ${
                    status === "error"
                      ? "border-un focus:border-un"
                      : "border-line focus:border-sov"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? S.login.hide : S.login.show}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint transition-colors hover:text-ink-soft"
                >
                  {show ? (
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M3 3l14 14M8 5.2A9 9 0 0 1 10 5c4.5 0 7.5 5 7.5 5a13 13 0 0 1-2.2 2.6M5.2 6.4A13 13 0 0 0 2.5 10s3 5 7.5 5a8.5 8.5 0 0 0 2.6-.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M2.5 10S5.5 5 10 5s7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {status === "error" && (
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-[0.8rem] font-medium text-un"
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M10 6.5v4M10 13.5h.01M10 2.5 1.8 16.5h16.4L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {S.login.errorWrong}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={status === "loading" || status === "success" || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sov px-5 py-3 text-[0.95rem] font-semibold text-white shadow-[0_6px_20px_rgba(63,182,255,0.3)] transition-colors hover:bg-sov-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" && (
                <svg className="animate-spin" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.2" />
                  <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              {status === "success" && (
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="m4 10.5 4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span>
                {status === "success"
                  ? S.login.success
                  : status === "loading"
                    ? S.login.submitting
                    : S.login.submit}
              </span>
              {status === "idle" && (
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </motion.form>

          <motion.p
            {...mi}
            className="mt-6 text-center font-mono text-[0.64rem] leading-relaxed tracking-wide text-ink-faint/70"
          >
            {S.login.protected}
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
