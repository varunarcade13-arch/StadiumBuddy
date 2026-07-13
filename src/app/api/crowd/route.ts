// ─── Crowd API Route ───────────────────────────────────────────────────────────
// GET /api/crowd?venueId=xxx

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limiter";
import { MockCrowdRepository } from "@/lib/repositories/mock.repositories";
import { CrowdService } from "@/lib/services/services";
import { getVenueById } from "@/lib/constants/venues";
import { z } from "zod";

const crowdService = new CrowdService(new MockCrowdRepository());

const querySchema = z.object({
  venueId: z.string().min(1).max(50),
  zoneId: z.string().max(50).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitMiddleware(request, "crowd");
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse({
    venueId: searchParams.get("venueId"),
    zoneId: searchParams.get("zoneId") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { venueId, zoneId } = parseResult.data;

  if (!getVenueById(venueId)) {
    return NextResponse.json({ error: "Unknown venue ID" }, { status: 404 });
  }

  try {
    if (zoneId) {
      const zone = await crowdService.getZoneStatus(venueId, zoneId);
      if (!zone) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: zone });
    }

    const snapshot = await crowdService.getVenueCrowdStatus(venueId);
    return NextResponse.json({ success: true, data: snapshot });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve crowd data" }, { status: 500 });
  }
}
