// RD metres: exact point-to-polygon distance, including interior holes.
function ringDistance(x, y, ring) {
  let inside = false, distance = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i];
    if ((ay > y) !== (by > y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
    const dx=bx-ax, dy=by-ay, len=dx*dx+dy*dy;
    const t=len ? Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/len)) : 0;
    distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return {inside,distance};
}
function polygonDistance(x,y,rings) {
  const outer=ringDistance(x,y,rings[0]);
  const holes=rings.slice(1).map(r=>ringDistance(x,y,r));
  if(outer.inside && !holes.some(h=>h.inside)) return 0;
  return Math.min(outer.distance,...holes.map(h=>h.distance));
}
function rows(db,sql) {
  const result=db.exec(sql)[0];
  return result ? result.values.map(v=>Object.fromEntries(result.columns.map((c,i)=>[c,v[i]]))) : [];
}
function readDataset(db) {
  const records=rows(db,`SELECT l.*, s.name, s.follow_up, d.bro_id, h.deregistered, h.under_review,
    CASE WHEN l.contaminated_area_fk IS NOT NULL THEN 'Verontreinigd gebied'
      WHEN l.handled_area_fk IS NOT NULL THEN 'Aangepakt gebied'
      WHEN l.aftercare_area_fk IS NOT NULL THEN 'Nazorggebied' ELSE 'Bodemlocatie' END AS kind
    FROM bro_location l
    LEFT JOIN contaminated_area c ON c.contaminated_area_pk=l.contaminated_area_fk
    LEFT JOIN handled_area a ON a.handled_area_pk=l.handled_area_fk
    LEFT JOIN aftercare_area n ON n.aftercare_area_pk=l.aftercare_area_fk
    LEFT JOIN soil_location s ON s.soil_location_pk=COALESCE(l.soil_location_fk,c.soil_location_fk,a.soil_location_fk,n.soil_location_fk)
    LEFT JOIN soil_legal_decision d ON d.soil_legal_decision_pk=COALESCE(s.soil_legal_decision_fk,a.soil_legal_decision_fk)
    LEFT JOIN registration_history h ON h.soil_legal_decision_fk=d.soil_legal_decision_pk`);
  const points=rows(db,`SELECT m.bro_location_fk AS location, p.bro_polygon_pk AS polygon,
    r.bro_linear_ring_pk AS ring, r.bro_interior_fk AS hole, v.x_or_lon AS x,v.y_or_lat AS y
    FROM bro_point v JOIN bro_linear_ring r ON r.bro_linear_ring_pk=v.bro_linear_ring_fk
    LEFT JOIN bro_interior i ON i.bro_interior_pk=r.bro_interior_fk
    JOIN bro_polygon p ON p.bro_polygon_pk=COALESCE(r.bro_polygon_fk,i.bro_polygon_fk)
    JOIN bro_multi_polygon m ON m.bro_multi_polygon_pk=p.bro_multi_polygon_fk ORDER BY v.bro_point_pk`);
  const geometries=new Map();
  for(const pt of points){
    if(pt.x===null||pt.y===null||!Number.isFinite(Number(pt.x))||!Number.isFinite(Number(pt.y))) throw Error('Ongeldige BRO-coordinaten');
    if(!geometries.has(pt.location)) geometries.set(pt.location,new Map());
    const polygons=geometries.get(pt.location);
    if(!polygons.has(pt.polygon)) polygons.set(pt.polygon,new Map());
    const rings=polygons.get(pt.polygon);
    if(!rings.has(pt.ring)) rings.set(pt.ring,{hole:pt.hole!==null,points:[]});
    rings.get(pt.ring).points.push([Number(pt.x),Number(pt.y)]);
  }
  if(!records.length) throw Error('Lege BRO-dataset');
  const parsed = records.filter(r=>r.deregistered!=='ja').map(r=>{
    if(r.crs!=='RD'||!r.bro_id||!geometries.has(r.bro_location_pk)) throw Error('BRO-geometrie of koppeling niet ondersteund');
    const polygons=[...geometries.get(r.bro_location_pk).values()].map(rings=>{
      const all=[...rings.values()].sort((a,b)=>Number(a.hole)-Number(b.hole));
      if(all.filter(a=>!a.hole).length!==1) throw Error('Ongeldige BRO-buitenring');
      for(const ring of all){
        const ps=ring.points;
        if(ps.length<4||ps[0][0]!==ps[ps.length-1][0]||ps[0][1]!==ps[ps.length-1][1]) throw Error('Onvolledige BRO-ring');
      }
      return all.map(a=>a.points);
    });
    return {id:r.bro_location_pk,broId:r.bro_id,name:r.name||'',kind:r.kind,followUp:r.follow_up||'',underReview:r.under_review==='ja',polygons};
  });
  const expected=rows(db,`SELECT d.bro_id FROM soil_legal_decision d LEFT JOIN registration_history h
    ON h.soil_legal_decision_fk=d.soil_legal_decision_pk WHERE COALESCE(h.deregistered,'nee')!='ja'`);
  const covered=new Set(parsed.map(r=>r.broId));
  if(expected.some(r=>!covered.has(r.bro_id)))throw Error('BRO-besluiten zonder verwerkbare geometrie');
  return parsed;
}
function checkBuffer(records,x,y,radius=25){
  return records.flatMap(({polygons,...r})=>{
    const distance=Math.min(...polygons.map(p=>polygonDistance(x,y,p)));
    return distance<=radius+1e-7 ? [{...r,distance:Math.round(distance*100)/100}] : [];
  }).sort((a,b)=>a.distance-b.distance);
}
module.exports={polygonDistance,readDataset,checkBuffer};
