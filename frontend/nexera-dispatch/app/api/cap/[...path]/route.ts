import { NextRequest, NextResponse } from 'next/server';

const CAP_URL = process.env.NEXT_PUBLIC_CAP_URL!;

async function proxy(req: NextRequest, method: string) {
  const path = req.nextUrl.pathname.replace('/api/cap', '');
  const search = req.nextUrl.search;
  const url = `${CAP_URL}${path}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const init: RequestInit = { method, headers };
  if (method === 'POST') {
    init.body = await req.text();
  }

  const upstream = await fetch(url, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}

export async function GET(req: NextRequest) { return proxy(req, 'GET'); }
export async function POST(req: NextRequest) { return proxy(req, 'POST'); }
