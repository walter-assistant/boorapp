import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAPSERVER = 'https://odnzkg.nazca4u.nl/mapserver/mapserv.exe';
const MAPFILE = String.raw`D:\websites\kaarten\noord-holland\odnzkg\mapfile\viewer_odnzkg.map`;
const LAYERS = [
  ['Werkgebied ODNZKG', 'Werkgebied ODNZKG'],
  ['Locatie', 'Bodemlocaties'],
  ['Onderzoek', 'Bodemonderzoeken'],
  ['Saneringscontour', 'Saneringscontouren'],
  ['Verontreinigingscontour', 'Verontreinigingscontouren'],
  ['Zorgmaatregel', 'Zorgmaatregelen'],
  ['Adreslocatie', 'Adreslocaties'],
  ['Nazcatanks', 'Tanks'],
] as const;

function finiteRd(value: unknown, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function parseFeatureInfo(text: string) {
  const clean = text.replace(/^GetFeatureInfo results:\s*/i, '').trim();
  if (!clean || /Search returned no results/i.test(clean)) return { count: 0, raw: '' };
  const featureHeaders = clean.match(/^Layer\s+'.+?'\s+Feature\s+\d+:/gim);
  return { count: featureHeaders?.length || 1, raw: clean.slice(0, 20_000) };
}

async function queryLayer(layer: string, label: string, x: number, y: number, radius: number) {
  const params = new URLSearchParams({
    map: MAPFILE,
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetFeatureInfo', CRS: 'EPSG:28992',
    BBOX: `${x - radius},${y - radius},${x + radius},${y + radius}`,
    WIDTH: '1', HEIGHT: '1', I: '0', J: '0',
    LAYERS: layer, QUERY_LAYERS: layer, STYLES: '', FORMAT: 'image/png',
    INFO_FORMAT: 'text/plain', FEATURE_COUNT: '100',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${MAPSERVER}?${params}`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseFeatureInfo(await response.text());
    return { id: layer, label, ok: true, ...parsed };
  } catch (error) {
    return { id: layer, label, ok: false, count: 0, raw: '', error: error instanceof Error ? error.message : 'Onbekende fout' };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const x = finiteRd(body.x, 0, 300_000);
    const y = finiteRd(body.y, 300_000, 650_000);
    const radius = Math.min(100, Math.max(1, Number(body.radius) || 25));
    if (x === null || y === null) return NextResponse.json({ error: 'Ongeldige RD-coördinaten' }, { status: 400 });
    const layers = await Promise.all(LAYERS.map(([id, label]) => queryLayer(id, label, x, y, radius)));
    return NextResponse.json({ source: 'ODNZKG Nazca openbare WMS', checkedAt: new Date().toISOString(), x, y, radius, layers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Milieucheck mislukt' }, { status: 500 });
  }
}
