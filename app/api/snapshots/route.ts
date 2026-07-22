import { getHistory } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight history for the admin panel (no per-org / per-region payload).
export async function GET() {
  const history = await getHistory();
  return Response.json({
    count: history.length,
    snapshots: history.map((h) => ({
      date: h.date,
      uploadedAt: h.uploadedAt,
      totals: h.totals,
    })),
  });
}
