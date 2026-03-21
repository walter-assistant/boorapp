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
function saveKlanten(arr) { localStorage.setItem('gr_klanten', JSON.stringify(arr)); if (window.__supabaseSave) window.__supabaseSave('gr_klanten', arr); }
function getOffertes() { return JSON.parse(localStorage.getItem('gr_offertes') || '[]'); }
function saveOffertes(arr) { localStorage.setItem('gr_offertes', JSON.stringify(arr)); if (window.__supabaseSave) window.__supabaseSave('gr_offertes', arr); }

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
  { key: 'ezmud', label: 'EZ Mud', detail: '' },
  { key: 'olo', label: 'OLO melding', detail: '' },
];

let costValues = {};
let costOverrides = {};

// Editable unit parameters — all cost items
let costParams = {
  boorkosten: { prijsPerMeter: 26.6667 },
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
const LOGO_123BE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCACSAY0DASIAAhEBAxEB/8QAHQABAAIBBQEAAAAAAAAAAAAAAAcIBgECBAUJA//EAFYQAAEDAwIDAgUOBw4FBAMBAAECAwQABQYHEQgSIRMxFEFRs9IJGBkiMjdXYXF1kZKTlBU4VFZ0gdEWIzU2RkdSU1VzdrGytBczQnKEYoKVoSQlw8H/xAAcAQEAAgIDAQAAAAAAAAAAAAAABAUDBgECBwj/xABJEQABAgQDAwQPBAgGAwEAAAABAAIDBAURBiExEkFRE5Gh0QcVFhciUlNUYXGBorHB0hQyNXI2QkNEsrPh8CM3dMLD8SRjgpL/2gAMAwEAAhEDEQA/APT2lKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlYLqrrFiuk1uYk3tS5MyUoCPBYI7VxO/tl9eiUgb9T3noPiybGcmsmYWSLkOPTkSoUtPMhae8HxpUPEoHoQe6sQjw3RDCDhtDco7JuA+M6Wa8F7RcjeAf7+HFdpSlKyqQlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlRbmfEhpxgmSS8Vvpunh0IoDoZjBSfbISsbEqG/RQqUqq63aLVfOMi6wLzbY06MqJzFmQ0lxBIiN7HY9KwR3uYBsak2VBX56ak2QWyZAdEiNZdwuBcHdccFm3rvNIx3m8j5YafTrJNU9bsc03xSPejtKuN0jpdtsAnlW5zAELX40oG43P6h1qLOL/ABHFsfwGzybDjltt77l4S2pyLFQ0pSewdPKSkDpuAf1Vu0O0SvOVT42qmrvaS3i23+DIEgdzaAA2tae4JAA5UfrPxwHx5rlDLtsTlnbIek/JUoqVa+2RKX4LolmkPDSGtB1JuTc6WG8rfpVolddSbi/qprYl2Y7c0kw7c7uj97UNkrUB1QkA+0QPlNdTKhZfwp5gbhbQ/dcEuzwDjZO5bPkPiS4kdyu5QG3/AG2srhXuyWrI7VJsl7hNy4UtBbdZcG4UD/kR3gjqDXESktEMGCbRBmHbyfTxB4K1OHIUKC37M4iM03D95cddriDvH9n4Yzk1ky+yxsgx+ciXClJ5kLT3g+NKh3pUD0IPdXaVVaTEy7hWy7w+B4RdcGur2y2ydy2fIfElxI7j3KA6/wDpstjeSWbLbLGv9gmolQpSOZC094PjSoeJQ7iD3VlkJ/7STBjDZit1HzHEFWFOqBmrwY7dmK37w+Y4grs6UpVkrRKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpQkAbk9KhfOOKvTzE7kuzWtqVkEtlZbdMLYMoUPF2h90d+ntQR8dTZKnTVRfycqwuI4bvWdB7VW1OsSFGhCNPxQxp0vv9Q1PsCmilVw9eZb/g4un3kehWnrzLf8HF0+8j0KtDhWrjWD7zeta/3wMOec+6/6VZClVvPGbbx/NxdPvKfQrT151v8Ag4un3oehXQ4Zqo1hdLetc93+HPOfdf8ASrI0qtx4zrf8HF0+8j0K09efb/g3un3kehWM4eqQ1hdLetO7/DnnPuv+lWSpVbfXn2/4N7p95HoU9ehb/g3un3kehWM0KoDWH0jrTu/w75z7r/pVkqVWz16Nv+Da6/eR6FaevSt/wbXT7yPQrGaPOjVnSOtc932HfOfdf9KspSq1+vTt/wAG11+8p9CtPXp2/bf/AIbXX7yPQrGabNN1Z0jrTu+w75z7r/pVlaVWr16lv+DW6feh6FaevVt/wa3X7yPQrGZKO3VvwXIx7h4/vHuv+lWWpVafXq27fb/htdfvKfQrcONO3H+be6feR6FYnQXt1C7DHWHzpMe6/wClWUpVa/XpW/4N7p95HoVqONG3n+be6feR6FYXHZ1XcY2oJ0mPdf8ASrJ1Wiz/AI6dz/Q1f7RukvjOa8Fd8A03n+ElB7HtZPtOfbpzbI3238ldhw+6bZldMok656jSXWrndUL8EiFAQS2tITzrH/SnlACU9+2xPiqNEcIrmtZnY3UCcq0tiCalZemkvLIge42IDWtvqSBmb5AKbMlw2wZe5bFZBCEtu0zBOYZX1bLwQpKSpP8A1AcxO3dvtXd0pUkNANwt2bDYxxe0ZnU8bJSlK5XdcK82a15Da5NmvUJqXCloLbrTg3Ch/wD4fGD3g1WiTCy3hby03C3B+6YPdHgHGyf+X8R8SXEjuPQKA+raSuHebNbMgtkizXmG3KhykFt1pwbhQP8AkfGCOoNVtQp/2sCJCOzFb913yPEHeFAnZETNojDsxG6H5HiCvjjeSWbLbNGv1gmolQ5SeZC094PjSoeJQPQg91dlVX5MDM+GTK1TLMy/eMNujnVkq9yfECdvauAdyttlAfVyMcWUA/yCuH3kehUCFiGXgjk5/wDw4gyIsSPWCAcjuXWDUG22JjwXjUfMehT7SoD9dhBP8g7h94Ho1uHFdBP8hLh94Ho13OJ6UP2vQ7qUxseG/wC6VPVKgb11sH8xLh94Ho09dZB/MS4feB6Nde6mkeW6HdSztaX/AHVPNKgb11sH8xLh94Ho1tPFfBH8hLh95Ho1x3V0jy3uu6lnbKRnaN+CnulQH67CB+Ydw+8D0a2nizgj+QVw+8j0K47q6P5b3XdSzNpk27RnSOtT9Sq/ni3gD+QNx+8j0a2Hi6gj+QFx+8j0K57q6R5b3XdSztoc+/SH0jrVg6VXk8X8Ad+n1y+8j0K+auMSAk+95cj/AOSPQrnuppJ/bdDupZ24aqj9IXS3rViqVXFXGTAT/N1c/vI9CvmrjQt6f5t7p95HoVyMUUk/teh3UszcI1l+kH3m9aslSqzq417en+bS6n/yh6FfJXHBbk/zY3Y/+Un0K7DEtLOkXod1KQ3BFef92X95n1KztKq25x021v8Amtu5/wDKT6FcZzj4s7G65Gll6S2nqpQlJ6D9aKyDENNdpF6HdSkM7HuJIn3ZY/8A6Z9StbSos0f4kdM9Z1qt+OXB2HeG2+0ctc5Ibf5R3qRsSlwDx8pJHjAqU6tIMeHMMESE64O8LWahTZulRzKz0Mw4g1DhY/8AXA6KG+KnN7hiGmph2p9bEq+SBBLqCQpDXKVObEd24AT8ijXZ6IaNYzp9ikGS5bY8m+TWEPzJjqAtYUoA9mgn3KU77dO/bc1g3Gn/ABRx75yX5urAWn+CoX6O3/pFbdMxXytAl2QTYRXPLrb9mwAPoHDivOZOBDn8VzcSYG0YDIYZfPZ2wXOI9JO/W2S+3gsb8na+oKeCxvydr6gr4Xe6Q7Hapl5uDgbjQWFyHVE9yEJJP/0KprL4rdVHJjqos2I0wpwltsxWzyp36DcjrsKiUbD87XQ8yxADbXJJGvCwKl4nxjS8JmG2eDiX3sGgE2Fszcjjkro+Cxvydr6grTwWL+TNfUFdRgt1m33CrDerktK5c+2xpL6kp5QXFtpUogeIbk9Kg3iD13zLAM3axvFJcdpluC08/wA7CFntFqV03UD/ANIT9NYKdR5qpzhkoJG0L3uTbL2fJS6ziSQoVNbVJoHk3bNgACfCzGRIGmuasV4LG/J2vqCngsb8na+oKpP66vVz+04f3Nr0asvoVqbL1RwxV3ucZtmfDkGJJ7IbIWoJSoLA8W4V3eUGp9WwrUKNA+0xy0tvbIk2v6wFUYdx/RsSzf2KUDmvsSNpoF7a2sTn67KQfBY35O19QU8Fjfk7X1BVZNb+IXOMO1Dn4zi02O1EgoaQsLjoWe0UgKPVQP8ASFYNH4r9WWnkOOzYDyEqBUhcNGyh5DygH6CKlyuCKnNy7JiGW2cARcm9jmN3zVdP9lKg06ciSUVsQuY4tJDWkXBsbeFe3sV1PBY35O19QU8Fjfk7X1BXUYfkf7q8QteTpY7A3GGiSW99+RRTuRv49jvVO5PFfq81IW0LlCPKrbpCb/ZXn9WqUOjPEOZBvcjLPMa71t85XZKShQo7wS2ILtIG6wO8jiFdvwWN+TtfUFPBY35O19QVSA8WWsCfdXCEPlhN+jVn9CdTJmqWEJvdzjNMz40hUWT2QIQtQAUFAHu3ChuPKDUaQrsrUYvIwrg2vmP6ldadX5KpxuQggh1r5gfIlZ/4LF/JmvqCngsX8ma+oKrvxC8Q+Vaf5Y3iOJMxWVMMNvyZDzQcUpSwSEJB6AAbHfYk7+LbrFPrstYdub8IQ9vL4E36NYZnEknKxXQXbRIyNh/VYJvE9Pk4zoDwSWmxsBa/OFd7wWL+TNfUFPBYv5M19QVXfh64hct1AyxzEssZivdswt9iQy2G1IUgblJA6EEb+IEbeOs14j9Rcm01w+33rF5DLUh+4pjuFxpLgKC04rYA9B1SKlw6tLxZR042+yNeP9+1TYVYlI0k6eYDsN1yz/v2qU/BYv5M19QVr4LG/J2vqCqQDiy1gV3XGGfkhN+jXcYfxZakryS3x76YM2C8+hp9rwdLauVRAJSpIBBHeO8VXMxTIvcG2cL+gdarGYupr3BtnC/oHWrj+Cxvydr6gr6V0Oe3ebYcHv19ti0IlwLbIksKWnmSFobKkkjxjcDpVOlcWerwUQLlC6H8ja9Gp1QrEvTHNZGBuc8h/UKyqVblaS9rIwN3C+QHWFeOlVW0S4js7zHUW2Y1lE2M5Cn9o3siMhB5+zUU9QB4wKl/iAzrINPMFbv+NvNNSjPbYJcbCxyKQ4SNj070iuYNYl48q+bZfZbe/HLPiu0tWpablHzkMHZbrlnlY8fSpKpVZdE+ITM8vzyFj2VS4y4k5DjaORhKCHQkqT1AH9Hb9dSDxBapXjTi12pOPPstzp7zhPaNhf70hI32B6e6Un6KwMxBJvknz4vsMNjkL3y9PpG9T5OZZPMD4Wh4qWaVX3QTWbNtQc0kWTIZUdyK3b3ZAShhCDzpW2B1AHiUa7riT1RyzTKFZZGLSWWlTlvpe7RlLm/KEbbcwO3ujXEPEMpFp7qk0O5NptoL6gaX9PFW8vToszMtlWEbTtOGl1M6kIWOVaQoeQjetng0f+ob+qKorM4u9ZGQS3c4I28sJr0asJwt6u5Fq1it3l5VIju3C3Tw0C00lv8AelNgp3A6e6C+tYqbiWSqsYQIIcCeIG72lXlSwbUaZJOn4xaWAgGxN88huG/0qZvBo/8AUN/VFPB4/wDUN/VFUp4teKrV7SHV13D8MucBi2pt0aSEPQW3Vc6wrm9sob+Ku1mcVOocjhFi6t2yfCRlMe9fgqc4YqFNn2yiNm+4btlv6D5anGqS4iPhkG7AScuHBXEPsZVqJJSc+0s2JpzGt8I3BeCW7Xg5DLO187K4Pg8f+ob+qKeDx/6hv6oqnPB5xOasay6lTcazi5QX4DFqdlpQzCQ0rtEuNpB5k+LZSulZnxra66haI23FJWBTokdd2emIldvFQ9zBsNFG3N3e7VXdtRgOljNgHZHoz1sosfsfVWXxDDw05zOXeLg3OzbZLszs30B3aqyfg8f+ob+qKeDx/wCob+qK8wvX9cRX9uWr/wCLZ/ZVwODTXHKtbsGvNwzWRHfutrufYc7DCWkllbaSj2qem/MHOtYpSrS05F5KGDf0gdasMS9iyuYVp7qlOuhmG0gHZc4nM2BzaMr5aqffB4/9Q39UU8Gj/wBQ39UVSXiw4rNYNJNX5WHYbdIDFtahRn0IegtuqClo3V7ZQ376hz1/PEXtv+G7Vt81s/srHGrcrAiOhuBuDbQdan0rsOYhrEjCn5d8IMiNDhdzr2IuL2Yc/avT3waP/UN/VFPBo35O39QVTvhF4vs81Xz5enmoUeDJXLjOyYU2MwGVoW2OZSFpHtSkpCiCACCPHv0mDiv1uvGhemiMhxyHHfu1xmpgRVSUlTbJKFKU4UgjmICdgN9tz17tjLhz8vFlzMt+6Ncs1rNQwNWKdXIeHooBjxLbNneCQ6+d8shY3uL5HJTJ4NG/J2/qCng0b8na+oK8wvX9cRX9uWr/AOLZ/ZVjuC7iW1A1pyPI8f1AnQpC4UJqZCLEZDJACylwHl7/AHSPk2NRpesyszFEJgNzxA61f13sSYgw9TotTmnQyyGASGucTYkDIFo4556K1/gsb8na+oKeCxvydr6grCtccsvOC6SZTl+POttXK1W9ciMtxsLSFgjvSeh76qdwv8Wus2qeslnwzLbrb3rZMbkLeQ1AbbUeRpSk7KSNx1AqVHnoMvGbAeDd2nPZa/RsFVOu0mZrMs5ohQNrauSHeC3aNgAQcuJGavN4LG/J2vqCtPBIv5M19QVCHGHq1mejWmMHKcGlx489+8Mw3FPx0vJLSmXVEAK6A7oT1qmXr+uIr+3LV/8AFs/srBN1aXkonJRAb+gDrVvhjsY1vFkgKjIvhhhJb4TnA3GuQafivTzwSL+TNfUFbVwILiC25CYUlQ2KS2CCKrHwV8Rmb62vZRa8+mRZEy2IjSIpYjJZAbUVpXvy9/UIq0dTZaPDm4Qiw9CtTxDQ53DFRiUydI5Rlr7JJGYDhYkA6HgqYcZektu0xXZ+IHTBluw3W23NpM1EQdm2tatyh0JHQHcFKgOigvr497ZYHlDWbYTYcwZb5EXq3R5wR/R7RsKI/VvUKcen4u1y+coXnKkXh294fT//AA5A8ymoMuxsCfiQ4YsC0G3puRdbVWY8Sp4NkpyaO1EhxokIOOuxstcGk6kA6X0GSjjjT/ijj3zkvzdWAtP8FQv0dv8A0iq/8af8Uce+cl+bqwFp/gqF+jt/6RW91H8DkvXF+IXgtI/Sepflg/wuS62q3Xu3vWq7Q25USQAl1lwbpWN99iPlArz61Wt0G06k5DbbZFbjRY9xfbaabGyUJDhAAHyV6H158az++vk/zpI84qti7HMR/wBqjQ75bN7br3GduK0js1Qof2CWi7I2tsi9s7bJNr62vuV4NLfe1xX5mh+ZTW69aaYFkVxcu18xS3TZj3KHHnmuZStgEjc/EAB+qtulvva4r8zQ/MprCNb9fbfpilVhtDCZuQPNBaUL/wCVGSruUvynxhI+Ikjcb6nAl52bqb4MhfbLnaG2V87ngvQZqcpdPocKZq4aYTWs+8A652cgAb3Otvbuuoj4sMOxDEncdbxmyQrc5IRJL6Y6eUrALfKSP1q2Py1nnBt/ES8/Ov8A/Fuq2R42eaxZdyoEq8XaavdS1Ho2nyk9yED9QFXV0Y0xRpXiAsbk0Spkl4ypbiRsjtClKeVO/XYBI6+M7np3VvGJXNplCZTJiLtxiQd5OpN887DQE6/DyvAzH13FkWuyUvyUsAQMgADshoAtYXNtogXtfM6X7O56Wad3me/dLrh9tlS5Kud15xndS1eUmqXa+2S049qleLXZLezCiNKa5GWhshO7SCdh4upJqfuIzWDN9N7/AGyBi0phtmVD7ZxK46XDzc6hvuQfEBVWcqym75vkb+QZFISqXMUntVpbCQAAEjoPIAKkYJp9Qh2no8S8JzCGjaJtmN2g0KhdlKs0aMXUqUg7MxDiAudstAI2ST4QNzcuGoV69Gvekxn5sb/yNUIsTLUjNbcw+2lxty5MIWhQ3Ckl1III8m1egWmLNtj6a2Bi0TzNiItrYafKCguDl6nlPUdd+nirzwROftl8Rco3L20WSl5vmG45kqChuPlFfP2PngzzXnTbeekblvtZbyNOpwduYNMxk1mhGRU9cYWNY9jlzxpFgskG3JfjyS6IrCWwshSNt+Uddtz9NSLwa+9xcvnVXmm6rNqXqxleqkiDJygQwq3oW2z4Mz2Y2UQTv1O/uRVqeElixsaYK/BVzMuQ5NW5OSUFPYOlCdkDfvHKEnfxknyVWUqNCm606NByaQbbtwGimUePCnK8+PAyYQbaDcBooE4sffjuH6LF80KzpGJ4v60lOQHHrf8AhMtqV4Z4Ontt/DSnfn239z0+SsF4sffjuH6LF80KlBH4mSf7pX++NYITWun53aF/Bf8AEKLDa11Rn9oXsyJ8Qoz4Svffi/ocnzZqZeM33ubV88I8y7UNcJXvvxf0OT5s1MvGb73Nq+eEeZdrNIfgMb1n5KRTv0cj+s/7VH3B9jWPZHPyRu/2ODcUssRi2JLCXOQlS99uYdN9h9FQsWWmM+7BhtLbbdy5UpSNgkBzoBU98Ev8JZT+jxf9TlQO974S/nT/APpVVMtAp0q4DMl3xVRNMaKZKOAzJf8AxBX61U96/KfmWX5lVUU0etlvvOqWO2u6w2pUSTPQ28y4N0rSd+hFXr1U96/KfmWX5lVeeeP3654xfol/szgbmwXg8wooCtlDu6Hoat8TvbDnID36DM+q6u8WvbDnZd7xcDM+oEL0MtelOnFkns3S04bbIsuOoLaeaZAUhXlBqP8Ai596pr51Z827XQ8NOsGe6i5Tc7ZltwQ+xGt5faSI6Gzz9ohO+6QPEo/TXfcXPvVNfOrPm3atZiYl5qkRY0s3ZaQdwGnqV3EmZacpEWPKs2WkHcBpluVTsMvbuN5Hbb6ypQVBktv+17yEqBI/XttUscT+TN37P2oUV5Lka2wmm0cp3HMsdoT9C0j9VQrEbcLan0oVyIIBUB0BO+3+R+iuxeen3R1cqQ47IcQhPOs9SEgBI3+IdBXlMSdiQ5SJJjR5aea/xy5lJw66zA1TDwme+XM+aH/Os1k3Gp/BWM/3sn/JusZ4TPfLmfND/nWaybjU/grGf72T/k3WzSf6Ixfzf7mr0alfjMH+9xWM8JeB4ZmcTJFZVjUG6KjORg0ZLfMUA9pvt8uw+irO4tgOGYQZJxLG4Np8M5PCPBm+TtOXfl38u3Mr6TXn3hmrud6YtTm8NnojpmlBe5o6HNynfb3QO3ujV3eH3Mb9nultsybJZSJFwkuyEuuJbCAQh1SQNh06AAVcYNnZOLBZKtZ/itBJNhx466EK8xnTalAa6fdF/wAB5a0N2na7N826atJVDPVBPxhX/maF/kuo7xbMwnQLN9P5DgHNdLZd4yd+8grad/zaqRPVBPxhX/maF/kuq2BSkhSUqIChsoA94+OsE9EMOcikby4c+S+osHSUOewpTmRP1WQnj1sLXD4W9qtX6nN79N0+YX/OtVJPqmf8CYF+k3H/AEsVG3qc3v03T5hf861Uk+qZ/wACYF+k3H/SxVpC/BX+v5hec1P/ADclfyf8URYp6n/pdp5qJa80dznD7Ze1wX4KYypjIWWgtL3ME+TflT9FXgwzTfBNO2pTGD4rb7I3NUlUhMNoIDpTvylXl23P015NaUa96maMMXKPp/dmoaLqppcoLitvcxbCgn3QO3u1d1emvDBneSalaJY9meWzG5V1nmUH3UNJbB5JLqE+1T0GyUgfqqXQpiXexsAN8NoJJsOPHXetZ7M1CrcnMxavFj3k4r2NazbdkQy+bbbNrsJyJzsVRTj9/GHnfNkLzdSZbsDwl31P17LXcStKr2mK6sXExEeEhQuBSD2m3Nvy9O/uqM+P38Yed82QvN1kkDiA0wj8Frujjl5k/upXGcbEUQ3OTmM3tR++bcvuOvf8VVodDbOTPKEaOtfjf4rfny8/MYWw/wDYWuOzEli7ZvkwNO0XW/V43yWK8BP4xto/QZ3mFVY71SH3pse+fR5hyq48BP4xto/QZ3mFVY71SH3pse+fR5hys8n+ERfWfkqfFX+aVN/I34xVDHADpxgmol/zCPnGK2+9twocVcdMxrnDSlLWFEDxE7D6KvXiOjeluBXRV6wzBLRZ562lMKkRGAhZbUQSnfyEpH0VTf1M7+MudfoMPzjlYU9xq8QSM4csacqiCKm6KjBP4OZ/5Yd5dt+XfurNIzUtJScJ8VtyScwBfIqsxnhuv4vxTUJOmzOzChNhbTXPeGkOYNGgEHMG9wrvcUP4vud/NDn+YqgPAx+Mfj39xM8wur/cUP4vud/NDn+YqgPAx+Mfj39xM8wuu1U/EoHs/iUbscfoBWPVF/lBWp9UX9462f4ij/7eRVeeAfT/AArULPskt2b4zAvUaNZw8y1Ma50oX2yBzAeXYkVYb1Rf3jrZ/iKP/t5FUO0r1hzzRu6zLzgNybhyp0fwV9S46HQpvmCttlA7dQOtRqnFhwKm2JFF2gC/Sth7HtOnav2O4slTn7EZ73hrrltjtNOouRkDovWvDdJ9NtPJcifhGF2uyyJTYZeciMBCnEA78p+LcA1llQTwb6p5nq7pXMyfOrg3MuLN5fhpWhhLQDSWmVAEJAHetXX46natolXw4kFr4Qs058F854jlJ6n1SNJ1KJykaGdlzrl17el2ZHC6rvx6fi7XL5yhecqReHb3h9P/APDkDzKajrj0/F2uXzlC85Ui8O3vD6f/AOHIHmU1CZ+JP/IPiVssz+gkv/qX/wAtqjjjT/ijj3zkvzdWAtP8FQv0dv8A0iq/8af8Uce+cl+bqwFp/gqF+jt/6RW81H8DkvXF+IXhdI/Sepflg/wuXKrz41n99fJ/nSR5xVXd1VkTImm2Sybe88zJatj6mnGSQtKgg7FJHUGvPuYxep8p2bMalyH3llbjrgUpS1E7kknqTW09jqW2XRpsuy+7bmN1572aJ7abLU8NN7l9929tvmvQfS73tcV+ZofmU1TjiSWpzWO/86idlspHyBhupy4RJ15lYteWLvKlupiyWWo6H1qUG0BB2SkHuHd0FQjxGQpj2sGQLaiurSXGdiEEg/vLdd8Myv2HEczBc4GzTn6y0/NYsdT/AG2wVIzLGlt3tFvyte35XVneHbG7JZdLrLcLbbmmZV0jCRLeA3W6sqPeo9dh4h3CpNrzlh5HqBb4rcKDer5HjsjlbaakupQgeQAHYCrt6ER7ozpbZXrzNkypctDklbkhalr2WslIJV19ztVJiygRJBzp+LGD+UebDO+dzrfcMltPY9xhBq7WUiBLGGIUMXdcWJFhoBqSSedZZdsXxu/Oofvdgt9wcbTyIVJjIdKU777AqB2FUd4hrZbrRqveYNrgMQ46C0UssNhCE7tIJ2A6DqSay3iGuee47qnc2LRkF7ahyktSWW2JTqUICm0ggBJ2A5gqohXAyrJLmVuRblcZ0lQ3UpK3XFnu6nqTW14QosSnhs8+OHMezJueV7HebZaLz7sj4og1hz6TClS2LDim7sjtbO03cL53BCvNoX7zmN/oSv8AWuqJ4+hDmb2xtxCVJVc2ApKhuCO1T0Iq/wDpdYJ2Maa2OxXNoty4sEB5vvKFq3UU/KN9v1V59u2rIY9yMuLbZzbrTvaNrS0oFKgdwR06EEV89Y/eIk+IrMxtxDlw2gvRKtCiS9MpzIjSHNYARvBDWXCn/jNtNqtsnGFW62RYpcblBZYZS3zbKb232HXvP01lnBb/ABFvfzmPNpqsmQ3LUjMXGDkj97uq44KWfCe0dKObbcJ33232H0VbThNxK+4tp/LdvsB2Gu5Ti+y06gpX2YQlPMUnqNyDt8Q38dVNLjfbayZmGwhpB9mVvipdIj/b66ZqGwhpB9ng2+KgXix9+O4fosXzQqUEA+syT/dK/wB8aw/izwXJlahnJ4lolSbdPiMhL7LRWlC0DlUlW3cegPXv36dxqJxedShj37kxMvn4H/IeZzsfdc3uO73XX5ahR5gyM/NbbT4YcB7TkfUoEzMGn1Gb5Rh8MPaP/ogg+pZ5wle+/F/Q5PmzUy8Zvvc2r54R5l2o24S8KyZvUQ5HJs0qPb4cR1K33mihJWscqUgnvPUnp5OviqTuMWJKmae2pqJGdeWLuglLaCogdi716VYSMNzaDF2hqT8lZU+G9uHI+0NSbdCwvgl/hHKf0eL/AKnKgd73w1/Oh85W/HLpqLiK314xIvVsVJCUvGKXGysDfbfl2323P01zMGwjMsnzG3MxrHcH3XZjanXVMq5Ujm3Utaj0AA3JJNULo5mJeBKsadppPtudy118wZmWl5NjDtMLvbtG4sr16qe9flPzLL8yqqM6KxIs7VnGok2M1IYduCEuNOoC0LHXoQehFXo1SbW5pnlLTSFLUqzy0pSkbknsldAK89Yluye3TW59vhXGPIZXztutIWhaD5QR1Bq+xO7k5yBEtcDPmK2TFruSnZeIRcNz5ivSO245j1mdU/Z7FboLi08ilxoqGlKTvvsSkDcdBUScXPvVNfOrPm3aiDhzmah3/VO2tX695AuFFbekuokSHlNq5UEAKCjsfbKTUx8WMaRL0uaaisOOr/CjJ5UJKjt2bvkqyizrahSY0RjNkWIt7FcGoNqdJjRYcPYGYtzdar5pVjCcpwvOoyWuZ+FAYnMkDcgtLJVt8qOcfrrl4jjG2k+Y5a+11Q5Ft8dRHjLqFObH5OQfrNZ1wgWuUzdckauMF1tt6E0gh1sgKBUdx1rNtQ8ERhGgE7F7eFSVolIdKkJJK+aQCOnxJ5R+qtRg0fl5ATxH3YcW/rz2fieYKwoUO0GG/wDvVRlwme+XM+aH/Os1k3Gp/BWM/wB7J/ybroeFS3T4mpEtyVCfaSbS+ApbZA37VrpvWScZcKZNtmNpiRXnil2Tv2aCrbo35K7SbT3JRRb9b/c1egUogViCf70K6Hg4x6wXyHk5vVit9w7JyNyGVFQ6UbhzfbmB2q00C3W+1RUwbXAjw4yNylmO0ltCdzudkpAA615oxpWoGPJeTYHr5bw8R2girda59u7fl237zVu+DtOWysCul6y65XKW/MuRQx4c84tSG0Np7ucnb2yld3kq0wfVGOhw5AQiHAG7vaT699lsOL6FEEKJVjHGyS0BmetgONtxKqD6oJ+MK/8AM0L/ACXUR6n4UMUaxO5sNFMbJMchXRBA9rzkFtwD/wBzZJ+Wpp4+bJeZ/EA8/BtMyQ1+CIY52mFKTvsvpuBXacQGnNyuHC5o1l0K0SnJlshfgyWhDKi4lt1JWgqG24AU2ofKsV3m4Bix5ggaG/Tb5r6FwzWWU2kUKE5wDYrQw5/+suHvNA9q43qc3v03T5hf861Uk+qZ/wACYF+k3H/SxWA+p5We72/WW5uz7XLjINieAU6wpCd+1a6bkVI/qk1tuNxsuCJt8CRJKJNw5gy0pfLuljbfYdPHU2ED2lePT8wtPqcRh7Lcq64tsf8AFEWP+pzYpi2S2nOV5HjVquqo8i3hozYTb5bBS/vy84O2+w328gq81stdsssJu22e3RYERnfs48ZlLTaNySdkpAA3JJ+U14z4/N1TxNL6MXkZPaEySkvCEp9gOFO+3Nybb7bnbfymvQvgNTmszS265DnF4vE6VPu622BcnnHFoaabQN09odwCpSvoqTRJ1pDZXYzAOftuqLswYSjQ4kxiN02DDe5gbDzvfZDeNtxOiqvx+/jDzvmyF5uofy7Tqbi2H4fmapPbw8uiSH2vacvZOMvqaWjffr0CFb9PdfFU28edlvM/iCnPwbTMkN/g2GOdphSk79n5QKy3LtNLjk3AViF2ZtclVzxac/J7Hsldp2Dspxtwcu2/eptXyJJqojyxjzMxlmLkewj5XXp1Fr7aNQKEC4BsXkobtP1oTtn1eGG+xd56nbpXiU4TdXDeJL98tjrtsEDkCW44WgHtd991lSSoDuA9t3+LMvVIfemx759HmHKiP1PfIb9iWqVxxG52ycxAyWCeUusLShMljdaDuRsN0F0fKRVgOPPAclznRyM5i9qk3KRZro3Mejxmy44WS2tClJSOp2Kk7geLc+KrWXAiUhzYbc87+v8A6XmtcfFkuynLxp6LeGXMLCSLBpBAbwAD9odJzKhj1M7+MmdfoMLzjlVVke+e78+K8+a+uNy9V8GkSHcUcyexvyEht9ULt46nEg7gK5dtwD5a+FgsGUO5Pb5Uqy3Na1zmluOLjOEqJWCSTt31Qvj8pLw4GybtJ6Sva5OjiSrU/WDFaWzDYYA3jk2kG+7PcvVTih/F9zv5oc/zFUB4GPxj8e/uJnmF16A8TbD0nQLOWI7S3XF2lwJQhJKidx3AVQvgisd6g8ROPyJlomsNBmWCtyOtKR+8L7yRV/VATUYB9X8S8S7HL2twDWGk52ifygrOeqL+8dbP8RR/9vIqCPU78cx/I9RMnjZDYbddGWrKFobmxUPpQrt0DcBYIB2J61PvqhkGbP0TtrMGG/JcGQx1FLTZWQOwf67DxV582BWpWKSHZeMfuitLzyOzcchB5lS0b78pKNiRuAdqjVOKJepCK5twAPmth7HlNdW+x7FpkKKIb4j3gOO7wmm+We5ezFnsVkx6KYNgs0G2RlLLhZhx0MoKiACrlQAN9gOvxCudVP8A1PxzUG8x8vyLOb7f5qUKiwordzkOuJB9utakhw9/VA3Hlq4FbLJxxMwWxQ2wO5fPeKqK/D1Wi06JGEVzLXcL5ktB330vZV349Pxdrl85QvOVIvDt7w+n/wDhyB5lNR1x6fi7XL5yhecqReHb3h9P/wDDkDzKaiM/En/kHxKv5n9BJf8A1L/5bVHPGkhZw2wOhCilNzUCQO4ls7f5Gp7sL7Mqx26THcC2nYjS0KB3CklAINdFqhgEDUzDJ2KTnOxU+A5Gf237F9PVCtvGO8EeME1XrGNX9SeH2KMG1Jw6TcLdB3RBmNrKdkb+1ShzYpWjv2HQju+Iegy8s6uUqFKSpHLQXO8EkAua6xuL62IzC+f5ycbhivRqhPAiXmGsG2ASGOZcWda5AINwf62tgQCNiNwa29k1/VI+qKrm3xsYgU7u4XeUq8YS60R9O4rd69fDfzNvX12v21F7kq0P3c8461P7v8NH97bzO6lYtKUp9ykD5BWhbbUd1IST8Yquvr18N/M29fXa/bT16+G/mbevrtftp3J1rzc84607vsNedt5ndSsV2TX9Uj6orcAANgNhVc/Xr4b+Zt6+u1+2nr18N/M29fXa/bTuTrXm55x1p3fYa87bzO6lYtSEKO6kJJ+MUS2hJ3ShIPxCq6evXw38zb19dr9tPXr4b+Zt6+u1+2ncnWvNzzjrTu+w1523md1Kxlacqf6I+iq6evXw38zb19dr9tPXr4b+Zt6+u1+2uO5Ktebno61z3f4b87bzO6lYvlT/AER9Fa1XP16+G/mbevrtftp69fDfzNvX12v207kq15uejrTu/wAN+dt5ndSsZWnKn+iPoqunr18N/M29fXa/bXZY1xeYlk2Q27HY2K3Zl25SW4yHHFt8qStQSCdjvt1rq/CtYhtL3wCAM93Wu8LHeHYzxDZNNJJsMnan2Keu7oKEA943rB9Z9V7VotgknPbzbJU+LFeZYUxGKQ4S4rlB9t02G9V39ko04+D7I/tWPSrVI8/LyztiK+xXqtGwXXsQS5mqZLOiQwS24I1FiRmRxCt/yp/oj6K1AA7htVP/AGSjTj4Psj+1Y9KnslGnHwfZH9qx6VYe20l5QdKtu9di7zF3O36lcDvrTlT/AER9FVA9ko04+D7I/tWPSp7JRpx8H2R/aselTtvJeUHSneuxf5i7nb9SuAAB3AChAPeN6p/7JRpx8H2R/aselT2SjTj4Psj+1Y9KnbeS8oOlO9di/wAxdzt+pXAAA7gBQgHvFU/9ko04+D7I/tWPSp7JRpx8H2R/aselTttJeUHSneuxf5i7nb9SuAAB3AChAPeAap/7JRpx8H2R/aselT2SjTj4Psj+1Y9KuO20l5QdKd67F/mLudv1K3/Kn+iPorUAAbAACqf+yUacfB9kf2rHpU9ko04+D7I/tWPSp22kvKDpTvXYv8xdzt+pW/KEk7lIJ+MVryp25eUbeTaqf+yUacfB9kf2rHpU9ko04+D7I/tWPSrntvJeUHSnevxf5i7nb9St+EpB3CQPkFClKvdJB+UVUD2SjTj4Psj+1Y9KnslGnHwfZH9qx6VO28l5QdKd6/F/mLudv1K3/Ij+gn6K1AAGwAA+Kqf+yUacfB9kf2rHpU9ko04+D7I/tWPSp22kvKDpTvX4v8xdzt+pW/KEk7lIJ+SteVIHLsNvJVP/AGSjTj4Psj+1Y9KnslGnHwfZH9qx6VO28l5QdKd6/F/mLudv1K34QgHcIG/yVrVP/ZKNOPg+yP7Vj0qeyUacfB9kf2rHpU7byXlB0p3rsX+Yu52/UrflCCdygb/JTs0f0E/RVQPZKNOPg+yP7Vj0qeyUacfB9kf2rHpU7bSXlB0p3r8X+Yu52/UrgEAjYjcVoEIB3CQD8lVA9ko04+D7I/tWPSp7JRpx8H2R/aselTtvJeUHSneuxf5i7nb9SuAQFdCAflrTkR/QT9FVA9ko04+D7I/tWPSp7JRpx8H2R/aselTtvJeUHSnevxf5i7nb9SuAEhPRIA+SlU/9ko04+D7I/tWPSr5r9UnwRTiGomm9+cUsgfvkllHUn4t64NXkgL8oOnqXPeuxef3F3O36lm/HzKjscPkuO66lLkq6Q22kk9VqCiogf+1JNSdw/R3ouhuBR5DSm3UY7ACkKGxB7FNVcGOau8aWdWu65jYX8Y06sz3aoZVzJ7YdOYIKgC64oADn2CUgnbr0Vd6LFjwozMKIylpiO2lpptI2CEJGwA+IAVikXGbmXzbQQwgNF8r2zJ9XBZsTNh0OgyuHnvDpgRHxYgaQQwuAa1hIyLrC5tovpWx5lmQgtPtIcQe9K0gj6DW+lW4NtF5yQDkVxBaLSBsLXEA+JhP7K1/BNq/syJ9in9lcqld+UfxXTkofijmXF/BNq/syJ9in9lPwTav7MifYp/ZXKqCuNLWZWi+g17uVrdP7or+BYrGyjq4uU+CnmSO8lCOdfTxpA8dcco7inJM8UcyzfT7VHRnVaZeLfp3kVkvsiwPJYuTcZrrHWoqCd+ZI3BKFgKG4PKetc7ULM9MNKMcXluodxtVjtCHkRzKkMbp7RfuUgJSSSdj3DxE+KvNvQOfkfCjrXpzesl0qyvBseyq2NYpk8q9kdhNuS1qWJSCB7QBZb9qrqEJX8dSlxo5fL1k4iMa0Psent+z7HcCZVesptViUA87IdRytIUs+1SEBTZO/9aod9OUfxTkmeKOZXeYvuAycOTqBGk2t3HVW78LJuKGkqaMPs+07YEDcp5Pbd29Yk5rrw+t6bp1dOZWFWIKkCJ+FUMFTYfKuXsykIK0q38RSPEe41VThP1HvKOGjV7h6zuFNteSac2O7djBuI5ZKLc9GdWgKH/oUogkdOVbfiIqnE7ENUMI4TIWVWecq5ae6i3Dlu0Ytk/gu6Q5K0tLBHRPaIRtvt125T1CK45R3FOSZ4o5l7C3fU/Ryw33F8Zu99tMa55olK7DGVGJVOSeXYoIRsN+ZPuiO+uw1Ay/TXSzGnsw1Am22y2aO4205Lfj8yUrWrlSNkpJ6np3VR/ifzHHMB1l4VM0yy4iFZ7PbG5cyT2S3OyaSmPurlQCo/qBNZXxr63aY66cGWU5FpbkovNvgX23QpD3gjzHI92ra+XleQkn2qkncDbrXPKO4pyTPFHMrC6e8RvDbqtkjeIae5xZL1eHWnHkRGYbiVKQgbqIK2wOg+OuVnmvnDnpjfUYxnmf4vZ7qoAmI8UqcbB6guBIPZgjr7baq38E+oNgm5lZ8fmcQmE5bNkWLsoNitmFptsyM6hpClc0pLSefkbQtKgVe276iDAsv0s0Df1ux3ifwSLcNTbpPuEyzvX6yOTo96Qts9g024lKuVC3SCSCkcrg9sCnYcco/inJM8Ucy9LLMvE8itUW+WA2q426c0Ho0uKG3Wnmz3KStO4UPjFV+13jRo2vunKI0dppJcjEhCAnf/wDJV5KkvhmvkvJNBMJvU3EoOMOybWg/giDGVHjxEBSkoQ22olSU8oSepPfvUca/e/8A6cf98b/cqrZsKPcZ83P7OJ/AVpmPGNbSmkD9rC/mNXN49Pxcrt+nwfPCsx4b7NZ39BcCeftUNxarDEKlKYQSTyDqTtWHcen4uV2/T4PnhWc8OcmPC4eMFmS30MsMY7GddccUEpQhLe5USe4AAnetEaAai78g+JXvkd7mYBgFpt/5T/5bVzMp1I0RwnM7Jp7lV6sNtyLIygWu3vMDtJPMvkTsQkgcywUjmI3I2FZp+AbF/YsD7sj9leSmp0zOuJDJdTdeMc0kzK+oamxmcKyC2geCWqPb3eZxakkbrKkJCva+5UpXjq2WpnGDHufA/B1Nx2QlWW5rFTjcSIwd3W7qsFqRypHXdADi09PG3/SFWVhwXn/LRfGPOrC6d6kaI6tPXaPpxe7BfnLE8li4JisDdhaioJ35kjcHkXsobg8p2NYplPE5wpYTlE3C8rz7G7Zebc/4PLivw1gsubA7KUG+UdCOu+1Uf4e7hf8AhV1z09nZJpXlOCY3mFpYxXIZF8KexmXUqKhKQQPaJCy30V1Cef460y+/5jjnEdxO3TF9GrNqBFbjf/s03BSCbcxyAF9DRBU7tuSQnYgJ33pYcE5aL4x516G5HqNolimBNao32+Y8zij/AGRauzbSXo7naHZHKptKt9z06V0mnmvXDRqvef3O6f5ti93unIVphoZDTziQNyUIcQkr2HU8u+wqkGV41Cxn1KaGzByyLf0XC7xZ6nIqiW4rjksFcbY9QpsghQIHtubxbVtzPJ9J9bsl0HxnhYsSHs+sM+BJvN2tVlchIgsNoR2vhCyhHOApKlc3UbJUN/bbFYcE5aL4x516B2vN9IL1qBddK7ZOs72WWSOmXOtfgnK8yyoIIX1QEqH7631ST7oV12OataB5dYskybHMjx+da8QLovcpEfZELs0qUsrJQNwEpUdxuDsdt6qRx+3TIOHnWzFuJDDo5LuQWC44tOIUUjtuxUGlkjxgOJWPKWB5KrrluFaicN1vY0LsqJL69fcXsIkKcUd2Jq5I7ZpIA6ndRbIPXlcpYcE5aL4x516pQs40fuGnR1aiz7McRTEcnG6ri8jIYQSFL2UkK2BSfF18W9crAsj0u1QxpjMMAfs96s0la22pceOnlKkKKVJ2UkEEEdxAqn/G1cHcW05014MdMrNPvU67txBPttp6ynLVCSCUpHiLim1K3PTZpW/TeuNwNZtP0r1xzLh7yTB71g9pylSsmxOz3tX7/HHUOMpV3KCkIJG39QfHvSw4Jy0XxjzqwLnFhwgM3t3HZOpmKR57EhUV1t+KppKHUq5VJUtTYQNiCNydqzzI890ZxG64zZcjvGPwZeZOFqwoW0kpuChydG1hJT17VvYkgHnG2+9eVDV+y60aV69RoGjtkyHHrjlz8Ofk0spW/ZHHHVJQtDYSV7dxCwQEqUO+pi4itIVZHhvCZo/jmoMae9NhXCLbsgjLKmVudlEW042QeYNhXKkeMJA8Y2riw4Jy0Xxjzq/WoOZaRaVW2Jd9Qp9kscSfLRBjOSI4/fn1AlKEhKSSdgT3bDbrWG5zxJcLWm2TzMMzjOMetN6t/IJUN2CtS2itCVp3KGyOqVJPf3EV5866K4hNUsXsGpuu8OTYWsBv9sw2FBcbUkXKeStUyceYAHfsWxzJ3Sf+noDVkPVS8cxqNohasjbsFrau0rJ4TT9wERsSXUBh72qnducp2SOhO3tR5K5sOCctF8Y86n2NxC8MkvAZeqEbMcfXi0Cem1ybkIS+zblKSlQaI7Pm3KVpPdt1rdp3xA8NGrORjEtO8vsF7u6mFyBFZgrSoto25lbrbA6bjx1C/qjeOY7jHCFPhY1YLbaI718try2YERuO2pwq2KilAAJ2AG/kA8lddwWahY/cs1i2GXxB4Tmc+RZOSDZ7VhabXKjLQlCllUlLSecJQlSSCrr3+KlhwTlovjHnVusicwTErLLyPKE2W1WuA2XZMyWhppppPlUpQ2HUgDykgVgeFa8cNmowun7h8yxq8Ls0VydNZjMbutx2/duhsoC1JHTqkHvHlrHeOTH9P8m4eLxa9ScnumP2lUuItM+3wlzFtPhwchWyjqtvvKh02A3B3AqAuCbVXIJ+t7+mlrThme45Fx8A5vYMZVanY6EBPZx31FtHPueUcpBO5B5jsqlhwTlovjHnVrI2sHD9M02f1fjZPjjmHRllp66hgdkhYWEchTy8/NzKA5eXfqOnWuJmGuvDbgFqtN5zLMcatMe+RUTbemQxs9IjrG6XAyEdoEnfvKR4/JVMp+gtqHHQrhyZvspvTO7S0aiSccHSOuUlpZ7Hb+gVA9O7k2G26QRkHF3F0xxPiTOe2/Wu3YZmrFiYYcgZLirl0tEljkUEoaWGlpbXyhO4Cem+4IJUKWHBOWi+MedWivPEXwuY/i9pzW6Z5iyLJfXHmbfNbY7ZD7jXL2qB2aCQpPOncEAjcVuwLiF4ZNT7w9YMDzHH7xcGIjs5xhmCtJSw3tzr3W2BsNx496hzQ/IjrVwdZPkOoWjuL2VdqhXoWwxbMhiJIHgylmZHZcSS0VLJBI23KNxt3DZ6n3jeONcHMLJm7BbEXhxm9suXBMRsSVN+EPe1U7tzkbAdCe4DyUsOCctF8Y86keJxg8G06YzAiam4y4/IcS00gW932y1HYDfstupNd/qFxCcMulORrxHULMLBZbw002+uI9BWpQbWN0q3Q2R1Hx150cH+oFhxaxWpnIOITCcYgNZAX5OPXTC03CXIZ52yopmdkooCwClPtvakb1IPFNfmbDx6zrivUyw4Mg4pFR+FrzYU3eP1QD2fYKQscyvErbpsfLSw4Jy0Xxjzq8SdbuHZWm3/ABfGT2H9x/hPgf4WMNQa7bn5OTbs+bfm6d1ZZf7zpri+IyM9v7tlh49Eiia7cVtILIYIBSsEA7g7jbbffcbb71Sfiayax5T6nc9Nsuc2fLixeokaZd7RaBbI0iQJXMrljhKQghKkA7Drtv46i3UfBOJT/hhkPDVlcp1vT/Sq1y8o/dGG1BN3gpZC4EQK9yeVZV7XclPKd/8Alp3WHBOWi+MedemWLyMEzTHrfleLx7ZcLTdWEyocpuKkJeaUN0qAUkHr8YrtPwBYv7FgfdkfsqLuED8V/TH/AA3D/wBFS/XNhwTlovjHnXB/AFi/sWB92R+ytBYLEFBYssAKT1B8GRuP/qufSmyOCctF8Y86AAAAAADoAKUpXKxJSlKIlKUoiVx5ltt1x7L8IQI0nsV9o32zSV8ivKncdD8YrkUoi4862265tpauUCPLQhQWlL7SXAlQ8YBHQ9T1ozbbdGlPTo8CM1Jkbds8hpKVuf8AcoDc/rrkUoi4v4JtRkvzDbInbyUdm+72Ked1GwHKo7bqGwHQ+Stv4FswgfgoWmF4Fvv4N2COy3339xtt39e7vrmUoi4M2w2O5BoXGzQZQZTytB6OhfInyJ3HQdB3VtRjuPtw129Fit6YrigtbAioDalDuJTtsT0HWuwpRF10PHMetz4lW+w26K+kEBxmKhCgD39QN6+8y1Wu4ONuz7bFkrZO7anmUrKD8RI6fqrlUoiVWvX73/8ATj/vjf7lVWUqFOIvSrJ8wNmzbBF81/x1fO2xzAF1IUFpKd+nMlQ7j0IUfJsdgwzMQpeoDlnBoc1zbnQFzSBf0XWpY2lI83SHfZmF7mOY/ZGpDXgmw3mw03ro+PT8XK7fp8HzwrO+G1tDvD7gTTqErQvH4qVJUNwQWxuCKgXVW18SXEZjlt03lYYiwxHZLLtylvRnGGhyH3ai4fbAdSEI3JO36rW4Zi8HCcSs2H2xSlRbNBZgsqV7pSW0BIJ+M7b1qAhPbUYpIyaA2+4kG+XEelexR6lKuwVJybXgxHxnxdne1pY1o2huJOg1yXZRIEG3xhDgQmI0cb7NMtpQgb9/tQNutcZOO4+hpqOixW9LTDnbNIEVAS2v+kkbdD0HUdeldhSp60pcebbbdc0IbuMCNKQ2rnQl9pLgSrygEdD8daN2u2MvvymrdFQ9KGz7iWUhTo8ijtur9dcmlEXBFgsSYJtYssAQyrnMcRkdkVeXl223+Pat1vs1ntJWbXaYcMue78HYS3zfLygb1zKURcafbLbdGks3O3xpjaFc6UPtJcSFeUBQPXqaSLXbJchiXLt0V9+Md2HHGUqW0d990kjdPcO7yVyaURcdVtty5ybmuBGVMQnkTILSS6lPXoFbbgdT038dHbbbn5jVxegRnJTA5Wn1NJLiB16JURuO893lrkUoi4bdlszTEiM1aYSGZZJfbTHQEuk95WNtlfromzWdAihFqhpEHfwUBhI7Dfv5Ontf1bVzKURfCZAg3FpLNwhMSW0qCwh5sLSFDuIB8fx1pOt1vubIj3KBHltJUFBD7SXEhQ8exBG9cilEXwm2+BcmDFuMKPKYJBLbzaVp3HcdiNq40LHcftr4lW6xW6K8AQHGYqEKAPeNwN67ClEW1xtt5tTTzaVoUNlJUNwR8Yr4wbbbrY2pq2wI0RCjzKSw0lsE+UgAVyKURcc223GcLmYEYzAnkEjsk9qE+Tm232+Lets61Wu6BKblbYssIO6Q+ylzl+TmB2rlUoi2FhgseDFlHY8nZ9nyjl5dtttu7bbxV84kCBAjCFBhMR4432aabShA37/agbda+9KIuoGH4kFBQxe0Ag7giC1vv9WvvNx3H7k/4TcbFbpTxAT2j0VC1bDuG5G9dhSiLgiwWIQTaxZYAhlXOY/gyOyKvLy7bb/HtXKejx5LC4shht1lxPIttaQpKk+Qg9CK+lKIvnHjx4jCI0VhtlltIShttISlI8gA6AV9KUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoi//2Q==';

function generatePDF() {
  const d = gatherOfferteData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, M = 20;
  const pw = W - 2 * M;

  function eurPdf(n) { return eur(n); }

  // ---- PAGE 1: AANBIEDINGSBRIEF ----
  // Logo rechts bovenaan
  try { doc.addImage(LOGO_123BE, 'JPEG', W - M - 55, 12, 55, 18); } catch(e) {}
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Ground Research BV', M, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Vrijheidweg 45, 1521RP Wormerveer', M, 32);

  // Lijn
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(M, 36, W - M, 36);

  // Klantgegevens links
  let y = 48;
  doc.setFontSize(10);
  if (d.klantNaam) { doc.text(d.klantNaam, M, y); y += 5; }
  if (d.tav) { doc.text('T.a.v. ' + d.tav, M, y); y += 5; }
  if (d.locatie) { doc.text(d.locatie, M, y); y += 5; }

  // Kenmerk/datum rechts
  doc.setFontSize(9);
  doc.text('Ons kenmerk: ' + (d.kenmerk || '-'), W - M, 48, { align: 'right' });
  doc.text('Datum: ' + formatDate(d.datum), W - M, 54, { align: 'right' });

  // Betreft
  y = Math.max(y, 64) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Betreft: ' + d.betreft, M, y);

  // Aanhef
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Geachte heer/mevrouw,', M, y);
  y += 8;

  const introText = 'Conform uw verzoek/aanvraag ontvangt u hierbij ons voorstel betreffende het plaatsen van een verticaal bodemwarmtewisselaar systeem voor een water/water warmtepomp.';
  const lines = doc.splitTextToSize(introText, pw);
  doc.text(lines, M, y);
  y += lines.length * 5 + 8;

  // Specificaties
  doc.setFont('helvetica', 'bold');
  doc.text('Specificaties:', M, y); y += 6;
  doc.setFont('helvetica', 'normal');
  const specs = [
    `Maximaal vermogen warmtepomp: ${d.vermogen} KW`,
    `Bodemzijdig vermogen: ${d.bodemvermogen.toFixed(2)} KW`,
    `Totaal boormeters: ${d.meters} m`,
    `Meters per boring: ${d.mpb.toFixed(1)} m`,
    `Aantal boringen: ${d.boringen}`,
    `Diameter bodemwarmtewisselaar: ${d.diameter}mm`,
    `Aantal pompen: ${d.pompen}`
  ];
  specs.forEach(s => { doc.text('•  ' + s, M + 4, y); y += 5.5; });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const bedragTekst = `Het totaalbedrag van deze offerte bedraagt: ${eurPdf(d.total)} exclusief BTW`;
  doc.text(bedragTekst, M, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Met vriendelijke groet,', M, y); y += 6;
  doc.text('Ground Research BV', M, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Pim Groot', M, y);

  // ---- PAGE 2: KOSTENSPECIFICATIE ----
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Kostenspecificatie', M, 25);
  doc.setDrawColor(30, 58, 95);
  doc.line(M, 29, W - M, 29);

  y = 38;
  doc.setFontSize(10);

  // Table header
  doc.setFillColor(30, 58, 95);
  doc.rect(M, y - 5, pw, 8, 'F');
  doc.setTextColor(255);
  doc.text('Omschrijving', M + 3, y);
  doc.text('Bedrag', W - M - 3, y, { align: 'right' });
  doc.setTextColor(0);
  y += 8;

  doc.setFont('helvetica', 'normal');
  const costLabels = {
    boorkosten: 'Boorkosten', lussen: 'Prijs Lussen', grout: 'Grout',
    gewichten: 'Gewichten', verdelerput: 'Verdelerput', aansluiten: 'Aansluiten bronnen',
    glycol: 'Glycol', graafwerk: 'Graafwerk + kraan', transport: 'Transport',
    barogel: 'Barogel', ezmud: 'EZ Mud', olo: 'OLO melding'
  };

  let even = false;
  COST_ITEMS.forEach(item => {
    if (even) { doc.setFillColor(245, 247, 250); doc.rect(M, y - 4.5, pw, 7, 'F'); }
    doc.text(costLabels[item.key] || item.key, M + 3, y);
    doc.text(eurPdf(d.costs[item.key] || 0), W - M - 3, y, { align: 'right' });
    y += 7;
    even = !even;
  });
  // Custom artikelen
  if (d.customArtikelen && d.customArtikelen.length) {
    d.customArtikelen.forEach(art => {
      if (even) { doc.setFillColor(245, 247, 250); doc.rect(M, y - 4.5, pw, 7, 'F'); }
      doc.text(art.naam || 'Extra artikel', M + 3, y);
      doc.text(eurPdf(art.bedrag), W - M - 3, y, { align: 'right' });
      y += 7;
      even = !even;
    });
  }

  // Total
  y += 3;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.8);
  doc.line(M, y, W - M, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAAL EXCL. BTW', M + 3, y);
  doc.text(eurPdf(d.total), W - M - 3, y, { align: 'right' });

  // ---- PAGE 3: VOORWAARDEN ----
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Uitgangspunten & Voorwaarden', M, 25);
  doc.setDrawColor(30, 58, 95);
  doc.line(M, 29, W - M, 29);

  y = 40;
  doc.setFontSize(11);
  doc.text('Uitgangspunten', M, y); y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const uitgangspunten = [
    `Aantal warmtepompen: ${d.pompen}`,
    `Vermogen: ${d.vermogen} KW`,
    `Bodemzijdig vermogen: ${d.bodemvermogen.toFixed(2)} KW`,
    `Totaal boormeters: ${d.meters} m in ${d.boringen} boring(en)`,
    `Bevoegd gezag: ${d.bevoegd}`
  ];
  uitgangspunten.forEach(t => { doc.text('•  ' + t, M + 4, y); y += 5.5; });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Algemene Voorwaarden', M, y); y += 8;
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
    'Scheidende lagen worden afgedicht volgens de richtlijnen van BRL2100.'
  ];

  voorwaarden.forEach(v => {
    const vlines = doc.splitTextToSize('•  ' + v, pw - 8);
    doc.text(vlines, M + 4, y);
    y += vlines.length * 4.5 + 2;
    if (y > 270) { doc.addPage(); y = 25; }
  });

  // Save/download
  const filename = `Offerte_${d.kenmerk || 'draft'}_${d.klantNaam || 'klant'}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('nl-NL');
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================================
// INIT
// ============================================================
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
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
