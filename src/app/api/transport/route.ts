// ─── Transport API Route ───────────────────────────────────────────────────────
// GET /api/transport?venueId=xxx&accessible=true

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limiter";
import { MockTransportRepository } from "@/lib/repositories/mock.repositories";
import { TransportService } from "@/lib/services/services";
import { getVenueById } from "@/lib/constants/venues";
import { z } from "zod";

const transportService = new TransportService(new MockTransportRepository());

const querySchema = z.object({
  venueId: z.string().min(1).max(50),
  accessible: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  recommend: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  mode: z.string().max(20).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitMiddleware(request, "transport");
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse({
    venueId: searchParams.get("venueId"),
    accessible: searchParams.get("accessible") ?? "false",
    recommend: searchParams.get("recommend") ?? "false",
    mode: searchParams.get("mode") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { venueId, accessible, recommend, mode } = parseResult.data;

  if (!getVenueById(venueId)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }

  try {
    if (recommend) {
      const recommendation = await transportService.getRecommendation(venueId, {
        accessible,
        ...(mode !== undefined && { preferredMode: mode }),
      });
      return NextResponse.json({ success: true, data: recommendation });
    }

    const options = await transportService.getOptions(venueId);
    return NextResponse.json({ success: true, data: options });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve transport data" }, { status: 500 });
  }
}
