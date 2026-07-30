type Health = {
  service: string;
  status: "ok" | "unavailable";
  database: "ok" | "unavailable";
};

const unavailable: Health = {
  service: "returnops-api",
  status: "unavailable",
  database: "unavailable",
};

export async function GET() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  try {
    const response = await fetch(`${backendUrl}/api/health/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return Response.json(unavailable, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const health = (await response.json()) as Health;
    return Response.json(health, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(unavailable, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
