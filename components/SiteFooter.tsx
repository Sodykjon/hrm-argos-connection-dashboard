import { S } from "@/lib/strings";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-1 px-4 py-5 text-[0.75rem] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>{S.ministry}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span>{S.footer.source}</span>
          <span className="text-ink-faint/70">{S.footer.map}</span>
        </span>
      </div>
    </footer>
  );
}
