import { BASE, getLive } from "@/lib/argos-live-data";
import { buildTree } from "@/lib/argos-live-view";
import { liveWorkbook } from "@/lib/argos-xlsx";
import { regionFromSlug } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The registry workbook's own layout (lib/argos-xlsx.ts): the whole workbook,
// or with ?region=<slug> just that region's sheet and its repeated STIRs.
export async function GET(request: Request) {
  const live = await getLive();
  if (!live) return new Response("no data", { status: 404 });
  const slug = new URL(request.url).searchParams.get("region");
  let onlyRegion: string | undefined;
  if (slug) {
    onlyRegion = regionFromSlug(slug, live.result.regions.map((r) => r.name));
    if (!onlyRegion) return new Response("unknown region", { status: 404 });
  }

  const { buf, filename } = await liveWorkbook({
    regions: buildTree(live.result, onlyRegion),
    orgs: live.result.orgs,
    checkedAt: live.manifest?.checkedAt ?? live.tree.at,
    removed: BASE.removed,
    excluded: BASE.excluded,
    onlyRegion,
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename).replace(/%20/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
