import { MASULLAR, getTaq } from "@/lib/taqsimlash-data";
import { filterRegions } from "@/lib/taqsimlash";
import { taqWorkbook } from "@/lib/taqsimlash-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /taqsimlash as a workbook; ?masul=<index> limits it to one person's regions.
export async function GET(request: Request) {
  const data = await getTaq();
  if (!data) return new Response("no data", { status: 404 });
  const raw = new URL(request.url).searchParams.get("masul");
  const masul = raw !== null && /^\d+$/.test(raw) ? MASULLAR[Number(raw)] : undefined;
  if (raw !== null && !masul) return new Response("unknown", { status: 404 });

  const result = masul ? filterRegions(data.result, masul.hududlar) : data.result;
  const { buf, filename } = await taqWorkbook(result, data.staff?.at ?? data.tree.at, masul?.ism);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename).replace(/%20/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
