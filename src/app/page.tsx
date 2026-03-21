'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, loadUserData, saveUserData, saveAllUserData, DATA_KEYS } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const scriptLoaded = useRef(false);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setDataLoaded(false);
        scriptLoaded.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase when session is available
  useEffect(() => {
    if (!session) return;
    const init = async () => {
      await loadUserData(session.user.id);
      // Set up the Supabase save function for the app JS
      (window as any).__supabaseSave = (key: string, value: unknown) => {
        saveUserData(session.user.id, key, value);
      };
      (window as any).__supabaseUserId = session.user.id;
      setDataLoaded(true);
    };
    init();
  }, [session]);

  // Load the boorapp script after HTML is rendered and data is loaded
  useEffect(() => {
    if (!dataLoaded || scriptLoaded.current) return;
    scriptLoaded.current = true;

    // Remove any existing script
    const existing = document.getElementById('boorapp-script');
    if (existing) existing.remove();

    // Load jsPDF first, then the app script
    const jspdfScript = document.createElement('script');
    jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    jspdfScript.async = false;
    jspdfScript.onload = () => {
      const script = document.createElement('script');
      script.id = 'boorapp-script';
      script.src = '/boorapp.js';
      script.async = false;
      document.body.appendChild(script);
    };
    document.body.appendChild(jspdfScript);

    return () => {};
  }, [dataLoaded]);

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (!dataLoaded) return <LoadingScreen message="Data laden..." />;

  return <BoorAppShell userEmail={session.user.email || ''} />;
}

// ============= LOGIN =============
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check je email voor de bevestigingslink! (Of log direct in als email confirmatie uit staat)');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.logo}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔧</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>BoorApp</h1>
        <p style={{ opacity: 0.85, fontSize: '0.85rem' }}>Ground Research BV</p>
      </div>
      <div style={loginStyles.card}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', marginBottom: 20, color: '#1e3a5f' }}>
          {isRegister ? '📝 Account aanmaken' : '🔐 Inloggen'}
        </h2>
        <form onSubmit={handleSubmit}>
          <label style={loginStyles.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jouw@email.nl" required style={loginStyles.input} />
          <label style={{ ...loginStyles.label, marginTop: 12 }}>Wachtwoord</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ ...loginStyles.input, marginBottom: 16 }} />
          {error && <div style={loginStyles.error}>⚠️ {error}</div>}
          {message && <div style={loginStyles.success}>✅ {message}</div>}
          <button type="submit" disabled={submitting} style={{ ...loginStyles.button, background: submitting ? '#ccc' : '#1e3a5f', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '⏳ Even geduld...' : (isRegister ? '📝 Registreren' : '🔐 Inloggen')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }} style={loginStyles.toggleBtn}>
            {isRegister ? '← Terug naar inloggen' : 'Nog geen account? Registreer hier'}
          </button>
        </div>
      </div>
    </div>
  );
}

const loginStyles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1b2a 0%, #1e3a5f 40%, #4da6ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' },
  logo: { textAlign: 'center', marginBottom: 32, color: '#fff' },
  card: { background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#757575', marginBottom: 4 },
  input: { width: '100%', padding: 12, border: '2px solid #e0e0e0', borderRadius: 14, fontSize: '0.9rem', marginBottom: 12, boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  button: { width: '100%', padding: 14, color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit' },
  error: { background: '#ffebee', color: '#c62828', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' as const },
  success: { background: '#e8f5e9', color: '#2e7d32', padding: 10, borderRadius: 10, fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' as const },
  toggleBtn: { background: 'none', border: 'none', color: '#1e3a5f', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};

// ============= LOADING =============
function LoadingScreen({ message = 'Laden...' }: { message?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d1b2a 0%, #1e3a5f 40%, #4da6ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔧</div>
      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{message}</div>
    </div>
  );
}

// ============= APP SHELL =============
function BoorAppShell({ userEmail }: { userEmail: string }) {
  const handleLogout = async () => {
    const userId = (window as any).__supabaseUserId;
    if (userId) await saveAllUserData(userId);
    await supabase.auth.signOut();
    DATA_KEYS.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOORAPP_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BOORAPP_HTML }} />
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
        <button onClick={handleLogout} title={`Uitloggen (${userEmail})`}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>
          🚪 Uitloggen
        </button>
      </div>
    </>
  );
}

// ============= CSS =============
const BOORAPP_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; min-height: 100vh; }
.header { background: #1e3a5f; color: white; padding: 18px 30px; display: flex; align-items: center; justify-content: space-between; }
.header h1 { font-size: 22px; font-weight: 700; }
.header .sub { font-size: 13px; opacity: 0.8; }
.tabs { display: flex; background: #163252; }
.tab { padding: 12px 28px; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 3px solid transparent; transition: all 0.2s; }
.tab:hover { color: white; background: rgba(255,255,255,0.05); }
.tab.active { color: white; border-bottom-color: #4da6ff; background: rgba(255,255,255,0.08); }
.container { max-width: 1400px; margin: 0 auto; padding: 20px; }
.tab-content { display: none; }
.tab-content.active { display: block; }
.two-col { display: grid; grid-template-columns: 1fr 420px; gap: 20px; align-items: start; }
.panel { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.panel h2 { font-size: 17px; color: #1e3a5f; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e8ecf1; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.form-row.full { grid-template-columns: 1fr; }
.form-group { display: flex; flex-direction: column; }
.form-group label { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
.form-group input, .form-group select { padding: 8px 10px; border: 1px solid #d0d5dd; border-radius: 5px; font-size: 14px; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #4da6ff; box-shadow: 0 0 0 2px rgba(77,166,255,0.15); }
.form-group input[readonly] { background: #f5f7fa; color: #666; }
.toggle-group { display: flex; align-items: center; gap: 10px; padding-top: 20px; }
.toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
.toggle input { display: none; }
.toggle .slider { position: absolute; inset: 0; background: #ccc; border-radius: 12px; transition: 0.3s; }
.toggle .slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .slider { background: #1e3a5f; }
.toggle input:checked + .slider::before { transform: translateX(20px); }
.cost-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
.cost-row:last-child { border-bottom: none; }
.cost-row .label { font-size: 13px; color: #555; flex: 1; }
.cost-row .detail { font-size: 11px; color: #999; margin-left: 4px; }
.cost-row input { width: 110px; text-align: right; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; font-weight: 500; }
.cost-row input:focus { border-color: #4da6ff; outline: none; }
.cost-row .auto { font-size: 10px; color: #4da6ff; cursor: pointer; margin-left: 4px; }
.cost-total { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 4px; margin-top: 8px; border-top: 3px solid #1e3a5f; }
.cost-total .label { font-size: 16px; font-weight: 700; color: #1e3a5f; }
.cost-total .amount { font-size: 22px; font-weight: 700; color: #1e3a5f; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #1e3a5f; color: white; }
.btn-primary:hover { background: #2a4f7f; }
.btn-success { background: #2e7d32; color: white; }
.btn-success:hover { background: #388e3c; }
.btn-danger { background: #c62828; color: white; }
.btn-danger:hover { background: #d32f2f; }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-group { display: flex; gap: 10px; margin-top: 16px; }
table { width: 100%; border-collapse: collapse; }
th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
td { padding: 10px 12px; border-bottom: 1px solid #e8ecf1; font-size: 13px; }
tr:nth-child(even) { background: #f8f9fb; }
tr:hover { background: #eef3fa; }
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
.modal-overlay.active { display: flex; }
.modal { background: white; border-radius: 10px; padding: 28px; width: 500px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal h3 { font-size: 18px; color: #1e3a5f; margin-bottom: 16px; }
.empty-state { text-align: center; padding: 40px; color: #999; }
.empty-state p { font-size: 15px; }
.badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.badge-blue { background: #e3f2fd; color: #1565c0; }
.offerte-card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: box-shadow 0.2s; }
.offerte-card:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.15); }
.offerte-info h3 { font-size: 15px; color: #1e3a5f; }
.offerte-info p { font-size: 12px; color: #888; margin-top: 3px; }
.offerte-amount { font-size: 18px; font-weight: 700; color: #1e3a5f; }
.offerte-actions { display: flex; gap: 6px; margin-left: 12px; }
@media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
`;

// ============= HTML =============
const BOORAPP_HTML = `
<div class="header">
  <div>
    <h1>Ground Research BV</h1>
    <div class="sub">Vrijheidweg 45, 1521RP Wormerveer</div>
  </div>
  <div style="text-align:right">
    <div class="sub">Offerte & Calculatie Tool</div>
  </div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('offerte')">Nieuwe Offerte</div>
  <div class="tab" onclick="switchTab('klanten')">Klantenlijst</div>
  <div class="tab" onclick="switchTab('opgeslagen')">Opgeslagen Offertes</div>
  <div class="tab" onclick="switchTab('pva')">Plan van Aanpak</div>
</div>

<div class="container">

  <!-- TAB: NIEUWE OFFERTE -->
  <div id="tab-offerte" class="tab-content active">
    <div class="two-col">
      <div class="panel">
        <h2>Offerte Gegevens</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Klantnaam</label>
            <select id="f-klant" onchange="onKlantSelect()">
              <option value="">-- Selecteer klant --</option>
              <option value="__new__">+ Nieuwe klant</option>
            </select>
          </div>
          <div class="form-group">
            <label>T.a.v.</label>
            <input type="text" id="f-tav" placeholder="Contactpersoon">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ons Kenmerk</label>
            <input type="text" id="f-kenmerk" placeholder="35-2025-009">
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" id="f-datum">
          </div>
        </div>
        <div class="form-row full">
          <div class="form-group">
            <label>Betreft</label>
            <select id="f-betreft">
              <option>Boring voor bodemenergiesysteem</option>
              <option>Boren voor milieuwerkzaamheden</option>
              <option>Waterbron boren</option>
              <option>Bodemonderzoek/Sonderingen</option>
              <option>Filtersplaatsen voor bronneringswerkzaamheden</option>
            </select>
          </div>
        </div>
        <h2 style="margin-top:20px">Technische Specificaties</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Max. vermogen warmtepomp (KW)</label>
            <input type="number" id="f-vermogen" value="8" step="0.1" oninput="calc()">
          </div>
          <div class="form-group">
            <label>Factor</label>
            <input type="number" id="f-factor" value="0.8" step="0.05" oninput="calc()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Bodemzijdig vermogen (KW)</label>
            <input type="number" id="f-bodemvermogen" readonly>
          </div>
          <div class="form-group">
            <label>Aantal pompen</label>
            <input type="number" id="f-pompen" value="1" min="1" oninput="calc()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Aantal boringen</label>
            <input type="number" id="f-boringen" value="1" min="1" oninput="calc()">
          </div>
          <div class="form-group">
            <label>Totaal boormeters</label>
            <input type="number" id="f-meters" value="225" min="1" oninput="calc()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Meters per boring</label>
            <input type="number" id="f-mpb" readonly>
          </div>
          <div class="form-group">
            <label>Diameter bodemwarmtewisselaar</label>
            <select id="f-diameter" onchange="updateLusOpties(); calc()">
              <option value="32">32mm</option>
              <option value="40" selected>40mm</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Luslengte (rollengte)</label>
            <select id="f-luslengte" onchange="calc()"></select>
          </div>
          <div class="form-group">
            <label>Locatie boringen</label>
            <input type="text" id="f-locatie" placeholder="Adres boorlocatie">
            <div style="margin-top:6px; display:flex; gap:8px; align-items:center;">
              <button class="btn btn-primary" style="padding:6px 14px; font-size:12px; background:#2d7d46;" onclick="startWKO()">🌍 WKO Rapport</button>
              <span id="wko-status" style="font-size:11px; color:#666;"></span>
            </div>
            <div id="wko-progress" style="display:none; margin-top:8px; padding:10px; background:#f0f7ff; border-radius:6px; border:1px solid #d0e3f7;">
              <div style="font-size:12px; font-weight:600; color:#1e3a5f; margin-bottom:6px;">WKO Tool</div>
              <div id="wko-log" style="font-size:11px; color:#555; max-height:120px; overflow-y:auto;"></div>
              <div id="wko-result" style="margin-top:8px; display:none;"></div>
            </div>
          </div>
          <div class="form-group">
            <div class="toggle-group">
              <label class="toggle">
                <input type="checkbox" id="f-verdelerput" onchange="calc()">
                <span class="slider"></span>
              </label>
              <span style="font-size:13px;font-weight:500;">Aansluiten op verdelerput</span>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefoonnummer klant</label>
            <input type="tel" id="f-telefoon" placeholder="06-12345678">
          </div>
          <div class="form-group">
            <label>Bevoegd gezag</label>
            <select id="f-bevoegd">
              <option>Omgevingsdienst NHN</option>
              <option>Omgevingsdienst Noordzeekanaal</option>
              <option>Omgevingsdienst de Vallei</option>
              <option>Omgevingsdienst Utrecht</option>
              <option>Omgevingsdienst Haaglanden</option>
              <option>Omgevingsdienst Zuid Holland Zuid</option>
              <option>Omgevingsdienst Midden Holland</option>
              <option>Omgevingsdienst Flevoland & Gooi en Vechtstreek</option>
              <option>Omgevingsdienst IJmond</option>
              <option>Omgevingsdienst West Holland</option>
            </select>
          </div>
        </div>
      </div>

      <!-- RECHTERKOLOM: KOSTENBEREKENING -->
      <div class="panel" id="calc-panel">
        <h2>Kostenberekening</h2>
        <div id="cost-rows"></div>
        <div id="custom-cost-rows"></div>
        <div style="margin-top:8px;">
          <button class="btn btn-sm btn-primary" onclick="addCustomArtikel()" style="font-size:11px; padding:5px 12px;">+ Artikel toevoegen</button>
        </div>
        <div class="cost-total">
          <span class="label">TOTAAL EXCL. BTW</span>
          <span class="amount" id="cost-total">€ 0,00</span>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="saveOfferte()">💾 Offerte Opslaan</button>
          <button class="btn btn-success" onclick="generatePDF()">📄 Genereer PDF</button>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: KLANTENLIJST -->
  <div id="tab-klanten" class="tab-content">
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;border:none;padding:0;">Klantenlijst</h2>
        <button class="btn btn-primary btn-sm" onclick="openKlantModal()">+ Klant Toevoegen</button>
      </div>
      <table>
        <thead>
          <tr><th>Bedrijf</th><th>Contactpersoon</th><th>Telefoon</th><th>Adres</th><th>Certificaat</th><th style="width:120px">Acties</th></tr>
        </thead>
        <tbody id="klanten-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- TAB: OPGESLAGEN OFFERTES -->
  <div id="tab-opgeslagen" class="tab-content">
    <div class="panel">
      <h2>Opgeslagen Offertes</h2>
      <div id="offertes-list"></div>
    </div>
  </div>

  <!-- TAB: PLAN VAN AANPAK -->
  <div id="tab-pva" class="tab-content">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
      <!-- LINKER KOLOM -->
      <div>
        <div class="panel">
          <h2>Plan van Aanpak BRL2100 / BRL11000</h2>
          <div style="margin-bottom:10px; padding:8px 12px; background:#e3f2fd; border-radius:6px; font-size:12px; color:#1565c0;">
            💡 Klik "🔄 Vul vanuit offerte" om data over te nemen. Alle 7 BRL-eisen + risico-analyse.
          </div>
          <div class="form-row">
            <div class="form-group"><label>Klantnaam</label><input type="text" id="pva-klant" placeholder="Klantnaam"></div>
            <div class="form-group"><label>Projectnummer</label><input type="text" id="pva-projectnr" placeholder="35-2025-009"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Projectleider klant</label><input type="text" id="pva-projectleider" placeholder="Contactpersoon klant"></div>
            <div class="form-group"><label>Telefoonnummer klant</label><input type="text" id="pva-telefoon" placeholder="06-..."></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Bevoegd gezag</label><input type="text" id="pva-bevoegd" placeholder="Omgevingsdienst"></div>
            <div class="form-group"><label>Datum uitvoering</label><input type="date" id="pva-datum"></div>
          </div>
          <div class="form-row full">
            <div class="form-group"><label>Locatie opdracht</label><input type="text" id="pva-locatie" placeholder="Adres"></div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Personeel op locatie</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Ploeg 1</label>
              <div id="pva-ploeg1" style="display:flex; flex-direction:column; gap:4px;"></div>
            </div>
            <div class="form-group">
              <label>Ploeg 2</label>
              <div id="pva-ploeg2" style="display:flex; flex-direction:column; gap:4px;"></div>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 1: Doel en ontwerp van de boring</h2>
          <div class="form-row full">
            <div class="form-group">
              <label>Doel werkzaamheden</label>
              <select id="pva-doel">
                <option>Boring voor bodemenergiesysteem</option>
                <option>Boren voor milieuwerkzaamheden</option>
                <option>Waterbron boren</option>
                <option>Filtersplaatsen voor bronneringswerkzaamheden</option>
                <option>Peilbuizen plaatsen</option>
                <option>Voorboren voor sonderwagen</option>
              </select>
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Beschrijving werkzaamheden</label>
              <input type="text" id="pva-beschrijving" placeholder="bijv. 2X150">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Scope</label>
              <select id="pva-scope">
                <option value="A">Scope A — Verdringt boren (Sonisch)</option>
                <option value="B">Scope B — Waterdrukboren (Spoelboren)</option>
              </select>
            </div>
            <div class="form-group">
              <label>BRL Scope</label>
              <div style="display:flex; flex-direction:column; gap:4px; padding:6px 0;">
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL2001"> BRL2001</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL2002"> BRL2002</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL2003"> BRL2003</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL2018"> BRL2018</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL2100" checked> BRL2100</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="BRL11000" checked> BRL11000 Scope 3b werk</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-brl-cb" value="GeenBRL"> Geen BRL werk</label>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bodemopbouw DinoLoket gecheckt?</label>
              <select id="pva-dinoloket"><option>Ja</option><option>Nee</option><option>NVT</option></select>
            </div>
            <div class="form-group">
              <label>Casing tot (m) zetten</label>
              <input type="number" id="pva-casing" value="5">
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Verwachte bodemopbouw (uit DinoLoket)</label>
              <textarea id="pva-bodemopbouw" rows="4" style="width:100%;padding:8px 10px;border:1px solid #d0d5dd;border-radius:5px;font-size:13px;font-family:inherit;resize:vertical;" placeholder="0-2m: Klei&#10;2-15m: Fijn zand&#10;15-40m: Klei (scheidende laag)&#10;40-225m: Grof zand"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Verwachte grondwaterstand (m-mv)</label>
              <input type="text" id="pva-grondwaterstand" placeholder="bijv. 1,5 m-mv">
            </div>
            <div class="form-group">
              <label>Scheidende lagen verwacht?</label>
              <select id="pva-scheidendelagen">
                <option>Ja — afdichten conform BRL2100</option>
                <option>Nee</option>
                <option>Onbekend — beoordelen tijdens boring</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Boormethode & Materiaal</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Type boormethode</label>
              <select id="pva-boormethode">
                <option>Soniche boorstelling type ML</option>
                <option>Soniche boorstelling type ML250</option>
                <option>Spoelboren</option>
                <option>Handmatig</option>
              </select>
            </div>
            <div class="form-group">
              <label>Kraan mee voor graafwerk?</label>
              <select id="pva-kraan"><option>Ja</option><option>Nee</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Boorbuis type</label>
              <select id="pva-boorbuis">
                <option>GP63 ID 40mm / OD 63mm</option>
                <option>GP88 ID 65mm / OD 88mm</option>
                <option>GP100TR ID 75mm / OD 107mm</option>
                <option>GD3 Inch ID 44mm / OD 76mm</option>
                <option>GD 4 Inch ID 70mm / OD 105mm</option>
                <option>GD 4,5 Inch ID 83mm / OD 114mm</option>
                <option>GD 7 Inch ID 150 / OD 180 bit 200mm</option>
                <option>Spoelboorbuis bit diameter 140mm</option>
                <option>Spoelboorbuis bit diameter 150mm</option>
                <option>Custom buis</option>
              </select>
            </div>
            <div class="form-group">
              <label>Filterbuis materiaal</label>
              <select id="pva-filterbuis">
                <option>PVC</option>
                <option>HDPE</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Filterbuis diameter</label>
              <select id="pva-filterdiameter">
                <option>32mm</option>
                <option value="40mm" selected>40mm</option>
                <option>50mm</option>
                <option>63mm</option>
                <option>110mm</option>
              </select>
            </div>
            <div class="form-group">
              <label>Aantal bodemenergie lussen</label>
              <input type="number" id="pva-lussen" value="2">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Totale boordiepte (m)</label>
              <input type="number" id="pva-boordiepte" value="225">
            </div>
            <div class="form-group">
              <label>Diepte per lus (m)</label>
              <input type="number" id="pva-diepteperlus" value="225">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Boorvloeistof / spoelwater</label>
              <select id="pva-boorvloeistof">
                <option>Leidingwater</option>
                <option>Leidingwater + Barogel</option>
                <option>Leidingwater + EZ Mud</option>
                <option>Geen (droog boren)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Opvang/afvoer spoelwater</label>
              <select id="pva-spoelwaterafvoer">
                <option>Opvang in container, afvoer door GR</option>
                <option>Opvang in container, afvoer door opdrachtgever</option>
                <option>Lozen op terrein (indien toegestaan)</option>
                <option>Lozen op riool (indien toegestaan)</option>
                <option>NVT</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Grout & Afdichting (BRL2100/11000)</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Type groutpomp</label>
              <select id="pva-groutpomp">
                <option>Wormpomp PFT</option>
                <option>Handmixer</option>
                <option>Voormixer</option>
              </select>
            </div>
            <div class="form-group">
              <label>Mengverhouding</label>
              <input type="text" id="pva-mengverhouding" value="Zie product blad of Grout map">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Afdichtingsmateriaal</label>
              <select id="pva-afdichting">
                <option>Gecertificeerd Grout</option>
                <option>Mikoliet</option>
                <option>Grind</option>
              </select>
            </div>
            <div class="form-group">
              <label>Thermische geleidbaarheid grout</label>
              <select id="pva-groutgeleidbaarheid">
                <option>Standaard (≥ 0,8 W/mK)</option>
                <option>Thermisch verbeterd (≥ 2,0 W/mK)</option>
                <option>Hoog thermisch (≥ 2,3 W/mK)</option>
                <option>Onbekend — zie productblad</option>
              </select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>BRL11000: Lussysteem & Druktest</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Glycol type</label>
              <select id="pva-glycoltype">
                <option>Ethyleenglycol</option>
                <option>Propyleenglycol</option>
                <option>Geen glycol</option>
              </select>
            </div>
            <div class="form-group">
              <label>Glycol concentratie</label>
              <select id="pva-glycolconc">
                <option>30% glycol / 70% water</option>
                <option>25% glycol / 75% water</option>
                <option>35% glycol / 65% water</option>
                <option>Anders</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Druktest druk (bar)</label>
              <input type="number" id="pva-druktestbar" value="3" step="0.5">
            </div>
            <div class="form-group">
              <label>Druktest duur (min)</label>
              <input type="number" id="pva-druktestmin" value="20">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Circulatietijd per lus (min)</label>
              <input type="number" id="pva-circulatietijd" value="20">
            </div>
            <div class="form-group">
              <label>Oplevering druk</label>
              <select id="pva-opleverdruk">
                <option>Drukloos</option>
                <option>Op druk (1 bar)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- RECHTER KOLOM -->
      <div>
        <div class="panel">
          <h2>Voorzieningen op locatie</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Werkwater aanwezig?</label>
              <select id="pva-werkwater">
                <option>Ja</option>
                <option>Nee</option>
                <option>IBC mee</option>
                <option>Blauwvatten mee</option>
              </select>
            </div>
            <div class="form-group">
              <label>Werkstroom aanwezig?</label>
              <select id="pva-werkstroom">
                <option>Ja 220V</option>
                <option>Ja 380V</option>
                <option>Nee</option>
                <option>Aggregaat mee</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Uitkomende grond</label>
              <select id="pva-grond">
                <option>Achterlaten op locatie</option>
                <option>Meenemen</option>
                <option>Naar eigen inzicht</option>
                <option>Afvoer geregeld door opdrachtgever</option>
                <option>Opdrachtgever heeft container geregeld</option>
                <option>NVT</option>
              </select>
            </div>
            <div class="form-group">
              <label>Verloren casing plaatsen?</label>
              <select id="pva-verlorencasing"><option>Nee</option><option>Ja</option><option>NVT</option></select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 2: Wettelijke eisen</h2>
          <div class="form-row">
            <div class="form-group">
              <label>OLO melding gedaan?</label>
              <select id="pva-olo"><option>Ja</option><option>Nee</option><option>NVT</option></select>
            </div>
            <div class="form-group">
              <label>Keur gecheckt (beschermd gebied)?</label>
              <select id="pva-keur"><option>Ja</option><option>Nee</option><option>NVT</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bodemloket gecheckt?</label>
              <select id="pva-bodemloket"><option>Ja</option><option>Nee</option><option>NVT</option></select>
            </div>
            <div class="form-group">
              <label>Bestaand bodemonderzoek?</label>
              <select id="pva-bodemonderzoek"><option>Nee</option><option>Ja</option><option>NVT</option></select>
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Bodemloket bevindingen</label>
              <input type="text" id="pva-bodemloketinfo" value="Geen informatie in bodemloket of bij omgevingsdienst, locatie word beschouwd als onverdacht">
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Richtlijnen lozen spoelwater</label>
              <input type="text" id="pva-lozingsrichtlijn" placeholder="Conform vergunning / waterschap">
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Andere wettelijke eisen?</label>
              <select id="pva-andereeisen"><option>Nee</option><option>Ja</option><option>NVT</option></select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 3: Veiligheid & Arbeidsomstandigheden</h2>
          <div style="font-size:12px; margin-bottom:10px;">
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-pbm" checked> Standaard PBM's (helm, werkschoenen, werkkleding, handschoenen, bril)</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-pid"> PID meter</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-gasmasker"> Gasmasker P3</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-overall"> Saneringsoverall verplicht</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-instructie" checked> Instructiefilm kijken voor werkzaamheden</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-beleid"> Specifiek beleid op locatie</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-v-gehoorbescherming" checked> Gehoorbescherming (bij sonisch boren)</label>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 4: Kabels en leidingen</h2>
          <div class="form-row">
            <div class="form-group">
              <label>KLIC melding gedaan?</label>
              <select id="pva-klic"><option>Ja</option><option>Nee</option><option>NVT</option></select>
            </div>
            <div class="form-group">
              <label>KLIC verantwoordelijk</label>
              <select id="pva-klicverantw"><option>Ground Research</option><option>Opdrachtgever</option></select>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 5: Kwaliteitsborging tijdens uitvoering</h2>
          <div style="font-size:12px;">
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-boorstaat" checked> Boorstaat bijhouden (diepte, grondsoort, bijzonderheden)</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-grondmonster" checked> Grondmonsters beoordelen op verontreiniging</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-groutvol" checked> Groutvolume registreren per boring</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-druktest" checked> Druktestrapport per lus</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-foto" checked> Fotodocumentatie (voor, tijdens, na)</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-e5-afwijking"> Afwijkingen direct melden aan projectleider</label>
          </div>
          <div class="form-row full" style="margin-top:8px;">
            <div class="form-group">
              <label>Afwijkingenprotocol</label>
              <textarea id="pva-afwijkprotocol" rows="3" style="width:100%;padding:8px 10px;border:1px solid #d0d5dd;border-radius:5px;font-size:12px;font-family:inherit;resize:vertical;">Bij afwijkende bodemopbouw, verontreiniging, artesisch water of onverwachte obstakels: STOP boren, meld aan projectleider (0647326322). Pas PvA aan voordat werkzaamheden worden hervat.</textarea>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 6: Verontreiniging</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Verwachte verontreiniging</label>
              <select id="pva-verontreiniging">
                <option>Onverdacht</option>
                <option>Verdacht op zware metalen</option>
                <option>Verdacht op olieproducten</option>
                <option>Verdacht op asbest</option>
                <option>Verdacht op VOCL</option>
                <option>Verdacht op Zink</option>
                <option>Verdacht op Lood</option>
                <option>Anders</option>
              </select>
            </div>
            <div class="form-group">
              <label>Extra maatregelen</label>
              <input type="text" id="pva-extramaatregelen" value="Geen">
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Eis 7: Planning</h2>
          <div class="form-row">
            <div class="form-group"><label>Transport klaarzetten</label><input type="date" id="pva-transport"></div>
            <div class="form-group"><label>Start boorwerk</label><input type="date" id="pva-startboor"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Eind boorwerk</label><input type="date" id="pva-eindboor"></div>
            <div class="form-group"><label>Opleverdatum</label><input type="date" id="pva-opleverdatum"></div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Risico-inventarisatie</h2>
          <div style="font-size:12px;">
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-artesisch"> Risico op artesisch water</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-verontreiniging"> Bekende verontreiniging in omgeving</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-stortgrond"> Stortgrond / puinverharding verwacht</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-tanks"> Oude tanks / leidingen op locatie</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-bomen"> Bomen / wortels nabij boorlocatie</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-fundering"> Fundering / kelder nabij boring</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-wko"> Bestaande WKO systemen in omgeving</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-r-drukleiding"> Hoge druk leidingen nabij</label>
          </div>
          <div class="form-row full" style="margin-top:8px;">
            <div class="form-group">
              <label>Aanvullende opmerkingen risico's</label>
              <textarea id="pva-risico-opmerkingen" rows="2" style="width:100%;padding:8px 10px;border:1px solid #d0d5dd;border-radius:5px;font-size:12px;font-family:inherit;resize:vertical;" placeholder="Eventuele extra risico's of maatregelen..."></textarea>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Omgeving & Logistiek</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Buren/omgeving informeren?</label>
              <select id="pva-bureninfo"><option>Ja — door opdrachtgever</option><option>Ja — door Ground Research</option><option>Nee</option><option>NVT</option></select>
            </div>
            <div class="form-group">
              <label>Verkeersmaatregelen nodig?</label>
              <select id="pva-verkeer"><option>Nee</option><option>Ja — afzetting</option><option>Ja — vergunning aangevraagd</option></select>
            </div>
          </div>
          <div class="form-row full">
            <div class="form-group">
              <label>Equipment / materiaal meenemen</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; padding:6px 0;">
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Boorstelling" checked> Boorstelling</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Kraan" checked> Kraan</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Groutunit + slangen" checked> Groutunit + slangen</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="IBC werkwater" checked> IBC werkwater</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Barogel / EZ Mud" checked> Barogel / EZ Mud</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Lussen" checked> Lussen</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Verdelerput"> Verdelerput</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Glycol"> Glycol</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Druktestset + manometer"> Druktestset + manometer</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Gewichten / loodblokken"> Gewichten / loodblokken</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Aggregaat"> Aggregaat</label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:400; text-transform:none; letter-spacing:0;"><input type="checkbox" class="pva-equip-cb" value="Circulatiepomp"> Circulatiepomp</label>
              </div>
              <div style="margin-top:6px;">
                <input type="text" id="pva-equipment-extra" placeholder="Overig materiaal (vrij invullen)..." style="width:100%;padding:6px 10px;border:1px solid #d0d5dd;border-radius:5px;font-size:12px;">
              </div>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Noodprocedure</h2>
          <div style="padding:10px 14px; background:#fff3e0; border-radius:6px; border-left:4px solid #e65100; font-size:12px; line-height:1.7;">
            <strong>Bij noodsituaties:</strong><br>
            <b>1.</b> STOP alle werkzaamheden<br>
            <b>2.</b> Bel projectleider: <b>0647326322</b> (Pim Groot)<br>
            <b>3.</b> Bij letsel: bel <b>112</b><br>
            <b>4.</b> Bij gaslek: verlaat locatie, bel <b>0800-9009</b><br>
            <b>5.</b> Bij kabel/leiding geraakt: bel netbeheerder + projectleider<br>
            <b>6.</b> Bij artesisch water: casing sluiten, bel projectleider
          </div>
          <div class="form-row full" style="margin-top:8px;">
            <div class="form-group">
              <label>Aanvullende noodprocedure</label>
              <input type="text" id="pva-noodextra" placeholder="Eventueel extra noodprocedure...">
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px;">
          <h2>Fotodocumentatie (verplicht)</h2>
          <div style="font-size:12px;">
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-voor" checked> Situatie VOOR aanvang (overzicht locatie)</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-opstelling" checked> Boorstelling in positie</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-grondmonster" checked> Grondmonsters bij scheidende lagen</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-lus" checked> Lus inbrengen</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-grouten" checked> Grouten</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-druktest" checked> Druktestopstelling + manometer</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-na" checked> Situatie NA afronding</label>
            <label style="display:flex; align-items:center; gap:6px; margin:4px 0;"><input type="checkbox" id="pva-f-afwijking"> Afwijkingen / bijzonderheden</label>
          </div>
        </div>

        <div class="panel" style="margin-top:16px; text-align:center;">
          <div style="display:flex; gap:12px; justify-content:center;">
            <button class="btn btn-primary" onclick="prefillPvaFromOfferte()">🔄 Vul vanuit offerte</button>
            <button class="btn btn-success" onclick="generatePvaPDF()">📄 Genereer PvA PDF</button>
          </div>
          <div style="margin-top:12px; font-size:11px; color:#888;">
            Goedgekeurd door Pim Groot — Voldoet aan kwaliteitseisen GR
          </div>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- MODAL: KLANT TOEVOEGEN/BEWERKEN -->
<div class="modal-overlay" id="klant-modal">
  <div class="modal">
    <h3 id="klant-modal-title">Klant Toevoegen</h3>
    <input type="hidden" id="km-id">
    <div class="form-row">
      <div class="form-group"><label>Bedrijfsnaam</label><input type="text" id="km-bedrijf"></div>
      <div class="form-group"><label>Contactpersoon</label><input type="text" id="km-contact"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Telefoon</label><input type="text" id="km-telefoon"></div>
      <div class="form-group"><label>Certificaat</label><input type="text" id="km-cert"></div>
    </div>
    <div class="form-row full">
      <div class="form-group"><label>Adres</label><input type="text" id="km-adres"></div>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="saveKlant()">Opslaan</button>
      <button class="btn btn-danger" onclick="closeKlantModal()">Annuleren</button>
    </div>
  </div>
</div>
`;
