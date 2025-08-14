import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return new Response(JSON.stringify(data), { status: response.status });
}

// Beispiel-Funktion für einen Button
export async function vmAction(
  action: string,
  os?: string,
  vmName?: string,
  duration?: number
) {
  const res = await fetch("/api/start_vm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, os, vmName, duration }),
  });
  return await res.json();
}

export async function POST(request: Request) {
  // ...dein Code...
  return NextResponse.json({ success: true });
}
