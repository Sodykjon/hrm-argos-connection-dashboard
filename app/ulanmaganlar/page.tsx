import { getLatestSnapshot, getRegistry } from "@/lib/data";
import { OrgTable } from "@/components/OrgTable";
import { fmtDate } from "@/lib/format";
import { S } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function UnconnectedPage() {
  const { snapshot } = await getLatestSnapshot();
  const registry = await getRegistry();

  const rows = snapshot.orgs.filter((o) => o.status === "ulanmagan");
  const regions = snapshot.regions
    .filter((r) => r.ulanmagan > 0)
    .map((r) => r.name);

  return (
    <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.unconnected.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">
            {S.unconnected.subtitle}
          </p>
        </div>
        <p className="tnum text-[0.78rem] text-ink-faint">
          {fmtDate(snapshot.date)} {S.overview.asOf}
        </p>
      </header>

      <OrgTable
        rows={rows}
        registry={registry}
        regions={regions}
        exportName={`HRM_ARGOS_ulanmaganlar_${snapshot.date}`}
      />
    </div>
  );
}
