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

function updateLusOpties() {}

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
// OFFERTE: CLUSTERS + VRIJE REGELS
// ============================================================
const COST_ITEMS = [
  { key: 'boorkosten', label: 'Boorkosten' },
  { key: 'lussen', label: 'Prijs Lussen' },
  { key: 'grout', label: 'Grout' },
  { key: 'gewichten', label: 'Gewichten' },
  { key: 'verdelerput', label: 'Verdelerput' },
  { key: 'aansluiten', label: 'Aansluiten bronnen' },
  { key: 'glycol', label: 'Glycol' },
  { key: 'barogel', label: 'Barogel' }
];
const PROJECT_COST_KEYS = ['transport', 'graafwerk', 'olo'];
const LUS_OPTIES = {
  32: { 50: 172.50, 80: 287.50, 110: 460 },
  40: { 127: 632.50, 138: 805, 152: 862.50, 165: 920, 175: 948.75, 185: 977.50, 200: 1190.25, 225: 1100 }
};
const GROUT_PER_LUS = { 50:1, 80:1, 110:2, 127:2, 138:2, 152:2, 165:3, 175:3, 185:3, 200:4, 225:4 };
const BAROGEL_PER_LUS = { 50:2, 80:3, 110:4, 127:4, 138:4, 152:5, 165:7, 175:8, 185:8, 200:8, 225:10 };
const BIB_KEY = 'gr_artikel_bib';

let costValues = {};
let costParams = {
  boorkosten: { prijsPerMeter: 15 },
  lussen: { prijsPerLus: null },
  grout: { aantalZakken: null, prijsPerZak: 425 },
  gewichten: { aantal: 3, prijsPerStuk: 80 },
  verdelerput: { prijs: 1250 },
  aansluiten: { prijs: 750 },
  glycol: { liters: null, prijsPerLiter: 3.20 },
  graafwerk: { prijs: 250 },
  transport: { prijs: 1000 },
  barogel: { aantalZakken: null, prijsPerZak: 17 },
  ezmud: { prijs: 0 },
  olo: { prijs: 200 },
};

let clusters = [];
let clusterCounter = 0;
let vrijeRegels = [];
let vrijeRegelCounter = 0;

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function lusOptieHtml(diameter, selected) {
  const lengtes = diameter === 32 ? [110, 80, 50] : [225, 200, 185, 175, 165, 152, 138, 127];
  return lengtes.map(lus => {
    const prijs = LUS_OPTIES[diameter]?.[lus] || (diameter === 40 ? 920 : 460);
    return `<option value="${lus}" ${parseInt(selected, 10) === lus ? 'selected' : ''}>${lus}m - ${eur(prijs)}</option>`;
  }).join('');
}

function getBib() { try { return JSON.parse(localStorage.getItem(BIB_KEY) || '[]'); } catch(e) { return []; } }
function saveBib(arr) { localStorage.setItem(BIB_KEY, JSON.stringify(arr)); }

function populateBibSelect() {
  const sel = document.getElementById('vrije-bib-select');
  if (!sel) return;
  const bib = getBib();
  sel.innerHTML = '<option value="">Uit bibliotheek...</option>';
  bib.forEach((item, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${item.omschrijving} (${item.eenheid || 'Stuk'} - ${eur(item.prijs || 0)})`;
    sel.appendChild(o);
  });
}

function renderBibList() {
  const list = document.getElementById('bibList');
  if (!list) return;
  const bib = getBib();
  if (!bib.length) {
    list.innerHTML = '<p style="color:#98a2b3; text-align:center; padding:12px 0;">Nog geen artikelen bewaard</p>';
    return;
  }
  list.innerHTML = '';
  bib.forEach((item, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid #eef2f6;';
    row.innerHTML = `<span style="flex:1; font-size:13px;">${esc(item.omschrijving)}</span>
      <span style="font-size:12px; color:#667085; margin:0 8px;">${esc(item.eenheid || 'Stuk')}</span>
      <span style="font-size:13px; font-weight:600; margin-right:12px;">${eur(item.prijs || 0)}</span>
      <span onclick="removeFromBib(${i})" style="color:#c62828; cursor:pointer; font-size:14px;" title="Verwijderen">✕</span>`;
    list.appendChild(row);
  });
}

function addToBib() {
  const naam = (document.getElementById('bibNaam').value || '').trim();
  const eenheid = (document.getElementById('bibEenheid').value || '').trim() || 'Stuk';
  const prijs = parseFloat(document.getElementById('bibPrijs').value) || 0;
  if (!naam) return alert('Vul een omschrijving in');
  const bib = getBib();
  bib.push({ omschrijving: naam, eenheid, prijs });
  saveBib(bib);
  document.getElementById('bibNaam').value = '';
  document.getElementById('bibPrijs').value = '';
  renderBibList();
  populateBibSelect();
}

function removeFromBib(idx) {
  const bib = getBib();
  bib.splice(idx, 1);
  saveBib(bib);
  renderBibList();
  populateBibSelect();
}

function openVrijeBibModal() {
  const modal = document.getElementById('vrije-bib-modal');
  if (!modal) return;
  modal.classList.add('active');
  renderBibList();
}

function closeVrijeBibModal() {
  const modal = document.getElementById('vrije-bib-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function addVrijeRegelFromBib(sel) {
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx)) return;
  const item = getBib()[idx];
  if (item) addVrijeRegel(item.omschrijving, item.prijs || 0);
  sel.value = '';
}

function getDefaultCluster() {
  return {
    id: ++clusterCounter,
    label: `Cluster ${clusterCounter}`,
    vermogen: 8,
    boringen: 1,
    diepte: 225,
    diameter: 40,
    luslengte: 165,
    verdelerput: false,
    overrides: {}
  };
}

function addCluster(data) {
  const base = getDefaultCluster();
  const cluster = Object.assign(base, data || {});
  if (cluster.id > clusterCounter) clusterCounter = cluster.id;
  clusters.push(cluster);
  renderClusters();
  calc();
}

function removeCluster(id) {
  if (clusters.length <= 1) return alert('Minimaal 1 cluster vereist');
  clusters = clusters.filter(c => c.id !== id);
  renderClusters();
  calc();
}

function syncClusterField(id, key, value) {
  const c = clusters.find(x => x.id === id);
  if (!c) return;
  if (key === 'label') c[key] = value;
  else if (key === 'verdelerput') c[key] = !!value;
  else c[key] = Number(value) || 0;
  if (key === 'diameter') {
    if (c.diameter === 32 && ![50, 80, 110].includes(parseInt(c.luslengte, 10))) c.luslengte = 110;
    if (c.diameter === 40 && ![127, 138, 152, 165, 175, 185, 200, 225].includes(parseInt(c.luslengte, 10))) c.luslengte = 165;
    renderClusters();
  } else {
    updateClusterCardDisplay(c);
  }
  calc();
}

function updateClusterCardDisplay(c) {
  const card = document.querySelector('[data-cluster-id="' + c.id + '"]');
  if (!card) return;
  const meta = calculateCluster(c);
  const totaalEl = card.querySelector('.cluster-totaal-input');
  if (totaalEl) totaalEl.value = eur(meta.total);
  const metaEl = card.querySelector('.cluster-meta');
  if (metaEl) metaEl.textContent = `${meta.boringen} bron(nen) \u00d7 ${meta.diepte}m = ${meta.meters}m totaal \u2022 ${meta.diameter}mm \u2022 lus ${meta.luslengte}m`;
  const bdEl = card.querySelector('.cluster-breakdown-body');
  if (bdEl) bdEl.innerHTML = renderClusterBreakdown(c, meta);
}

function renderClusterBreakdown(c, meta) {
  const v = meta.values;
  const prm = meta.prm;
  const ov = meta.overridden;
  const id = c.id;

  function num(paramKey, value, suffix, width) {
    const isOv = ov[paramKey];
    const w = width || 70;
    const style = `width:${w}px; text-align:right; font-variant-numeric:tabular-nums; padding:2px 4px; border:1px solid ${isOv ? '#c67600' : '#d0d6e0'}; border-radius:4px; background:${isOv ? '#fff8ec' : '#fff'};`;
    const reset = isOv ? `<button type="button" title="Terug naar auto" onclick="resetClusterParam(${id}, '${paramKey}')" style="margin-left:3px; border:none; background:transparent; color:#c67600; cursor:pointer; font-size:12px;">\u21bb</button>` : '';
    return `<input type="text" value="${value}" style="${style}" onchange="setClusterParam(${id}, '${paramKey}', this.value)">${suffix || ''}${reset}`;
  }

  const rows = [];
  // Boorkosten: meters (auto) x prijs/m (editable)
  rows.push(['Boorkosten', `${meta.meters}m \u00d7 ${num('boorPrijsPerMeter', prm.boorPrijsPerMeter.toFixed(2), '/m', 60)}`, v.boorkosten]);
  // Lussen: aantal bronnen (auto) x prijs per lus (editable)
  rows.push(['Lussen', `${meta.boringen} \u00d7 ${num('prijsPerLus', prm.prijsPerLus.toFixed(2), '', 75)} <span style="color:#888; font-size:11px;">(lus ${meta.luslengte}m)</span>`, v.lussen]);
  // Grout: aantal (editable) x prijs (editable)
  rows.push(['Grout', `${num('groutZakken', prm.groutZakken, ' zk', 50)} \u00d7 ${num('groutPrijsPerZak', prm.groutPrijsPerZak.toFixed(2), '', 70)}`, v.grout]);
  // Gewichten
  rows.push(['Gewichten', `${num('gewichtenAantal', prm.gewichtenAantal, 'st', 45)} \u00d7 ${num('gewichtenPrijs', prm.gewichtenPrijs.toFixed(2), '', 70)}`, v.gewichten]);
  // Aansluiten
  rows.push(['Aansluiten bronnen', `${num('aansluitenAantal', prm.aansluitenAantal, 'st', 45)} \u00d7 ${num('aansluitenPrijs', prm.aansluitenPrijs.toFixed(2), '', 70)}`, v.aansluiten]);
  // Verdelerput (alleen als aan)
  if (meta.verdelerput) {
    rows.push(['Verdelerput', num('verdelerputPrijs', prm.verdelerputPrijs.toFixed(2), '', 80), v.verdelerput]);
  }
  // Glycol
  rows.push(['Glycol', `${num('glycolLiters', prm.glycolLiters, 'L', 50)} \u00d7 ${num('glycolPrijs', prm.glycolPrijs.toFixed(2), '/L', 65)}`, v.glycol]);
  // Barogel
  rows.push(['Barogel', `${num('barogelZakken', prm.barogelZakken, 'zk', 50)} \u00d7 ${num('barogelPrijs', prm.barogelPrijs.toFixed(2), '', 70)}`, v.barogel]);

  let html = '<table style="width:100%; border-collapse:collapse;">';
  rows.forEach(r => {
    html += `<tr><td style="padding:4px 0; vertical-align:middle; width:130px;">${r[0]}</td><td style="padding:4px 0; vertical-align:middle;">${r[1]}</td><td style="padding:4px 0; text-align:right; vertical-align:middle; font-variant-numeric:tabular-nums; white-space:nowrap;">${eur(r[2])}</td></tr>`;
  });
  html += `<tr style="border-top:1px solid #d0d6e0;"><td colspan="2" style="padding:6px 0 0; font-weight:700;">Totaal cluster</td><td style="padding:6px 0 0; text-align:right; font-weight:700;">${eur(meta.total)}</td></tr>`;
  html += '</table>';
  html += '<div style="font-size:11px; color:#888; margin-top:6px;">Tip: oranje veld = handmatig aangepast. Klik \u21bb om terug te zetten naar auto.</div>';
  return html;
}

function renderClusters() {
  const container = document.getElementById('clusters-list');
  if (!container) return;
  container.innerHTML = '';
  clusters.forEach((c, idx) => {
    const meta = calculateCluster(c);
    const div = document.createElement('div');
    div.className = 'cluster-card';
    div.setAttribute('data-cluster-id', c.id);
    div.innerHTML = `
      <div class="cluster-title">
        <strong>${esc(c.label || `Cluster ${idx + 1}`)}</strong>
        <button class="btn btn-danger btn-sm" onclick="removeCluster(${c.id})">Verwijderen</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Naam / Label</label><input type="text" value="${esc(c.label || '')}" oninput="syncClusterField(${c.id}, 'label', this.value)"></div>
        <div class="form-group"><label>Warmtepomp vermogen (kW)</label><input type="number" step="0.1" min="0" value="${Number(c.vermogen) || 0}" oninput="syncClusterField(${c.id}, 'vermogen', this.value)"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Aantal bronnen</label><input type="number" min="1" value="${Number(c.boringen) || 1}" oninput="syncClusterField(${c.id}, 'boringen', this.value)"></div>
        <div class="form-group"><label>Diepte per bron (m)</label><input type="number" min="1" value="${Number(c.diepte) || 0}" oninput="syncClusterField(${c.id}, 'diepte', this.value)"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Diameter buis (mm)</label>
          <select onchange="syncClusterField(${c.id}, 'diameter', this.value)">
            <option value="32" ${parseInt(c.diameter, 10) === 32 ? 'selected' : ''}>32mm</option>
            <option value="40" ${parseInt(c.diameter, 10) === 40 ? 'selected' : ''}>40mm</option>
          </select>
        </div>
        <div class="form-group"><label>Luslengte</label>
          <select onchange="syncClusterField(${c.id}, 'luslengte', this.value)">
            ${lusOptieHtml(parseInt(c.diameter, 10) || 40, parseInt(c.luslengte, 10) || 165)}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Verdelerput</label>
          <select onchange="syncClusterField(${c.id}, 'verdelerput', this.value === '1')">
            <option value="0" ${c.verdelerput ? '' : 'selected'}>Nee</option>
            <option value="1" ${c.verdelerput ? 'selected' : ''}>Ja</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cluster totaal</label>
          <input type="text" readonly class="cluster-totaal-input" value="${eur(meta.total)}">
        </div>
      </div>
      <div class="cluster-meta">${meta.boringen} bron(nen) × ${meta.diepte}m = ${meta.meters}m totaal • ${meta.diameter}mm • lus ${meta.luslengte}m</div>
      <details class="cluster-breakdown" style="margin-top:8px;">
        <summary style="cursor:pointer; font-size:12px; color:#1e3a5f; font-weight:600;">▸ Opbouw bedrag bekijken / aanpassen</summary>
        <div class="cluster-breakdown-body" style="margin-top:6px; padding:8px 10px; background:#f8f9fb; border-radius:6px; font-size:12px;">${renderClusterBreakdown(c, meta)}</div>
      </details>
    `;
    container.appendChild(div);
  });
}

function addVrijeRegel(naam, bedrag) {
  const id = ++vrijeRegelCounter;
  vrijeRegels.push({ id, naam: naam || '', bedrag: Number(bedrag) || 0 });
  renderVrijeRegels();
  calc();
}

function removeVrijeRegel(id) {
  vrijeRegels = vrijeRegels.filter(r => r.id !== id);
  renderVrijeRegels();
  calc();
}

function updateVrijeRegel(id, key, value) {
  const regel = vrijeRegels.find(r => r.id === id);
  if (!regel) return;
  regel[key] = key === 'bedrag' ? parseEur(value) : value;
  calc();
}

function renderVrijeRegels() {
  const container = document.getElementById('vrije-regels-list');
  if (!container) return;
  container.innerHTML = '';
  vrijeRegels.forEach(r => {
    const row = document.createElement('div');
    row.className = 'vrije-row';
    row.innerHTML = `
      <input type="text" value="${esc(r.naam || '')}" placeholder="Omschrijving" oninput="updateVrijeRegel(${r.id}, 'naam', this.value)">
      <input type="text" value="${r.bedrag ? eur(r.bedrag) : ''}" placeholder="€ 0,00" oninput="updateVrijeRegel(${r.id}, 'bedrag', this.value)">
      <button class="btn btn-danger btn-sm" onclick="removeVrijeRegel(${r.id})">✕</button>`;
    container.appendChild(row);
  });
}

function calculateCluster(cluster) {
  const boringen = Math.max(1, parseInt(cluster.boringen, 10) || 1);
  const diepte = Math.max(0, parseFloat(cluster.diepte) || 0);
  const meters = diepte * boringen;
  const diameter = parseInt(cluster.diameter, 10) || 40;
  const luslengte = parseInt(cluster.luslengte, 10) || 165;
  const verdelerput = !!cluster.verdelerput;
  const p = cluster.params || {};
  // Defaults
  const defBoorPPM = parseFloat(costParams.boorkosten.prijsPerMeter) || 0;
  const autoLusPrijs = LUS_OPTIES[diameter]?.[luslengte] || 920;
  const defLusPrijs = costParams.lussen.prijsPerLus !== null ? costParams.lussen.prijsPerLus : autoLusPrijs;
  const defGroutZak = (GROUT_PER_LUS[luslengte] || Math.ceil(diepte / 28)) * boringen;
  const defGroutPrijs = parseFloat(costParams.grout.prijsPerZak) || 0;
  const defGewAant = parseFloat(costParams.gewichten.aantal) || 0;
  const defGewPrijs = parseFloat(costParams.gewichten.prijsPerStuk) || 0;
  const defVerdPrijs = parseFloat(costParams.verdelerput.prijs) || 0;
  const defAansluit = parseFloat(costParams.aansluiten.prijs) || 0;
  const defBarogelZak = (BAROGEL_PER_LUS[luslengte] || Math.ceil(diepte / 8.65)) * boringen;
  const defBarogelPrijs = parseFloat(costParams.barogel.prijsPerZak) || 0;
  const diamM = diameter === 32 ? 0.026 : 0.0326;
  const totaleLusLengte = luslengte * 2 * boringen;
  const inhoudL = Math.PI * Math.pow(diamM / 2, 2) * totaleLusLengte * 1000;
  const defGlycolL = Math.ceil(inhoudL * 0.30);
  const defGlycolPrijs = parseFloat(costParams.glycol.prijsPerLiter) || 0;
  // Apply overrides (undefined => use default)
  const prm = {
    boorPrijsPerMeter: p.boorPrijsPerMeter !== undefined ? Number(p.boorPrijsPerMeter) : defBoorPPM,
    prijsPerLus:       p.prijsPerLus       !== undefined ? Number(p.prijsPerLus)       : defLusPrijs,
    groutZakken:       p.groutZakken       !== undefined ? Number(p.groutZakken)       : defGroutZak,
    groutPrijsPerZak:  p.groutPrijsPerZak  !== undefined ? Number(p.groutPrijsPerZak)  : defGroutPrijs,
    gewichtenAantal:   p.gewichtenAantal   !== undefined ? Number(p.gewichtenAantal)   : defGewAant,
    gewichtenPrijs:    p.gewichtenPrijs    !== undefined ? Number(p.gewichtenPrijs)    : defGewPrijs,
    verdelerputPrijs:  p.verdelerputPrijs  !== undefined ? Number(p.verdelerputPrijs)  : defVerdPrijs,
    aansluitenAantal:  p.aansluitenAantal  !== undefined ? Number(p.aansluitenAantal)  : 1,
    aansluitenPrijs:   p.aansluitenPrijs   !== undefined ? Number(p.aansluitenPrijs)   : defAansluit,
    glycolLiters:      p.glycolLiters      !== undefined ? Number(p.glycolLiters)      : defGlycolL,
    glycolPrijs:       p.glycolPrijs       !== undefined ? Number(p.glycolPrijs)       : defGlycolPrijs,
    barogelZakken:     p.barogelZakken     !== undefined ? Number(p.barogelZakken)     : defBarogelZak,
    barogelPrijs:      p.barogelPrijs      !== undefined ? Number(p.barogelPrijs)      : defBarogelPrijs
  };
  const values = {
    boorkosten: meters * prm.boorPrijsPerMeter,
    lussen: prm.prijsPerLus * boringen,
    grout: prm.groutZakken * prm.groutPrijsPerZak,
    gewichten: prm.gewichtenAantal * prm.gewichtenPrijs,
    verdelerput: verdelerput ? prm.verdelerputPrijs : 0,
    aansluiten: prm.aansluitenAantal * prm.aansluitenPrijs,
    glycol: prm.glycolLiters * prm.glycolPrijs,
    barogel: prm.barogelZakken * prm.barogelPrijs
  };
  let total = 0;
  Object.values(values).forEach(v => { total += v; });
  const overridden = {};
  Object.keys(prm).forEach(k => { overridden[k] = p[k] !== undefined; });
  return { boringen, diepte, meters, diameter, luslengte, verdelerput, values, total, prm, overridden };
}

function setClusterParam(id, key, raw) {
  const c = clusters.find(x => x.id === id);
  if (!c) return;
  if (!c.params) c.params = {};
  const num = parseEur(raw);
  if (raw === '' || raw === null || isNaN(num)) {
    delete c.params[key];
  } else {
    c.params[key] = num;
  }
  updateClusterCardDisplay(c);
  calc();
}

function resetClusterParam(id, key) {
  const c = clusters.find(x => x.id === id);
  if (!c || !c.params) return;
  delete c.params[key];
  renderClusters();
  calc();
}

function buildCostRows() { renderCostRows(); }
function onParamEdit() {}
function resetParam() {}
function onCostEdit() {}
function resetCost() {}

function renderCostRows() {
  const container = document.getElementById('cost-rows');
  if (!container) return;
  container.innerHTML = '';
  clusters.forEach((c, idx) => {
    const meta = calculateCluster(c);
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML = `<span class="label">${esc(c.label || `Cluster ${idx + 1}`)} (${Number(c.vermogen || 0).toFixed(1)} kW)</span><span style="font-weight:600;">${eur(meta.total)}</span>`;
    container.appendChild(row);
  });
  PROJECT_COST_KEYS.forEach(key => {
    const labels = { transport: 'Transport', graafwerk: 'Graafwerk + kraan', olo: 'OLO melding' };
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML = `<span class="label">${labels[key]}</span><span style="font-weight:600;">${eur(costValues[key] || 0)}</span>`;
    container.appendChild(row);
  });
  vrijeRegels.filter(r => (r.naam || '').trim()).forEach(r => {
    const row = document.createElement('div');
    row.className = 'cost-row';
    row.innerHTML = `<span class="label">${esc(r.naam)}</span><span style="font-weight:600;">${eur(r.bedrag || 0)}</span>`;
    container.appendChild(row);
  });
}

function calc() {
  const projectCosts = {
    transport: parseEur(document.getElementById('f-transport')?.value || costParams.transport.prijs),
    graafwerk: parseEur(document.getElementById('f-graafwerk')?.value || costParams.graafwerk.prijs),
    olo: parseEur(document.getElementById('f-olo')?.value || costParams.olo.prijs)
  };
  costValues = Object.assign({}, projectCosts);
  let clusterTotal = 0;
  clusters.forEach(c => {
    const meta = calculateCluster(c);
    clusterTotal += meta.total;
  });
  let vrijeTotal = 0;
  vrijeRegels.forEach(r => { vrijeTotal += parseFloat(r.bedrag) || 0; });
  const total = clusterTotal + projectCosts.transport + projectCosts.graafwerk + projectCosts.olo + vrijeTotal;
  document.getElementById('cost-total').textContent = eur(total);
  renderCostRows();
  return total;
}

function updateTotal() { calc(); }

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
  const clusterCalc = clusters.map(c => ({ cluster: c, calc: calculateCluster(c) }));
  const clusterCosts = {};
  COST_ITEMS.forEach(item => {
    clusterCosts[item.key] = 0;
    clusterCalc.forEach(cc => { clusterCosts[item.key] += cc.calc.values[item.key] || 0; });
  });
  const projectCosts = {
    transport: parseEur(document.getElementById('f-transport')?.value || 0),
    graafwerk: parseEur(document.getElementById('f-graafwerk')?.value || 0),
    olo: parseEur(document.getElementById('f-olo')?.value || 0)
  };
  const costs = Object.assign({}, clusterCosts, projectCosts);
  const vrijeRegelsData = vrijeRegels
    .filter(r => (r.naam || '').trim())
    .map(r => ({ naam: r.naam, bedrag: parseFloat(r.bedrag) || 0 }));
  let total = 0;
  Object.values(costs).forEach(v => total += v);
  vrijeRegelsData.forEach(r => { total += r.bedrag; });

  const firstCluster = clusters[0] || getDefaultCluster();
  const firstCalc = calculateCluster(firstCluster);

  return {
    klantId,
    klantNaam: klant ? klant.bedrijf : document.getElementById('f-klant').selectedOptions[0]?.textContent || '',
    klantAdres: klant ? klant.adres : '',
    tav: document.getElementById('f-tav').value,
    kenmerk: document.getElementById('f-kenmerk').value,
    datum: document.getElementById('f-datum').value,
    betreft: document.getElementById('f-betreft').value,
    locatie: document.getElementById('f-locatie').value,
    telefoon: document.getElementById('f-telefoon').value,
    bevoegd: document.getElementById('f-bevoegd').value,
    clusters: clusters.map(c => ({
      id: c.id,
      label: c.label || '',
      vermogen: parseFloat(c.vermogen) || 0,
      boringen: parseInt(c.boringen, 10) || 1,
      diepte: parseFloat(c.diepte) || 0,
      diameter: String(c.diameter || '40'),
      luslengte: String(c.luslengte || '165'),
      verdelerput: !!c.verdelerput
    })),
    vrijeRegels: vrijeRegelsData,
    projectKosten: projectCosts,
    costs,
    customArtikelen: vrijeRegelsData,
    vermogen: parseFloat(firstCluster.vermogen) || 0,
    factor: 1,
    bodemvermogen: parseFloat(firstCluster.vermogen) || 0,
    pompen: 1,
    boringen: firstCalc.boringen,
    meters: firstCalc.meters,
    mpb: firstCalc.diepte,
    verdelerput: !!firstCluster.verdelerput,
    diameter: String(firstCluster.diameter || '40'),
    luslengte: String(firstCluster.luslengte || '165'),
    total
  };
}

// ============================================================
// NIEUWE OFFERTE + AUTO PROJECTNUMMER
// ============================================================
function generateProjectNummer() {
  const year = new Date().getFullYear();
  const prefix = 'GR-' + year + '-';
  const offertes = getOffertes();
  let max = 0;
  const re = new RegExp('GR-' + year + '-(\\d{3,})', 'i');
  offertes.forEach(function(o) {
    var m = String(o.kenmerk || '').match(re);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });
  return prefix + String(max + 1).padStart(3, '0');
}

function nieuweOfferteBA() {
  // Reset alle offerte-velden
  document.getElementById('f-klant').value = '';
  document.getElementById('f-tav').value = '';
  document.getElementById('f-datum').value = new Date().toISOString().split('T')[0];
  document.getElementById('f-betreft').selectedIndex = 0;
  document.getElementById('f-locatie').value = '';
  document.getElementById('f-telefoon').value = '';
  document.getElementById('f-bevoegd').value = '';
  try { document.getElementById('f-transport').value = ''; } catch(e) {}
  try { document.getElementById('f-graafwerk').value = ''; } catch(e) {}
  try { document.getElementById('f-olo').value = ''; } catch(e) {}
  // Genereer nieuw projectnummer
  document.getElementById('f-kenmerk').value = generateProjectNummer();
  // Reset clusters naar default
  clusters = [getDefaultCluster()];
  clusterCounter = 1;
  vrijeRegels = [];
  vrijeRegelCounter = 0;
  renderClusters();
  renderVrijeRegels();
  calc();
  switchTab('offerte');
}

function saveOfferte() {
  const data = gatherOfferteData();
  if (!data.kenmerk) { alert('Vul een kenmerk in'); return; }
  data.id = Date.now();
  data.savedAt = new Date().toISOString();
  const offertes = getOffertes();
  offertes.unshift(data);
  saveOffertes(offertes);
  alert('Offerte opgeslagen!');
}

function renderOffertes() {
  const list = document.getElementById('offertes-list');
  const offertes = getOffertes();
  if (!offertes.length) {
    list.innerHTML = '<div class="empty-state"><p>Nog geen opgeslagen offertes</p></div>';
    return;
  }
  list.innerHTML = '';
  offertes.forEach((o, idx) => {
    const norm = normalizeOfferteData(o);
    const meters = (norm.clusters || []).reduce((sum, c) => sum + ((parseFloat(c.diepte) || 0) * (parseInt(c.boringen, 10) || 0)), 0);
    const card = document.createElement('div');
    card.className = 'offerte-card';
    const d = o.datum || o.savedAt?.substring(0, 10) || '';
    card.innerHTML = `
      <div class="offerte-info">
        <h3>${o.kenmerk || 'Geen kenmerk'} — ${o.klantNaam || 'Onbekend'}</h3>
        <p>${d} · ${o.betreft || ''} · ${meters || 0}m · ${norm.clusters.length} cluster(s)</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="offerte-amount">${eur(o.total)}</span>
        <div class="offerte-actions">
          <button class="btn btn-primary btn-sm" onclick="loadOfferte(${idx})">📂 Open</button>
          <button class="btn btn-success btn-sm" onclick="pdfFromSaved(${idx})">📄 PDF</button>
          <button class="btn btn-danger btn-sm" onclick="deleteOfferte(${idx})">🗑️</button>
        </div>
      </div>`;
    list.appendChild(card);
  });
}

function normalizeOfferteData(o) {
  const data = Object.assign({}, o || {});
  if (!Array.isArray(data.clusters) || !data.clusters.length) {
    data.clusters = [{
      id: 1,
      label: 'Cluster 1',
      vermogen: parseFloat(data.vermogen) || 0,
      boringen: parseInt(data.boringen, 10) || 1,
      diepte: parseFloat(data.mpb) || ((parseFloat(data.meters) || 0) / Math.max(parseInt(data.boringen, 10) || 1, 1)),
      diameter: String(data.diameter || '40'),
      luslengte: String(data.luslengte || '165'),
      verdelerput: !!data.verdelerput
    }];
  }
  if (!Array.isArray(data.vrijeRegels)) {
    data.vrijeRegels = Array.isArray(data.customArtikelen) ? data.customArtikelen : [];
  }
  if (!data.projectKosten) {
    data.projectKosten = {
      transport: parseFloat(data.costs?.transport) || 0,
      graafwerk: parseFloat(data.costs?.graafwerk) || 0,
      olo: parseFloat(data.costs?.olo) || 0
    };
  }
  return data;
}

function loadOfferte(idx) {
  const o = normalizeOfferteData(getOffertes()[idx]);
  if (!o) return;
  document.getElementById('f-klant').value = o.klantId || '';
  document.getElementById('f-tav').value = o.tav || '';
  document.getElementById('f-kenmerk').value = o.kenmerk || '';
  document.getElementById('f-datum').value = o.datum || '';
  document.getElementById('f-betreft').value = o.betreft || '';
  document.getElementById('f-locatie').value = o.locatie || '';
  document.getElementById('f-telefoon').value = o.telefoon || '';
  document.getElementById('f-bevoegd').value = o.bevoegd || '';
  document.getElementById('f-transport').value = eur(o.projectKosten?.transport ?? o.costs?.transport ?? 0);
  document.getElementById('f-graafwerk').value = eur(o.projectKosten?.graafwerk ?? o.costs?.graafwerk ?? 0);
  document.getElementById('f-olo').value = eur(o.projectKosten?.olo ?? o.costs?.olo ?? 0);
  clusters = (o.clusters || []).map((c, i) => ({
    id: c.id || (i + 1),
    label: c.label || `Cluster ${i + 1}`,
    vermogen: parseFloat(c.vermogen) || 0,
    boringen: parseInt(c.boringen, 10) || 1,
    diepte: parseFloat(c.diepte) || 0,
    diameter: parseInt(c.diameter, 10) || 40,
    luslengte: parseInt(c.luslengte, 10) || 165,
    verdelerput: !!c.verdelerput
  }));
  clusterCounter = clusters.reduce((m, c) => Math.max(m, c.id || 0), 0);
  vrijeRegels = (o.vrijeRegels || []).map((r, i) => ({ id: i + 1, naam: r.naam || '', bedrag: parseFloat(r.bedrag) || 0 }));
  vrijeRegelCounter = vrijeRegels.length;
  renderClusters();
  renderVrijeRegels();
  calc();
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

// ============================================================
// PDF GENERATION
// ============================================================
const HEADER_DRILLING = 'data:image/jpeg;base64,/9j/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAHTBXgDASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAQIAAwQFBgf/xABSEAABAwIDBAcDCAUICAcBAAMBAAIRAyEEEjEFQVFhBhMiMnGBkUKhsRQjM1JicsHRJIKy4fAVNENTc5Ki8QcWJTVEVGOzJjZkdJOjwkWEw9L/xAAZAQADAQEBAAAAAAAAAAAAAAAAAQIDBAX/xAAwEQEBAAICAgEDBAEDAwUBAAAAAQIRITEDEkEiMlEEE2Fx8BRCgTOx0SNDUpHBof/aAAwDAQACEQMRAD8A8UiFFFBiCjKUIoBwUZSKSkDymBVcpgUBYCnCpBTgpHFw8VY0qgFWBTVRdNkIQCdoUqDKiGlO1qtFOQls9KkzWniiWQUDomRyAREKl7CDYJwY3piQRdOcFeWeFIVjo3JVW0aCFEVEySEVEQgAijCiACKiMICIqIoCKQiFIQEARUARQEURhFABQIowkYKIwogJCiMKQgIFEYRhABFGEQgBCMIwpCAkKQmhRIywvD4vtdL3jjjAP8QXugLjxC8Ie30vvvx8f/YrxKveEfOP8T8UwCmrj4plmpA1O1jiQANTCUGFb8pbhqNSu/Six1Q/qgn8FNVHzTb1f5RtzHVNR17gDyBge4KraBa1mDpNcHdXh2zA3uJf/wDoBZSXPMky52pPErVtP5za1emDmy1OqaZmQIaNPBdPzIy+K9n0RwvyfYfWEdrEVC/9UWH4ruAXSUqQoUadFulNgb7rqwGFz73y1vHDJtTGfyfszEYkHttblp/eNh+J8l4TZGEqY/HspUj87VeKNMm8OcYnyEnyXa6Z475yjgmExTHWVPvHT0HxVnRHAuaKuIIg0aeRpP8AW1be5gcfNO3WOynNelmm6o51EZaNm0m8KbQGsHoJ8SVZTgVGk6AyfK6QATAEDQeCzbTxIwmyMdXzAFlBwaftO7I+KUmpoW/LxGHxBqbMxDJh+OxYc/mxgLvi5eg6GYb9DxePeBnxFXq2ng0Xd7yF5vZ9F1UZWNJ6rDVH28z8AvX9Dzm6L0fs4iqPUNVZXsRR0wqBuzMPRn6avmI5Nb+ZC8Ce+F67pjiM+06OHBth6Ink5/a+GVeRPfV+PpGaO0Cn9GPEqO0b4I+w1aINS9pWjunwVdL2lcB2T4KL2qdMh1R9hR2qnsK0uw5nzdMa9kH3fvRc9tMS4wCIPNSs4U6DXCMrWMiN8tC5lau6s6XGwEABc2ONydGWUxW4rEdbUOUQBYLPn1k6pJUldEmmFuz5hGigqRuCQlWVKJawO3TlnyRwSdaCLi6HWN4EKtRGhteys5plryPNdLB7U6t7TXphzQe+zd4hcbRM1xaZBIPJTlhL2qZWPor6zMT0T2qKMvYcO2t1kdkkVBYeC81h2UzsnawyA1W4drmnfHWtDvwWvYG16mKoYzZDmMYMZhXsBaIBe0BzXRxMQTvtvWDBVAcJtKBE4R1v12FcuGFxtxv526MrMptyG1jTqh0Alpleg2DVo1a+JrdfXwrsPS601KQGfIHDO2Z32APNecMZj4rsbEYfku2HgCaeALmngetprpzxljDDKyvqbrVHjTtGwQOk2k75QpOq1sPRrYnL11Wkx9TKIAcWgn4qEbp3b9V5td8A29EjiY/eiXRxO4SkduMyoq4Vzsu9IHWMzCR9hAmNNVTmPWHcBv4FRtWm9jhvhXNuNOYKwsqHsnctLHk6gm+5OUWNO6+iYwBM+qRrpGpnluTH08FpKzsQGWi14UjlCFzOngoNOXxVyp0sAlMBJgpBryVgVSpsMpusiLoxKqUtBCMW4IqBMk8kVIRiyZJ4KQioByugAAjCKkIAIwoEUAAjCICiACICkQmagCGSmLABqlkjQoFyRpACBAUJSkpGBSFElISUjQkJS6dESCVMqkyQSUWsPBWNanAO4JGQU41UITueAFS6pKVpyGiN6aQAqs9kMynZ6W5gEesCokqXS2elpqJc8pYUa26Wz0IujllENI0TCUjL1aGVWSpEi4QSsTKYNVjWb0cpQFeWyQhX5ZCrLEwrUhPG5TKkCEWsi1PlhQ6JgpCB1RJSzZAQqZoCUmVIKWwOYlEBEMVjWoCMarmtStarmtKcKhCcBQMkJspVxIQpYaKFQNJVEJclzSrBRJTigmSi6LQSVoFJouYRyAIBOqERN0OpHG6Y21KRzo0N0BDR4qFkJDVKU1uKRnDBKhOWwVRreSqdX4JGuLlWTOqodWO8qt1YhLYaHNaNSosTqxO9RI3zBBRSF6jzURQhFBiopCMJAIRRhGEAAnBQhEJGdpVjXKpqsapqouaQU41VTVa0Kapa0rQx25craWLdgcBUrMEvkNbO4nesGG6SnL+kUbjVzD+CPW2bg9pLp6aAUjmABYcPtPD4r6Grfg6xV7qjt6UlO2CWwkJKBellXEWjKKCiaRRURQEUURQEUhFRAREKIoCIqIhARGFEUAIRhFFABGFEYQARhFRASFIRUQAhGEYUSCQpCMIgIMITKAIoCQpCICKRgAjCKko2NI0dtviF4TBs63pkwa/ppd6OJ/Be+pfTM+8F4PYfznS2k4f1tR3ucVWPVKzmPctFk0IN0CshQosLmdJMT8m6P4q8OrZaLfMyfcD6rqLyvTbEQ3BYUHc6s7z7I+CrHmleI85s0ZtoUTFmO6w+DRPA8FbsWkcbt7CNd2s9UOdPqVThAG0sTWMjJTLW2m7jHwldfoZheu2w6tuw9Iu13mw+K0y6qcfh7onM8u4mVA5rAX1DDGAuceAFyiBFuC5HSnGfJNjGk0xUxTsn6ou78AsWjx1esdqbWfWq2FR5qO5N4ell7zZVA4fZuFY4RUcz5TV+/UHZHlTA/vLxuwMAMfjqdKoctKq/5x31aTRmqH+6D6r6DmdXe+s9oa6s41C36s6N8hlHklnfqk/B4zhTWr0sLRdWxFVlKk3V7zA/zXlule18NiMDQwuDxDKwqO6yoaZkADug+ZJQ6aYsvxdLAscQ3Dtzvj67tPRvxXliDqT6rTGfKL+HtOhOzBXw+LxVTumg/DsHF7mOHuB94VvQSq2psfEYd5ytpYgPcTuaWXP+FZeh22sW3EYXZbadKpRc9zwMuVwMSTm36b1mxVV3R7ae3sI3uY6geoIMWc6R5wXDyWc5yyx+e13iSuRtLFnHYrE4x1jXqueBwG4ekLle0tWIMMa3gsrdSt8OmWfaP9kckT3Qg/vDwRPdCtB6XtK/+jPgqKW9aCIpHwUXtc6Y3a+SnsKO18lPZVodLGPJwtIDulrPXKuct+JP6HQE3gH3LDCzw6Xn2VSFcKB1ccqYMa090nmVftE6ZgJNlur5DgmBmcvzyZFtFQ4EiNPAK94DcECWmes73kpt6OfLJkd9V3olNt0LZTrsnvgeK10XNqHKHMdykFFysEx246gXd+QYd5IqUy0zEssVmx2xauFpOr0nddhxGZ4EFk/WH46JTyY26O4WcqtkOcNrYQtcWnrWtBBiJMfitFNtXBVcbh67XU6raVWm9rhcEESCPJc2m91Co17bPYQ9p8Lhd/bgDOk+1w4959bW+rZSy7/z/Pk8bw4lcBzszchn6pXR2LT2hWobSoYDAVcWa2F6up1YJNMZ2un/AAwsjcM2rIFjxXW2PiK/Rna2Dq4iPk2MoNe/KdabiYPiCJSuXGp2cx55fSaDXfJMNnaWvFGmHNcILSGNBB8wnLbap8sbwZ0I380sSJIAncvOdsUlsHySv3GD8VY4CTPokd/ACmrjHUsTyWc2Oi11BCxvkGPcFnVw7HXibhaab4dvWPMN9/BX03XgXS2em9hk6WVrTaADKzU32tdXh1yRpyWkqLFh1/ciLSkETA0CsAsq2kWidPcnaJGiVrY0VjRedSVcqaYIqBGFpEUNURopGqYBMgiEUbKX/wA0yCNEyiIHJMghHKjCnkgIApCIHFNZIFiUcqkqF6NnpIKBQL1JKWz0kKRZEAmykGUtgpCUglWkJCQBqkasjklITOdCQvS2ZgJTBl1V1kaIGoSls9LzlbzVT63BUueSUsyotVIcuJ1KXegAU4Yp2rSASmDUQxMGpbMAxEMTgJ2sJSCsMThllc2kn6tPRbZ8iGSSry0BAAIG1YZCgarQhZAKICEcdExU3JgkoFpKfKlkoCZWi6qe6DZOZIVZaZSMhcVJKfqymbRJSCi5TBhK0toclYKKBtk6o8Ewp8lrFFWNoDgnotsbaZO5XNo8lqFKE4bCcxL2Z20hwThitDUQIVyJ2QMRyJioJKpIBg3iU0ABBKTzTBsymdVklQERdAEuQLyq3SDfRI6pzhAO+oqn1JSOqNuqn1J0U2qkO6oqnVuarc/mqnGVOz0sdVnekNVVkHghlKWzM6pZI55JRFIlMKJS2NKrlRaBRncogPmGVSE6kL1XmlyqBqaCiAgAGogJgEwCRkyo5U4amyoCvKplVuVHIkasBWNCIana1KmLQrGoNCcCbKVOP0jrNZs9lInt1HggchvXnmCKYcBpY81p2nijtLaR6qSy1OmI3f5psVQ6kNLO1SjLrvW+M1NMcruseUh5aCRvatGH2li8PTPVVnBo1Bv8VnJIY1wF2GCpHzjgLBwsq0W3ao9IjYV6DXfaYYXRw+1cHiDlZVyng8QvI6tne1SwDTuNiFPrD9nuokSCCORlFeJo1qlGpNOo5jtxBXTw238RSDm1QK/3jBHmlcaNvSBFczDbdwdaA8upOOuYSPVdKk9lZuak9r28WmVOlGRhSIRSAQijCkICQjCICMIAQojCMIAKIwpCRiiEIUQDIwgCmCAikKIhASEVFEBIRhQIwkARRhEBBgEYURlIJCCYqBLatIASiAmCmpS2ekZao08DK8J0SHWdIabjup1HH+6fzXuXHJTqO+qxx/wleL6FNnbTzww7z8Fpj9tTl3HuGiAE0cEzBuTuaALBZey/VQQfNfP+lWJFfb+JAMtoxRH6ov75X0UZWuD3CQztHyv+C+S4is6vXqVn96o4vPiTK18XN2z8nEWOyM2a0Wz1KhOgs0CPiV6/oPhcmAxOJMTVeGA8hc/gvG1XucKbHGRTblaBu3/ivpuwMH8m2HgaUAOfT6x3i4m/oAn5bqaPCbrXUqUcO1rq9alSa4w01HhoPqvD9KscMftQigespUQKVMtuHcSPErJt3H/yjtavWaSaTTkpA3hot79fNc9pLHAtJBBsQpxx+Rb8Pb9F8AKWFqvIM1SMIw/ZEPrH3Mb5len6tjWl9UwxoLnk8BcrldE6rsVgKdJ7Wh2HaWNc328xzOcecx6J+meLGB2H1DD87jHdXbcwXcfgPNc8y9stOj11HzrHYh2MxlbEOcc1V5ffmfyWV4cN8q03dKDGmrVaxurjAXVLpz2bex6C7NacPito1mloZTIpOmCHyBY7jdcnpriHu24KZAPyemwB8XMjNde82fgBs/ZGEwrAWuqxWqMBsTENMbjE+5eA2/Up19v7TrAywVeqHPKA38FzeG7yvkvy18k4mH4cGtUFS4VQ0KLrOIGiA1hd0mo5LdpU7yJ0A5IHtPTPEWTBqWpWl30R8FmpalaT9C7wWeXa8emJ3eU9hR3eR9jzWiG6uCaFKTORg3Kqi0Bpdqd3JXD+b9u5LRA9Vlc8hkCwmFlJxppfyd1Vrd8nkqzXdHZAHM3S0qZeTyT9Wr1Inmqsz3G5JVjjJAvBOiYMAOibICQQLhGyL8nnQ+qnyRx0IJWhjZkTuVxpubSD2wSLwQlbTkU0amPwjHFuc0xqHDM39y9H0c21h8Rivk9QChVrNNMF5mm8ndJ0ngbLR0Qx9KnUqVCHO6um+o+m1suLWiSBOvxhePx7QzaFeA0Nc8uGXQA3tyusLJ5bcLNfy2l/bkylbekGBpbP6Q4jD0qTqVIdW4U3atDmtdHvTbbxjsVtrE1Ks54FMk7y1obPuVWMqYza+KoPqszYjqmU8++plEAnnAA8lRjRUbj6xrtcKnWHMCwtvvsdFpjOt96Rb3r8tVFkNvwXq+kOyjjehWysdTb89gsMwvj2qbtfQwfNeSbiG/J3RZxG8L6zgKHVbKwWFxDMwbhadOqwjUFnaHoYXP5MrjlK3wxmUscboZtT+UdiCjUdNfBxSdxLD3D+HkF3y2G39+9fPtiZujPTWps+s89S9xw5dNi116bvgvoDzlmdRqsvLJMuOq08d3OVLyBIifLRVOdBE7/QIvcXcCq5l1jB8FhW0JUB1sFkf3rCPNa393+JWaoBntF/40UVcUzHmrW3iQDuuqrEyIFlYy0GxUKa2HUjTetTSYJWRg0EGyvabcOKuVFXCZHHgVa0wb7lSDaNysBIIhXKmxe3Ugapgqg4Nv7IExrKsBkFXKixYEyRp9Ew5laSosEJgEND4pgqSkWUhGEbJgBZMEBYaoygkhT3I6KEFACUJUUhGzSUpRQU7NGhOAlEeKsDgNyNmkEKFwAug544KlzktjRnVJVRcUHOHFLmU7PRiRvSnklJSyUtq0YkKsuJKOqgCm09BEpg1FrLq1rVJlDVY1nBM1ivZTgaICnq4TBl1pFOyZtMJ6LahlI8Fa1kK0NRDU5C2TLChk7k+WUchT0W2cslTJG5aC0BI5wCNHtQ4QoGzvTmEQRCk1eRAtKtDZTBnJGhtQWlLlC05EBRuEaG2bqy5O2hyWptGFYKSfqPZkFBWNpQtYpJhTHBOYp9mYUk3VLSGIOgK/VPspFPkmyxonkJcwnVPRbKQpEJpASOeEaGxhAuACrL+CQklBrTUACU1JShpKhbxCCQvQzXRyIhsaoAKFh4pswaFU+qNyVpi5gO9Z3thR9Y8VQ6oSdVNyVIjjEqlxTxKmRRtSmEYT5UQ2dEGTLO5M2mnFJx3K5tAxfRBKcgGidjfsq9tCLqwUSRojQ2zxPJRam0FFWi2+NworMpUDQV6bziwpdPlhHKkZE7SVMqYMQDNhOGylARBISBw0IlqAdxTgglBhlUDU8X1TgBIEFll2pi/kWz6tUECo4ZGeJ/ISt0BeV6S4k1Me2g10sotAgfWOv4J4zdFuoybPaKTa2MdpRbDebjonwFUVsPUwtSJPaaT71Mb+j4WhgxrHWVPE6LEx5pVGvGrTK2ZrXtiq9jhB0KrgmnzplbcbTD2CuzeB5hYybh+uaxQQGOsn2XhAAhrmbwUSLOYTpcFQklrXjdYpgCZa1w1FlPbBtB4IgCY9l2nJKASwje1AECC4BM17msBa4i94KEjM15uDqhGUua4W/BAdPD7bxlBwaanWMAs1wldPD9JaDx+kUXMJ3sMheagkkAyW3bzCIcM9+69T6w9vcUsfg6xa2niabnO0EwVpykahfPQ4gSJDm7wteH2jicK/rKVV0xoTKm4H7PbgIrzmF6TVGkjF0g8ahzLFdPDbdwOJAHWGk47qg/FTZVbdBNCDS14ljmu+6ZRi6kJCkIogIMIUhMogFhMoogCiEAEwCQRSEQiEGEIwmAlMGyls9EhGE5YhlS2eiqJ8qUhGxoEQUpRElIxlEFQBMGpbPTPjn9Xs3GPHs4eof8JXleg7Z2lincMMR6uC9NtiWbE2g4/wDLuHrA/FcHoGwHEY9x3U2D1d+5XL9FLX1R7NogqOcNEYtACgp35rDbXTnbbr/J9gbQrAwepLB4uIb+K+X6le+6cYnqNkUMMDDsRWzEcWsH5n3LwW4rq8M+nbm8t+rSyhRdicVTpN71V4aPMwvq3SGs3Zew8S+n2HBow1EC1yIt4AFeD6GYT5V0mwzj3KANZ36ot74Xa6cY/rsZRwTTag3rKg+2+/ubHqo8vOcjTxzWFrxzteSswtE18TTpgTJ0SuXd6KbOOL2g10GGmZR5fJMMLlR48PbOR7rYGBOAwhzGSYA5cV47ppj/AJZtyrRY6aeEAoNjSRd5/vGPJe9rYlmz8HUxDo6vC0zUIO+NB5mAvkdV7qji+ocz3EuceJNz71zfp8bJu9t/Nlu8Kt112+huy/5U6Q0GO+jYcxK4jjaOK+idCMAcBsWvjH2fiT1bLd0e0fRa+fLWGp3eGfjn1b/Dq7a2oMBgsdtL2mj5kfaPZpjy18l8pqk08NSbMucMzidSSvWdM8d12MpbMYexhgKtYcXkdlvkPivHYp+eqeDQAFfix1JEZ3tm3omBA3oNubqTLpXSwCcr5TOMlIdSimSyjqVqcPmHeCzUdStLvoXeCzy7aY9MLu8j7CDu8j/RrRmZriAPBQ6QpHd8FEjacMz5lx5qOar8IB8md5pHEAmSst81priKsqYNhTrG8Uetpj2gqSsYI5+KvJPyd5AkwqG1qJI+cAstFJ7cruqcxxI0mUqcdboY9rNrUQ8SCHEtOmgC43SLZbtkbbxWEeSWtdNNx9phuPdbyXd2TRezatCpRkZDLstuzYz4bl7rbmzcFtekKOMozTcwPpvH0lPMJkHlw0XLfJ6eXf5jeYe2GnxulUYWGnUBIgwW6rTtDFNxuOqV2tc1jzmaHmSBAH4LXiujG08HiqlIYKvWpsqZBWp0y5rhuNtJCz7QwWKwIosxOEr4cw6OupFmaDeJ11XTvG3hlqycuj0d2HT24KlL5R1L6LxVJLcwLbCI4zG9fUKlUVajnkC7pheD6BVm06+Lovyh9aiHUp1MHtAfHyXtw7wiy4vNbcuXV45PV4z/AEg4Etfgto0xDr0Hmd47TD8fReowe0BtDZuFxgH09IOcAfa0d7wVm6R4T5fsDHUGiXtZ1zAPrMM/CVx+hWL67Yj6Bd/N6xIt7LxPxBRfq8cv4E4z/t6AkaSRf1QIsLeaD3Q03k66JWk+Flz1tBcDe+5ZKkSSNYkwtBBAMgzzWV546clNXCCSRbmFcwQQZ96qA3eeiupi4g/vlQpoZFzAHkrGg7/XilY2ATB4q1oyxed6eyO3SZkcArBHG45qsQI/yTjUTZVKmxcN0m/FO2wEacAqQYEapmnwjRXKmxobA09yaJ+Cqab2Aub7pVoI0B0VyosOBKIhAJo5LSVGhFlB/BUjfNvijrcQVWySATzCJsLBDkojZAHSZUklFGEGVH3pgy8JsgCQVXKgsmcVWSVOzPMBAvG+6rJMpTJStVpHv4FVE31TlpUFOym01JTBqt6uFMoCRq8qGVXABSEgpypgxWhqcMSNW1itbTlM1nJWtCchbRlMKwBAJwLqpCENVjWINCeYVSJSAohKkJkNggXwpChakFRJKUtV4ZKbq+SWj2zZJTCktIpgahOKY4J+o9mcU7JxTCvyckcoT9S9lHVJhTVsckYT9S2rDUwCJcAq3PJ0T0SyQEC4BVElKXcUwsL1U5yEqCToEAMyBcU2QlM2ndIKrlHITuV2UKE5UBWMPxKYUmj96HWkaBL1jijcPlYQBoJSucOCqLjxSl6m5HpYXib3Vb6qqc8kpYJU3JUguqSqiSeKsyE7kwbCk2fKSh1Z1ha8s6KCmUaG2XJ5I9UStYo7yEwpngjQ2yDDDerBQAha20kwo2VTFPszNYAdFc1s2AVvVAbkbDeqmJbJkgaKZUznho1CqNcJ6I+QqKk1XE2cog3yU0xFkmRaMqGVdriZyDwQWgsSmmgKweKcQlLIQuEBZAUISSUQ470AQ1MAgCmlICEwJ4pZTDVBpVrNwtB+Iq9ym3MefL1XjsEz5XtHrKvdBNWoeA1XZ6SY3q8NTwrT2qpzv+6NPeuQ0fJtlE6VMU6P1Br71phOE5Xlnr1nYnEVKztXmY4DcqnWTJHGSrQ6ezqorUTQeJcwEt5jeFjqUzSe+m7ySUajqFVtRneaZC6OOY2tSZXpNkOvPAcPJAc4mMrhqLFEdlzm6NeLIEWFtDdDVpG9twmSQerI3tMwiTDg7c7VQntBw9oXSwQHNjRAMGiSyeYUzdkOIu0w7wQ7zARq1MTJnc8QfFAS4B4suOYQcNw0N28lAYgn2bFHLq0atuDxCDCQYdxsVBLZ3ltj4Im2nceoZBuILbHmEgHncXChIOU8dVACLDUXCOW8CIdceKYWUcRWw7nGhUcxw3tMSF08N0lxlEMFQtrMFu0L+q5HB4EA2I4KBty0ix9xU2SnLXrcN0nwtQO+U03UHN0y9qV1KONwuIDeqxFMl2jS6D6L58Do8ictnApm2e4CRaWlTcPwfs+jljhqCEIXg6G08bhyDQxNQSJIJn4rrYfpZWDw3EYenUbGreySpuNVMo9Moudh+kWzsQWgvfRJ/rBb1C6NKrSxDM9CoyqziwyoMQmCkXRASMcspg1KoCUlHgAJmG90gKYGUjXSEBllIASiBCRrMoVbmSU7SmmUjUCkrG09E4CIKVMBSTdWmDoRDiSkbkdJx1XRraBFiWMb61G/kuT0Ap/MbRqcXUm/ErpdMqmTozWH9ZWpM/aP4LN0AZ/snGO44ho9GrT/ANqo/wDcj1ApzuRFOL8laBZM1oc9rToSAfDeufbZ836dYnrduMoDTC0WsP3j2j8V5mCGjmZWzbGL+W7VxmJmRVrPeI4Tb3LPXYaT20yC0taJBM3N/wAV6OM1jI4sru2vY9AaNOjQ2jtGvanTAYXfZALnfABedxuLqY7GVsTV79Z5qO5E7vIQF3esOzOgeEw+lXaVR9Q/2YP45QF5smZKw7ytbdYyENzA32X0Pohgjh8OXuAuNV4bZeHOJ2hTaBIBkr6lgKPUYSkGghzhMLl/U33yx8f/ADW/h+nG5uP01x3UbJpYRph2Kfmd9xn5uI9F8/cbru9LMcMZt2uGGaeGAoMj7Pe/xE+i8/UdC6cJqMcqegGuxLA/ugiV9KwG2cNhuj+IxLgHYfZvZJ066qQDlH+Eeq+YU3PzdgEuNgBqTwXpdt1PkuFwXR+iQaWA+dxbho/EuuR+qDHql5PHMspb8HjnZNRyKtWrWbWxFd2avVcalRx1zFcx5sea6GJOWh94rmuuQFt4+eWWf4TRqDVHaKNsB4rRmESoiDqoN3imSyl3j4rS/wChd4LNR7zvFan/AELvBZ5dtMemB3eTf0aV3eTf0a0ZiNGeCiPss8PxU3jxSNppucaXVtMA70rqJJ71hxN1cQ2mIGg1JOqpfiGiwv4LOfwu/wAgKLQbu9yIoibH3Ko1nTaAOCnW1Pre5Vynhd1E2t6IjBFx7JEqkVqw0fPiFfTx9Wm5pexrspm1kXfwfDoYLF4zY9SnWr0aj8O0iKjDIH4eRX1GntDCbUweHxWBq9bRNMU5iCCBcHgV4LYO2MI7sF4ovg9ioJDuPI+C9ngtl4XZ1XHHBtFOliH06rWNHZZLJOXkZlef5rvLmars8c44u40VGsNRjixrnNNnEXHgsW1Nk4TbNFtLGMJeAW06rSc1IkiSBMHTetronjfgpT7RF7BwAPNZy2cxpZvivEdF6HyTpY/D584wzK9PNETAiY3L3UiNdLheK2IY6eY6B3nYga8l7Mm1tCr8v3f8Jw6Rr2gtD+7MEcQbH4rwvRcHAdINobOJ1D2Ac2Oke6V7KqdbmSI8l43aB+QdO8PiTAFV1OobROYZXe8FHj5mWP8AAz4sr1TvgbxZQGDeUtQlvYJiDFylLiDI95WFaxdPZiIHE71RUAzTpOpRNSNdW6qtz76xfzUVcSZMg25K6mLefDRUNgka20V4ncCeEqKtpbaAN3NMH3iFRyPgmzReP3pbGl7H6SrMw4LJmymRdOx8zbTiU5SsbJ3jcmF9CZKqaSTpc7iYTtOm/mrlTYuB0/FWNMnyhVNiefBWjyhaSoq1p3XTjRVtsnBmy0lZ00xxRnel8Ed6tIgkzZT3KAf5polMgAJFhCsAhACFJA1ngjYGQlN03mgRwCkyGEhjcExaShEG6SixyQITucAEhIKk0AkSpohKICWz0UyhBVmQlN1dkgqDUwCfIma1Bla1WZUQ0wnDeKCLCYNRDUwEJkLQnFlGiU7WFVCpQ2VYGFOGwjlV6TsgamDTwVrWJ4AT0nagUyj1VlegdE/UtqRTVgYjYIZkSDYwFIS50C9MHQSZuahcgLCQN6rdUEpDJSoB843hTMIsLqu6aDGiRgXEoBvFGDwROlygFIEoggDW6WJTgCNEjDMIkI54CRxCrLuaVp6WGqlL9VVmKQklT7HpbnhKasquCU+UqdnoC9CC7cnDJTCkRqgK20wNU2XgrhTPBHqk9FtQRCYeCu6nkmbTCchbVtYeCcMurQxEN5q5C2TqxvRygbkxIG9VufCZCYCR1YBK6oFS+sDYXSC11cngFSXOcfFJ1gG66BxDh3QAkazIT3nKFlId558lndVc43KrJlAai6k3S/iosuu9RBvncIQmhGF2OMkIQrIUhAVlspDTV0KZUBnyIZeK0lspHMhAUxCglNChQBCsa2bA6qpY9r4z5Js6oWyH1fm2kbp1PoichwsfVO1dsRSFiRTZ4C0qvH1W1cUW0/oqQ6tngN/qmwI+TYWvjNHAdXS+8d/kFkAgLdmDjASAIuMnwRQSBdHZlUOa/DP9rtM8d4XOCdjnU3teww5pkIC3EUvk9c2lm7wVIAa+J7LhYldTGMGKwbKzANM35hct0mnzaUQABLHNOo0TT2WvHgUCYe1/HVHLdzI1uEyANGcsJsdChHZIPeabFEnsNdvaUS7LUzDRyAILcwJ7r7HxSmR4st5IgAFzDodCoSScx10cgCRct9l9xyKGaYcbkWcDwQIiWHVtwVAbg7nWKAbiG6tv4hSJsNDdvjwQALQRPaZ7woGzYaOEt8UGkAjk73FHvDMSQD2XcjxUEakkB1jyKJIJzOGvZfyPFIJO83y9l4/FLBExcsMjmExBntCXNEEDeEN8gy5t2niEAeJbp3mxpzChANmjvXZyPBQEjuGxOZv4hS0Dc1xkH6pQBgPECxIlvjwVtHFVqBzUKrqRdqWmIKpF9d5g/ZPFFwJuRE2PikbtYfpPjcP1fXFtdgs4OF/VdnC9J8DWLhiA7DOFxm7QPovGsOZ8vEjeApBbH1miWn6zVNwiplX0ajisNiGsdRxFN/Wd0B1z5K8sLdQQvmjTlc0tMB12OBu0rZhttbQweY08Q4uJ7bX9r4qLhfhXvHvoTAXXmMP0vczOMZhg87jS7MBdjD7f2biD2cR1f9qMqi42KljqNghHKIVdJ7KzS6i9lRo1LHAq2SNVnWkDRNKWeKKRmKgEoAqxqAGXkmDU1kpBnkkp5zp07LsCi362Kb7mH81Z0EaaewKjvr4lx9GgLL0+fGzcAye9WqH0a0fiuj0QZk6M4Ti99V/+ID8Fpf8Apf8ALOf9R3w4SJlUbSxPyTZWNxIj5qg8jxiB8VZcLg9NcT1HRx1PfiKzKfkO0fgPVZY47ykaZXUtfO8PR67E06UgAkAk7hvQyvxeJDabSX1nw1vMmwRoS1leqDBayLj61vgStWw64wm06eMLQ44YGqwHTOB2PR0HyXfbrdccm9R2OlGIa7apwlF2ahs+m3B0zxyCHHzdPouE49lO8mdZPE7+arANSo1g1JWEmm1em6IbP6+tnI108F7bH41uAwOJxpiMPSLmjidGj1IXM6N4MYXBB0EENi/NYum2M6rZuGwbTBxFQ1XfcZYerifRcnj+vO5/l0+T6cZh+Hhy4ky5xc7eTvO8+qoqOurSYWeDVqhrd5XdjHJlXU2O8YN7touaHHCx1LSJDqx7npd3ko0FrTmcXPccz3EySTqVRhacuc491hhs7zxhao4rPO86XhPllxzoaxvKVgAvJWjHPzV3AboaqDYLXCaxjLK7yK7VW1KeSlSJF3SU2BwrsbjKVAWzm5jQbz6KzaFVlbGOdSEUgcrPuiwT39UxP1+i5Vk9oqDclOpRCtmtpd4rU/6F3gs1LvuWl/0LvBZZdtMemB3eTD6NK7vJh9GPFaszeyz7qg1B4Inu0/uqJGJJeDJ0CriytpiRU+7+IQLJSPS5uGBEyp1MGIJWhrmhok3nimDu1adFG6rUUNps0cHDnC3YfYxx4jDGahFmHeVUHDQlbMFtKpg6rqlIt6xrbZhrCjK5a+ntWMm+XJxeBrYLGuwr2k1hHZbcyRpHFfSOimDx2z9iiltFjqbzUzU2OPapsiACN1925dehXpYx7MeylTZinUaQe9oBe0OYCBm1hMQ4MAcBdcmfmueMljpx8frdke6Nxjcla4ZstySRbzTu3xppCrb2a1Mjc6SCfNYtXjdhOzdNsY8C2fEH4r2hebxrw0Xh+iXz228ViLwWVDr9Zy9k52smN1jotfL92keP7QeRlJyxA0JXkOmlM06mAxA7wa+mTP1SHD9or1b3gmCbSYIMX4Lz/TCkHbJpVA2MuJBN57zSPwCPFdZweT7a7RqitleDOcBw8wlcDlsRbksmy6nW7JwT7Emk0GLXAhbBDmiPWVjZrhrKrdcniL6RdK4G0wrHaG543OqUhsai95WdXAboJ18VcHdmZ04rMH5IBBAVgeRxkbh+CiraQ4ib/vUkGxG/TcqhcxeeSuDYsVBhN7n3p2OI4+imUxMwUAAEw1UnE6xpfmrQZ1v77rNT0knctTCY1M71UqatbpfVXNJ1VVNoJloib2WgNBj8FpGdQa81Y1s6oBvJM3VayoogafFNAAkotABtCIHgRFle0aQN8+aaEQDvRykFPZaLF0coJE7rpsqJCNjRSFCE4EJXQdbINWRwCrIACtcI3kjdyVeWVFqorJnQKAKwUydArG0Y1SNUGpg1XZWtQtwSBRA3KG+5NlRylAIGKxrAiKZ4J20ygAGBHKrW0ynbSVaTtRkTtpErSKUBOGgK5gm5KG0lY2mnzAaKZzuVTGJ3QFMBOAAlknVCVST5gEpeAlLhxVZcSUwsNQaodaCVUSokZ3P4IB3FIpCAYlBSIRiyACgIUgzojlKANjqiAEsc1LTZAWBrQoSNyXzUQAIJQIhN5oRGpUmqJI0Vb3u5q8uY0XIVRrNNgFFq4o7R4oQZ0VxfyhENlRo9qoPgorgzimDBwT0NqRO4JwCdytDLqwU1UxK1UBGsKxsFP1bd6ktbvVyJ2EKZUQ4IOqAJ6SbLCkBUurmbBI6u48EBe58b1U6qFSajjwSG6DWmtCR1VxsqylKRmMniUpbGqElAlAAm9kqJCEJAIQyE6BWgsaL3Kjq3AINWWO4KIOrO3FRAfPoUhCUwMrrcgQpCZCEbGkhSFIUugJCBYCnCOWUhpQWhKWhaOrBSOpHcnsaUFi810hrvq45uFEZaQGm9xXp6z/k9CpVdpTYXei8fs+a2NqYvEHMKQNV5O87verw/Kch2hFEUcG3Si2X83nVYzYJnPdUe577ueS4+JSP4LVmQJkAmTCBFRRIOjsuqHZ8M/R3aYOe8eiy16Qw2I6vcePBVMc5j2vYYc0yCuljWNxWGbiGNuRNvePJAczJZ7Dq24QmGteNxhOZc0PHebY8whHaI9l4kQmQZe0WzZ1wluWxF2oiTTIJ7TdESYcHg2OqAUklgPBMCC/SQ4aKR2i3cdEAMzTxagD3mg+02xHJQjK4t9h4siHDOHGwcIKEWcw6i4QEBMA+0y0cQoRaAde03kpPdfruKkWLR7NwgDqASQA+x5FHMZJMfUdb3pRlcfsu9xU3w63suQBgt1u5ljzCgFw0G3eYT8EJIvvbY+CkRYHS7SgDYkHuhx/ulE75kNPfA3Hils427r/cUQ7RxEjuuQZiDBzSXAQ7mNxTSDIcQez/eH5qvtTzp+8I6abu0z8QloGnQyMx0I0KhObSxGhnQ8EljYDsu05FLNrjWxRobXMLMjmlpzat4RvRILml5iWgSN7hxVQOUAjdcEbl16eGpYvZfynDv+fpOPXUo0b9aeHFRlfXleM9nMILRIIdk05tKgG5umrD8QiOwcrLg9qkeB3hLmbrfK4yI3HiqSsp1KlMTRc5rXaQSLjcV67o3tutjajcHinscOrJp1HHtvM93mvHHU5nRe8cdzk7XOp1A+TSIcCXNN2O3OCjLGZRWOWq+oRGqi52xdq/ytg5qQMVR7NYceDhyK6USuazV1XROeUGqcJAE7UjWblEA7kmmUjeM6fvvs2n9mo/1cB+C9B0dBp9HdnNiPmc3q5y8t0+qTtPCU/qYYH1c4r2Wy2CnsnAs+rhqfwn8Vrl/05GeP31rmRZeJ6f4n9IwGGE9ik+qf1nR8Ge9e2NhbVfNOl2IOJ6TYxrCXCk5tBo+6APjKXhm8j8t+lyXtdTwrJH0xzDmBI+MqzCy2k8/WIHoptAt+VGmzu0WimPIX98o0+zRYPNdGXTHHtHGAt2xMIcVjmmJDSufUduXs+h2zu5VcLaunguXz5+vj47rp8OPtnu9R6ujR6iiykNQNOZXz7pXjBi9vV2sdNPDxQYfu6n+8SvoWMxIwOFxGNqd2hTdUjidw9YXyR7nFxLzLiSXHiTc+9Hix1NQvJlu7qqq6AnwlIkyLOIk8huVYbnfeS0a8+XmulSZ1bLwXm7vFb5X1jLGbpmtDGBrdAoXZGF3ASiPgqMY/LTAnX4LCTd01t1Nuc8zVv4lI7WESdSgxpe4NGpMLscrp4N3yPZtfEX67ETRpHg32z+HmsFQRlC016oqOaGiGU25GAcBvWep3mLLDvf5beTrU+FB7x8Uw1CU6nxTM7zfFasV1P6Vy0u+id4LNT+mdyWl9qR8Fnl20nTnu7ycfRpXap2/RjxWjIzu7T+6FAmI7NP7oQASijUR9L9z8Qmy3HvUoa1fuD9oKVagYYiZ8lN7VOluaCQCBusnaSbS7xhYTWqPJgxPBCXn2neqPUezrNYXDVw8Qi6gXuhr8xIiIhcprqje694PJxV1LF4mk4ZapIBmHiQpuN+Dlny+mdGBiDgq1bFU3Mflo0erIi7GkAzvBBF11zDgC5wmBcWXJ6Obfpba2YaYpupYnD1Q+qwHsGRAIPAx3SuqH5gSBFgQDM/uXnZblvtNO7HVnCOHA3FtIWPG1fk+DxFcj6Gk9/a4wVsJuSJvvuVw+ldYUOjuIAMPrObRHgTJ9wKWM3lILdTbjdDKWTC4mqR9Vknwk/EL0cwZbfjF4jULk9HKfVbFpEmOtc50AwSNF03OgEkXAtf3KvJd5WjCaxh8+a85vA7lyOk0v2FWJvlqUiTPOFvLo1Nhx/jVczpE8fyDWaN76Xl2keP74M/tp9hPJ2HhpBJZmbp9pdBxHLwiwXK2A+dj0gd1RwF7C66ZdDJIE6RMypz+6nj1Dl0tgzflKQuGgIM7khqQ4EbpSPdexlY1rAc75zMIJ4J2O03RvKzkybCyem6dFNW6FK4g6LZl7MCFgoPh1xJ4LoU73OvLeszLBvbzShu87lfkBEiLcEMoymN6AVsAwfgrqbrxfVU2brKjHk1OwXZd/NPZadKgNxIHgrxrEW4rLRdlIEGABpvWoSRbTWVrjWdhhzTAWuCoADe8bk4Ecz8VcqKLRMzuVzQqrSDHmnB81cpWLN6IIGu5IIIHBGBpG5PadGzcAhqVAL20TBqNhBpMWU6ufFM1qbRMlfVWugGMbchOQECEjKXAaJSZT5VA1Iy5UwYnDeSubTTkLaltIlWtpgK0MCbsqpim5Kgy+isDE2YcFM4VSRO6gYEwgJM6mqojZxxQsd6TKZtKbITuTCEtG5A1BwTdWUjmwdEApqHcllHLyTCkUAiis6owlyhAKiGkphCsBAHFMK+rPBHJxKcZjuQNMzdBK4CYNsjkhHckYZSDZSEVJPBALk4o5Q1E6JSeSQA2FkpdxTEFLlnVK1RS9Vl071aaaGVRdnNKCCo0DerurkpxSS0e1GUItYSdFpFLkmDITmJeyoMgaJg1WZSmsNVek7IGwmMxZA1QFU6uToITIxH1nKsuaNAkLiUqDMXk6JSSVCggAgmhAoBUqYhCEgVBGECgyoJigUgUpSmKBQCkJSmKUoMpUUKiCeAyqQVbIKaxXTtz6VCUyfINynVpbGiWRyolhCgsnsaCIRCaEpagaMFLJcpUDTvMDjwQHD6U4zqcFTwzDDq5l33R+Z+C4dQDDbKpUoipiD1jvujT3qYuqdr7bOUkse/KydzB/EqvHVhiMZUcz6NvYYPsiwXRjNRjld1nVZMuJTOMDmlAVpFGY1UCgbmqMbxMJBAS7uiUdVe+pkc+m3sxIsqoQAhdDZda7sO497tM8d48wsH8XUa5zHBzTDmmQeaAur0jTxBa4dgix5Ki4YRvpldbFMGMwjcRTHaImBx3hcxxAc1+5wgyiAjoDg9uhRDbuZFjcIAGH09+oRDppA6lp9yZATmZnntN3KSMwd7LtUbMeCO64IAWdT36hAQNuaeu8KEnKHjVtioSSwOGo1RkNdPsvFwgAAA77LlNRPtM+CgETTO+4RzRD/a0cEBLXAsHiR4qCDDjo7su8VIiWAz7TSoY1OlT3FADdcXbZ3MIRBgXi7Sm+0dW2cEC2CQD2hceCAhEnk+9txU3SdNHKWj7LvcURaSRpZw4hASCPvM94QjcDzamiAALlt2niOCgu3K3ukyw8DwQAaJ0gZtORUN7/W9xUmZtGbXkUxjVwgGzhwPFAIB5T7iuhsXaA2ZjH1HU+tp1aT6LmEwO0IWEjWd1nfmm9mTHB3LgUspLNU5bLuCxuRvVPtJs4+y4KHM25EGYcDud+9EnMfnBcDK8ctxTO7NnjNFqhBkObuKRkMwIFwYj8EQdAO0IgfaHDxChhs5jOWzo3jc4ICzjmMXkkbjucgNeAxlTZ2NpYig6XMu2bCoze0r6FgNoYfaWGbiMK7snvMOrDwK+alsyx/ZcDfgHcfArpbD2y7Y+KfUdTz0agDa9MaiPaHgs88PabjTDLVfQxBRDUGZXsZUYQWPaHNcN4KYc1ytzAWRItKAKYNzEN+sYSU+cdNqnWdJqzBfq6dOn5ho/NfRm0hRa2mBApsayPBoC+Z7WP8odMsQG/wBLjcg/vAfgvqNS9aoftn4rXy8TGM/HzbVfWNpA1X9ykDUPg0T+C+T7OPyna4r1w5zWl1eoRrAlxK+i9J8V8j6OY14JDqjRRaRxcb+4FfPdnOGH2btPEaOdTbh2Hm8yf8LXKvDPptT5bzI5zi6rULnXc4yTzK1Oss9ETUnhdXOctc+9Iw62fDUTicWymBN19T2Jhhh8A0gRNhPAarwnRnAmviesIsbBfSw0UqbaYvkbHif81weW+/l18R2YT08f815zptjeo2TRwo72KqZnfcZf3uI9F86c68alej6YY35Ttyu0GWYYDDs/V7x83ErgUWFzgR3j3eQ3n8l14TUc+V3V2GogXPsn1d+7RaRYWQa0NaGtENFgmsFnld1eM1B5b1zcbVzViAbN7P5rdVqdVTc/eBbx3LkPMlaeLHnbPyX4Byso9mXb4gKrUq4aAcFtemWPezSkf32ozdBx7TSpnasulJ1KduoSHU+KsbYtV1EPS+letT/oj4LLS+kctTr0j4LPLtpj057u8rG/RhI7vKxncC0rNa8dml9wJRqrHiW0vuBKBdROlXsaEzV+5/8AoKwtbUEObMJKOtb7n/6CtYD6Kcu1Y9KXUW032nzTNaJ0Rq/SeQRaJT+B8rKbBmF4lexw/RTAbV2Vs2u51Si4sqGo6gwTVIdAkkwIjWLyvJUh2hMr6XsZoPRzZuYAgsqHS47a5vNlZqxt4pLuU2C2fh9nUPk+Coto0gcxAJJceJJ1KtlwdreN25WGDmynlISyTMQSuS23t0yBJcO0SJ8l5DppiQ5+CwdO8A1nAbyey33A+q9WQM2QCOFtOa8Xh3DbnS41oJo9ZIndTYLfD3rTxcW5X4TnzNfl6WlRdhcFhaAb9HSDTzOvlvVbqkNkX1I5nxWiv2nkvaS487662WarJOVzSBpE6rJorc8SQbHcSFyukLo2RvGaqxsep/BdCcz5OpsfzXG6SVZwuEpTOao558hH4rXxT64zzv01t2Gcmx6BuO28gkStr32gu03ALDgQaWzMIyP6PN5mSmLzl1vvgqM+cqvHiReavEx+KUvDojN5qlpka/uV4bYx/msq0gAzeeOgVjO9poqwIMmQrG2ibHddRVxqoGd9hbRdKiMwvoRdcyk6N9jbVdbDtnw5lZmtMzMnxKlpjnCtyWBkyRPBJlAvb8kEpfAIEQeVvJCmMtwPGShUg3sfzRpGY5XMhLam+kYA7p3WWoEmePBZGbpFjoFqBPKArlZ1YCNQfCycXAjyVQBi/vVjQQAfVaSpsMDcXseATxrulKNeasAVxBgOSdoCAG60KxouriaWCfBMG2tuTaJhCZFAUujIUCYCFITADQpo5JAgamDEzWqwNTkK0rWQmAumRVyJ2EFSE0qSVSQyIZE4DkwtqnobV5EcvNMXAJHVANEEJIalNYBVudmSoPSw1jwSmoSlUhAHMdxUzHigigDJ4qQoAmAQBa3knuBYIAQjN0ySTxQ80VA3kkZbqBkqzIpACNFsuWFMqKl0AuVDKrACUQxGhtXlCmRXBoQJaE/Ueyvq5U6pN1oGiU1glqDdMKYChytVZqqtzsyOAtNRqBqibKlRLZ6Oal0rnEoIINClRQQAhRFBARBFBABRFBAKgUyVIAlKYoFBlSlMgUgUhKUyUpGUoFMUpQCEKIqIDw3UuRFJwTNrXuFeyq3ett1jqM2VwRBMb1s7D+CU0xuR7H6s4dxTQDorDRBQ6ohPZaV5EC0K4NIF0hjgjY0SFzOkGM+Q7KeWz1lf5th4WufRdMnkvGdJsa/GbTGFaIbhjkA4uOp/BaYTdRldRkwP6Ng6+L0e75ql4nU+iyRAhbMfFI0sI3u4dva5vOqxuMBdLnI67vBQIBMgCmpCcRRH2glT4YTjKI+0gxqXxNXkD8Uqd309Y/ZPxSIJFD6IoIN0NlV8tV2HcYbVu2dzv3qnF4c0az2CzKgls8eCzAkQWmCLg8Cuy8DaODbUYIqH/C/ePNIOIT2GvHebYprNeHGC1+oTES4giM405pGgupmnFwZHJUlMtnU3atuFJJa141bYqZpa2p7TbEFEw18xDH+5ACzakHuvQyntMPebcKFpIdT1LTYo3c0PGrdQgA+7WvHgU2rhNmvGqhhrwR3H7tyEGDTm7btlARs5ZjtMN/BQtAcWAyHXaUc3dqRbRymWfm5uLsP4ICZtHEXHZeOSEatBu27TxCYHN864TFnj8UMpgtvmbdnMIADLYkdh1jyKMEHSSzUcQpmbJdANN9iOBTAOEwT1rNI9pqAWJOUa6sP4IiCDua7/AAuUGWAAYY67T9U8EYlrnG18rx+KRgZuXi4s4fipENuJIHaHFvFMJE5hLmCHRvbxUaHMcAHDM0SwzYjggEvEakC32giSd97eoUIBIyb7s5ckASCC3ddv4hANpl0JaJB+s3gmbvyHQEsHEb2pRBygOse00nceCjQJkSBP9x35JAwF25bg9yfaG9qAkFuXtEd0HeOCLiDNsocdB7DkzrHtdkF0GPYdx8Cgws4ANBJjs/abwPMKBxkOacxAtI7w4IT3pGW/aj2XcUwsTm7MEZvsn6w5ID0nRfbYwb24DFVf0Sreg939G76vgV7QgtcQRBFl8ncMocHCB7YG7mF73o1tp20qTsLij+mUGA5p+mb9bx4rn8mPzG/jy+K7oCemQ2qxzjZpzE8hdViQVTtGt8m2Tjq++nh3uE8YgfFYd8Nnzvo4Pl3TLBPOjsSaxngCXfgvp4PZBIvC+d9A6GfbtSqR9BhnmeZhv4lfRCbLTz36tI8P27eU6f4jJszBYca1Kzqh8Gtj8V4h9Rrdn0qLS7M6o6o8RaIAb/8Ar1Xpf9IGIDtp4WgDajhwTyLnE/ABeScZPgIW/in0Rj5L9VWURqU/ecGjelp2YuhsTBnGY5ggkApeTKYy5VXjxuVmMe16KbP6mnTqOaYaC7z3BehxGIZg6FbFVO5h2Oqmd8CR74QwNBuGwjGgXddeW6cbTr0RR2bRqnLiWdZWZlGmYBoB1uQSVw+CXKbvd5dXmykup8PGV3urVnOqEySXPI4kyfer6LMrTNnHUDdwHkqqTJOY3g68Tx/ALUxsBdeV1NOfGbu0RMADgiPikqvFOmXndpzWXbTpkx1W4pj2bnxWA6p6jy55JMnU+KrXZjNTTlyu7s7BvVgUyBobxIlEDMbaBTbtcmghIe8BzXR2ds6ttPG0sJhxDnm7iLMaNXHkAu10w2dgtmUNk0cDQFNpFQvebvqEZRLj/ASmc9pBljdbeR3lM3UIbymGoWlZxZS+kf4rS7ueSy0u+9av6M+Czy7aY9MLu8AnZ3Akd3h4Kxn0YV1nO1xFqX3ApF0xH0X3ApF4USrsLR/p/uD9oK1iSgP5zypj9oKxn8SlkePSurar5BFilYfO+QRYn8D5aKIhwX0fZOIo0thbFovqBj64rimHe0Q8GBzvZfOqDZI1hex2nsx20Oi2wqGHB+V0hiK1OlP0oluYD7WhA5Fcvm1bJW3j3Hoi3ju13KsuLTe27kF4/Z/S7E4ZnU4yn8pa0xmcctRsbjx87rXX6aUGU/0bBVHVIgdbUAaPIarC+PLetN/eL+ku1fkWCdh6bh8qxQgQbspmxPKdB5qnongPk2Bq4t4Gat2Kc/UBufX4Li7N2fitv7RfVrvcWzmrViNOAHPgF7sNFOm1tJgYxjQ0NnQCwTzsxx9IMZu+zNXOUR2iD7lge4EaDxI3rdiAAA7uyIzN3fvWJ7XBuVw19gAGFjGjObEX8DMyvO9IKnXbUFFpnqmBn6xufiF6OqW06TqlV/zdMZnGNwv/AB4rzGzGOx21xWqj2jWf8Y9YXR4uN5fhl5OdYu24CkBTaLN7PmAqy4AW1G5WVZJLtSSZ9VQ5xbcG6yaLqEmLeXNa2bwRrw3rBTfG4HgrxVAuIvyUZRcXk3m8DzhEECNZVTXZhr4xqrgLSd/ms6uLaT4MaxzXawzwWi0eC4jWaXsOa6eDsBpeNFlVOq1wIGsn3pHMgGQox0MF7RwTPAIg+MoJje0udANxvVtBsRIsZsoWHOTBndZXtZGgUqW04APFXt3WnmqGiBlEifNXsInSOCuIqwRafNPfMNId53SCRA096sAvdXEU7Q0gEX4QVYIPCYVTTfhu1T31WkTVg0jcnBVQMJpMW0VypsWTKOZJO5QC+l09kZMCSgAmATJBrO9WNEqAJwAqkK0zWpvFCRGqrdUJNlaDl4CHWJA1zjorW0uKIEzlDOeCfIpkhMuC5zwUzEoFAEnemBgnUoObA1UI5oRzQCqQiogBCiaEQEAsIwmDU4YgEDUdE2VGEAoumhGFPBMkA5KSjEohqCLJUAJVgEKEgJ6/JbANA1UslL0peUcDVWSEC8KqSgjZ6O6oqi4lFBSoqiKiACCKiAVRFRIAgiogAgiogwhBFBABRFBABQooJApQKZCEAhQTkIRKRkKCsyHgh1ZO5I1RQKuNOEpYBvQFJQhXGEpHCyWzVFqisLJ1colsPnwcEwg71jFQqxtRdWnPtqDiNCrG1CszanFOHg6KdKa2vlWB1liDr2KdtQ8UtHte4qswlzoyDvQGTaOKGzsBXxXtMb2J3uOi8Rs4k4mrjq5zCiDUcT7Tjp712emGNI6nBAHTrXH3ALj12/Jtn0MN7dX56p4eyPxXV45qObyXdZS5z3F7zLnEknmVU4y7wVjjDZVYWrNAEyCKAKswg/TqPjKrV2C/n7OQPwQZfarn7P4pU7e7XP3R70iCiKKaqR/GqDRbtlYnqsQaTz83WgeDtxWFQ+9INu08N1dYuaIDjMcHbwsTzdtUb9Y4rt0yNp7PBdeq3suO8OGh81yCwEvpZTOo+yRqiUrFZcBUJ9h43oAWdTNzq0qAZ6ZaLnUKScgMwWKiCT2ankUR2Kh3td7wmBAqH6lTVKLtcw6tuEBMpGambbxKklzQ4DtM18EXHOwOB7TdyOYNIqsMTZwQEAAuT83UsY3FABxaWE9tl2ohsE0jEPu0oEucAfbpiCEBJBipHZNngceKYA9yTmbemTvCByznginUs6NxRykA03GHsuwxqEjBrmth8Sx1nt4Iw5vZaTnbdhG8KFwkVbZalnNHFQNfHVkkOZ2mRvQBblLcxHzTzDh9U8UDA7wOZhh3MbiiHMgPjs1Oy9vA8Uzi5pLnGX04B+01AIJe/s3c3u/aHBGIa0s01ZPvChEdkEEt7TDxHBTUZWau7TRwPJAADNIaYD7t5Hgge1yDj6OTGHSYhj/c5EkOkvBh3ZqR7J3FAK4i5IyyYeOB4o94uJElo7YHtDiiWuYTmEvZZ4+s3iljKBEyLsPEcEA8ahwDso7Q+u3j4hAaFvfMWP12/moSDlLJaPYI9l3BMAHtmcsu7Vvo3cfApGAgREOt2T9Zu8FQgGBTM/UJ3j6pUMZSXTlmHAew7iEZmcwt/SAD0cEgg7UQLEQJ97SrcNXqYetSqUXuZUpOmhU+q76pVQ1OcEz3o3jc4Ikk5i4ZjE1AN43OHNBvpuydq0dtYM16berrNOWtS3sd+R3LB0yxPyXo1VZJnE1GUh4DtH4D1XlNjbSqbI2iyu0dYA2KjAfpqZ/ELo9PMfRxdDZTcNVFSlUY+vbgSGiefZK55hrON/feFaf9H+HLcHj8T/WPZSHkC4/EL17Glz2sGriAPNcbolhvk3RnCWh1YvrO8zA9wXUxOJGDwtfEmIoUn1b6SAY98LLyX2yrTCaxj5f0gxn8o9IcbXBmmapaw/Yb2R7guXMnxVtKmTSq1PqNA8yVUzveC7pxNOS83a02aBvXsuh+znF7XObzBXksJSNeu1tzfcvY7ZxeI6O7KwVHC1zRxdWoaheyxDAIA9T7lw/qb7XHxT5dng+mXyX4e0yufUaxpA0Ancvl+28eNrbcxWJYT1b3ZKZ+rSb2R5mPeVb/AK17aqUn0n41zxUaWXA0Ig+5c+k1rbDRaY4+nbO32WNAFgBAFhwVoskaFYLyVFXAJWDH1Yc2mPZufErc5zWB7n91okriVXl7yTqTJWvix3ds/JlqaKdU9FmeoJ7oufBVhaGOFOllc27yHZuXBdGXTHHvkzzJJOq04LBVcVWp0aLHPqVHBjGN1e46AfxZZ2t3kiNZXpdkYTaGwcbsvaFWi00tok0BTP0jGPgB32SQbFY28Np+Xb6NbMZs/C4quC2q6tUyMqN7rqbTFuRfMccoXH6fVmnE7PojNmpse4y0gHMREHfovZspCkG0WABtMBjWgWA3R6Lw/TrEUn4/C4anVFR+Hpu6wAzkc50x4xCx8V9vJtXk4w08oiNR4oRZEahdbmWUu+9aXfRnwKzUu+/xWk/RnwUZdtMemF3eHgrG/RhVu7ysb9EPNXWcaf6v7gU3on+i+434IDVZxpQoG2J5sH7bUzLoUNMVpamP22pmC6Kc6LV+k8gi0KVvpfIJmCUfBfLVhwCQDN7Fem6TmtQ6OdGsVhzVY6ia560T2HEsgE+q81hxcfBfT8O2nV6MbPoVWsfSq0qjXUnd17ZA/jguXy5euUrfCbmnn8BX2T0vp5sdhWN2k1o6wsdke/7TSNfAzCub0O2OxweRinAew+v2T6NBXmdudHq+w8QMXg31HYMOltUHt0Twd+a6uyem1m09q0y86dfSFzzc3f5Kcsctb8d4aSzes5y9MzD06FJtPD0msos7rKbYARIOQCCOVifRTC47CY5gdg69KtHstdBHkbq91N9xkdoCLLlv8t3OxEugHLBmzju4wslQDKZYM13bpnfHiuhi2mkx7nAsa0akZQIvqV5faPSClRmngXCrV0zxLGeHE+5Vjjcuitk7Z+keNOUYFriXGH1racG/j6I7FwpoYM1nwDX04ho0PmVg2bs9+0q7qlTN1IdNV5N3ngDxXo3uaHQAC3dEWjQeC2zsxx9Izxm77VleztGDpYWWV/G91rqOsRO4zH8aLHUMulZxoQOAOsp85nWbqmSdITs15lFgjbQl2i3sHZ4D+LrFhdSG2K6Dbg3kEyufJtiem3fofgt1BtvestJhAuttMQIssbVtVM+ZVveteDbmqWAHz4rSxsG9h46oIraZBBvPBXhsCBdFkECNE4YdBrHDenImkLYsDCI0MkxE6ynLBG9SNOWiYO077X0VgF58ktMSOCsbczu/FaRFTdZHhP8AmnhTLBm6tKC+gTM8PJIOKdp3KomrAJEpg1KNxAnwCcK4kwEJpQAVgaNSqiQaCRoniyI0UiVcidkIJsE7KcapgABYKTdOQtiXQl6w8FC4BLnT2Rs7uCgc7ek6wygXuO9AOWzvUsEkk6oi6YG25RSEQ2UAIlEN5KwM5JojenotqwzimyhNYITyQEgBSUNdyIbzQElEKBoTCBomSBtkYCEoZkyGQpPAJZEqSgIXJSVCgkYKIoJGCkIqIBVITIIBVExCEJGWFIRUQCqIqIBVEUEgCCZCEGCCKkJAqibKjkQFakK3KplCAqyo5E5hLN0jCAhI4I67lMhPBAKSUJJ0CfKG77pc4G9IFyuO5DIRwQdUPFUuqGbFI1pAm6VzwNCFnc8lISYUqWuqNHNRZyHHSVEg+d5SiHQlDyiHzqu5ynzoipdJY6IFILxUPFOKnNZMxCYPRo9tgqJxUG8wN54BZA9YNvY35Lsp7Wnt1z1YvoN5/DzSmO7oXLU24VaoNs7efVcSKJdmvupt/cFkxFc4nE1KxEZzIHAbh6K2kPk2y3P0qYo5G8mDVZguuOalebgIBCZJKZMkhFQKIMVdgf55PBjvgqFfhATWqZQSckQEAjfoq/3m/ilGi1VcG7C4Yiq9ge9wOQOkgLLvQUFRRRI0/jgpusooUBr2Xifk+KDXOilVGR3LgfVaNrUDSqtrNacws+OPFcsidV3MJWbjsDkqn5yn2HcXDcUg5NWiWltRo7NQTCrLQKgJ7j7HkvU7N2BRxuErGniqtJ9GrlyQHDKRLTB80K3RTEkHJUw1XkWlhKz/AHcZdVp+3bNx5XIe0w95twoTOWpHIruYjo/jaUF2Dqdn2qTg9c6pgxTeQ8lk6tqNLSrnklRcLGOS2oYFjuRdDTGrXi3JXOwzsoyjOQfZIMhKaJnLBDXGxI0V7idVUZy5SO202Rkkdc3Vve/NM5jiNCKjNeYQntGpAyEgOAQE7LXEaUqmh4Kdpwyn6Snp4KZACaRNnXYVJc9ua/WU/eEAxcwkVS0Gm8w9o3FTK6cjb1GXY4HUKZmh2YA9TUs5vBTK6Qxt3tuw8QgCHNg1CJZU7Lx9V3FQhzRP9JT1H1m8VJYRmynq6gh32XKAPDiQZqURv9pqRo4ACGCZ7dO+nEKECwabVO0wn2TvCIAGUtkU3GWHg7ggQTTcHCA50tP1XcEBIEEmRTcYePqO4ok3c593NgPH1m7ipnN3OaZAy1RxHFEtIIa27mNlp+u3ggFlzSAJztu0n2mqFogZXdk3aeB4IuDSWtDiGHtU3ndxCGcXJbDDaoBuPEIAZokkQ11nt4HijemSXQ+B2huc3imcC0zlDnBt40e3iowSGsaWkntU3E+rUAHDsAtMkDf7bfzCYGzSzS+Rx38WlLAF2HKHHs/YdwRcQZBlrXGXRo13HwSAt7TmQcrfZcfYPA8kzNJb2XDj7J4HkUC6S99Vsg2qge5wRYS0mcrntbv/AKRn5oNARGan2BMi8mk78lnxtQ1cQezlIaBlF77/AHrW0yaYZctByEtjOze13gqMCwVsfmd3WB1U77AEpdcnrfD6tgmMpbNwbKLmupNw9MNc0yD2fzlcbpljxhNgPoW6zGOFMD7DSHOPqGhc7ojtfqHU9l1hNKu6aDibsfvafFcnprjvle3X0GOzU8KBQbGmbV3vt5Lnx8f/AKmq3yz+jhw5y4YDfUfm8h+8qpuhKase0GjRoy/n71GmGXXV8Of5ei6I4ZuK2mxgEmfQ7lT0r2h/Km3q3UumlR+YpmbQ3U+ZkqnB0K+BwlPamBxLWYml36Rs6DoQDr/BWWhQgkOHds/8vzXJMMf3b5d/x/5dOWV9J49fyejTytB3EQ2eHHzWhrQBzKIAOoTcEZZbOTSBMNOCVGQBJMACT4KFMe0KsNbSG/tO/Bc06q2tUNWo6o7VxlVLswx9ZpyZX2u1uGoHEVm0xbMbk7hvKes5r6znN7sw0cBuS0SWNc4WLhl8t6OqVvKpPpWYLFDBYujXqUGYik18mlUnK+NxhenxPSjB7Q2ZtCq91WjtF9enWpB3bblpnsMBGkAkmRcriUX0cNhcDUxFBuIpurPe6i5xaHgQIJFxou9WxfRbbmQ4uhV2VXdDeupMGQDmG2MeCztlu9L1ZNbdzaW2GYyvRwexcZRNfF5nuxDHS3C0gJc4/aAn0XzvaVXD1ca92DYWYactPMZcWje7mdT4qYrZ5whpOFalVpVmucxzHSS0OLe0N0xMFZXXI8VeGEx6Rnlcu00Cm8eKBNyiO8PJWhZS77/FaT9HPIrLS7zvFayPmzzCjLtpj0wP73kFY36Ieaqf3la21Ieau9M521u/o/uN+CUXcnfqz7jfglbqs41pKP8AxI4sH7QVjElASMVbSmP22p26oonQVvpBzaEzNAlxH0o+6EWaBHwPlsoWcF9LwZH+rmy3GM2WrG+2YcF8ypG4X0jBuc3o1smxMMrmAOD2/muP9R8OjxdiaouLGRcESD+F+C4G0OiuDxZL8G4YOqblkTSPlq3yXUdUh+4kEyBNkzXh2mUneAFzTPLG7ldFxmXbxeK6ObVwjszsI+o0G1Sgc491x5hZhjcfh5pnEYukR7Je8QvpFGsJBi7TqtTK7y0xUduNytP9RfmI/a/FfLWsxu0HABmKxLtwh7l18F0XrEtfj3dVTkTSpkF5HM6D4r3Tnvc2Hue6DoXWWOuTAZll1iGjRF89vE4OeKfLnPpU6NBlOm0U2M7rQLN/MrBVJmT7olb6zZGV1ydZK59YiC6SZN7rKVooeROvgVQ8SPerCQb8AqXXt71aVLoHFFp4+SJBmNeaLKc6FO043YTvCy7FGkC0yLaXXKwzMrguzRBIaLzGq5M7y3xjRSpbwLkcVoDP44o0ac6mPuq4sykQNLeayUNMWAAjdC0Nbe1wN0JWNE8PNWgAHWOBITiasYNNYPBWg3EC/BVsPaAE+Ssa2bkRvjmriKmW+kJct9JV2ojzQLZ+CrSdlAh0CY4xorWjtb1WDG71VrLb/JVCplMpnTwRtOpTDkB+a0iCwrGssg2NQDdPIB09FUKmAiBxRDUuedLquvjKOGY52IrU6TW6lzgIVbidVqbAEpp5WXGr9Jdk4ZmZ2Opv4NpS4lczFdOdn0nEUKNevG+zAfVVKWnrDUjglNQcV8/xX+kDFEj5NhqNFok9sl5PwXNxHTHbFeMuKdSsZ6tjW6quaWo+o5yZsUM5K+RHbO0gRiH4/FdhzTasZInhpxX1inWp4imyvRcH0qrQ9jhvB0T5nZcLZUQCcBEAQimtvRkbgqIA0lMGQpJUugj5QjIGirRT2WjZkMyCiNjQgzqmslhMAN6IEngFIKayMKiCLKQmARyp6LauFE5CGiNDZIUTIQkZVEVEAIURhRAKojCiQBBMggwhBMggAgipCRlQTQSplKARRPkG8qSBoEgSJRyFHPwQLikY5ANSFDAQ1UjmgDKEqQFMwCABQyyoX8BdAuceSAOUcFLKsl28pZdxKRrC5KbXJCrIPFCHJbGjF0aGVUTKbITrCIaBqls1RBOklDqidVdpoEC5ylSo0eUJeqaNSrTnO5KWO4wkCZWhREsA1KiRvlaYKBqsayV3uMotvRF1Z1aBYUjLCgbKcBOGo2FbaZJgb15TbFd20NqihSu1h6pg4mbn1Xp9pYj5Ds6tXmHAZWfeOi8lgPmWV8Y65pjLT5vP8StfHPlGd+Bx9Rr8T1dP6Og0UmeWp9VleYHNECAkJly2YoAmQCKAKiiiDRFr6lORTeWTqW2lRRAKGgGdTxKdBFIIoip7/egBqoiVPBAT+OC2bMxVHCVarqwOUsgZWySZWP8AjigUB0v9YcZQxDn4JxwzHAAts7NGkyttDppj2Wr0sPXHHKWH3Lz5CBHFRcMb3FzPKdV7XDdNcPUE18FWpxq6m4OA9VuZ0j2Pioa7FMbPs16ZC8js3DMrbJ2nVcPoMMXjxNRoHxXJIgrL9rG26a/uZSTb6Qdn7H2gJZSwdWd9J4B9yzVuieDcPmziaJ+9mHvXz8SDI15WWuhtbH4aOpxmIpgaAVDCP2sp1S/cxvcepqdE6g+ixlN0adZTgjzCwVejWPp5j8kbUkXNKoL+RWeh0w2rS79anWHCrTB94XQodOXf8RgGHiaVQt9xS15YP/Tri19m1KQyVaNallMjMzTzCodQc4tdSex1Qawe8vZ0OmGy6tqvyijP12Zh6hbBiNh7TAHW4GsTudDXe9H7uU7g/bxvVfPTQewmKbxScIeInKlDHRlntNvTdx5L6G7oxs+oM1KnVp86VQkLDW6Jgj5nGeVamD7wqnnhXw14tpaYeWkUnmKgG48UIeYYT87Tuw8RwXpa/RTHU82ShRrNOvVvgnyK51fY+Iox1mHxNIs0cacx5hXPJjUXCxzs1N4iMlKpe3sPQETFT2uy7kdxVxwoLnDrGkO7zScpniJQOGqiHOZmGhjeFW4nVVZiHZ3DNUZZ7dzgplysa0b+1RcDpxBRLXMcM3fGhOjhwKW2XKQRTcbfYKYM17CKhqU/m3d4Nt1btzlCx9OoRAc/LdouHt4hC4zFn0jRD2/Wamp91rA6GuOak/6juB5IANGWrTFJ4cR2qTjv+yUpDCCdKbzu/o3Jj8257KjSwEw6bmm7imqNcHODmgloAqBp743OCAV5LnEvbBaAKjRv+0gMxGXV4bED22otDhlZIdkBLD9dvBQCC0tMAyabuB+qgA0mWtkEgSwn2h9UqQCAG9kC7XH2TwKhGYGbNLrmO45EOdLiWgkCHtHtDigCXRQqPDSDeR9R35FTABrcLi3uJa0tZSzj2czp+DSkxDi3DgAmDYO+s3dPMK6gDS2WwtbL6tZ0ji1rQNPFxSvSp2NSsaZdVcR1oIlu4nc4Fc8PJeajjLheTvKsxD7tpgktYIE6jkqCbKpE2oZ1VjCLSq1twezqmMZiHU3NDcNRNZ+b6oIBjndLKyTk8ZbeFrtoVKlCnhqrwadE/NBw7k6+V5VzXMp0Q4XZoDrKqwzGjPLZzDf9Xd66palJtKm7J2WgzBO9Y2Temst1tZ8rYXRJjwVrKgqOsuQc0yVrwbySZPNGWEk3Cxztroblmx9Xq6AZvf8ABaGdrXRcnFVuvrueNNG+Cjx47yX5MtYqXS507lIK1vwZ6pr6faETZZyC0w4QuiZS9MbjZ2YaQiNUo5phc2SU9x0TwWG2h0fbQxeHZXpHGPlrrRFO0EXFymxvQvZjGVMTSxWIw1Ki01KjHw9uUXIBsROm/Vaeg1MjYIeQY+UVCDx7ICTptjxhtl08Cw/OYt2Z/Km0/i74LiwyyvkykvzXRlJ6S38PnxuZAygmYVZ1TvdAjeq5XfHJRdcnxRb3h5JNyZnfCZLKervFanfRnwWWlfN4rS4/NHwWeXbTHphf3vIK1v0I81W/vKxv0I81d6RO2xwlzB9hvwQFii7vs+434ICxWUaVMPZmNj+qH7bVGC6OH+jx/wDYj/uMUbf1TonULX+lH3RqmZdLW+kb90T70zNEfA+WmkJcF9HweX/VnZLjHZbXItJ7zdF84pTmC+j7PBd0V2SGi5FcCR9oLj/UfDfxdslSm/rQ3Uyd8ItYWydTwCucD1pb3jHCyhbmAIMwLrjrrittSBE30H5eKfrSx4IAcAbyZ5XVTjFw8kG5tolBhsAkm+qRtFXER3SQeDdyz1Ks5puDrwVbnOMy4jcJ3blXNiRoOzMaJwKKz7HLYTMSsb3mSDHOCr8Q4/uKxvkC25XIkrnEu3k80hNuPFK4kmUzAZ8VQhmsL4961UqF9JJ/iFMPTl0TAXSbSGYWEW14nRY5ZNMYqpsh3D3rp4RlxIhZ6VKTMTeJjRb6TIAgRvhc+VaxtoNgQCSVfkLu7vVVGIAnnzV47LdJHCEioNBabiLblYAoYva6Uua03IF+KaVovF45QrmnS3uWM4mm0yagBG4JDtKm1pgPJ4iAqlKyunqPDklPag7lyn7ZdfLSaPvGVmftnESYyNHACYVe0L1rvgG5DST4apszWDM8taJAJcQLryNfaWKqiH13mLCDC5leu5/eJO+SZV48pse6r7XwOGjrsVTBHst7R9yyVulWzqctYK1Ug2LWQD5leEL4m8E8N6rNTW9jxWsxqLp6zEdNXMLm0ME3KBY1H38YC5tbpptR4imaNKb9mnPxK888lp5clU+4PLgtZhEWujiNu7RxEirjq7gRduaAfIQue6q5xJJvx4qhzjoTzQJ56rSYSI9qu6wxOYnzUdUB4+aoBggm44Il0a+YV+qdmJ1IRbrBPZF3FVTb+NVeyjUr1qWGoNmtVcB/HxTTt1NjbL/lWjiqtZ+Rgb1VACxfVPdA/jevYdAMe7F7BdhKkCrgqmTJEENNxPnmHkvHbfxAwr8NsnAPhmzyHuePar6z5fiV2dk7QpYHpZgtptJp4LbNKHgaNqEw4HwfB81nfyp9BCfVOBBh2osnEI0NkARsE9ggYKZbLKEpsqnVlLk+CopwwJwwJzG0txUAmyqyAEbblXqn2IGpsqaQgXKtSFuoIRskzIynstHlAlCShKNjQqWSqJGKBURQCwoiogAoiokYIJoUhAIonylTIjQ2rUVmRDKEtDatBWQEDHBIyXUunvwQ7XBIyQhlT5TvKmVIEhRMW80uUc0GBQlNlncpkKQJLjoEQwncrAyExgap6G1QZ4BEtaNSoajRulJ1vIJASGpHDhKBrFKazkqYFrjoEeqdvMJDXed8JHVHHUlI1+Ro3jzSks3vCzkpSUjaTUpDQykdXbuCzkpSkFzsS7cIVTq7zvSFKUAXPJUSlRBvn4pHgjkLVcDdB7ZXVtz6UFxCgcTqrMigYOCey0DTfRWAjeFG0iUajXUaNSqQMtNpeZ5BTs9PL9K8cKlWlg6Z7NLtv+8dB5D4rnYodRRw+E0LG9ZU+8fyCTDZsdtF2IxBkCa1UngL/uVb6rq9V9V/ee4uK7MZqac2V3dkcYakAReZdHBQBUkUUEUGiKiiAiiiiAiKgsoEgKiBIGpCgcCbSfAIA+CiLqVRrQ91MtbMAlD3oCIIqacvcgBF9PciRyQ3hWEW/MJVUdnZRDei23TvLMPTHnVJ/wDyuG5t13MAI6JbXdxxGFb73lchzSs53V/EUZUMquLPD0QIhpPDgVW06UQpC7tbA0KbxTe5weGtJlki4ncqTs6k/u1aJ5B+U+9TPJD9HIuNCoZOsHxXVdsioBIZUji2HD3LO/Z7xcOEHTMCE5niVwrPRxVfDkGjWq0iPqPIXTodKdsUAA3GveOFVof8Vzzg64/oy4cWmVUabmntNcPEJ6xyH1R6ah06xjYGIwuHq82yw+5dKh06wT467DYikd5Y4PH4LwscEYUXxYX4VPJlH0cbe2DjxFXE0DO7EUi33kJhsbYuNGagyiZ34evHulfNoKAkGRY8dFP7Ouqr938x9ErdEKMfNYmuzlUYHhc2t0TxYBDPk2IBF4caZPkbLzNDa20MKfmMZiGchUJHoV1KHTTa1KBUqUqwH9bSEnzCXp5J1T9sL8Didg4ujlnCYlhZcFrQ+PMLA/CNa6o1xaxr7ljpaQeIlegw/T0W+U4AczRqx7iuizpfsXFCMQatPlWoB49Qj28k7heuF6rxT6NQtaXND3AQSL5x+aUNcxoaZJF2P5cCveNp9HNpGaTsG5x+o/q3fghV6JYV7SaFWvTB4xUan+9PkftX4eEA7QYLSezPsOSZQQc4hpMOH1HcV62v0RxAnqqmHreM0z+S51fo7jqJzPwdawuWRUBHkqnkxqb47HEDpEvuRZ7frDcUoDgCJIcNDyWyphXUiAey5u6oC0+F1WcPULZDeyNIvHor3EarFi3AluUZRrl3ArWXCng6QfZ9KnNO1iSZIPO4Kw4qTWc06t7K0YxxDssZZMlvCLJ2dDfbK6d5ublKG55PBRxJPirmtysA36lVbosZtXTZLr6BdTZtcU8HtJknrMRSZRYOMvBPuCwxDYGq14SmGy7h2Qee8/gsc7uctcJq8Lg3IwNBkzJPE8VnxQBLC7uNPaHFaeayYx0uZRBubuUYc5Ly6Z6pznMBANwOCOHMPCatTgwEKbYdPBa74Z65asVVyUMjdX6+C503lW1qnWPndoFVCMJqDO7q+hi6mHqNcy4GrXXBW47SwtUjNh8nIdoLkoIy8eOXInkyxdjJgawEENdyMKirgMpJpkOCwxZO1zmXDiPBRMLOqu5y9x7H/R7Ue/a9fCGoRR+TVKgaXdkGWyfSVwdv7V/lfa2IxYnqiclIHdTbZv5+a6uGot2H0YrbUdU/S9qU3YXDsb7FM99x5wI5SvLPO4KfHJllcp/X/kZWzGSq3GShHZJ4IpgD1ZAGgzFdDBt2XsqptJmJLCAaTOzJiXGSB6ArAwQ8L2HRbZTdo7DeH16tFgxsvNKA4htIxfxPvXH6S7OpbN26+lh8/Uua2ozOZNxf3grPHPedxaXDWEycuj7XitL7UT4LNSsT4q+r9EU8uynTG/vK1v0Q81W/veSsb9CPNXekztsf9I37jfgFBqo/6Rn3G/BRuqyjS9phwerx/KiP+41BuqbDfR4/nRH/AHGIM/FOidQtb6QfdCdiWv8ASD7oTU9yPgfLTT3L6Ts2R0Y2Vq69cWME9oL5tSmQd6+j7Pdl6MbK+sXVhrBkkLj/AFHw38XYtp3FodMwBH8eCusWSSJi/L96odUIcACZm0GNN3+aJqgzYxwC43WxVSRVNw0ATbnos4eQbDLaINyr65FR85gToLnTms+hyx4yNf4/FBk1MtPZiDzKSo5zhFQQRbS0JxUcDmIFgdEkCYMjnOqYY6xObdN54jksb3a2st9amW6SBHBc+rBda60xRQF+C0UGyZ96zU9YiVvoMyszaSlndKxaqLYNtBeFvp1md0gTF7nVc9rj4Jmk7lzVtHWFSn2YcDvI3K8VwQcpv4LlU3G11qY5ZVTb8qIbZoB3lT5bVg9rXgFn3apd9ika92KrOmajuAukdVO8yeMqudYUTI/WkhLnPFTKB5oZbKgDrwkMHX0QJjwVZddVIlHgfksVYXJF50W9wsVmqsJGm7UBXjU1zKpvoIVJPa7XuWiq25G7cFlJh17Lqxc+Qm8nQJKjIB3Gfepmj03oF0gAG0StIiq3ibqswPAJ3SHdoG/wVZkzBnetIzqbufuU1tM3U0Jn3Kd6AOHqqI1MZAXGLacyu7sgDZOysRtyqAazpo4Rp3uOrv44FcvZ+CftTaFLCUgRJu4bhvP8cVr6R46nica3C4W2DwQ6qkBoSLOd+CV/An5cZj3Oc7O4ueSXFx3zqfVdvZ4OP2NjcDPz2GnGYfjYRUaPKHeS4BOSoHbtCuns7Gu2btDD41ozdS8Oc36zdHDzBKnKHK+vbA2mNsbFw2NiKj25ag4PFj+fmujmheK6J1m7L2/jtih7jh68V8IYkEEZgeUt+C9oGKN0+BzJgQgGAb04ATmyqA8kQpI4IyrkSkcSlJRKUwgCCpKgCYBABRNCkJkVFGFMpT0EURgqQgAojCkIAKIqQmQKQmhEBGhskI5U2VGBvT0WywApI3BGymZACSdyEcUcykpGEIRyTKeaNAsJTCayhcNwU6MsOOiha5EvQzJcHyGQ8VMiBcUpcSlwfJ8oU7I3quUspbGlmdo0CBqxoFWgUbPRjVJ3qtzid6hSlSYEoFEpSkYFKUSgUjKUpTFKUgUpSmKUpGCUpilQClApilKAUqIlRAeAD5Th3NUgJwulitBkKABILJkjLiMZRwVHrsRUDKcgTErhbT6QvxtCrhNnUnOp1RkfVc3UcgutjqBxGHyigK0OnJIHxXJr0dqU2RR2XbiHB3uC18cx7rLO5dRyzhvk+Ap0nNc2pVcXP8BoFjxDRSc1rRulXYxm0i/NiaNZkCAOrIAWK5MkknmumMLBCYIBMmEUUCKAiiiKQBFTwUQES1CQy2qZBwzEDiQgNgw1CkSHNc9w1JMAeZW3CND6GIqUmMZ1QsR2r6rHtJg+WsHE/iupgm5dk493j+yoqo5leq+tgQ97nOPXACbR2ZsFjWuqANm0udd3uaFkVRKfxwUUj+AFPH3lMJ7Qn4q03G/yKqAuI+CtMcvRTVR2sGI6GbRPHHYYf4ahXKcByXYwkDoRi51O0qI9KTiuSQTxWPzWs6Vxbf6pajfm3a6cFbHH3hK4SwxwT2NO9ten1e1q7NzRTH/1tWIidYK6W3P9+Y3k9o9GNXPhVh9sZ5fdVmz6LXbSwgDQJrs08Vu2y11B+FNN7mZxVJA0PzhVOxm5tt7Pad+IZ8Vr6Qjt4Ef9Kof/ALCovOcXOMK4xqPJlwpv+9TE+oSVHAgAMyyQOw88eBTwlIzPpji9v7QV+sR7Vl2pQ6mtQbqTSknj2iPwWLLf8l19vNjGYYf+nn/G5c7L5oxvEVZypy/xCGVXZeXvQLbp7LSotQyq/Jy9yBYjY0oLDGiduGebnK2dxdBVgZ2hbeusMNSHR3G1cg63+UKVNrouAKbyR7wj2Hq4tXDVKYDntlpsHWIPmE2HxeJwhnDYitRP/TeQung/nMHtem6m0j5G2sJHde2owAjycR5rlllyEb32Nfh1qHS/bNCAcUKzRurUw736rp4fp9WB/ScBSdzpPLT6FeVLEDRfE5DB3wpuGF+DmWU+XvafTbZWJblxNKvSnXOwVAhVr9G8VQq12Ow2dlNzwGE03OIFhHivAFsckCLEyl+zPin+5fldszCu2jtbDYfNBrVQC47t5KmOqMqYus6m4upZi1hcIJaNCVVhiaZdVa4tc2zSLa6+5VOdJW2uWXwLBmffRXb1UwwrW9pwi5NglkrFYxpJ7OujfH9wW5jQ1oaNBYKnDstm3aN8N581oItzXPnfhvjPkCQ1rnO7rRJXOw+atiH1X+J8StG0KmSgKY1efcEuFbkws76hnyVY8Yb/ACm85a/BahknxVbzlZHFWOuVQ+7+QVQqRAp4SkLRmCZrQ3tOHgOP7lGtAGZw5p6dKtiKmWlTfUebhrGkmPAIPRJRptfVqNYxrnvcYa1okuPADeu/s/oXtTGFrsSxuCon2q/ePg0XXoMXhcH0P2HVqYAE4/EfMMxT/pLjtFv1QBwvJF1lfJjLqc1cwt5rx+Ox78XhsDQILaWDodUxp4yS4+ZPuXPddWO4DRVnVXjNdJpQJld6vg6WA2LXce1UqUMMyY0NWap9GsAXH6otwjqpBg9kFdvbuJe7ZNJrrGpiXCPs0qTGN+Lkb3ZorNR6rojhRQ6NYZxBDqzn1ja9yGj3Bee6eZDtnClu7DAHyc5e42bhxhMBg8O0SaVCmyeeWfxXznpZjDjttV6obFKh+jtI0Jbr7yVzeLeXluTfyceORxQS0g8VdUINOeKrrwGMjcEziDTXVedVzzjhQ/veSdv0I81W/vK1v0I8CqvRTtuqfSME+w39kIA9oeKNWOtZH9Wz9kJW6jxWU6a3scKCW47lRE//ACMREXHNTC2Zj7/0A/7jFI3IvYnUJX+lb90JmBLX+lGmgTMKPgvlopbo1X0nZYLui2z41zVhrzC+bU90r6TskA9FtnwCO1VAdGnabuGq5P1HUdHi7ZahIfDzJFnAmQN/mh1rnA5haezAghaa7M08dALwfFYi0Nd2Xm51jXkuN1I8i/ZvaOHqszjBI1BEku4c1fUMENIvBHE/xZUvaeFvEz4oNkqOykTa0AKluIlzgZObXmmxR3amLz8ViL/LzVybTXQc/rGnKJkQYOpWOvRyzv4/xuV1GrMBw0N+asrDMyDrvS3qnrbDREu810XvBDQ2dL33rnAZXXstFEnNpKM/yeLUzT81cG3/AIuq2tyjitDBZc9raI0GReVopk6BI1ita2yiqWAog3STA4KZrmEoQOdlKXrADyQq6SsxfBEnetJNptbmPBVhFrblhp1o4W1ErS2s2YmTzSs0NkqjW5Wd0tNwrqrxmtCyvdLeMbwrxiatp1jMH1TPcMh1FllYdxurC8EWJ81Wi2y4hzSSLC9liqsEnQeAWqtJI4HeqHCCByut8OGWXLG5pGkzryRYQXCDHNWPpzoBYaTuVJaN3te9bzljeAqS12ut0hNpkGbo1LvJ+sbXVZzWHotIiiTuCIGRs7zp+aAF44ldDYuz/wCVdqMpEfMs7TzFso/NPpLo4SdhdHXYnu43aHYpHexm8/j5hefLQAANwXV23tEbS2i+pSPzFMdXRA0yjf5n3QuY4X4qF6UVGyCraDszBxbZBw1SUzkrRudZP4J6bC42rT2ZgdpUSTidkVhRfGppOuyeXeb5r6tQxNPF4eliKM9VWYKjJF4IkL49sKpTO0DhK7g2hj2HDPJ9km7HeTgPVe76DbRfWwFbZeK7OIwDi0NOuSTbyMjzCz+TvW3qZunCAypgQqkKjCgCOYKSFSQhTKmkKSnotgBCYISpKYMpISyonstGlSUqKNgVFFEBEcqklSUyEBGEJQJKZCdVMyVRGz0MoSookAURQSMFEUEjBREoJAEEUEjBRFBIwSpkEjKgiUEgBSpkCkZSlKYoFIylKUxSkJGUoFMQgUgQpSmIQIQZEpTkIZSdAUgQpTZWmm76qUsjUj1SCspU5CBQZFEVEB4ANTBi1ZRwRDRwXSwZurPBEU3cFqgIoDMKTuCcNcNyuuoQkey0y4vaL67yvmuIObFVncajj719MbZ08Lr5i4y5x4kn3rfw/LHy/BYR0CijtCuliLKZc0Oe/KCLDeU9amKVQ0gILdSTqne35nCAe0B8Ucb/AD6uPtwkFGiKiiAiinqogIoL1aY4vA96ieiJxVAf9RvxQGvaN9pMHM/FdTD22Bjj9o/ALlY4ztJq61O3RrFHi8/goy+Dny5OJtgMMONSofc0LH/Gi24wRhMGOPWH/Esdv4KokUv/AJKfxZT+LpmgAzCfirDy+KQd4QnInipqo7tC3Qp4PtbTZryon81yzroPVdRluh1AfW2m7dwoj81yjreFh81rOgI+8FIBIE3JAuOalp/Iqyg0uxNFvavUYOPtBM47u3f9/wC0OVcj0AXPW/bRzbd2kZ/4qp8Vz1eP2xjl3XQ2AJ6Q7OH/AF2q/pD9Lgf/AG5PrUcqujwJ6Q7P5VZ9xVvSL+c4KP8AlGn1e5Rf+pFT7HIhRgmvQHGqz9oItaXODQJLjACyu2ixmJYzD0n16zXjKIsXA8NTdas2rb7C/aOGYxrnH5K0wB9py5rzSo/TVe19Smcx9dB70+0fl78Q1u0H5HGk0hjYs3cLLOyk1hlovxUySTlpu28LWVn1XhtKjTpggxnEknmT+5aMZhm0xha9EZaOLoCs1uuUyWub5Ee9UUWg4inb2huWl78+yNltj6OnWHrUlKnGSEcvJMJMgEqp+KpsIF3cS3RLVvR8TtYxvzjbbwuqb9FKhvJ2r/8A6VzcA2rjsUKWFp9a9oL8uYAwNdfgtNU1sPsU0K1GswnFfKgC0wWFuXNOmohK/j5Oc8w+zqc0NtGLN2b8atNc8sudQuns10YDbbvr4Ok31qt/Jc8i/AotE6V9WL711GMAp04FsjdfBYIkHf7102D5qn90I77K8dKnUg6xaPMLl7VYyj1TWABzmlxgc12jouHtVwq7Rc092k0NPkrwnKMrbGMnLSDRqblJlIAcRqteGw3yo1cRUkYaiAXnjwaOZVdRxc4l286DQLTek62zrVhWOd+tIB4DefwVIp53BoFyYXRw7A1gI0Nm/d/fqpzy1FYY8rhEARAG4bk0TCG5VYqoaeHe4G8ZQuWTd06LdTbBiHnEVnOGhdkZ4LdUAZDG6NEBY8K0fKKY3MBctFR0rfP4jLD5qp5yglUgJqhJIbvRiLJwdkcCLBb9h7JdtralPCB5psIL6lQNzZGgXMeg81hIXr+g7sLhaeOxOKxNGg6o5lFhqvDZEFxufJTnlccbYeMly5dar0R2dT2ZiqOEwrH4qpSLadbE1C4tdIvwG/ctPRnZ1bZOzXsr4dmGxD39s06mcvaBYkjnNl12sc5ocwZ2m4cwyCPJCYEGy47nlZquiYyXcRrfOeVyvBdNMcMRtn5M1008EzqtbZzd5+A8l7nE4tmz8DiMa+Iw1M1BzPsj1IXyStUfUe99R2Z7iXOPEm59618OO7tHkvGlRSJitWysC/aO0sPhWAzVeGzGnErqt1N1hJu6dTF7N+R9CqGIqjt4zFNDQR3WBrvifguTisQcU3A0iczmsIdzc6oXfAgeS9n0/DWbIwFOnamK2VjTua1kBeK2VROI2tgaI/pK7G+8KPDd4e1/keXjPUfW8diW7Oo4nFuaMuGpuqOsLkNEe+B6L5rteg7DbH2PTqGatelUxT+JL3wJ8h716jpnjamMbiNj4AdZWAdicYW6UqbJIB57yPujVcPpiW/ythKTT83QwVBrQNBIlZeCa1/LTy3bzuJ1DRogTFOOaBOd0i8alB5J8F1fw5/5Vu73krW/QjwKrdr5K0fQjwKdE7ba09cyf6tn7ISt7yet9M3mxn7ISwsp01vZ8H3Nof2A/wC4xLv4J8Cfm9pT/UN/7rEo1SvYnUV1/pG/dCLOaFaesb90JmJ/BfLRTNryvpOwjm6L4EAQBVqgx5L5tTuNQvo+w/8Ayvg4cB87Wvw7q5P1PUdHi7XVbAgwCd2mmqzFkknU7lreGuzAEQ2OdlU9o1JNpXFXXGGuALE6QQQYj8liqOGYi0jSPyXQrAaCwbui59VjdRLhe5IiNEQ3OxLsxIBPGTqsBN7roV6BaSItoIKxVKRa661xqKageJ8VrAGWXGxExos1MQRy5K1zzlgeFlN7VFLtSraAkiEgaDqtFJiWV4VI1NuOMq+kJiLKoDsK6jeLLmrWL2tIgEKzKVKY9FaG2Cg2d1haEgeJlaKrCQSsjwWyrxTUqP7GhWGq6L+/ctLidCCs1Vp3f5rbBnkzCsWmx371pbinQCfZWXJLuRVgAA136rWyIlq41pgzeFM8iBHks9QkHiL7oUpOvrKXqNmc4h2tkwqSZNxxVdTe6TfSN6RzxlIsRoq1stjUfIvrzSscDAJ10ncVU8g3nRBtWLXlXrhG1tVkCREDmsdQkEgTcytPWCYPILJUDr8bSVphE5KpmTv8UoPFEmAJSgwSdy2jCmnKDG/Ur0mU7B6OCl3cZtHvRqyn/lbxJXO6PbOG0dqM622GoDrapdplGg/jgptbaB2ntGriYin3aTTuYNPXXzU5X4VjPljNgOWgTYemK2KpUi2esdljjKTctWyh/tnZ/wD7lnxUKZcTh20OqqUahfSe8sIJmCNQs9VsidCt+MEYGlyx1ULI4Sr6Sdjs7AZiRu3Fetwu1m4Ta+zOkDgerxTHUsU1ov1gGV8eNnLx1F0EtPiF29kzjMHjdl2L6jflOHH/AFWagfeZPooyhx9ijz5orhdD9qDamwKJc5762H+aqOfq60gzvtHou6nCFFBFMkRQRTIVEEUwKiiiZCooomSIqKICIoIpkiimsLy+2emNLCVHYfZzW4is05XVCew08B9Y+5AeoAJ0BPgoL2FzwBXy3FbW2hj3E4rFVnz7GYsb6CFlbVLCHAmdZaSCPOUbPT64dUF882d0m2hhXAdca9LfTrmR5HUL22zNqYfauGNWgS1zbVKTu8w8+I4HelLKLLG1RRRABRFBAAoIqJGVRFBIwURQKRlKCJQUgECigZ4JGUoFNBQgb0jKUpBO5WWCBqcApNXlJ3KdW5OXk7kJPglsy9WeKnVtGqhcPrBKXtHEpbMSxsaIQBo0JTU4N9UM7uCWzElw0ACTtcfcmJe7UwgQfrylsELXG5lIWH6vvVuQakow3gEtmz5TvI9UMnNaJaNC1IagHtBGxpV1fOPJRP1gHtKJbGnhkVEQutzooiiEAAFEVEArzlp1DwY4+5fMW90L6XijlweIdwpPPuXzRvcb4BdHh+WPk+EQd3Sig/uO8FuyayO3gW8mqvFmcbX/ALQrSGzjMC37LFlxBnE1j/1HfFAVqKKICQigigJH8QrMJfH4cf8AUCr0VuBE7Rw/3p9xQF+KvtMeC6+nRmr9qqfiFyK99qO5D8F2H26NN51T+0ovwc+XIx30ODb/ANNx/wAZWP1+C1489nCD/of/AKKyKoEP8XUUlS/NMhGoT+nqkbM705mD+IU1Ud4gjoZgZ0dtGsfSk381yyN4zR6rq1ez0M2ZMXx2IP8A9bFyJ4e4rBvOkPP3hX7PaH7SwbQB2q9MWP2gqO1z8wtmx+1tzZzTF8VS1H2glejnbftU5ts7QPHFVf2isa1Y85tpYw8cTV/bKx1a9ChBrVmsk6DtO9Atceo5726vRu/SHB8i4/4Sj0hdGMwxJgNwlMSdLklcTZ21cc7aVMbIw4die0KcgONwRMG2ibHYHaLdoNG1sU813U2vgOzENiwnQeCPX69q39Gl2d1FrqwF6bXOHjFvek2Zh2Utq7LFPLJFJziN5OYn8Ej6FOlhq7hLnCk/tPcXHRaNnf782faLUv8AtlF+f+RFW3/95Uh/6Wl8CueOXxXQ2/barRww1Ef4VgE8PxU/EX8noD9JpfeG5BpJweEBuAx5Hm8o0P5zT173BMf5nggf6k6/fKL1/n8nO1mCa01peAWNzEybHsuifNctxFZjDaQPRXYguFFwa4i4Jg6rPQrNZSqtNIucQMrg6A297b5WmPW2eXenT6LVBT6RYVpuKpNIiNQ4EQvbUqgfsqjWFM9jBVWP+2GsqGCvnuznkbTwzm2PWtieO5espbR6nYNenh6lOp8nY2nDtXOLXdcfLOI+6uP9V4/bKWfw6f0+esbK42EHV4faLRMHDUv2ws2k6D3LRSvSx8GRlos/xfuVJbE/vC2t5ZzosTx9xXWpj5pn3QuX43tyK6zB82wR7IRinPoMskDiV5jFPNXFVng995+K7G0ca4Z8LhzLg0mq8ewOC4lCkcRiadJts7gJ4DitseOWVd3a720MFhMHTaGNyNqkDwgeZuVxHFa9o4r5XjKtbRpMNHBoEN9wWVjM7gJgak8Apxmo0qzD0sxv7f7O/wBdPVdCL8ByVdFmVuaILot9UbgrVjnlutMZqAVlx4Jw44B11rO9ZceYwwG8vBRh90Gf21nw1s7hwDVY/WElD6IcySjUdDSfRa37kTpWLuLvIIkoDSOCBKYFbcJRrYnZuJytJpUKtNzpIgF0sFt5Wejh3YhtQtIDWZfMkxHxPkulsym9+w9qspF2Y18MBGg7T7lK3U/+v+40pfszaWBqZm0a9Jzd9MkEei14bb23sO2fl9csaYy1Yd5Q4Lqbf6Wxin4bY+V5Y4NGLAkuOhyg896TAdDMbjiK+1sS6g55k0+9Uji7cPisva+u/JqL1zrBg2j0l2jtHZ7sLi+pFN1RrpZTyl2XcbxF1wHEla8YaAxFVuEzfJg4ikXmSW7ifHXzWSJWuMk6RldlXtug2zC0VdovaZALKZ3Sd/ovIYXCvxWIZRp3c8wvZYn5SzbGD2DgcWcLQo02VKpBIBqEZu1F4iB5rHz5b+if3f6a+Kansq/0hVOzsykDp1rj6tH5ryuxaGMxO2MLS2dU6vFl80nzGUgEzKv27tbEbYxdOpiDTmm1zQWWaZeSSBu1R6ObSo7I2zTxtdjqgo06mVrNS8tIaOV1vjLj49fLDKzLP+Hsdh0sDgOheIxjqgYcZRqNxFarq6pDhkHG+7UzK8r1h6TdIcDRdmw1LEdRhge8crQGzz3rv4Lo4/aAq47bbXUMO41KtDZ7HlrWkiZP1dNNTF4XAwWJqM6TYOpUZmdhckDNuYwn8JWeGt5WXdXlvUl6cuGtpHKIBJPNVOE3mbBP/QN8JQeIW07Z3pU7UKwfQjwKRydv0XknekzturfTNj6jP2QlHeHimq3rNjexn7ISjvLOdNb2fB2ZtCP6lv8A3WKAKYTuY/8AsW/9xiYBK9nOopr/AErfuhMxLX+lAn2QmYn8F8tFMc19G2D/AOXMEYv1ta8/dXzmn4r6LsSHdGcGCL9dVI8eyuT9R1G/iag8GRN9dYhK/KRrmy7pVbQc29pBmw04qAjOQM1+NyuKuuM1Vp7Tt9xMaif4uqCCRLf853raR2XSTl3HkszruMHtSLhSpkq0zBM+JidFzq9K9teRXYfDhYTLiVzcQSBJOg1VSlYxCY4pmtk3QAkqxgsqtEh2sG9XMbBlKxshXsbBlZWtJDBX0m3j3BKG71dTEWCyql9NpI8Ve0KtkADer2gQOagweLGywVmwV0zoslemSqxpVzzc6XS1GEiy0dUZ0smdTli1lRpyy0Ai99yJpy3M33LQ6lD7qNp9ggDlC09kaYKjYO70VIcQ4knlJC1VAJN96oczeN61lRTtv/mqXNuNDAUe52kn0StvqLg77qomkcMrdSsxdC11ARc2myxVAGuIla48s8uDGpBzWlI9wIsNedksxfSOCD5ygajhvWkiLSu10iyAd2Z9UIk62XY6O4EY3aQqVrYbDDrarjpbQfxwVb1EN+IH8i9HaeD0xe0O3WH1WcPgPVcMrXtPGu2ljquKfYPMMaT3WjQfxxWLzhZtOjStOy/98bPJ/wCYp/tLN4wtGzSP5VwR/wDUU/2ggDjmxg28to1gsZG5b9pWwZHDalX4FYjvlMlDuw4OG5bcLiauExFHFUDFWi8VGcyN3np5rK4TKag6QW7wih9B6NYulszpK7D0jl2ftem2thgdA43A5QczfRe7XyLBValfYbhSMYrZNUV6J/6Tjf0fB819V2dj6e1Nn4fG0ZyV2ZoO47x6yox/Ay/LQooorSKiiiAIRQC52I6RbJwryyttChmGrWEv+CqJdNFcmj0m2NXcGs2jSk/XBb8QuoxzXsD2Oa5jtHNMg+YTIyiiiYFRRFARRRQ6Jk850v2y7Z+CGFoEiviGmSDBDJiJ3FxMTwzFfPab4ILTIaIB0knU8vBdfpnWc/pRXpyYpMYI5CmY97z6LiFwyloBtpzWeV5a4zheXue0SZSiR4cFWGuJGWRO6VK2Lw2EgYnEMY76pMu9Ap3aemhru7JgkLp7K2hU2fjWVqJJc0d3c9u9p8fivNO29hG2oUKtadDZgHrdKzpBinOApYOkDMCSXGUrjl2c10+40qrK9Flak6adRoe08QdE68d0Rx+1sfh2soto0sFReW1TUpnvalrBM79+kr2K1xvtN6Y5T1ugURQVECCZAqTAoIoJGCCMKRxSMqEcU1uChI3KTJHBQoylJSNI5pSWjeoSlIUqAuHBKXFNAKBAjRSZC48UhKshm8oZmD2ZUmSCUchRNWNAAlNZyRoaZ/goZDuKU1XJDVdxSNbkdxSln2lUaj+KRzid6WzWkDeUhLVS5zfaeAkdWYNKjSp2elxISz4LMcTT3kpTimRaUbg00Fw4qLGcU3gVEbGnnUYRhRdjmRRRFARRRFAZNpuybJxruFF3wXzkWAHJfQ9tyNhY8/8ARK+eldPg6rDydglqfRlMlqXbHErdk6rR/tfCjgG/Bc6oZqvP2j8V1Gj/AG3SHAD4LlEySeJPxSgBRRTRMIp4/FTVEIAfxotGz77To8pPuKoV2Aeyljm1Kj2sYwGSfBAXVTO06nIrr1j/AOHcOwXc98gC89orOzaOxsO41G0Kles65dlsT5p3dK3MGXDYFrQNC9+nkFN3VRztotcx2GDmuaBQaLiL3n4rFbl8Vpx+0a+0qjaldrGloIAYFmv/AAU4Q35/BEZBqTO+EsxwWfMmTaypSaZNLP8AecfwW2idm4pop1XVMDVJgVbvpeY1HkuUx8i6cCVGWO1zLT2z9nvqdGcJhafVYqrhK1avUYxx7TXNbGXiYBK4VPD4Gs/DhmNbTbWBkvaZpO3ZxwP1gruiWIq09p9VRqFjgWvgnsuaHAObffBkHdC5e1q9MbUxlOiyWNrvDc1oEncuXHHL9y4W/wAui5YzCZSNeL2fiMA8iuw5Q4sztNsw1Hin2XWZhtr4KvVLhSpV2VHx2rAybeSev0kq4nAii/C4ZxLAxzyXFzg3uzfUbisBxzDhXmvRD3yGtDOyAOcaq8cc7NZQsssZfpro4rPiX1H0nFraj3OBiLEk/iuPtLCsw1SlkcCXNOYAzos2IxFTEvzVDoIDRoAqtF0Y46c9pw8tIc05XDQixCs+WYkvD3YiqXBoaCXEkAaDwVEotdE+CrSdt2HxmIrudSq1czDTdIIG4Tqu3gGPZtjZryx2R1JhDosfm3b157BvLqzuVKpH90rsYTpHVwdKlh3YZlVtGMrw9zXC3pv4LPOX4aY2fIbfP+2XjhRoidfYCwjX8wjiMRUxdbrapBfka0meAgaclB/EOU9RUNRIFdhtY8US4Pw+CabAUSCf1iVG6wJk+CQicFQGk0tfMqVMVQuqukgwTICNHDVKtN7mAQ0TBME+HFGT1OsWW/CuNKk0GCcjrRpIV5ZWThOOMt5YWU3htJ1JwzuJIg3ECVuwrK+HoYmnUrTSOHFUMa6QS6I81mac9EktYBTw5uWzMmJ8V2dsUqrKmLzNEU6WHoOcwQ1pLQQPQFLK8yf53Dxx7rPSb+jbRJ3VaDb/AKxVMjdC0NaKdLHtzhx+U0wCLTDXfms7nNa0ue4NHMrO83/P4XOIYNc6wBJOgBlX7Q2gabvkmDIdiCIc8aM4xz+C5xxD6xy4UEbi/grsOxuHpva0dotkuIuqk9eai/UzVcuGwbqbTJebu+sqcF2XvqfVbA8Tb81MdUDq2UaMEItHV4dvF3aK1/2/2j/d/RXGStOGpTE7wHHw3Dz1Wem0Od2u6Lnny810abC0drvEy7xUZ3UXjN06iO5CVztkWHEVG1BUBb222g7gtb3BrC5xs0SVmxTBUa2bOAkkC608ffKM+ZwzU3PFIOjsi0q8YepiMM+vRpuLMO3PXNoYC6GkcVQ1sMgutwWrGUKmz8TWwmfQNzwdZAdHhotrZvhlJdcsyCjjwQQbvYRjaeysCGtAdUz1XGNTmLR7gseFxJw+xNoNZUcx1WrQBDT3mxUJ/BaRiOo2Zgjld2aOVlozHM4mOUnVUYJk7Ix5MB4r0LxpaobLHD/db+f/ANa5fEn+cO50Wp7P2RVp4rG5nYuo2abmszNw4/8A+o37l2+kHSHBs2JXbgMZTq4iv8y0NBDmg951xwt5rxtHaWOwb+sw+Ih0R2mBwg+KoxWKr4lueu4OddogRvkn1spuHtl7UTL1x9YxOjdpuQhEqS0albM3pOiODp9dXx1chtLDsJLjoFi21tjNtfauJwjzkxRNEVI1pAAW8co8ldWxWIobKwuysJSex+JeHuBEGrNmgcpJXN2phaVKvWoYcmozCMyVqwuH1J7RHKbDwWPhx3nc8vn/ALRr5brGYT4YcZROHqNpvD21mgiqxzYyODiI9IWzZBbSoYzFBk1cIKVZjou2KrQfitPTPtdLdoOiA9zXjmCxpB85lX9CW06u0Mbh6zc9KthHNe3iMzSfcJXTlfo25sZ9Wn0KpUFWjWqsINOpSc9pnUFpMr5rQJPSB7v+k86T/QOXdG2xsTZeL2LjGVH43Diph6LgBkcxwOVxcTaAT7l5p1cO2o6o2o1rSwgOm30ca+5YeLC47bZ5b0yC1Jn3QpVHeUJByQbQAhUOvgtvln8Knapx9D+qkfqrG/ReSq9JnbbV+nZ/Zs/ZCQd5PWtWbu7DP2Qq2m6znTS9rcFduO/sh/3GKyOSrwN247+xb/3Gq4HxU5dqx6ZsT9P+qFGaqYn6f9UIM5qp0m9tVP3L6HsMuPR3Btbqa1W4NtGr57Ruf3r6JsJjX9G8O18H5+p+C4/1HUdHiWuD+sJaSM0HTUJGNgCbzofx5StmQFuVwGs333lZqpIB0Ak2jgN38blx11QjnB4MXjfKpMgGb84TOfAmezvtIVb62UEk6ix+ClTNiKjW6m/FcuvU6wydBorcXWNWpDTDd8HVZiJ5qpAjd8bla0TeFXEWG9WM3/ilTi5g4q+mJKrphX0xzt8FlVxa1shXNEeaVjQQCrmDfuWdUsDLCdyuaR7lUBZWN1SCw3ASFs2TMF4VkCZQGZ1EWkJDT7JELYWEiyR1Fx3KpSrl1ae9IxkiP4C31KBIiFSKOXUgErSVDlYikQT6rOKZ7sXFl2X0GAy6qBvIkKg4fDsdLsQI3nMtZkixyjTLZkGeaqFjEydRddlztnh3bqZieElJ8pwFOcuHLuJygfFaTJFjk1AKgGUg8ljOHql0NpPda2Vphd521mMEUsIwGd5/ILHW29jL9W2gzyJ/Fa4Woyjns2bjH/8ADvA+0I+K0jYGOfBy028y6fgqKm2doku/SSz7jQFVVxWOq4DrTiq7urqBroebA6LXllw6A6O4gCX1Gtng0ldZuxMZR6OHD4I03PxRz1XuOQubuaN02heR7VQdtz3Hm4lbcHj8bgP5pi6tJu9kyw+Rsi7/ACNFqU30nvpVmFlSm4se0jQjVVeCvxGIfisVWxFbKKtV2d2QQJ32VLomffCQSw0Eq7BPo09oYWpiKhpUmVWue8CcoBmVRPmFIkJh2NsYVp2a6vhsTRxdJ2ONdz6J7gcDqNdVyCLykNNpMw2eKcIBSJVYPV1Adxsr4VVVtkSiupsrGt2ftGjXq9qhenWb9am6zvdfyXvehld+Br7Q2BXcCcK81qB+sxxv8QfNfMqDs1OCJ3FepwG0nYf+Stsh0uwjxgsZHtM9lx8WmPFqi8XY7mn1BFS24yNx4hRWhEtR7aVN1So4MYwFznHRoGpTLz/TbEGh0bqU2uh2Jqso+LSZd7gUw8tt3pPiNsOdToF1HAz2aYs6oPrP/Bug3yVxwyCQD4EKoP8AnATFnSeHFWGq43sAb2GiqZaK4rTUcDe5ImVt2btbFbNqipg6ppg96mbsd4t/K65s6F0TuKLYOpiUrkqYvq2yNq0tr4IV6YyPactSnM5D47wdxW9fPeh+MfR2xSYO7iJpPHlIPkR7yvoQTxu4nKaoqKIqkooilc5rGFzyGtaJJcYACZPmvTOmG9Kaz4jPRpEnyIXBDT2rgACS4mABzXpOmW0Nn4raFLEUKrqgZS6uo4CGugyIJ113W5rxG0cTVxVOA0MwwP0bfa5uO/wXPdXK8umS+s4JjtsPe3qcAXNZoa2hd93gOeq5TabmgPLSAT3iNT4rS2nneADE2WuiGVc7HtylwhzRoQN8bjzWvtMZwmYezn03wdV0KFQusIEiJH4rG6g5hIJmLSE9EkHWEstWFNyvsHQHHuxmwqjHiTQrFucgS6QDfiRx8F6peK/0a0cmzcdW6xpNSs1vVjVsN1PjPuXtQqw+2M8/uoKIoKkogpKEpGhQJUlBTs9JJ4oFS6mU8lJlKBTlvNKQOKRkKWVZlbxQLWxqpqtqy5KXJjlGrlWXMG8rO1UQuVbnc0H1mjRqpdVedICi5xcxWkpC4DUwqXOe7VyQteRoVHsr1XuqNGpVbsQ0cSqzTcNYHiUjgPrN9UvanqC7FO3NVTsTVO+EHC/eVZbxKndPSGq/e4lI6o4jUoxG9I6yWzAydUsTvCDnJS5ANHEgIHLvcVWSgXckwscaI0c8+SipMqIJ5LE9I6VPIaFPPmALsxiF2KFVtei2qw9lwkL52bm9ua20No4nDYWth6R7FSJdNx4L1L4/w4Jn+Xu4UXB2TtyricVRwtSkAC3KHeAXfhZWaaS7RRRFI3O6QHL0fxx4sA94Xz8r3nSd2Xo9iftOYP8AEvBldXg+1z+XsEHXcwcXD4ooZnMe17QMw0kTC3ZO83BYj5f8pDeyAQAdTZcMtLHFjhDmmD4pn4nE1TNXEVXfrJEQIihuRQEUU/jRRARDLe6KkwgJHipvUnwUQE/i5U/jRRRATWx3rNGUrTpfRU1B2gBdEBWmE4fCr01V1LDVq30VGo/7rSU6DUMTVw1cVqLyyo0GHDdKqqvdVqOqPJc95JcTqSd6tbg8Q+v1LaRNQatkW8eC30tgV33rVqVIcjmPuUW4y7VrKzTm03dto5pnGWOau7R2FhGdp761TzDfgtNPZuDpCRhmE/bl3xUXyYqmFeTEudDQSeQlaaezsZW7uGqeLhlHvXqmRSb2MrOAaAPgoSIkmZSvl/EP9twaPR/EPM1KtOmORzFa2bAw1P6WtVf4Q0Le/E02WL2jlKz1MbTPdk+AU3yZVXpiqq4TDYfC1nYegGkU3DO4knRXYDYOC2lTa/D49/XFoLqOQF0wJidYPuWbEYovw1ZoYAMhuTJWJuei9lSk803tAIcwwR5qb7XHi6qp6y8zbt0OjNHECaG0mkSBldTyOGtiDobK53RQBo/TiHEiM1IEEHQggrHR6TV24dzMTQZiKstLaxIBIbudx8VS7pBjXMyU+qotBlpY2XN8CdNVhr9Rvv8A7N5+zrppxuxm7NpNq1MQ5zzlLA6mGh8zMEaxquRSqMqYWkHBw6tkTxCsbVqYnF0zXqPqEuElzpWeif0Vvh+K3xmUx+q7rG2e30zhbjcA/Z9DDvrOYRXaHNDXSQCJE8Ez8ZhBQEBzq0wSWwAI3EFUV25sLzaAsQMhaY4+0+qoyy9bw19t2De5jXOptpsY57WEtbJJgmLFb9o7TbXx+KqMqkNqlpLQS4EBoA3DRc2jXq4cPY17gyoIe1riA4cDxVuPx78Wyl1jWl7JHWR2iIAAJ4ACydx+pPtwtpvxNUPdh6ZOc53PeR4SgMI1zs2Iqdc76odYLCyq5hkSgahcO0Sd8lP1u+B7T5a3jK+GsbkboNErazqbnPbTqFpEEZtFnFV40cSOCL6pNMiYB4JzErkFQNrVzkBaHHQmU9R0vgaCwQotcG9YRIIIF96emyHZnkti/gOKdKL8NSymSO7fz/d8VqCRjYaLZbaTpyTxHgubK7roxmoKBRPJZ8ViOopW77rN/NTJu6h26m1Vep1uJp4cHsh0v/JSu/MSeKpwTe1UqHcInmUXmXFb2auvwyl3NtOy8K3GbSoUqhikHZ6h4Mbdx9As+LxTsZjK2JcINZ5fHCTYekLbhD8l2Pj8Xo+rlwlM/eu8/wB0R5rlAox5tv8Ax/n+fAy4kgzdGYCXenaAWuc4dkAjxMK0OpRqPxdShUfVc6nhsO2mzNoCBMDkCSmwP+48YTZzsVQEn7lRdLagyYot7ILMNSbAt/QtWDCCNh1r97Fsjypu/NYS7lb2cxUaUMaQWF7jlaBqOfks1ZwkBvdaIC013Q90R2ewPx96wuMlPEsiG5XW6M7M/lTbVGm76On848ngFyV6nDuOw+h9euJbiNoO6ljt4aRc+k+oUefKzH1x7vB+KTftepyuG0Plm1dr9IG/Q7PoluFnTMexT+Jd5hcJlBrOjlYw11WpUJBDjIDRey6+OoHZfQOnRy5KmKxDH1QRBiCQPQBY8W12Fdg8N1rnN/k91TK4Dsl7SSPcE5NSTHqf/hb3bv8AzbibRxlXaGPq4iuR1jw0W0gNAHuAXT6F1er6S0G/1zKlMeJaY94XIxDA0UHSZqUg4+pH4K/YmI+SbbwNc92nXYT4TBXTlN42Rz43WUr6DtHYWA2rSBxDMj2sMVaRhw3wdxC+ZuDmHK4EGxgiF9eqMPzzLkta9kRrYhfLsb8ox+JfXGHqANoMJ3w1jWsLvCQsP0+Vu4280nbGLFFzpO7TckKI0Bt5Lo0x2j9VY36HyVbu8rQPmR90pXo521Vvpmx/Vs/ZCVuqfEfTt+4z9kKtuoWc6Xe12B7uOP8A0m/9xqtbGtp3KjB2GMHGm0f/AGNWgaA+eqnLtePTNibVR90IMRxP027QIMKqdJvbVSFl9E6Pk/6vYYwCevqajkF87o94L6FsEx0bw8CT19QifALj/U9R0eF0KjyBoeVrrI9rjd3ZvMarS059CMsj1hJUaXXAPCy4q6oxPrNa0jMDBN5iLrl4vG5SWUjr6BXbRw1c5n0yXtFiP3Lk9W5royuDjxEKpIZmmTN5lWBhdzQpMlotvstDW2hLKnIQUx4pmsGt43K0NsLHzTtZ2lnavQU2wdFqY3n6qsN0VzBxUVS5oETcqwFo9mQlaCRYpsoIUGuaQdwsrAb6BVsF1YLC2iQMHEHRHMTYBKEQEA4J9FDMalERF0HmEyZazSudWdI3LoVXyDcLmYhoDpn960xTWZz3CBF1XVe51mg24qwCXGbSlr04netppnWF9QtJnciHgjgYKRzHBx4osBm4W2mewc8A3mOKqcATvECyd5jgClIzCw9VUhVmcBdWYMAjGD2Th3W8NEjx2jJ5XVuEsMWAf+Gf+C0+GbKO6PVMCkbdjSAmaTKqpOCToC7k0SSlFRh9oA8DYrfsVpftvBMDspfVy5oBiQdy61am52yXYvEMoVjR6zrM1OMwa7KIjRRctVUm3m43nTipHmtONpUGswOIw9EUBiM5cxptA0VEAKklG+E25AC5Rlo1IHigxHuQcAZRFxOo5XUSNTTOSqWzYrtbEcyrWr7NrODaW0afUydG1BemfW3muUaILhM8Fup7Nr1cE3EUsNinNIltVjCQSDujmEZWFH1DojjquO2BSGJcXYjDPdh6s6y3SfJduF4OhjK2ysS/bOGrmpRxDW1MTgXDKXuLQHETo4ETfmveA5mggG4BujHKWJyllEAnQE+C8Z0+xIc7Z+Bb2nNc6u8C8CMonxk+i9JtbZGH21hG4fE1MRTYHZpoVSwm0QeI5FeQ6Q9A8Dgti4nF4Kri3VMO3rHMqVAQ5o72gF4V/CZrfLyGIxOGwtq+Ia1+uVnacfIfisr9tsaxxoYGo9o9uq8N9wWKtRZTeMjW5TpCJyjEOw4Eh1Ml5+Cc0vV3pop7fruI/RaMD7ZC0M2q8jM7B08vFlY/kuAWuYVrw9YgxNspEKssZ8Ixt+XrNjdIcJgsbRr1KD6ZpvDoL+yeZIFvRfUtl7TobWwQxOGnKHFhBvDhrBFiOYXyvofgsBtPbmEw+NyVGkvcKJ1cWtzCfs2X2AWAAAAAgAaAKMJ3T8muIKKCK1ZCsm0dmYbauF+TYtrnU8wdDXlpkeC1oo1vsb052E6P7LwTw+hgaIqD23DO71dK8B072fSwm3HPpNhuLpisQBADpg+tivqK+e9NtjbTxe2amLo4SrWwzaDAHsIgASXb1Hlx+jiNPFl9fNfP8jab5jQqUcrcViKrh2nceCeoO0TuKpdpFljLt02aM3K4QRqZlV9gONvUpJcXZWguJNgFqp0G0vnK5aSNGkWB/FO2YjHG53h2ujW28ZsWvUrYdrDTq08hFYkNJmQQBrF/Vek2Z0yxx2nS+WV21aD3Br6bWABoNpbF5C8T1rnGSZJW7AB1fEMpirSo5jHWVnQ1vMrnvkzlmq6v2PHq7j7TEGCh2RvVWCLH4Kl1eKGKDWhprSDnI3mLSrCLr0a8eIS1L2UCEFnaqQ3ZQsggls9H7KBypCUCUvY9HOVCGqskoSpuR+qzsoEMVcngoSRuU+x6McvBVkM5lQv4gJHVLWAUWxclBzaY3FVOcwaUyUS8ngq3En/JZWrkB1Y+zTA81RUqvdYnyTlrjuSGi87lF2uaZ3HilkfVlaDh3KfJr3U6PbKSZ0CUk8FtNHklNAHcjR7YHGdyQtJXQ6ho3KZIFgEg54w73aNKnyR+8Qt5L41PkEhD+JQGI4VyHybiYWshw1JS5eKAzjDt3n3KK+OAUTD41BYATF0uYEaX4pSblQZiCQDA3r2dPLXMxNWm8PpvLXDR29el2Btapii7D4p+Z/sFeZYJc0GJmLrdga3yDGdb1Yc9u4FRnJpeNsr20XRhVYXEMxmHZWpaO3cFc1zHPc0PaXN7zQbhc7ZxOlhjYJH1qzB8V4Ze36ZS3YtD7eIHuBXiF2eD7HP5fuRBHzUWzJFFFEBFFFEBFFFEBFFFIQE8UVB5qICbp+AW2jsnGVoPVimDeahj3LRsqhSpgYmuQXT82Do37XjwVm08cKjaeGpVMraroe4cN6zuXOouY8brLT2Y2u4inVzU2mHVsvZJ4NGpWunsfCtAztNQ8Xu/AI/K2ANZTaQxohrRaAgcY/2WjzKzudaTGNlPD0KP0dKmwcQwSq8Zinjq8PQdlq1yYcfYbvKxuxFV3tR4LMS52PBc4kikNSlPzTsdagyjhaYZSEA3JNy48SndiqTRdwPgudCkKN7XpsftBs9kOVLsa9wIa0DxKoU4oGjOxFdx75HhZVnM4kuJd4lMoU9lomhsiEYRAStOQle2Frfd/FV1BDJ+yPgrMTbCVjyHxQrCGR9lvwCc6hXusQTgJWpgtKiLcN/OaX3lVS+gA/jVW4b+c0vvBU0vowj4P5XEZqTwd7SuYDZdNhkxxC5kK/H8o8nwsBlEkWnRIDdNUsxnOSr+UfAgEGOCUskG8RdAO4BFzrW4I5HBJTHueF0ispAPqsaTAJueATS11mBtOjQntBt+RN01Jjc8ASG3M7zu/PzVbZq1i/e879zVrY0NbZYZXU03xmzjfwU3oCVJvzWLUXPaxjnOMNAkrj16prVC93kOAV+NxHWO6th7DdTxKz02dbUawe0YXT48PWbrDPLd1Gyk3qsKwb3do+eiqJ1JV9d0m2ibZuGGM2lQov8Aoy7M88Gi59wUb4uVXrdmMWbWPUUMFghHzVPrKkfXfBPoMoXMCtxuKOMxlbEO1qvLvLd7lUDuIkLTHH1xkZ5Ze2Vpmw0Em8ArobRwxwNI4RzYqUH1GvMQS6Aue4dkwu30pJ/lfaEkn9Kqqcvuip9tb9uEtx+KEaUaY8PmmLBQdk2K22uKcQPCm0fitu33TtXHRoGtHoxoXMpVh8haw92nUe/xJDR+Cwx+1te4prOiGi+UQsx1TvcTvSLWTTK8tOAwjsdjqVBgu9wHgF6zEUKe1ellDABofgdlU5qNjsudaR5mB5Fc7oyG7PwuM2zXaMuFYerne7QD1IXc6NbPqYPZjsRihOLxruuqE6huoHvnzXNb7eS5f/Hif3e//wCN9euEn55YumvzexcGwd0V3WHJi421wK+3sJRJAa/D4alxgFgH4rudNWZthUX/AFcSJ82n8l5mjUOL29szNmu+hTk6kAgfgujCfTv+2OV5YNo0n4bEnC1Yz4XNQd4te781laSDIMEXB5r0HTWh1PSXEVLfpAbXjgXCD7wV5/et8LvGVjlNZWPreEx3X4CjtENltXD9b3gO0GnMPUFfM8Viapp0A2qGUeoDG02VJtPaDo4m/oul0axWAD6tPadetTNOlUOGJfNIOcwggg6TNiN6TpHs/DYN2AfhMPUosxGFa85zZxgAuA1AJnXXcsMMZhlcWuVuWO3DAkElN+CHswiFsyhXaq0fRjwVLu8rh9H5Ipztrr/TN45GfshIzVNiD86OORv7ISt1Wc6Xez4U2xYj2G/9xquaTlbeyowt/lf3G/ttWhm7wU59rx6Z8T9MPuhK1Pix88ObQkbY6Kp0m9ttLVe+2EP/AA5RlsxXqankF4ClrHFe+2HLejtAtzEmvU08lx/qOo6PD23NcC0OcNQCbTZWujLJBkGZWVr8giCREIuflENBJi2UrirqVVrlwiZ/FZ6lNryQ7un6xVpJEi5BtB1StDXWsQYmySnKezJXc0CI3A6K1gkIOYesc5xJJKdoF+RU2qhms4JwxMwE6iVcGyFClcSY0VjQIS5TKtH7kA7BuVoAbqQqGkggfFXCS2VNhrG2TkhVAwLyiXeSQWtTggqkEI5w2EaDRIAVFZ8Nke5Q1eF4WKvWJmTZOQlT6va334qqoQ4SqajovrwEqrPBJ36aLaYotMbHhG5B5zACLoF8utCX4Qr0lRUaCSTbkkyEQQD5LWWg8BKQtABsD4q5U2MFRsXmyDbkQJ8Ve8DQ8d6rDcp7xBPJaSosZqwgmLgBNhhDcVa/yV/4JakF+umifDCRidDOHqSPRaTpFYgOy1MEB3d9gj+S0Q6Ww/8Af2zj/wCoaF2sUP8AwxtCN3ygf/YuJsMf7f2dH/MNXdxAno3tMDhiD/8AYscvu/8Ar/uudOBjbbP2SdPpPgsm5a8Z/u3ZB+08e5ZD/ErRMQXldTZDT8m2jWDKT+ppMcW1WZgZcR5LlQuxsW+z9tj/ANKz9tTl0c7W7Y2dhMA9z6mC+aJtUoVMpF4EhcnE0Pk2LdSDnOp5Gvbn1Er0PS+2EZwNQeXacuNtYRtL/wDx6f4pY9C9sou9tt6+n9C8FQPRjA1fnQ8l5MVnATnO6YXzFglw8V9U6FH/AMJYIcHVR/jKepeyy64dx1DDuqCo6ixzwZDnNBKtmUkqSqmoz0dcjpTtP+Suj+KqtdFeqOoo7yXutYb7SV1ZS1KNKsaZq0mPNJ+dhcJLHQRmHA3KqUnwWq4QALhogFKapy5YmRE8F0ekuyHbC2zXwXWPqMbDmVHNgva4TPkSQuR1naARI238pVoFwgASkw+Gq1KuVtNxI1totdNrnHUBu8lbaWdoAYGAHe911OXl9Zpph4Pe7fSegGBwOB2O0UcRQrY+uOtrhrgXM3BvGBHrK9Yvj+zq9fB42hiWtHWUXBzSOS+w2NxojxeX9z/hl5/D+1f7RREIrdzgiioAqiRS1aLa1J9N85XtLTBgwRCdGOSrRPjHSfYDthbSfhmuc+g5ofRe4yS3nzBsvO1BAlfaOmmGwVTo9XrYykHVKQig8d4PJgAcl8eqNHXgCYmy4s8fTLT0PFf3Md01Cl1Womo4drkOCjng1IaC5+5rbk/klIrVqha1xZTHefHePAK2nTpU25JAB1aJJPisbed124zU1EpUHVZ66oY/qqB+Lt63Ueow8AUyxreMn4rOHsDYJLQNC0FsK1r6tPtCoHgiSDqRxCyz3lw0nDr7Px9fBVxiMBiOrJs4suDyc3ePevoGxdu0drsyOApYtol1KZDh9Zp3jlqF8uaWOBcOy9onOyxA48xyWrBY8tqtZVcadRpkVGWg7nt5/gn4vLl4/wCYx83gnlm/l9cLUuUrk9HNu/ythqlLEFoxmGOWqBYOG5w8V25C9GeuU9o8jKZYX1qrIUMhVpI4pTHFFxhbpMgSx9lWEt4pS4KbIrZCOACBa47wExeEucTooulTZCxx1clNI7yVYak7kC8clFmKpaqNIDVDqxwVhcOSUvaosipaTKBuCBIG5EvCUvHBSopdyQLh9VQv5JS9SaF3JKXckC5KXJbMSSUpaeIQJSElIzFvNCDxSElCUjMRzQOXmklAlIGJakJHBc/HbXpYJwa5rnmYys1WHEbbwWKw5l7qVRl8xB7BR/Ru2HMIkOBHJReLo7WqGu6izFObRaTe0EblFVxsKWV4TTVMyoAIueSjhpJkwld3dF6/bzeljiHElrICtpu+tcRFlnBlsTCtaezbRTYcd3Y+2G4GhUo1RlZlJa4D2osn2dtPB7J2bUxeIeX4mq6BTae0/wDjivPPqhjM7zbcOK59eu6vUL3eQ4JY+L2qr5NNWP2niNqYt1bEONz2WA9lg4BZ1WxWBdMknEYb3yKiiiAinkoogIooogJ/Gin8aqKICao+qH8aqeiAKm796iB0KA6LBlpN5NCy1z+mUhwutmjRyAWCsf01vgsMO63y6bGKwBVt0ThZ1cEqpn89qHgxoVjtEjB+lV/Bg9yJ1Re4vUUlBStFFFBvQQKIkIb0BAiEAmCRqcUYwlXwHxQrXbP2R8ApjT+i1OcKx4kEfZ/BXOon5rA3RMFmGJfwbHgp8qf9Vq39Kx9o3YUTiqX3lTS+jCOz6xq46iCABmlZhiXMGUAEBL1vR+07bGkZ2rA7vu8SrqNc1KmVwAnSFVVEVn+KrCauqnO7m4UQrao+ZZ4qkK+p2qcDxVXuJnVUDUKOU8lFSQTsEkDjvShslaqVIEidIk+H71Nujk21YanDA5wguuBwG5XEINJ1KI1uuS3d26pNQYgLLja3VUwxp7b/AHBaalRtKmXuu1o9Vxqj3VHue7VxWnjx3d1Hky1NFWrBMu+ofZEDxP7llXQa3qsO1m/U+JW3kvGmXjnO1dQ3V2GrDC4DF1f6Ss3qKfge97lmNyhin2p0wbMExzKj13qL9tbqiUzZyngq1a0wCNy1rKGiWDwW3aWIqYsOr1nZqlV7qjjxJElZSRkBHBXYwRh8OBvpArP5jT4rr7ff/tPaAH1415ALlvOWmKY8/FbdtPzbdxp3MquPnuXMLpWWE4jTK8g4pmNL3BoEuJgKubrtdGsJTxO1OsryKGGaa1QgTYJ+TL0xuQwntlp6Buz2up7N2K+eppt+WYyN40Y3zMr0DiSZIjw0XA2TtDrdpE18NX67FuqVqziwjKNGMA3gNE+a9JXdh30KNTDtltVucRIzAixuuSS4axra/VvKOB0rGfoziZbdlWmdZ9oifevJbEp9Z0i2YL3qNd8T+C9n0lh/RvaAAkBrT/jC8n0bb/4j2W0mCxry7lAcV0+O/Rf8+GOU+po6eAHauFdvOGE/33QvLEL0XTOo6ptagHCA3DNgeLnFV9GMFQ2lWx2DxFIuD8PmbVbE0iHjtX9PNbYX18ctZZTedjhtIBvodVfisZiMZVFTE1qlV7WhgL3SQ0CAPILftfo3jtkHPUp9dhi7K2vSu0zpP1TyK5RaQTII8VUsvMTqzihN0ZKVHVMgdqrR9F5Ko6q0fR+SVVGqv9I0/Yb8Akabp8SIqj7jfgEje8onS72fDa4n7jf22rVSFtLrLhv+J+439sLdQZPBZ+StMIzYxvz4+4FQ3vLZjx8+0SDDAsjYzKsL9Kcp9TbS0C91sd3/AIew441qkDjovDUHQbBe12bVps2JhM7gCalQgecLj/U9R0eHtunM+YEiLapTP4xMRyS9aC5wzNgXmL/xKHWtM3aJtBOi466oD2EukyNdDYotggkDtRcWUFTO4zHO+p8UzCCQCBu3b/4hRaqMVQZa1Qc7Itbm5q2qAa7iE9NmYXUWritrSCtAbIOh5J20+A9ysFOBBN0tmoyXv6ouEDS2qty8kr2WQSgWVzTDFVF73VkEU5/BMGFtN6Ga8KE2SB3a5cEtBbmtdVOfckmI0RdUssdaodx8FUhWr+ugxPks9V4gkHxVTXdoyTwUqOkfkVcxTtmrVbH81R1snnzKNW5jj71kmLH0hb448MrWjrSHfFWNqkO1sT5FZZE/vTB14CqwttzDqIkJnAFxt71mpPkDdHNapDmk6WlZ2aXOXPrd60T4LOKsEtjdEc1qxLDJtpcidFz6hIcJvust8JuMsuBqGCL7vVPgzfFa/wA2qfgqbgRcW3q7A/8AFmP+FqfgtNcM/lmb3WogXQbZkb9UWiSeATJ0NjR/LWAix69q9A+HdHtoEbxiD/iXntkEDbOCLojrQSYXeo1G1Oj+MyODg5tePVY59rxcDF32Xsgx7TvgspWnEGdkbJJ3Pd8FmNwtaiANSuxsX+Z7bA/5Rv7a467OwYOH2yCP+C//AGpz6VO2/phfC0vvt/acuPtY/wC0mnjh2fiuv0sg4SmL2qtGn2iuPtb+f0jxwzPiUY9C9s7O8F9R6Fn/AMKYTlUq/tlfLmG4X1DoT/5Ww39rV/bKRZdPQKIIppEJkoRudE4mvEf6T6AdsvZ+IM/N13U5jc5s/wD5XzGlRc6rncxxpjSB3ivU9NOlb9sYqrg6NOk7A0qhbRffMXCxfPO4iNCvNYjFvxWI+ZoMoMIytpUZ05km/ir5+G3jk/3La2IdTAhjW7gBcnkrKOExVYTWrNotO5oE+pSYaiykZd262925vILbTrBru05oO6RIXPllrjF3Y475yX4TZVNpkV6zzyqWPkvpmwuktHFBmExuWliAA1rhZr9w8CvnFOuym7tsaGm+Zuh5/vXQYRUaCXF09x+8cjxPxC555vJhl7K8nhw8mOn1vQog8l5Toxt91Y08Di35nHs0qhMnMBdhPhcHeF6qV6fj8kzx9o8fyeO+PL1yMCmBSBFbSstHkKSlhEBUTyn+kDO7Y+Ha2cprSRxhphfKHM62tlzZRqXfVHFfedpYChtLBVMNiJDHXzDVpGhC+I7SpNoVn0KLxUDnkdYBGYTZcPnlnk3+Xo/pbMsPX8MbnvxDwGEsot3/AMb1f3hDGhrfeUhLQYkBrbAKCpmFr8wue/w74ryvpucabnA6wTIPKCnoVg4OptsAc9M/VOhCj/is1SadUVL3s62vNXPqTeG1mLdQBMXpHMwHe095h5bwtL3NbUa5t6feb903XLrVJAP1hB5q/D1C7AUDOjcs+ajLDjZzLnTt7M2tX2RtGhjWy4Uz1VUDR7OHpp4BfW6daniKFOtQeH0qjQ9jhvBXxbBH5Q3qXGOumlPB4Es/Jey6BbaPa2TiXGDL8PO46uZ+PqtPDlq+lcv6rx7nvPh7hBEpVvXBElKSiUqm1UQpSVCgSotVAJSlEpSotVEKQolKSpqgKUokpSVFqgKUokpSUtmBSkolKUtmBSkolKUtgCUpRKB8EtmBKqdVY0lpqtaQJ7SapUbTE1HBg4ncvN7fqgBtN2INWlUY7I9pBOb6tuKJzdBg27teu7FAU6rHNpuzQ0RlOkE71xy+pWL3Maajx2nZCs5zOd1Lz1RNu0YAPNUZWtcASDlMS0xI4rsxwkjC5bq/FOe2o2mXUzlt2eSira+nmDmNBg91x1UV9J7cQvvYqB0iCUiggb4Xdpx7WtMFR9ZtIZiQXHRoVLqkj5sOJ5BV9TWcZFN5P3UTHfY9iVKjqrpcfLgkKvGCxB0ov8wrBs7En+jPqtOEM7FYg6k6lUcx4hzTBCIKDRFKXZRKdtOs8S2i8+SACisGFxP9THiYQ+TVt5pj9ZIK0U/yd++rTHmkIyuLcwMWkb0BFP40UUjkgIlzgGL2TK/Bt/R8TUmC08EBmD83daT5Jg2qdKTvRXHGZWzleTzdC04xrqDaGR7hn1vPBAMVhqmMbpPZW0lY6o/S38gFhh3W+bWzRWBVt3J2rOrhklP+cYg/aA9ycbklAy7EH/qn4InVO9xchvRChUKBEIIoAIEHQao71CUAI7U7oTaIbiufXqO/lNsEw0tAVY4+xZZerRjv5s/mQr6kBrjy/BUY7+bu+8PxWh+jk/8AbC+a5Q2bizHzJEjen/krF5g3IJP2gqjjMTUIHWEndzWqk3FkS+sW8gASum5WdueYy9HwWAxGGxbKlVgDQYkOBuuW7VdanTq9fTLqznNBuCsZGTDse5rHkmLtSxy52dx40ytJDgRYhF7i9xcd6tLmE3otvwMLT8lpkfQelQqrnJ2mY29MAKvY4EQdVccJT/qqo8KgP4KfJaXCuPJpU3LGqmNio03EyAFX1T57q0iiG6Pqjxpz+KDwYPbP/wAZBRLRpQGkGCPJa6BgXuZuVlIyd2PEqylUcHCRZGU3BjdV0BYJtTKqa6QqMZiCxvVtPacL8gueY23Ta5am1OMxHWvytPYb7zxWVFBdckk1HNbu7q3CsD8Q3N3W9o+S1VXSVXhBlpOfvcYHgEHlZ5c5NMeMQAk+KBp9eyrVbADHAeNj+SLjkpPdv7o8UuBrU8Pi6VSsw1KTXgvYDGZu9OfmFfwoaJNl0Nm08M7Fv+VlmRlGo8NeSA5wYcotzhZajG0sY5guxriBfduQdd5JVZcxOPFFxNwOCtruJNIEkgMbr4KmJBKLzOTwASP4acRiX4ivVq1CTUqOLnHiVTKG9A6qNL2IsZXoB/szo21rf5xtF8niKTb+8wuVs3BP2hjqOGpiS90HkN62bWxrcbtJ7qIjD0h1FED6jbD1MlZZ/VlMfxz/AOGuH043L88M9HFYijV65lWoyoPbBIIW6l0i2lSaxjcc4tbZoc1roHoqsDjGYXEMqFgqRqHCxC9NWw+zzso7Rq06Jw7Wy4taCQfqwd8wFOVkurBJddvN4/bmO2hRp0MRVY9peD2aYaZHgs+DxT8Lt04gMLnMa8kAx7BH4rNicZTxONa+hhmUKTSAGNPPeupgxRHSHEdQ8VKYw1Yh8EAnqDe/OVpZ6y8fFRLuz+2fpRiBittOfDQwUmhoaZACTo7tNmy9oVKlVzmU6lF1MubTFQ7iLHmFn2vijiNqV3loABytaR3QN1lhkkyAB4LSY/T61ncvq27+3dufLar6WHqCrSqBjn1SwtdI0AB0A5LksxTw0ZZdUzEyd8rNmKAJG9OYSTRXK27O9pDiC3KRqEG70JRabFUQHVWD6PySG5KcdzySpxqxH0rfuN/ZCVmqbEfSNj6rfgkbqFE6Xe1mF/4j7rf2wujh4bJIuBuWDCkD5Rpdrf2wtdM9ongAsvJy18fSjGn5/wDVCztT4qTWni0FVs7yvHpGXbZRubr0wL27M2dlIAPWaHXtDcvNUXdoSbb167Z7B/J2G7WUFrzJFpzLk/UXWnT4PlnD6hF2OvxGqta+TBBgXjLdbMjhYtmfNVQDHArhtdchG1C11ibbkzHFxmdEHMzEaWKsayxtPFTVRa253X3LXSas9NugnRamDSPisqpfTaIG9ORCVlgnPFIKyAN6QjMCPgo/kq7i8lUSZROqj+y0D4qt7jpKTrCT4J6JZmtxlISAZt6pc83mwSkiYvw8U9BH1AdLrO8B40ninJBBhLwvuiyqEzutKrD8sQd2/ctLqdoaLDgs1QEcL2WkRWas4nvWngszh5QtNSnJkWMKhwIFzeTAm4W2LOlGm6E+USQRaUotPPmmFxAHlKojUzDoNgtbKkhpB0+CxXkHVXsdygEKcoco1pyHUrm1QPeuo4yCR4GFzK+pVeMs1BAjh4K/Aj+dx/ytS/kqXHxtbVXYO3yq1vk1Tz0W3wyZmnshML6ykbcC6YeAJTS0YXEPweKpV6Rb1lJ2ZuYEieYXWPSE1GZMRszCVGXkU3luutlw9BZTnZSp0a9bA4rDU6bG1sF1JLqbCOsbppIKxGb3BST4oSEA+5dXYmbqtrNaCXOwUAAST2wuR6rZgMdicBVdVwlc0nublcYDgRMwQVOU3NHO3d6VFrsC4hzSRiG2lcfav88oHjhmfErXU6R4qvT6vGYbBYph+vTLD7lhxmKoYrI4YarQqMbkaG1A9kTO8SjGaFZ262C+pdCP/K1DlWrftlfLARpdfUeg7gejNJgILm1apLQbgZuCRZdPQooIpJEIVaQrUalIuc0VGOYXN1EiJQp1qdUE03teAYOUzBTqpU2PhO3NiYnYuLODrsPWMMMcBaoNzm8QfcqWs6t7mMjs2e4bzw8F9f6Zuw7Oi2LrV6bHupFvUlwuyoXABw53XyVrMrQIjejLLh2eD6uQY2SBuCYvyOnKHN3hOLaKmtNnA6arKc119RdSq/JXtlxdhnm4Nyyd4/ELZh6pwWM6qqYovcGuG5vBw8NVzqfbZUpG4iR4FaMR89h2E97LkJ8lOUluqqdcO+HGjimjMaZqHISD3KjTLHDwII8CF9I2HtX+V9nNrPGSu3sVmDc6NRyOv+S+Viq7GbOp1A75yrTzg8KjR+JaPVek6H7U6vazGAxRxrYI4OiW+8EeaX6fK4Z+t/pz/qvHM/H7fMfQkwSTZMCvTleQcIhKCmWkTXJ6UY35DsHEvBh9QdW2OevulfHqzIJrOsNGBe//ANIFd78TgsIH5KfVvqOO7cPhK+fVagqVQG9xmk715n6jK5eW/wAPW/SYevj3+VDg1ve/ekLge6CPFM50kxcqsjeSpjpF7iIB3JXk5JiQLhHNI3GEGuAeL2dZVAxVX5QWjSZC30YZhabOEEhcquT1mUey7KujTPuha5ziMcLvKtWEdJxDQYLWsqtPAgxPvXT6ypTxDMXh3ZKpIrMI9l4N/f7iuPs85scGHSrTdTPpI966FKqXYYR36Zzj8Vy+SWXcb48zl9hwGMbtDZ+HxbAA2vTD44HePWVcV5roPiRU2LVoA/zeu6Bwa4Zh8SvSErr9tyV5GWPrlcUSxvRlDMQp2RSEpTFyQlRauASlKJKUlZ2rhSECESUpKm1QEc0pAUKUlRaYmEpISk80pKW1aEnklLkCUpKWwYuS50pKUlLZnLkjnlKTdJUl9NzWPyOIs6NEtnpzds49uHofR9f9ZgqAeR3rxW0se7EYgPdRp0Gt0pUxlAXo6+wsTjMe5wr4UZQXACc7j4LzeO2XWoEZagrvzFr8rT2XcCdF0eH12zz38MlVvygBzD2iYIIgDzOqzdW4VXU4GYGNbJw3O7LUqENHmqiSHza3EWXZPw560UW4d1Oq6q52cAZBMKKllEOcQXtkC19VEcfkOOpv5IKFdzjb3bSFL6HDAN0EuVR2tX3U6Y9VmP0P6ySOySjQXO2pijo9o8GpTtLFn+l9AEcJTDmFxE66pW1ySAKdMTyTJW57qjy95lx1PFRQ3JPNRMA7RdDFPGGyCHPzCe+QFgdw5hbtqiKtEcGT70gGEqtxGKZTNFoBmTJO5Y3vcXuhxAk6LTsz+ejkxx9yyayeaZA5xjU+qYaJCrAgQf41U/jVRTzSNN61YMf7PxR+0sq24QRsmueLj+CAwOHYK621WxUwzeX5LmxLQOYXW2uP0ugBuCVEZzosbv5zV8WrWdFlF61U/aA9yxw+W+Xw1NOicKtqsCzq4YahV4buVDxquVjdR4qvCXoA8XuPvR8U/lcoVFFCkUm6G9FARRRRARc5/wDvT9dq6QSdRT67rcoz6yqwymO0547VY7+bn7wV1XR/gVRjj8yPvBXVe6/wKfxB81yMIJxVIc11TquXg/51S8fwXU4rTy9s/F0amJewc1zqn8zpGPbK6LPpG+K59X+Y0fvlLDs81LWlwZAn/NdVZMN9A3wWvcl5LunhNRIQICJKUlZrQJXhMDKVxlOEzvAmCsujuYWmp3lld3yujBjm2Cv1dDMRJ3DiVgc4vcXOMkmSU1V0lrdwHvSK8cdcoyy3wiiisoNzVROjblVeEybaoyU2s+qIVTjdM929Vtu+ToLlYxtaWsbtZwE+aqiES7M4uO+6C1k0xt3VtZ4fUpkNAysa0843pdSUm+Ux/ejR7OJy2U9pvkmIysbJBJE2KSJIUqWIb0JT0abq1ZlNglz3BoHMqeldu1s8nZ2xsVjdK1f9Honfcdo+Q+K5jRYQPJdDbdRjcVTwVI/NYJnVTxebuPrbyXOFljhzPb8/5Guffr+FzSSIlW4nH1hsp2Ba75l1UVS2N4t6LMHR4qvEOke5VMd1NvCumctxqupsao6ptHEnV5wtcC2/q1ymDtALpdHg2ptkMqEinUZUY4jUBwyk+9V5Ptt/hOH3SMW0hm2jiS246x0eqzBp3blt2hRFDaNem12ZrTYnfb85WZouYurl4RZyrIMoJ/FIqSIbPFM6zvFFullHi6WzKFZ7PkqwrBp5IpxpxH0o17rfgqxuVlb6T9UfBVjVROl3tfhoHXTvaP2gtbBaNw4rLhm/SfdH7QWtrTlmLLHO8tcOmTFwa1vqjRVM1VuKHzw39kKlveWmPSMu2ylEr2eAYf5MwZiWZHGw+0V4ul3hYr22zyTsnAnKMopubJ1PaP8AEri/U9R1eD5XQSM2uhExYqqoQCGix3ea0OBETunUqssJEDUAclxOqKo96uY0zokaBNtFfTbmaICirgtBB/NaKYVbRpCvYCIUU1zBzlFwJRbzRcNZSCpzZlUubHjwWiJVbxdOEy1HAiVleSJA8lpqa6wslRvqtIVBtQui4g8U4ObiqspBB3LS1ojQnxTpKXnJfiEjqoaYkXurq7ZZ4LnOMamwMKsZtN4azUbBvAOkqp0ESDE6BUF5DYnlE7k9GpSe1zaubdlc0908xwV+pbVVS2++8RCylsknf8FrqilE03DMAcwe7U8lQCxxglrSOF1piiqCAd/gmiw3jiFqLGxYg8jqkfS7J6twPKVWy0zuaWmCOHP3qMeWnjCsa4sIDnEU5k5TceW9LXYcO6C5lQf1jTY8EyQ1rbjafFY8Q7Mb6HRWFwLZbM7xPwKpqyRPmrxmqi0gO/eVdgyJxR/9NU/BZ/ZWjBGfln/tn/grqGVncG4q0AlunuVTe4LblYHW3XG9OiDoEb7lNCZU1UmGjrqC+9GfNBMCD5ItcRvOiUI2k6aJAxPE+5FJHJOJMpGaZ3rXs/GOweMa9laph3EQ2rTdBb48lj0QeJynyU04+k7L6YtDm4fbAax2gxNPunm4bvEWXoMfjGUdm1cQzPVZkkOo3JHEQvkWDxQgUa7uzox/1T+S6OH2ji9msdSw9d7aT+9SBlp8OE8lnlvWocxm3p9jY6pTrmphMHicR1p7RDhFzrAXrWY3DPpVH/KKJFIfOQ8HJ4r5tS2w/JWoYacLTr95wPbiLtB3BbMCzDYPAYms6qHg5WnA07gyRBceKwxyvjml54e12r/0g7fGLdgtl4eOqJ6+q7eSAYHpf0XkS4E3T7ZxD8VtuajiXNa90nmY+CoDgSYBgLp5uMtbeOTHiLC60pKl2z6oFxBgmOSYEERvS6b9q6BAc1hNxIHgVY2oTTfTcYP4qlwLXtLTcG45JazwHkj2hKrW071HV2Lif0ZrSJFOqXATzV+zK7qOKFNjocyq5tPk5pDm/D3rlbKB61tKdTJ9CVc+saWLrVBrSrdcB5A/gsssPqulY3eM2+34bHU8Xg6WKa6G1WhwB3TuUdjqbKrKer3GIXjtnVmOwLaJdLsJWdLXVMoFKZB98BdKjUYMU1zXB1amBFRxkNHJZ39VlOHBf08lr1QqCQDYlWAgrztPaTKlMFj8r2OLiXjvDdAXWwtYvw7Xu1cuzxfqpndObPw3GbeB/wBJWJc3atGmwyPk7c0HTtEwvEteSy4Ild3p9WP+tOKscrW0wb6kCF51lQVjZwaRq06qMsd25aeh4MpqY750YngICDjwuiSAq3ENKmOgM3agaol2Zt9VWLOkqZoqN4K9I2wk58YSNM2ZdAOiOS5tFwc9x4uW/UnktfJPhj4ruWrsK/JXpvNoeD710XfMYg8LyFymDfvXVxTiagdqXBrhzkLl8k5dOPT1nQPEGjtLEYcns1qJjxYZH+Fx9F7xfK+ieNbR2zhC4xkqAE/ZcCw/Eei+og8d1k8ctTVcP6jH69/kxISkoIGU7WMiEpS5Q+KUhZ2rkAlIXJilUWqhSSlJKHWtNY0r5g3NMWjxTFTtRClJVkc0h8UtmQlKXJz4pCQUtnopd4pS7kUxISkhLZlJP1T6JSXcCmnkUCTxKWzIc3Alc/aderQw7qgLqYbfMBc8l0SeaoxEupkMBc8iGzpPEoDyPZxmFOLxFeq6pSEudIa+PqhcbGVn0Guo4XEV3YR5z5XEgeY4rftHZTmVHtpPfVDdXZSC48hvWJ4rMwNOnVbW6rNmAJgBdfj12xy2z1MJWY2i1zGzWHWMgiSPwWd7y6iwOJytsOKJLTci/AHVVEyumT8saNTsvBaAAQNN6iWTv08FFaXIUUUXa4zH6JviUp+jKZ30TPEpXfReaA0YQRhnHkfgstITUatlC2Ed9wrLR+kHgUFQQRQTMRd7R9ofFbNrfzpg4MCyU71qY+0Fq2oZxngxqQDZn86eeFJyxjRbNm/S1zwouWMd0eCZFcrAkKdAiIqfxqokaLdhhGxqh4u/FYToVvo22L4u/FAZWCSwcXAe9dPax/T6Q5Fc6gJrURxe34robU/3k3k1LI8WcFZad3VDxqH4LUs1C4J4vcVjj1W17jQ1OFW1ODZRVw4MOaqaL+rwIfEwC6PNMTFSfsEqnTZsf9MJycFa04eoa1FryIJ3KxUYP+aU/D8VcSoy7q50BRSGo0OAm8wmBS0NmjeoookoQjvQ0R3JBlx30Q+8FbWuypGsGFVjvoh94K5+pHNaf7Yj5rnYfC1mVmvLQA07ytuWrpDfVWNR3oyztvIxwkIxrxUBcW24SsFYg4KgBqCZXTJgTwXKq/zWiPFX4+UZ8L8P/N2HgFq3LnU6z2tY0XGhEbl0Es5qnheEJSkFQ3Iuod6lSAQUCpKBcgKKiyvsQtVQrNV3LfBhmqN1FCpK1ZItFAZaZO93wWbUwtWgA4KcvwvD8lcUHnLTPF1lN6SuRmAHs2SnZ1WoootGYgSUx0HDSUB3SVJ7MeaRn1jciLEeCrEp2iymqg711tiD5PUq7Qe2W4Rhc0fWebNHqfcuSIXUru6jAYfCtF3fP1fE2b7visvJzPX8tfHxfb8Mlzdzi5xuSd54qcEJUlBHBvoq6l2xqjKBFwiCqmnL2uC6XR8NGJxD6hIazDPeSDcQWrm1eyQzfvXQ2TLHYsAZs2DqgiddE8/tpYfdE2zQGG2rVpNmGgRO/VYxAbdb+kVVr9rFzHl3zVOc2oOW4K5fWugggeiMZbjBldWmdeVUUbIEytIimzwUziHXBlVJhKNDZk40SBWAW8kqcaKpl/kPgkGqLrnyCgCj4X8tGG9vwHxC3UmTTPP3rm0jBPGF0aLxlEwsPI28dYcY0trQdzQqW6rRjR+km+jQqWidFpjfpZ5T6mmiJcNy9jgKgZsrAtO9jzcbs5/FeQpNghez2aGnZODDmSQ195OmYwuP9T1HV4PlecpIh2v1tydgiIO+LBWg0SBLBPjCBFMsGVscDMwuGuqMri01XDMJETOh8FoYLbjukKl9MdcSCNFbT1Majmoq4vYBvVrRoqWHmrQfyUG0NtqiSkaeyCNEfwSCb7qp++QrZKreIvwlVAyuEmLrPUYRuC0OmSq33OmvNXEqMpyieNoV7W2nUqpxyi3vSmtAICrsjYgljeRtquc8ZidAVdWrEyOOnBZiSZ8bc1pjNItI6dAdLWVD3vpvLm9kjS2quNwSJKz12mCTr6rXFFVuqOeS434p2lxkuy5RccllLgJdmA5BOys4U3N+yQtNM9tHyoAthpDgLHVOcSO04vyOBsN5XNe8yR6qs1cxi97yn6D2bqmKpvdOSDwInzCtw9alWpVMNXLWZhmp1YMMdwdHsnTkYPFcdziH2M+KlOsA4ZiBeJPDRXME+zU8uZUio11OO8C08JCBNQZRUolgcbSFXVx9R9KmHElzGhgc49qG2aDxgWHIBZxjah7zzlbu1srmFqLlHRxGCq4WlQ64Edcw1abtWvbMSD8RqEMHb5Xywr/wVWLxNbBvw2DxjvlGGZQbUptYcuQP7UtPHxlW4TEUMQyt1IqMr/JKudjoLXRBlp1Ftx4WKWrrZ7m9M7e62LFO2SNUre6PDcmbEjTRFEWM6sVGGq3OwEZm8RwWyizZuKxFOi3CuY+o7K0gkCfIrBN99uCv2fI2nhCP60KdHtZWo7No1X0nV61J7HFrgSTB9FTi8L8lqUC2q6pTrMc4ZgBpH5qvbE/yrjI0NU/Bbdq/R7M50XfBqchVgB4JhM2a5xO5okoZYFjPmi2o+lUFSmYcNDEpGhMDtMe3xYQo17CYzAnguhiMZVoYDCVgGl1YuDrWt4KnEVDidl067wA7rwLbggbUA3VjWh1MHmVULLRQpPfS7LHOEnQKMulRUWrVhsVYUax7OjXn2f3IfI6ztKZ9FP5NxT7NoOdPBSpoe1zHw4X+Ktw9dwIzAPDXA5Xb7z6IYbD4yjSNLE4LEVGt7ha245eCScjwX4bE09/bpkfBRljtcycN1Y4jamLrvABdPICXaJzVY0WcCeSwB3WVDpLjmjxKtZlZFwSDc8F2ftSs7+ouF1Iv6wG7sxO+ydtUZTrHFUis2QTNuAVnWtI1A9yP2sfyX+p8k+AL5cACCVmqOhxE6AR5rXVa3qxUbYsMiN4K59R+ZwjUCCn+3pU89z4sdjYnax0nQNPqRAT2r1q7vZdRJJ4ZT+SybPeKbKtSYhhPp/mrMO/JRqn/ANPU08FzZY/Va7JlrF3sJt/5DiKlQUBX+b6p7XuLWlxEi/vXYwXTvC5mNxuFq025pc6nFRnpYr5hhq5c6Xkl0C5K3iuGq7+lwnDgvnyzu31A9LNi4fEuL8S6sAJBo0iRJ3A2XK2x09rVKbqWx2PwjTY1nwah8Bo3xuV4N1Zr2uBOkGPNNWqEdZe8G/NTj4Zh01x1lzTitWquJrPdVdVdmzPcSSTxJ3omm2rneyZBlVhzalPKD3hIKhqucQ+wraOGmbmt8ctcVOfi3PbFY15b35cOI1UnOezB5yqhWabOGU8ErnZCXNMJ5eKXnFOH6jLH6c1jzu0VVaqKdIumToBzSdcHuGYxx4LLXqGvW7PcboeJSx8d3y08nmxmO5VuFZEE7ltDoMcVlpiC0BxAG5WZnE2cfVPLC2ow8+OM01NkNtFyurVl+Ew7xc5I8C0riMJsMzteK6OEz1KFNnWPjO9pE8pWGfhy4rbH9Th+FlB/ybHNeDHameRX0fDdLKL8S6ni6JoAuPzodmb57wvmWIa9rwS42EeS7xeXNa4tglrZ8YErn8mOWOqdyw8j6eCC0Frg4ESCDIKBK8BsvbeI2XUAaTUw5PaouOn3eBXs8HtLC7Qp58NULvrNNi3kVEzY3CxqJQJQnmUJ5o2NM2NxlLA0Ouqg5JgkCYXGwu2Q8YupXJIIzNY23xWjpEBVwGQVi05gcjRJevK08TVpuIaGidczff4rG22tsZNN+K21XdXo12O7TQYERAO48Vds/buJNdrsTVpupkhrgRBA4hcPEVzVqF7nl7vrHeqHVanV9XmIZM5U5idezxvSbA4bKKLvlLs3aFM6DxWV/S/BbsNij5D815ElISr9UvW/64YOYOFxQHg0/iu3Sq069Flak4Pp1Bma4bwvmhN10dkbdrbKfkM1cKTLqW8c28+Sdw/BPb1azaTZdPKBMqnDY6liw3qyQ9zc4Y6xy6SuHt7a+Hr0qAwmIzBwzzTcQRwB4Ll4PF16L6dalULnU5DTE5QdQVn63W1be2JSFy5eF2u1uNdgcVWpvqWDKrBDST7J4FdQjcUrNANVVWq0qFMvrODW8zqpXqU6I+cflMWXj9pY99eu8OIqNmzhw4QnjPa6Fulu1tp4lz+rexpY15yxY8pXn6uIrupCg95LM5fB3k/FWPrF73EmCqalUnfPAHcuzx4+rnyy2zOSyJAvCcNDnGSPNIQPPiumMkGUgyYKiFR82gAblE4TjqKKLtcZ3/R0/NK/6IJn92n4Kup3AgNtMRg3f2ZWSl3v1StotgnfcWOnYn7pThUiiiiDPRE4ikPthaNpGcc/kGj3KnCicXRH2k+0DOOq+IHuSB9n2bi3cKP4rHuC2YK2Gxp/6YCx7kyAp0hToEFT+NFFEjA90rottsWnzK5rrNK6opPqbMoU2C5AOiAy4UTiqA+2Pitm0Tm2mb6MCXDYGtTxNKo6MrHAkAGU2PEY4uMjMwblOXR49qDqFlpOy4cu3jMfer3VQBIbUMD6hWNhJpBnVuM792qjGcNcry1UicgJsSrpsqM7stqTvNwR6ypEdUP74U3GnKNd+QkxPzZVgZOHDPsAKir1lRhblY2RE503W1Ro2la3eKNcHvlqY0U2BjdAICMrL11X/pD+8h1lUnv0x4NJUelvavaRndm+Xbz85PkuiDCzZqn9aPJgUBcTetU8gAry5Rjw1yiDyWQCRerVP60IGm3eah8XlR6T8r9r+GyTwKkwsOSn9QnxeVAyl/Us96PSD3q7GPb1bBIu8b07q9IOM1Ga/WVAawaUqY/VTjXusHgwKtTWi3d7P8poj+lZ6qfK6I/pJ8ASgCRvjwARzO+sVOsT3SPxdItIbmJIjulYH1JYxhB7IN4XSc90d4+qw1HHrL34clphr4Z57NSrU2tAJ9yv+U0o+kHqspqP3FM2o8s70HfZO4y8lMrGg4hm57PVL1zCO+31VLajibxbkFC48G/3Qj1h+1Xda2e80+aBqDiPVUzPss/uqH7lP0R6we1M5wI1CpqXi+9PuPzbfJI8QAYi/FVE1ABKdpGhAIPJVAkCydt3XTsKUrmQc7dAbps7Xb4KdpILmjRzbrObu0ROR0tvNtQqntc1xDtdVZRaS+ZuChiTmxNQxAJkJzvRXrapRQKHRUgQ6EcwmcsHkUqiDMNJumBsDu+CLDFjGU6goQAZbMcCka+hTAqB9Vp6u7idxATOxJquL6jzndc2VLarmU3Uzem65CAYHd1wPLQqPXndX7cai4VGfXA8iiA1xgVad+LoWcgjUeqESj1L2bW0XHQsPg4Ja9N+HDXVAASJa2b+MLKIYZab8kwcHPz1XSeBO5L15P2NSGr3a81u2c4D5Y4gkDCVNN0lo/FYzVE/NyOWqaniK1IVQw5RVYab7Ay0kGPcEWWnLpftmrTq7TdVpvbUbUpUnSDvyCR5GR5LCBmmVoq4zEVmgVKjSAI7g04JMPROJrspNLi53AJziclebws2exr8fSa5oc1xIgiQbFbcTTwoFUObTBDSW5QJncr6GzMPRqNcXVXuBsSQBPkuLWAFeoALB5A9VlLPJluVrZcMdWK45IqTzUW7AwVjdFUFY1TTi4X0tZHKd10GmExNlCxaADchXtrU2x2j6LG50osaXXSuO+zmWumqq5tesXZ2jsjvGNEaVAF8dbR8S+yykSeStomHapa1OD3utoZ1bWuztM7g7Rd7CbawlPA0KBFbPTBBIaCLmeK4Yh7LgEBUZi15EDX0XPlhM+3Rjl69PaUsdhKwBbnbO5zP3rSMTSJcQ4AE3kH3ryeErPERAgrrNxIDQTNt/wDGq4s/HqunHLcdUOaXmNxhMwnn8VzcNiH1KpaYiLeS3sdv/BYZTTWVpa7TxVgcqGuJ8JTtNgoU1NKMxzVLDIFlZKkzEgoO0R8oSuM70yZaokaKgnjqtLhJN4VLmbh8FcTVNTSY9+qyVXwI0Wxw7N/VYK5ykla4pqmq4m3BUuMW89UXuExMTwVBqE8BvW8jK1oGusKmrYG9ioHyySlqO32snIVrFVblNjYpKU5hlBda8Kys2RItG9VB7qUOFiQQY/Fbzple0rse2o4FpaRGqyl/avbkupSiphTPa6mBmOoBNvfI8ws9QMMtjM0/WCcvwmxiJl3GVS45YI0mbrW+gS2acCbQbLFVa+i8NqNiRbmtsdVnlwlWoHuNt29LmhxB4blJbvdHkl7JuCAPRXOEdte0MUzE1aBYSRTw1KiSRElrYKXCdb1wqUXFjqfaDxuO5Slgs7c7nkM3ADUrUDlgCBwA3KLlJNRclt3V0C9vQKAacEBp+9OIgcli0Df+SvwP+8sJyqtVP4rTgx+nYc2+kb8UjU7XvtTF86p+AWnahHU7Mn+pd8GqjawnaeJ51PwCt2mfmdmf2TvgE4TGCgfPVAKDXzQG/HX2Ls/77wkj/YTeWICbGGdiYD+1qJf/AOCP/cNQFHtQmNSsylTFKq9gLnSGmJ0S700DqaX33D3BTVQvWVjrVef1iiH1QZFWp5OKMWRClTdQxOOZhG1aWNxDTmc3vk6Dmr37c2pQbW/THODKYMPY0zI8OarwrQdn+FR3wWLaTSH1YMfNsPuCnuqxcFjZrVGT3RZbKdIDUCdViLizFujfZbaZc9pJ0Oi6c96Hi1bfyeQDHwTA7yI8UIDeZ3AKS46e9YuolSlLHOp9l8TbQrC09gkakyuhUeW0KjpFmHRc1lmNstsN2cuXyyY5bjdSqFmHqiLObGvMLRQd8wDEghzTHvWEFxp5Q3etWHcW0n5hDWkEzwJ/ei44lM/I5DqbsPVfTdLXNMQj1rjabLRtVv6RTfrnpNBPNtvhCxA84HFdM5m3DeLpaHlru9rZbnPztzeq5TjciZHFaqFeW5Tqozx+Wvh8km8avacolptKt64FoFRvgQshflkagpTU8fBZ+m2/7muGt72uA9r4qpziAYuBuKz9YRz8UC5ztSVUxsRnnMu4Z1RzhABAT0w4RZBghX0xpITyyTh4pexBdM5SiHEaNnxTkQ3RNTZNyLLP3bfsTaAkDulbMLiX0ntOSwqh8nduVHLirWaOas8vJdNMf0+O23FzaWEWcPdZdXCPbXwdJ15AymRvC5tU56FF++Gkz5grpbOrAYc0xRY/K4ulxO9cnkzuWOq1/amHMOWm86K7B4uvgcQK+Hflc3Uahw4EKGrRiH4R08WPKQnDH+vZ4gOXOHttn7YobTYG0/m8RHapOPvB3hcna+1KtXEOw9Oi5gpEOFQOvI8F54dkh1OrmjSxaQtQqNNN4Mhzru+0py2UxkPXxtRlKGve2qLBwdPZ/Nc58iZJzG5JVlUcBNlU5s2unjJDqp2pVZKsIO4JCDwWsSRyQlO4W1VZVQilIUxSlXEkmCY36801Ou+k6WOLTySlI5VradtVSucQ59SoZqOMuO+eK7myukdRmTD4xzS1thVIuRwP5rzIde5g8VCTN9eHFK+OWaHtp6DbG3Ri29VSDmBpvPtLgvque05iq5ub25pSVWGExTllahJ8FW45hp4olVuJJWsjOlJvdVuKZx4qslaSIoEqJSVFaXPNMzZBzSBotRa3jBSwNF0TJz+ql/s/dVb7tCsq9+OSQ6K0ulRqYM0iytXABbBAKqrtwDaLjh6pNSLAlYcqhCAgUUUTDRghOOpeKGNvja33k+zhOOp+BKqxJnFVj9spBfhLYDGnkAsa14cxszFni5oWRMinUJ/VJvT+SKIPqoh/GiiRoeQnxWqntTGU2hrHMaBuyrLH8QpH8QgNv8r4/wDrm/3QgMTVxBz1nZnAQCBCyQrqRyt81OXSsezVnEUnmeSop9xn3U9Z4NNwVVM9lvgpk4Vby0CFJSZlMynStmLkS5VF0oynotmJsgDollCU9BbKgdJKrlSUtDa5rkSZhUhyJelo9mzdlGZCpY7sQeJRzJ6G1wN0+ZZ2uumzCIU2HKuB81C6ATwuqg5MHSlo9p1oJHhKzVz86OYVjh2weUKmrcgrTGarPK8EDiNysa6x8ZVYBlMPRXUQzbEpiUk3RJSqoMozZJN0ZSMQUKndA5opH6hOdlekUb3tUpci2xlNKzPB8BCpGsol1tdUqcgtXUzlfA3qp7s9RzuJRJ0QgZUQbBAooJkiLRe6CIQDhGNUoKMqTEW0R7M3keCEwFJCDHOBbMY5IZqfBxPijAJ0RjklsaL3u62PEpg26IFkwCVqpEyg8VCwDcijvS2YFq27GYP5SaToKbzHksRsupsYfP1agF2MDZ4En9yz8l1hV+OfXHSdRa1154LjbSwbnVTUpht9QLea7pAcAZCxYppJECBvAXL4srLt0+TGWaeclRdarRaRcAzckK9my6DgD1J46nSF13zYycuaeHK9OKBaU7Vu2jhaVChTdTphjnPi03EfmsAsqxymU3EZY+t1VoMIzAVcoyU9DYESbJ2ueG5QBBQbCceCVEANedzVYym/WR6qTaEwepqo0scWsIBgquJqAz5BQGyDZzcj5rPTXbfhXhp033XQgmmDG/iuXTIhdKk8GgO2ZDm6eK5fJOdujCulhcE6m5tQ+kroARoktndGoMJxrJMQuHK7dU4WNPhdWg2nVUsMjxVg3T71nVLabt8xdWB1rXCqaI4SrW6SdeEpGM2QdfXcjunzVTjrHgggcQJMqokHQ+/VB7zoJNtFnL1chC98D8FzcS+TvE6rY94cCIJCyYhl/TTetsO2eTEdb3VThGgV5jfuuqnAb10RlQG8uhQ2EHVCNI8IQdOpsmSiqNYFiqWt6xxYNXXaeeo/JanN1nwsszw5j+yYcO6SNDu960lRYu2XUBxIpvJbTxLTRceGbunydCpeHg5XNyuBIcDx0I9U2LpsGIL6TS2liGiqxs90HUeTg4eQWzHCniKFPHZu1W7NVov860CTyzCHDmHBUlzwbwUSA8w9gc0mYIkJN+iOuviOaZObRpdZTeGR1oPdOhHLmpQxdXDvOUNB3tewH3FaKuFNSoX0yGuOoOhWfO1ziyuwyLFw7wXRLMmFlxd1lZm0cH17AGYqmAK9JohrhoKjR6AjcSDvWM8tPFY6EUy4Cq7TsPZbXUO4Aj0MLrkM2lTdUouPyynTL6zHa1oJ7bd0htyORIWWWPr101xy3OWcG0easF+Cqa7S5iFa0hZ1UGFowZ/TcPI/pG/FZuavwn89of2jfikZNqO/2lif7T8Artp/zfZn9k74BUbW/wB44m39J+AV20jOH2ZypOHuCqFWIzG9RuotN0OaBnXmgN+K/wBx4H+2qfBL/wDwD/7hqOKM7CwP9tU/BDTYDv8A3DUEp3lWW+TUuPWu+AVJ71iVdPzFL+2d+yFFVEUUKm5Qt0sEJwR++74LFtBzRVfn7vUtmfuro7NZ1uGcAROc6+AXI2w0txFWm6xbSaDHGESbqsXBqBxxDDMFzgumIBhvs2XOnPXY4nQhbC5tJkMa5x4u3rpz5kg8XFtMXkknNA3lDrAbwXfeVJD6hl9/cEwMWAlRpr7WmxL/ANGP2iAszNIIRrvLixhAAHasVGjfxVyajLK+2S+mQT4Ba8IA8VmnQ0yPcsbbEDedVtwoihXcNzXe4LLNvgNPZ1PaGxW1HVajH0cTktBGVzJ9eytmA6KmhjMLiaG0Xsc17Xtd1VwZQ2QJ2NjN2XEUveyoF08FXqtq0gHwJGuizz8ueNsxrHLx4ZXdjxOH2dWxu03YOkaYq5njtuyjszKmK2fidnVMmKoOpE3DokHmCLFdHBDP0ydDg2MTWMnS2Yr2NLFfP0Qx2VwcGnIeybhdHl898dk1vhy+PxTOW/y+cgHKSSYSxOi142q7EYqvWqEufVqvc5x3kkrMBdbSi464LCZoUIurA2yLRMT0xZXM1ukpiByVrRcEarHKurCDEninadyVpv5qyGworaGi6dgOYngq+6VYLAmdVnVxvDpw1EHSHN962bNf8+4HRzfgue0/Mi9swI81pwT8lVv1pXPlOF2bmnaa5uW8qt4B8ilkyRuUJustMdlmOCLX3kGPBI7UwlvdLQXVHZhM3VBJ3kqBxmDog4ok0AKQgIkpdQriSubdJlkmNycoNE5oVxKs0+BS5CRaFc4G5iLIBpA0sqhKC10bkHEgCQOUK4924sqqxjLHEqolWcrtQkMHUXCcb0CLq01U4RdI5ytdros77FXIijmHmq3xuKE3QMKpE2ldoqyncVWZWkRSkKIqKkqSwt80HDLLXCTxUDwQYIKLmjsmZlX/AGzZap+cKVGoZqO8UsrdkKBRQKYRRRRAbNlicb4NWaqZr1DxcVr2VfE1DwasRJc5xnUlBNVO2yK541AFjWtoy7IffWssiAA7ydKO8m8/egRPRT+NVP41U/jVIxUUlS6Anmg4wLIqINW58iCkDiNCr9yEDggKhUPFHrDxVsD6qmRp9n3I4HKrOeKIqO4qzqm/VC6GHwNL/VqvjHMYXnHU6LSR2gMjyR4G3olbIclrl9YeKGc8Vp6tv1R6IGmz6oS3Bqs+cqdYVo6un9UI9VT+oEbg1WbOeKGcrR1VP6oR6ln1Ebg1WbMZkHVTOTvWrqaf1Ap1DD7CPaD1rLmPFTO7itXyenHdKHyenwd6o9oPWs3WO4qdY7itHyen9pT5NT3FyNwarMXE7yhJ4rUcKzUFyrfh4YXNOm5PcKyqpUlLuRVEMo5kqiNA2ZTMlURobNmKmadQlUS0NmkcEJQlBPQGRzUQUQDCEZCRFLQGykIKJgYUhBXYSqaGJZU6oVcp7hm/olRCilUierfB+yUwo1t1J/8AdXRbicQ+anycsa7s2fAJF9TvWg1nYhrHPblIaAQDMxvWN8lnw3njl+XHdQrAQ6i8fqojC4jdh6n91deOyBvM84sExaAXBoKn97+FftT8uR8mxP8Ay9T+6mGExR0wtT+6usARrMFOPEE+Cm+a/g54p+XIGExf/KvjwUGDxZNsM8+QXWsQYG9O0S8AWvruS/dv4P8Aan5coYDHWJwrriRMfmj/ACdjgP5qb8x+a9F1YECAfBEsZlkN8brL/UX8NP2J+XnDs3HHTDWJiA4T8V1Nm4R2Dw560RWqOlwnugWA+K6AYJgNjy0UAB9m+5Tn5rlNKx8UxuyWEg7lkrQbbiPBa3t3iTuVD2b4jgoxq8lIph14IGi10mZiwO3kAwf4lUhp3geK0U3BhaY8hrIRlRjGLb9PLgcO6B9MRr9lcFd3b1QVMBQyj+mJP91cEldng+yOTz/fRRBEJZQmFsyXAp2wVmBdMAmdydza1MS4PaJgSd6VhxogTZQGCs3WVPru9VOsf9Ypep7bWu7W9O0jwWFr3z3irQ58auUXFcyb2vytAnetFCqS4CbG0FYaNGpW7rHvjgCVsbh61DL1rMpd3bidVhnrpvjt65r957Id7JTt8/istJ5y9oyYgq1r4ItuvK8uu6NLDAVg/jkqB2hMSeStZzWdUvZ5+CtGiqZporZskaEneqqhgkAX4KxxG8qiqbEDenCZ6pKoJCsrGLbosqnEQZN1rEUhM7gqq0Ok70tR+VxVdR5JnWfetJE2qjAJVTgAN2qYvg6wFW503WsjOgBLLRfkgW5hYFK1wkQnzAgxmBVpLkMCCVTiWNyy2DBF5WrODBuOZ/BUEA2cPLzThVSTmwAnXDVJBj2H6+jgPUq/ARXNTBPOUYpuVpNstUSWH1t4OKz4cfpL6BMMrMdSJO6dD6gLOS9pBByvs4HgR+9a62zGQWzlIkaHcor8W9tbFVKzQGtrHrgBoJuffKpjSLSmRdBvB8FTWoNrmSS1+gMWPiryBATTG4aeKcuuYmzbmOo1aIDnZXM4tMx4p6NV9Kox1N5a5hzNdoQV0CGOBDg0gi4jUcFzK1E4eoGkyx12O48ltjl7cVnlj68x2KrWPoUsVQaGUqpLXMH9FUAlzfA95vIkbkrVTsqp1j6mCJAbigGsJ0bVF2H1lv6ysY7MxpiCRdp3HeFllNVpjdrAbi87oWyhgcVSxdJzqFRobUEkt0usBNvOV1jt6oSScDhieOZ6iqZdqYPE1MfXcyhUcxz5a5rZBsFNohww2zQ5paQx4IO42Wkbcdo7A4eOVR4WXHY+ljWicK2m9hlpbUcQJ1sUTYrFohN+cozdAm9t5TJuxH+5MF/bVPgh/wDwn/27U+KH+wsGdPn6nwVY/wBxv/tm/FAU+O9OT8xS/tnfshIdfApnH5ml/an9lSo5sbGQhogXSpuUaUsD3AZQ4gawsmMeRVcXGSQB7loBuFz9ol3XtGjS0FPCbyXvU2wz1WIDxBE2hWl7pk9YRxhU1m92DfVI2u8cRxC7Nbm3Nc7hbGoVmQCW1PNMKuY9mQPBUNr5hcg+IhMHtaczd3AqbhFY+a/IVXzWNtABdFjzpYhIO24uOpurAIRfwvG23a+gO8927TmVsoEjD4rh1LvwWBhi3ot1E/o+Ljdh3fELDOOrC8OhsYTsfHj/AK9A+54WnDkh4uBEarFs2oaex8Y4bq+Hn1euhh2k9oGWmLi8rn8n3X/Pgr8OBgT/AOMXmcvz9cz+q5ehc4sxLSx8w4EctF5zBuydLKhImKta36pXbqG4eDFpW3nm8p/Tn8PV/t5ap2nOnWST6qvUkrTjmCljq9NugefzWeQBqumdIvaAiVa1hGl1VmA0Wiic7AfIpZKw1boQ106SrWhwHCUJjUp29ozoAsrXTjBgASddyQuMjgmILjO5B+ghKKpwZVmqpa4QmaTmlTYqVrLv0apl9kfAqxtUh7HtPeAKopw5jm/WHvQpgllMbxIWWl7elccrjHI+5LmFpVTXl7GHcWN+CjiVz6Y/KxxFo4JHOCQ1Cpnz62KNBC5ttb7krjcols3nxQy6SNyCBxVZcndpAVZVQgLkW1C2YHqlSOVQlhrG8tBlDr9waFShN1ciVxqZmxCqq3a08yhmIUqHsjkVUTSg6qFCblQXPkqIDqVmqjtlaXaqmpd5tqqiKzkIESrHWSWVyoKW3S5JBKclLntBVQlZaoi5xIKiqJcoWm6t64hoBVeQlTKRuXXqVy7KTJJUlGDwRvwTIuZSZ0RUQEUUUhAdDZtMsdUc59NuYCJcFo+Q4f61D1XGyt3hTIzh7kjdqphGOw4oMfSDQ7MYKp/kykT32eR/euYKbeXooWNG4eiA6GI2ayjQdUa4Et3SsKGVsWaPRTyQE9VFPJSUBEfT1QRQE8/epu/eoLnemynd8UAJ5whbinDfGfFG4EmY8Als9EtxCkjkn60+023io2oATLGu3w4koMswYkBdWiQOhbTx2kfdS/euW6qXE5WsYDfsMj4otqubSFHrX9WHF4YTbMbTHGFNmzl0OYcfeoD/ABIVeaTqPJQBrt8p6G1o8fgjB4H0VOVqnVN4+iWhtdlvp7lMpvY+hVPVAFDIN5KNDbRBE29xUA5e4rP1Q+s4IZDucfUo9T9mmCP8ip5fFZ4d9dw/WKGZ4/pX/wB4o9R7NJsYt70Lcp8SsxfUn6V394qCpVGlV3qj1L2apHH3oggb/eVk62t/Wu9Ueurg/Su9UetP2iutHWHLcKtWEOJJOpQyHiFcZlUTZDyQyFMAojlIuQgQgIpKiiAkhSyiiAkhSQgogDIUkIKIAyEQW70sIwgLKbGveG5w0kgCVvo0aGGzOfXpOzWEPuPEDiufTs/tWEJqzxUrPcDYm3goylvC8bJNuq2pSq0iRXpCNznwfSFGVqIt1rJ5OXHnzTZyXyTeZlR+1F/uuwzE0eyOtbPEmB8FYK1Mi1RpjWCuE57jYuJUDip/Zh/vV6BlQF2XMyftGIVgY3Tracf2gXm5KtbWflDc3ZbJAPNTfB+Kqeb8x6P5LUJyNyEzcB4UpUatOq0vbAab9oELhU8fXplsGQ3cd/inbtGsLRppBIj0UXw5LnlxemLoANieSklwJymNQvPM2timgdtxjQ5jPqidp1qhIdeeDiPgs/8AT5NP38XoIOWwdAtpKLTcSAJXDpbVe14zms0z3mVSuhS2+BVmt1sh0gsI7J8xpyUZeHKKnlxreC2I7PqqqmWYDQL6DVClt1lSC55Dj2j8y2AU5x2FrU4hzjpGUNIWfplO4v2lUZQSO0JB38FYGyCS6x14I0sZQpTFBjgfrgEz4gq4Y2iwguwnZeLEOIMRqCU7sSxxNskOwtGBpUN/Jcbcu3t51N9Gi6lnDc5s4g7uS4hXd4fsjj833goidFIlbMUZZ7TwMq2u4uMucTfeqwLq3JnZAN9VF72udaUoiEXNLXFp3KAFMljD4q1rri+9Vsa4n4LoYLDh1dpcHFoucu7xWWdkjTCWuxsu2AIyPaHOMGO9a9+C207VZIPaPjCWqe02oKbmWymXSRy/FWUpzOJt7l5md3y9HGa4WixAAVrQNRfmhF/yTNsY1ssLWsWtbEcfirmCQPFI0nX4K1smDHvWdNc3uyrAIPBLT0CffAUmV2qzVFpda+izVhHiqhMdUifeFQ86njuC0OF4VFVpAstYisFYk1CYA3WQF2gfEJ6jO0ZvdVDsmb+C3nTOkcCfPekfr4rQWlwkNJuqX2E6BXKmxSDBMaIFxmd6Zwg5joeCSJkAb/ctEDmJIk6WRufDklOgF9UzXCDeLbkBiqu6uoS3VpzN+IVmOaMwc0QDD28w4Sq8T9I0wBIhWNHXYRjTqAafheR8Vp+Kz/MV03ZqTQfYcR4B1/jKMW8RdU4TtYhtNzg3rOwSfZM2PrC0XNnzI1EacQqs5TOYgbpxQPomAvlIvxSPOqQKSMwI380takK9I0yQHTYncUCd+qgPBVr5JzmkiWulpFiN4K72Je3ECljGQPlTS6o0Du1W2f6khw5P5Lj41hFQVtz7O8f3robJcK2ExOGce00fKKQ4loh4/umf1VplzjtGPF0bLI1jmn9dLICBqCRxG9GLm/oFg1KQBuukcDKaSTbihNtfemRI5e5X4XCnE1SwVKdOBmmpMHlZVQDvVtKvUoEmk4AkRcSih062Bc/ZtHC061B9SnVdUJDobBG6d6y16LsLsp9KoWl3WsIyuneqjj67iczmm1+wldiHPble1jm6xlj8UjJzQJmmziKv4KwVBH0THczKFQtiCwNIMyDKDRxvw5ISQnNIhxaTB8FOpMajXcpMuYtMj3lUY8Go1jw0S0xa9lp6p02hZsZV6ijBs91mgC/inj3wd65cxxBeQbHQyqHMcHZhfjxRfTLpcHX+KrggQZBXZjPw5Mrvin7xm6ZxvlnTUqtoJ33VjWwinjNrWWCcQkFgnAM6LKunE7Vsow7DYvlQPxCxi9gLLdgmh1DHjcMK4+8LPLpvi0YJ4bszGsJ77qJH6r/yct2y6uZr6RILmjMJ3ib/ABWCgI2Y9wGtYD/CT+CSjUdRrMqss5hmOI4LC472MrqxmwgLulbwTB66t+yV6Lqs3ZDgSbLzmCqF/Stz6ftVarhPAtK9FiMQ+nhsQ9jXCoyk5zCdxhaeefVP6YeHq/28rjXtq7QxT2mQ6s6PCVnABdKJhrWsadwk8ULCy65NTTluV2kEgK2jUDKeUzrJhV5hG5M0jq4tMaouMp455Y3a8VGnf6q3M2NWx4rKCNBqnBE3UXxxtP1Fnw0h4OhHqg4xvB81W0g2yj0ULWmLBT+0v/VfwcG9rqwAyFnAbofioWwJ/FH7V/Jz9TPw1h2UZvqkFbAwEZwNCuSB2DxgRdaKUGgQHOzaiHbtCPgVnl4b+Vz9VPmPR4W2FpTrl/EqwgHU+SyYMuGDo5hJyn4q4Fx0C4spq2NZlvlHNvpCBZwhWtqCIqNjmkLqUgB9zyspBcrxp6cU3a3sCktce+3zKhdBs9vqgBAI7rfVKWtPsuHgrMof7TCeRCrdSfPJOUtFNNsWDvRIWNv3vROKc8AfFA03TZ/o5VstK+raZh0eSqc0N1IWhwfrnlVVKpa0yNPcqlKxQXUxrUASPqsAu9vrdUuxjg+QWm/1VmqVC4zaPBbTFlcmtlZlWo1odEmJdYIvrUqJOZ4n6o1XPJve5UDQwS9szoJur9E+y5+Ir1X5pbTZ9UH4qt+LqdomASYBA0SOeXamG7gEkWvF1pMYi0flDw05jJ3cUrq7yZBiOCU+FylJEK5Ii2rW1y7vCOaYusDMjksxQjmj1hbaCRxUVQquaIIDhzCiNDbHnIKHWO4qZRJko5RHFdLmTrCUc5hAgjRQ+CAOfkEc44BJEpg3mEAc44BDrL7lDT+0oGj6w9EAetdyUFZ4FilMA6hO1s7wgBne5DO/dKtyAXDmodoeyPFLZ6Vy8i8qG2/0KJtw9UzSzLcAI2NK/VFWECbIZCjY0RROG+KAbJ/cjYAImzZ08U2SL2WerUzkAaBHY6E1TokLyd6WVFWi2OYnepmI3oKQgCXk70JKllEEklHMVEEA2cyDN1C4oWQQZs5RDyN6RHcgHFUjcp1ttEgUsloLBV8ketB3+5VRKCNDa4vad4RtHsqhFGhtdlnkjl5qjMRoUcx4o0e18ADRGD9U+YVAqGIQzuixKWhtoGbhATjP9X/Csge4byrKdWpnhlQtJ5wjQ2vDajjHVE/qFHqan9R6sKrzYgG9d3/yIg1v+YI/XKlSzqH76H+EqfJ3n+gI/USh+I/5t/8AeKmbEf8AN1CPvlLk+DfJSRegR+oVBgC7Rjmn7pQPyn/mn/8AyFSMQ7XEVT+ufzT5/I4T+Sq5iB6gj8FDsjEjRoPr+SnVVhc13+Of96nVvi+KdP3/AN6N38jU/BTsrF7qU+BVNbC18PHXUXsnQuFitPUn/mj/AH0tak5tMw81ALkZp9yJlSuMY8rjo0+iOR/1T6IFwJ7MgeKmYnVxPmrQbI/6pQ6t0XCCiAYMlwBcBO8omnHthLMo6oMxpfbag5mX2gfBBGUgkXUhTejuQAkppKCMIMQTqmEgzKAtCsY1rtXhvjvU1UKHOG/wTiq6bFaWbOdUaxzXsIPiodm1hq5gM8T+Sz98V+uSptVwHv8ANXsxBYJ9eaX5BWAMFhI3ZlBhcQJmk62+FN9aqe0aRjJAGRk2srxjSXdxoHhOqwwabhnaRPERKvY0SPG0rPLGNZaXalfrqFMZWth+5sTZcsiy6GPb8wx27PGvJYIstvHxix8n3FhMAN6EbgitGaamxlaKUQs41WqhE3BKzz6aYdqq4jEO8B8EAFZihGKf5fBBqJeIL3VlJq72zGPFCqGz3mjKDrquLSErv7KdFCo2Jlzd3iubz36XR4Zy1VA7JTyDuW8gE1KHEXvpxSYmKeVxNptx4JqBGclpBHguG9OudtTQQYJv4QrWxuVIPoOKta4ErGtIvaQ1qtpzl81nDrBXsMgePBRTamXCsAKqpnjCuBkaaKTBwWWtp4LW5Zq4m6cJhcLxHKyAbmkTrx1TvabxrwKW4g6E6LVLM+kMxkLMaVwRqtr3D1Wd7spmLELTG1FVFrWMvAlY6jt9lprOL5gblmewiSAtcUZKiTHLelIM74jcVYQYv4iEMoteeS12zIZ1MwFXmkSB4K+pkbTBmZMKi2ht5qoVUYm7Sd4MqYWr2ajBF4dflb8UawBpOjhKooEdYNYIK0nMZ3sMS0trl39Zfz3rd1nylzKxImoJf94d78/NZsQw1KRgXb2gn2VVzvdRAkvuwcXRp5j4J3nHZTi6M6SZHDelIzC1uKhm0knwRgycsFIKS3jKEcryrwC62/wSOpnxVbLSjEj9GqjXs6cLrPs/FnBYuliAJNJ4eRGo9oeYkLTiQfklY69nVYXs6o0nC4qU2vHwPvC1w6Z59vQ4mg3C4ytRZUJax2WmeLNWnzBCoc4En3pqdQYjZuErON2NOGfI3sgt/wADh/dKqL5cYmOaws1Wu0mSLIwI4pS0kTNkwEWjMUAMu8lQssBKZ1OACAR4IZeaDDLaxCmQwCbgpgJ0meCbKYmEtjSsDtap2kQQ7TUIim5zrNOif5O4d4CPFK2KkOK0AQ4i2ihquJkvHnJS/J57tvE6KCi7SW+MqeFcmFTNIIB5hcjH1xVxRAnKywXQxROGw76zi0lgtldqTYLhB87zO9beLH5ZeXLU0cmPBUVJJ8U7qluarebhdMjm2Zkq4KllTLa4VrajT9UqbtvjpYADvTNBGqQZd7Y8EwybsyzraLG6StNBxZQxhE3oEH1Cyy07yFcx4FOo3PIe3KbaXUVti6OzGmth69N3dZUY+/MOCsrYUNbma5ttwR2DUFN+Jp9k52B0OdE5TNjxutr8ThCQX0u1Oram5c+WV9qeU6287ssT0pYI/pKn7BXpa7XUqNWoCIFN+7XsleawT6TelZcBFLrqsSd2Uxdek+U0203NFJjy9jmmHGBLSFp59+2P9RzeHXrf7eLbGUeATO8BdVtdDWjgAjmsuqxlKsBA1aCUS5sXbdVZjoCiAZulpezgNF4N+BTBo3ZlGi0bimDgLJW1cxnygaZs4ymhwF3+5QOnQIgEukqfaq/bx/AEOBEuBUOcnUIVDLgBu1TA3HNHtS/aw2I6yNQrqVKvkdlAvpBjkqTZ0E6LZQJa3XSCPVTlnZF4+HC13cLiKbcFQGd7YYAQL33j1R6xpMte6ftGFlb2WUyIh7Q+fFEtBGmYD1XHrfLS8XTUajxBNQEcDCnWj2gLcFidYgCIQLntiLI9C9m2pVpEAGnbiqi+iG2D54LI57iRIvyUFYt4HxT9C9l4dSInK4KwVGBpJe4CNCFjOKPsiPFVOq5nds+afpsvbTotfSqNEPl31cqjqLwYaJnesbW0qYa9z5nRo1hUVsS5xhpytGg4JTDd4Fy/LpBtRjC6oYaDFwFhxVdzm5GwG8BqVlNZ0AE3CVzi0WPaOp4LTHDV2m58EdY6pLkwLkpozHkOKZxhpa0NANpGpWzJWYbvl2/gEjnX1RLde1oqyIVyItNmOpKQkDeodLlKSJ0VSJtEuBCQonkhCogOqO5QwgQmSab1EJsogmUuGigc4GyvFGmWyJlTqBHZAnxWntGXrVOabkXRAVnVkC7PehljcnsaV6HejmEiJPimy+I8kertMo2WiyTqEZPBHq3TYn0R6upOqWz0QUydYCbKWiZhHq6gPHzQyVQD2QRzRsaKbXN0O9qPerhSqOAhojkUcm4tA80bGlQj2THklJM6+5XupkA9g+ICjQCYcwhGxpQHOA1Tio7jPinLGk2BPglyZTBab8kbg1RyuJsz0KGVxMZXT4IZgLwU7asDhPG6OQrrNcxkOaRPFUF07grsS/M1o5rOqnRXtJHBQKK5tPK24umSqFIT1NEg1hAQBEBHLPIKZUgWFITkQl3IAKQjCMDimCogS0qAI6DUJAkKIqJhFCVIQhASUw5pYTbkAJ5KSPqhDeogDI3hRCEUBEEVCgLqby9hadQmuAId5SqGEteCNy09Zhzq6sPBoU1UQFw9oohz3GHEm1kOtoD+uPkAoK9IaCt6hIzBoM9glGIMdW3wIQGIpDRtWfvBA4qmZmlUM6zU/clqnwcOj+ipzzambUMWp0/7gVPylg/oT/8AJ+5EYtgH0E+NQo1/A3/K/ranCn/clNnqASMgI0hgWb5U0RGHZ5uJTDGHQYagP1T+aWv4Pf8AJ6wfXbkc5n2Tli655BBIOoW44tx/4eh/cP5rPiHmoWuNOnTi3YbEqseE5KVAFEYVIRGFIRQaBRRGEgCMqKIMdyIKG5TgkDTZEEz4JYuig2ijiRRpuZ1YLi7M1+9tuC2fyrXcyDG6DlG74rmjVaKWV1CowugthzQd6yyxx7saY5XqNbNp4pshtVzZuIOiantLFjWtmtEPEjRYmASJIVzWyNZEqLjj+FzLL8tdfaFTE0OpfSpMbIJcAZkaX3Kpph1jZDISPdKZrCASfVZ8ScNObeVOPHzLD9v8FhW7HGaLAfrX9FhW/j+1j5OyqIlALRmI1W3DCb7+CxtF1soC43/gsvJ018favFfzp9r2+CVqbFn9Lf8Aq/BKwpz7YV+6tdM2i67ux6ZqYerDiIc0eOq4FMxqvRbDMYSsZIAe2bcnf5rk/Ufa6fD20YqmQW0yZcNbWuloNcw9oxG8jVNXqTVJ4HfwidU7DMSuK3h1TtYyRwTtBaIJBBSDj8U7THLcs60WAgXK0UjbzWUOm3n4K2k8Gw04cVFht7DYfkrGmVQxwgXVzb6KDWahU1BM8lcNLwle2/Mbk4TE5nL3qh9geK2PHABZatPWyuJrC+/ESkIblVjgQ6BeboZSdxHktohTlOUxYKpzCTYW3rQbGNJVNUG0acFcqaocy3FUu3kkhXvuCB8EjpN80zy3LWIrO4zMk8VXwjcFoLSCYEkb0hb7ILTeIKuVGmdzczTz5rHRJD2WvOq6JblgzA5LmGxMCIdaFrjyzy4b8hnkPNYCX4LFwwljmkPY7heQfVdUsdeHZfArJj8O99HrdXMk8yN/5owvOqMpxtficjnMr0RlpYhvWNaNGGYc3yd7iFW3fx4EqbKf8qpPwRvUJNWhaZeB2m/rNHq0JslJxkvgG4PFO8cFOeSki3aF1Xnk23LTTo0XkjOZjgm+TsEgBs8DZT7Q9Vz8Vn+RVnECMv4hUV6YOzMM4a02ifArdtGkG7PrkNbYC4fJ1TU6VJ2Ep03iQ6k0Zo0loWky1jL/ACi486/hTsSoH08XhnwQ6mK7B9pmv+Av9Fq6qD3c0cFyNn4k4DaNCu8fQ1AXjiNHD0ldyq1+GxFShmJyOygjeNx8xBR5Zq7Px3c0HVuBtRBPndFlMkkCiABrCqJdlAzuMaXQBIGr+fNZaaNLRH9G2DpJUJkjN1bWzcm8KgNIvlIlQ9YJhoI8EtHtqyMytJdSjkgOwID2lrTbmqA+oIOamDpGUShmdIPZB+y4Slo9tE1YlpaB4JQ2pq2oweaodlcI+c/vKstaRqZ4zqn6ltsyvj6QH0QFPNd1SmRMTMLJkj2m+BKgBbvnej1HsTbNN9PAEwzIXtEtcDK4BdMELqbUeanVUg4lo7Z8dAuYaLwOK6vFxjy5/LLbwWUzRmclDXTor2NyxIvvWlukYY20WslQ0QdyugBogI5bLL2dc8cUdQBooabho4jzWpo4qmscpyDXUomVtGWEk2rHWfWN16LZmFpHZlJz2MdUfLi5zZJkwB7veuGxoDZInkvVY7DYenicuEq/MZGlpdaARPwhY+bLqKxws5NRwdNsuYxgtH0OUoufh+syuYWwRo1UsJY+8Ob95Q1gaoc1jRcb5K5tW9r24OC6t3Sq5+bOIqXy7r7l6uhla6nDBAILvm+a8fgiXdJARYnEP3+K9ITUD2uc5jpIkCpC6P1E5n9MPBeL/bydYMNWp1fcznLPCbKsjmmrMqYaq5lZmUyYnQ34pJafZHkV1MdxBc3TzZLAO4+qMN3FyKcFuYm58lZ2SY9VVr7RRa3dm9VNi5V4c20FEEzbU8VW1l+831T5XHc31UVrLTOaGtvxS908uKjmvP1fVTI8iJaPNCllQT2gdRKuw7pdTbPeBHgqWtfA7ptEyrWsLYOlyZF1F60ud7dinmfhcOczRlp5TPIlPE6uPqjs5jquFyhjXljo7Q3G60ihUJ7jJG5rJXLctcHlOWPKdYkKFhG6B4ytxwlQnM+ru3gAoDCFxAbnOpFgbI9k6c4tnQGVXkLt2WOK6XVhjwLm+8iAPBLVxAYDloE85sn7X4L1c9tB9SwmfBWtpBlnszcuKd2NNWG9SB571RiMZlEU2wTqZuq+q8FxFVYxUMmSVndbXVEv5pCb3MrWRnal55nQBKZJ180TIvCEGFSR7IHwSl4Cma1/RVHmqkK0cxSucSoUpVSItKdVOaJQPJUkDCChsgmQ5kqkoFMkUQUTI+UA2CZrQCLDeooiiEc4tIDTCtgFzbC6iiVEENEOtomyNLRIEwoolVQzmNBgCBCyVWNBMW81FFWCcyuEUyRqnAim0jVRRVUxWXEkid6jiblRREKqi5wJgkI5nTqVFFekLWEllyrKLiXwTNt6iizy6aY9mxB7sR6KkuIcQCoolj0eXanE/SDwVKii0x6Z5diNQtL7NKiiKIrf3VWy7jKiifwXycEwjJM30UUSMrjvQAlRRMJKkKKIJOKiiiACIFlFEAChvUUQE4JjoFFEGBUCiiCFSLqKICbwodCoogE3pt6iiZDCiiiRnAUACiiRplBieKsyNG5RRKmgaLWTtAkKKKdqkDekr/RtP2vwUUTnY+FG9QKKK2ZgLKKKJGm4IqKICITdRRBmCiiiQMiookaDVO06+CiiVVFw74G5aKV3gH60e5RRZZNMWqmAXtaRYlRvtcioosK3jJtAAUacDV34LAoounx/a5/J9yHRAKKK0LGardhh2woosfJ028fbNjD+mVfL4JWaKKK8ftiMvurTTMEAL02wgPkVd28VWD4qKLk/Ufa6fD9x6+rDv4q2mAGCNYlRRcOXTsixwh0DRNq6Dp/moooUjbFwGg0V1LVRRTTbW2A8FdT3c1FFBr9yV3dKiiISl2hWepdxB0hRRVCYT2qpBUBJDZMyAootUKqgEae1HkqTYwNM0eSiivEqXK3MRFp0WR5JBO8NKii1x7Z1Q8/NEzdIAMgdvvdRRbfDIJzFpN7fiubW+kqfeKii0wRk2kmSJ0jVHMSWibQookpyg91Co99JxY6k4uYQbtLTIPlC7e3GintvGspjK0VAQ0WAJaCbeJKii2y7/wA/hjFFTstEQI5KxjQ4CePFRRY/DVl2lTazB1sojsj4q5oDcPSi0sb+yFFFf+1H+5ycRfGmfaifRegqEnDYF5MuqYOkXE7zcfABRRV5PtheP7qraS6mSTN0jHEzJ0hRRYxpe1oOUAgD0V1NjSwEtEzCiizrSBWa1kZQBdWMw9Jxg02m6iiW7o9RYzB0C4TTHeWephqTHw1gAhRROWlYqaxvXFuUQAkAGfQb1FFc7S5WOvjX+DfgFQVFF0Y9RItATOFlFELnQt0TN3qKJVcO0LIDLpNyVFEY/JeT4a6QXp2UabhQLmyTSZP91RRc/l7a/wC1VVw9KnUIYwAclQKr21cgcQ2dFFFnOmdefof+YD/7h34r0VGkxzbtm/4KKLo/UfH9MPB1f7V1gA0tytLeBEpamzcH8jqv+TU83VuMhu+CoosZlZeK1sljyY08lCSNCVFF6jztjndxTtcSLlRRTWmNWNJ5eisYZN1FFlXTFj7RCUuNlFFMaV6DYWAw2L2bUqYikHvFfICSdImFufsfAh5AoQOAe781FFx3K/uWbaf7YprUm4AOGFBp5hJgkyfNVitVLQ41akkfWKiic57TaNQB2Ga5wBdMSRdZX0WBuYAgxMglRRPxpzUNubk6cUXvcwnK4jQaqKLSzlmspVX1GgvM67ldVpM+Sl+UZgRdRRZ3tp8ObNj4os0lRRbMgOqXid6iiZUOPgqyezKiiqJKTooR8FFFSVZUIhRRUQHUoblFEyAoblFE0odyiiiA/9k=';
const HEADER_CLOSEUP = 'data:image/jpeg;base64,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';

const LOGO_123BE = 'data:image/png;base64,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';

function generatePDF() {
  const d = gatherOfferteData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 20, PW = W - (M * 2);
  const DARK_BLUE = [26, 35, 50];
  const MEDIUM_BLUE = [30, 58, 95];
  const ORANGE = [232, 115, 12];
  const LIGHT_GRAY = [245, 247, 250];

  function addFooter() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('123Bodemenergie is onderdeel van Ground Research. Vrijheidweg 45. 1521 RP Wormerveer 088-1262910.', W / 2, 290, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  function addHeader(title, withLogo) {
    const bannerH = 50;
    try {
      const headerImg = withLogo ? HEADER_DRILLING : HEADER_CLOSEUP;
      doc.addImage(headerImg, 'JPEG', 0, 0, W, bannerH);
      doc.setFillColor(26, 35, 50);
      doc.setGState(new doc.GState({ opacity: 0.45 }));
      doc.rect(0, 0, W, bannerH, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch (e) {
      doc.setFillColor(...DARK_BLUE);
      doc.rect(0, 0, W, bannerH, 'F');
    }
    doc.setFillColor(...ORANGE);
    doc.rect(0, bannerH, W, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    if (withLogo) {
      try { doc.addImage(LOGO_123BE, 'PNG', M, 10, 55, 18); } catch(e) {}
      doc.setFontSize(22);
      doc.text(title, M + 62, 24);
      doc.setFontSize(10);
      doc.text('Ground Research BV | 123Bodemenergie', M + 62, 33);
    } else {
      var titleSize = title.length > 24 ? 18 : 24;
      doc.setFontSize(titleSize);
      doc.text(title, M, 28);
      doc.setFontSize(10);
      doc.text('Ground Research BV | 123Bodemenergie', M, 38);
    }
    doc.setTextColor(0, 0, 0);
    return bannerH + 10;
  }

  function addCostTableRow(label, amount, y, even) {
    if (even) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(M, y - 3, PW, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(label, M + 4, y + 2);
    doc.text(eur(amount || 0), W - M - 4, y + 2, { align: 'right' });
    return y + 8;
  }

  const clustersPdf = (d.clusters || []).map((c, i) => {
    const calc = calculateCluster(c);
    return { cluster: c, calc, idx: i + 1 };
  });

  // Pagina 1
  let y = addHeader('AANBIEDINGSBRIEF', true) + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let leftY = y;
  if (d.klantNaam) { doc.text(d.klantNaam, M, leftY); leftY += 5; }
  if (d.tav) { doc.text('T.a.v. ' + d.tav, M, leftY); leftY += 5; }
  if (d.klantAdres) { doc.text(d.klantAdres, M, leftY); leftY += 5; }
  doc.setFontSize(9);
  doc.text('Ons kenmerk: ' + (d.kenmerk || '-'), W - M, y, { align: 'right' });
  doc.text('Datum: ' + formatDate(d.datum), W - M, y + 5, { align: 'right' });
  y = Math.max(leftY, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Betreft: ' + (d.betreft || ''), M, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Geachte heer/mevrouw,', M, y);
  y += 8;
  const intro = doc.splitTextToSize('Conform uw aanvraag ontvangt u hierbij onze offerte voor het realiseren van een verticaal bodemenergiesysteem.', PW);
  doc.text(intro, M, y);
  y += (intro.length * 5) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Project samenvatting', M, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const totalMeters = clustersPdf.reduce((s, x) => s + x.calc.meters, 0);
  doc.text(`Aantal clusters: ${clustersPdf.length}`, M, y); y += 5;
  doc.text(`Totaal boormeters: ${totalMeters} m`, M, y); y += 5;
  doc.text(`Locatie: ${d.locatie || '-'}`, M, y); y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ORANGE);
  doc.text(`Totaalbedrag offerte: ${eur(d.total)} exclusief BTW`, M, y);
  doc.setTextColor(0, 0, 0);

  const signBlockH = 55;
  const signY = Math.max(y + 12, H - 20 - signBlockH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Met vriendelijke groet,', M, signY);
  doc.text('123bodemenergie / P. Groot, bedrijfsleider', M, signY + 8);
  doc.text('Tel.: 088-1262910 / Mob: 06 47 326 322', M, signY + 14);

  const akkoordW = 85, akkoordH = 50, akkoordX = W - M - akkoordW, akkoordY = signY - 4;
  doc.setDrawColor(...MEDIUM_BLUE);
  doc.setLineWidth(0.8);
  doc.rect(akkoordX, akkoordY, akkoordW, akkoordH);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(10);
  doc.text('Akkoord voor uitvoering:', akkoordX + 4, akkoordY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(d.klantNaam || '', akkoordX + 4, akkoordY + 16);
  doc.line(akkoordX + 4, akkoordY + 26, akkoordX + akkoordW - 4, akkoordY + 26);
  doc.text('Handtekening', akkoordX + 4, akkoordY + 31);
  doc.line(akkoordX + 4, akkoordY + 40, akkoordX + akkoordW - 4, akkoordY + 40);
  doc.text('Datum', akkoordX + 4, akkoordY + 45);
  addFooter();

  // Pagina 2+
  doc.addPage();
  y = addHeader('KOSTENSPECIFICATIE', false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Specificatie per cluster', M, y);
  y += 8;

  clustersPdf.forEach(item => {
    if (y > 250) { addFooter(); doc.addPage(); y = addHeader('KOSTENSPECIFICATIE', false); }
    const name = item.cluster.label || `Cluster ${item.idx}`;
    doc.setFillColor(...MEDIUM_BLUE);
    doc.rect(M, y - 4, PW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${name} - ${Number(item.cluster.vermogen || 0).toFixed(1)} kW`, M + 3, y + 1);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Bronnen: ${item.calc.boringen} | Diepte/bron: ${item.calc.diepte}m | Diameter: ${item.calc.diameter}mm | Luslengte: ${item.calc.luslengte}m`, M + 3, y);
    y += 5;
    let even = false;
    COST_ITEMS.forEach(ci => {
      y = addCostTableRow(ci.label, item.calc.values[ci.key], y, even);
      even = !even;
    });
    y = addCostTableRow(`${name} subtotaal`, item.calc.total, y, true);
    y += 5;
  });

  if (y > 245) { addFooter(); doc.addPage(); y = addHeader('KOSTENSPECIFICATIE', false); }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Vrije regels', M, y);
  y += 7;
  let even = false;
  (d.vrijeRegels || []).filter(r => (r.naam || '').trim()).forEach(r => {
    y = addCostTableRow(r.naam, r.bedrag, y, even);
    even = !even;
  });
  if (!(d.vrijeRegels || []).length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Geen vrije regels toegevoegd.', M + 3, y);
    y += 6;
  }

  y += 4;
  if (y > 245) { addFooter(); doc.addPage(); y = addHeader('KOSTENSPECIFICATIE', false); }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Kostenspecificatie totaal', M, y);
  y += 7;

  even = false;
  clustersPdf.forEach(item => {
    const name = item.cluster.label || `Cluster ${item.idx}`;
    y = addCostTableRow(`${name} (${Number(item.cluster.vermogen || 0).toFixed(1)} kW)`, item.calc.total, y, even);
    even = !even;
  });
  y = addCostTableRow('Transport', d.projectKosten?.transport || 0, y, even); even = !even;
  y = addCostTableRow('Graafwerk + kraan', d.projectKosten?.graafwerk || 0, y, even); even = !even;
  y = addCostTableRow('OLO melding', d.projectKosten?.olo || 0, y, even); even = !even;
  (d.vrijeRegels || []).filter(r => (r.naam || '').trim()).forEach(r => {
    y = addCostTableRow(r.naam, r.bedrag, y, even);
    even = !even;
  });

  y += 4;
  doc.setDrawColor(...MEDIUM_BLUE);
  doc.line(M, y, W - M, y);
  y += 8;
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(M, y - 5, PW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAAL EXCL. BTW', M + 4, y + 2);
  doc.setTextColor(...ORANGE);
  doc.text(eur(d.total || 0), W - M - 4, y + 2, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  addFooter();

  // ========== PAGINA 3: UITGANGSPUNTEN & VOORWAARDEN ==========
  doc.addPage();
  y = addHeader('UITGANGSPUNTEN & VOORWAARDEN', false);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Uitgangspunten aangeleverd door de klant', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const uitgangspunten = [
    `Aantal clusters: ${clustersPdf.length}`,
    `Totaal boormeters: ${totalMeters} m`,
    `Locatie: ${d.locatie || '-'}`
  ];
  uitgangspunten.forEach(item => { doc.text('\u2022  ' + item, M + 4, y); y += 6; });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Opdrachtgever verzorgt de volgende punten:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const opdrachtgeverVerzorgt = [
    'Toegang tot de locatie',
    'Wateraansluiting met minimaal 3 m\u00b3 per uur',
    'Voldoende werkruimte voor machines en bussen en eventuele vergunningen hiervoor',
    'Doorvoeren of gaten door funderingen',
    'Aanleveren van een SPF verklaring om de OLO melding te kunnen doen',
    'Verwijderen van straatwerk, planten, bomen of andere belemmeringen voor het boren'
  ];
  opdrachtgeverVerzorgt.forEach(item => { doc.text('\u2022  ' + item, M + 4, y); y += 6; });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Niet opgenomen in deze offerte:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  ['Gebruik van rijplaten', 'Parkeerkosten', 'Wegafzettingen'].forEach(item => { doc.text('\u2022  ' + item, M + 4, y); y += 6; });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Waar moet u rekening mee houden:', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rmh1 = 'Wij mogen de grond die tijdens het boren vrijkomt niet meenemen, deze blijft achter op locatie. Het is wijs om een grondcontainer te bestellen, dit kan bij GP Groot in Heiloo. Voor de grootte van de container kunt u altijd even contact met ons opnemen.';
  let rmhLines = doc.splitTextToSize(rmh1, PW - 8);
  doc.text(rmhLines, M + 4, y);
  y += rmhLines.length * 5 + 6;

  const rmh2 = 'Boren tot grote diepte is niet niks, wij komen met groot materieel. Wij zullen er alles aan doen om dit zo netjes mogelijk te doen. Houd er rekening mee dat de tuin, oprit of bouwkavel behoorlijk geroerd zal zijn na afloop.';
  rmhLines = doc.splitTextToSize(rmh2, PW - 8);
  doc.text(rmhLines, M + 4, y);

  addFooter();

  // ========== PAGINA 4: ALGEMENE VOORWAARDEN & FACTURERING ==========
  doc.addPage();
  y = addHeader('ALGEMENE VOORWAARDEN & FACTURERING', false);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Algemene Voorwaarden', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const voorwaarden = [
    'Meerwerk wordt uitsluitend uitgevoerd na overleg en toestemming van de opdrachtgever.',
    'Kosten van vergunningen en leges zijn niet inbegrepen en worden apart verrekend.',
    'De boorlocatie dient normaal toegankelijk te zijn voor onze boorinstallatie. Eventuele wachttijden worden in rekening gebracht tegen \u20ac225,- per uur exclusief BTW.',
    'KLIC meldingen worden door Ground Research BV verzorgd.',
    'Boorlocaties worden bepaald door Ground Research op basis van KLIC informatie.',
    'Schade aan kabels en/of leidingen welke niet of onjuist geregistreerd staan bij het kadaster zijn niet verhaalbaar op Ground Research BV.',
    'Aansprakelijkheid is te allen tijde gemaximeerd tot het bedrag van de opdracht.',
    'Werkzaamheden worden uitgevoerd onder BRL2000 / BRL2100 / BRL11000 certificaat.',
    'Scheidende lagen worden afgedicht volgens de richtlijnen van BRL2100.',
    'Onafhankelijkheid moet ten allen tijde zijn geborgd. Ground Research keurt geen eigen grond (zie BRL2000, BRL2100 of BRL11000, functiescheiding).',
    'De projectleider van Ground Research beoordeelt alleen of de aangeleverde gegevens voldoende zijn om de werkzaamheden conform de BRL-eisen uit te voeren.',
    'Garantie op ondergronds systeem 10 jaar. Prestatiegarantie op bodemwisselaar 25 jaar.',
    'Voor klachten t.o.v. BRL-werkzaamheden kunt u terecht bij Ground Research BV.'
  ];
  let vCounter = 1;
  voorwaarden.forEach(v => {
    if (y > 245) { addFooter(); doc.addPage(); y = addHeader('ALGEMENE VOORWAARDEN & FACTURERING', false); }
    const vlines = doc.splitTextToSize(`${vCounter}. ${v}`, PW - 4);
    doc.text(vlines, M + 2, y);
    y += vlines.length * 4 + 2;
    vCounter++;
  });

  y += 10;
  if (y > 235) { addFooter(); doc.addPage(); y = addHeader('ALGEMENE VOORWAARDEN & FACTURERING', false); }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...MEDIUM_BLUE);
  doc.text('Facturering', M, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('De kosten zullen volgens onderstaand schema worden verrekend:', M, y);
  y += 7;
  doc.text('\u2022  50% van de totale kosten na ontvangst van de opdrachtbevestiging', M + 4, y);
  y += 6;
  doc.text('\u2022  50% na oplevering werk', M + 4, y);
  y += 10;
  doc.text('Het factuurbedrag dient binnen 30 dagen op onze bankrekening te zijn overgemaakt.', M, y);
  y += 6;
  doc.text('Alle vermelde bedragen zijn exclusief BTW.', M, y);
  y += 6;
  doc.text('Dit voorstel geldt tot drie maanden na dato.', M, y);

  addFooter();

  const filename = `Offerte_${d.kenmerk || 'draft'}_${d.klantNaam || 'klant'}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
  const offerteProject = ((d.kenmerk || '') + (d.locatie ? '-' + d.locatie : '')).trim() || 'draft';
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
      if (el.id.startsWith('km-') || el.id.startsWith('modal') || el.id.startsWith('bib')) return; // skip modal fields
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
    data._clusters = clusters;
    data._clusterCounter = clusterCounter;
    data._vrijeRegels = vrijeRegels;
    data._vrijeRegelCounter = vrijeRegelCounter;

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
    if (Array.isArray(data._clusters) && data._clusters.length) {
      clusters = data._clusters.map((c, i) => ({
        id: c.id || i + 1,
        label: c.label || `Cluster ${i + 1}`,
        vermogen: parseFloat(c.vermogen) || 0,
        boringen: parseInt(c.boringen, 10) || 1,
        diepte: parseFloat(c.diepte) || 0,
        diameter: parseInt(c.diameter, 10) || 40,
        luslengte: parseInt(c.luslengte, 10) || 165,
        verdelerput: !!c.verdelerput,
        params: (c.params && typeof c.params === 'object') ? c.params : {}
      }));
      clusterCounter = Math.max(data._clusterCounter || 0, ...clusters.map(c => c.id || 0));
      renderClusters();
    }
    if (Array.isArray(data._vrijeRegels)) {
      vrijeRegels = data._vrijeRegels.map((r, i) => ({ id: r.id || i + 1, naam: r.naam || '', bedrag: parseFloat(r.bedrag) || 0 }));
      vrijeRegelCounter = Math.max(data._vrijeRegelCounter || 0, vrijeRegels.length);
      renderVrijeRegels();
    }
    calc();
  } catch (e) { /* ignore corrupt data */ }
}

function attachAutoSave() {
  // Listen on the whole document for changes
  document.addEventListener('input', autoSaveAll);
  document.addEventListener('change', autoSaveAll);

  // Flush pending autosave + make sure niets verloren gaat bij tab verlaten
  const flushNow = () => {
    try { if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; } } catch(e) {}
    try { autoSaveAll(); } catch(e) {}
  };
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
    else if (document.visibilityState === 'visible') {
      // Terug op de tab: herstel gegevens uit localStorage zodat niets "weg" lijkt
      try { autoRestoreAll(); } catch(e) {}
      try { renderClusters(); renderVrijeRegels(); calc(); } catch(e) {}
    }
  });
  // Mobile Safari: bfcache restore
  window.addEventListener('pageshow', (ev) => {
    if (ev.persisted) {
      try { autoRestoreAll(); } catch(e) {}
      try { renderClusters(); renderVrijeRegels(); calc(); } catch(e) {}
    }
  });
}

function init() {
  // Load handtekening
  loadHandtekening();

  // Set today's date
  document.getElementById('f-datum').value = new Date().toISOString().substring(0, 10);
  document.getElementById('f-transport').value = eur(costParams.transport.prijs);
  document.getElementById('f-graafwerk').value = eur(costParams.graafwerk.prijs);
  document.getElementById('f-olo').value = eur(costParams.olo.prijs);

  // Ensure klanten exist
  getKlanten();

  // Build UI
  buildCostRows();
  populateKlantDropdown();
  populateBibSelect();
  if (!clusters.length) addCluster();
  renderVrijeRegels();

  // Initial calculation
  calc();

  // Auto-restore saved form data (offerte tab)
  autoRestoreAll();

  // Auto-genereer projectnummer als kenmerk leeg is
  var kenmerkEl = document.getElementById('f-kenmerk');
  if (kenmerkEl && !kenmerkEl.value.trim()) {
    kenmerkEl.value = generateProjectNummer();
  }
  // Zet datum op vandaag als leeg
  var datumEl = document.getElementById('f-datum');
  if (datumEl && !datumEl.value) {
    datumEl.value = new Date().toISOString().split('T')[0];
  }

  // Attach auto-save listeners
  attachAutoSave();
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
  document.getElementById('pva-bs-area').innerHTML = '<div style="color:#888; padding:20px; text-align:center;"><span style="display:inline-block;width:18px;height:18px;border:3px solid #e8ecf1;border-top-color:#1e3a5f;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;"></span>Bezig met ophalen...</div>';

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
    b.style.border = k === v ? '2px solid #1e3a5f' : '';
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
  ctx.fillStyle = '#1e3a5f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
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
  ctx.fillStyle = '#1e3a5f'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
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
  const d = gatherOfferteData();
  const firstCluster = d.clusters?.[0] || {};
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
  document.getElementById('opl-diameter').value = String(firstCluster.diameter || d.diameter || '40');
  document.getElementById('opl-luslengte').value = String(firstCluster.luslengte || d.luslengte || '165');
  document.getElementById('opl-bronnen').value = String(firstCluster.boringen || d.boringen || '1');
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
      <td style="padding:3px 4px; font-weight:600; color:#1e3a5f;">${i}</td>
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


