import { getS } from "@/lib/i18n/server";
import { BookmarkletLink } from "@/components/argos-live/BookmarkletLink";

export default async function InstallPage() {
  const S = await getS();
  const I = S.argosLive.install;
  return (
    <div className="mx-auto max-w-[760px] space-y-5 px-4 py-8 sm:px-6">
      <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">{I.title}</h1>
      <ol className="card list-decimal space-y-2 p-5 pl-9 text-[0.9rem] text-ink-soft">
        <li>{I.step1}</li>
        <li>{I.step2}</li>
        <li>{I.step3}</li>
        <li>{I.step4}</li>
      </ol>
      <BookmarkletLink label={I.button} copyLabel={I.copy} />
      <p className="text-[0.8rem] text-ink-faint">{I.note}</p>
    </div>
  );
}
