"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps the app shell. On `/login` it renders the page alone (full-screen, no
 * header/footer); everywhere else it renders the normal header + main + footer.
 * `header`/`footer` are passed in as already-rendered SERVER elements so
 * SiteHeader/SiteFooter stay server components.
 */
export function AppChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = pathname === "/login";

  if (bare) {
    return <main className="flex w-full flex-1 flex-col">{children}</main>;
  }

  return (
    <>
      {header}
      <main className="w-full flex-1">{children}</main>
      {footer}
    </>
  );
}
