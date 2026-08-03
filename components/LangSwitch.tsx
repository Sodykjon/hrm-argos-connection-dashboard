"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLang } from "@/lib/i18n/actions";
import { useLang } from "@/lib/i18n/client";
import type { Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string; aria: string }[] = [
  { code: "uz", label: "ЎЗ", aria: "Ўзбекча" },
  { code: "ru", label: "РУ", aria: "Русский" },
];

export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/20 bg-white/5 p-0.5"
      role="group"
      aria-label="Til / Язык"
    >
      {OPTIONS.map((o) => {
        const active = o.code === lang;
        return (
          <button
            key={o.code}
            type="button"
            aria-pressed={active}
            aria-label={o.aria}
            disabled={pending || active}
            onClick={() =>
              start(async () => {
                await setLang(o.code);
                router.refresh();
              })
            }
            className={[
              "rounded-full px-2.5 py-1 text-[0.72rem] font-semibold transition-colors",
              active
                ? "bg-white text-band"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
