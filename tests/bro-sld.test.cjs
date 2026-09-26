const {test}=require('node:test');
const assert=require('node:assert/strict');
const {polygonDistance,checkBuffer,readDataset}=require('../src/lib/bro-sld.cjs');
const square=[[0,0],[100,0],[100,100],[0,100],[0,0]];
test('Inside, exact 25m boundary, outside and bbox corner',()=>{
  const data=[{id:1,polygons:[[square]]}];
  assert.equal(polygonDistance(50,50,[square]),0);
  assert.equal(checkBuffer(data,125,50).length,1);
  assert.equal(checkBuffer(data,125.001,50).length,0);
  assert.equal(checkBuffer(data,120,120).length,0);
});
test('Interior hole is not treated as filled polygon',()=>{
  const hole=[[10,10],[90,10],[90,90],[10,90],[10,10]];
  assert.equal(polygonDistance(50,50,[square,hole]),40);
  assert.equal(polygonDistance(20,50,[square,hole]),10);
});
test('Multiple polygons and rounded distances do not widen 25m',()=>{
  const data=[{id:1,polygons:[[square],[square.map(([x,y])=>[x+300,y])]]}];
  assert.equal(checkBuffer(data,350,50).length,1);
  assert.equal(checkBuffer(data,125.004,50).length,0);
});
test('Real published GeoPackage contains parseable RD geometries', {skip:!process.env.BRO_GPKG},async()=>{
  const SQL=await require('sql.js/dist/sql-asm.js')();
  const db=new SQL.Database(require('node:fs').readFileSync(process.env.BRO_GPKG));
  try {
    const records=readDataset(db);
    assert.ok(records.length>0);
    const [x,y]=records[0].polygons[0][0][0];
    assert.ok(checkBuffer(records,x,y).some(r=>r.id===records[0].id));
    console.log(JSON.stringify({count:records.length,example:records[0].name,x,y}));
  } finally {db.close();}
});
