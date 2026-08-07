import { TARKIB, risk5Share } from "@/lib/tarkib";
import { GEO_REGIONS } from "@/lib/regions";
import { TarkibHero } from "@/components/tarkib/TarkibHero";
import { TarkibBoard } from "@/components/tarkib/TarkibBoard";
import { TarkibTable } from "@/components/tarkib/TarkibTable";
import { CompositionStack } from "@/components/tarkib/CompositionStack";
import { GapsTable } from "@/components/tarkib/GapsTable";
import { StatTile } from "@/components/StatTile";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

// The dataset is bundled JSON, but the page still follows the site's dynamic
// convention: the language cookie decides every string at request time.
export const dynamic = "force-dynamic";

export default async function TarkibPage() {
  const S = await getS();
  const nat = TARKIB.national;

  // GEO_REGIONS fixes the order; the dataset is keyed by the same canonical
  // names (enforced in tests/tarkib.test.ts).
  const regions = GEO_REGIONS.filter((name) => TARKIB.regions[name]).map(
    (name) => ({ name, region: TARKIB.regions[name] }),
  );

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.tarkib.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.tarkib.subtitle}</p>
        </div>
        <p className="text-[0.78rem] text-ink-faint">
          <span className="tnum">{fmtDate(TARKIB.date)}</span> {S.tarkib.asOf}
        </p>
      </header>

      <Reveal>
        <TarkibHero region={nat} />
      </Reveal>

      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.sourceNote(fmtDate(TARKIB.date))}
      </p>

      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem className="h-full">
          <StatTile
            label={S.tarkib.shtat}
            value={nat.shtat}
            accent="sov"
            hint={S.tarkib.shtatHint}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.tarkib.jismoniy}
            value={nat.jismoniy}
            accent="ul"
            hint={S.tarkib.jismoniyHint}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.tarkib.pensTile}
            value={nat.pens}
            accent="och"
            shareOfTotal={nat.jismoniy > 0 ? nat.pens / nat.jismoniy : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.tarkib.riskTile}
            value={nat.pens + nat.yaqin}
            accent="un"
            shareOfTotal={nat.jismoniy > 0 ? risk5Share(nat) : undefined}
            hint={S.tarkib.riskTileHint}
          />
        </RevealItem>
      </RevealGroup>

      <Reveal>
        <TarkibBoard regions={regions} />
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-[0.95rem] font-semibold">{S.tarkib.compTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.tarkib.compHint}</p>
          </div>
          <CompositionStack region={nat} />
        </section>
        <section className="card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-[0.95rem] font-semibold">{S.tarkib.gapsTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.tarkib.gapsHint}</p>
          </div>
          <GapsTable gaps={nat.gaps.slice(0, 10)} />
        </section>
      </div>

      <TarkibTable
        regions={regions}
        national={nat}
        exportName={`tarkib_${TARKIB.date}`}
      />

      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.qualityNote}
      </p>
    </div>
  );
}
