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
const HEADER_DRILLING = 'data:image/jpeg;base64,/9j/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAHTBXgDASIAAhEBAxEB/8QAGwABAQACAwEAAAAAAAAAAAAAAAEFBgIDBAf/xABCEAACAQMBBAYIBAQGAgMAAwAAAQIDBBEFEiExQQYTUVJxkRQVFiIyNFNhMzVygQcjQqEkQ2KSscEl0RdzgjZj4f/EABsBAQACAwEBAAAAAAAAAAAAAAABAgMEBQYH/8QALREBAAIBAgUEAgIDAQEBAQAAAAECAwQREhMhMVEFFDIzFUEiUjRCcWEjJEP/2gAMAwEAAhEDEQA/AN8wMAGy1TAwAAwMAAMDAADAwAAwMAAQAAC4IUBgYAAgwCoBghSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAACAAAQFIAAAAAAAAAAAAAAAAAAAAAAACAUEAFIAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAABQICkAAADjX+VqeBgKj3p9qNgq77efga7OSbS+xSZZapKoktx1ubZcbiKLKsirtxvJJ5bOXI4vmV2CKyz1TqUo7KWdo89JZaXaz2S06q7iEMbnvyVlLI6Te06dOS2c1fudta8qVm41JLd9jus9NpUraXWSSm+DPJfWsLerF9ZtRbW0RsLdX6cYKjhvCUvsY+dSVRtyeThWjDrKsqDymdVV4hFqW98glltJnRVaMqkksGTv69K4mlTlnBqtvLE+e/mZK2qRhWw3vZNVbvdxeRzLwBsQ1pAASAAAhDlgjQHGaUotY3NYMEl1VeUOx4M+jE6jS6u7jJf1ox3hlpL02UvecWe3G8xltU9+OOW4yYrKt4MDBQZFEwMFAEwMFAHEuC4AEwMFAEwMFAEwMFAEwMFAEwMFAEwMFAEwCgCYGCgCDBQBMDBQBMAoAgKAIQ5DAHEFYAYBSMCFIALxAQA7MAoIWQAoQgKAIAAAAAAAJAAEAAAAAAAAAAADBQBAAAAAEYRcDAAAAGQowBAi4GABGUYAgLgYAgAAAAAAAAAAAAIAAABcbiMCAAAAAAAAAAAAAGQwAIAUCAoJEBQBAAAAAAAoEBQBAUgAFAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2gdoEqb6EvA1uW7PibLP8F+BrUlmTX3KSy0cYnJHGPE5IquPgdb4nYcf/AFkTBBBvaju5oyN1fODgoZTwY+EmprC4YZlrq3jXnSawls5bMazyxv8A+VKUpS63gjrne3EqTt5Ti4vfg9tO1tVF7TzUXBZPRf6bTlZUqsFGM+f3/ck3YSM3DOOZwacWnJPD5mRhZpcUo4WVjfk9VTT5Xth1kMQnBfD2kSbsTb4Utx7oLaqR7UeKjBwmoyXvZPfQg53K5YJqizIp5RQDPDXAASgAAAAADw6pS2rZVFxgz3HXWh1lGpF8GiLdlonqxNrLMPHeZam9qnH7GFobpOL5PBlbWWYuPYYqd17x0ekEXApmYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2AAhZCjAAAACAoAgBQICgCAoAgKAICgCAoAgAAAAAAAAACAAAAAAAyAAAYAEKgADIAYGBgAMgAMgAAAAAAAAAByIUBCAoAgKAICgCYAAAAAAABCgAAAAABIgKAICgCFAAADJAELkZAAACAAAAAAAJAAAAAAABAAAAAAAAAAAAAAAfBgdoCX4P7GuSXvy8TZH+G/A1ur+LPxKSy0dceLOS4nFN5xyKyN11jwWe053MVGpFLukS3s53K9+D/wBJMi2qi3LaW/B7VGtVkqUFv2dxiot8FxwZuM5UlbV4f0wwzFKYeazs27lq5bTibFG2oTs8Sy44wYyhVhXulPGW+Rn3FOz+HG7gN0tbucUq0IUs+6jyXta7oVWotqD44PfeLFxFLdhHbWjt27lLfu4kShgKDzVbzltmTs99dv7GNt8dfLdzMnZfizLURfs9i4FIUzwwAAJQAAAAAAXFrtQIyJGErx6m7kuTPbaVFtL7nTqkMVYzJQnvizD2ln7wywIntJMpmYQAEoAAAKQAUgLkCApAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOwoBCwQpAABQIMFAEwCgCAoAgKQAAUCAoAgDAAABAQpAAAAAAAAAAAAYAAAAAMAAAMAAMDAADAwAAwMAAQB8QAAAAAAAAAAAAABAAAAAAAAAQoAgAAFIAAIUAACQAIBQQECkAAYLgAACAAAAAAAAAAACQABAAAAAAAAAAAkAAAG98OI5lIlMOM6kaa3vf9iRqwknh48Tvt6cJKUpRTx2nRUnRkpdZBQUf7mObL8MObklRcm0opcWYGpQks1GsJyaeT1K4p7FV3Em6f8ATFHdZ3dK6ncVLqG0tyhFcis2ZKwxc4rZeyjz57TI3EYxzGHNnluKHVKPayu62zqUznUqbbj9lg6uO47HDq4RfaWgceGccj23E6vUUdiWIyWDxPdn7mUpUqdWzoqW7BWSHkjcVbeqlF4ljezIx1O5dvhTcjF3bh6T7jO+nN9Tue7mQlkq806kJzy1sLee2o4z0xOHJGOuJLEO64R/4PbBKlpksyTeO0t+lWAo/j+LMnZL+ZNmLt99V+JlLL4pk17ov2evAKQzMAACUAAAAAATlgoA8epU9u3yuMXk8Ns8wRlq0dujNfYw1DMJOPYzFaGarNUZbVNfbcc8HmtJZg0ell6sdoAAWVAAAAAAAAAAAKQAUgAAAACkKAAAAhSAAABQAAAAEAAAAAAAAAAAAAAAB2kKCFkKAAAAAAACFAEBQBAUAQoAAAACAAAAEIxgoAgKAIUhQAwAAAASgACAAAAAAAAAAAAAAAGQAGRkARlyQAAAAAAAuCAAAAAAEKAAIUBCAAAAAAAAAAAAAAAAAACAFAAACFIALkZIAKQAkAAAABAAAAAAAAAAAAACQAKBMcwm9tFOLW7JWy1XGd56GnDY23Ln2GGva9SVVRlLdxMrqVNTVFU3iUuODEXVJ9eoc0YWeNtnVJ7Od/E9Fj70JQisvMeH2Z5erctpPG32HKnUrWdRSisbXbwKpemvVUZyzHDT5nkuLjrdndwONWtOtUcpcZPkcZ05QS2lxEJIvej0VsOnSfieU7NraUU/6S8IlG8rJ7q8JLTqTUtzPBuSeTLUnCemwVTcovcVkhj6tF09mT35O+lvgxe16c9mEOXYSl8DIS9txN+4l3V/weetbXEaHXRk9iXI9Vbfsbv6V/weinvspQbymvIvEdFN2FtWttdrMpZfFMxdHdXa7GZSyf8AMqIV7l+z2IBAzNcABIAAAAAAAAvNGDrQ6q9nHteTN5MVqcdm4jPtWDHZko77SeKmD3czFW88Ti/2MtnOPAVTeEABdiAAAAAAAEgAAAAAAAAACAABIAACgACAowAAAAAAAABAUgAAoEBQBAAAAAHaCghdAUAQAAAAEAABAAAkBSBAAAAAAgKQAAUCAoAgKABCgCApMgAABAAAAAAAAAAEAAAAAA+BCvgQAAAAAAAFAgQAFIAAAAAAAACAUEAQAAAAAAAAAAAAAAAG6dgDiRDc2UAZCBkKyAAAABRzwglBw4nCtWjQpuc3uRrd3rdSdz/LfuJmK+StWK2WKtnB4tP1Gne08blM9xelotG61bRaEABZYAAApABSAAAAAAAAAAOQxlNfYF4CUxLF2spT+OWZKW49NazhcVozbxjieamuqvK1N8OKMlF+4n2ox7bsm/RidQtadKcOrbW097Z0elqrRVO4j8PBoyN9Yzu3DZnjBh7qh1FWUG8srML1l1NpS3cnuOc686kdmS3HWjk0V2WcUdrhilGXadaR3y+Xh4loHVLesntlSdTSovON5492zv4ZMxbSp07HZm1jjvIkYurQdKEJJbnzZ3Ufw3niW8u41sQhwXDBKO6myqXtrZTh+lf8Hvt6O1Y7XajyXKcZQ3f0L/g9FvKXo+ztbuwyx2Yp7sEsxupL/UZOy/Gl9zHVlsXk89p77OWLiL7UVjutPZkSBcAZoYAABAAAAAAAAA1uPFqcdqipY4HtOm6jt200RaFqyxdF/wAuLMvRltU0zD0HiKj2GUs5ZpOPYzHWWS7vABlYQAAAAAAAAAAAAAAAFAAEAAAAAACgAAAAAAAAAAAAAAAAAAAIUgAAAdwAC4QoAgKAICgCAoAgKABCkAAAAAAAAAAAAAAABAgAAAAAAAAAAAhSAAAAAAAAAAAAfAhWQAAAgAAAAAAAAAAAAAAAAAAEBSAUhQBAAAAAAAAAAAZwnVhTaTZz5nTdUeupvG6RWya93rpQjUp5XHsOprDaawzz6ddNT2ZP9me+tDPvrgzFF+uzNanTeHQDjtpPGUOsj2oyxMNabR2cgcdtdqG3HtRMTBFq+XIHHbXajlncyY69kxtPZM7zhWrQoQc5vCFatCjT2pNJfc1bU9TldTcYNqBgy5YrGzDlyRWDU9Tnc1JQg8QXZzPHStqlam6kINxXFnfYafO8qJLdFcWbVQtadCioRisczUjHbNO8tatLZOrTrevUtau3F4a5G16fqFO8pLDSmtzRi9V0jEnWo8OxGIoXE7WptxbWHvQi84LbT2XiZxTtLeeeOZDxWGoQvKa7/Ye036Xi8btutotAAC8JAAAAAAAAAAAAAAAESMffLq7iFblzPXRmpRX33kuqPX0HF8VvPJZV8S2JcU8FYZO8MjgwOqQcbyba5bjPcTF63FbNKWN7ZFivdi4wm4OWzuDMpbpS0qWEsrJ4aaTjJviViGV1xW87Kn4C+zOuPxM7J/gL9RbZDqfB/ZnvjTVbTpPfmB4YpOeHwyZejOFGjVTwo/cpK0MXUo9XThJLCZ3U91Ftku7mNdxjCOIo5R/CfYVS995l9U09zpr/AIPZZUlUtNvPvI8Nea9EoVE01weDusLmM4OEZYeOBljsxSxmoR2LyT+x6LaWJ0m+Zx1aGJU5LnxOuhJuCl3WV7WTHZmyEi9qKfaimZhAAAAAQAAAAAGTjJZpSXaciNcUEsJTWzWcexsyFi/fnH7ZPFVjsXdReRkbensJSXOO8wx0lmnrV6SAGWGEABIAAAUhQBCgCFAAAAAAAIUAAAAABcAQAAAAAKAAAAAAAAABAAEAAAAADtCGChcIUmAAGAAAwMAAMAAAAAAAAAAAAABAAAAAAAAAgAIAAAAAAAAAIUAQFIAAAAAAAAAAAEfEFwMAQFwQIAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAhSCYHhuqboVFWgt3MydpWjXobLe5rcdE4qdOUWtzMfCvKynsPg/hbNe1f2z1t/FgtSvK9K/rxjUaUXuPL6bc4y6zOWpT27+pLtMvpGm0bi126iyzFG8ztDiTxXyTEMMr64f+fLBfTrj6rwbR6ltWsbB4tV0yjb2MqlOO+JNqXiFpx3rDFWl5XdxGLqOSbNunXjQoqc+CRpFtNU68ZS4J53Hs1HU53XuxeIxWNxSmThjqY8vDDlqepzu6jhB4gdWn2E7yosr3RYafUvKi2V7vabZbW0bekoRiljnzFKTktvPZalLXtvPYtrWna0lGKw1xO77jjxHI3oiIjaG/ERX4o1GaaktzNf1bSdlOrSW7mbDjfkjWfiWY9hhyYotCl8cXjq0mhcVLaqpwbi1xNqsNQheUlwUzF6tpTUnVox+7RibevUt6m1FtNcjRi9sV9p7NWtppbZu+/mDxafqELymt6U1xR7fHidKlotG8NyLRbrAAC6wAAAAAAFAgKQAAUIGvezyMXfUnbVlWprc+Jk8HGpBVKcoNZyvIrML1ny6resqkE8nRq8M26l3ZZ8zzU3K0r9XL4W9zZ7bnFawqP7JsqtEPFYyzY1odh5Irc0d9hLHWwf9UcnRT9+TyIWda5nOf4Tf3R1r/s7MbVF+JMkOtSxLKWcM9EZdbRqbc0s8EeXZ3t5I1w+xSeq7mnuwerGKJ5I8j2VN1JeBUdzUXpSSf8AUcNJxK7w+wttvsJrHB5R06e3C9jjwM0dmNkNUp7drtL+lmPtZ5js9pmq0Oso1IPseDAUc0q6T4x3Mx2jruVZ61kpUI/ZHajxWU8bUHz4HtSxhGWJY5jYABKAAAAAAAAApABi72OzeJnutW3SPFqPzUPue2xl7kl2GCfkzx8XdkAGdgAUAQFAEKAAAAAAAAAAAAApABQQAUAAAAAAAEBQAAAAAAAAAAKgJgFIAAAHaAAsAAAAAAAAEKQAQowBAXAwBCjAAAAAQpAAGAAAAAAYAELggAAAAAAAAAAgFBAAAAAAAAAEAAAAj4gCkAAAAAAAAAAAEAAACggAoIAAGRkABkAAQBCggAAAAAAB5r63Vag2l70eB6SS+FrtKWjoni6NEucxuZp8UbLoL/wqTNf1FJX1U2Lo8lVsXBfHA1qTtZztPG+WWV5mO1zHqyoZCMspZ4mP1z8sqGe871bmev8AHZqHD9uZ7tPsJ3lThiK4vkNP06d7UTw1A2y3tadtSUILGOJq48UzO8tDDhmZ3ktbaFpRUILf2ndvYymDcrWKujWsVgABdMA/4AI32SjWc7SyuwwGraU03WoLc+SNgI4qUWpcGYcuKMsbsd6RMNKt687WspptY4o2nT7+F3SS4TXIxup6ThOrSW7mjE0LidvW2otprijQpktgttPZgrvSerdcg8Vhfxu6S5SPbyOlS0WjeGzFuIABkWAAAAAAAAAAAGcZ+4ARLzXtt6TSezunHemY6lfOHu1VhOOzJPkZoxGrW6i416a3S+JGO0MtZeWjNQryecJpnK3w5yX2Z5E3v+x6rXfVl90IXl0c/wBzm2urkjg9zl4klhoSQ4J73vORFFLD47z1XCipxUFuwVWdEF7x6az9yKPPDfUR313hoiI6ol6LPfQqROqgtjUIp7jtsX/LqHGUcXkJmfbow79WZfxPzMDqFJ0rvKWNveZ578PtPBqlHrKDqRXvRKWhNZ6vNbVN8Z54GXTyk+0163n72zyM1Z1Nunh8VwK1la0PQADKxAAAAAAAAAAAxupRzWpvmd1tV6p+O443q2q9I629lwX3ME/Jnj4slx3gReIrJTMwAICRQQoAAAAAAAAAAAAAABQBAUAAAAAAAAAAAAAAAAoEBQAAABkKyAAVADsBQF0BQBAUAQFIAJgoCDAAAAAAQpACGAigQAACFAEBSAAAAAAAAAAABAUgAAAAAAIUgAAAAAAJkrIAAAAAAAAQAAAEKTJKDeBkZIAAAAUhIAACFIUAAAgIUgAAAAAAABACXwsCXwsT2RMdGkal+YVWZfQa7pJLcn/yYjUvn6pltPoOdgqkU9qnxxzNOO7R007ZZhsVTDxVjvhLjjtPNe2zu7Z0c75b9xdOuFUpOk1u/wCDvdPYbi87XIzVn9S6mSm7qtreFvTUILCR2tbyFW4zRG3ZhrEV6QAAlIAAAAAZD3gARpSTT3p8jA6ppey3UpR+7M9jeJJSTUllGHNhrkqpevE0yhWnb1NqLaa5Gz6ffxu6S3pTXExuqaXh9bR4diMXRrztqqksrG7BzaXthttPZijek7Nz5fcHjsL+F1SS/rXI9h1a3i8bwzxbcABdIAAAAAAAAAAB11oKrTnFrc0diC3ZKymGsui6fWKaeEzst5KM8vhjcezUNmlOplfHjBjW92M7kUjuzfpXjMuxsjIt8SsmRxX2O7EopbXM6U8M9VeSlCnjsIS6qO+ojtrv30cLZe8cq2+bIjufp6LJ4jUX2ydlRfDJcUzpsn+IvselLakvE2ojo1bd2Ri3sx8CSW3FrC3rBVuQafIxSvDXa9J2tzKO/De7J7rSvsSTX7ndqdqq1HrEveiYu3q7Kw+PB/YxdpZo6w2LaTSa4Mp5bSunFQbz2M9RliWGY2kABKAAAAAABAEvFc77mK7FlHBrNanH7nKfvXMpckiUffuo/beYZ7sv6ZDil9ih/wDYMsdmH9oACQKiFApAAAAAAAAAAAAAAAAUhQAAAAAAXBCgMDAADAwAAwTJSAVAIAAAAGAAAAA7QAQuAAAAAAAAAAIAAAIUgAAAAAAZCkwAALgbiAMACDf2okpKEczaS7SY6omYiN5UHhr6va0PiqJ+B5n0htVwkXjHaf0wzqMcd5ZcGH9obbkx7Q23aTyr+FfdYvLMAxHtDbdpPaG27SeVY91i8swQxHtDbdo9obbtI5Vj3WLyy4MR7Q23aT2htu0cqx7rF5ZcGI9obbtHtDbdo5dj3WLyy4MR7Q23aPaG27SOXY91i8suDEe0Nt2j2htu0cFj3WLyy5HxMT7Q23aT2htu0cux7rF5ZcGI9oLbtHtBbdpHBJ7rF5ZcGI9oLbtHtBbdo4JPc4/LLgxHtDbdo9obbtHDKfc4vLLgxHtDbdo9obbtI4ZPc4/LLgxHtDbdpPaG27Rwyj3OPyy4MR7Q23aPaG27Rwye5x+WXBiPaG27R7Q23aRwye5x+WXBiPaG27R7Q23aNpPc4/LLgxHtDbdo9obbtJ2Pc4/LLgw/tDbdo9orbtIPc4/LMAw/tDbdo9obbtB7jH5ZgGH9orbtHtDbdpG6fcY/LLjCMR7QW3aPaC27SN4PcY/LLgxHtBb9o9oLftHFB7jH5ZcGI9oLftHr+37RxQjn08suDEe0Fv2l9oLftI44Tz6eWX4buZ0160aFJznIx3r+2znOTC6lqk7uTUd0F/cpbJGzHk1FYr0l5r2qqt5UqR4M2PQN9ksrdIwOnadUvau5NQfE262t4W9PYgsIpjrM9WHTUni4nklGVpd5W6EjKp9fQ6yO+R5q9JV6biviXA81leOlUdOWcR3Mm0bS7MTvGz3ATWy1JfBLgTm12GSlujDau0qADIoAAjcAAAAAAAEbdd4P+OMkpRaa4mD1TS2l1tJblxRniNZWHvX3MebDXLG0qzXdptC4nb1dqLaa4o2exvo3dFb0pmN1PTMN1KUfuzFUK1S3qbUcpp8DmY73wW2nspH8W54wDE0tapumtt4lzOfrmh2nQjU45jfdeLbsiVGN9cUO0euaHaT7jH5WZMGN9c0O0euaPaPc4/KdmSBjfXFHtHrij2j3OPybMkDG+uKPaPXFHtHucfk2lkiZ3mO9cUe0et6HaVnU4/KYrLo1l/zoHgWHE7dRvI3E04b0jzRqxWCsajH5ZoidnYt5ZRxE6uujngcnWTRPucflPDKcjtdOVOEJN5TPO6i/Y7p3EXQjHsKzqMflPBLvtlvZxqP3mddK4hDicZ3EHPcyI1GPfungl7LLdUkv9J60t6SMZbXUIVW292MHf6xp5TNiNVi27te2K27OR3Rjk5GMjrFFRWXwL66odpSdTjn9pjDfwyOE01LgzBahaO3qucfgZ6/XVDGMnXW1W3rUnCRWdRj8slMV47um2rppYe9GYo1VVit+9cTWHXhTqNwfunro6nCm08kRqMcfte2G09obCDFrXKLW/cx67odpb3OPyx8i/hlAYv15Q7R68odpb3OPye3yeGUBivXlDtHr2h2j3GPye3yeGVONR7NNvmYz17Q7Trqa5QkuJX3OPyvGmyeHrSxHaf8AU95yslmc5/sjG1dYoSpPD3vcdlDWrejSUMlIz037rzp8nhmgYj1/b9o9oLftMvuMflj9rl8MuDEe0Nv2k9orftHuMflb2mXwzAMP7RWw9o7XmyfcY/J7TL4ZgGG9pLXtHtJa9o9xj8p9nm/qzQML7S2vaR9JrXtHuMfk9lm/qzYMH7T2vaT2otObEZ6T+0xoc8/6s6DEUukljP4qmDJUbqjcQUqVSLfZkvXJWe0sV9Nlp8qu4B7lnI5/YyNcAAAAAAAABcEAAFwAQCRQICgCApAKAAIC4GAIC4GAAAA7CkKVXAABAAAKQAUEAFIAAZCgAAGEAIAAAADIIAY4Bb2cKtRUqcpy4JZJiN0TO0Om9vaVlTcqjW0+CNTvtWr3U2lJxgcdVvpXly8S9xHo0rSJXk9uaxBM6NMdcdOKzi5c18t+CnZjYUqlbGzFyb5nd6suX/l/2N0oWtK3hsU4ReOLwd25Ll5FJ1fiGWvp+8b2loy0u6+k/Ieq7r6T8jeN0t7SY2Y91Ffd2W/HV8tH9V3X0n5D1XdfTfkbxsruoOK7qK+7nwfjq+Wj+q7r6b8h6ruvpvyN32V3UNld1D3U+E/jq+WjvS7r6T8h6ruvpPyN42V3UNld1Ee6nwfjq+Wj+q7r6b8h6ruvpvyN32Y9iGzHsQ9wfjq+Wkeq7r6b8ieq7r6T8jeNmPYhsx7ER7g/HU8tH9V3X0n5D1XdfSfkbxsx7ETZj3UOefjqeWkeq7r6T8h6ruvpPyN32Y9iGzHsRXnn46vlpHqu6+k/Ieq7r6b8jd9mPYhsx7EOefj6+Wkeq7r6b8h6ruvpvyN32Y9iGzHuoc8/H18tH9V3X035D1XdfTfkbxsruobK7qI53/h+Pr5aP6ruvpvyHqu6+k/I3jZXdQ2V3UObufj6+Wj+q7r6b8h6ruvpvyN42V3UNld1Ecw/H18tG9WXX0n5D1ZdfTfkbzhd1DC7qK8w/H18tG9WXX0n5D1XdfSfkbzsruobK7qHMPx9fLRvVd19J+Q9V3X0n5G87K7qGyu6iOM/H18tG9V3X0n5D1XdfTfkbzsruomyu6hufj6+WjvS7r6T8ieq7r6T8jedld1DZXdRG57CsNG9V3X0n5D1XdfSfkbzsruobK7ED2NWjeq7r6b8jl6rufpvyN3wuxE2Y9iI2T7CrSfVdz9N+Q9V3X035G7bMexDZXdRWa7nsatI9WXX035D1ZdfTfkbvsx7ENmPYhwHsqtJ9WXX035D1ZdfTfkbtiPdQ2Y9iI4E+yq0n1ZdfTfkPVl19N+Ru2zHuobMe6is0PZ1aV6tuuHVf2O+00e4q14qomoLibdiPYhhckkRy166WsTu6ra3p29NRgsPtO0mcFMsRs3K1isdF5rDwzwX1Fxl19NcOKPcnvOMknFxlvTItG61ZmJLK4jXp7EmuHunPhufLmYuO1Z3WzwjLfF9hlXKNakqsOHNGOOks0xvG6EyTOY5QM0SwTC5GSAIXIyQAUpxOQAgZCRyIUjAjSksPejCalpbctuiuPJGbGM8smLLijJG0qzDVPQK6/ofkX0Cv3P7G1bK7qGyuxGn7GpENV9Ar9wegV+4bVsrsQ2V2Iexqs1X0Cv3B6DX7htWF2IYXYh7GqYasrGv9P8AsPQa/wBP+xtOF2IYXYiPY1TFmreg1+4PQa/0/wCxtOF2IYXYh7Gq3G1b0Kv3C+g1/p/2NoaTXBDG/guJE6GqYu1GdOVOTUlh9hFCUnhLOT26hiV3Uf3ONuv5kSnsassX6PI6c09lpph032Htr7q8txwkk1kt7CpzHk2WNlt4O94EMORWdDVaMjp6qbWcB0ppJ44mShupcjgnt2mXjKkRGhqtztnhjSnJ4S3srtavDZPfaJO5hu5nsksSe5cTPX0+ssVtTMT0Yb0CvuagPQLjuGz0knCO5HZsrsRWfTq+Vo1VmqegXPc/sPQLjuf2Nr2V2IYXYiPx9fKY1c+Gp+gXPc/sdVS3q0904Y8TcdldiOutb068HGcUuxkT6fWP2vXWS1CNKcuCTOStKsv6TJ3FlWtZNxWYHGlXy8SWGV9jVljVWeFadcPhD+xPV1x3P7GcpXTjuzFo9ULuD4xx9yfY08nu7Q1j1dc9z+xPV1z9P+xtfpFPt/sSVxDG5IeypCY1lmqPTrj6f9jhKyrR3OBslW4XJLHM6qNGVzP3fw+bHsqre+tDARsbip8MOH2K9Num89W/I3OnThSgoxivEuz2pFo0FVfyNvDSvVl19N+Q9V3P035G67MexF2Y9iJ9jUj1K8fpo/qu6+m/Ij0u6+m/I3nZXYhsrsRPsarR6pfw0X1XdfTfkT1Vd/T/ALG+YXdiMLuxHsapj1W3hoT0q7+n/Y4eqrz6X9j6Bhd2I3fbyJ9lVb8taP0+fvSrx/5f9ji9JvPpf2PoW77eQ3fbyHsqpj1e/h879UXn0v7E9T3v0v7H0XC+3kXdjl5E+yqn8veP0+Y1tPuaG+VJr9jhQvbmzqbVKo1JcU2fT506c44nFP8AY1zW+jVOtTde1WKkeKXMx2000/lVuYPU8eb+GSO7u0PpFTvYxpVsKpwy+ZsGOOD5MpVLO6ym4Ti96Poug6nHUbGEs+/HdJGfT5pt0s1PUdBFI5lOzKAA3XDAAAAAFyCFQFIABQQAUAACkAAAAUAAAAAAAHYBgFVgAARgoAAACAFAgKAICgCAACAoAgKQAMABCcOBjdcr9TYtJ8VgybMD0o+Vp/dmbBG+SIa+qmYxTs123pOvcQpr+pm9W1FW9vCEVjC3mn6Ktq/i3xXA3Uz6uZ32aXp9I4dwAhpOtPcABAEKTiT1lG+07AA7fsOpuAAbiAc8AbT3OoAB1O/7MDAD4EdYI3nsgACQhSE7bd1d4ABgG8AAG6dwAPdxG8x1QAAjeToAEHUUEC38ORIoIAnZSDIyRvB0gABP/EAGcgdQAASADI3QEwUCNxMFBB1OgyFbRBsAGQR26AAB1OgABOx0dF5bq4oSSztR3pnVp90linU5bpI9mc45Y4/cx13S6mv18fglx+xS8eGak/pkpx2KmzxzvQOFvVVzRUYvElzOWRS0dpResd1IMjnjmZejEAAj/gFyTIwiOqJiVIBzLdiOq5IXBCCIn9gAJ3lOwACNzae4AAjpIABxQmImADmlzfAEm0/sAA4oTERPULzx9zi3uLz/AHIlEb79Gt3vzNTxFv8AHF/cX/zVRfclHjEpE9Wad+F2XW64fgcH8Jzud9f9jr/pLzMEx2l1HKn8Rx5nOkvf3mOZhbae8PU91Lh4HBR2aUl98nObxFLB1Rb2am/K3YFUT07udq/8VDxPdNe+0eOhRqRdKq4PZcuJ7ZfFvNik9GvkrG/R76ePR4NcS5Oq3k3SS7DtKzvuRUADIhJkcwCEdf2P3lh4x90eG40ulVy6b2ZHu3k57lvImFomZ7MFUsbmg3iG0lzRxjUqw3TjJfsbAm+Wf3DjF8YpvwK8Mr8TCK5ysYn5HJOvUwqdJyRmNiC/pXkcljw8Bt5N/wDxjqOnSl71Z4/0mQhCNKGzFL9g3+4WVwLbbSpM7xuqQLx3gtvt3RETKAoG6dtuqYGF2F54Jnh9+A6oUfsXDGB1NpBljAwJ3/Zt5MsZY4EB/wCKACQ/dlytnDRBywJ7Jr0ndofS2wja3iqqOI1GXofeOnfulndPgjKdM4qVtTb5ZNc6Mv8A87a+O85t+maIeuxzzvT54ur6WAU6MPIz3QuACUGBgABgAACgAAAEgACAAAAAAKQoAAAAAB3EZSFVkBcDAEBcDAEwMFAEwCkAAAAAAIAAAKQAAABCgiRF8SMD0n+UpeJnuaMF0oX+DpeJsaf7Yamr+qWG0T5+JuppWifPxN1Mmr+TB6f8AhSGn+nSnuEctlNvgi9p4tUuPR7SWHvksZMmOvFLFlvwVmWHvNZuYXMo0pLZR5/Xd5zkjHuWZSfFsM69cFHmb6rJNt92SpazdTqwjKW5vDNpi8wzzeDR7f5in+o3ePwJ/ZGlqqRWejq6DJbJE7uT4gc2ST2YtvkaNY3l1LT0YHVNUrW9zKFF4PF65vMb5I6dRn1l9OWcnmZ2MWKs06vNZ9TkjJ/GXv8AXV53kT11ed5Hg5BrBl5ONg9xk37snR124jNdZvRn7S8jeUtuPFGm/wBJmuj03tzhncuBq6jDWK8UN/Q6q/HtMtgONSWxTlLsRy5Hmv57FnN8Xg5+ON7O1ktw1mzA1tZu1WkoyWyjr9dXfeR4G85eMNsHYrhpEdXmb6nLxTtL3+urvvIq1q7T3vJjv2KnzRPJp4V9zl8tl03V1de5NYkZRmm2TcbyDW7ebinlJ/Y5upxxS3R3dBnnLXqPgzWbrWbqlc1KcZJJPmbNJZizSr/56r4nJ1dpiOks+e01jd6/Xt730PXt730YzA4HP519tt2nzbbsl69ve+g9cvM/EjG5xxQHOvH7TzbMzb6/WVRKthxNhpVo16anB7maMbRoU5StcN7kbmnyzM7Sz4ckzOzKElhRbbwlvKeXUZunZzaeGb952jdt2naGLvtdcJuFFb0eL15ecpIx8nmo32nHmcbJntNujn3y27sl68vH/Uieu7zvIx73Mj47iOdef2rzLMi9cvO+sHvsdcc5xhWXHma/w5HKLaksdpama0T1lNctt29LD3p7nwH9OGdFk9q1p55I7+J16TMw6FZ3ruxmr3la0pxdJ4beGYj15ebt6Mh0hf8AJj4mvY/4ObqMlq36S08t5i3RkPXl52ovry87yMbkfua/Nv5YYy2lkvXd33kVa7dp+80zGLGd5eYjNffumMtm16dqUbuKi1iSPf2mqaM2r1b+JtX37Tq6bJxV6tzDabQsm8bmjXLzV7qldzhFrCNifBmn6l89UMWqvNY3hXNaaxu9Hry77UPXl33kY0cOPA585r+WrzLMi9bvMcUc6et3bqRy0YvwOSeGn2FozX32kjLbdu8JKdNSXMVKUasHTkuJ59Pm6lnGR6nyZ2KTxV6ujjn+O7X7q9udPqOEHjsOha1dvflHo6RJbVOWN7eGYdcMHKz5LVvtDBfJbfZkvXN1lZkjPWlZ17dVHvZqKNh0WrtUnDJbS5rWvtLJWd2UPHqFzK2o7UGkz2dhg9aq5qKm3uSN3V3mlOjNTq6fW91jdJEer3Wc7S4Hg5ZD4PwOJ7jJv3bdaQ2bTbidzQ26jy84PZzZjdE+U/cyPM7untNqRMtXJG1p2eXUK87a2c6bwzAvW7zlJMzOr/Js1aXE5+sy3rfaro6THW1d5e567e95HB69e99HgkcHhvCNOM+Sf26lNPj/AHD3y1++4KawZPQ9Ur3laUKzTwaxL/gyGhVer1Bb8ZM+DPfi2k1Gkx8uZhupJtxpTlHikVccvg0cKj/lT8DtdeF5rHERfafLR7/pNqNC8nTpzSimef2s1P6kTH6p8/V/UeQ5d8lot0e7w6HBbHEzVvXRnWrjUZVY3UltRXuns6Q39fT7JVLeS2scTUujFx1Oq04t+7LOTY+lzzp3ijapkmaOJn0tKa2tduktefSzU+/ELpZqeUnNYyYRiPxLxNSMtt9nenQ4IrO1X1DS7ipdWEKlXiz2r/sx2hfldIyJ1KT/AB6vDamsVzTENM6TXVW1uG6bSyzCx1q8i90luMx0ygoV4tLjvNWecrHM0Mt5rbZ6v03S4smDitDJT1y9nPO2ieu7zhtIx+7OEtxP7GLnXdKdFgj/AFZD1xd85IzWi3VS7pZqPMjVjN9HKjVw4MyYskzPVoeoaPHXBNq1bNW3QieSrV6q1qyi0pJZR6rqWIxwY+72XaVdrjsm3M7VeWwV3y1iWDXSG/jBQVRYi8o5e0moN/iRMS98pblwD5ZRozmvv3e1jQ4JrG9WZj0p1KCwqkTl7V6n34mEeFjgMlebfyv7DT/1hm/avU+c0zK6T0tnVqwp3KW/mafwZVNxkpLc0y9c1t+rDn9NwXpMRG0vrkZxmlKLzFovYY3QasqmkUJyeW1vZknywdOk713eFz4uXeaOi8uadnbyq1XuX/Jpd50wu51GrdKME+Jmel1SULFRi90nlmhrhjtNLUZZidoel9J0OPJj4rs37V6n9SI9rNT78TCeSJ9sGtzb+Xb9jg7cLOe1mp9+JmOjuvXV/cundTWORpn7IyfR6t1OrUuSb3mTHktxNXWaHFGKZrXZ9L8OAGcrdwB1IneN3hZjaZqk37suWFk0K66UalSuqsITWzGWEb7P4Jr7Hym++erfqZq6m817O/6Ngx5ZmLwyntZqffibJ0Z1W61KnJ3Mlu7DQDcehX4c/EwYclrW2l0/U9Jhphmaxs2+G58N3aeXUK87bT61WlJbcItrJ6eLPFrH5XcvC/DZv3n+LyenrFssRLSX0t1PP4iHtdqf1EYN8XuHkcqctvL3ddBg2j+LN+1uqfURfa3VPqIwe5rKX9ifsiOddeNBp4/1bhoHSO8vdSjSuZJwZuT4LPafLNHr9RqVF8E5JPB9Rg8wTW/aSwb+nvNu7y3rGnrhyfwhyABtOHsBcgOwH7az0y+Th4mt9Gfz238TZOmXycPE1voz+e2/ic/L90PW6P8AwJ2fTATJUdCHlLdwAEq7AAAFAAAFCUBQBCgBAAQCgAAAABSFAgAA7gAVWAAAAAAAADjg5ADjgYOQA4gAAAABCkAAAAAAHNGB6UfJ0vEzy4owPSj5Ol+oz6f7Yaus+qzDaJ8/E3U0rRPn4m6mXV/Jr+n/AFgBDSdKYXPkYzVNOrX2FCoooyYL1twseTHFqtKvrGdlUjGc087zymY6RfM0v0/9mIfE7OK29Il5bUUiuSauy3+Yp/qN2j+GvBGkW/49P9Ru8fw14I09Y6fpnaXLmzjUi5U5RTw2uJy5sHPidnZmN+jXqnR+tKpKfWLLZx9nav1YmxEZs+5tENKdDjmd2u+ztXH4qMXXoytqzpyeWjdjUNV/MJm1ps03naXP12mriiJq8nIy/R/5iZiHwMv0f/HmZ8/1tLR/bDYuR5r63nc0NiEtnJ6kQ40WmJ3eptWL12lr3s7V+qmx7PVvqo2EGx7m3Zpfj8cy1C+sKlk0pSyeTBnOkHGJhG+J0sN5tVwtTTl34Ydtr81DxNyh8C8DTbT5un4m5Q+BeBqa35Q6npfxlX8LNKv/AJ6r4m6y+FmlX3z1XxODrezd1PaHRzR79NsVeSabxg8HIzegfHI08FYtfq18dd7uypoEYU5z2t6XAwElsya7Dea/4NT9JpFT45eJm1NIr2ZM9Iq4Gz6B8uzWDZtA+XZTS/JXB8mXPFqvyMz2LgePVvkJnTy/CW9ftLUMbyPh9y8x/wCjh7bS5csvYaRG6t1UcuJL/SFaUttSyZTRfy6BNb+UOjOKIx7trgjg3aqVcV4kKuK8Tnftqx3blYfKw8D0nm0/5SHgenkju07Q6dPiwnSH8GPia/8A+jYOkP4MfE1//wBHL1PW8tHN8nKlBVK0YvdkzsNBhKMW5cTCW3zFPxN0p/hx8C+mpF4ZMFItDUdQtFaXGwuB5DKa787+xizWyxw22YLxtbZ79I+dibZyRqekfOxNsOjpPi29P2lHwZp+o/PVDcJcGafqPz1Qrre0I1Hxh5T0WVnK8q7EZY8TzmV0L5tGhjjits1Mcbzs7fZ2sv8AOjgns9W+qjYgdP21e7ejDV5bC3laW0ablnB6uf7gdnibMVivRliuzAdIf8rxMOjMdIf8rxMMjjan7Wpb5Oa3GU0arsXOG8ZMXHj+x6bSp1deEjBitwXhnxtrbwn9jWdQqdbdTecpbjP16uza9ZnijWJS2pOXazb1uTeIhtUhxwR8/ApHz8DlQ269mwaL8p+5keZjtE+U/cyPM9HpfrhqZe8vBrHyT8TVpcTadZ+SfiarLiczXfN09D8XCXEyVtolS5pKoqiWTGyNu0lf4KHgU0mKuSdpbOqy2xV3qwz6M1nn+dE523Ryvb3MKnXJqO9rtNkB1Y0dKzvDmTr8lqzEiWElngjjU/Cl4HM4VfwpeBsz2alPlEvl+qfP1f1HkPXqnz9X9R5Dj3+T6Rp/qj/jvs6ro3VOa47SNx6TVVV0WE4vKaW80fON64o2a6ufSOjME370eJkx2/jMOfrcO+al4ay+Ij8S8QxH4l4mGO7qW6U2fTNC/K6RkTHaF+V0/AyJ2KfF861f3Wah03jhUJdpqJuXTdfybfxZppzdR9j2XpP+PAllpJ4yZWnoVSpTU1UWGsmKj8SNytni1p/pLYMcW33Y/U9XfTxHAwL0KrnfVRkNJ0upaXHWuaZ7HvbPVQRnjDES4GT1HNlrw2kupNtZ5HjvFtWVaa5I9N1+IdVeGNHuW+OC1vi1dP8AbX/rTXxeOwN70TtK0c79vf134Y2bBoegQ1O3nOUsHfqnRiFlYurGeWjJdDn/AIKaPf0i/Kahvxjjl8Ty99dmjV8vf9vm/iRlfFg0P9nqevD1fSOja/8ACUPB/wDJleS8TFdG/wAkoeD/AOTK8l4nYx/GHzvWffZrPTB/4aBpC5G79MPlYGjrkc7U/N670f6HKMduSitzbNjo9D7mvThUVeCTXBmu0vxoeKPqdj8nS/Si2DHF1fVdVkwbcMtS9ibn69M7bbofdW9eFV3EW4y4I3EG3yIiejz1vVs16zWXGnFwpxi3lpcTkQpnjts5Vp4p3Sfwy8D5TffPV/1s+rT+Fnym++er/rZpat6X0H5S6Dcuhf4czTTcuhf4czX0/wA4db1b6JbbzPFrH5Vc/oZ7eZ4dY/Krn9DOlf4y8Zpfuh8ufFjmHxByJ7vo1J2qzWkdHK+q286kK0YJdp7/AGHufr0zKdDPy6p+o2M38eGtq9XkdZ6nmx5ZrVplDoXc0q9Op18MRkm8G5QjswjFv4cbygz0xxVytTqsmomJtKgFMjUCdhR2En7ax0z+Th4mt9Gfz23Nk6Z/KQ8TW+jP57b+Jz8v3Q9Zo/8ABl9LKiFOhDylu4UhSUAAAAAAUhQAAAAAAUACAoAgKAIUAAAAO4AFEoAAABQIAUCAFAgKAOAOQA4g5EAgKAOIKAIAAHNGB6UfJUv1Ge7DA9KPkqXiZ9P9sNTWfTLDaJ8/E3bBpWifPxN1Mur+TB6f9ZghSYNN0p7gQAGsdI/maX6f+zD8WZnpH8zS/T/2YbmdvT/W8pq/ul22/wAxT/UbtH8NeCNJofMU/wBRu0V/LXgjT1jpel9pcnxAfEHPjs7UoHjm8Bb+B4r7UqVpB5xKXZ2F6Vm87KXyVpH8pd9evC3g5VHjC3LtNRvKyuLuU1zOV3e1bue1OW7kjzNYR1dPg4O7zms1fO/j+kbzkzHR5P0ifYYfGFgz+g20qe3UksJ8C2pmIjZTRVmckbM2Mgbs7zj/ALeo7bAMXeaurSt1bhvPP7Qx+mZYwWnq1Z1eOtpiU6Qf05MHjevue3Ub/wBNawsI8XZg62GJrXaXndVeL5JmHdar/F0/1G4w+BeBqFknK7p4WcSNvjuivA0dZPV1PTInhlZfCzSr756r4m6y+FmlX3z1XxOFrPjDd1Pxh0cv3M10f3zmYV71gyOlX0LOUttbn2Gnp7RW/VgxTtds1Z5o1MJ42TSavxy8TY62u0JUpQipb0a5N7Um1zM+pvW3ZfPMS4mzaB8uzWTadEpOna7UtyfArpYniRgj+TJni1X5GZ7N6PFqvyMzo5Znhlu3j+MtS5k/9F5k5/scSe7ly2vRfy+Bw1t/4M7NF/L4HXrfyZ1Z+lvz9cNXKuJCricpox3blYfKQ8D0Z3I81h8pDwPTyR3adodOnxYXpB+FDxNf5GwdIPwoeJr64HK1Pzlo5/k7bb5mHibnT+CPgaZbfMw8Tc6f4cfAz6PtLLp+zWtd+d/YxZlNe+d/YxZq5/m18nye/SPnYm2Gp6R87E2w3tJ8W3p/jKPgafqPz1Q3B8DT9R+eqDWdoV1HaHlMpofzaSMWeqxu/RKqnjJoYrRW28tTHbhtu3HnvZOTZgvaDK+Deemx1d3ddU3DidSueJ6N+MsSyo7PEDs8TYnqywwHSH/K8TDozHSH/K8TDo4up+1p2+Tkjknhr7HFHJbzS32mGejMXF3nTYLPFGJXD7HKVRumockcU9xfLfi2bdAj5+BSPn4GGO7br2Z/RflP3MnzMZovyn7mT5notL9cNPL3lj9Y+SfiarLibVrHyT8TVpcTma35unovi65G3aS/8FDwNRkZW11v0WiobOUimlyVpbq2tVjteu1Wz5x9wa5LpK0t1MzFheO9oqpjCOxTPW89HHy6W+Ou8vWcan4UvA5ZONT8KXgzLbswYvlD5fqnz9X9R5D16p8/V/UeQ49vk+j6f64/4mD30rnOnVaUny3I8PIcOBETsyXpFu4WPxLxIWPxLxEd02j+M7vpehfldLwMiY7Qvyul4GROxT4vnWq+6zVOm7/w9D7M07n+5uPTf5aj+o01/wDZztT83svSOunhYrEl4m3W7/w8PA1HaxLPYZWnrThTjHZ4InBkiu+7F6ppMmaI5fdmt/BM9dvx7TXFrbbXumw2U+spRmuaybMZIt2ea1GkyYK73hxufeq7lvOy/pThotfbjjaimjk6LnKc28YMlrz2ujy3Y9wm/wAVNN9lf+vl/JlD4SBzd9pe/j4w3jof8pMyHSL8pmY/oe8Wk8mQ6Rb9JqHS/wD4vFZOGNdt/wCvm74sB8WDm/t7afi+kdG/ySh4P/kyvJeJiujf5Jb+D/5Mq+C8Tr4vg+d6z75az0w+WgaOuRvHTD5aBo65HP1Hyeu9H+hzpfjQ8UfU7H5Ol+lHyyl+NDxR9Usfk6X6UZdK0fX+la7PRzxkGB1npA9LrqmoZyYz20f0jYtnisuLi9Oz5acVIbiF5mr6f0qd5eU6HV423g2hrDwnuMlLxaGvqNNkwzEXSfwy+yPlN989X/Wz6tP4ZeB8pvvnq36maurd70L5y6Dcuhf4czTTcuhf4czX0/zh1fVvoltvM8Or/lVz+h/8Hu5nh1f8quf0P/g6V/jLxml+6P8Ar5c+LHNB8WDjz3fRadI6N96GY9XVF/qNkw+zefO9H6RPS7Z0lDOZZMj7bNZ/lcToY80RXZ5LW+nZ8mWbVhuaBitC1X1rQnPZxsmVNms8UbuHlw2xXmtgpClmMC4IBcED9tY6Z/KQ8TW+jP59b+JsnTP5SHia30Z/PrfxOfl+6HrdH/gS+looRToQ8nbuhQCUAAAAFAAAAAAALgAAAAAGAAGBgkC4JgoDAAA7cDBQUWTAwUAQFAEwMFAQmCFAEBSAAAQAAAEZSEiAAJQFIEL2GB6U/JUvEz3YYHpT8lS/UZ9P9sNXW/TLDaJ8/E3U0rRPn4m6mXV/Jr+nfWAA03SnujAYA1npH83T/R/2YYzPSP5un+j/ALMMdvT/AFvKav7ZdtD5mn+pG7x/Dj4I0ih8zT/Ujd4/hx8Eaes/Tpel9pV8WA+Z1157FCUvsaFY32h1722rNmM1PV426dOnvkzXatWVWblUk22K03UrzlJ5eTr47jtYMNax1eY1OotlsZfFcixzKSjFNtnOlRncSUKccs2PT9KhbwU6qTkMueKdEYNPfNMPJpujNtVa3kZyEYRjswWEjnj7YBycmW15ejw6auGN6oP/AEBzRi7zDYntu1bWvzB+Bj9xndS0utc3bnBnj9R3P+k7GPLSKRDzGo0+S2SZiGNYx2npubOpaSSqnnbNmLcUdGlalqztLJ6PcUadVQmvefM2Xdy4Gl2zauINccm40XmlFvsObq4d30y/8Zhzl8LNKvvnqvibrL4WaVffPVfE4Ws7Q29T2jd5wOZ7bCwletpPBzq0m1toakVmZ6PH+5DNVNAnCEpKXAw9SOxJxfFF745rCb0mI6uVCcadVSmsxXI2+xuKdxQi6Swuw0zmjYejjexUNjS3/lszYJ2lmjx6r8jM9qSweLVvkJnRyzPDLcyfGWo8yc/2LzJz/Y4c93Lltmjfl0Dr1v5Q56L+XQOGt/KHVn6W/P1w1fkVcSFXE5Xhox3bjYfKQ8D0dh57D5SHgensO7j7Q6dPiwvSH8GH6jXv6TYekP4UP1Gvcjlan5y0c/yd1t8zDxNzp/hR8EaZbfMQ8Tcqf4UfBGfR9pZdP2a3r3zq8DFmU1751eBizVz/ADa+T5PdpPzkTbFxNT0n52JthvaT4tvT/GR8DT9R+eqG4PgafqPz1QjWz0hXUdoeUA9FpaTu6qhDZX7nOrG87NOI3ecyWifPQO32fuMb5xPXp+k1bS6jOUotGzjxXizPjx2ierMjs8QOzxOrHZvR2YDpD/leJh0ZjpF/leJh0cbU/a07/JyWW8I58N3M52sdutFdpyuKbp15I1Jr/HiZ6Osm9vCB6LWi61R45IpFd23V0Pdu5kfPwOc905Z5bjg+fgV7S269mwaL8p+5kVxMbozxafuZJcT0Wl+uGnl7y8GsfJPxNVlxNq1j5J+JqsviOXrvm6mhj+DhI4y4HKRkKGiV7qlGpCcUmauPHN52q6c5IxxvLES4G36B8ijFS6M3TW6UcGd020lZWyp1Gm/sdHS47Vnq0tdqKXptWXs3HGp+FLwZcHGp+FLwOnbs4mLfijd8w1T5+r+o8h69U+fq/qPJLng5Fvk+jaf6o/4A5ypOFOMpf1HD7cyvZmidwsfiXiQR+JeJMd4L9n0zQvyul4GRMdoX5XSMidinxfOdV91mqdN/lqP6jTXz8Tcum/y1H9Rpr5+Jzs/zex9I/wAaADGZbPPkZKnotacFJSjvXMxUpNuzfzaimGP5zsxq4o3bTd1rT/Qa4tErZ+NfsbLaU3St4wfFLBsYqzWerzvq2px5qxwS7evUIyWY7/M89/ezq2M4SlLZUXhcjlOg9qTx98nXfUJSs5tRaSg3k2L/ABcbT/ZX/rS3wZXw8CcsMrfDJzZnq+g1+LZej2tUtPt3Gqs5PVrHSO1u7GdKnF7TNQeG0034B71gyxmtw8Ln29NxTk5v7HxYG9kf75MX+zoW6VfSejf5Jb+D/wCTK8l4mL6PRcdGox4NIynJeJ18fxfOtX1zy1npj8tA0fkjeOmPy0DR+SOfqPk9d6P9DnS/Gh4o+p2PydL9KPllH8aHij6nY/J0v0oy6Vpeu/GrTumPz0fA1s2Tpj89HwNbNfP8nV9Nmfb1hkdA/Obb9R9NfFHzLQPzm2/UfTXxRuaWejz/AK59kJL4ZeB8qvvna36mfVZ/DLwPlN989W/UyuqZvQvnLoNy6F/hzNNNy6F/hz8TX0/zh1fVvoltvM8Or/lVz+h/8HuXE8Or/lVz+hnSv8ZeM0v3R/18ufFgPiN3FnGfRsfSAdniZfS+jlzqtB1aM4KKeN7Pd7FXm99bT+28yxjt02amXXYazNbSynQn5Kt4m0GH6PaTV0q3nCrKMnLumYOliiYrs8T6heuTPNqz0CkKZWkDsAXBA/bWOmfycPE1voz+e2/ibJ0z+Uh4mt9Gfz638Tn5Puh63R/4EvphQDoQ8pbuBAoVACAUEKgBcEKACAApGUAQuBgAACgQFBO4gKBuICgbjtwChlFkAAAAAAAEICgCAAAAABCkAAACYIciMJQAAOaMD0p+SpeJnuaMD0p+TpfqNjT/AGw1Nb9MsNonz8TdTStE+fibsZNX8mv6d9aAoNN057uLIcsDcShrHSP5un+j/swxmukefSqeX/R/2YU7en+t5TV/bLtofM0/1I3eP4a8EaRQ+Zp/qRu8X/LSxyRp6z9Ol6V+1fFnnvflpeB6HnflYPPffLS8DSx/KHUy/VLTGvfl4kaxliXxS8Qt+TuxHSHkb/JsOgU49TKWFntMw/MxOg46iW8y+PA5GeZm8vT6SKxig8WA14E5cDW22bkTuAD9iO4eQ/ZDBC2090TMdoYLpBvcUYRrDM30gw3HfvMHwzk7OmmeF5jWfa7KH40PE3Kh+BDwNNofjw8TcqH4MPA1tY3vTO0ucvhZpV989V8TdZfCzSr756r4nn9Z2h0NT8YefgzN9Ht1R/3MIZvo/wDiTNbT/ZDXw/Nnq34dTfxRpVx+PPxN1q/hz8DS7j8afibOqnozaiI2dXNGwdHPgqGAfFGf6OfBUNbTTvdiwfJnDxat8hM9h49V+RmdTL8Jb1/jLUeZOf7F5k5/scSe7ly2vRfy6Bw1tf4Q7NF/LoHHW/lDqz9Len64aqVcSFXFeJy/DSju3Kw+Uh4HoxwPPp/ysPA9K4I7mPtDp0+LCdIPwofqNe5I2HpB+FDxNfXBHK1Pzlo5/k7bb5iHiblT/Cj4Gm23zMPE3Kn+HHwM+j7Sy6fs1vXvnV4GLMprvzpizUzfNgyfJ7tJ+dibaanpHzsTbDf0vxbWn7Sj4Gn6j89UNwfA0/UfnqhXW9oRqe0PKZTQvm08LJizKaFn0tbjSw7cbVxzHE2fHbjeT9kx+wO3vEQ6m8QZL2eJOI7PEbzJuwPSL/K8TDIzPSL/ACvEwyOLqfsaV/k9Vj81T8T36xQ2Km2luPDY/NQ7cmd1Oj1to5c0MdOPDLPRrp79Pn1Um3zR4YJuajjeZyrZ7NhGcPiSMeDHxby2qsLWf82fY2cXz8Cyfvsj4/satul5htV7M9ou+1/cyS4mK0eezQa+5lFwR6HTfXDUyd5eHWPkn4mrS+Jm06x8m/E1aXxHL13zdXQ/B1yNu0n5KC3LcajI23Svk4Z7C2htteVtfG+OHux4F355YJu+w3fY7UTDi8O3dThU/Cl4HM41PwpeBFpmYXpvxQ+X6p8/V/UePk+1ns1P5+r+o8nZ4HIt8n0XB9Mf8ZipbqposK2N0OLMNx3m3aXb+k9HqkMZ4M1Ocdmcl2SaJvXaIlg0uXjtavhBH4l4gL4l4mOO8Ny/Z9M0L8rpGRMboX5XSMidinxh861X3War03+Wo+Jpr35Ny6bfL0fE03n+xz8/zey9H/xoVb2u3Jttv+BDOOBqUfiXgbbb/LU/0oyaWY6tH1nfaHNceSPXS3QZ5F8XI9lNe5jBs7vNRFo7uHWyllckj1XtynpVSgoL3qbe0eWaUFPluJdVF6DOX/8AW/8Agrf4s+n+2v8A1ov9P3Lz+5GPv9jmz3e+j4vXGwrSs5XK96CZ5Tb9Et43PR+tFx34yalUpunOUHuabMlqbRu1dPqOZe1PDiuOOD7TY9H6NVLpQr1ZJ0nvwa4t7Ru3RC86y0nRk/eg9xOCI4urB6pkviwzajY6FGFCnGnD4Yo7F8K8SLci8l4nVh4Xim08Vu7WemHy0DR1wRvHTD5aBo64I5mo+T23o/0OdL8WHij6nYfJ0v0o+WUvxoeKPqlgn6HS3r4UZdM0vXesVab0xf8Ajo+BrZsnTHPp0fA1swZ/m6vpv0VZHQPzm2/UfTXxR8y0D85tv1H018UbWl7PP+u/bCT+GXgfKb756t+pn1WfwSPld/8APVv1MjVM3oXzl5zcehf4c/E043HoX+HPxNfB8nV9W+iW3LieHV/yq5/Qz3LieHV/yq5/QzpX+EvG6X7o/wCvlz4sDmyYzyOP2l9EpH/z6y37obv02plR+LmbJvfN7jXOhv5dPh8RsePszq4tuF4L1CP/ANEn3ecgcPt4jHaZd5/TQmu0hUCokTAXBFHYQj9tX6Z/KQ8Wa30Z/P7fxNl6Z/KU/FmtdGfz638TQyfdD1uj/wACX00AG/Dylu4UhSUBSFAAAAAXAEGCgAAAgBQAAASAAAAAAAA7gAVSYGAAGBgABgjKGBAMDAAAACFIAAAAhSACFAEwQ5HEBzRgelPydL9RnuaMD0p+TpfqM+n+2GprfplhtE+fibsaTonz8TdjLq/k1/T/AKwAGm6X7TmkY3V7ypZ0VKC3tmSf2ML0i+Wjv5mbBXe3Vraq00xTMMDd3VS8mp1OKWEecbvAHbrG0bQ8ra02neXKMnCSljOHkzNhqtatcRpy4GFW94PbpS/x8UYs9Imm8tnSZJrfbdt/Fbzz33ysvA9HBHnvvlZeBxqdbvSZfqnZpjWZS8SNY4CXxS8SPed+u/C8neJ4nrt7+rax2ae7J3eubn7GO/cY8DHOKtp6wyUz3r2lkXrVylv/ALGd0uvUuLVVKnE1NP3orkbfp9LqrOCaw+Jo6uladnT0GTLe3Wej1Hk1CrOhbOpBcD1nnvYdZazi+aNKny2dfNMxSZhrvru444Hru4+x4ZLZlKPYzj+yOzGCu0dHmLanJEzG7uubypdvNTidO9rfxGcCL3mWtNukNe1rWneXOh8xBfc3Kh+DDwNSsoOrdw2VnDNvitmKXYjnay0dnb9LrMdZV/CzSr/56r4m6S+Fml33z1XxODq+ze1PZ0LG9M9dlfysW3GKbfaePiXOeJz6W4erSrbbqy8ukFacHHYjlmJnNzm5NYb5HHj2DJa2Wbd1pvNl5oz/AEc+Gqa+bLoFF07aUpLGTLponj3ZMEfyZfB49V+RmezkdF9TdW0nFLLwdPJ1rLfv1rLS/wCoi38OJyqxcKji1jBx5HFtG1nLmNpZOz1eta0VSjCOF2kvNXqXdPYlGKRjdz5by+GEW5s7bJ5k9kKuKBacXOpFJZbZWsbyrEby3HT91pDwPSuB02sHC3gn2HcdrH0o6telGF6Q/gx8TXv/AEbB0h/Bj4mvr/o5ep+ctDN8nKlNwqKa34MrHX60Uo9Wt3Mw+NxcLBipkmsdGOt5js9F5dyu6u3PceYYHPBWZ4pVm28vfpHzsTbFvSNX0SlKd3tY3LmbRw3dh1NLG1N29gjao+DNO1H56obi+DNO1H56oU1c9IRqJ6Q8p3W1zO2ntU+J0j9znRO3VpdmS9d3G7cv3L66uHLG4xn7eZzpLaqJYXEy1zXmdmSMlt9m32NSdW2jKa958z08/wBzrow2KUUnwOx9p2Mc/wAerpV7dWB6Q/5XiYVGa6Q/5XiYVHH1Pz3ad/k9dhuvKfibTUht0ZRfDBq1iv8AFw8Ta4N7PibGkjirMNijXrW22tRUWtye8z1WKjQcexHXC2ULqdRLc1uO2t+HPwM9MUUrLPEtVqbqk8dp1834HZV31J+J1vh+xwsm3MblJnZk9MlUik+MTK0LuNRuLTWDw6bD/CbSXM75SlTp7Ucfc9BpZ3xw1Mvyk1f5N43mrPjxybLqW+xjOEs5W9Gttb9y+5zNbP8APZ1dH8XXI9dLVq9vTUI7OEeVrJ1vsWDUx5JpPR0+VF46sg9euU+C3np0vVrm7vY05YxxZgW/Dd9jMdGqObrrN3DDN3Dmve2zFqMGOmGZ2bZ/T9zjU/Cl4HI41Pwp+B2Z6Vecx/OHy/U/n6v6jx9ngezVN1/V8Tyf+jkWj+T6LgmeTG3hvfRaO3pcoLjJGo6rb+jahWp4wk8m4dElix+6ML0vtuqvFVxjrGbN6xNIlxNJl4NZbHP7a4F8S8QWPxLxNOO70Fuz6XoX5XSMiY7Q92l0jI4wdfHP8XzvV/fZqnTdfyLf7s07gbf03l7lujT+Lwc/UfJ7H0j/AB4gTw8vee2Oq14xSWGlwyeJZ5IeGDDFpp2dC+Ct42vG73eta/NJ/uZfRL6rdVGqvwo1r9kbH0fpf4WU1uZnxXtNurk+o6fBjwzMR1Zi4wlUxvPNe5Wkyktz2cM7Y5i31nM4akv/ABkscMG1af4y8xpuuSuzS3/0OGWg+AfBnNmf5Pf134Y/43voktrTJxfB7jV9ftna6nVbWE/hNp6Ifl0sHi6Y2axC4xuXFm7akcvd5vTZuXrrUn9tQXw4M10Zu1bajFN4jNNNfcwp2UKjpV4TT3xeTVx24Zd/UY+bjmH1lLax4ZC3xXieXT7j0qwpVs8sHq4M61J3ru+eZaTTJMNZ6Y/KRNI8D6B0qt5VdMcorLT3nz9bk3+xz9RvxPY+jXjkbR3VPEk0stGbo9K7yhTjBQTx2mC/cr8TDW81dTLpseb5Ru9mo6lV1OqqlVRTR4yeRclZtv3ZMeOtI2rDI6B+c236j6a+KPmWgb9atv1H03jvN/S9nkvXeuWEl8Ej5Vf/AD9b9TPqsvgl4ZPlV/8AP1v1MjVMnoXyl5zcuhf4c/E003HoV+HPxNfT/J1/Vt/by25cTxax+VXP6Ge37ni1j8quf/rZ0bT/ABl4zTb86r5a+LHIN72Ecie76LSK8LJafrd1p1F06MdzeT1+1d/2LzMFhPjkc8bi0ZLRHRr20WG87zDZbDpJf3N5Tp7KaclnwN8j8Kb+24+b9FqHXaxTT4JN7j6StySW7l+5v6e0zHV5T1imLHkilYEUIpsuKgXBFIuCInsftrHTP5SHizWujP59b+JsvTP5SBrXRn8+t/E0cn2w9Xo/8GX04AG/Dytu4AUlCFAwBcDAADBSFAAAAAAAAAAoAgKAICgAAAO4AFUoCgCAoAgKAIAADIUYAhDlgjAgKAIAAIABuBxORMDdEnYYDpT8lS8TP80YDpT8nS8TPpp/+kS1tb9MsNonz8DdjStDX+PibsZdX8mt6f8ABAAaW7p/+o/txMfqtlUvaUYxfAyPMmN5atprO8MeTHF6cMtY9nq49nq5s7RDY91dpR6biaz7PV+077LRqtvcqpJ7kZ4pFtRa0bStXQYqzvCJbjquKbrUXBcWsHbwJyNeJ2neG7NYmvC1qWg128rmx6grmyjBs+6vs0Z9OxTO7WvZ+v8AYez9c2XAwT7q6v43E1uGg1YzUpPgzYacdimodiOQZhyZbX7trDp64uyEklOLi+ZSMxxO3VnmImNpa9V0OrOtOUXubOHqKv2myA2o1N4jZo20GO07y1v1BXfM5x0Co37z3Gwgj3N0R6fiid3is9Op2iW7Mj2scAYJvNp3luUx1pG1UfAwNxoc61apUT4sz5OWDDekXjqXxxaGuvo9U7R7PVO02IGL29FORVrns9U7S+z8+czYgPbUORVhKGgQhNOcs/YzFOnGlBQgsYOWBxeTJTHWjJXHFZUjWVh8CgydP2v0Yu80Wncy24ywzwvo/PO6W42ImDBOCkzuwzhrM7te9n594ez9TvGw4KR7aiORRri6Py5zPfZ6PSt5bbe0zKELVwVhMYawblhLghyyUcsGadttmWY6MfqdjK9hGMXjDyYv2fqLHvGyEwYrYa2neWO2Ktp3lr3s/U7w9n6neNiIyntqK8irXvZ+p2nOn0fzL357jPARp6QcirzWtnTs47MFlrmelb0+1hFM9axWNoZYrERtCNNJ/cwVzok69eU0+JniMrfHF4iJRekWiIa57P1O8X2fqd42EGL21GPkVa97P1F/Udtvoc6VZSbyjODeTGnrEkYaxKJYRf8A0AbGzN0Y7U9PnfbGHjB4fUU+0z+AYLYK2neWOccTO7C2+kTo14zb4GZS3JF4AtTHFOy8RsYONSLlTaXM5AvtvG0rbsJPRpynJ54nTc6VVpQ21vSW82F9pGlKLi+ElvRqzpMczuyRkmHg0jZjbOD4vecqkHCTytx5lGVjdNZxCW+P2MjPFegprfjc0ZqRFOkFv5RuxdWjOUurz7k/7Hmq6M6fGe4yko5TizhNZay3hIi+CuSd5KZrY46MTDSFV92M9lrhk4VNEqJ4fmZXZUpZa4czk5yl7spZREaHGyx6hkhiY6BUqx3ySZltJ0x6empPOTilOm8wl+x7aFxtLFTCZeumrSd4Vvrb3rwy9BxnHahJdqOSeeA4ozTG/drxaekw1C76J1bi5nUUt0jq9ja2Wto3Uc8mvya7upX1TNSIissXo2nT022dOTyzhrujvVIRSfvJbjLAycuNtmnGpyRl5v7aV7G1u8PY6smntbjdiGPkV7t78rn7bvLp9tKzs4Upb8HqzveeSD4HTd1eotqlTtWEZe0bOZa03tNp/bVOkUHqFwlGW6JiFotRxTUjM76m0+fE741dmgoKOH2mG2OLTu6OHXZcNIrVgvUckvemRaHmSjCW98zaaMKNShmo1klS1oT30nvXNFJw1Z/yudq8tBqRnsykZywtXZ2qh2nKqtmrjLO/e6ce0tXHETvDBn12TNXazouU1Jfct7BzsI01xksC8WJR8DurR25UIrsTMlo3jZpUtNOtWAXRmriEU98nk9a6G1ucuJsdoutvXL+imsYMlveM8jHGGs93Qn1XPEbRLGaJpstOtpUpPizt1ax9Y2UqPNHu4veP+zNwRts0J1F5ycz9tLfQ2tndIj6G1u8bqCnIq3vy2ftv0Y/SLKpYWiozlnBkAtwMsRt2c2+SbzMy4VacKtNwqLMZbma3e9D6FWq50Z4zyNoIRalbMun1WTTx/CWlvobWz8Q9ja3eN1BinBVvfl9R+paV7G1u8PY2t3jdQORU/L6jy1TTui1Szv6VeUt0Hk2xe80CcDJSkVho6nU3zzE2JLajhf1LBp9z0Rq17mpUUvilk3HkvsUWxxbutp9VfBMzVpHsZW7xndB0aelxak+JmgVpirWd4Zs3qGXNXhsYT/c817Q9JsqlLnOLR6cb8js+xlmN4mGjS81ndpPsXVf9Q9i63fN3Bg5FXT/LZ46Q0j2Krd8exdbf7xu5ck8iqfy+dr2g9H5aXc9bUeXwNi7fHJEUy0rFY2c/PqL57cVu4UhSzABLcgOwifCY7tY6Z/KQ8TWejH5/b+Js3TP5SHiaz0Y/P7fxNHJ9kPVaP/Bl9OABvw8rbuoAQQIoKBAUIBguCFAgKQACgCAoAAAAAAAAAAqAHcQoISgLgYAgLgYAgAIEBQBAUhIBgBCYBSACFAEABCUBSAOwwPSiLdlTaW5PeZ58jw6tbek2NSKWWluMuCdrtfUUm2K0NR0efV6hBN4yb1yPnUdq3r5eVKLN40q+he28cSW1FYaNvV0m38oc/wBPyxXesvZxA5A57rx2AAEjIVkAmAVkAgKQCApAAAAEKQCYBSPiBAUEiAAAACAAAAhSAAAAAAAAAAAAAAAAAAAAABIEZQEJgYKCEoigEoTIZAALghyAmAUATAwUATAwUATAwUECYIciMCDjxAA819b9fQePijvR5dOud7jLwaZlOSXazB3z6i/xDciloZaz+mQu11MozSzFnXOrTqU9qON3E76U4XVsoS3s8kbONOrs725vBFbbJtSJhIxc8qG/HE6q1SdH/KZ7qFvOxruD3xms5PU4qSw0mjPxNfgiJYKN5Fv3o4O/rIy+Hf8AfsO2+sYuUalNbMVukYyrGpZVcKW1CT2kIsngZajXlBpPge7KaTXBmIpzVWmpRe899tVwtmT8C09lO0vTwA5b+JcGOV4QFwMBKAuCMJDEajcQuYwpQqbs7zJ1vwZ+BrEI4rrK5lJWrDlO3VJvZlk4bsFm3tPlvODedxC6xbeVncemz93O0+Z5YLalhnqjmEorHuy5kSF7TdO7cc71xwdkF8J5pVJVZpye/tPVBcCIJdV3FOtE74x/xEf9MGddziNSL+52U5wTnJ8cYJkhkNOp7NGUuc97PadNskreOO6dpeGOygAsqAAAAAGAUgAAqAgwXBQIMFAAAAAASlQAAAKEIXAKARSFQEKMFSAg/wCi4OFWrChSlUlJRS7SJnZatbXnhhq3TWtFUaVNP3nl4MD0Xpuet0JclxOPSHUfTr+ey8xjwMz0K0+W1O4qLd/Sc+P55HrNo0+i4Ld5bmUYCOjDyU9zBUgAhQAAAKAAAAAACkKgGBgoAiKAAI0UATAwUARAoA7QUFUoAAAAAEKAAAJgQAAAABA0UgEABAEKRgCFIADSaafBgZQiduqJ6xs1PXtLlSqO4pLKfFIxNne1bKrtU5NdqPoEqcZxcZxTi+01/UejinmpbbpPkdHDni0cNnI1GltWeLG7LXpJQnBKv7sv+T1rXbJvCmalW025ofHSbxzR5+qqJ/hyX7F50+O3XdijW5qdLQ3hatav+svra175pHV1u7PyHV1u7PyHtcflPv8AJ4bt62te+T1ra99Gk9XW7k/IdXW7k/Ij2uPyn3+Tw3b1ra99D1ra99Gk9XW7k/IdXV7k/Ie0x+T3+Tw3b1ra99E9a2vfRpXV1e5PyL1dXuT8h7XH5Pf5PDdPWlt30PWlt30aV1dbuT8h1dbuT8h7XH5Pf5PDdPWlr30PWlt30aX1dbuT8hsVe5PyHtcfk9/k8N09aW3fRPWlt30aZ1dbuT8h1dbuz8h7XH5Pf5PDc/Wlt30PWlt30aZ1dbuz8h1dbuz8h7XH5Pf5PDc/Wdt30PWdt30aZ1dbuz8h1dbuz8h7XH5Pf5PDc/Wdr30T1nbd9Gm9XV7s/IbFXuz8h7XH5Pf5PDcvWdt3x6ztu+absVe5PyGxV7svIe1x+T3+Tw3H1nbd8es7bvmnbFXuz8hsVe5PyHtcfk9/k8Nx9Z23fHrO275p2xV7s/IbFXuy8h7XH5Pf5PDcfWdt3x6ztu+adsVe7LyGxV7s/Ie1x+T3+Tw3H1nbd8es7bvmnbFbuT8hsVu5PyHtcfk9/k8Nx9Z23fHrO275p2xV7s/IbFXuy8h7XH5Pf5PDcfWdt3x6ztu+adsVe7LyGxV7svIe1x+T3+Tw3H1lbP8AzBHUbectlT3mmyjUUW2pJL7Hbat+kwSYnSU23iU19QvNoiYbwsNJrmG8bzjT/Ch+lHKXwvwOXf8AjMxDtY9rzvLwVdYtKNRwnUSaOHr2x+ojQ9cbWqVcN4yeGMas8bClLwNS2ed9oeow+kY7Y4vMvpXr6x+oh6+sfqI+bdVX+nU8h1df6dTyI59/CfxOH+z6T6+sfqIevrH6iPm3V1/p1PIdXX+nU8hz7+D8Rg/s+k+vrH6iHr6x+oj5t1Vf6dTyHV1+5U8hz7+E/iMH9n0n19Y/UQ9fWP1EfNurr9yp5Dq6/cqeQ59/B+Iwf2fSfXtj9RD17Y/UR826qv8ATqeQ6qv9Op5Dn38H4jB/Z9J9e2P1EPX1j9RHzbqq/wBOp5Dqq/06nkOffwfiMH9n0n17Y/VSHr2x+sfNnSr/AE6nkTqq/wBOp5Dn38H4jB/Z9K9e2P1UPXtj9Y+bdVX+nU8iOlX+nU8hz7+D8Rg/s+levbH6w9e2P1UfNeqr/TqeQ6mv3KnkOffwfiMH9n0r17Y/WHr2x+sfNepr/TqeQ6qv9Op5Dn38H4jB/Z9K9e2P1h69sfqpnzXqa/06nkVUq/cn5Ec+/g/EYP7PpPr2x+oh69sfqI+bdVX7k/IdXX+nU8hz7+EfiMH9n0l69ZLeqiMfql/ZV0qlOqto0bqq/wBOp5Dqa/cqeQnPfwmPSMEf7Nysdct6MknPBk3rtltKpGotpcj511NZf5c/I4qFV8IyK86/hk/F4P7PolTpFb16kHOolss7vXtg+NVHzaVOuv8ALm/2ChW+nPyL8+/hjn0jB/Z9EudesFQmtva2ljBgZ6nRqyTc24rgnyNadKvj8Ofhg4OnVUvhmvtgjn38Jj0nB/Ztlrq1CjPfPcz3rWLSLUusNFdKtjLpzx4BQqNfDJlvcX8K29HwT/s+kw16ylBN1Vkvr2x+qj5rsVVxjNfsXqq7WVCo14Ee4v4Pw+D+z6T69sfqIevbH6qPm3VXHcqeQ6q47lTyHPv4T+Iwf2fSfXtj9VD17Y/UR836qv3KnkOquO5U8hz7+EfiMH9n0eet2M4Sj1i3o1+V/bx2ZKplpmr9VX7lTyJ1VV7SUJ7lngROe/haPScMf7NknqNGUm3I4+n0O+a71dTZ2tiWO3BHCa5MjnX8J/FYf7Nl9PoJrEjI0NWsvRKka0lKX9OeRpKhUf8ATJ+BZUK6W+nNdjwOdfwfisP9mzxvreMlmpwPbHVLNUl762u00rYqNt7EvIvV1e5LyHOt4PxOH+zba+oW06qaq7ivULZqWavE1FU6je+Msjq6vdl5Dm38H4nD/Z9Ft9asoW9NOqs4wdvryx+oj5v1VdY9ye77BUq7XwVPItz7+FZ9Iwf2fSPXtl9RD17Y/UR836mv3KnkTqrjuVPIc+/g/EYP7PpPr2x+oh69sfqI+b9Tcdyp5DqbjuVPIc+/g/EYP7PpHr2x+oh69sfqI+b9VX7lTyHU3Hcn5Dn38H4jB/Z9I9e2P1EPXtj9VHzfqbjuT8h1Nx3J+Q59/B+Iwf2fSPXtj9RFWu2P1UfNequO5U8h1VfuVPIc+/g/EYP7Ppfr2x+qh69sfqo+a9VX7lTyHU3HcqeQ59/B+Iwf2fSvXtj9RD17Y/UR816m47lTyHVXH06nkOffwfiMH9n0r17Y/UQ9fWP1EfNequPp1PIdVcfTqeQ59/B+Iwf2fSvXtj9RD17Y/VR816q4+nU8h1Nx3KnkTz7+D8Rg/s+lLXbH6qL69sfqo+adTcdyp5DqbjuVPIc+/g/EYP7Ppfr2x+qh69sfqo+adTcdyp5Dqq64wqeQ59/B+Iwf2fS/Xth9Yvr6w+sfM+qr9yfkTqq/cn5Dn38H4jB/Z9N9fWH1i+vrD6x8x6qv3J+Reqr9yfkOffwfiMH9n031/YfVRwl0l06D96r5HzXq6/05+ROpr5/DqfsROe/gj0jBH+z6NU6V6fGD2ZtvwZrGsdI6+oOUIZhTfHBibWzuKzajTn++4zmndE7i4nm692n9mY5vkv0WrptNpZ45ndidM0urqVzGEE8Z3s+lWFlCxtYUYpLZW/BxsNNoadSjGjBZXM9eN+c8Tbw4uHrLja/XTqLcMdlAKZ3MCFGAAKAhCgJEgC4GAlAXAwARSJFCAAAAVACAoAgAAAADtByIyq2yAAIAVFwBxAAAAAQFBO6dkBSDc2CFBCEGCgCYI0UjAmBgoAmCYORAnZAAEf8AHGUYy4xT8UcOpo9yHkdoyWi1o/as0ie8OrqqXdh5DqaXdh5HYyDjt5OCvh19TS7sPIdTT7sPI7AOO3k4K+HV1NPuw8h1NPuw8jtyTI47eTgr4dXVU+7DyHVU+7DyO0Djt5OCvh1dVT7sPIdVT7sPI7Bj7ceY47eUcFfDr6qn3YeROppd2HkJV6Kk119NY7ZI5pqb4rZfBxHHbynl18OHVU1/TDyI6VPHww8jsA47eUcFfDq6qn3YeQ6qn3YeRynUhB4qVI0392I1IVE9icZY7rHHbyngr4ceqp92HkOqp92Hkdj4LD3dpxnUjBbU5RinuWXgcdvJwV8OPVU+7DyHVU+7DyOUakZ56ucZduHnAnUjTWZSik+DbHHbycFfDj1VPuw8iOlSz8MPI5QqwqSxCpGeN72WJTjFbUnsrtbHHbycFfDh1VLuw8i9VT7sPIRrU6knGFWEmuSeWcxx28o4K+HX1VLuw8h1VLuQ8jtz7vFbuLOv0iis5qw/3ITe0ftMUr4TqqXch5F6qn3YeRFcUPr08/qRY1IzeIVIS7cMcdvJwV8HVU+7DyHVU+7DyOfDsOMpwgvemov/AFMcdvJwV8OPVUu5DyHVUu5DyCr0uVWD8JI7MvHFNPsHHbycFfDr6ql3YeQ6ql3YeRzy0XI47eUcFfDGavTprT6rUY7lyRq9p81F/c2vWfy2r4GqWnzMPE6Wm6453cbWREZo2bvT/Dj4I5S+CXgSn+HHwRyfwvwOZb5TLt4v0+X67+Z1fE2rohSpz0vM4QlLPNGra9+aVfE23oZu0vP3NDHtOSd3r9baa6OuzO+j0fpU/Iej0vpU/I7cDBucEPK82/l1ej0vpU/Iej0vpU/I7JNRXvYjHvNnBV6Ut0KtOXZhjhg5uTyno9L6VPyHo9D6VPyOxY4cyjhhHNyeXV6PQ+lT8h6PQ+lT8jtyuZ19fS2sddTz2OSHDCebk8p6PS+lT8h6PS+lT8jszlbS3p8AsZ35xgcMI5uTy6/R6X0qfkPR6X0qfkPSKKW+tTTzzki9fRf+dT/3IcMJ5uTyno9L6VPyHo9L6VPyOxNS3qSkvsNz35wkOGETlyR+3X6PS+lT8h6PS+lT8iuvRUsOrT/3InX0XuVel/uQ4YTzMnk9HpfSp+Q9HpfSp+RzUlJZjhr7HLct+/hvy+BPDCObk8ur0el9Kn5D0el9Kn5FVeju/m088MbSOe7a4PD+5HDCebk8ur0el9On5F9Ho/Sp+RylWpReJVIRfY5I5JprMXtLtTHDCObk8uv0ej9Kn5D0el9Kn5HOdWnTlszqRg/9TEZwmtqE4yS7o4YTzcnlw9HpfSp+RPR6XKlT8jt3Yz+5wdxR3/zqafZtIcMHNyeXF21HKzSp/fcYm5tadndbapwdOW/hzM3lct6a4nVXoK5t3TcctLKImsbJjNffu88KdGvS3U6ecdh0dRSpz3wh5HntLyNtcSpVKscxeHmSPdVq0ZR21Wp+CkitYjfqvfJfbpLup07eUc7FPPgdc7ezU1KcKbaeeB5usTjmMm1nkznVhCnS6yc1s4M/BWWvObJ5cqvo84yiqVNJ/Yw7t42dbacIuDfYem3rus251obP9MYved8rd3MYxlJvHJFeCq8Zrx3ljrqVKrNbEYL9jIaQ6c04VIQ3fY8F4o06uwobOOZ36dUhsvZqLa7MkRWq85b7d2c9Ho/Spv8AYno9H6VPyJSuaezHrJqDXHL4nP0mi1nr6XHvITWIUjLk8p1FH6VPyHo9H6VPyL6RR+tT/wByOUKkKiexOM9lrKjIjaJTzcnl1+jUMPNKGMdh00bW3padcTnThtNbtx6K9alTUlKrGH2k955tTuKNLSYxhWptz4+8isxDJGS/ljqlOgtHi4xhly7DFqnDnGGc9h6I1UrbYdaDp8lk6s8+JG0J5l/L3aTawqXCcoQa8DKa/G2o0Ka6mO/sRw0OlnZkdHSSs53EYLhFDaDmX8sLCnTUm4wil90e1U6exnZh5HjpSi5rMorxZ741KclsRqRb8ckbQnmX8upUqbk3sQ8j0W1GnOtGPVw49h1JqMm8rHPJ69NnTncJqpB8eDERBOW/lknbUUn/ACqfkcvR6P0qfkdm/HLPNHB1qMXiVaCfZtIyRWGGcuTy4u3o/Sp+Q9HpfSp+R252llYx2nW61JcasF4vBPDCObk8uPo9H6VPyL6PR+lT8jlGrSk8qrBrHCLOTlGMdptRjjjJjhg5uTy6+oo/Sp+RfR6P0qfkPSKCx/PpvP8AqRfSKP16X+5DhhPNyeU9Ho/Sp+Q9Ho/Sp+RyVenN7MKsJSfBRkslnUjT3znGGe8xwwc3J5dfo9L6VPyHo9HnSp+RfSKPOvT/ANyHpNH61P8A3IbQc3J5PR6H0qfkX0eh9Kn5HJSUo7pJ/dHHr6UXh1qaf3khwwjm5PJ6PR+lT8h6PS+lT8h6RQ4OvT/aSOSrUpS2YVIyf2khwwnm5PLj6PR+lT8h6PS+lT8jsbjFOU3sxXNs406lOo/cqQkv9LyNoObk8uPo9H6VPyL6NR+lT8jtSTz9iNqKzJ7Pi9w4YObk8uv0ejzpU/Ino9D6VPyOcatOb2I1YSl2ReTn9hwwc3J5dfo1H6VPyHo1L6UP2ijtA4YRzcnl1ejUvpx/2o5ejUvpR/2o5gcMJ5uTy4ejUvpR/wBqHo1L6Uf9qOzAwOGDm5PLh6NS+nH/AGojtaL3unDd/pR24ReA4YRzL+XXGjRisxpwX7HNYSxwKUmIiOyszM95cU+RSgnrKoAAkAKABUAIVDARKFAASAAAUAIQFAAAoEAASgKQCgIAdwAKpQFAJAAEOIOWCNAQFIEwApAAAAgKASgACAjRQBxwCkCYCFAEIUAQAARoYKAJgjRyIyBCFIAAD3oCZPFq97DTtOrXFTcorHHme7c3jsR89/iLrCjCnZ0pZ5yiiCIaPd6jd3NzUrKrVittvdJ4wfUOg2sesdIp0Zy2q1Pjk1bQ+jlO46M3NWrKmqlSOYty3o8HQ3VHpmtqnKSjTqvZkwts+wPj4klJQjtS4CElJRkt8cGF6VanHS9Iqz2sVJL3Sd1Yh866Y61Wv9YlC2q1FCm8NRZk/wCH+tTpX8rS5rSlt/BtPJjOiOnQ1bWZVq2zs5e1tPieTUqb0HpG3TxiNTKUXwRXdfZ9qTzFPcs8DSf4lVJ0dLtXTnOLdTfsywbVpV5G/wBPo1otS3YyuRqf8Tvyq1/+wtKn7ax0T6R1tN1CFKvVlKhPi5PODcenFzt6BTq282oS4OLPmFvYV7ihOrRTcafvSwZOXSCpX0T0Cvn3JNxzyRC+zNfw6r1aur1lUrVJrq9ycmbP08qThomacpU25cYs1b+Gi/8ANVv/AK2bP09/JF+ohWe7V/4d16tTXpqpVnNbEvilnkfUT5V/Dj8/n/8AW/8Ag+rYJiSYeXUG1p9fl7j4HxOrWua2odVTuKqlKeF77PtuoL/AV/0P/g+HTqTo6l1lJ4nGeY+ImUxDYl0Q12UVJTrb1nO0zZeiGi6lptebvJTkm9208muR6W9Jse7KW7clsG7dE9Qv9SsZ1dQzGonuWOIJh7Nb1ejpFjOvUxnkj5fc63q+u3UqdCU3F8FHkbD/ABKq1E6FOK9xrL8Tt/hvb0XRr12k6nDHYBrUtN6Q6bB1pdZjGfibN36F3mpXdm3fJ7PLKM1rWo0tK02dxWgqqjuaa4Hg6PdJLfWXOFCkqajySCGf5bwMe80VLcWVY7Wfy6r4GqWnzMPE2zWfy2r4Gp2fzMPE6ml+uXE1v3Q3in+HHwRyfwvwJT/Dh4Isvhfgcy/eXaxfp8w1781q+JtvQ38q/c1LXvzWr4m29Dfyr9zQxfY9br/8OrYyJ5Q4JnG4qwoUp1am6MFlm7LyezTOn+su3toWlGbjVl2M0jR9VuLDUqNSdap1ba2lJnfqty9d6Q7Laazsxbf3Mh0w0Snp1G0q09jMaajLZecsruu+oW1eNzbwqxaw4p5O5b0aj0D1b03Teom05QXw+BtuMqX9i0SrMMX0h1GOm6TVqvjJNLHHJ8blqN3Kt13XVH7zeFJ4Nu/iFq3pFxGzpZezh4zzOuj0cpy6J1KzlTjWbVRb9+4iZTENy6KamtS0mm3LM6e6RlbzKsq3bstpnzPoHqvoWou2qS9ypwPpt5vsKyTzmDwN+ht1fE7uvcz1GcI3FX3p4S2mZat0c16yo9dGdXCWd8mzEVKkaesqcvhjU3+Z9MvOmekLTqkadzGpOUMJNPsIS1fov0su6N/G3vJuUJPG9cD6TcyzZ1Gt2YOW7wPi2nUp6lrUHRWc1Np7PJZPs9ZJWElv/Bx/YlWXxF1rutdunTq1ZSk8JKbMq+jvSGjT6zZqxWNrLm3uMdYP/wA1T4v+Zy8T7fRjm2pRlwlFLD353ELy+WaF0tvdNvVQvJSnTzjD4n0+nVhd2nWQy1UjxyfKOm9Clb69N00o47p9B6G1Z1ej1CVXjvW8Ky+b627nTNfnFV6mzGaljaeMH1TTb+FxotK4/pUN7z9jSf4jaa6VWF3COXLc8Hm0zX40OitxZ7Xv8iUwwetarcXWqV50684RUmopSZ9J6F6gr3RYSk5OcXh5Z82sNHqajZ3V0k/5ccrxMv0Q1paZSu41JY9zEV9yNyYcemmqVbnW3ToVJxjF4ajI+gdG7adpo1HbbnKUFJts+Y6VRnq3SZTa2lKq2/A+xwpqlSjTW6Md37ExKJYfpRqcNM0mo9pqdT3YvsZ8ijqF518a/XVeL3uTwbR0/wBWV3qEbWlLNODy19+Aq9HKa6HqqurdRe/8W/AmSIbv0Z1FanpFOo5ZlFYkZdJvP3+58z/h/rCtr2VpVl7k1iOT6dHKwmTv0RMPifSCrW9f3ahUnhVZLCk+09VLQdZrW8a1GVVxxndJnj15pdIbtvgqzz5m3ab0m07T7anBXClsx4b+JjmGSOzXdL1+/wBOvo0K8nhvZlGXI364qqrpFaay4um2n2M+Y3lV6nrMqtGGetnwjyPpPo8rPo9KM8tKi/2eDLS3TZitXru+aWOpV7S/jV62eFPhndg+x6Nc0buxp1qLUpSjv+zPilG3nc3Eow3728Gx9EukctIqToXDfV4355Fd19m1dN76lZ2icZYrS4pGi9HrmrPWaLlVn70t62tx2ard3HSbVqjpJuENyX2PHoicdWglxiIkmOjd+l9peXFvT9CU1h+84yNLvtP1XTqUalzOqqcuD22fSZ3MaljFb+sksM1XpbXn6FTpTeccGTKKtf02x1XVus9ClWqdXx99m+9B9J1LTqtx6xhUjtYcdqTZjv4Y/He8Xw4eJ9CfFptrxEEvl3T6vWpaw4wqzivtIw9DS9SvbWlWjWqypy4e8zKfxA/O5rOElxMVZ6vqlvZ06Vu26cfsUleHvsOj2pufWuU3TpvenJm10U1CEZbmuRr2h6zqla7dKrtdVU47jZ6KUqqXFZ3MJbNpNLYpZ7Fk0/pXq/ocq02973I3S2fU2M5Punz3X7GWqUZuKzOLbS7QNSoy1DVazjTnJtcos99vp+tWdeDjt4b35eTG0vTtJrupCMoyfYjOWHTSrCrCF1Ddwy0QNndrOvp7pVc9c4/Eng0aFzd6Dq6bqTajLLy92D6Hb3UL6kq1J8WYXpZoLu7B3tKPvQ3NLsEEtjq9IKEdCV9tLMoYXifPtJjedIde2+tqKntZaUnhGFjd3Na3VltSdFzSjE+qdEND9V6ZGcorraq2n9i8TupPR1dJ9ZloOnxo2+VVwkpPezRLSnrXSKcnRqzlh71GWDfOmPR6prNDrbf3qkFuj2mhWlzrPRqpJ0KU6bz727JEkPYtH6RadUi4Oolni22brf2t/ddGYUk5SuWl8LNasv4iVoyir2m5Lhlo33TNRo6laxr2z91relyJhEvkt3oeu2VGVa4VaFNPjtMx9nC/v7mNvbVqs6kuC22fWel7/wDA1N7f2PnvQf8A/k9JLdlPcQll+i2g61Za5RrXsaioJb25MyP8Rak6VtQ6qcoNve1I3d52sYe7mzRv4kbrSg3xyTKI6tN0nTdT1qU1aVqs9jjiTMquiGvJ5U6yxycmYnQ9V1LTHVemt5ljOFnBn7PpR0kq3UI1FJwk8N7JESlvmmW1W30pU6+etUOLPkWs3Nx63qxjXqJbb3KTPtMG6lqpTb23B58j4jrTcNYry4YnlP7kyQzNDoprlWlCpGdVxmspqb4Ge6L9HtU07UOsu5VJQ7JSZhaPSvpJSo0oU5tU4rEfc/8A8Nt6IatqupSq+snns3YBL1dMJShodWUXKLw3uZ876M6/X03UourUnKE/deXk+idMceoqy/0s+RW1pVulUlSTfVraeOQmURD71RrRuKUatN5jJZNL6ddIPRqKsreT25cZJ8DHdGumCtNLrUbmT26S93Jq1wrjWbm4u3lwjmQ3TENi/h1XrVdbqqpVnNbG/aeeZ9Q5PxPln8N/zup/9f8A2fUyYVlQASqhQAlUhgIoAAEgUAAAAgByAShcAoERQAAACApChIAAGAUgQAFAAACAoCUKAAwCoAdpCgqlAUAQFAEDKAOJcAACMpAIC4GAIC4IAZCgCApABMFAEwMAARkKQAGABAUAcQUAQmCgCYGCjgB57qvG2tataWFGMXvbwfFNSrVtd12aoranN7KWc7j7VfWVLULZ29fPVvjh4MRYdDdK027Vzb0n1i7WQRL59T6H67Cmo0+shHsT3GG1DTLrRbqHpMdmW0mnnB95y+W4xOr9HbHW9h3tPacea3BaZ3dHRfVoappNKeffjHZkuOMGjfxB1dXWoxsqc8xpn0HSuj9lo9OpTtIyUJ8VtM8Fx0I0m5ufSKsJuo3lvaYQ+d2PRXWK1BV7eE4qe/3XjJ06p0b1OwpOvdxm443trLX7n2qjThb0oUqUdmEFhYOi+sKGo20re5TlCS7SNk8TR/4dawnSnYzbSjwb37z0fxNWNLtU/qdhmtP6HaZpl1G4t4TjUXPbZ7dY0Oy1yjGnewlJQllYkxsjdof8O6ELmdxSqxTjKDTTMR0u6PT0e+lUpwbo1d+ew+naT0csNFm5WkZLaWGmz06lpdrqtDqrqltxx24JTu+c/wANX/5qsk93VPlk2jp6s6Hxe6XYZHSei2naLXnWsozjUnFp5kz26npltq1BUbpScOeGETPV8e6M67HQNRlcyourHZxjOOJty/ifReF6BLe8fGZf/wCPtD+jPh32Rfw+0RP8Ke55XvMJmWVV56x0CVzFOCqU3LZazjd2nxpVY0NXjVmnKMKibR9vo2FChYxs4RfUxjspZ5GCn0B0WpPblSntPj77BuxS6e6bGMU7SO5JZwZjQulNnq1y6FvR2GuxnV/8e6Hhrqp/72e/S+iunaPXda0pyUn2tiCZeTpjoctVsHKjh1IPJ870bWbzo1dSjKlLGfehwyfaXv5J/YxV/wBHdO1LLuKKlJ8WtwRD5/0h6cLWtMlZq1lDaa3qWT2/w5oVY1K8pRcY7sJo2S36DaNbTThRk9+fek2Z23tKNrS2KMIxX2QS7v6mRcCglVjta/LavganZ/Mw8TbdaX/javgalafMw8TqaX65cPW/dDeqf4UPBFl8L8BT/Ch4Isvhfgcy/eXcxfp8t1781q+Jt/Q38p//AEajry/8rV8Tbuhu/Sf/ANGji+cvWa//AA6tj4Z/9ZNX6c6qrDSpUYy/mVljsNp4P7GI1Xo1p+szUryE5OPDE2bsvKbvkul6Jfas9u2g2k87Se/JkrjonrfVynWVSSjvxL3sn1DStHtdGt+ps4YjnOW957pLbztNtNYwRsbvjfRe/no2uRjNtOc9iSe4+r39/TtdNlc7fu7O0ngxdfoTpFxdSuKlOe23tbpNbzKXWkW13YRs6u06S3ceQHxuoq/SDVqkqMXKdSTaWTLR6Ia6qahiap81tH0HS+iemaRc9fa0mp8sybM5n+/EbJ3fCa9tc6FqEHWjKEoSymfW9P1COp9H3WhLD6vfhZ5HLVei+naxVjUuqctrniTPRp+iWmmWs7a2jJU5rDzJvcNjifF69NV9WlTX9dTH9zP690Kq6XaxuaE+sjjLwuBuz6C6O7hV3Tm5p5+JreZ6tb069u6FRbVNrDygjifNegN7Y07uVKrBekS+Ftn0i7eLStvS9x4XHkYSh0I0m2uevpQkqiy088DP9THqeqx7jjstviEft8HpXHo2odc4uWxPOF4m7y/iVCNuqdKyakopKTZnpdANFnLLpz38feZIdANEg01Snu7ZNkLbvnNKje9JNWc1FzlKWXhcj7BpdktP0+jbpLcLHSbTT4Yt6UYNf1Jbz28/2JhWWB6XWKvNErYWZxW7Czg+NrbUnBZ7Gsn3+pShVpunUWYy47zXJdA9GnUVSVKe3tbW6bBEunolpMIdHHCosSqZ/c+aapbzstRrU37qUmfc6FGFtRhSpR92C3GF1HodpWqXLuLmnJ1H2PAWiWrfw4sNqrUupcOCezk3fV75adplevOWGk9ndg5aXpNtpFs6NpFxi+1l1LS7fVqHU3Sk4faTQV/b4xToXOuanVdvBzqVHnH2Mw+iGuOCUlPYS4bR9C0novp2i3DrWdNqTWN7bMzwfavEbLcT4a6Vxoeq0+vjKE4PJ9k0i9jqOnUK8Z75L3t2Tx6p0V03WK6r3VOXWLskz3adpdvpdv1FspKnnOHJjZG745r8drpHeRTw3VePM9t70YlQ0ync0HtZ3yTPoNz0J0m7u53NWnLrJScs7TPbfaZSlp8aVOGVTWElzImFol8y6H3Vpa6sleRTbe5t8D6JrOfV1fq55pTpvBr8uiFtTn6TWoSi85ymbDDqrjT/AETDnFxxjtRXst3h8u6ORU9ZiuEZN53fcyHSbQatG6Ve0pOdOq96UcG36X0Ss7a69Io0ZR2eCcmbMrSEkushFpfCmXjspM7NP6KdH/QNKr3VeOK0ovGVwNN6OU1X6R04Z4yknu8T7ROlCdJ0nH3GsNLcYKz6G6VZXauKMJqec/E+I2Rux9xQlb1JU6ixjgax0u3UaayfRtUsVcW7nCPvx+5qV9p1G/goXC+HdglaHn/hhJOreLdviuDPoae/GP2ZpOj2FDRa21aJpSwnvN0p1Y1KKqR3rG9BWYfKunz2talJriuOTz6Tr9CyslTq0lKWXvwfQdW6Labf2k7q6pydRb01Jmt3HRDTaVSEVCSzFS+JlP2vDw0Ok9t1mIUcOW7OcG16firKnKPB78GuQ6M2EKu1GD3Pd7zNt0ihGMlGPBYwEszey6vTdlbm0aBrGoOwt9uCzJt7kjetZqdXBU+eDUK9KFwtmok0n2Aa3R6TUXBK4tk2+0w2o1oX14vRaLUW+C4G3T6PWFw81Kb/AGZkbDRLG1lmnSX2b3kDu6NUHZ6ZGNZe8+3kZqtv0O5T7HxWeR537qjuWyZG3pxuLOpSmvcnlbhCJfG7GMfaGjHZeOtW8+3QWzGKWPhXI1+l0H0ilcxrxpT24yUs7b4mxRWMJ8EsF4Umd2udKtfno1GmqFOUpNp7jA0un1pcQaurBSnzbZvV1Y295T2LilGa7WYSv0I0eu8yoNN9jaEwRL5vr19b6pdxlY2kqTb3pPKZ9F6E2Fay0huvu28NI9ll0U0uxlF0aHDnJ5M0opJJJRxuWBsiZYHpim+j9Tdu8T570GWek9Hdyf8AUfVr/T6OpWroXMdqL7HgxundENK0u9jdW1OSqRzzY2TE9Gbxvk3uxyNG/iT8nSk14LODe03jiY3VtCs9ahGN5FyUexkz2Vju+Y9E9et9Elcu4oqptxWM7zZo9PdMUl/go8vsZL/4+0R8aU/97C/h/oufwp/7mRELTLM2F/HUtLdzCLipReN58a1rENZuHs7lUzuPtVjp9HT7VW1GLVJLHEw1x0G0e6rOrVpTc5NuT22TsVlg7bpzp9G3pUpWalKEEs8DKaR0wstQvY29C3VOcnxTOf8A8e6H9Kef1s9Nh0N0vTbmNxbQkqke1kEynTNY0G4/S+Rpf8PLaF1fXlGok4ypY3+J9L1DT6OpWtShcJuM1jieHSOjGn6LcTrWdOUZTWy25N7hsjd8z1/o1dWWryp0KblTqPdhG1S0SGj9Eqzx/NnTy3s7zd50KdRqU6cZNPc2dV7YUb+2nQrpuEljCZOyd3zP+G/57WXD3P8As+qc/Aw+kdFtO0a6lcWkJRnJYeW2ZnG5Z/cI3TBUi4BKDAwAAKAAwAAAAAoAAFGABQAAAAFIygACgCAoAAYGCQLgmCgRoYKAJgYKAJguCgCAoA7AUFVkAAAAAAAAIUAQFAEBCgDicgBxByAHEhcACAoAhCgCYBSAQFIAaJguBgDjgYKAJgYKQARlD4AcSjAwDZBgpAgwTBQBMDABAYJgoJNkwMFANkwQ5AGziCgDjgFwMAQHLBMAQFwTADAYGAIC4LgDG61+W1vA1G0+Zp+Jt+tL/wAZW8DUbP5mH2Z1NL9cuHrvuhvdP8KHgiy+F+ApuKhD7xReCe7JzLd5h3MX+r5br35rV8Tbuhn5T/8Apmo69+aVvuzcOhkf/EZW/wB40cXzl6zX/wCHVsT4guM7xg3Xk0BcDAEBSYAAuBgGwBgYBsDAwAbGBgABgYKAJgYKAjZGiYKAlMFSBQJgmDkQCYGCgGyYBcDARshMceWTlgYCXTcwlVoSpx3trCyYSip2d11daOJcsGw4PBqVo61LrKfxx35XFlZhasu2jPElLO5npW/eYezunUWy/B/YydCo5LZlxTwVieuy1odowXmDIxpvi+1PijAavYdVU62mvdlxM+catKNem6c/hkseATHRp8XlYMppVecXKlxTPFdWrtbiUH8L4M92j03Ob7W9xC8MxfQzZRpL+pbzXNQ3q2a4uimbLcSjO8lTT3qG5fc1W6qbbgsY6tbJVKWcOsrKOM5WTO6PTW1nHMxFg+rdSrjhHCNh0mOzRUmuWWBjtcuM3Wz2IwTXE92p1HVu5vsZ5YQ203wA4rcey23rJ5Ir3We21SUGQOxrMc5MrprzQZi38D3bzIaS80pImEWe8FwNkyMSDBcYKDZAUBOyDAwAAKMA2QFwMEI2AMAkABggAXAwSAGC4IERRgAAUEgMAAAUYCdkKgAhQAASLgIBJgYKAhMDBSgTAwUAQqGCoCAoAgKTAFABO4AFG4gKBuIABuBSFG4AAbjtABVYAAAAAAABAAAAADBMFAEBQBAABBgoAmCHI4gMDAAEBSAAABGCkAmA0UjAgKAICsgEAAB8DichgDiDlgYA4g5YJgDiDkAOILgYAgLgYAhDlgYA4guBgIQFwMAQFwMAQFwMAQFwMAePUaLr2VWC4tGk76VZrGJRfM+gtZ3Y3M17WNElUcq1Bbze0uSInht2cvX4Jvtavd6tM1ehcW6jUmoyisbztv8AVqFtbycaik8cEajCjWo1MVE44+xa1OpXWIxcnyRp6yIrM8Dp+lTzZ2yfpgL6rK5vZyecye5H0bo1au00iMWsOW8wOidFpyu1c3cfdXJm6qEYpQisRRpYqTE7u96lq65McYqfoyDk97Jg23CQMuBgDiUuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCAuBgCEe5PmcsDhvIOzB3tsrK82ofhz37u09lu28S4buZ6bq3VzbSppb474v7mMtLqUKip1t0k8MpPRlid4ZeLUl92Xk2dPXRp1Yv8ApnuO9JZ3cy8McosYGFzOWBglWZeHUrON3b5SW1HgdWh0XCT2lhxMljDa5HVbuMI16nJIiWSrCajdypam6tN71xMZVmp1ZSf9Tydlept3E5drOjl4kLMlpNLrpuP9MXmX3Nhp4o2VWS/bwMdpND0ewdSXGZ7NQn1GlY5yRA1evJynKXazqTabwzk8NLxOHMDtpLNOT7D0225ZPPQWacz0W3wsgd8k9nL5nu0d+5NHgztRx2Ht0V7pomqJZUhywMF2NxBywMAcQcsDAEGC4AEwUAAQoAgwXBcAlxwXBQEIUABgAAAAAwXAAAABMCKEUCYCRQSgAATAUAACgIQoADiMFAEKhgAAABQAAAAADAAAAAAAABQICgDtBQQshDkcQAAAAAJCFAQgKAICkYAAAAAAIABCjAwBCFwMBKYGChgccDBRkCAuSACNFyAOOBgoCEwTBQBxBywAOIKAICgCAAAAAJgYKAJgmDkQCAoAgLgYAmAUhAAABgFIwIUhQDIUExKJjd1St6M3mVOLf3Qjb0Yv3aUF+x25Anqmv8eyYwCggnqgKCRAUAQFAQgKAICgCAoAgKAICgCAoAgKAICgCAAAAAAAAEKAICgCLdwMVq9rKOLqmuG6SRliTgqkdiSzGW5kJhrM72boRgt7TymZzT7mN1Qjj4o8TX7+1nZ15QfDOYs79Jr9TcLD3S4haWx7wVNSSknlMEqbONSWxCcn2GOhV/w0qWcddLGew9d7LZtf1Mxlfe6dPsWWRKYYm7oRoV504y2oxfFHVOE4fEsPike62UJ1JwazDOW2ea7c51Y1J4SkvdS5IoyMhplzVqrq5TSgsYTPb0hqrqadNdnI8NjSUFDCW/fk69VqupcJN7kWQx7OKObOGHveOBCXotlukc6MsNoWizBy7TjRi3UfiB6F8W49+jP35o8UYvabPVo26vNMmFZZoFwCyiAoAgKAICgCAoAgKAIUuABAXiMAQowXAEBcEAAFwBAXASAYKAAAKBAXIyBAcgBEi4CKBComC8AAGSgAAAAAApCgAABMFAAAAAAAAIUAAAAAA7gCcwlSYGAQDIM5AAFAEBQBAVkAAABghRgCApAGAAAAIEgAAEZSNAQYLgYAmBguCATAwXAwBMDAAQNEwUAQFAHEHIAcWiYOQA44GDkR8QJgmDkAOOAcsEaAgAAAAAAAAwAAwMAAMEaKAIC4GAIC4GAIQ5ADiUoAgKAIQ5ADiDkAbOJSgGyAoAhDlgYA4g5YGAOIOQA4lKCRAUYAgLgYAgLgYIEBcDAEBcDAEBcDBIgDQwQAxngxgYCHj1KyV5Qb/wAyK3Gs0n1NRxa95G5cN5gNbsuqmriC918cBaHr0W6dam6VTlvMlxX2Nesasba0q12/ebWyZiF9CpYyuItbcVviN07OGo76lKmYm7quNWc48lsndTuq13UlNr3orcY2pWdZTT48yN0xDst4f4ZpfFVls/8AZ13slO6ko/DD3T0UYuMYNcYrJxpw62ybSxNybbfMqmXdYV6cI7NR4wtx4riW3WlLOVyLVoNQUoJvJ1OnPdmDLIcWVSwsBxa/pZxxvW5kbG73UUo0IvxOu3W1N+J3Y2aC8Dz0HiTw8bwbvdFYlg7dIf8AipLxOhN7W87dLezqE/uWVmWe5ArS37xuJQmClwAIAAgBQBAUAQhyAHEHIARFAAAAAMAAEhgoCUwCgIQYOWBgCYGC4GAJgqRQBAUmAKgEigQFCAmClJgAMFAEKgAGAAAAAADAAAAAAAGACoCA5ADiDkALk4ybyAQuJs5IAIlQAByAAAAAQAAQAACgARkAAoAAEAAAAAAAIAADIAAAAEAAEYAAAAAAAIAABHxAAAAAAAAAAAAAGABAAAAAAAAAAAAAEAAAAAAAAAAAAAAAACACFAAAAAQAAAASKAAAAAAAgAAAAAAAEiAAgAAAOi5hGdpOMlldgATDVpN9Wo593b4HdaNqNWOdz5AELPbpnGo+eyzDcLifiwAmHrk8UnjundeLZhbKO5OkmwCIRL00kuoW7kcU22AZFJXCfFLyOLpwcn7qAA57EWkmkdLo01vUUABz2I7XA7bWEY3uYrDAJVZbaeZby5eQAmHJNlAKykAAQAAAAAAAAAAAigAAgAKAAkIAAKgAhQAAAAAAACgAEUAAAAAAAAAAAAAAAFAAAACAAAUAAUAAAAAAA//Z';
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
