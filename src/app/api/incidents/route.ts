import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "events";

  try {
    if (mode === "events") {
      // Clustered + scored events from the full pipeline
      const resp = await fetch(`${BACKEND_URL}/incidents/events?score=false`, {
        next: { revalidate: 60 },
      });

      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`);

      const data = await resp.json();
      return NextResponse.json(data);
    }

    // Raw incidents (backward compat)
    const resp = await fetch(`${BACKEND_URL}/incidents/live`, {
      next: { revalidate: 60 },
    });

    if (!resp.ok) throw new Error(`Backend returned ${resp.status}`);

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[api/incidents] Backend fetch failed, falling back to direct fetch:", error.message);

    const { fetchDirectIncidents } = await import("@/lib/direct-ingest");
    const incidents = await fetchDirectIncidents();
    return NextResponse.json({ count: incidents.length, incidents });
  }
}
