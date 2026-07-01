import { kv } from "@vercel/kv";

const KEY = "stock-ledger-data";

export async function GET() {
  const data = await kv.get(KEY);
  return Response.json(data || null);
}

export async function POST(request) {
  const body = await request.json();
  await kv.set(KEY, body);
  return Response.json({ ok: true });
}
