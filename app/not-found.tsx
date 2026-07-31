import Link from "next/link";
import { getS } from "@/lib/i18n/server";

export default async function NotFound() {
  const S = await getS();
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-[600px] place-items-center px-6 py-16 text-center">
      <div>
        <p className="tnum text-[3rem] font-bold text-sov">404</p>
        <p className="mt-2 text-[1.05rem] font-semibold">{S.notFound.title}</p>
        <p className="mt-1 text-[0.85rem] text-ink-soft">{S.notFound.hint}</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-sov px-5 py-2.5 text-[0.85rem] font-semibold text-white hover:bg-sov-deep"
        >
          {S.notFound.home}
        </Link>
      </div>
    </div>
  );
}
