"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { S } from "@/lib/strings";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      /* ignore — redirect anyway */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[0.8rem] font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
      aria-label={S.login.logout}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M12 3.5H6.5A1.5 1.5 0 0 0 5 5v10a1.5 1.5 0 0 0 1.5 1.5H12M9 10h8m0 0-3-3m3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {S.login.logout}
    </button>
  );
}
