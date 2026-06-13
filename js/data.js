
/* ============================================================
   MALAK SHOP PRO — data.js
   State, storage, and helper calculations
   ============================================================ */

'use strict';

// ── Today string ─────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];

// ── State ────────────────────────────────────────────────────
const S = window._S = {
  nid: 1000,
  prevBalances: { cash: 0, insta: 0, voda: 0 },
  recurring: [],

  aqsat: [],

  bore: [],

  qorod: [],

  doyon: [],

  daily: [],
};
const aqInst  = function(c) { return c.price > 0 ? Math.round((c.price - c.down) * (1 + c.rate/100) / c.months) : 0; };
const aqGross = function(c) { return c.price > 0 ? aqInst(c) * c.months : 0; };
const aqPaidAmt   = function(c, idx) { return Number((c.paid || [])[idx] || 0); };
// A slot is "fully paid" if paid amount >= installment amount
const aqSlotDone  = function(c, idx) { var inst=aqInst(c); return inst>0 ? aqPaidAmt(c,idx)>=inst : aqPaidAmt(c,idx)>0; };
// Count of fully-paid months
const aqPaidCount = function(c) { return (c.paid||[]).filter(function(v,idx){ return aqSlotDone(c,idx); }).length; };
// Total actually paid (sum of all slot amounts)
const aqTotalPaid = function(c) { return (c.paid||[]).reduce(function(s,v){ return s+Number(v||0); },0); };
const aqRem = function(c) {
  if (c.note && !c.price) {
    var m = c.note.match(/[\d,]+/);
    return m ? parseInt(m[0].replace(/,/g, '')) : 0;
  }
  return Math.max(0, aqGross(c) - aqTotalPaid(c));
};
const aqDone     = function(c) { return c.price > 0 && aqRem(c) <= 0; };
const aqTotalInt = function(c) { return c.price > 0 ? Math.max(0, aqGross(c) - (c.price - c.down)) : 0; };
const aqLate = function(c) {
  if (aqDone(c) || !c.price) return false;
  var now = new Date();
  // Use startDate if available (full date), else fall back to startMonth
  var startStr = c.startDate || (c.startMonth + '-01');
  var startD   = new Date(startStr);
  // First installment due = startDate + 1 month
  // Calculate how many installments should have been paid by now
  var firstDue = new Date(startD);
  firstDue.setMonth(firstDue.getMonth() + 1);
  var sy = startD.getFullYear(), sm = startD.getMonth() + 1;
  var startIdx = (sy - 2020) * 12 + sm;
  // Adjust: due date is day of purchase next month
  var nowIdx   = (now.getFullYear() - 2020) * 12 + (now.getMonth() + 1);
  // If today is before the day of month of purchase, subtract 1 (not due yet this month)
  if (now.getDate() < startD.getDate()) nowIdx -= 1;
  var expected = Math.min(nowIdx - startIdx, c.months);
  return aqPaidCount(c) < expected;
};

// ── Format helpers ────────────────────────────────────────────
// ── Privacy Mode ──────────────────────────────────────────────
let _privacyOn = localStorage.getItem('malak_privacy') === '1';
const PRIVACY_MASK = '••••';
let _currency = (() => { try { return JSON.parse(localStorage.getItem('malak_shop_settings_v1')||'{}').currency||'ج'; } catch{return 'ج';} })();

function getCurrency() {
  try { return JSON.parse(localStorage.getItem('malak_shop_settings_v1') || '{}').currency || 'ج'; } catch { return 'ج'; }
}

function ar(n) {
  if (_privacyOn) return PRIVACY_MASK;
  return Number(n || 0).toLocaleString('ar-EG');
}

function togglePrivacy() {
  _privacyOn = !_privacyOn;
  localStorage.setItem('malak_privacy', _privacyOn ? '1' : '0');
  _updatePrivacyIcon();
  renderAll();
}

function _updatePrivacyIcon() {
  const icon = document.getElementById('privacy-icon');
  const btn  = document.getElementById('topbar-privacy');
  if (icon) icon.className = _privacyOn ? 'ti ti-eye-off' : 'ti ti-eye';
  if (btn)  btn.title = _privacyOn ? 'إظهار الأرقام' : 'إخفاء الأرقام';
}

// ── Auto-lock ─────────────────────────────────────────────────
const AUTO_LOCK_MS = 2 * 60 * 1000; // دقيقتين بدون تفاعل
let _autoLockTimer = null;
let _appUnlocked = false;

function _resetAutoLock() {
  if (!_appUnlocked) return;
  clearTimeout(_autoLockTimer);
  _autoLockTimer = setTimeout(() => {
    lockNow();
    toast('🔒 تم القفل تلقائياً', 'warn');
  }, AUTO_LOCK_MS);
}

function _startAutoLock() {
  _appUnlocked = true;
  ['click','keydown','touchstart','mousemove'].forEach(ev =>
    document.addEventListener(ev, _resetAutoLock, { passive: true })
  );
  _resetAutoLock();
}
const fDate  = s  => new Date(s + 'T12:00').toLocaleDateString('ar-EG', { day:'numeric', month:'short', year:'numeric' });
const sDate  = s  => new Date(s + 'T12:00').toLocaleDateString('ar-EG', { day:'numeric', month:'short' });
const nowStr = () => new Date().toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });

const SRC_LABELS = { cash: '💵 كاش', insta: '📱 إنستا', voda: '📡 فودافون' };
const SRC_BADGE  = { cash: 'badge-x', insta: 'badge-p', voda: 'badge-t' };

// ── Storage ───────────────────────────────────────────────────
const STORE_KEY = 'malak_shop_v5';

function saveData() {
  const payload = {
    nid:          S.nid,
    prevBalances: S.prevBalances,
    aqsat:        S.aqsat,
    bore:         S.bore,
    qorod:        S.qorod,
    doyon:        S.doyon,
    daily:        S.daily,
    recurring:    S.recurring,
    auditLog:     S.auditLog || [],
    savedAt:      new Date().toISOString(),
  };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); }
  catch(e) { console.warn('Save failed', e); }
  // Firebase sync
  if (window.fbSave) window.fbSave(payload);
  autoSyncIfEnabled();
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !d.aqsat) return false;
    Object.assign(S, {
      nid:          d.nid          ?? S.nid,
      prevBalances: d.prevBalances ?? S.prevBalances,
      aqsat:        d.aqsat        ?? S.aqsat,
      bore:         d.bore         ?? S.bore,
      qorod:        d.qorod        ?? S.qorod,
      doyon:        d.doyon        ?? S.doyon,
      daily:        d.daily        ?? S.daily,
      recurring:    d.recurring    ?? S.recurring,
      auditLog:     d.auditLog     ?? [],
    });
    return true;
  } catch(e) { return false; }
}

function exportData() { exportDataNow(); }

function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.aqsat) { toast('ملف غير صحيح', 'error'); return; }
      localStorage.setItem(STORE_KEY, e.target.result);
      if (window.fbSave) window.fbSave(d);
      toast('✓ تم الاستيراد — جاري إعادة التحميل...');
      setTimeout(() => location.reload(), 800);
    } catch { toast('خطأ في الاستيراد', 'error'); }
  };
  r.readAsText(file);
}

function resetData() {
  confirm2('هتمسح كل البيانات؟', 'مفيش رجوع بعد كده!', async () => {

    // ── 1. وقف الـ Firebase sync فوراً ───────────────────────
    if (window._fbStopSync) window._fbStopSync();
    window._fbSaving = true;
    window._fbPendingSaveAt = Date.now() + 60000;

    // ── 2. مسح localStorage ──────────────────────────────────
    localStorage.removeItem(STORE_KEY);

    // ── 3. إعادة تعيين الـ state مباشرة ─────────────────────
    const emptyData = {
      nid: 1, prevBalances: { cash:0, insta:0, voda:0 },
      aqsat: [], bore: [], qorod: [], doyon: [],
      daily: [], recurring: [], auditLog: [],
      savedAt: new Date().toISOString(),
    };
    Object.assign(S, emptyData);

    // ── 4. مسح Firebase ──────────────────────────────────────
    if (window._fbReady && window._fbSetDoc && window._fbShopDoc) {
      try {
        await window._fbSetDoc(window._fbShopDoc, emptyData);
        window._fbLastSaveKey = emptyData.savedAt;
      } catch(e) {
        console.warn('Firebase reset error:', e);
      }
    }

    // ── 5. reload بعد التأكد من المسح ────────────────────────
    toast('✓ تم مسح كل البيانات');
    setTimeout(() => location.reload(), 1000);
  });
}

/* ============================================================
   MALAK SHOP PRO — app.js
   UI, rendering, interactions
   ============================================================ */

'use strict';

// ── Charts registry ───────────────────────────────────────────
const charts = {};

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el  = document.getElementById('toast');
  const ico = document.getElementById('toast-ico');
  if (!el) return;
  const icons = { success:'ti-circle-check', error:'ti-alert-circle', warn:'ti-alert-triangle' };
  const colors= { success:'var(--green)',     error:'var(--red)',       warn:'var(--amber)' };
  ico.className = 'ti ' + (icons[type] || icons.success);
  ico.style.color = colors[type] || colors.success;
  document.getElementById('toast-msg').textContent = msg;
  el.classList.remove('show','hide');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.classList.replace('show','hide'); }, 2800);
}

// ── Confirm dialog ────────────────────────────────────────────
function confirm2(title, msg, onYes) {
  const ov = document.getElementById('confirm-overlay');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  ov.classList.add('open');
  document.getElementById('confirm-yes').onclick = () => { ov.classList.remove('open'); onYes(); };
  document.getElementById('confirm-no').onclick  = () => ov.classList.remove('open');
}

// ── Navigation ────────────────────────────────────────────────
const PAGES = ['pg-today','pg-home','pg-daily','pg-aqsat','pg-bore','pg-br-detail','pg-qorod','pg-qr-detail','pg-doyon','pg-dy-detail','pg-reports','pg-overview','pg-recurring','pg-calc','pg-settings'];

function nav(id) {
  closeFab();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  // pg-qr-detail is a sub-page of pg-qorod — highlight the qorod tab
  const tabMap = {'pg-qr-detail':'pg-qorod','pg-dy-detail':'pg-doyon','pg-br-detail':'pg-bore'};
  const tabId  = tabMap[id] || id;
  const NAV_PAGES = ['pg-today','pg-home','pg-daily','pg-aqsat','pg-bore','pg-qorod','pg-doyon','pg-reports','pg-overview','pg-recurring','pg-calc','pg-settings'];
  const idx = NAV_PAGES.indexOf(tabId);
  const tabs = document.querySelectorAll('.ntab');
  if (idx >= 0 && idx < tabs.length) tabs[idx].classList.add('active');
  renderAll();
}

// ── Render all ────────────────────────────────────────────────
let _renderTimer = null;
function renderAll() {
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(() => {
    renderToday();
    renderHome();
    renderDaily();
    renderAqsat();
    renderBore();
    renderQorod();
    renderDoyon();
    renderReports();
    renderOverview();
    renderRecurring();
    renderCalc();
    renderSettings();
    saveData();
  }, 30);
}

