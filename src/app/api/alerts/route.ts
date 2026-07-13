// ─── Alerts API Route ──────────────────────────────────────────────────────────
// GET /api/alerts?venueId=xxx   – get active alerts
// POST /api/alerts              – create new alert (ops staff)

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limiter";
import { MockAlertRepository } from "@/lib/repositories/mock.repositories";
import { EmergencyService } from "@/lib/services/services";
import { createAlertSchema } from "@/lib/validators/chat.validator";
import { getVenueById } from "@/lib/constants/venues";
import { z } from "zod";

const emergencyService = new EmergencyService(new MockAlertRepository());

const getQuerySchema = z.object({
  venueId: z.string().min(1).max(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitMiddleware(request, "alerts");
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const parseResult = getQuerySchema.safeParse({ venueId: searchParams.get("venueId") });

  if (!parseResult.success) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  if (!getVenueById(parseResult.data.venueId)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }

  try {
    const alerts = await emergencyService.getActiveAlerts(parseResult.data.venueId);
    return NextResponse.json({ success: true, data: alerts });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitMiddleware(request, "alerts-create");
  if (rateLimitError) return rateLimitError;

  // In production: verify Firebase ID token and check "ops" role
  // const authHeader = request.headers.get("authorization");
  // const token = authHeader?.replace("Bearer ", "");
  // const decodedToken = await admin.auth().verifyIdToken(token);
  // if (!decodedToken.ops) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = createAlertSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const alert = await emergencyService.createAlert(parseResult.data);
    return NextResponse.json({ success: true, data: alert }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
