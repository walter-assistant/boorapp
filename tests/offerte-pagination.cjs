// Run with node tests/offerte-pagination.cjs (Playwright required).
// Optional: BOORAPP_SOURCE, JSPDF_PATH and PDF_OUTPUT for before/after inspection.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const source = fs.readFileSync(process.env.BOORAPP_SOURCE || path.join(__dirname, '../public/boorapp.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag(process.env.JSPDF_PATH
      ? { path: process.env.JSPDF_PATH }
      : { url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' });
    const results = await page.evaluate(source => {
      const priceCode = source.slice(source.indexOf('const COST_ITEMS ='), source.indexOf('function setClusterParam('));
      // Only load declarations needed by calculateCluster, not the app's UI initialization.
      const constants = priceCode.slice(0, priceCode.indexOf('let costValues'));
      const calculate = source.slice(source.indexOf('function calculateCluster('), source.indexOf('function setClusterParam('));
      const pdfCode = source.slice(source.indexOf('const FLYER_123BE_A4'), source.indexOf('// INIT', source.indexOf('function generatePDF')));
      const eurCode = source.slice(source.indexOf('function eur('), source.indexOf('function parseEur('));
      const NativePDF = window.jspdf.jsPDF;
      const results = [];
      for (const scenario of ['single', 'sixteen', 'long-descriptions']) {
        let recorded, bytes;
        window.jspdf.jsPDF = function (...args) {
          const doc = new NativePDF(...args);
          recorded = [];
          const text = doc.text.bind(doc);
          doc.text = (value, x, y, options) => {
            recorded.push({ value: String(value), x, y, page: doc.internal.getCurrentPageInfo().pageNumber });
            return text(value, x, y, options);
          };
          doc.save = () => { bytes = doc.output('datauristring').split(',')[1]; };
          return doc;
        };
        const count = scenario === 'single' ? 1 : 16;
        const clusters = Array.from({ length: count }, (_, i) => ({
          label: i < 10 ? `Kavel ${i + 1}` : `App ${i - 9}`,
          vermogen: i < 10 ? 8 : 6, boringen: 1, diepte: i < 10 ? 200 : 165,
          diameter: 40, luslengte: i < 10 ? 200 : 165,
          params: { boorPrijsPerMeter: 13, prijsPerLus: i < 10 ? 1000 : 920,
            groutZakken: i < 10 ? 4 : 3, groutPrijsPerZak: 425,
            gewichtenAantal: 2, gewichtenPrijs: 120, aansluitenPrijs: 750,
            glycolLiters: i < 10 ? 101 : 83, glycolPrijs: 3.2,
            barogelZakken: i < 10 ? 8 : 7, barogelPrijs: 17 }
        }));
        if (scenario === 'long-descriptions') clusters[0].label = 'Lange clusternaam met meerdere woningen en technische omschrijving '.repeat(3);
        const data = { clusters, klantNaam: 'PDF regressietest', kenmerk: 'TEST', datum: '2026-10-02',
          locatie: 'Testlocatie', betreft: 'Boring voor bodemenergiesysteem', total: count === 16 ? 103779.60 : 8749.20,
          projectKosten: { transport: 2000, graafwerk: 0, olo: 0 },
          vrijeRegels: scenario === 'long-descriptions' ? Array.from({ length: 45 }, (_, i) => ({ naam: `Extra regel ${i + 1}: ` + 'lange omschrijving '.repeat(i === 0 ? 1000 : 12), bedrag: 10 })) : [] };
        const defaults = { boorkosten: {}, lussen: {}, grout: {}, gewichten: {}, verdelerput: {}, aansluiten: {}, glycol: {}, barogel: {} };
        new Function('costParams', 'gatherOfferteData', 'saveOfferte', 'uploadToDropbox', 'makeDropboxProjectRef',
          constants + calculate + eurCode + pdfCode + '\ngeneratePDF();')(
          defaults, () => data, () => {}, () => {}, () => 'TEST');
        results.push({ scenario, recorded, bytes, labels: clusters.map(c => c.label), freeCount: data.vrijeRegels.length });
      }
      return results;
    }, source);
    for (const result of results) {
      const costPages = new Set(result.recorded.filter(t => t.value === 'KOSTENSPECIFICATIE').map(t => t.page));
      const rows = result.recorded.filter(t => costPages.has(t.page) && t.y > 52 && !t.value.startsWith('123Bodemenergie is onderdeel'));
      assert(rows.every(t => t.y <= 278), `${result.scenario}: content below footer boundary: ${JSON.stringify(rows.filter(t => t.y > 278))}`);
      assert(rows.every(t => t.x >= 20 && t.x <= 190), 'Content outside horizontal margins');
      assert.equal(rows.filter(t => t.value === 'TOTAAL EXCL. BTW').length, 1);
      for (const label of result.labels.filter(label => label.length < 40)) {
        const subtotal = rows.filter(t => t.value === label + ' subtotaal');
        assert.equal(subtotal.length, 1, `Missing subtotal for ${label}`);
        const title = rows.find(t => t.value.startsWith(label + ' - '));
        assert.equal(title.page, subtotal[0].page, `Cluster split: ${label}`);
      }
      if (result.scenario === 'sixteen') {
        for (const label of ['Boorkosten', 'Prijs Lussen', 'Grout', 'Gewichten', 'Verdelerput', 'Aansluiten bronnen', 'Glycol', 'Barogel']) {
          assert.equal(rows.filter(t => t.value === label).length, 16, `Missing ${label}`);
        }
        assert(rows.some(t => t.value === '€ 103.779,60'), 'Total amount changed');
        if (process.env.PDF_OUTPUT) fs.writeFileSync(process.env.PDF_OUTPUT, Buffer.from(result.bytes, 'base64'));
      }
      if (result.freeCount) assert.equal(rows.filter(t => t.value.startsWith('Extra regel 45:')).length, 2);
      console.log(`PASS ${result.scenario}: ${costPages.size} cost pages, all rows inside margins`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
