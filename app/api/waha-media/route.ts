import { NextRequest, NextResponse } from "next/server";

const WAHA_BASE = process.env.WAHA_BASE_URL || "";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("file");

  if (!fileId || !WAHA_BASE || !WAHA_API_KEY) {
    return NextResponse.json({ error: "Missing config" }, { status: 400 });
  }

  // Sanitize: only allow alphanumeric, dots, and hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  const wahaUrl = `${WAHA_BASE}/api/files/default/${fileId}`;

  const response = await fetch(wahaUrl, {
    headers: { "X-Api-Key": WAHA_API_KEY },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
