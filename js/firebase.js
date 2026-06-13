
// ============================================================
//  FIREBASE INTEGRATION — malak shop pro
// ============================================================
import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc }
                                   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
                                   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDBVrEXet3k4x1Ou_6D71eDLLL9fNU32r8",
  authDomain:        "malak-shop-fda5d.firebaseapp.com",
  projectId:         "malak-shop-fda5d",
  storageBucket:     "malak-shop-fda5d.firebasestorage.app",
  messagingSenderId: "172570688147",
  appId:             "1:172570688147:web:99f8dc7eb3b368b491eb66"
};

const fbApp  = initializeApp(firebaseConfig);
const db     = getFirestore(fbApp);
const auth   = getAuth(fbApp);

// ── doc ref ───────────────────────────────────────────────────
const SHOP_DOC = doc(db, 'shops', 'malak-main');

// ── state ─────────────────────────────────────────────────────
window._fbReady       = false;
window._fbSaving      = false;
window._fbLastSaveKey = null;
let _unsubSnapshot    = null;
window._fbStopSync = () => { if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null; } };

// ── sign in anonymously ───────────────────────────────────────
signInAnonymously(auth).catch(e => console.warn('Firebase auth:', e));

onAuthStateChanged(auth, user => {
  if (!user) return;
  window._fbReady    = true;
  window._fbSetDoc   = setDoc;
  window._fbShopDoc  = SHOP_DOC;
  _startRealtimeSync();
  _showFbStatus('connected');
});

// ── save to Firestore (debounced) ─────────────────────────────
let _saveTimer = null;
window.fbSave = function(data) {
  if (!window._fbReady) return;
  // Mark as pending immediately to block snapshot overwrite
  window._fbSaving = true;
  window._fbPendingSaveAt = Date.now();
  _showFbStatus('saving');
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const saveTime = new Date().toISOString();
      await setDoc(SHOP_DOC, { ...data, savedAt: saveTime });
      window._fbLastSaveKey = saveTime;
      window._fbSaving = false;
      window._fbPendingSaveAt = 0;
      _showFbStatus('saved');
    } catch(e) {
      console.warn('Firebase save error:', e);
      window._fbSaving = false;
      window._fbPendingSaveAt = 0;
      _showFbStatus('error');
    }
  }, 600);
};

// ── real-time listener ────────────────────────────────────────
function _startRealtimeSync() {
  if (_unsubSnapshot) _unsubSnapshot();
  _unsubSnapshot = onSnapshot(SHOP_DOC, snap => {
    if (!snap.exists()) return;
    // Block if we have a pending local save (within last 3 seconds)
    if (window._fbSaving) return;
    if (window._fbPendingSaveAt && Date.now() - window._fbPendingSaveAt < 3000) return;
    const data = snap.data();
    if (!data || !data.aqsat) return;
    // only update if remote is newer than our last save
    const remoteTime = data.savedAt || '';
    const localKey   = window._fbLastSaveKey || '';
    if (remoteTime <= localKey) return;
    window._fbLastSaveKey = remoteTime;

    // merge into state S
    const S = window._S;
    if (!S) return;
    Object.assign(S, {
      nid:          data.nid          ?? S.nid,
      prevBalances: data.prevBalances ?? S.prevBalances,
      aqsat:        data.aqsat        ?? S.aqsat,
      bore:         data.bore         ?? S.bore,
      qorod:        data.qorod        ?? S.qorod,
      doyon:        data.doyon        ?? S.doyon,
      daily:        data.daily        ?? S.daily,
      recurring:    data.recurring    ?? S.recurring,
      auditLog:     data.auditLog     ?? [],
    });
    if (typeof window.renderAll === 'function') window.renderAll();
    _showFbStatus('synced');
  }, err => {
    console.warn('Snapshot error:', err);
    _showFbStatus('error');
  });
}

// ── status indicator ──────────────────────────────────────────
function _showFbStatus(state) {
  const el = document.getElementById('fb-status');
  if (!el) return;
  const map = {
    connected: { icon: 'ti-cloud',        color: 'var(--teal)',   text: 'متصل' },
    saving:    { icon: 'ti-cloud-upload',  color: 'var(--amber)',  text: 'جاري الحفظ...' },
    saved:     { icon: 'ti-cloud-check',   color: 'var(--green)',  text: 'محفوظ' },
    synced:    { icon: 'ti-refresh',       color: 'var(--blue)',   text: 'تم المزامنة' },
    error:     { icon: 'ti-cloud-off',     color: 'var(--red)',    text: 'خطأ في الاتصال' },
  };
  const s = map[state] || map.connected;
  el.innerHTML = `<i class="ti ${s.icon}" style="font-size:14px;color:${s.color}"></i> <span style="font-size:11px;font-weight:700;color:${s.color}">${s.text}</span>`;
}

// ── load once on start ────────────────────────────────────────
window.fbLoad = async function() {
  try {
    const snap = await getDoc(SHOP_DOC);
    if (!snap.exists()) return false;
    const data = snap.data();
    if (!data || !data.aqsat) return false;
    const S = window._S;
    Object.assign(S, {
      nid:          data.nid          ?? S.nid,
      prevBalances: data.prevBalances ?? S.prevBalances,
      aqsat:        data.aqsat        ?? S.aqsat,
      bore:         data.bore         ?? S.bore,
      qorod:        data.qorod        ?? S.qorod,
      doyon:        data.doyon        ?? S.doyon,
      daily:        data.daily        ?? S.daily,
      recurring:    data.recurring    ?? S.recurring,
      auditLog:     data.auditLog     ?? [],
    });
    return true;
  } catch(e) { console.warn('Firebase load error:', e); return false; }
};
