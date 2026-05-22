import { NextRequest, NextResponse } from 'next/server';

const AGENTS_URL = process.env.AGENTS_URL || process.env.NEXT_PUBLIC_AGENTS_URL!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const upstream = await fetch(`${AGENTS_URL}/chat`, { method: 'POST', headers, body });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}
