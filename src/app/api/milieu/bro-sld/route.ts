import { NextRequest, NextResponse } from 'next/server';
const initSqlJs = require('sql.js/dist/sql-asm.js');
const {readDataset,checkBuffer} = require('../../../../lib/bro-sld.cjs');
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const ROOT='https://service.pdok.nl/tno/bro-overheidsbesluit-bodemverontreiniging/atom/';
const FEED=ROOT+'bro_overheidsbesluit_bodemverontreiniging_sld.xml';
const FILE=ROOT+'downloads/brosldvolledigeset.gpkg';
const limitation='Alleen de momenteel gepubliceerde BRO-SLD-registraties. Historische aanlevering loopt tot 1 januari 2031. Geen volledige ODNHN-, HBB-, tank- of onderzoeksarchiefcontrole; geen treffer is geen schoonverklaring.';
let cached: {at:number;data:unknown;sourceUpdated:string;retrievedAt:string}|undefined;
async function load(){
  if(cached && Date.now()-cached.at<15*60*1000)return cached;
  const feed=await fetch(FEED,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!feed.ok)throw Error('BRO-bronmetadata niet bereikbaar');
  const xml=await feed.text();
  const updated=xml.match(/<updated>([^<]+)<\/updated>/)?.[1];
  if(!updated||!Number.isFinite(Date.parse(updated)))throw Error('BRO-brondatum ontbreekt');
  const response=await fetch(FILE,{cache:'no-store',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('BRO-download niet bereikbaar');
  if(Number(response.headers.get('content-length'))>20_000_000)throw Error('BRO-dataset overschrijdt verwerkingslimiet');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>20_000_000)throw Error('BRO-dataset overschrijdt verwerkingslimiet');
  const SQL=await initSqlJs();const db=new SQL.Database(new Uint8Array(buffer));
  try {cached={at:Date.now(),data:readDataset(db),sourceUpdated:updated,retrievedAt:new Date().toISOString()};return cached;}
  finally {db.close();}
}
export async function POST(request:NextRequest){
  try {
    const {x,y}=await request.json();
    if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>300000||y<300000||y>650000)
      return NextResponse.json({ok:false,error:'Ongeldige RD-coordinaten'},{status:400});
    const source=await load();
    const results=checkBuffer(source.data,x,y,25);
    return NextResponse.json({ok:true,source:'PDOK / BRO SLD',sourceUrl:FEED,sourceUpdated:source.sourceUpdated,retrievedAt:source.retrievedAt,checkedAt:new Date().toISOString(),radius:25,x,y,results,limitation});
  } catch (error) { console.error('BRO-SLD',error instanceof Error ? error.message : 'Bronfout'); return NextResponse.json({ok:false,results:[],error:'BRO-SLD niet volledig gecontroleerd: bron niet bereikbaar of gegevens niet verwerkbaar.',limitation},{status:502}); }
}
