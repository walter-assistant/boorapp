// ============================================================
// HANDTEKENING (loaded at init)
// ============================================================
let handtekeningB64 = null;
async function loadHandtekening() {
  try {
    const resp = await fetch('/handtekening.b64');
    if (resp.ok) handtekeningB64 = 'data:image/jpeg;base64,' + await resp.text();
  } catch(e) { /* no signature available */ }
}

function addSignature(pdf, x, y, w, h) {
  if (!handtekeningB64) return;
  try { pdf.addImage(handtekeningB64, 'JPEG', x, y, w || 40, h || 15); } catch(e) {}
}

// ============================================================
// DROPBOX AUTO-SAVE
// ============================================================
async function uploadToDropbox(pdfDoc, filename, klant, projectnr, docType) {
  try {
    console.log('Dropbox upload:', {klant, projectnr, docType, filename});
    var pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
    var klantFolder = (klant || 'Zonder_klant').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    var projectFolder = (projectnr || 'Zonder_projectnummer').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    var folderPath = '/Ground Research/' + klantFolder + '/' + projectFolder + '/' + docType;
    var dropboxPath = folderPath + '/' + filename;
    // Eerst map aanmaken
    await fetch('/api/dropbox/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath: folderPath })
    });
    // Dan bestand uploaden
    var response = await fetch('/api/dropbox/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: dropboxPath, fileContent: pdfBase64, fileName: filename })
    });
    var result = await response.json();
    if (result.success) {
      showDropboxNotification('\u2601\ufe0f Opgeslagen in Dropbox: ' + result.path, 'success');
    } else {
      console.error('Dropbox upload failed:', result.error);
      showDropboxNotification('\u26a0\ufe0f Dropbox: ' + result.error, 'error');
    }
  } catch (err) {
    console.error('Dropbox upload error:', err);
    showDropboxNotification('\u26a0\ufe0f Dropbox upload mislukt (geen verbinding?)', 'error');
  }
}

function showDropboxNotification(message, type) {
  var existing = document.getElementById('dropbox-notification');
  if (existing) existing.remove();
  var div = document.createElement('div');
  div.id = 'dropbox-notification';
  div.textContent = message;
  div.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 20px;border-radius:8px;font-size:14px;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.5s;opacity:1;background:' + (type === 'success' ? '#27ae60' : '#e74c3c') + ';';
  document.body.appendChild(div);
  setTimeout(function() { div.style.opacity = '0'; setTimeout(function() { div.remove(); }, 500); }, 4000);
}
// ============================================================
// DATA & STATE
// ============================================================
const DEFAULT_KLANTEN = [
  { id: 1, bedrijf: 'Aardwarmte techniek Nederland', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 2, bedrijf: 'Alltherm', contact: '', telefoon: '0235388344', adres: '', cert: '' },
  { id: 3, bedrijf: 'Beijaard Bouwbegleiding & Vormgeving', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 4, bedrijf: 'Bron Technologie', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 5, bedrijf: 'Daan de Loodgieter', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 6, bedrijf: 'Daan Installatietechniek', contact: 'Daan Spaansen', telefoon: '0615515826', adres: '', cert: '' },
  { id: 7, bedrijf: 'De Wit Loodgieters', contact: 'Erik de Wit', telefoon: '0622496595', adres: '', cert: '' },
  { id: 8, bedrijf: 'Ecensy', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 9, bedrijf: 'Eco-Well', contact: 'Edwin Bruin', telefoon: '', adres: 'Warmenhuizerweg 20 1749CG Warmenhuizen', cert: '' },
  { id: 10, bedrijf: 'GDG Klimaattechniek', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 11, bedrijf: 'Green Us', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 12, bedrijf: 'Grenko BV', contact: 'Carlo van Westen', telefoon: '0228-784055', adres: 'Gerard Brandtweg 103 1602LZ Enkhuizen', cert: 'K021695' },
  { id: 13, bedrijf: 'Ground Research BV', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 14, bedrijf: 'Happier', contact: 'Onno Speur', telefoon: '0652003499', adres: '', cert: '' },
  { id: 15, bedrijf: 'Herfst bv Installatie', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 16, bedrijf: 'HPS', contact: '', telefoon: '0613373780', adres: '', cert: '' },
  { id: 17, bedrijf: 'Installatiebedrijf Oud', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 18, bedrijf: 'Klimaat Concept', contact: '', telefoon: '0610022110', adres: '', cert: '' },
  { id: 19, bedrijf: 'Klimaatraad', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 20, bedrijf: 'Kodi', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 21, bedrijf: 'Leeuwdrent installaties', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 22, bedrijf: 'Leeuwdrent installatietechniek', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 23, bedrijf: 'Locas Duurzame totaalinstallateur', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 24, bedrijf: 'Louter Installatie Techniek', contact: 'Maurice Schouten', telefoon: '', adres: 'Kabelstraat 3 1749DM Warmenhuizen', cert: '' },
  { id: 25, bedrijf: 'Louter Installatie Techniek', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 26, bedrijf: 'M&O Techniek Wormer', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 27, bedrijf: 'Mario Hoogeboom', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 28, bedrijf: 'MH BV', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 29, bedrijf: 'Monshouwer Bouwservice', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 30, bedrijf: 'Nathan', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 31, bedrijf: 'Nefit Bosch', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 32, bedrijf: 'Nibe', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 33, bedrijf: 'Nocon', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 34, bedrijf: 'NRG Format', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 35, bedrijf: 'Rebra/Ecensy BV', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 36, bedrijf: 'Sixways', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 37, bedrijf: 'Tib van Lindenberg BV', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 38, bedrijf: 'Topenergietechniek', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 39, bedrijf: 'Van Losser Installaties Rijssen B.V.', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 40, bedrijf: 'VBK Verwarming en Sanitair', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 41, bedrijf: 'Verver Installatietechniek', contact: 'Karel Verver', telefoon: '0653285293', adres: 'Brugstraat 35 1906WT Limmen', cert: '' },
  { id: 42, bedrijf: 'Vroling BV', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 43, bedrijf: 'Warmtebelang', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 44, bedrijf: 'Wittebrood Installaties', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 45, bedrijf: 'WkO Nederland', contact: '', telefoon: '', adres: '', cert: '' },
  { id: 46, bedrijf: 'VAME BV', contact: '', telefoon: '', adres: '', cert: '' }
];

const KLANTEN_VERSION = 2; // Bump this to force update default klanten list
function getKlanten() {
  let k = localStorage.getItem('gr_klanten');
  const v = parseInt(localStorage.getItem('gr_klanten_version') || '0');
  if (!k || v < KLANTEN_VERSION) {
    // Merge: keep existing custom klanten (id > max default), replace defaults
    const maxDefaultId = Math.max(...DEFAULT_KLANTEN.map(x => x.id));
    let existing = [];
    try { existing = JSON.parse(k) || []; } catch(e) {}
    const custom = existing.filter(x => x.id > maxDefaultId);
    const merged = [...DEFAULT_KLANTEN, ...custom];
    localStorage.setItem('gr_klanten', JSON.stringify(merged));
    localStorage.setItem('gr_klanten_version', String(KLANTEN_VERSION));
    return [...merged];
  }
  return JSON.parse(k);
}
function saveKlanten(arr) { localStorage.setItem('gr_klanten', JSON.stringify(arr)); }
function getOffertes() { return JSON.parse(localStorage.getItem('gr_offertes') || '[]'); }
function saveOffertes(arr) { localStorage.setItem('gr_offertes', JSON.stringify(arr)); }

// ============================================================
// FORMATTING
// ============================================================
// ============================================================
// WKO TOOL INTEGRATION — Direct API (geen server nodig)
// ============================================================
const WKO_SVC = {
  verbod: 'https://services.arcgis.com/kE0BiyvJHb5SwQv7/arcgis/rest/services/WKO_service_public_view/FeatureServer',
  aandacht: 'https://services.arcgis.com/kE0BiyvJHb5SwQv7/arcgis/rest/services/WKO_Aandachtsgebieden_service_new_public_view/FeatureServer',
  actueel: 'https://services6.arcgis.com/HPJYVor07eWoNSp6/arcgis/rest/services/wko_actueel_featureservice/FeatureServer',
  punten: 'https://services.arcgis.com/kE0BiyvJHb5SwQv7/arcgis/rest/services/WKOPunten_PublicEditView/FeatureServer',
  gemeente: 'https://services.arcgis.com/nSZVuSZjHpEZZbRo/arcgis/rest/services/CBS_Gemeente_actueel/FeatureServer',
  res: 'https://services.arcgis.com/nSZVuSZjHpEZZbRo/arcgis/rest/services/CBS_Regionale_energiestrategie_actueel/FeatureServer',
};

const WKO_VERBOD = [{id:0,name:'Installaties'},{id:1,name:'Open bodemenergiesystemen'},{id:2,name:'Grondwateronttrekking'},{id:3,name:'Gesloten bodemenergiesystemen'}];
const WKO_AANDACHT = [{id:0,name:'Natuur'},{id:1,name:'Archeologie'},{id:2,name:'Aardkundige waarden'}];
const WKO_ACTUEEL = [{id:0,name:'Natura 2000 / NNN'},{id:1,name:'Restrictie dieptebeperking'},{id:2,name:'Aardkundige waarden'},{id:3,name:'Restrictie ordening'},{id:4,name:'Verbodsgebieden'},{id:5,name:'Specifiek provinciaal beleid'}];

async function wkoQueryPoint(baseUrl, layerId, x, y) {
  const params = new URLSearchParams({
    f:'json', geometry:JSON.stringify({x,y,spatialReference:{wkid:28992}}),
    geometryType:'esriGeometryPoint', spatialRel:'esriSpatialRelIntersects',
    outFields:'*', returnGeometry:'false', inSR:'28992'
  });
  const resp = await fetch(`${baseUrl}/${layerId}/query?${params}`);
  return await resp.json();
}

async function wkoQueryBuffer(baseUrl, layerId, x, y, dist) {
  const params = new URLSearchParams({
    f:'json', geometry:JSON.stringify({x,y,spatialReference:{wkid:28992}}),
    geometryType:'esriGeometryPoint', spatialRel:'esriSpatialRelIntersects',
    distance:String(dist), units:'esriSRUnit_Meter',
    outFields:'*', returnGeometry:'false', inSR:'28992'
  });
  const resp = await fetch(`${baseUrl}/${layerId}/query?${params}`);
  return await resp.json();
}

async function startWKO() {
  const address = document.getElementById('f-locatie').value.trim();
  if (!address) { alert('Vul eerst een adres in bij "Locatie boringen"'); return; }

  const progressDiv = document.getElementById('wko-progress');
  const logDiv = document.getElementById('wko-log');
  const resultDiv = document.getElementById('wko-result');
  const statusSpan = document.getElementById('wko-status');

  progressDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  logDiv.innerHTML = '';
  statusSpan.textContent = 'Bezig...';
  statusSpan.style.color = '#c67600';

  function addLog(msg) {
    const line = document.createElement('div');
    line.textContent = '\u25B8 ' + msg;
    line.style.padding = '2px 0';
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  try {
    // 1. PDOK Geocoding
    addLog('Adres opzoeken via PDOK...');
    const pdokResp = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(address)}&rows=1`);
    const pdokData = await pdokResp.json();
    const doc = pdokData.response?.docs?.[0];
    if (!doc) throw new Error('Adres niet gevonden');
    const rdMatch = doc.centroide_rd?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    const wgsMatch = doc.centroide_ll?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!rdMatch) throw new Error('Geen RD-co\u00F6rdinaten');
    const rdX = parseFloat(rdMatch[1]), rdY = parseFloat(rdMatch[2]);
    addLog(`\u2714 ${doc.weergavenaam} (RD: ${Math.round(rdX)}, ${Math.round(rdY)})`);

    const report = {
      address, timestamp: new Date().toISOString(),
      location: { address: doc.weergavenaam, rdX, rdY,
        wgs84Lon: wgsMatch ? parseFloat(wgsMatch[1]) : null,
        wgs84Lat: wgsMatch ? parseFloat(wgsMatch[2]) : null }
    };

    // 2. Gemeente + RES
    addLog('Gemeente opzoeken...');
    const [gem, res] = await Promise.all([
      wkoQueryPoint(WKO_SVC.gemeente, 0, rdX, rdY),
      wkoQueryPoint(WKO_SVC.res, 0, rdX, rdY)
    ]);
    report.gemeente = gem.features?.[0]?.attributes?.statnaam || 'Onbekend';
    report.resRegio = res.features?.[0]?.attributes?.statnaam || 'Onbekend';
    addLog(`\u2714 ${report.gemeente}, RES: ${report.resRegio}`);

    // 3. Verbodsgebieden (parallel)
    addLog('Verbodsgebieden controleren...');
    const verbodResults = await Promise.all(WKO_VERBOD.map(l => wkoQueryPoint(WKO_SVC.verbod, l.id, rdX, rdY)));
    report.verbodsgebieden = [];
    verbodResults.forEach((r, i) => {
      if (r.features?.length) report.verbodsgebieden.push({ type: WKO_VERBOD[i].name, count: r.features.length });
    });
    addLog(report.verbodsgebieden.length ? '\u26D4 Verbodsgebieden: ' + report.verbodsgebieden.map(v=>v.type).join(', ') : '\u2714 Geen verbodsgebieden');

    // 4. Aandachtsgebieden (parallel)
    addLog('Aandachtsgebieden controleren...');
    const aandachtResults = await Promise.all(WKO_AANDACHT.map(l => wkoQueryPoint(WKO_SVC.aandacht, l.id, rdX, rdY)));
    report.aandachtsgebieden = [];
    aandachtResults.forEach((r, i) => {
      if (r.features?.length) report.aandachtsgebieden.push({ type: WKO_AANDACHT[i].name, count: r.features.length });
    });
    addLog(report.aandachtsgebieden.length ? '\u26A0 Aandachtsgebieden: ' + report.aandachtsgebieden.map(a=>a.type).join(', ') : '\u2714 Geen aandachtsgebieden');

    // 5. Restricties (parallel)
    addLog('Restrictiegebieden controleren...');
    const actueelResults = await Promise.all(WKO_ACTUEEL.map(l => wkoQueryPoint(WKO_SVC.actueel, l.id, rdX, rdY)));
    report.restricties = [];
    actueelResults.forEach((r, i) => {
      if (r.features?.length) report.restricties.push({ type: WKO_ACTUEEL[i].name, count: r.features.length });
    });
    addLog(report.restricties.length ? '\u26A0 Restricties: ' + report.restricties.map(r=>r.type).join(', ') : '\u2714 Geen restricties');

    // 6. Nabije systemen
    addLog('Bestaande WKO systemen zoeken (500m)...');
    const punten = await wkoQueryBuffer(WKO_SVC.punten, 0, rdX, rdY, 500);
    report.nabijeSystemen = punten.features?.length || 0;
    addLog(report.nabijeSystemen > 0 ? `\u{1F4CD} ${report.nabijeSystemen} systemen binnen 500m` : '\u2714 Geen nabije systemen');

    // 7. Conclusie
    if (report.verbodsgebieden.length > 0) {
      report.conclusie = 'Niet toegestaan';
      report.conclusieKleur = 'rood';
      report.conclusieDetail = 'Er zijn verbodsgebieden gevonden. Bodemenergie is hier niet toegestaan.';
    } else if (report.aandachtsgebieden.length > 0 || report.restricties.length > 0) {
      report.conclusie = 'Onder voorwaarden';
      report.conclusieKleur = 'oranje';
      const geb = [...report.aandachtsgebieden.map(a=>a.type), ...report.restricties.map(r=>r.type)];
      report.conclusieDetail = `Aandachts-/restrictiegebieden: ${geb.join(', ')}. Neem contact op met provincie (open) of gemeente (gesloten).`;
    } else {
      report.conclusie = 'Toegestaan';
      report.conclusieKleur = 'groen';
      report.conclusieDetail = 'Geen verbods-, restrictie- of aandachtsgebieden. Bodemenergie is hier toegestaan.';
    }

    // 8. Toon resultaat
    addLog('\u2705 Analyse compleet!');
    statusSpan.textContent = '\u2705 Klaar!';
    statusSpan.style.color = '#2d7d46';

    const kleuren = { groen: '#2e7d32', oranje: '#e65100', rood: '#c62828' };
    const kleur = kleuren[report.conclusieKleur] || '#333';

    let gebiedenHTML = '';
    if (report.verbodsgebieden.length) gebiedenHTML += '<div style="margin-top:6px;"><b style="color:#c62828;">\u26D4 Verbodsgebieden:</b> ' + report.verbodsgebieden.map(v=>v.type).join(', ') + '</div>';
    if (report.aandachtsgebieden.length) gebiedenHTML += '<div style="margin-top:4px;"><b style="color:#e65100;">\u26A0\uFE0F Aandachtsgebieden:</b> ' + report.aandachtsgebieden.map(a=>a.type).join(', ') + '</div>';
    if (report.restricties.length) gebiedenHTML += '<div style="margin-top:4px;"><b style="color:#e65100;">\u{1F4CB} Restricties:</b> ' + report.restricties.map(x=>x.type).join(', ') + '</div>';
    if (!report.verbodsgebieden.length && !report.aandachtsgebieden.length && !report.restricties.length) {
      gebiedenHTML = '<div style="margin-top:6px; color:#2e7d32;">\u2705 Geen verbods-, aandachts- of restrictiegebieden</div>';
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
      <div style="border-left:4px solid ${kleur}; padding:8px 12px; background:#f8f9fb; border-radius:0 6px 6px 0;">
        <div style="font-size:14px; font-weight:700; color:${kleur};">${report.conclusie}</div>
        <div style="font-size:11px; color:#666; margin-top:2px;">${report.location.address}</div>
        <div style="font-size:11px; color:#888;">Gemeente: ${report.gemeente} \u00B7 RES: ${report.resRegio} \u00B7 RD: ${Math.round(rdX)}, ${Math.round(rdY)}</div>
        ${gebiedenHTML}
        ${report.nabijeSystemen > 0 ? '<div style="margin-top:4px; font-size:11px;">\u{1F4CD} ' + report.nabijeSystemen + ' bestaande WKO systemen binnen 500m</div>' : ''}
        <div style="margin-top:6px; font-size:10px; color:#aaa;">${report.conclusieDetail}</div>
      </div>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button onclick="downloadWKOPdf()" class="btn btn-primary btn-sm" style="background:#2d7d46;">
          \u{1F4C4} Download WKO Rapport (PDF)
        </button>
      </div>`;

    // 9. Omliggende installaties ophalen (2km radius)
    addLog('Omliggende bronnen ophalen...');
    const instParams = new URLSearchParams({
      f:'json', geometry:JSON.stringify({x:rdX,y:rdY,spatialReference:{wkid:28992}}),
      geometryType:'esriGeometryPoint', spatialRel:'esriSpatialRelIntersects',
      distance:'750', units:'esriSRUnit_Meter',
      outFields:'*',
      returnGeometry:'false', inSR:'28992'
    });
    // Layer 0 = Installaties (all types), Layer 3 = Gesloten (more detail)
    const [instResp, gbesResp, obesResp] = await Promise.all([
      fetch(WKO_SVC.verbod + '/0/query?' + instParams).then(r=>r.json()),
      fetch(WKO_SVC.verbod + '/3/query?' + instParams).then(r=>r.json()),
      fetch(WKO_SVC.verbod + '/1/query?' + instParams).then(r=>r.json()),
    ]);
    
    // Deduplicate by installatie_id, merge details
    const installaties = new Map();
    for (const f of (instResp.features || [])) {
      const a = f.attributes;
      if (a.X && a.Y) installaties.set(a.installatie_id, { ...a, id: a.installatie_id, x: a.X, y: a.Y });
    }
    for (const f of (gbesResp.features || [])) {
      const a = f.attributes;
      const existing = installaties.get(a.installatie_id);
      if (existing) { Object.assign(existing, a, { x: existing.x, y: existing.y }); }
      else if (a.X && a.Y) installaties.set(a.installatie_id, { ...a, id: a.installatie_id, type: 'GBES', x: a.X, y: a.Y });
    }
    for (const f of (obesResp.features || [])) {
      const a = f.attributes;
      const existing = installaties.get(a.installatie_id);
      if (existing) { Object.assign(existing, a, { x: existing.x, y: existing.y }); }
      else if (a.X && a.Y) installaties.set(a.installatie_id, { ...a, id: a.installatie_id, type: 'OBES', x: a.X, y: a.Y });
    }
    
    report.installaties = Array.from(installaties.values());
    const gbes = report.installaties.filter(i => i.type === 'GBES');
    const obes = report.installaties.filter(i => i.type === 'OBES');
    const overig = report.installaties.filter(i => i.type !== 'GBES' && i.type !== 'OBES');
    addLog(`\u2714 ${report.installaties.length} bronnen (750m): ${gbes.length} gesloten, ${obes.length} open${overig.length ? ', ' + overig.length + ' overig' : ''}`);

    // 10. Kaartafbeelding ophalen voor PDF
    addLog('Kaart ophalen...');
    try {
      const ext = 750; // 1500m breed om alle bronnen (750m radius) te tonen
      report._mapExtent = { xmin: rdX-ext, ymin: rdY-ext, xmax: rdX+ext, ymax: rdY+ext };
      const mapUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/export?bbox=${rdX-ext},${rdY-ext},${rdX+ext},${rdY+ext}&bboxSR=28992&imageSR=28992&size=800,600&format=png&f=image&dpi=150`;
      const mapResp = await fetch(mapUrl);
      if (mapResp.ok) {
        const mapBlob = await mapResp.blob();
        report._mapDataUrl = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(mapBlob);
        });
        addLog('\u2714 Kaart geladen');
      }
    } catch (e) { addLog('Kaart niet beschikbaar: ' + e.message); }

    window._lastWKOReport = report;

  } catch (err) {
    addLog('\u274C Fout: ' + err.message);
    statusSpan.textContent = '\u274C Mislukt';
    statusSpan.style.color = '#c60000';
  }
}

function downloadWKOPdf() {
  const r = window._lastWKOReport;
  if (!r) { alert('Voer eerst een WKO analyse uit'); return; }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210, M = 20, CW = W - 2*M;
  let y = 20;

  const BLAUW = [30, 58, 95];
  const GRIJS = [100, 100, 100];
  const LGRIJS = [160, 160, 160];
  const ZWART = [33, 33, 33];
  const kleuren = { groen: [46, 125, 50], oranje: [230, 81, 0], rood: [198, 40, 40] };
  const conclusieKleur = kleuren[r.conclusieKleur] || ZWART;

  function addText(text, x, size, color, style) {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', style || 'normal');
    pdf.text(String(text), x, y);
  }

  function drawLine(x1, y1, x2, y2, color, width) {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(width || 0.3);
    pdf.line(x1, y1, x2, y2);
  }

  function sectionHeader(title) {
    if (y + 30 > 275) { pdf.addPage(); y = 20; }
    addText(title, M, 11, BLAUW, 'bold');
    y += 2;
    drawLine(M, y, M + CW, y, BLAUW, 0.5);
    y += 7;
  }

  function checkItem(text, ok) {
    const color = ok ? [46, 125, 50] : [230, 81, 0];
    const icon = ok ? '\u2714' : '\u26A0';
    if (!ok) { pdf.setFillColor(255, 243, 224); pdf.rect(M, y - 4, CW, 7, 'F'); }
    addText(icon + '  ' + text, M + 2, 9, color, ok ? 'normal' : 'bold');
    y += 7;
  }

  // ===================== PAGE 1: RAPPORT =====================

  // HEADER
  pdf.setFillColor(...BLAUW);
  pdf.rect(0, 0, W, 35, 'F');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ground Research BV', M, 14);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('WKO Bodemenergie Rapport', M, 22);
  pdf.setFontSize(8);
  pdf.setTextColor(200, 210, 230);
  pdf.text('Vrijheidweg 45, 1521RP Wormerveer  |  06-47326322  |  info@groundresearch.nl', M, 30);
  y = 46;

  // CONCLUSIE BLOK (prominent bovenaan)
  const concH = 22;
  pdf.setFillColor(...conclusieKleur);
  pdf.rect(M, y, 4, concH, 'F');
  pdf.setFillColor(248, 249, 251);
  pdf.rect(M + 4, y, CW - 4, concH, 'F');
  y += 8;
  addText(r.conclusie.toUpperCase(), M + 10, 16, conclusieKleur, 'bold');
  y += 7;
  pdf.setFontSize(8); pdf.setTextColor(...GRIJS);
  const detailLines = pdf.splitTextToSize(r.conclusieDetail || '', CW - 16);
  pdf.text(detailLines, M + 10, y);
  y = y - 15 + concH + 10;

  // LOCATIE INFO (links) + KAART (rechts) — zij aan zij
  sectionHeader('LOCATIEGEGEVENS');

  const locRows = [
    ['Adres', r.location?.address || r.address],
    ['Gemeente', r.gemeente || '-'],
    ['RES Regio', r.resRegio || '-'],
    ['RD', `X: ${Math.round(r.location?.rdX || 0)}  /  Y: ${Math.round(r.location?.rdY || 0)}`],
    ['Datum', new Date(r.timestamp).toLocaleDateString('nl-NL', { day:'numeric', month:'long', year:'numeric' })],
  ];
  if (r.location?.wgs84Lat) locRows.splice(4, 0, ['WGS84', `${r.location.wgs84Lat.toFixed(6)}, ${r.location.wgs84Lon.toFixed(6)}`]);

  const locStartY = y;
  for (const [label, value] of locRows) {
    addText(label + ':', M, 8, GRIJS, 'bold');
    addText(value, M + 28, 8, ZWART, 'normal');
    y += 5.5;
  }

  // KAART (rechts van locatie-info) met bronnen
  let mapBottomY = locStartY;
  if (r._mapDataUrl) {
    const mapW = 82, mapH = 62;
    const mapX = W - M - mapW;
    const mapY = locStartY - 4;
    try {
      pdf.addImage(r._mapDataUrl, 'PNG', mapX, mapY, mapW, mapH);

      // Teken omliggende bronnen op de kaart
      if (r.installaties?.length && r._mapExtent) {
        const ext = r._mapExtent;
        const scaleX = mapW / (ext.xmax - ext.xmin);
        const scaleY = mapH / (ext.ymax - ext.ymin);

        for (const inst of r.installaties) {
          const px = mapX + (inst.x - ext.xmin) * scaleX;
          const py = mapY + mapH - (inst.y - ext.ymin) * scaleY; // Y is inverted
          if (px < mapX || px > mapX + mapW || py < mapY || py > mapY + mapH) continue;

          if (inst.type === 'OBES') {
            pdf.setFillColor(230, 81, 0); // oranje = open
          } else if (inst.type === 'GBES') {
            pdf.setFillColor(30, 100, 200); // blauw = gesloten
          } else {
            pdf.setFillColor(130, 130, 130); // grijs = overig
          }
          pdf.circle(px, py, 0.9, 'F');
          pdf.setDrawColor(255, 255, 255);
          pdf.setLineWidth(0.3);
          pdf.circle(px, py, 0.9, 'S');
        }
      }

      // Locatie marker (rode stip, groter, in het midden)
      pdf.setFillColor(220, 40, 40);
      pdf.circle(mapX + mapW/2, mapY + mapH/2, 2.2, 'F');
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.6);
      pdf.circle(mapX + mapW/2, mapY + mapH/2, 2.2, 'S');

      // Kader
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.rect(mapX, mapY, mapW, mapH, 'S');

      // Legenda onder kaart
      const legY = mapY + mapH + 4;
      pdf.setFontSize(6); pdf.setTextColor(...LGRIJS);
      pdf.text('750m radius  |', mapX, legY);
      // Rode stip
      pdf.setFillColor(220, 40, 40); pdf.circle(mapX + 25, legY - 1.2, 1, 'F');
      pdf.text('Locatie', mapX + 27, legY);
      // Blauwe stip
      pdf.setFillColor(30, 100, 200); pdf.circle(mapX + 40, legY - 1.2, 0.8, 'F');
      pdf.text('Gesloten', mapX + 42, legY);
      // Oranje stip
      pdf.setFillColor(230, 81, 0); pdf.circle(mapX + 55, legY - 1.2, 0.8, 'F');
      pdf.text('Open', mapX + 57, legY);
      // Grijze stip
      if (r.installaties?.some(i => i.type !== 'GBES' && i.type !== 'OBES')) {
        pdf.setFillColor(130, 130, 130); pdf.circle(mapX + 66, legY - 1.2, 0.8, 'F');
        pdf.text('Overig', mapX + 68, legY);
      }
      
      mapBottomY = legY + 4;
    } catch (e) { /* kaart niet beschikbaar */ }
  }

  y = Math.max(y, mapBottomY) + 6;

  // VERBODSGEBIEDEN
  sectionHeader('VERBODSGEBIEDEN');
  if (r.verbodsgebieden?.length) {
    for (const v of r.verbodsgebieden) {
      pdf.setFillColor(255, 235, 238); pdf.rect(M, y - 4, CW, 7, 'F');
      addText('\u26D4  ' + v.type, M + 2, 9, [198, 40, 40], 'bold'); y += 7;
    }
  } else {
    checkItem('Geen verbodsgebieden gevonden op deze locatie.', true);
  }
  pdf.setFontSize(7); pdf.setTextColor(...LGRIJS);
  y += 1;
  pdf.text('Gecontroleerd: ' + WKO_VERBOD.map(l => l.name).join(', '), M + 2, y);
  y += 8;

  // AANDACHTSGEBIEDEN
  sectionHeader('AANDACHTSGEBIEDEN');
  if (r.aandachtsgebieden?.length) {
    for (const a of r.aandachtsgebieden) checkItem(a.type, false);
  } else {
    checkItem('Geen aandachtsgebieden gevonden.', true);
  }
  pdf.setFontSize(7); pdf.setTextColor(...LGRIJS); y += 1;
  pdf.text('Gecontroleerd: ' + WKO_AANDACHT.map(l => l.name).join(', '), M + 2, y);
  y += 8;

  // RESTRICTIEGEBIEDEN
  sectionHeader('RESTRICTIEGEBIEDEN');
  if (r.restricties?.length) {
    for (const x of r.restricties) checkItem(x.type, false);
  } else {
    checkItem('Geen restrictiegebieden gevonden.', true);
  }
  pdf.setFontSize(7); pdf.setTextColor(...LGRIJS); y += 1;
  const actNames = WKO_ACTUEEL.map(l => l.name).join(', ');
  const actLines = pdf.splitTextToSize('Gecontroleerd: ' + actNames, CW - 4);
  pdf.text(actLines, M + 2, y);
  y += actLines.length * 3.5 + 8;

  // OMLIGGENDE INSTALLATIES
  sectionHeader('OMLIGGENDE BODEMENERGIESYSTEMEN (750M)');
  
  if (r.installaties?.length) {
    const gbes = r.installaties.filter(i => i.type === 'GBES');
    const obes = r.installaties.filter(i => i.type === 'OBES');
    const overig = r.installaties.filter(i => i.type !== 'GBES' && i.type !== 'OBES');
    
    addText(`Totaal: ${r.installaties.length} installaties`, M + 2, 9, ZWART, 'bold');
    y += 6;
    
    if (gbes.length) { addText(`Gesloten systemen (GBES): ${gbes.length}`, M + 2, 8, [30, 100, 200], 'normal'); y += 5; }
    if (obes.length) { addText(`Open systemen (OBES): ${obes.length}`, M + 2, 8, [230, 81, 0], 'normal'); y += 5; }
    if (overig.length) { addText(`Overig (GWO e.d.): ${overig.length}`, M + 2, 8, GRIJS, 'normal'); y += 5; }
    y += 3;
    
    // Alle installaties, gesorteerd op afstand
    const rdXloc = r.location?.rdX || 0;
    const rdYloc = r.location?.rdY || 0;
    const withDist = r.installaties.map(i => ({
      ...i,
      dist: Math.round(Math.sqrt((i.x - rdXloc)**2 + (i.y - rdYloc)**2))
    })).sort((a, b) => a.dist - b.dist);
    
    // Tabel header
    if (y + 8 > 275) { pdf.addPage(); y = 20; }
    pdf.setFillColor(240, 242, 245);
    pdf.rect(M, y - 3.5, CW, 5.5, 'F');
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
    pdf.text('Afst.', M + 1, y);
    pdf.text('Type', M + 14, y);
    pdf.text('Status', M + 28, y);
    pdf.text('Verm.(kW)', M + 55, y);
    pdf.text('Diepte', M + 76, y);
    pdf.text('W(MWh)', M + 92, y);
    pdf.text('K(MWh)', M + 110, y);
    pdf.text('SPF', M + 128, y);
    pdf.text('Putten', M + 140, y);
    pdf.text('ID', M + 155, y);
    y += 5;
    
    pdf.setFont('helvetica', 'normal');
    for (const inst of withDist) {
      if (y + 5 > 275) {
        pdf.addPage(); y = 20;
        // Herhaal header op nieuwe pagina
        pdf.setFillColor(240, 242, 245);
        pdf.rect(M, y - 3.5, CW, 5.5, 'F');
        pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
        pdf.text('Afst.', M + 1, y); pdf.text('Type', M + 14, y); pdf.text('Status', M + 28, y);
        pdf.text('Verm.(kW)', M + 55, y); pdf.text('Diepte', M + 76, y); pdf.text('W(MWh)', M + 92, y);
        pdf.text('K(MWh)', M + 110, y); pdf.text('SPF', M + 128, y); pdf.text('Putten', M + 140, y); pdf.text('ID', M + 155, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setFontSize(6.5);
      const typeColor = inst.type === 'OBES' ? [230, 81, 0] : inst.type === 'GBES' ? [30, 100, 200] : GRIJS;
      pdf.setTextColor(...ZWART);
      pdf.text(`${inst.dist}m`, M + 1, y);
      pdf.setTextColor(...typeColor);
      pdf.text(inst.type || '-', M + 14, y);
      pdf.setTextColor(...ZWART);
      pdf.text((inst.status_instal || inst.status || '-').substring(0, 14), M + 28, y);
      pdf.text(inst.bodemzijdigvermogen ? String(inst.bodemzijdigvermogen) : inst.pompcapaciteit ? String(inst.pompcapaciteit) : '-', M + 55, y);
      pdf.text(inst.einddiepte ? inst.einddiepte + 'm' : '-', M + 76, y);
      pdf.text(inst.warmtevraag != null ? String(inst.warmtevraag) : '-', M + 92, y);
      pdf.text(inst.koudevraag != null ? String(inst.koudevraag) : '-', M + 110, y);
      pdf.text(inst.energierendement ? String(inst.energierendement) : '-', M + 128, y);
      pdf.text(inst.aantal_putten ? String(inst.aantal_putten) : '-', M + 140, y);
      pdf.setTextColor(...LGRIJS);
      pdf.text(String(inst.id || ''), M + 155, y);
      y += 4.2;
      drawLine(M, y - 1, M + CW, y - 1, [240, 240, 240], 0.1);
    }
  } else {
    checkItem('Geen bodemenergiesystemen gevonden binnen 750 meter.', true);
  }
  y += 8;

  // TOELICHTING
  sectionHeader('TOELICHTING');
  const toelichtingen = [
    'Dit rapport is gegenereerd op basis van openbare geodata van de Rijksdienst voor Ondernemend Nederland (RVO).',
    'Databronnen: ArcGIS FeatureServer (RVO/Esri) en PDOK Locatieserver (Kadaster). Kaartdata: Esri World Topographic Map.',
    'Er kunnen geen rechten worden ontleend aan dit rapport. Voor vergunningaanvragen en haalbaarheidsstudies is aanvullend onderzoek nodig.',
    'Open bodemenergiesystemen: contact provincie. Gesloten systemen: contact gemeente.',
  ];
  pdf.setFontSize(7.5); pdf.setTextColor(...GRIJS);
  for (const t of toelichtingen) {
    if (y + 10 > 275) { pdf.addPage(); y = 20; }
    const lines = pdf.splitTextToSize('\u2022  ' + t, CW - 4);
    pdf.text(lines, M + 2, y);
    y += lines.length * 3.5 + 2;
  }

  // FOOTER (alle pagina's)
  const pageCount = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7); pdf.setTextColor(...LGRIJS);
    drawLine(M, 287, W - M, 287, [220, 220, 220], 0.2);
    pdf.text(`Ground Research BV  \u2014  WKO Rapport  \u2014  ${r.location?.address || r.address}`, M, 291);
    pdf.text(`Pagina ${p}/${pageCount}`, W - M, 291, { align: 'right' });
  }

  const filename = `WKO_Rapport_${(r.location?.address || r.address).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  pdf.save(filename);

  // Automatisch opslaan in Dropbox — klant en project uit offerte-formulier
  var wkoKlant = '';
  try {
    var sel = document.getElementById('f-klant');
    if (sel && sel.selectedOptions[0] && sel.value) wkoKlant = sel.selectedOptions[0].textContent.trim();
  } catch(e) {}
  // Projectmap: zelfde formaat als Offerte → kenmerk-locatie
  var wkoKenmerk = '';
  try { wkoKenmerk = (document.getElementById('f-kenmerk')?.value || '').trim(); } catch(e) {}
  if (!wkoKenmerk) try { wkoKenmerk = (document.getElementById('pva-projectnr')?.value || '').trim(); } catch(e) {}
  var wkoLocatie = '';
  try { wkoLocatie = (document.getElementById('f-locatie')?.value || '').trim(); } catch(e) {}
  var wkoProjectNr = ((wkoKenmerk || '') + (wkoLocatie ? '-' + wkoLocatie : '')).trim();

  if (wkoKlant && wkoProjectNr) {
    uploadToDropbox(pdf, filename, wkoKlant, wkoProjectNr, 'WKO_Rapport');
  } else {
    showDropboxNotification('\u26a0\ufe0f Dropbox: vul klant + projectnummer in bij Offerte tab om automatisch op te slaan', 'error');
  }
}

function updateLusOpties() {
  const diameter = parseInt(document.getElementById('f-diameter').value);
  const sel = document.getElementById('f-luslengte');
  sel.innerHTML = '';
  if (diameter === 32) {
    sel.innerHTML = '<option value="110">110m — €460,00</option><option value="80">80m — €287,50</option><option value="50">50m — €172,50</option>';
  } else {
    sel.innerHTML = '<option value="225">225m — €1.100,00</option><option value="200">200m — €1.190,25</option><option value="185">185m — €977,50</option><option value="175">175m — €948,75</option><option value="165" selected>165m — €920,00</option><option value="152">152m — €862,50</option><option value="138">138m — €805,00</option><option value="127">127m — €632,50</option>';
  }
}

function eur(n) {
  if (isNaN(n) || n === null) n = 0;
  return '€ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function parseEur(s) {
  if (typeof s === 'number') return s;
  return parseFloat(String(s).replace(/[€\s.]/g, '').replace(',', '.')) || 0;
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const tabs = ['offerte', 'klanten', 'opgeslagen', 'pva', 'oplever'];
    t.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'klanten') renderKlanten();
  if (name === 'opgeslagen') renderOffertes();
  if (name === 'offerte') populateKlantDropdown();
  if (name === 'pva') initPvaTab();
  if (name === 'oplever') initOpleverTab();
}

// ============================================================
// KLANT DROPDOWN
// ============================================================
function populateKlantDropdown() {
  const sel = document.getElementById('f-klant');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Selecteer klant --</option><option value="__new__">+ Nieuwe klant</option>';
  getKlanten().forEach(k => {
    const o = document.createElement('option');
    o.value = k.id;
    o.textContent = k.bedrijf;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function onKlantSelect() {
  const v = document.getElementById('f-klant').value;
  if (v === '__new__') { openKlantModal(); document.getElementById('f-klant').value = ''; return; }
  if (!v) return;
  const k = getKlanten().find(x => x.id == v);
  if (k) {
    document.getElementById('f-tav').value = k.contact || '';
    document.getElementById('f-telefoon').value = k.telefoon || '';
  }
}

// ============================================================
// COST DEFINITIONS
// ============================================================
const COST_ITEMS = [
  { key: 'boorkosten', label: 'Boorkosten', detail: '', expandable: true },
  { key: 'lussen', label: 'Prijs Lussen', detail: '' },
  { key: 'grout', label: 'Grout', detail: '', expandable: true },
  { key: 'gewichten', label: 'Gewichten', detail: '' },
  { key: 'verdelerput', label: 'Verdelerput', detail: '' },
  { key: 'aansluiten', label: 'Aansluiten bronnen', detail: '' },
  { key: 'glycol', label: 'Glycol', detail: '' },
  { key: 'graafwerk', label: 'Graafwerk + kraan', detail: '' },
  { key: 'transport', label: 'Transport', detail: '' },
  { key: 'barogel', label: 'Barogel', detail: '', expandable: true },
  { key: 'olo', label: 'OLO melding', detail: '' },
];

let costValues = {};
let costOverrides = {};

// Editable unit parameters — all cost items
let costParams = {
  boorkosten: { prijsPerMeter: 15 },
  lussen: { prijsPerLus: null },  // null = auto from diameter/luslengte table
  grout: { aantalZakken: null, prijsPerZak: 425 },
  gewichten: { aantal: 3, prijsPerStuk: 80 },
  verdelerput: { prijs: 1250 },
  aansluiten: { prijs: 750 },
  glycol: { liters: null, prijsPerLiter: 3.20 },  // null = auto from luslengte/diameter
  graafwerk: { prijs: 250 },
  transport: { prijs: 1000 },
  barogel: { aantalZakken: null, prijsPerZak: 17 },
  ezmud: { prijs: 0 },
  olo: { prijs: 200 },
};

const PARAM_DEFAULTS = JSON.parse(JSON.stringify(costParams));

// Custom articles
let customArtikelen = [];
let customArtikelCounter = 0;

function addCustomArtikel(naam, bedrag) {
  const id = ++customArtikelCounter;
  customArtikelen.push({ id, naam: naam || '', bedrag: bedrag || 0 });
  renderCustomArtikelen();
  updateTotal();
}

function removeCustomArtikel(id) {
  customArtikelen = customArtikelen.filter(a => a.id !== id);
  renderCustomArtikelen();
  updateTotal();
}

function renderCustomArtikelen() {
  const container = document.getElementById('custom-cost-rows');
  container.innerHTML = '';
  customArtikelen.forEach(art => {
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.style.cssText = 'border-left:3px solid #2e7d32;';
    row.innerHTML = `
      <input type="text" value="${art.naam}" placeholder="Omschrijving..." 
             oninput="customArtikelen.find(a=>a.id===${art.id}).naam=this.value" 
             autocomplete="off" autocorrect="off" spellcheck="false"
             style="flex:1; min-width:0; margin-right:8px; font-size:16px; padding:8px;">
      <input type="text" value="${art.bedrag ? eur(art.bedrag) : ''}" placeholder="€ 0,00"
             oninput="customArtikelen.find(a=>a.id===${art.id}).bedrag=parseEur(this.value); updateTotal();" 
             onfocus="this.select()" inputmode="decimal" autocomplete="off"
             style="width:100px; text-align:right; font-size:16px; padding:8px;">
      <span class="auto" onclick="saveToArtikelBib(customArtikelen.find(a=>a.id===${art.id}).naam, customArtikelen.find(a=>a.id===${art.id}).bedrag)" title="Bewaar in bibliotheek" style="color:#61a229; font-size:16px; padding:4px; cursor:pointer;">⭐</span>
      <span class="auto" onclick="removeCustomArtikel(${art.id})" title="Verwijderen" style="color:#c62828; font-size:18px; padding:4px 8px; cursor:pointer;">✕</span>
    `;
    container.appendChild(row);
  });
}

function paramRow(label, inputs) {
  const row = document.createElement('div');
  row.className = 'cost-row';
  row.style.cssText = 'padding-left:20px; background:#f8f9fb; border-left:3px solid #61a229;';
  row.innerHTML = `<span class="label" style="font-size:12px; color:#666;">${label}</span>${inputs}`;
  return row;
}

function buildCostRows() {
  const container = document.getElementById('cost-rows');
  container.innerHTML = '';
  COST_ITEMS.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML = `
      <span class="label">${item.label}<span class="detail" id="det-${item.key}"></span></span>
      <input type="text" id="cost-${item.key}" oninput="onCostEdit('${item.key}')" onfocus="this.select()">
      <span class="auto" id="reset-${item.key}" onclick="resetCost('${item.key}')" title="Herbereken">↻</span>
    `;
    container.appendChild(row);

    // Parameter sub-rows per item
    if (item.key === 'boorkosten') {
      container.appendChild(paramRow('Prijs/meter', `
        <input type="text" id="param-boor-ppm" value="${eur(costParams.boorkosten.prijsPerMeter)}" 
               oninput="onParamEdit('boorkosten')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('boorkosten')" title="Reset">↻</span>`));
    }
    if (item.key === 'lussen') {
      container.appendChild(paramRow('Prijs/lus', `
        <input type="text" id="param-lussen-ppl" placeholder="auto" 
               oninput="onParamEdit('lussen')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('lussen')" title="Reset">↻</span>`));
    }
    if (item.key === 'grout') {
      container.appendChild(paramRow('Zakken × prijs', `
        <input type="text" id="param-grout-zakken" placeholder="auto" 
               oninput="onParamEdit('grout')" onfocus="this.select()" style="width:60px;">
        <span style="font-size:12px; color:#666; margin:0 4px;">×</span>
        <input type="text" id="param-grout-prijs" value="${eur(costParams.grout.prijsPerZak)}" 
               oninput="onParamEdit('grout')" onfocus="this.select()" style="width:80px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">/zak</span>
        <span class="auto" onclick="resetParam('grout')" title="Reset">↻</span>`));
    }
    if (item.key === 'gewichten') {
      container.appendChild(paramRow('Aantal × prijs', `
        <input type="text" id="param-gewichten-aantal" value="${costParams.gewichten.aantal}" 
               oninput="onParamEdit('gewichten')" onfocus="this.select()" style="width:50px;">
        <span style="font-size:12px; color:#666; margin:0 4px;">×</span>
        <input type="text" id="param-gewichten-prijs" value="${eur(costParams.gewichten.prijsPerStuk)}" 
               oninput="onParamEdit('gewichten')" onfocus="this.select()" style="width:80px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">/stuk</span>
        <span class="auto" onclick="resetParam('gewichten')" title="Reset">↻</span>`));
    }
    if (item.key === 'verdelerput') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-verdelerput-prijs" value="${eur(costParams.verdelerput.prijs)}" 
               oninput="onParamEdit('verdelerput')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('verdelerput')" title="Reset">↻</span>`));
    }
    if (item.key === 'aansluiten') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-aansluiten-prijs" value="${eur(costParams.aansluiten.prijs)}" 
               oninput="onParamEdit('aansluiten')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('aansluiten')" title="Reset">↻</span>`));
    }
    if (item.key === 'glycol') {
      container.appendChild(paramRow('Liters × prijs', `
        <input type="text" id="param-glycol-liters" placeholder="auto" 
               oninput="onParamEdit('glycol')" onfocus="this.select()" style="width:60px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">L</span>
        <span style="font-size:12px; color:#666; margin:0 4px;">×</span>
        <input type="text" id="param-glycol-prijs" value="${eur(costParams.glycol.prijsPerLiter)}" 
               oninput="onParamEdit('glycol')" onfocus="this.select()" style="width:80px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">/L</span>
        <span class="auto" onclick="resetParam('glycol')" title="Reset">↻</span>`));
    }
    if (item.key === 'graafwerk') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-graafwerk-prijs" value="${eur(costParams.graafwerk.prijs)}" 
               oninput="onParamEdit('graafwerk')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('graafwerk')" title="Reset">↻</span>`));
    }
    if (item.key === 'transport') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-transport-prijs" value="${eur(costParams.transport.prijs)}" 
               oninput="onParamEdit('transport')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('transport')" title="Reset">↻</span>`));
    }
    if (item.key === 'barogel') {
      container.appendChild(paramRow('Zakken × prijs', `
        <input type="text" id="param-barogel-zakken" placeholder="auto" 
               oninput="onParamEdit('barogel')" onfocus="this.select()" style="width:60px;">
        <span style="font-size:12px; color:#666; margin:0 4px;">×</span>
        <input type="text" id="param-barogel-prijs" value="${eur(costParams.barogel.prijsPerZak)}" 
               oninput="onParamEdit('barogel')" onfocus="this.select()" style="width:80px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">/zak</span>
        <span class="auto" onclick="resetParam('barogel')" title="Reset">↻</span>`));
    }
    if (item.key === 'ezmud') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-ezmud-prijs" value="${eur(costParams.ezmud.prijs)}" 
               oninput="onParamEdit('ezmud')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('ezmud')" title="Reset">↻</span>`));
    }
    if (item.key === 'olo') {
      container.appendChild(paramRow('Prijs', `
        <input type="text" id="param-olo-prijs" value="${eur(costParams.olo.prijs)}" 
               oninput="onParamEdit('olo')" onfocus="this.select()" style="width:90px;">
        <span class="auto" onclick="resetParam('olo')" title="Reset">↻</span>`));
    }
  });
}

function onParamEdit(key) {
  const p = costParams[key];
  switch(key) {
    case 'boorkosten': p.prijsPerMeter = parseEur(document.getElementById('param-boor-ppm').value); break;
    case 'lussen': {
      const v = document.getElementById('param-lussen-ppl').value.trim();
      p.prijsPerLus = v ? parseEur(v) : null;
      break;
    }
    case 'grout': {
      const z = document.getElementById('param-grout-zakken').value.trim();
      p.aantalZakken = z ? parseInt(z) : null;
      p.prijsPerZak = parseEur(document.getElementById('param-grout-prijs').value);
      break;
    }
    case 'gewichten':
      p.aantal = parseInt(document.getElementById('param-gewichten-aantal').value) || 0;
      p.prijsPerStuk = parseEur(document.getElementById('param-gewichten-prijs').value);
      break;
    case 'verdelerput': p.prijs = parseEur(document.getElementById('param-verdelerput-prijs').value); break;
    case 'aansluiten': p.prijs = parseEur(document.getElementById('param-aansluiten-prijs').value); break;
    case 'glycol': {
      const l = document.getElementById('param-glycol-liters').value.trim();
      p.liters = l ? parseFloat(l.replace(',', '.')) : null;
      p.prijsPerLiter = parseEur(document.getElementById('param-glycol-prijs').value);
      break;
    }
    case 'graafwerk': p.prijs = parseEur(document.getElementById('param-graafwerk-prijs').value); break;
    case 'transport': p.prijs = parseEur(document.getElementById('param-transport-prijs').value); break;
    case 'barogel': {
      const z = document.getElementById('param-barogel-zakken').value.trim();
      p.aantalZakken = z ? parseInt(z) : null;
      p.prijsPerZak = parseEur(document.getElementById('param-barogel-prijs').value);
      break;
    }
    case 'ezmud': p.prijs = parseEur(document.getElementById('param-ezmud-prijs').value); break;
    case 'olo': p.prijs = parseEur(document.getElementById('param-olo-prijs').value); break;
  }
  delete costOverrides[key];
  calc();
}

function resetParam(key) {
  costParams[key] = JSON.parse(JSON.stringify(PARAM_DEFAULTS[key]));
  // Reset the UI fields
  const fieldMap = {
    boorkosten: () => { document.getElementById('param-boor-ppm').value = eur(PARAM_DEFAULTS.boorkosten.prijsPerMeter); },
    lussen: () => { document.getElementById('param-lussen-ppl').value = ''; document.getElementById('param-lussen-ppl').placeholder = 'auto'; },
    grout: () => { document.getElementById('param-grout-zakken').value = ''; document.getElementById('param-grout-zakken').placeholder = 'auto'; document.getElementById('param-grout-prijs').value = eur(PARAM_DEFAULTS.grout.prijsPerZak); },
    gewichten: () => { document.getElementById('param-gewichten-aantal').value = PARAM_DEFAULTS.gewichten.aantal; document.getElementById('param-gewichten-prijs').value = eur(PARAM_DEFAULTS.gewichten.prijsPerStuk); },
    verdelerput: () => { document.getElementById('param-verdelerput-prijs').value = eur(PARAM_DEFAULTS.verdelerput.prijs); },
    aansluiten: () => { document.getElementById('param-aansluiten-prijs').value = eur(PARAM_DEFAULTS.aansluiten.prijs); },
    glycol: () => { document.getElementById('param-glycol-liters').value = ''; document.getElementById('param-glycol-liters').placeholder = 'auto'; document.getElementById('param-glycol-prijs').value = eur(PARAM_DEFAULTS.glycol.prijsPerLiter); },
    graafwerk: () => { document.getElementById('param-graafwerk-prijs').value = eur(PARAM_DEFAULTS.graafwerk.prijs); },
    transport: () => { document.getElementById('param-transport-prijs').value = eur(PARAM_DEFAULTS.transport.prijs); },
    barogel: () => { document.getElementById('param-barogel-zakken').value = ''; document.getElementById('param-barogel-zakken').placeholder = 'auto'; document.getElementById('param-barogel-prijs').value = eur(PARAM_DEFAULTS.barogel.prijsPerZak); },
    ezmud: () => { document.getElementById('param-ezmud-prijs').value = eur(PARAM_DEFAULTS.ezmud.prijs); },
    olo: () => { document.getElementById('param-olo-prijs').value = eur(PARAM_DEFAULTS.olo.prijs); },
  };
  if (fieldMap[key]) fieldMap[key]();
  delete costOverrides[key];
  calc();
}

function onCostEdit(key) {
  costOverrides[key] = true;
  updateTotal();
}

function resetCost(key) {
  delete costOverrides[key];
  calc();
}

// ============================================================
// CALCULATIONS
// ============================================================
function calc() {
  const vermogen = parseFloat(document.getElementById('f-vermogen').value) || 0;
  const factor = parseFloat(document.getElementById('f-factor').value) || 0;
  const bodemvermogen = vermogen * factor;
  document.getElementById('f-bodemvermogen').value = bodemvermogen.toFixed(2);

  const boringen = parseInt(document.getElementById('f-boringen').value) || 1;
  const meters = parseFloat(document.getElementById('f-meters').value) || 0;
  const mpb = boringen > 0 ? meters / boringen : 0;
  document.getElementById('f-mpb').value = mpb.toFixed(1);

  const diameter = parseInt(document.getElementById('f-diameter').value);
  const verdelerput = document.getElementById('f-verdelerput').checked;

  // --- Boorkosten ---
  const boorPPM = costParams.boorkosten.prijsPerMeter;
  if (!costOverrides['boorkosten']) setCost('boorkosten', meters * boorPPM);
  setDetail('boorkosten', `${meters}m × ${eur(boorPPM)}/m`);

  // --- Lussen ---
  if (!costOverrides['lussen']) {
    const lusLengte = parseInt(document.getElementById('f-luslengte').value);
    const lusOpties = {
      32: { 50: 172.50, 80: 287.50, 110: 460 },
      40: { 127: 632.50, 138: 805, 152: 862.50, 165: 920, 175: 948.75, 185: 977.50, 200: 1190.25, 225: 1100 }
    };
    const autoPrijs = lusOpties[diameter]?.[lusLengte] || 920;
    const prijsPerLus = costParams.lussen.prijsPerLus !== null ? costParams.lussen.prijsPerLus : autoPrijs;
    const lussenPrijs = prijsPerLus * boringen;
    setCost('lussen', lussenPrijs);
    setDetail('lussen', `${boringen} lus${boringen > 1 ? 'sen' : ''} × ${eur(prijsPerLus)}`);
    if (costParams.lussen.prijsPerLus === null) {
      const el = document.getElementById('param-lussen-ppl');
      if (el && el !== document.activeElement) el.placeholder = eur(autoPrijs);
    }
  }

  // --- Grout ---
  if (!costOverrides['grout']) {
    // Lookup table: luslengte → grout zakken per boring
    const groutPerLus = { 50:1, 80:1, 110:2, 127:2, 138:2, 152:2, 165:3, 175:3, 185:3, 200:4, 225:4 };
    const lusLengteGrout = parseInt(document.getElementById('f-luslengte').value);
    const autoZakken = (groutPerLus[lusLengteGrout] || Math.ceil(mpb / 28)) * boringen;
    const groutZakken = costParams.grout.aantalZakken !== null ? costParams.grout.aantalZakken : autoZakken;
    const groutPrijs = costParams.grout.prijsPerZak;
    const groutTotaal = groutZakken * groutPrijs;
    setCost('grout', groutTotaal);
    const autoLabel = costParams.grout.aantalZakken !== null ? '' : ' (auto)';
    setDetail('grout', `${groutZakken} zakken${autoLabel} × ${eur(groutPrijs)}`);
    // Update param fields to show calculated values
    if (costParams.grout.aantalZakken === null) {
      const el = document.getElementById('param-grout-zakken');
      if (el && el !== document.activeElement) el.placeholder = autoZakken;
    }
  }

  // --- Gewichten ---
  if (!costOverrides['gewichten']) {
    const gw = costParams.gewichten;
    setCost('gewichten', gw.aantal * gw.prijsPerStuk);
    setDetail('gewichten', `${gw.aantal} × ${eur(gw.prijsPerStuk)}`);
  }

  // --- Verdelerput ---
  if (!costOverrides['verdelerput']) {
    setCost('verdelerput', verdelerput ? costParams.verdelerput.prijs : 0);
    setDetail('verdelerput', verdelerput ? eur(costParams.verdelerput.prijs) : 'Nee');
  }

  // --- Aansluiten ---
  if (!costOverrides['aansluiten']) setCost('aansluiten', costParams.aansluiten.prijs);

  // --- Glycol ---
  if (!costOverrides['glycol']) {
    // Binnendiameter lus in meters (32mm buis → 26mm binnen, 40mm buis → 32.6mm binnen)
    const diam_m = diameter === 32 ? 0.026 : 0.0326;
    const lusLengteM = parseInt(document.getElementById('f-luslengte').value) || (mpb * 2);
    const totaleLusLengte = lusLengteM * 2 * boringen;  // ×2: lus gaat naar beneden én weer omhoog
    const inhoudL = Math.PI * Math.pow(diam_m / 2, 2) * totaleLusLengte * 1000;
    const autoGlycolL = Math.ceil(inhoudL * 0.30);
    const glycolL = costParams.glycol.liters !== null ? costParams.glycol.liters : autoGlycolL;
    const glycolPrijs = glycolL * costParams.glycol.prijsPerLiter;
    setCost('glycol', glycolPrijs);
    const autoLabel = costParams.glycol.liters !== null ? '' : ' (auto)';
    setDetail('glycol', `${inhoudL.toFixed(0)}L inhoud → ${glycolL}L glycol${autoLabel} × ${eur(costParams.glycol.prijsPerLiter)}/L`);
    if (costParams.glycol.liters === null) {
      const el = document.getElementById('param-glycol-liters');
      if (el && el !== document.activeElement) el.placeholder = autoGlycolL;
    }
  }

  // --- Graafwerk ---
  if (!costOverrides['graafwerk']) setCost('graafwerk', costParams.graafwerk.prijs);

  // --- Transport ---
  if (!costOverrides['transport']) setCost('transport', costParams.transport.prijs);

  // --- Barogel ---
  if (!costOverrides['barogel']) {
    // Lookup table: luslengte → barogel zakken per boring
    const barogelPerLus = { 50:2, 80:3, 110:4, 127:4, 138:4, 152:5, 165:7, 175:8, 185:8, 200:8, 225:10 };
    const lusLengteBarogel = parseInt(document.getElementById('f-luslengte').value);
    const autoZakken = (barogelPerLus[lusLengteBarogel] || Math.ceil(mpb / 8.65)) * boringen;
    const barogelZakken = costParams.barogel.aantalZakken !== null ? costParams.barogel.aantalZakken : autoZakken;
    const barogelPrijs = costParams.barogel.prijsPerZak;
    setCost('barogel', barogelZakken * barogelPrijs);
    const autoLabel = costParams.barogel.aantalZakken !== null ? '' : ' (auto)';
    setDetail('barogel', `${barogelZakken} zakken${autoLabel} × ${eur(barogelPrijs)}`);
    if (costParams.barogel.aantalZakken === null) {
      const el = document.getElementById('param-barogel-zakken');
      if (el && el !== document.activeElement) el.placeholder = autoZakken;
    }
  }

  // --- EZ Mud ---
  if (!costOverrides['ezmud']) setCost('ezmud', costParams.ezmud.prijs);

  // --- OLO ---
  if (!costOverrides['olo']) setCost('olo', costParams.olo.prijs);

  updateTotal();
}

function setCost(key, val) {
  const el = document.getElementById('cost-' + key);
  if (el) el.value = eur(val);
  costValues[key] = val;
}

function setDetail(key, text) {
  const el = document.getElementById('det-' + key);
  if (el) el.textContent = ' (' + text + ')';
}

function getCostVal(key) {
  if (costOverrides[key]) {
    return parseEur(document.getElementById('cost-' + key).value);
  }
  return costValues[key] || 0;
}

function updateTotal() {
  let total = 0;
  COST_ITEMS.forEach(item => { total += getCostVal(item.key); });
  customArtikelen.forEach(a => { total += (a.bedrag || 0); });
  document.getElementById('cost-total').textContent = eur(total);
}

// ============================================================
// KLANTEN CRUD
// ============================================================
function renderKlanten() {
  const tbody = document.getElementById('klanten-tbody');
  const klanten = getKlanten();
  tbody.innerHTML = '';
  klanten.forEach(k => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${k.bedrijf}</strong></td>
      <td>${k.contact || '-'}</td>
      <td>${k.telefoon || '-'}</td>
      <td>${k.adres || '-'}</td>
      <td>${k.cert ? '<span class="badge badge-blue">' + k.cert + '</span>' : '-'}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="editKlant(${k.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteKlant(${k.id})">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function openKlantModal(klant) {
  document.getElementById('klant-modal').classList.add('active');
  document.getElementById('klant-modal-title').textContent = klant ? 'Klant Bewerken' : 'Klant Toevoegen';
  document.getElementById('km-id').value = klant ? klant.id : '';
  document.getElementById('km-bedrijf').value = klant ? klant.bedrijf : '';
  document.getElementById('km-contact').value = klant ? klant.contact : '';
  document.getElementById('km-telefoon').value = klant ? klant.telefoon : '';
  document.getElementById('km-adres').value = klant ? klant.adres : '';
  document.getElementById('km-cert').value = klant ? klant.cert : '';
}

function closeKlantModal() { document.getElementById('klant-modal').classList.remove('active'); }

function saveKlant() {
  const klanten = getKlanten();
  const id = document.getElementById('km-id').value;
  const data = {
    bedrijf: document.getElementById('km-bedrijf').value.trim(),
    contact: document.getElementById('km-contact').value.trim(),
    telefoon: document.getElementById('km-telefoon').value.trim(),
    adres: document.getElementById('km-adres').value.trim(),
    cert: document.getElementById('km-cert').value.trim()
  };
  if (!data.bedrijf) { alert('Bedrijfsnaam is verplicht'); return; }
  if (id) {
    const idx = klanten.findIndex(k => k.id == id);
    if (idx >= 0) Object.assign(klanten[idx], data);
  } else {
    data.id = Date.now();
    klanten.push(data);
  }
  saveKlanten(klanten);
  closeKlantModal();
  renderKlanten();
  populateKlantDropdown();
}

function editKlant(id) {
  const k = getKlanten().find(x => x.id === id);
  if (k) openKlantModal(k);
}

function deleteKlant(id) {
  if (!confirm('Weet je zeker dat je deze klant wilt verwijderen?')) return;
  const klanten = getKlanten().filter(k => k.id !== id);
  saveKlanten(klanten);
  renderKlanten();
  populateKlantDropdown();
}

// ============================================================
// OFFERTES
// ============================================================
function gatherOfferteData() {
  const klantId = document.getElementById('f-klant').value;
  const klant = klantId && klantId !== '__new__' ? getKlanten().find(k => k.id == klantId) : null;
  const costs = {};
  COST_ITEMS.forEach(item => { costs[item.key] = getCostVal(item.key); });
  let total = 0;
  Object.values(costs).forEach(v => total += v);
  customArtikelen.forEach(a => { total += (a.bedrag || 0); });

  return {
    klantId,
    klantNaam: klant ? klant.bedrijf : document.getElementById('f-klant').selectedOptions[0]?.textContent || '',
    klantAdres: klant ? klant.adres : '',
    tav: document.getElementById('f-tav').value,
    kenmerk: document.getElementById('f-kenmerk').value,
    datum: document.getElementById('f-datum').value,
    betreft: document.getElementById('f-betreft').value,
    vermogen: parseFloat(document.getElementById('f-vermogen').value) || 0,
    factor: parseFloat(document.getElementById('f-factor').value) || 0,
    bodemvermogen: parseFloat(document.getElementById('f-bodemvermogen').value) || 0,
    pompen: parseInt(document.getElementById('f-pompen').value) || 1,
    boringen: parseInt(document.getElementById('f-boringen').value) || 1,
    meters: parseFloat(document.getElementById('f-meters').value) || 0,
    mpb: parseFloat(document.getElementById('f-mpb').value) || 0,
    verdelerput: document.getElementById('f-verdelerput').checked,
    locatie: document.getElementById('f-locatie').value,
    diameter: document.getElementById('f-diameter').value,
    luslengte: document.getElementById('f-luslengte').value,
    telefoon: document.getElementById('f-telefoon').value,
    bevoegd: document.getElementById('f-bevoegd').value,
    costs,
    customArtikelen: customArtikelen.filter(a => a.naam).map(a => ({ naam: a.naam, bedrag: a.bedrag || 0 })),
    total
  };
}

let editingOfferteId = null;

function saveOfferte() {
  const data = gatherOfferteData();
  if (!data.kenmerk) { alert('Vul een kenmerk in'); return; }
  
  // Save cost parameters too
  data.costParams = JSON.parse(JSON.stringify(costParams));
  
  const offertes = getOffertes();
  
  if (editingOfferteId) {
    // Update existing
    const idx = offertes.findIndex(o => o.id === editingOfferteId);
    if (idx >= 0) {
      data.id = editingOfferteId;
      data.savedAt = offertes[idx].savedAt;
      data.updatedAt = new Date().toISOString();
      offertes[idx] = data;
      saveOffertes(offertes);
      editingOfferteId = null;
      alert('Offerte bijgewerkt!');
      return;
    }
  }
  
  data.id = Date.now();
  data.savedAt = new Date().toISOString();
  offertes.unshift(data);
  saveOffertes(offertes);
  editingOfferteId = null;
  alert('Offerte opgeslagen!');
}

function renderOffertes() {
  const list = document.getElementById('offertes-list');
  const offertes = getOffertes();
  const zoek = (document.getElementById('offerte-zoek')?.value || '').toLowerCase();
  
  const filtered = offertes.filter(o => {
    if (!zoek) return true;
    return (o.kenmerk || '').toLowerCase().includes(zoek) ||
           (o.klantNaam || '').toLowerCase().includes(zoek) ||
           (o.locatie || '').toLowerCase().includes(zoek) ||
           (o.betreft || '').toLowerCase().includes(zoek);
  });
  
  if (!filtered.length) {
    list.innerHTML = zoek 
      ? '<div class="empty-state"><p>Geen offertes gevonden</p></div>'
      : '<div class="empty-state"><p>Nog geen opgeslagen offertes</p></div>';
    return;
  }
  list.innerHTML = '';
  filtered.forEach((o) => {
    const idx = offertes.indexOf(o);
    const card = document.createElement('div');
    card.className = 'offerte-card';
    const d = o.datum || o.savedAt?.substring(0, 10) || '';
    const updated = o.updatedAt ? ' · ✏️ bewerkt' : '';
    card.innerHTML = `
      <div class="offerte-info">
        <h3>${o.kenmerk || 'Geen kenmerk'} — ${o.klantNaam || 'Onbekend'}</h3>
        <p>${d} · ${o.betreft || ''} · ${o.meters || 0}m${updated}</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="offerte-amount">${eur(o.total)}</span>
        <div class="offerte-actions">
          <button class="btn btn-primary btn-sm" onclick="loadOfferte(${idx})" title="Openen & bewerken">📂 Open</button>
          <button class="btn btn-sm" onclick="duplicateOfferte(${idx})" title="Dupliceren" style="background:#f5f7fa; border:1px solid #d0d5dd;">📋</button>
          <button class="btn btn-success btn-sm" onclick="pdfFromSaved(${idx})" title="PDF genereren">📄 PDF</button>
          <button class="btn btn-danger btn-sm" onclick="deleteOfferte(${idx})" title="Verwijderen">🗑️</button>
        </div>
      </div>`;
    list.appendChild(card);
  });
}

function loadOfferte(idx) {
  const o = getOffertes()[idx];
  if (!o) return;
  
  editingOfferteId = o.id;
  
  document.getElementById('f-klant').value = o.klantId || '';
  document.getElementById('f-tav').value = o.tav || '';
  document.getElementById('f-kenmerk').value = o.kenmerk || '';
  document.getElementById('f-datum').value = o.datum || '';
  document.getElementById('f-betreft').value = o.betreft || '';
  document.getElementById('f-vermogen').value = o.vermogen || '';
  document.getElementById('f-factor').value = o.factor || '';
  document.getElementById('f-pompen').value = o.pompen || 1;
  document.getElementById('f-boringen').value = o.boringen || 1;
  document.getElementById('f-meters').value = o.meters || '';
  document.getElementById('f-diameter').value = o.diameter || '40';
  updateLusOpties();
  document.getElementById('f-luslengte').value = o.luslengte || '165';
  document.getElementById('f-verdelerput').checked = !!o.verdelerput;
  document.getElementById('f-locatie').value = o.locatie || '';
  document.getElementById('f-telefoon').value = o.telefoon || '';
  document.getElementById('f-bevoegd').value = o.bevoegd || '';

  // Restore cost parameters if saved
  if (o.costParams) {
    costParams = JSON.parse(JSON.stringify(o.costParams));
    // Update param UI fields
    const pe = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    pe('param-boor-ppm', eur(costParams.boorkosten.prijsPerMeter));
    pe('param-grout-zakken', costParams.grout.aantalZakken || '');
    pe('param-grout-prijs', eur(costParams.grout.prijsPerZak));
    pe('param-gewichten-aantal', costParams.gewichten.aantal);
    pe('param-gewichten-prijs', eur(costParams.gewichten.prijsPerStuk));
    pe('param-verdelerput-prijs', eur(costParams.verdelerput.prijs));
    pe('param-aansluiten-prijs', eur(costParams.aansluiten.prijs));
    pe('param-glycol-liters', costParams.glycol.liters || '');
    pe('param-glycol-prijs', eur(costParams.glycol.prijsPerLiter));
    pe('param-graafwerk-prijs', eur(costParams.graafwerk.prijs));
    pe('param-transport-prijs', eur(costParams.transport?.prijs || 1000));
    pe('param-barogel-zakken', costParams.barogel.aantalZakken || '');
    pe('param-barogel-prijs', eur(costParams.barogel.prijsPerZak));
    pe('param-olo-prijs', eur(costParams.olo?.prijs || 200));
  }

  // Restore custom artikelen
  customArtikelen = [];
  customArtikelCounter = 0;
  if (o.customArtikelen && o.customArtikelen.length) {
    o.customArtikelen.forEach(art => {
      addCustomArtikel(art.naam, art.bedrag);
    });
  } else {
    renderCustomArtikelen();
  }

  // Set cost overrides
  costOverrides = {};
  if (o.costs) {
    COST_ITEMS.forEach(item => {
      costOverrides[item.key] = true;
    });
    calc();
    COST_ITEMS.forEach(item => {
      if (o.costs[item.key] !== undefined) {
        costOverrides[item.key] = true;
        document.getElementById('cost-' + item.key).value = eur(o.costs[item.key]);
      }
    });
    updateTotal();
  } else {
    calc();
  }
  switchTab('offerte');
}

function deleteOfferte(idx) {
  if (!confirm('Offerte verwijderen?')) return;
  const offertes = getOffertes();
  offertes.splice(idx, 1);
  saveOffertes(offertes);
  renderOffertes();
}

function pdfFromSaved(idx) {
  loadOfferte(idx);
  setTimeout(() => generatePDF(), 200);
}

function duplicateOfferte(idx) {
  const offertes = getOffertes();
  const o = JSON.parse(JSON.stringify(offertes[idx]));
  o.id = Date.now();
  o.kenmerk = (o.kenmerk || '') + ' (kopie)';
  o.savedAt = new Date().toISOString();
  delete o.updatedAt;
  offertes.unshift(o);
  saveOffertes(offertes);
  renderOffertes();
}

// ============================================================
// ARTIKELEN BIBLIOTHEEK
// ============================================================
const ARTIKEL_BIB_KEY = 'gr_artikel_bibliotheek';

function getArtikelBib() { return JSON.parse(localStorage.getItem(ARTIKEL_BIB_KEY) || '[]'); }
function saveArtikelBib(arr) { localStorage.setItem(ARTIKEL_BIB_KEY, JSON.stringify(arr)); }

function populateArtikelBibSelect() {
  const sel = document.getElementById('artikel-bib-select');
  if (!sel) return;
  const bib = getArtikelBib();
  sel.innerHTML = '<option value="">📚 Uit bibliotheek...</option>';
  bib.forEach((item, i) => {
    sel.innerHTML += `<option value="${i}">${item.naam} (${eur(item.bedrag)})</option>`;
  });
}

function addFromBibliotheek(sel) {
  const idx = parseInt(sel.value);
  if (isNaN(idx)) return;
  const bib = getArtikelBib();
  const item = bib[idx];
  if (item) {
    addCustomArtikel(item.naam, item.bedrag);
    updateTotal();
  }
  sel.value = '';
}

function saveToArtikelBib(naam, bedrag) {
  if (!naam) return;
  const bib = getArtikelBib();
  // Check if already exists
  const existing = bib.findIndex(b => b.naam.toLowerCase() === naam.toLowerCase());
  if (existing >= 0) {
    bib[existing].bedrag = bedrag;
  } else {
    bib.push({ naam, bedrag: bedrag || 0 });
  }
  saveArtikelBib(bib);
  populateArtikelBibSelect();
}

function addToBibliotheek() {
  const naam = document.getElementById('bib-new-naam').value.trim();
  const bedrag = parseEur(document.getElementById('bib-new-bedrag').value);
  if (!naam) { alert('Vul een naam in'); return; }
  saveToArtikelBib(naam, bedrag);
  document.getElementById('bib-new-naam').value = '';
  document.getElementById('bib-new-bedrag').value = '';
  renderArtikelBib();
}

function removeFromBibliotheek(idx) {
  const bib = getArtikelBib();
  bib.splice(idx, 1);
  saveArtikelBib(bib);
  populateArtikelBibSelect();
  renderArtikelBib();
}

function renderArtikelBib() {
  const list = document.getElementById('bib-list');
  if (!list) return;
  const bib = getArtikelBib();
  if (!bib.length) {
    list.innerHTML = '<p style="color:#999; font-size:13px; text-align:center; padding:20px;">Nog geen artikelen bewaard</p>';
    return;
  }
  list.innerHTML = '';
  bib.forEach((item, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f0f2f5;';
    row.innerHTML = `
      <span style="font-size:14px; flex:1;">${item.naam}</span>
      <span style="font-size:14px; font-weight:600; margin-right:12px;">${eur(item.bedrag)}</span>
      <span onclick="removeFromBibliotheek(${i})" style="color:#c62828; cursor:pointer; font-size:14px;" title="Verwijderen">✕</span>
    `;
    list.appendChild(row);
  });
}

function openArtikelBibModal() {
  document.getElementById('artikel-bib-modal').classList.add('active');
  renderArtikelBib();
}

function closeArtikelBibModal() {
  document.getElementById('artikel-bib-modal').classList.remove('active');
}

// ============================================================
// PDF GENERATION
// ============================================================
const HEADER_DRILLING = 'data:image/jpeg;base64,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';
const HEADER_CLOSEUP = 'data:image/jpeg;base64,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';

const LOGO_123BE = 'data:image/png;base64,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';

function generatePDF() {
  const d = gatherOfferteData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, M = 20;
  const pw = W - 2 * M;
  
  // Kleuren
  const DARK_BLUE = [26, 35, 50];
  const MEDIUM_BLUE = [30, 58, 95];
  const ORANGE = [232, 115, 12];
  const LIGHT_GRAY = [245, 247, 250];

  function addFooter(pageNum) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerText = '123Bodemenergie is onderdeel van Ground Research. Vrijheidweg 45. 1521 RP Wormerveer 088-1262910. KvK 37089931. NL48RABO0346687667';
    doc.text(footerText, W/2, 290, { align: 'center' });
  }

  function addHeader(title, withLogo = false) {
    var bannerH = 50;
    // Photo banner background
    try {
      var headerImg = withLogo ? HEADER_DRILLING : HEADER_CLOSEUP;
      doc.addImage(headerImg, 'JPEG', 0, 0, W, bannerH);
      // Lighter overlay for better photo visibility
      doc.setFillColor(26, 35, 50);
      doc.setGState(new doc.GState({opacity: 0.45}));
      doc.rect(0, 0, W, bannerH, 'F');
      doc.setGState(new doc.GState({opacity: 1}));
    } catch(e) {
      // Fallback: solid color banner
      doc.setFillColor(...DARK_BLUE);
      doc.rect(0, 0, W, bannerH, 'F');
    }
    
    // Orange accent strip at bottom of banner
    doc.setFillColor(...ORANGE);
    doc.rect(0, bannerH, W, 2.5, 'F');
    
    if (withLogo) {
      // Logo groter en verticaal gecentreerd
      try { doc.addImage(LOGO_123BE, 'PNG', M, 10, 55, 18); } catch(e) {}
      // Title rechts van logo, verticaal gecentreerd met logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(title, M + 62, 24);
      // Subtitle onder titel
      doc.setFontSize(10);
      doc.setTextColor(230, 230, 230);
      doc.text('Ground Research BV  |  123Bodemenergie', M + 62, 33);
    } else {
      // Zonder logo: titel prominent gecentreerd
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text(title, M, 28);
      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(230, 230, 230);
      doc.text('Ground Research BV  |  123Bodemenergie', M, 38);
    }
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    return bannerH + 10; // Return starting Y position for content
  }

  // ========== PAGINA 1: AANBIEDINGSBRIEF ==========
  let y = addHeader('AANBIEDINGSBRIEF', true);
  
  // Klantgegevens links, kenmerk/datum rechts
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Klantgegevens links
  let leftY = y;
  if (d.klantNaam) { doc.text(d.klantNaam, M, leftY); leftY += 5; }
  if (d.tav) { doc.text('T.a.v. ' + d.tav, M, leftY); leftY += 5; }
  if (d.klantAdres) { doc.text(d.klantAdres, M, leftY); leftY += 5; }
  
  // Kenmerk/datum rechts
  doc.setFontSize(9);
  doc.text('Ons kenmerk: ' + (d.kenmerk || '-'), W - M, y, { align: 'right' });
  doc.text('Datum: ' + formatDate(d.datum), W - M, y + 5, { align: 'right' });
  
  y = Math.max(leftY, y + 15);
  
  // Betreft
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Betreft: ' + d.betreft, M, y);
  y += 12;
  
  // Aanhef
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Geachte heer/mevrouw,', M, y);
  y += 10;
  
  // Inleidende tekst
  const introText = 'Conform uw verzoek/aanvraag ontvangt u hierbij ons voorstel betreffende het plaatsen van een verticaal bodemwarmtewisselaar systeem voor een water/water warmtepomp.';
  const lines = doc.splitTextToSize(introText, pw);
  doc.text(lines, M, y);
  y += lines.length * 5 + 15;
  
  // Specificaties in een nette tabel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SPECIFICATIES', M, y);
  y += 8;
  
  // Tabel header
  doc.setFillColor(...MEDIUM_BLUE);
  doc.rect(M, y - 4, pw, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OMSCHRIJVING', M + 3, y);
  doc.text('WAARDE', W - M - 3, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 8;
  
  // Specificatie rijen
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const specs = [
    ['Locatie bodemenergiesysteem', d.locatie || '-'],
    ['Maximaal vermogen warmtepomp', `${d.vermogen} KW`],
    ['Bodemzijdig vermogen', `${d.bodemvermogen.toFixed(2)} KW`],
    ['Totaal boormeters', `${d.meters} m`],
    ['Meters per boring', `${d.mpb.toFixed(1)} m`],
    ['Aantal boringen', `${d.boringen}`],
    ['Diameter bodemwarmtewisselaar', `${d.diameter}mm`],
    ['Aantal pompen', `${d.pompen}`]
  ];
  
  let specEven = false;
  specs.forEach(spec => {
    if (specEven) { 
      doc.setFillColor(...LIGHT_GRAY); 
      doc.rect(M, y - 3.5, pw, 6, 'F'); 
    }
    doc.text(spec[0], M + 3, y);
    doc.text(spec[1], W - M - 3, y, { align: 'right' });
    y += 6;
    specEven = !specEven;
  });
  
  y += 15;
  
  // Totaalbedrag (groot en oranje accent)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ORANGE);
  const bedragTekst = `Het totaalbedrag van deze offerte bedraagt: ${eur(d.total)} exclusief BTW`;
  doc.text(bedragTekst, M, y);
  doc.setTextColor(0, 0, 0);
  y += 20;
  
  // Check of er genoeg ruimte is voor ondertekening + akkoordblok (minimaal 65mm nodig)
  const H = doc.internal.pageSize.getHeight();
  if (y + 65 > H - 20) {
    addFooter(doc.internal.getCurrentPageInfo().pageNumber);
    doc.addPage();
    y = addHeader('');
  }
  
  // Startpunt voor ondertekening + akkoordblok
  const signY = y;
  
  // Ondertekening links
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Met vriendelijke groet,', M, signY);
  doc.text('123bodemenergie / P. Groot, bedrijfsleider', M, signY + 8);
  doc.text('Tel.: 088-1262910 / Mob: 06 47 326 322', M, signY + 14);
  
  // Akkoordblok rechts — uitgelijnd met ondertekening
  const akkoordW = 85;
  const akkoordH = 50;
  const akkoordX = W - M - akkoordW;
  const akkoordY = signY - 4;
  doc.setDrawColor(...MEDIUM_BLUE);
  doc.setLineWidth(0.8);
  doc.rect(akkoordX, akkoordY, akkoordW, akkoordH);
  
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(10);
  doc.text('Akkoord voor uitvoering:', akkoordX + 4, akkoordY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(d.klantNaam || '', akkoordX + 4, akkoordY + 16);
  
  // Handtekening lijn
  doc.setLineWidth(0.3);
  doc.line(akkoordX + 4, akkoordY + 26, akkoordX + akkoordW - 4, akkoordY + 26);
  doc.text('Handtekening', akkoordX + 4, akkoordY + 31);
  addSignature(doc, akkoordX + 4, akkoordY + 18, 30, 10);
  
  // Datum lijn
  doc.line(akkoordX + 4, akkoordY + 40, akkoordX + akkoordW - 4, akkoordY + 40);
  doc.text('Datum', akkoordX + 4, akkoordY + 45);
  
  y = akkoordY + akkoordH + 5;
  
  addFooter(1);

  // ========== PAGINA 2: KOSTENSPECIFICATIE ==========
  doc.addPage();
  y = addHeader('KOSTENSPECIFICATIE');
  
  // Tabel header
  doc.setFillColor(...MEDIUM_BLUE);
  doc.rect(M, y, pw, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OMSCHRIJVING', M + 4, y + 7);
  doc.text('BEDRAG', W - M - 4, y + 7, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 12;
  
  // Kostentabel met zebra-stripes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const costLabels = {
    boorkosten: 'Boorkosten', 
    lussen: 'Prijs Lussen', 
    grout: 'Grout',
    gewichten: 'Gewichten', 
    verdelerput: 'Verdelerput', 
    aansluiten: 'Aansluiten bronnen',
    glycol: 'Glycol', 
    graafwerk: 'Graafwerk + kraan', 
    transport: 'Transport',
    barogel: 'Barogel', 
    ezmud: 'EZ Mud', 
    olo: 'OLO melding'
  };
  
  let even = false;
  COST_ITEMS.forEach(item => {
    if (even) { 
      doc.setFillColor(...LIGHT_GRAY); 
      doc.rect(M, y - 3, pw, 8, 'F'); 
    }
    doc.text(costLabels[item.key] || item.key, M + 4, y + 2);
    doc.text(eur(d.costs[item.key] || 0), W - M - 4, y + 2, { align: 'right' });
    y += 8;
    even = !even;
  });
  
  // Custom artikelen
  if (d.customArtikelen && d.customArtikelen.length) {
    d.customArtikelen.forEach(art => {
      if (even) { 
        doc.setFillColor(...LIGHT_GRAY); 
        doc.rect(M, y - 3, pw, 8, 'F'); 
      }
      doc.text(art.naam || 'Extra artikel', M + 4, y + 2);
      doc.text(eur(art.bedrag), W - M - 4, y + 2, { align: 'right' });
      y += 8;
      even = !even;
    });
  }
  
  // Totaalregel
  y += 5;
  doc.setDrawColor(...MEDIUM_BLUE);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(M, y - 5, pw, 10, 'F');
  doc.text('TOTAAL EXCL. BTW', M + 4, y + 2);
  doc.setTextColor(...ORANGE);
  doc.text(eur(d.total), W - M - 4, y + 2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  // "Wat krijgt u voor deze kosten:" sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Wat krijgt u voor deze kosten:', M, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const watKrijgtU = [
    'Plaatsen warmtewisselaar tot afgesproken diepte',
    'Versleping naar binnen tot 20cm boven vloerpeil max 20m',
    'Oplevering met puntstuk',
    'Lussen zijn gevuld met water/glycol mix 70/30%',
    'Lussen zijn afgeperst',
    'Opleverrapport met garantie bewijs',
    'Tekening met XY coördinaten'
  ];
  
  watKrijgtU.forEach(item => {
    doc.text('•  ' + item, M + 4, y);
    y += 6;
  });
  
  addFooter(2);

  // ========== PAGINA 3: UITGANGSPUNTEN ==========
  doc.addPage();
  y = addHeader('UITGANGSPUNTEN & VOORWAARDEN');
  
  // Uitgangspunten sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Uitgangspunten aangeleverd door de klant', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const uitgangspunten = [
    `Aantal warmtepompen: ${d.pompen}`,
    `Vermogen: ${d.vermogen} KW`,
    `Bodemzijdig vermogen: ${d.bodemvermogen.toFixed(2)} KW`,
    `Totaal boormeters: ${d.meters} m in ${d.boringen} boring(en)`,
    `Bevoegd gezag: ${d.bevoegd}`
  ];
  
  uitgangspunten.forEach(item => {
    doc.text('•  ' + item, M + 4, y);
    y += 6;
  });
  y += 10;
  
  // Opdrachtgever verzorgt sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Opdrachtgever verzorgt de volgende punten:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const opdrachtgeverVerzorgt = [
    'Toegang tot de locatie',
    'Wateraansluiting met minimaal 3M³ per uur',
    'Voldoende werkruimte voor machines en bussen en eventuele vergunningen hiervoor',
    'Doorvoeren of gaten door funderingen',
    'Aanleveren van een SPF verklaring om de OLO melding te kunnen doen',
    'Verwijderen van straatwerk, planten, bomen of andere belemmeringen voor het boren'
  ];
  
  opdrachtgeverVerzorgt.forEach(item => {
    doc.text('•  ' + item, M + 4, y);
    y += 6;
  });
  y += 10;
  
  // Niet opgenomen sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Niet opgenomen in deze offerte:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const nietOpgenomen = [
    'Gebruik van rijplaten',
    'Parkeerkosten',
    'Wegafzettingen'
  ];
  
  nietOpgenomen.forEach(item => {
    doc.text('•  ' + item, M + 4, y);
    y += 6;
  });
  y += 10;
  
  // Waar moet u rekening mee houden sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Waar moet u rekening mee houden:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const rekeningMeeHouden1 = 'Wij mogen de grond die tijdens het boren vrijkomt niet meenemen, deze blijft achter op locatie. Het is wijs om een grondcontainer te bestellen, dit kan bij GP Groot in Heiloo. Voor de grootte van de container kan u altijd even contact met ons opnemen.';
  let textLines = doc.splitTextToSize(rekeningMeeHouden1, pw - 8);
  doc.text(textLines, M + 4, y);
  y += textLines.length * 5 + 8;
  
  const rekeningMeeHouden2 = 'Boren tot grote diepte is niet niks, wij komen met groot materieel. Wij zullen er alles aan doen om dit zo netjes mogelijk te doen. Houd er rekening mee dat de tuin, oprit of bouwkavel behoorlijk geroerd zal zijn na afloop.';
  textLines = doc.splitTextToSize(rekeningMeeHouden2, pw - 8);
  doc.text(textLines, M + 4, y);
  
  addFooter(3);

  // ========== PAGINA 4: ALGEMENE VOORWAARDEN + FACTURERING ==========
  doc.addPage();
  y = addHeader('ALGEMENE VOORWAARDEN & FACTURERING');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Algemene Voorwaarden', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const voorwaarden = [
    'Meerwerk wordt uitsluitend uitgevoerd na overleg en toestemming van de opdrachtgever.',
    'Kosten van vergunningen en leges zijn niet inbegrepen en worden apart verrekend.',
    'De boorlocatie dient normaal toegankelijk te zijn voor onze boorinstallatie. Eventuele wachttijden worden in rekening gebracht tegen €225,- per uur exclusief BTW.',
    'KLIC meldingen worden door Ground Research BV verzorgd.',
    'Boorlocaties worden bepaald door Ground Research op basis van KLIC informatie.',
    'Schade aan kabels en/of leidingen welke niet of onjuist geregistreerd staan bij het kadaster zijn niet verhaalbaar op Ground Research BV.',
    'Aansprakelijkheid is te allen tijde gemaximeerd tot het bedrag van de opdracht.',
    'Werkzaamheden worden uitgevoerd onder BRL2000/BRL2100/BRL11000 certificaat.',
    'Scheidende lagen worden afgedicht volgens de richtlijnen van BRL2100.',
    'Onafhankelijkheid moet ten alle tijden zijn geborgd. Ground Research keurt dus geen eigen grond (zie BRL 2000, BRL 2100 of BRL 11000 zie Functie scheiding).',
    'De projectleider Ground Research beoordeelt alleen of de aangeleverde gegevens voldoende zijn om de werkzaamheden conform de BRL eis uit te voeren.',
    'Garantie op ondergronds systeem 10 jaar. Prestatie garantie op bodemwisselaar van 25 jaar.',
    'Voor klachten t.o.v. van BRL werkzaamheden kan u terecht bij Ground Research BV.'
  ];
  
  let counter = 1;
  voorwaarden.forEach(voorwaarde => {
    const vlines = doc.splitTextToSize(`${counter}. ${voorwaarde}`, pw - 8);
    doc.text(vlines, M + 4, y);
    y += vlines.length * 4 + 2;
    counter++;
    
    if (y > 220) {
      doc.addPage();
      y = 30;
    }
  });
  
  y += 15;
  
  // Facturering sectie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Facturering', M, y);
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  doc.text('De kosten zullen volgens onderstaand schema worden verrekend:', M, y);
  y += 8;
  
  doc.text('•  50% van de totale kosten na ontvangst van de opdrachtbevestiging;', M + 4, y);
  y += 6;
  doc.text('•  50% na oplevering werk.', M + 4, y);
  y += 10;
  
  doc.text('Het factuurbedrag dient binnen 30 dagen op onze bankrekening te zijn overgemaakt.', M, y);
  y += 6;
  doc.text('Alle vermelde bedragen zijn exclusief BTW.', M, y);
  y += 6;
  doc.text('Dit voorstel geldt tot drie maanden na dato.', M, y);
  
  addFooter(4);

  // Save/download
  const filename = `Offerte_${d.kenmerk || 'draft'}_${d.klantNaam || 'klant'}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
  var offerteProject = ((d.kenmerk || '') + (d.locatie ? '-' + d.locatie : '')).trim() || 'draft';
  uploadToDropbox(doc, filename, d.klantNaam || '', offerteProject, 'Offerte');
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('nl-NL');
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================================
// INIT
// ============================================================
// ============================================================
// AUTO-SAVE (localStorage)
// ============================================================
const AUTOSAVE_KEY = 'boorapp_autosave';
const AUTOSAVE_DELAY = 500; // ms debounce
let _saveTimer = null;

function autoSaveAll() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const data = {};
    // Save all inputs, selects, textareas by id
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
      if (el.id.startsWith('km-') || el.id.startsWith('modal')) return; // skip modal fields
      if (el.type === 'checkbox') {
        data[el.id] = el.checked;
      } else {
        data[el.id] = el.value;
      }
    });
    // Save personnel checkboxes (no id, use class + value)
    const personeel = [];
    document.querySelectorAll('.pva-personeel').forEach(cb => {
      if (cb.checked) personeel.push(cb.value);
    });
    data._pvaPersoneel = personeel;
    // Save "Anders" text fields
    const anders = [];
    document.querySelectorAll('.pva-personeel-anders').forEach(el => {
      anders.push(el.value);
    });
    data._pvaAndersText = anders;

    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  }, AUTOSAVE_DELAY);
}

function autoRestoreAll() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    for (const [id, val] of Object.entries(data)) {
      if (id.startsWith('_')) continue; // special keys
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.type === 'checkbox') {
        el.checked = !!val;
      } else {
        el.value = val;
      }
    }
    // Restore personnel checkboxes
    if (data._pvaPersoneel) {
      document.querySelectorAll('.pva-personeel').forEach(cb => {
        cb.checked = data._pvaPersoneel.includes(cb.value);
      });
    }
    if (data._pvaAndersText) {
      document.querySelectorAll('.pva-personeel-anders').forEach((el, i) => {
        if (data._pvaAndersText[i]) el.value = data._pvaAndersText[i];
      });
    }
    // Migrate old glycol cans → liters: if old param-glycol-cans exists in data, reset glycol price
    if (data['param-glycol-cans'] !== undefined || !data['param-glycol-liters']) {
      const priceEl = document.getElementById('param-glycol-prijs');
      if (priceEl) priceEl.value = eur(PARAM_DEFAULTS.glycol.prijsPerLiter);
      costParams.glycol = JSON.parse(JSON.stringify(PARAM_DEFAULTS.glycol));
    }
  } catch (e) { /* ignore corrupt data */ }
}

function attachAutoSave() {
  // Listen on the whole document for changes
  document.addEventListener('input', autoSaveAll);
  document.addEventListener('change', autoSaveAll);
}

function init() {
  // Load handtekening
  loadHandtekening();

  // Set today's date
  document.getElementById('f-datum').value = new Date().toISOString().substring(0, 10);

  // Ensure klanten exist
  getKlanten();

  // Build UI
  buildCostRows();
  populateKlantDropdown();
  updateLusOpties();

  // Initial calculation
  calc();

  // Auto-restore saved form data (offerte tab)
  autoRestoreAll();

  // Attach auto-save listeners
  attachAutoSave();

  // Populate artikel bibliotheek dropdown
  populateArtikelBibSelect();
}

// ============================================================
// PLAN VAN AANPAK
// ============================================================
const PVA_PERSONEEL = [
  { col: 1, names: ['Sander de Roo', 'Michel Fernandez', 'Steven Dubois', 'Pim Groot', 'Maart-Jan', 'Richard Brink'] },
  { col: 2, names: ['Jeroen Kipp', 'Mark Boon', 'Thijs Schermer', 'Dion Koopman', 'Edsel Welvaart', 'Anders'] }
];

let pvaTabInited = false;
function initPvaTab() {
  if (pvaTabInited) return;
  pvaTabInited = true;
  for (const col of PVA_PERSONEEL) {
    const container = document.getElementById('pva-ploeg' + col.col);
    for (const name of col.names) {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:13px;';
      const isAnders = name === 'Anders';
      lbl.innerHTML = `<input type="checkbox" class="pva-personeel" value="${name}">${isAnders ? '<input type="text" placeholder="Anders..." style="width:120px; padding:3px 6px; border:1px solid #d0d5dd; border-radius:4px; font-size:12px;" class="pva-personeel-anders">' : name}`;
      container.appendChild(lbl);
    }
  }
  // Restore saved PvA data (after DOM is built)
  autoRestoreAll();

  // Prefill PvA vanuit offerte — NA autorestore zodat offerte-velden gevuld zijn
  prefillPvaFromOfferte();
}

function prefillPvaFromOfferte() {
  const d = gatherOfferteData();
  if (d.klantNaam) document.getElementById('pva-klant').value = d.klantNaam;
  if (d.kenmerk) document.getElementById('pva-projectnr').value = d.kenmerk;
  if (d.tav) document.getElementById('pva-projectleider').value = d.tav;
  if (d.telefoon) document.getElementById('pva-telefoon').value = d.telefoon;
  if (d.bevoegd) document.getElementById('pva-bevoegd').value = d.bevoegd;
  if (d.locatie) document.getElementById('pva-locatie').value = d.locatie;
  if (d.diameter) document.getElementById('pva-filterdiameter').value = d.diameter + 'mm';
  if (d.meters) {
    document.getElementById('pva-boordiepte').value = d.meters;
    document.getElementById('pva-diepteperlus').value = d.mpb ? d.mpb.toFixed(0) : d.meters;
    document.getElementById('pva-beschrijving').value = `${d.boringen}X${d.mpb ? d.mpb.toFixed(0) : d.meters}`;
    document.getElementById('pva-lussen').value = d.boringen;
  }
}

function gatherPvaData() {
  const personeel = [];
  document.querySelectorAll('.pva-personeel:checked').forEach(cb => {
    if (cb.value === 'Anders') {
      const txt = cb.parentElement.querySelector('.pva-personeel-anders');
      if (txt && txt.value.trim()) personeel.push(txt.value.trim());
    } else {
      personeel.push(cb.value);
    }
  });
  const brlScope = Array.from(document.querySelectorAll('.pva-brl-cb:checked')).map(cb => cb.value);

  function getCheckedLabels(prefix, items) {
    return items.filter(([id]) => document.getElementById(id)?.checked).map(([, label]) => label);
  }
  const veiligheid = getCheckedLabels('', [
    ['pva-v-pbm', 'Standaard PBM\'s (helm, werkschoenen, werkkleding, handschoenen, bril)'],
    ['pva-v-pid', 'PID meter'], ['pva-v-gasmasker', 'Gasmasker P3'],
    ['pva-v-overall', 'Saneringsoverall verplicht'], ['pva-v-instructie', 'Instructiefilm kijken voor werkzaamheden'],
    ['pva-v-beleid', 'Specifiek beleid op locatie'], ['pva-v-gehoorbescherming', 'Gehoorbescherming (bij sonisch boren)']
  ]);
  const kwaliteit = getCheckedLabels('', [
    ['pva-e5-boorstaat', 'Boorstaat bijhouden (diepte, grondsoort, bijzonderheden)'],
    ['pva-e5-grondmonster', 'Grondmonsters beoordelen op verontreiniging'],
    ['pva-e5-groutvol', 'Groutvolume registreren per boring'],
    ['pva-e5-druktest', 'Druktestrapport per lus'],
    ['pva-e5-foto', 'Fotodocumentatie (voor, tijdens, na)'],
    ['pva-e5-afwijking', 'Afwijkingen direct melden aan projectleider']
  ]);
  const risicos = getCheckedLabels('', [
    ['pva-r-artesisch', 'Risico op artesisch water'], ['pva-r-verontreiniging', 'Bekende verontreiniging in omgeving'],
    ['pva-r-stortgrond', 'Stortgrond / puinverharding verwacht'], ['pva-r-tanks', 'Oude tanks / leidingen op locatie'],
    ['pva-r-bomen', 'Bomen / wortels nabij boorlocatie'], ['pva-r-fundering', 'Fundering / kelder nabij boring'],
    ['pva-r-wko', 'Bestaande WKO systemen in omgeving'], ['pva-r-drukleiding', 'Hoge druk leidingen nabij']
  ]);
  const fotos = getCheckedLabels('', [
    ['pva-f-voor', 'Situatie VOOR aanvang'], ['pva-f-opstelling', 'Boorstelling in positie'],
    ['pva-f-grondmonster', 'Grondmonsters bij scheidende lagen'], ['pva-f-lus', 'Lus inbrengen'],
    ['pva-f-grouten', 'Grouten'], ['pva-f-druktest', 'Druktestopstelling + manometer'],
    ['pva-f-na', 'Situatie NA afronding'], ['pva-f-afwijking', 'Afwijkingen / bijzonderheden']
  ]);

  const val = id => document.getElementById(id)?.value || '';
  return {
    klant: val('pva-klant'), projectnr: val('pva-projectnr'), projectleider: val('pva-projectleider'),
    telefoon: val('pva-telefoon'), bevoegd: val('pva-bevoegd'), datum: val('pva-datum'), locatie: val('pva-locatie'),
    personeel, doel: val('pva-doel'), beschrijving: val('pva-beschrijving'), scope: val('pva-scope'), brlScope,
    dinoloket: val('pva-dinoloket'), casing: val('pva-casing'),
    bodemopbouw: val('pva-bodemopbouw'), grondwaterstand: val('pva-grondwaterstand'), scheidendelagen: val('pva-scheidendelagen'),
    boormethode: val('pva-boormethode'), kraan: val('pva-kraan'), boorbuis: val('pva-boorbuis'),
    filterbuis: val('pva-filterbuis'), filterdiameter: val('pva-filterdiameter'),
    lussen: val('pva-lussen'), boordiepte: val('pva-boordiepte'), diepteperlus: val('pva-diepteperlus'),
    boorvloeistof: val('pva-boorvloeistof'), spoelwaterafvoer: val('pva-spoelwaterafvoer'),
    groutpomp: val('pva-groutpomp'), mengverhouding: val('pva-mengverhouding'), afdichting: val('pva-afdichting'),
    groutgeleidbaarheid: val('pva-groutgeleidbaarheid'),
    glycoltype: val('pva-glycoltype'), glycolconc: val('pva-glycolconc'),
    druktestbar: val('pva-druktestbar'), druktestmin: val('pva-druktestmin'),
    circulatietijd: val('pva-circulatietijd'), opleverdruk: val('pva-opleverdruk'),
    werkwater: val('pva-werkwater'), werkstroom: val('pva-werkstroom'), grond: val('pva-grond'),
    verlorencasing: val('pva-verlorencasing'),
    olo: val('pva-olo'), keur: val('pva-keur'), bodemloket: val('pva-bodemloket'), bodemonderzoek: val('pva-bodemonderzoek'),
    bodemloketinfo: val('pva-bodemloketinfo'), lozingsrichtlijn: val('pva-lozingsrichtlijn'), andereeisen: val('pva-andereeisen'),
    veiligheid, klic: val('pva-klic'), klicverantw: val('pva-klicverantw'),
    kwaliteit, afwijkprotocol: val('pva-afwijkprotocol'),
    verontreiniging: val('pva-verontreiniging'), extramaatregelen: val('pva-extramaatregelen'),
    transport: val('pva-transport'), startboor: val('pva-startboor'), eindboor: val('pva-eindboor'),
    opleverdatum: val('pva-opleverdatum'),
    risicos, risicoOpmerkingen: val('pva-risico-opmerkingen'),
    bureninfo: val('pva-bureninfo'), verkeer: val('pva-verkeer'),
    equipment: (() => {
      const items = Array.from(document.querySelectorAll('.pva-equip-cb:checked')).map(cb => cb.value);
      const extra = (document.getElementById('pva-equipment-extra')?.value || '').trim();
      if (extra) items.push(extra);
      return items.join('\n');
    })(),
    noodextra: val('pva-noodextra'), fotos,
  };
}

function generatePvaPDF() {
  const p = gatherPvaData();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210, M = 15, CW = W - 2*M;
  let y = 15;

  const BLAUW = [30, 58, 95]; const ZWART = [33, 33, 33]; const GRIJS = [100, 100, 100]; const LGRIJS = [160, 160, 160];
  const ROOD = [198, 40, 40]; const ORANJE = [230, 81, 0]; const GROEN = [46, 125, 50];

  function h1(text) {
    if (y + 14 > 275) { pdf.addPage(); y = 15; }
    pdf.setFillColor(...BLAUW); pdf.rect(M, y - 4, CW, 8, 'F');
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
    pdf.text(text, M + 3, y + 1); y += 9;
  }
  function h2(text) {
    if (y + 10 > 275) { pdf.addPage(); y = 15; }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
    pdf.text(text, M, y); y += 1;
    pdf.setDrawColor(...BLAUW); pdf.setLineWidth(0.3); pdf.line(M, y, M + CW, y); y += 5;
  }
  function fieldRow(label, value, x, w) {
    if (y + 5 > 275) { pdf.addPage(); y = 15; }
    x = x || M; pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...GRIJS);
    pdf.text(label + ':', x, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    const maxW = CW - (w || 42) - 2;
    const lines = pdf.splitTextToSize(String(value || '-'), maxW);
    pdf.text(lines, x + (w || 42), y);
    y += Math.max(lines.length * 3.5, 4.5);
  }
  function checkRow(label, value) {
    if (y + 5 > 275) { pdf.addPage(); y = 15; }
    const isYes = value === 'Ja' || value?.startsWith('Ja');
    const icon = isYes ? '\u2611' : '\u2610';
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    pdf.text(`${icon}  ${label}: ${value}`, M + 2, y); y += 4.5;
  }
  function bulletList(items, color) {
    for (const item of items) {
      if (y + 5 > 275) { pdf.addPage(); y = 15; }
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...(color || ZWART));
      pdf.text('\u2611  ' + item, M + 2, y); y += 4.5;
    }
  }
  function alertBox(text, bgColor, textColor) {
    if (y + 8 > 275) { pdf.addPage(); y = 15; }
    pdf.setFillColor(...bgColor); pdf.rect(M, y - 3.5, CW, 6, 'F');
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...textColor);
    pdf.text(text, M + 3, y); y += 8;
  }
  function textBlock(text) {
    if (!text) return;
    if (y + 5 > 275) { pdf.addPage(); y = 15; }
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    const lines = pdf.splitTextToSize(text, CW - 4);
    for (const line of lines) {
      if (y + 4 > 275) { pdf.addPage(); y = 15; }
      pdf.text(line, M + 2, y); y += 3.5;
    }
    y += 2;
  }

  // ===================== HEADER =====================
  pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 28, 'F');
  pdf.setFontSize(16); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
  pdf.text('Plan van Aanpak', M, 12);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
  pdf.text('BRL2100 / BRL11000 \u2014 Ground Research BV', M, 19);
  pdf.setFontSize(7); pdf.setTextColor(200, 210, 230);
  pdf.text('Vrijheidweg 45, 1521RP Wormerveer  |  06-47326322  |  info@groundresearch.nl', M, 25);
  y = 36;

  // ===================== PROJECTGEGEVENS =====================
  h1('PROJECTGEGEVENS');
  fieldRow('Klantnaam', p.klant); fieldRow('Projectnummer', p.projectnr);
  fieldRow('Projectleider klant', p.projectleider); fieldRow('Telefoonnummer klant', p.telefoon);
  fieldRow('Bevoegd gezag', p.bevoegd);
  fieldRow('Datum uitvoering', p.datum ? formatDate(p.datum) : '-');
  fieldRow('Locatie', p.locatie); y += 3;

  h2('Personeel op locatie');
  if (p.personeel.length) { bulletList(p.personeel); } 
  else { pdf.setFontSize(8); pdf.setTextColor(...GRIJS); pdf.text('Nog niet ingevuld', M + 2, y); y += 5; }
  y += 3;

  // ===================== EIS 1 =====================
  h1('EIS 1: DOEL EN ONTWERP VAN DE BORING');
  fieldRow('Doel', p.doel); fieldRow('Beschrijving', p.beschrijving);
  fieldRow('Scope', p.scope === 'A' ? 'A \u2014 Verdringt boren (Sonisch)' : 'B \u2014 Waterdrukboren (Spoelboren)');
  fieldRow('BRL scope', p.brlScope.join(', '));
  fieldRow('DinoLoket gecheckt', p.dinoloket);
  fieldRow('Casing tot', p.casing + ' meter');
  fieldRow('Grondwaterstand', p.grondwaterstand || '-');
  fieldRow('Scheidende lagen', p.scheidendelagen); y += 2;

  if (p.bodemopbouw) {
    h2('Verwachte bodemopbouw');
    textBlock(p.bodemopbouw);
  }

  // ===================== VISUELE BOORSTAAT IN PDF =====================
  if (bsData && bsData.layers.length > 0) {
    pdf.addPage();
    y = 15;
    h1('VISUELE BOORSTAAT (GeoTOP v1.6.1)');
    y += 2;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GRIJS);
    pdf.text(`${bsData.locationName}  |  RD: ${bsData.rdX}, ${bsData.rdY}  |  Maaiveld: ${bsData.maaiveldNAP.toFixed(2)} m NAP`, M, y);
    y += 6;

    // Draw boorstaat columns in PDF
    const bsX0 = M + 15; // left margin for depth labels
    const BAR_W_PDF = 25; // lithok bar width
    const STRAT_W_PDF = 22; // strat column width
    const GAP = 2;
    const boordiepte = parseFloat(p.boordiepte) || Math.ceil(bsData.maxDepthMV);
    const maxD = Math.min(boordiepte + 10, Math.ceil(bsData.maxDepthMV));
    const availH = 240; // mm available on page
    const pxPerM = availH / maxD;
    const bsY0 = y + 8;

    // Column headers
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
    pdf.text('Diepte', M, bsY0 - 3);
    pdf.text('Lithologie', bsX0 + BAR_W_PDF / 2, bsY0 - 3, { align: 'center' });
    pdf.text('Formatie', bsX0 + BAR_W_PDF + GAP + STRAT_W_PDF / 2, bsY0 - 3, { align: 'center' });

    // Depth ticks
    const tickI = maxD <= 15 ? 1 : maxD <= 50 ? 5 : maxD <= 100 ? 10 : 25;
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100);
    pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.1);
    for (let d = 0; d <= maxD; d += tickI) {
      const yy = bsY0 + d * pxPerM;
      pdf.line(bsX0 - 2, yy, bsX0 + BAR_W_PDF, yy);
      pdf.text(d + 'm', bsX0 - 3, yy + 1, { align: 'right' });
      // NAP value
      pdf.setTextColor(150, 150, 150);
      pdf.text((bsData.maaiveldNAP - d).toFixed(1), M - 1, yy + 1, { align: 'left' });
      pdf.setTextColor(100, 100, 100);
    }

    // Lithok bars
    const fl = bsData.layers.filter(l => l.botMV <= maxD && l.topMV >= 0);
    for (const l of fl) {
      const top = Math.max(l.topMV, 0), bot = Math.min(l.botMV, maxD);
      const yt = bsY0 + top * pxPerM;
      const h = (bot - top) * pxPerM;
      const c = LITHOK[l.lithok] || { color: '#ddd' };
      // Parse hex color
      const hex = c.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      pdf.setFillColor(r, g, b);
      pdf.rect(bsX0, yt, BAR_W_PDF, h, 'F');
    }
    // Border around lithok
    pdf.setDrawColor(50, 50, 50); pdf.setLineWidth(0.3);
    pdf.rect(bsX0, bsY0, BAR_W_PDF, maxD * pxPerM, 'S');

    // Strat groups
    let prevS = null, stratTop = 0;
    const stratGroups = [];
    for (const l of fl) {
      if (l.strat !== prevS) { if (prevS !== null) stratGroups.push({ s: prevS, t: stratTop, b: l.topMV }); prevS = l.strat; stratTop = l.topMV; }
    }
    if (prevS !== null && fl.length) stratGroups.push({ s: prevS, t: stratTop, b: fl[fl.length - 1].botMV });

    const stratColors = [[227,242,253],[255,243,224],[232,245,233],[252,228,236],[243,229,245],[224,242,241],[255,249,196],[239,235,233]];
    const uniqueS = [...new Set(stratGroups.map(g => g.s))];
    const sx0 = bsX0 + BAR_W_PDF + GAP;
    for (const g of stratGroups) {
      const top = Math.max(g.t, 0), bot = Math.min(g.b, maxD);
      const yt = bsY0 + top * pxPerM;
      const h = (bot - top) * pxPerM;
      const sc = stratColors[uniqueS.indexOf(g.s) % stratColors.length];
      pdf.setFillColor(sc[0], sc[1], sc[2]);
      pdf.rect(sx0, yt, STRAT_W_PDF, h, 'F');
      pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.15);
      pdf.rect(sx0, yt, STRAT_W_PDF, h, 'S');
      if (h > 3) {
        const nm = STRAT_NAMES[g.s] || '';
        if (nm) {
          pdf.setFontSize(5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(50, 50, 50);
          const shortNm = nm.length > 14 ? nm.substring(0, 13) + '\u2026' : nm;
          pdf.text(shortNm, sx0 + STRAT_W_PDF / 2, yt + h / 2 + 1.5, { align: 'center' });
        }
      }
    }
    // Border around strat
    pdf.setDrawColor(50, 50, 50); pdf.setLineWidth(0.3);
    pdf.rect(sx0, bsY0, STRAT_W_PDF, maxD * pxPerM, 'S');

    // Litho labels (grouped) right side
    let prevL = null, lithoTop = 0;
    const lithoGroups = [];
    for (const l of fl) {
      if (l.lithok !== prevL) { if (prevL !== null) lithoGroups.push({ k: prevL, t: lithoTop, b: l.topMV }); prevL = l.lithok; lithoTop = l.topMV; }
    }
    if (prevL !== null && fl.length) lithoGroups.push({ k: prevL, t: lithoTop, b: fl[fl.length - 1].botMV });

    const labelX = sx0 + STRAT_W_PDF + 4;
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
    for (const g of lithoGroups) {
      const top = Math.max(g.t, 0), bot = Math.min(g.b, maxD);
      const h = (bot - top) * pxPerM;
      if (h < 2.5) continue;
      const ym = bsY0 + ((top + bot) / 2) * pxPerM;
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${(LITHOK[g.k] || {}).name || '?'} (${top.toFixed(1)}\u2013${bot.toFixed(1)}m)`, labelX, ym + 1);
    }

    // Maaiveld indicator
    pdf.setFillColor(46, 125, 50); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(46, 125, 50);
    pdf.text('\u25BC Maaiveld', bsX0, bsY0 - 6);

    // Boordiepte indicator (dashed line)
    if (parseFloat(p.boordiepte) && parseFloat(p.boordiepte) <= maxD) {
      const bdY = bsY0 + parseFloat(p.boordiepte) * pxPerM;
      pdf.setDrawColor(198, 40, 40); pdf.setLineWidth(0.4);
      // Draw dashed line
      const dashLen = 2, gapLen = 1.5;
      for (let dx = bsX0 - 4; dx < bsX0 + BAR_W_PDF + GAP + STRAT_W_PDF + 4; dx += dashLen + gapLen) {
        pdf.line(dx, bdY, Math.min(dx + dashLen, bsX0 + BAR_W_PDF + GAP + STRAT_W_PDF + 4), bdY);
      }
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(198, 40, 40);
      pdf.text(`\u25BC Boordiepte ${p.boordiepte}m`, labelX, bdY + 1);
    }

    // Legend
    y = bsY0 + maxD * pxPerM + 8;
    if (y + 15 > 275) { pdf.addPage(); y = 15; }
    h2('Legenda');
    const usedLithok = new Set(fl.map(l => l.lithok));
    let legX = M + 2;
    pdf.setFontSize(6);
    for (const [code, info] of Object.entries(LITHOK)) {
      if (!usedLithok.has(parseInt(code))) continue;
      const hex = info.color.replace('#', '');
      pdf.setFillColor(parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16));
      pdf.rect(legX, y - 2, 5, 3, 'F');
      pdf.setDrawColor(150,150,150); pdf.setLineWidth(0.1); pdf.rect(legX, y - 2, 5, 3, 'S');
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 60, 60);
      pdf.text(info.name, legX + 6.5, y + 0.5);
      legX += 28;
      if (legX > W - M - 20) { legX = M + 2; y += 5; }
    }
    y += 6;
    pdf.setFontSize(6); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(...LGRIJS);
    pdf.text('Bron: TNO GeoTOP v1.6.1 \u2014 Dit is een modelmatige verwachting, geen daadwerkelijke boorgegevens.', M, y);
    y += 6;
  }

  h2('Boormethode & Materiaal');
  fieldRow('Boormethode', p.boormethode); fieldRow('Kraan mee', p.kraan);
  fieldRow('Boorbuis', p.boorbuis); fieldRow('Filterbuis', p.filterbuis + ' ' + p.filterdiameter);
  fieldRow('Aantal lussen', p.lussen); fieldRow('Totale boordiepte', p.boordiepte + ' m');
  fieldRow('Diepte per lus', p.diepteperlus + ' m');
  fieldRow('Boorvloeistof', p.boorvloeistof);
  fieldRow('Opvang spoelwater', p.spoelwaterafvoer); y += 2;

  h2('Grout & Afdichting');
  fieldRow('Groutpomp', p.groutpomp); fieldRow('Mengverhouding', p.mengverhouding);
  fieldRow('Afdichtingsmateriaal', p.afdichting);
  fieldRow('Thermische geleidbaarheid', p.groutgeleidbaarheid); y += 2;

  h2('BRL11000: Lussysteem & Druktest');
  fieldRow('Glycol type', p.glycoltype); fieldRow('Concentratie', p.glycolconc);
  fieldRow('Druktest', p.druktestbar + ' bar, ' + p.druktestmin + ' minuten');
  fieldRow('Circulatietijd', p.circulatietijd + ' min per lus');
  fieldRow('Oplevering', p.opleverdruk); y += 2;

  h2('Voorzieningen op locatie');
  fieldRow('Werkwater', p.werkwater); fieldRow('Werkstroom', p.werkstroom);
  fieldRow('Uitkomende grond', p.grond); fieldRow('Verloren casing', p.verlorencasing);
  y += 3;

  // ===================== EIS 2 =====================
  h1('EIS 2: WETTELIJKE EISEN');
  checkRow('OLO melding gedaan', p.olo);
  checkRow('Keur gecheckt (beschermd gebied)', p.keur);
  checkRow('Bodemloket gecheckt', p.bodemloket);
  checkRow('Bestaand bodemonderzoek aanwezig', p.bodemonderzoek);
  checkRow('Andere wettelijke eisen', p.andereeisen);
  if (p.lozingsrichtlijn) fieldRow('Richtlijnen lozen', p.lozingsrichtlijn);
  y += 2;
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(...GRIJS);
  const bodemLines = pdf.splitTextToSize(p.bodemloketinfo || '-', CW - 4);
  pdf.text(bodemLines, M + 2, y); y += bodemLines.length * 3.5 + 4;

  // ===================== EIS 3 =====================
  h1('EIS 3: ARBEIDSOMSTANDIGHEDEN & VEILIGHEID');
  if (p.veiligheid.length) bulletList(p.veiligheid);
  y += 2;
  alertBox('\u26A0  Bij vreemde luchten of andere waarnemingen: BEL DE PROJECTLEIDER 0647326322', [255, 243, 224], ROOD);

  // ===================== EIS 4 =====================
  h1('EIS 4: KABELS EN LEIDINGEN');
  checkRow('KLIC melding gedaan', p.klic);
  fieldRow('Verantwoordelijk', p.klicverantw); y += 3;

  // ===================== EIS 5 =====================
  h1('EIS 5: KWALITEITSBORGING TIJDENS UITVOERING');
  if (p.kwaliteit.length) bulletList(p.kwaliteit);
  y += 2;
  h2('Afwijkingenprotocol');
  textBlock(p.afwijkprotocol);

  // ===================== EIS 6 =====================
  h1('EIS 6: VOORKOM VERSPREIDING VERONTREINIGING');
  fieldRow('Verwachte verontreiniging', p.verontreiniging);
  fieldRow('Extra maatregelen', p.extramaatregelen); y += 3;

  // ===================== EIS 7 =====================
  h1('EIS 7: PLANNING');
  fieldRow('Transport klaarzetten', p.transport ? formatDate(p.transport) : '-');
  fieldRow('Start boorwerk', p.startboor ? formatDate(p.startboor) : '-');
  fieldRow('Eind boorwerk', p.eindboor ? formatDate(p.eindboor) : '-');
  fieldRow('Opleverdatum', p.opleverdatum ? formatDate(p.opleverdatum) : '-');
  y += 3;

  // ===================== RISICO-INVENTARISATIE =====================
  h1('RISICO-INVENTARISATIE');
  if (p.risicos.length) {
    bulletList(p.risicos, ORANJE);
  } else {
    pdf.setFontSize(8); pdf.setTextColor(...GROEN); pdf.text('\u2714  Geen bijzondere risico\'s geidentificeerd', M + 2, y); y += 5;
  }
  if (p.risicoOpmerkingen) { y += 2; textBlock('Opmerkingen: ' + p.risicoOpmerkingen); }
  y += 3;

  // ===================== OMGEVING & LOGISTIEK =====================
  h1('OMGEVING & LOGISTIEK');
  fieldRow('Buren informeren', p.bureninfo);
  fieldRow('Verkeersmaatregelen', p.verkeer);
  if (p.equipment) { y += 2; h2('Equipment / Materiaal'); textBlock(p.equipment); }
  y += 3;

  // ===================== NOODPROCEDURE =====================
  h1('NOODPROCEDURE');
  if (y + 35 > 275) { pdf.addPage(); y = 15; }
  pdf.setFillColor(255, 243, 224); pdf.rect(M, y - 2, CW, 32, 'F');
  pdf.setDrawColor(...ORANJE); pdf.setLineWidth(0.8); pdf.line(M, y - 2, M, y + 30);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...ROOD);
  pdf.text('Bij noodsituaties:', M + 4, y + 2);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  const noodItems = [
    '1. STOP alle werkzaamheden',
    '2. Bel projectleider: 0647326322 (Pim Groot)',
    '3. Bij letsel: bel 112',
    '4. Bij gaslek: verlaat locatie, bel 0800-9009',
    '5. Bij kabel/leiding geraakt: bel netbeheerder + projectleider',
    '6. Bij artesisch water: casing sluiten, bel projectleider'
  ];
  let ny = y + 7;
  for (const item of noodItems) { pdf.text(item, M + 6, ny); ny += 4; }
  y = ny + 4;
  if (p.noodextra) { fieldRow('Aanvullend', p.noodextra); }
  y += 3;

  // ===================== FOTODOCUMENTATIE =====================
  h1('FOTODOCUMENTATIE (VERPLICHT)');
  if (p.fotos.length) bulletList(p.fotos);
  y += 3;

  // ===================== GOEDKEURING =====================
  if (y + 35 > 275) { pdf.addPage(); y = 15; }
  pdf.setDrawColor(...BLAUW); pdf.setLineWidth(0.5); pdf.rect(M, y, CW, 30, 'S');
  y += 6;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
  pdf.text('Goedgekeurd door:', M + 4, y); y += 5;
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  pdf.text('Pim Groot \u2014 Projectleider Ground Research BV', M + 4, y); y += 5;
  pdf.setFontSize(8); pdf.setTextColor(...GRIJS);
  pdf.text('Voldoet aan kwaliteitseisen Ground Research \u2014 BRL2100 / BRL11000', M + 4, y); y += 6;
  addSignature(pdf, M + 90, y - 8, 35, 12);
  pdf.text('Datum: _______________    Handtekening: _______________', M + 4, y);

  // FOOTER
  const pageCount = pdf.internal.getNumberOfPages();
  for (let pg = 1; pg <= pageCount; pg++) {
    pdf.setPage(pg);
    pdf.setFontSize(7); pdf.setTextColor(...LGRIJS);
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.2); pdf.line(M, 287, W - M, 287);
    pdf.text(`Ground Research BV  \u2014  Plan van Aanpak  \u2014  ${p.projectnr || ''}  \u2014  ${p.locatie || ''}`, M, 291);
    pdf.text(`Pagina ${pg}/${pageCount}`, W - M, 291, { align: 'right' });
  }

  const filename = `PvA_${p.projectnr || 'draft'}_${p.klant || ''}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  pdf.save(filename);
  var pvaProject = ((p.projectnr || '') + (p.locatie ? '-' + p.locatie : '')).trim() || 'draft';
  uploadToDropbox(pdf, filename, p.klant || '', pvaProject, 'PvA');
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

// ============================================
// VISUELE BOORSTAAT (GeoTOP v1.6.1)
// ============================================
const GEOTOP_BASE = 'https://www.dinodata.nl/opendap/GeoTOP/geotop.nc.json';
const GT_X0 = 13600, GT_Y0 = 338500, GT_STEP = 100, GT_ZCOUNT = 313, GT_ZSTEP = 0.5;

const LITHOK = {
  1: { name: 'Antropogeen', color: '#808080' },
  2: { name: 'Veen', color: '#8B4513' },
  3: { name: 'Klei', color: '#2E8B57' },
  4: { name: 'Kleiig zand / leem', color: '#A8C686' },
  5: { name: 'Zand fijn', color: '#F5E6A3' },
  6: { name: 'Zand midden', color: '#E6C84D' },
  7: { name: 'Zand grof', color: '#C8A02D' },
  8: { name: 'Grind', color: '#CC3333' },
  9: { name: 'Schelpen', color: '#F0E68C' },
};

const STRAT_NAMES = {
  1000:'Fm. Peize',1010:'Fm. Waalre',1100:'Fm. Urk',1110:'Fm. Sterksel',
  2000:'Fm. Stramproy',2010:'Fm. Beegden',3000:'Fm. Tegelen',
  4000:'Fm. Peelo',4010:'Fm. Drente',5000:'Fm. Eem',5010:'Fm. Kreftenheye',
  5020:'Fm. Twente',5050:'Fm. Boxtel',5060:'Fm. Maassluis',
  6000:'Fm. Naaldwijk',6010:'Lp. Wormer',6020:'Lp. Velsen',6030:'Lp. Schoorl',
  6400:'Fm. Nieuwkoop',6410:'Hollandveen Lp.',6420:'Basisveen Lp.',
  6500:'Fm. Echteld',
};

let bsData = null, bsView = 'both';

function bsLog(msg) {
  const el = document.getElementById('pva-bs-log');
  el.style.display = 'block';
  el.textContent += msg + '\n';
  el.scrollTop = el.scrollHeight;
}

async function fetchBoorstaat() {
  const addr = document.getElementById('pva-locatie').value.trim();
  if (!addr) { alert('Vul eerst een adres in bij "Locatie opdracht"'); return; }

  document.getElementById('pva-bs-log').textContent = '';
  document.getElementById('pva-bs-area').innerHTML = '<div style="color:#888; padding:20px; text-align:center;"><span style="display:inline-block;width:18px;height:18px;border:3px solid #e8ecf1;border-top-color:#2d5a1e;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;"></span>Bezig met ophalen...</div>';

  try {
    bsLog('📍 Adres opzoeken via PDOK...');
    const pdok = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(addr)}&rows=1`);
    const pdokData = await pdok.json();
    const doc = pdokData?.response?.docs?.[0];
    if (!doc) throw new Error('Adres niet gevonden');

    const rdM = doc.centroide_rd?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!rdM) throw new Error('Geen RD-coördinaten');
    const rdX = parseFloat(rdM[1]), rdY = parseFloat(rdM[2]);
    bsLog(`✔ ${doc.weergavenaam} (RD: ${Math.round(rdX)}, ${Math.round(rdY)})`);

    if (rdX < GT_X0 || rdX > 278200 || rdY < GT_Y0 || rdY > 619600) throw new Error('Buiten GeoTOP bereik');

    const xi = Math.round((rdX - GT_X0) / GT_STEP);
    const yi = Math.round((rdY - GT_Y0) / GT_STEP);
    bsLog('🔄 GeoTOP data ophalen...');

    const url = `${GEOTOP_BASE}?strat[${xi}][${yi}][0:${GT_ZCOUNT-1}],lithok[${xi}][${yi}][0:${GT_ZCOUNT-1}],z[0:${GT_ZCOUNT-1}]`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('GeoTOP API fout');
    // OPeNDAP returns malformed JSON (missing commas between objects) — fix it
    let rawText = await resp.text();
    rawText = rawText.replace(/\}\s*\{/g, '},{');
    const json = JSON.parse(rawText);

    const zData = json.leaves.find(l => l.name === 'z').data;
    const stratData = json.nodes.find(n => n.name === 'strat').leaves.find(l => l.name === 'strat').data[0][0];
    const lithokData = json.nodes.find(n => n.name === 'lithok').leaves.find(l => l.name === 'lithok').data[0][0];

    let mvIdx = GT_ZCOUNT - 1;
    for (let i = GT_ZCOUNT - 1; i >= 0; i--) { if (lithokData[i] !== -127 && lithokData[i] !== 0) { mvIdx = i; break; } }
    const mvNAP = zData[mvIdx] + GT_ZSTEP;

    let deepIdx = 0;
    for (let i = 0; i < GT_ZCOUNT; i++) { if (lithokData[i] !== -127 && lithokData[i] !== 0) { deepIdx = i; break; } }
    const deepNAP = zData[deepIdx];

    const layers = [];
    for (let i = mvIdx; i >= deepIdx; i--) {
      if (lithokData[i] === -127 || lithokData[i] === 0) continue;
      layers.push({ topNAP: zData[i]+GT_ZSTEP, botNAP: zData[i], topMV: mvNAP-(zData[i]+GT_ZSTEP), botMV: mvNAP-zData[i], lithok: lithokData[i], strat: stratData[i] });
    }

    bsLog(`✔ ${layers.length} lagen (mv ${mvNAP.toFixed(1)} NAP, diepte ${(mvNAP-deepNAP).toFixed(1)} m)`);

    bsData = { rdX: Math.round(rdX), rdY: Math.round(rdY), locationName: doc.weergavenaam, maaiveldNAP: mvNAP, deepestNAP: deepNAP, layers, maxDepthMV: mvNAP - deepNAP };

    document.getElementById('pva-bs-info').style.display = 'block';
    document.getElementById('pva-bs-info').innerHTML = `<strong>${doc.weergavenaam}</strong> · RD: ${Math.round(rdX)}, ${Math.round(rdY)} · Maaiveld: ${mvNAP.toFixed(2)} m NAP · Diepte: 0 – ${(mvNAP-deepNAP).toFixed(1)} m`;

    renderPvaBoorstaat();
    renderPvaBsLegend();
  } catch (e) {
    bsLog('❌ ' + e.message);
    document.getElementById('pva-bs-area').innerHTML = `<div style="color:#c62828; padding:16px; text-align:center;">❌ ${e.message}</div>`;
  }
}

function setBoorstaatView(v) {
  bsView = v;
  ['shallow','deep','both'].forEach(k => {
    const b = document.getElementById('pva-bs-' + k);
    b.style.border = k === v ? '2px solid #2d5a1e' : '';
  });
  renderPvaBoorstaat();
}

function renderPvaBoorstaat() {
  if (!bsData) return;
  const area = document.getElementById('pva-bs-area');
  area.innerHTML = '';
  if (bsView === 'shallow' || bsView === 'both') area.appendChild(drawBsCanvas(bsData, 0, 10));
  if (bsView === 'deep' || bsView === 'both') area.appendChild(drawBsCanvas(bsData, 0, Math.ceil(bsData.maxDepthMV)));
}

function drawBsCanvas(data, depthFrom, depthTo) {
  const MT = 50, MB = 20, ML = 65, BAR_W = 60, STRAT_W = 55, LABEL_W = 160;
  const totalD = depthTo - depthFrom;
  const pxM = totalD <= 15 ? 55 : totalD <= 50 ? 18 : totalD <= 100 ? 9 : 4;
  const chartH = totalD * pxM;
  const W = ML + BAR_W + 8 + STRAT_W + LABEL_W + 10;
  const H = MT + chartH + MB;

  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  c.style.width = W + 'px'; c.style.height = H + 'px';
  c.style.borderRadius = '6px'; c.style.border = '1px solid #e0e0e0';
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#2d5a1e'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${data.locationName}`, W / 2, 16);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#666';
  ctx.fillText(`RD: ${data.rdX}, ${data.rdY} | MV: ${data.maaiveldNAP.toFixed(2)} m NAP | ${depthFrom}–${depthTo} m`, W / 2, 30);

  const x0 = ML, y0 = MT;
  const sx = x0 + BAR_W + 8;

  // Depth ticks
  let ti = totalD <= 15 ? 1 : totalD <= 50 ? 5 : totalD <= 150 ? 10 : 25;
  ctx.textAlign = 'right'; ctx.font = '9px sans-serif';
  for (let d = depthFrom; d <= depthTo; d += ti) {
    const y = y0 + (d - depthFrom) * pxM;
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(x0 - 4, y); ctx.lineTo(x0 + BAR_W, y); ctx.stroke();
    ctx.fillStyle = '#555'; ctx.fillText(d + 'm', x0 - 6, y + 3);
    ctx.fillStyle = '#aaa'; ctx.font = '8px sans-serif';
    ctx.fillText((data.maaiveldNAP - d).toFixed(1) + ' NAP', x0 - 6, y + 12);
    ctx.font = '9px sans-serif';
  }

  // Column headers
  ctx.fillStyle = '#2d5a1e'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Lithoklasse', x0 + BAR_W / 2, y0 - 6);
  ctx.fillText('Geol. eenh.', sx + STRAT_W / 2, y0 - 6);

  // Lithok bars
  const fl = data.layers.filter(l => l.botMV < depthTo && l.topMV >= depthFrom);
  for (const l of fl) {
    const top = Math.max(l.topMV, depthFrom), bot = Math.min(l.botMV, depthTo);
    const yt = y0 + (top - depthFrom) * pxM, yb = y0 + (bot - depthFrom) * pxM;
    ctx.fillStyle = (LITHOK[l.lithok] || {}).color || '#ddd';
    ctx.fillRect(x0, yt, BAR_W, yb - yt);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.2; ctx.strokeRect(x0, yt, BAR_W, yb - yt);
  }

  // Strat groups
  let ps = null, st = 0; const sg = [];
  for (const l of fl) {
    if (l.strat !== ps) { if (ps !== null) sg.push({ s: ps, t: st, b: l.topMV }); ps = l.strat; st = l.topMV; }
  }
  if (ps !== null && fl.length) sg.push({ s: ps, t: st, b: fl[fl.length - 1].botMV });

  const sc = ['#E3F2FD','#FFF3E0','#E8F5E9','#FCE4EC','#F3E5F5','#E0F2F1','#FFF9C4','#EFEBE9'];
  const us = [...new Set(sg.map(g => g.s))];
  for (const g of sg) {
    const top = Math.max(g.t, depthFrom), bot = Math.min(g.b, depthTo);
    const yt = y0 + (top - depthFrom) * pxM, h = (bot - top) * pxM;
    ctx.fillStyle = sc[us.indexOf(g.s) % sc.length];
    ctx.fillRect(sx, yt, STRAT_W, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.4; ctx.strokeRect(sx, yt, STRAT_W, h);
    if (h > 10) {
      ctx.fillStyle = '#333'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      const nm = STRAT_NAMES[g.s] || 'Code ' + g.s;
      ctx.fillText(nm.length > 12 ? nm.substring(0, 11) + '…' : nm, sx + STRAT_W / 2, yt + h / 2 + 3);
    }
  }

  // Litho labels right side (grouped)
  let pl = null, lt = 0; const lg = [];
  for (const l of fl) {
    if (l.lithok !== pl) { if (pl !== null) lg.push({ k: pl, t: lt, b: l.topMV }); pl = l.lithok; lt = l.topMV; }
  }
  if (pl !== null && fl.length) lg.push({ k: pl, t: lt, b: fl[fl.length - 1].botMV });

  const lx = sx + STRAT_W + 8;
  ctx.textAlign = 'left'; ctx.font = '8px sans-serif';
  for (const g of lg) {
    const top = Math.max(g.t, depthFrom), bot = Math.min(g.b, depthTo);
    const h = (bot - top) * pxM;
    if (h < 8) continue;
    const ym = y0 + ((top + bot) / 2 - depthFrom) * pxM;
    ctx.fillStyle = '#444';
    ctx.fillText(`${(LITHOK[g.k]||{}).name||'?'} (${top.toFixed(1)}–${bot.toFixed(1)}m)`, lx, ym + 3);
  }

  // Borders
  ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8;
  ctx.strokeRect(x0, y0, BAR_W, chartH);
  ctx.strokeRect(sx, y0, STRAT_W, chartH);

  if (depthFrom === 0) {
    ctx.fillStyle = '#2E7D32'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('▼ Maaiveld', x0, y0 - 12);
  }

  return c;
}

function renderPvaBsLegend() {
  const el = document.getElementById('pva-bs-legend');
  el.style.display = 'flex';
  const used = new Set(bsData.layers.map(l => l.lithok));
  el.innerHTML = '';
  for (const [code, info] of Object.entries(LITHOK)) {
    if (!used.has(parseInt(code))) continue;
    el.innerHTML += `<span style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:10px;border-radius:2px;border:1px solid rgba(0,0,0,0.15);background:${info.color};display:inline-block;"></span>${info.name}</span>`;
  }
}

// ============================================================
// OPLEVERRAPPORT
// ============================================================
let opleverInitDone = false;

function initOpleverTab() {
  if (!opleverInitDone) {
    renderBronTabel();
    restoreOpleverState();
    // Auto-save on any input change in oplever tab
    document.getElementById('tab-oplever').addEventListener('input', saveOpleverState);
    document.getElementById('tab-oplever').addEventListener('change', saveOpleverState);
    opleverInitDone = true;
  }
}

function copyOfferteToOplever() {
  // Kopieer data uit offerte-tab
  const v = id => (document.getElementById(id)?.value || '');
  const klantId = v('f-klant');
  if (klantId && klantId !== '__new__') {
    const klant = getKlanten().find(k => k.id == klantId);
    if (klant) document.getElementById('opl-klant').value = klant.bedrijf;
  }
  document.getElementById('opl-tav').value = v('f-tav');
  document.getElementById('opl-kenmerk').value = v('f-kenmerk');
  document.getElementById('opl-locatie').value = v('f-locatie');
  document.getElementById('opl-projectnr').value = v('f-kenmerk');
  document.getElementById('opl-telefoon').value = v('f-telefoon');
  document.getElementById('opl-diameter').value = v('f-diameter');
  document.getElementById('opl-luslengte').value = v('f-luslengte');
  document.getElementById('opl-bronnen').value = v('f-boringen') || '1';
  document.getElementById('opl-datum').value = new Date().toISOString().substring(0, 10);

  // Kopieer PvA-velden indien beschikbaar
  if (v('pva-glycoltype')) document.getElementById('opl-glycoltype').value = v('pva-glycoltype');
  if (v('pva-glycolconc')) document.getElementById('opl-glycolconc').value = v('pva-glycolconc');
  if (v('pva-druktestbar')) document.getElementById('opl-druktestbar').value = v('pva-druktestbar');
  if (v('pva-druktestmin')) document.getElementById('opl-druktestmin').value = v('pva-druktestmin');
  if (v('pva-circulatietijd')) document.getElementById('opl-circulatietijd').value = v('pva-circulatietijd');
  if (v('pva-boorvloeistof')) document.getElementById('opl-boorvloeistof').value = v('pva-boorvloeistof');
  if (v('pva-afdichting')) document.getElementById('opl-afdichting').value = v('pva-afdichting');
  if (v('pva-opleverdruk')) document.getElementById('opl-opleverdruk').value = v('pva-opleverdruk');
  if (v('pva-olo')) document.getElementById('opl-olo').value = v('pva-olo');

  renderBronTabel();
  alert('Gegevens overgenomen uit offerte/PvA!');
}

// ============================================================
// FOTO'S & BOORTEKENING
// ============================================================
let oplFotos = [];  // array of { dataUrl, name }
let oplTekening = null;  // { dataUrl, name }

function readImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Resize if needed (max 1200px wide to keep PDF size reasonable)
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), name: file.name, w, h });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFotoDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#d0d5dd';
  e.currentTarget.style.background = '#f8f9fb';
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  for (const f of files) {
    const img = await readImageFile(f);
    oplFotos.push(img);
  }
  renderFotoPreview();
  saveOpleverState();
}

async function handleFotoSelect(e) {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  for (const f of files) {
    const img = await readImageFile(f);
    oplFotos.push(img);
  }
  renderFotoPreview();
  saveOpleverState();
  e.target.value = '';  // reset zodat je dezelfde file opnieuw kunt selecteren
}

function removeFoto(idx) {
  oplFotos.splice(idx, 1);
  renderFotoPreview();
  saveOpleverState();
}

function renderFotoPreview() {
  const container = document.getElementById('opl-foto-preview');
  container.innerHTML = '';
  oplFotos.forEach((foto, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:relative; display:inline-block;';
    div.innerHTML = '<img src="' + foto.dataUrl + '" style="width:80px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd;">' +
      '<span onclick="removeFoto(' + i + ')" style="position:absolute; top:-6px; right:-6px; background:#c62828; color:white; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; font-weight:bold;">\u00D7</span>' +
      '<div style="font-size:9px; color:#888; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + foto.name + '</div>';
    container.appendChild(div);
  });
  if (oplFotos.length > 0) {
    const count = document.createElement('div');
    count.style.cssText = 'font-size:11px; color:#2e7d32; margin-top:4px; width:100%;';
    count.textContent = oplFotos.length + ' foto' + (oplFotos.length > 1 ? "'s" : '') + ' geselecteerd';
    container.appendChild(count);
  }
}

async function renderPdfToImage(file) {
  // Renders ALL pages from PDF, returns array of images
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
        const pages = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const scale = 2;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          pages.push({
            dataUrl: canvas.toDataURL('image/jpeg', 0.9),
            name: file.name + (pdf.numPages > 1 ? ' (p' + p + ')' : ''),
            w: viewport.width,
            h: viewport.height
          });
        }
        // Return as multi-page object
        resolve({
          dataUrl: pages[0].dataUrl,
          name: file.name,
          w: pages[0].w,
          h: pages[0].h,
          pages: pages  // all pages
        });
      } catch(err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function handleTekeningDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#d0d5dd';
  e.currentTarget.style.background = '#f8f9fb';
  const files = Array.from(e.dataTransfer.files);
  const f = files.find(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
  if (!f) return;
  try {
    oplTekening = f.type === 'application/pdf' ? await renderPdfToImage(f) : await readImageFile(f);
    renderTekeningPreview();
    saveOpleverState();
  } catch(err) { alert('Kon bestand niet laden: ' + err.message); }
}

async function handleTekeningSelect(e) {
  const f = Array.from(e.target.files).find(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
  if (!f) return;
  try {
    oplTekening = f.type === 'application/pdf' ? await renderPdfToImage(f) : await readImageFile(f);
    renderTekeningPreview();
    saveOpleverState();
  } catch(err) { alert('Kon bestand niet laden: ' + err.message); }
  e.target.value = '';
}

function removeTekening() {
  oplTekening = null;
  renderTekeningPreview();
  saveOpleverState();
}

function renderTekeningPreview() {
  const container = document.getElementById('opl-tekening-preview');
  if (!oplTekening) { container.innerHTML = ''; return; }
  container.innerHTML = '<div style="position:relative; display:inline-block;">' +
    '<img src="' + oplTekening.dataUrl + '" style="max-width:100%; max-height:200px; border-radius:6px; border:1px solid #ddd;">' +
    '<span onclick="removeTekening()" style="position:absolute; top:-6px; right:-6px; background:#c62828; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; font-weight:bold;">\u00D7</span>' +
    '<div style="font-size:11px; color:#2e7d32; margin-top:4px;">\u2705 ' + oplTekening.name + '</div>' +
    '</div>';
}

// ============================================================
// OPLEVER STATE SAVE/RESTORE
// ============================================================
const OPLEVER_SAVE_KEY = 'boorapp_oplever_state';
let _oplSaveTimer = null;

function saveOpleverState() {
  clearTimeout(_oplSaveTimer);
  _oplSaveTimer = setTimeout(() => {
    const state = {
      fotos: oplFotos,
      tekening: oplTekening,
      fields: {}
    };
    // Save all opl- fields
    document.querySelectorAll('[id^="opl-"]').forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        state.fields[el.id] = el.value;
      }
    });
    try {
      localStorage.setItem(OPLEVER_SAVE_KEY, JSON.stringify(state));
    } catch(e) {
      // localStorage full — fotos might be too large, save without them
      state.fotos = state.fotos.map(f => ({ name: f.name, w: f.w, h: f.h, dataUrl: '' }));
      state.tekening = state.tekening ? { name: state.tekening.name, w: 0, h: 0, dataUrl: '' } : null;
      try { localStorage.setItem(OPLEVER_SAVE_KEY, JSON.stringify(state)); } catch(e2) {}
    }
  }, 500);
}

function restoreOpleverState() {
  try {
    const raw = localStorage.getItem(OPLEVER_SAVE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    // Restore fotos (only those with actual data)
    if (state.fotos) {
      oplFotos = state.fotos.filter(f => f.dataUrl);
      renderFotoPreview();
    }
    // Restore tekening
    if (state.tekening && state.tekening.dataUrl) {
      oplTekening = state.tekening;
      renderTekeningPreview();
    }
    // Restore fields
    if (state.fields) {
      for (const [id, val] of Object.entries(state.fields)) {
        const el = document.getElementById(id);
        if (el) el.value = val;
      }
      // Re-render bron tabel with correct count
      renderBronTabel();
      // Restore bron field values after re-render
      setTimeout(() => {
        for (const [id, val] of Object.entries(state.fields)) {
          const el = document.getElementById(id);
          if (el) el.value = val;
        }
      }, 50);
    }
  } catch(e) { /* corrupt data */ }
}

function changeBronnen(delta) {
  const el = document.getElementById('opl-bronnen');
  const n = Math.max(1, Math.min(50, (parseInt(el.value) || 1) + delta));
  el.value = n;
  renderBronTabel();
}

function renderBronTabel() {
  const n = parseInt(document.getElementById('opl-bronnen').value) || 1;
  const container = document.getElementById('opl-bron-tabel');
  // Bewaar bestaande waarden
  const existing = {};
  container.querySelectorAll('input').forEach(el => { existing[el.id] = el.value; });

  let html = '<table style="width:100%; font-size:11px;">';
  html += '<tr><th style="padding:5px 4px;">Nr</th><th style="padding:5px 4px;">Naam</th><th style="padding:5px 4px;">Diepte</th><th style="padding:5px 4px;">Pomdruk</th><th style="padding:5px 4px;">Tijd</th><th style="padding:5px 4px;">Druktest</th><th style="padding:5px 4px;">Status</th></tr>';
  for (let i = 1; i <= n; i++) {
    const diepte = existing['opl-bron-'+i+'-diepte'] || '';
    const pomdruk = existing['opl-bron-'+i+'-pomdruk'] || '5';
    const tijd = existing['opl-bron-'+i+'-tijd'] || '20';
    const druktest = existing['opl-bron-'+i+'-druktestbar'] || '3';
    html += `<tr>
      <td style="padding:3px 4px; font-weight:600; color:#2d5a1e;">${i}</td>
      <td style="padding:3px 2px;"><input type="text" id="opl-bron-${i}-naam" value="${existing['opl-bron-'+i+'-naam'] || 'Bron '+i}" style="width:80px; padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px;"></td>
      <td style="padding:3px 2px;"><input type="text" id="opl-bron-${i}-diepte" value="${diepte}" placeholder="m" style="width:45px; padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px; text-align:right;"></td>
      <td style="padding:3px 2px;"><input type="text" id="opl-bron-${i}-pomdruk" value="${pomdruk}" style="width:35px; padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px; text-align:right;"> bar</td>
      <td style="padding:3px 2px;"><input type="text" id="opl-bron-${i}-tijd" value="${tijd}" style="width:35px; padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px; text-align:right;"> min</td>
      <td style="padding:3px 2px;"><input type="text" id="opl-bron-${i}-druktestbar" value="${druktest}" style="width:35px; padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px; text-align:right;"> bar</td>
      <td style="padding:3px 2px;">
        <select id="opl-bron-${i}-status" style="padding:3px 4px; border:1px solid #d0d5dd; border-radius:3px; font-size:11px;">
          <option value="Goedgekeurd" ${(existing['opl-bron-'+i+'-status']||'') !== 'Afgekeurd' ? 'selected' : ''}>✅</option>
          <option value="Afgekeurd" ${(existing['opl-bron-'+i+'-status']||'') === 'Afgekeurd' ? 'selected' : ''}>❌</option>
        </select>
      </td>
    </tr>`;
  }
  html += '</table>';
  container.innerHTML = html;
}

function gatherOpleverData() {
  const v = id => (document.getElementById(id)?.value || '');
  const n = parseInt(v('opl-bronnen')) || 1;
  const bronnen = [];
  for (let i = 1; i <= n; i++) {
    bronnen.push({
      nr: i,
      naam: v('opl-bron-' + i + '-naam') || 'Bron ' + i,
      diepte: v('opl-bron-' + i + '-diepte') || '-',
      pomdruk: v('opl-bron-' + i + '-pomdruk') || '5',
      tijd: v('opl-bron-' + i + '-tijd') || '20',
      druktestbar: v('opl-bron-' + i + '-druktestbar') || '3',
      status: v('opl-bron-' + i + '-status') || 'Goedgekeurd',
    });
  }

  return {
    klant: v('opl-klant'), projectnr: v('opl-projectnr'), tav: v('opl-tav'),
    telefoon: v('opl-telefoon'), locatie: v('opl-locatie'), datum: v('opl-datum'),
    kenmerk: v('opl-kenmerk'),
    systeem: v('opl-systeem'), diameter: v('opl-diameter'), luslengte: v('opl-luslengte'),
    boorvloeistof: v('opl-boorvloeistof'), afdichting: v('opl-afdichting'),
    glycoltype: v('opl-glycoltype'), glycolconc: v('opl-glycolconc'),
    druktestbar: v('opl-druktestbar'), druktestmin: v('opl-druktestmin'),
    circulatietijd: v('opl-circulatietijd'), opleverdruk: v('opl-opleverdruk'),
    opmerkingen: v('opl-opmerkingen'),
    garantieH: v('opl-garantie-h'), garantieV: v('opl-garantie-v'),
    verslepingstype: v('opl-verslepingstype'), certificering: v('opl-certificering'),
    monteurs: v('opl-monteurs'), werkzaamheden: v('opl-werkzaamheden'),
    bronnen, aantalBronnen: n,
  };
}

function generateOpleverPDF() {
  const p = gatherOpleverData();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210, M = 20, CW = W - 2 * M;
  let y = 15;

  const BLAUW = [30, 58, 95];
  const ZWART = [33, 33, 33];
  const GRIJS = [100, 100, 100];
  const LGRIJS = [160, 160, 160];
  const GROEN = [46, 125, 50];

  // Footer function removed

  function h1(text) {
    if (y + 14 > 275) { pdf.addPage(); y = 20; }
    pdf.setFillColor(...BLAUW); pdf.rect(M, y - 4, CW, 8, 'F');
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
    pdf.text(text, M + 3, y + 1); y += 10;
  }
  function fieldRow(label, value) {
    if (y + 5 > 275) { pdf.addPage(); y = 20; }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...GRIJS);
    pdf.text(label, M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    pdf.text(String(value || '-'), M + 55, y);
    y += 5;
  }
  function textLine(text, bold) {
    if (y + 4 > 275) { pdf.addPage(); y = 20; }
    pdf.setFontSize(9); pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setTextColor(...ZWART);
    pdf.text(text, M, y); y += 4.5;
  }
  function bulletLine(text) {
    if (y + 4 > 275) { pdf.addPage(); y = 20; }
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    pdf.text('-  ' + text, M + 2, y); y += 4.5;
  }

  // ============================================================
  // PAGINA 1: BEGELEIDENDE BRIEF
  // ============================================================
  pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 32, 'F');
  pdf.setFontSize(18); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
  pdf.text('Ground Research BV', M, 14);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Vrijheidweg 45, 1521RP Wormerveer  |  06-47326322  |  info@groundresearch.nl', M, 22);
  pdf.setFontSize(8); pdf.setTextColor(200, 210, 230);
  pdf.text('BRL2100 / BRL11000 gecertificeerd', M, 28);
  y = 45;

  // Adressering
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...ZWART);
  pdf.text(p.klant || '', M, y); y += 5;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  if (p.tav) { pdf.text('T.a.v.  ' + p.tav, M, y); y += 5; }
  y += 5;

  pdf.setFontSize(9); pdf.setTextColor(...GRIJS);
  pdf.text('Ons kenmerk  :  ' + (p.kenmerk || p.projectnr), M, y); y += 5;
  pdf.text('Datum  :  ' + (p.datum ? formatDate(p.datum) : '-'), M, y); y += 5;
  pdf.text('Betreft  :  Opleverrapportage energiesysteem', M, y); y += 10;

  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  textLine('Geachte heer/mevrouw,');
  y += 3;
  textLine('In aansluiting op de overeenkomst ontvangt u hierbij het garantiecertificaat,');
  textLine('afpersrapport en opleverrapportage.');
  y += 3;
  textLine('Hopende u hiermee voldoende van dienst te zijn geweest.');
  textLine('Vanzelfsprekend zijn wij bereid dit voorstel toe te lichten.');
  textLine('U kunt hiervoor contact opnemen met Pim Groot.');
  y += 8;
  textLine('Met vriendelijke groet,');
  textLine('Ground Research BV');
  y += 3;
  addSignature(pdf, M, y - 2, 35, 12);
  y += 10;
  pdf.setFont('helvetica', 'italic');
  pdf.text('P. Groot, bedrijfsleider', M, y); y += 4.5;
  pdf.text('Tel.: 06-47326322', M, y); y += 8;

  // Bijlagen
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
  pdf.text('Bijlagen:', M, y); y += 5;
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  bulletLine('Garantiecertificaat');
  bulletLine('Afpersrapport');
  bulletLine('Opleverrapportage');
  if (oplTekening) bulletLine('Boortekening met co\u00F6rdinaten');
  if (oplFotos.length > 0) bulletLine("Foto's (" + oplFotos.length + ')');


  // ============================================================
  // PAGINA 2: GARANTIECERTIFICAAT
  // ============================================================
  pdf.addPage(); y = 20;

  pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 28, 'F');
  pdf.setFontSize(16); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
  pdf.text('Garantiecertificaat', M, 14);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Ground Research BV', M, 22);
  y = 38;

  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  const garantieText = [
    `Ground Research BV geeft door middel van dit certificaat een garantie van ${p.garantieH || '10 jaar'} op de`,
    `horizontale verslepingen en ${p.garantieV || '25 jaar'} op de verticale bronnen na oplevering.`,
    '',
    'Eventuele lekkages als gevolg van foutieve installatie of materiaalfouten die binnen',
    '1 jaar na oplevering optreden, dienen schriftelijk te worden gemeld aan Ground Research BV',
    'en worden kosteloos hersteld. Wijze en termijn van herstel worden in gezamenlijk overleg',
    'bepaald. Ground Research BV wijst aansprakelijkheid voor gevolgschade uitdrukkelijk van de hand.',
    '',
    'Garanties komen te vervallen indien gebreken zijn veroorzaakt door de klant, derden,',
    'vandalisme, ondeskundig gebruik, bovenbelasting, externe oorzaken, grondzetting,',
    'bodemverontreiniging of calamiteiten.',
    '',
  ];
  for (const line of garantieText) { textLine(line); }

  y += 2;

  // Project details op garantiecertificaat
  pdf.setDrawColor(...BLAUW); pdf.setLineWidth(0.3); pdf.line(M, y, M + CW, y); y += 6;
  fieldRow('Opdrachtgever', p.klant);
  fieldRow('Projectnummer', p.projectnr);
  fieldRow('Projectlocatie', p.locatie);
  fieldRow('Datum oplevering', p.datum ? formatDate(p.datum) : '-');


  // ============================================================
  // PAGINA 3: TECHNISCHE OPLEVERING + AFPERSRAPPORT TABEL
  // ============================================================
  pdf.addPage(); y = 20;

  pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 28, 'F');
  pdf.setFontSize(16); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
  pdf.text('Technische Oplevering', M, 14);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Ground Research BV', M, 22);
  y = 38;

  fieldRow('Verslepingstype', p.verslepingstype);
  fieldRow('Buis diameter', p.diameter + ' mm');
  fieldRow('Aantal bronnen', String(p.aantalBronnen));
  fieldRow('Diepte bronnen', p.bronnen.map(b => b.diepte + 'm').join(', '));
  fieldRow('Gevuld', p.glycoltype === 'Water' ? '100% water' : (100 - parseInt(p.glycolconc)) + '% water + ' + p.glycolconc + ' ' + p.glycoltype.toLowerCase());
  fieldRow('Oplevering volgens', p.certificering);
  fieldRow('Boorvloeistof', p.boorvloeistof);
  fieldRow('Afdichting', p.afdichting);
  y += 6;

  // Projectinfo blok
  pdf.setDrawColor(...BLAUW); pdf.setLineWidth(0.3); pdf.line(M, y, M + CW, y); y += 6;
  fieldRow('Oplevering', p.datum ? formatDate(p.datum) : '-');
  fieldRow('Locatie', p.locatie);
  fieldRow('Opdrachtnummer', p.projectnr);
  fieldRow('Werkzaamheden', p.werkzaamheden);
  fieldRow('Contactpersoon', p.tav);
  fieldRow('Telefoonnummer', p.telefoon);
  fieldRow('Naam monteur(s)', p.monteurs);
  y += 8;

  // ===================== AFPERSRAPPORT TABEL =====================
  h1('AFPERSRAPPORT BODEMWARMTEWISSELAARSYSTEEM');
  y += 2;

  // Naam project + locatie
  fieldRow('Naam project', p.klant);
  fieldRow('Locatie boringen', p.locatie);
  y += 4;

  // Tabelheader
  if (y + 8 > 275) { pdf.addPage(); y = 20; }
  pdf.setFillColor(240, 242, 245);
  pdf.rect(M, y - 3, CW, 7, 'F');
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
  const cx = [M+2, M+25, M+55, M+80, M+100, M+125, M+150];
  pdf.text('Lus \u00F8 mm', cx[0], y);
  pdf.text('Datum', cx[1], y);
  pdf.text('Pomdruk max', cx[2], y);
  pdf.text('Tijd test', cx[3], y);
  pdf.text('Druktest (bar)', cx[4], y);
  pdf.text('Bron', cx[5], y);
  pdf.text('Status', cx[6], y);
  y += 6;

  // Bronrijen
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...ZWART);
  for (const b of p.bronnen) {
    if (y + 5 > 275) { pdf.addPage(); y = 20; }
    pdf.text(p.diameter, cx[0], y);
    pdf.text(p.datum ? formatDate(p.datum) : '-', cx[1], y);
    pdf.text(b.pomdruk + ' bar', cx[2], y);
    pdf.text(b.tijd + ' min', cx[3], y);
    pdf.text(b.druktestbar + ' bar', cx[4], y);
    pdf.text(b.naam, cx[5], y);
    if (b.status === 'Goedgekeurd') {
      pdf.setTextColor(...GROEN); pdf.setFont('helvetica', 'bold');
      pdf.text('OK', cx[6], y);
    } else {
      pdf.setTextColor(198, 40, 40); pdf.setFont('helvetica', 'bold');
      pdf.text('NOK', cx[6], y);
    }
    pdf.setTextColor(...ZWART); pdf.setFont('helvetica', 'normal');
    y += 5;
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.15);
    pdf.line(M, y - 2, M + CW, y - 2);
  }
  y += 8;

  // ===================== AFPERSPROTOCOL TEKST =====================
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
  textLine('Ground Research BV geeft door middel van dit certificaat aan hoe het systeem');
  textLine('is opgeleverd. Tijdens de oplevering is het volgende gecontroleerd:');
  y += 3;

  bulletLine(`Het systeem is ${p.circulatietijd || '20'} min per lus gecirculeerd en ontlucht.`);
  bulletLine(`Het systeem is ${p.druktestmin || '20'} min per lus op minimaal ${p.druktestbar || '3'} bar druk weggezet om lekkages uit te sluiten.`);

  const alleGoed = p.bronnen.every(b => b.status === 'Goedgekeurd');
  if (alleGoed) {
    bulletLine('Het systeem vertoont geen afwijkingen tijdens het op druk zetten van het systeem.');
  } else {
    pdf.setTextColor(198, 40, 40);
    bulletLine('LET OP: Niet alle bronnen zijn goedgekeurd \u2014 zie afpersrapport.');
    pdf.setTextColor(...ZWART);
  }

  const glycolLabel = p.glycoltype === 'Water' ? 'water' : (100 - parseInt(p.glycolconc)) + '% water + ' + p.glycolconc + ' ' + p.glycoltype.toLowerCase();
  bulletLine(`Systeem is met een verhouding van ${glycolLabel} afgevuld en gecirculeerd.`);
  bulletLine(`${p.opleverdruk || 'Drukloos opgeleverd'}.`);

  if (p.opmerkingen) {
    y += 4;
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...BLAUW);
    pdf.text('Opmerkingen:', M, y); y += 5;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...ZWART);
    const opmLines = pdf.splitTextToSize(p.opmerkingen, CW - 4);
    for (const line of opmLines) {
      if (y + 4 > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, M + 2, y); y += 4;
    }
  }

  // ===================== BOORTEKENING =====================
  if (oplTekening) {
    const tekeningPages = oplTekening.pages || [oplTekening];
    for (let tp = 0; tp < tekeningPages.length; tp++) {
      const tImg = tekeningPages[tp];
      pdf.addPage(); y = 20;
      pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 28, 'F');
      pdf.setFontSize(16); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
      pdf.text(tp === 0 ? 'Boortekening met co\u00F6rdinaten' : 'Boortekening (vervolg)', M, 14);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text(p.locatie || '', M, 22);
      y = 36;

      const maxImgW = CW;
      const maxImgH = 245;
      const imgRatio = tImg.w / tImg.h;
      let imgW, imgH;
      if (imgRatio > maxImgW / maxImgH) {
        imgW = maxImgW;
        imgH = maxImgW / imgRatio;
      } else {
        imgH = maxImgH;
        imgW = maxImgH * imgRatio;
      }
      try {
        pdf.addImage(tImg.dataUrl, 'JPEG', M + (CW - imgW) / 2, y, imgW, imgH);
      } catch(e) { console.error('Boortekening error:', e); }
      y += imgH + 6;
    }

        }
  }

  // ===================== FOTO'S =====================
  if (oplFotos.length > 0) {
    pdf.addPage(); y = 20;
    pdf.setFillColor(...BLAUW); pdf.rect(0, 0, W, 28, 'F');
    pdf.setFontSize(16); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
    pdf.text("Foto's", M, 14);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text(p.locatie + '  |  ' + (p.datum ? formatDate(p.datum) : ''), M, 22);
    y = 36;

    // Max 2 foto's per pagina, onder elkaar, aspect ratio behouden
    const maxFotoW = CW;
    const maxFotoH = 115;  // max hoogte per foto zodat er 2 op een pagina passen

    for (let i = 0; i < oplFotos.length; i++) {
      // Check of er ruimte is (foto + caption)
      if (y + maxFotoH + 12 > 278) {
        pdf.addPage(); y = 20;
      }

      // Bereken afmetingen met behoud van aspect ratio
      const imgRatio = oplFotos[i].w / oplFotos[i].h;
      let fW, fH;
      if (imgRatio > maxFotoW / maxFotoH) {
        // Breed formaat: breedte is limiterend
        fW = maxFotoW;
        fH = maxFotoW / imgRatio;
      } else {
        // Hoog formaat: hoogte is limiterend
        fH = maxFotoH;
        fW = maxFotoH * imgRatio;
      }

      const x = M + (CW - fW) / 2;  // centreer
      try {
        pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
        pdf.rect(x - 0.5, y - 0.5, fW + 1, fH + 1, 'S');
        pdf.addImage(oplFotos[i].dataUrl, 'JPEG', x, y, fW, fH);
      } catch(e) { console.error('Foto error:', e); }

      // Caption
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(120, 120, 120);
      pdf.text('Foto ' + (i + 1) + (oplFotos[i].name ? ': ' + oplFotos[i].name : ''), x, y + fH + 5);

      y += fH + 12;
    }
  }

  // FOOTER op alle pagina's
  // Footer removed per user request

  const filename = `${p.kenmerk || p.projectnr || 'Oplever'}_${p.locatie || ''}_Opleverrapport.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  pdf.save(filename);

  // Upload naar Dropbox
  const oplProject = ((p.projectnr || '') + (p.locatie ? '-' + p.locatie : '')).trim() || 'draft';
  uploadToDropbox(pdf, filename, p.klant || '', oplProject, 'Opleverrapport');
}

