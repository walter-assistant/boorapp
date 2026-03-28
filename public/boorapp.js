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
  { id: 1, bedrijf: 'Louter Installatie Techniek', contact: 'Maurice Schouten', telefoon: '', adres: 'Kabelstraat 3 1749DM Warmenhuizen', cert: '' },
  { id: 2, bedrijf: 'Eco-Well', contact: 'Edwin Bruin', telefoon: '', adres: 'Warmenhuizerweg 20 1749CG Warmenhuizen', cert: '' },
  { id: 3, bedrijf: 'Grenko BV', contact: 'Carlo van Westen', telefoon: '0228-784055', adres: 'Gerard Brandtweg 103 1602LZ Enkhuizen', cert: 'K021695' },
  { id: 4, bedrijf: 'Heatpump Service', contact: '', telefoon: '', adres: 'Einthovenstraat 4C 1821BV Alkmaar', cert: '' },
  { id: 5, bedrijf: 'Daan Installatietechniek B.V.', contact: 'Daan Spaansen', telefoon: '0615515826', adres: '', cert: '' },
  { id: 6, bedrijf: 'De Wit Loodgieters', contact: 'Erik de Wit', telefoon: '0622496595', adres: '', cert: '' },
  { id: 7, bedrijf: 'HPS', contact: '', telefoon: '0613373780', adres: '', cert: '' },
  { id: 8, bedrijf: 'Verver Installatietechniek', contact: 'Karel Verver', telefoon: '0653285293', adres: 'Brugstraat 35 1906WT Limmen', cert: '' },
  { id: 9, bedrijf: 'Alltherm', contact: '', telefoon: '0235388344', adres: '', cert: '' },
  { id: 10, bedrijf: 'Klimaat Concept', contact: '', telefoon: '0610022110', adres: '', cert: '' },
  { id: 11, bedrijf: 'Happier', contact: 'Onno Speur', telefoon: '0652003499', adres: '', cert: '' },
  { id: 12, bedrijf: 'Installatiebedrijf Oud', contact: '', telefoon: '', adres: '', cert: '' }
];

function getKlanten() {
  let k = localStorage.getItem('gr_klanten');
  if (!k) { localStorage.setItem('gr_klanten', JSON.stringify(DEFAULT_KLANTEN)); return [...DEFAULT_KLANTEN]; }
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
    const tabs = ['offerte', 'klanten', 'opgeslagen', 'pva'];
    t.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'klanten') renderKlanten();
  if (name === 'opgeslagen') renderOffertes();
  if (name === 'offerte') populateKlantDropdown();
  if (name === 'pva') initPvaTab();
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
  glycol: { aantalCans: null, prijsPerCan: 80 },  // null = auto
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
             style="flex:1; margin-right:8px; font-size:13px;">
      <input type="text" value="${art.bedrag ? eur(art.bedrag) : ''}" placeholder="€ 0,00"
             oninput="customArtikelen.find(a=>a.id===${art.id}).bedrag=parseEur(this.value); updateTotal();" 
             onfocus="this.select()" style="width:100px; text-align:right;">
      <span class="auto" onclick="removeCustomArtikel(${art.id})" title="Verwijderen" style="color:#c62828; font-size:14px;">✕</span>
    `;
    container.appendChild(row);
  });
}

function paramRow(label, inputs) {
  const row = document.createElement('div');
  row.className = 'cost-row';
  row.style.cssText = 'padding-left:20px; background:#f8f9fb; border-left:3px solid #4da6ff;';
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
      container.appendChild(paramRow('Cans × prijs', `
        <input type="text" id="param-glycol-cans" placeholder="auto" 
               oninput="onParamEdit('glycol')" onfocus="this.select()" style="width:50px;">
        <span style="font-size:12px; color:#666; margin:0 4px;">×</span>
        <input type="text" id="param-glycol-prijs" value="${eur(costParams.glycol.prijsPerCan)}" 
               oninput="onParamEdit('glycol')" onfocus="this.select()" style="width:80px;">
        <span style="font-size:11px; color:#999; margin-left:2px;">/can</span>
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
      const c = document.getElementById('param-glycol-cans').value.trim();
      p.aantalCans = c ? parseInt(c) : null;
      p.prijsPerCan = parseEur(document.getElementById('param-glycol-prijs').value);
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
    glycol: () => { document.getElementById('param-glycol-cans').value = ''; document.getElementById('param-glycol-cans').placeholder = 'auto'; document.getElementById('param-glycol-prijs').value = eur(PARAM_DEFAULTS.glycol.prijsPerCan); },
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
    const autoZakken = Math.ceil(mpb / 28) * boringen;
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
    const diam_m = diameter === 32 ? 0.026 : 0.0326;
    const lusLengte = mpb * 2 * boringen;
    const inhoud = Math.PI * Math.pow(diam_m / 2, 2) * lusLengte * 1000;
    const glycolL = inhoud * 0.30;
    const autoCans = Math.ceil(glycolL / 25);
    const cans = costParams.glycol.aantalCans !== null ? costParams.glycol.aantalCans : autoCans;
    const glycolPrijs = cans * costParams.glycol.prijsPerCan;
    setCost('glycol', glycolPrijs);
    setDetail('glycol', `${glycolL.toFixed(1)}L → ${cans} cans × ${eur(costParams.glycol.prijsPerCan)}`);
    if (costParams.glycol.aantalCans === null) {
      const el = document.getElementById('param-glycol-cans');
      if (el && el !== document.activeElement) el.placeholder = autoCans;
    }
  }

  // --- Graafwerk ---
  if (!costOverrides['graafwerk']) setCost('graafwerk', costParams.graafwerk.prijs);

  // --- Transport ---
  if (!costOverrides['transport']) setCost('transport', costParams.transport.prijs);

  // --- Barogel ---
  if (!costOverrides['barogel']) {
    const autoZakken = Math.ceil(mpb / 8.65) * boringen;
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
    const card = document.createElement('div');
    card.className = 'offerte-card';
    const d = o.datum || o.savedAt?.substring(0, 10) || '';
    card.innerHTML = `
      <div class="offerte-info">
        <h3>${o.kenmerk || 'Geen kenmerk'} — ${o.klantNaam || 'Onbekend'}</h3>
        <p>${d} · ${o.betreft || ''} · ${o.meters || 0}m</p>
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

function loadOfferte(idx) {
  const o = getOffertes()[idx];
  if (!o) return;
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

  // Set cost overrides
  costOverrides = {};
  if (o.costs) {
    COST_ITEMS.forEach(item => {
      costOverrides[item.key] = true;
    });
    calc(); // calc first to set details
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
  if (d.locatie) { doc.text(d.locatie, M, leftY); leftY += 5; }
  
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
  
  // Ondertekening links
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Met vriendelijke groet,', M, y);
  y += 6;
  doc.text('123bodemenergie / P. Groot, bedrijfsleider', M, y);
  y += 4;
  doc.text('Tel.: 088-1262910 / Mob: 06 47 326 322', M, y);
  
  // Akkoordblok rechts
  const akkoordX = W - M - 80;
  const akkoordY = y - 25;
  doc.setDrawColor(...MEDIUM_BLUE);
  doc.setLineWidth(1);
  doc.rect(akkoordX, akkoordY, 80, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Akkoord voor uitvoering:', akkoordX + 3, akkoordY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(d.klantNaam || 'Naam:', akkoordX + 3, akkoordY + 16);
  
  // Handtekening lijn
  doc.setLineWidth(0.5);
  doc.line(akkoordX + 3, akkoordY + 22, akkoordX + 77, akkoordY + 22);
  doc.text('Handtekening', akkoordX + 3, akkoordY + 26);
  
  // Datum lijn
  doc.line(akkoordX + 3, akkoordY + 32, akkoordX + 77, akkoordY + 32);
  doc.text('Datum', akkoordX + 3, akkoordY + 36);
  
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
  } catch (e) { /* ignore corrupt data */ }
}

function attachAutoSave() {
  // Listen on the whole document for changes
  document.addEventListener('input', autoSaveAll);
  document.addEventListener('change', autoSaveAll);
}

function init() {
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
