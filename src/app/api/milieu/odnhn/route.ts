import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAPSERVER = 'https://odnhn.nazca4u.nl/mapserver/mapserv.exe';
const MAPFILE = String.raw`D:\websites\kaarten\noord-holland\odnhn\mapfile\viewer15_odnhn.map`;
const LAYERS = [['Locatie', 'Bodemlocaties'], ['Onderzoek', 'Bodemonderzoeken'], ['Historisch_bodembestand', 'Historisch bodembestand (HBB)']] as const;

function finiteRd(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function parseFeatureInfo(text: string) {
  if (/ServiceException|ExceptionReport|<html/i.test(text)) throw new Error('ODNHN gaf een bronfout');
  if (!/^GetFeatureInfo results:/i.test(text.trim())) throw new Error('Onverwacht bronformaat');
  const clean = text.replace(/^GetFeatureInfo results:\s*/i, '').trim();
  if (!clean || /Search returned no results/i.test(clean)) return { count: 0, raw: '' };
  const featureHeaders = clean.match(/^\s*Feature\s+\d+:/gim);
  if (!featureHeaders?.length) throw new Error('Onherkende brongegevens');
  return { count: featureHeaders.length, raw: clean.slice(0, 20_000) };
}

async function queryLayer(layer: string, label: string, x: number, y: number, radius: number) {
  const params = new URLSearchParams({
    map: MAPFILE,
    SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetFeatureInfo', CRS: 'EPSG:28992',
    BBOX: `${x - radius},${y - radius},${x + radius},${y + radius}`,
    WIDTH: '101', HEIGHT: '101', I: '50', J: '50',
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
    const radius = 25;
    if (x === null || y === null) return NextResponse.json({ error: 'Ongeldige RD-coördinaten' }, { status: 400 });
    const layers = await Promise.all(LAYERS.map(([id, label]) => queryLayer(id, label, x, y, radius)));
    return NextResponse.json({ source: 'ODNHN Nazca openbare WMS', selection: 'Puntbevraging op het boorpunt; geen volledige 25 m-buffer- of archiefcontrole', ok: layers.every(l => l.ok && l.count < 100), checkedAt: new Date().toISOString(), x, y, radius, layers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Milieucheck mislukt' }, { status: 500 });
  }
}
