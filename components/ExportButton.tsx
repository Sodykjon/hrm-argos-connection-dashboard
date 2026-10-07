"use client";

/**
 * The blue «Excel'га юклаб олиш» button. With `href` it downloads the server
 * workbook (the registry layout, lib/argos-xlsx.ts); otherwise it runs the
 * component's own client-side export.
 */
export function ExportButton({ href, onClick, label }: { href?: string; onClick?: () => void; label: string }) {
  const cls =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-on-sov transition-colors hover:bg-sov-deep";
  const icon = (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return href ? (
    <a href={href} className={cls}>
      {icon}
      {label}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}
