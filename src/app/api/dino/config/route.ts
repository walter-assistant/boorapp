import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const r = await fetch('https://www.dinoloket.nl/javascriptmodelviewer-web/rest/config', {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch DINOloket config' }, { status: 500 });
  }
}
