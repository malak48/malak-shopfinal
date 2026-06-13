// ============================================================
// AUDIT LOG
// ============================================================
function auditLog(action, entity, name, details) {
  if(!S.auditLog) S.auditLog = [];
  S.auditLog.unshift({
    id: nid(),
    time: new Date().toLocaleString('ar-EG'),
    date: todayStr,
    action,   // 'edit' | 'delete' | 'add'
    entity,   // 'bore' | 'qorod' | 'doyon' | 'aqsat' | 'daily'
    name,
    details
  });
  // keep last 200 entries only
  if(S.auditLog.length > 200) S.auditLog = S.auditLog.slice(0, 200);
}

// ============================================================
// QOROD EDIT
// ============================================================
function openEditQr(id) {
  const q = S.qorod.find(x => x.id === id);
  if(!q) return;
  document.getElementById('edit-qr-id').value = id;
  setVal('edit-qr-name',      q.name);
  setVal('edit-qr-orig',      q.original);
  setVal('edit-qr-remaining', q.remaining);
  setVal('edit-qr-monthly',   q.monthlyInt);
  setVal('edit-qr-status',    q.status);
  setVal('edit-qr-note',      q.note || '');
  openModal('modal-edit-qr');
  setTimeout(() => document.getElementById('edit-qr-name').focus(), 150);
}

function saveEditQr() {
  const id        = parseInt(document.getElementById('edit-qr-id').value);
  const name      = val('edit-qr-name').trim();
  const orig      = parseFloat(val('edit-qr-orig'))      || 0;
  const remaining = parseFloat(val('edit-qr-remaining')) || 0;
  const monthly   = parseFloat(val('edit-qr-monthly'))   || 0;
  const status    = val('edit-qr-status') || 'active';
  const note      = val('edit-qr-note').trim();
  if(!name) { toast('اكتب الاسم', 'error'); return; }
  const q = S.qorod.find(x => x.id === id);
  if(!q) return;
  const old = `${q.name} — متبقي ${ar(q.remaining)} ${_currency}`;
  q.name = name; q.original = orig; q.remaining = remaining;
  q.monthlyInt = monthly; q.status = status; q.note = note;
  auditLog('edit', 'qorod', name, `كان: ${old} → متبقي ${ar(remaining)} ${_currency}`);
  saveData();
  closeModal('modal-edit-qr');
  renderAll();
  if (document.getElementById('pg-qr-detail')?.classList.contains('active')) openQrDetailPage(id);
  toast('✓ تم التعديل');
}

// ============================================================
// DOYON EDIT
// ============================================================
function openEditDy(id) {
  const d = S.doyon.find(x => x.id === id);
  if(!d) return;
  document.getElementById('edit-dy-id').value = id;
  setVal('edit-dy-name',      d.name);
  setVal('edit-dy-orig',      d.original);
  setVal('edit-dy-remaining', d.remaining);
  setVal('edit-dy-monthly',   d.monthlyInt);
  setVal('edit-dy-status',    d.status);
  setVal('edit-dy-note',      d.note || '');
  openModal('modal-edit-dy');
  setTimeout(() => document.getElementById('edit-dy-name').focus(), 150);
}

function saveEditDy() {
  const id        = parseInt(document.getElementById('edit-dy-id').value);
  const name      = val('edit-dy-name').trim();
  const orig      = parseFloat(val('edit-dy-orig'))      || 0;
  const remaining = parseFloat(val('edit-dy-remaining')) || 0;
  const monthly   = parseFloat(val('edit-dy-monthly'))   || 0;
  const status    = val('edit-dy-status') || 'active';
  const note      = val('edit-dy-note').trim();
  if(!name) { toast('اكتب الاسم', 'error'); return; }
  const d = S.doyon.find(x => x.id === id);
  if(!d) return;
  const old = `${d.name} — متبقي ${ar(d.remaining)} ${_currency}`;
  d.name = name; d.original = orig; d.remaining = remaining;
  d.monthlyInt = monthly; d.status = status; d.note = note;
  auditLog('edit', 'doyon', name, `كان: ${old} → متبقي ${ar(remaining)} ${_currency}`);
  saveData();
  closeModal('modal-edit-dy');
  renderAll();
  toast('✓ تم التعديل');
}

function renderAuditLog() {
  if(!S.auditLog) S.auditLog = [];
  const tbody = document.getElementById('audit-tbody');
  if(!tbody) return;

  const entityLabels = {
    bore:'فلوس بره', qorod:'قروض', doyon:'ديون',
    aqsat:'أقساط', daily:'اليومية'
  };
  const actionLabels = { edit:'تعديل', delete:'حذف', add:'إضافة' };
  const actionColors = {
    edit:'var(--blue)', delete:'var(--red)', add:'var(--green)'
  };
  const actionBadge  = {
    edit:'badge-b', delete:'badge-r', add:'badge-g'
  };

  if(!S.auditLog.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><i class="ti ti-history"></i><p>لا توجد تعديلات مسجلة</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = S.auditLog.slice(0, 50).map((log, i) => `<tr>
    <td style="font-size:11px;color:var(--text3);white-space:nowrap">${log.time}</td>
    <td><span class="badge ${actionBadge[log.action]||'badge-x'}">${actionLabels[log.action]||log.action}</span></td>
    <td><span class="badge badge-x">${entityLabels[log.entity]||log.entity}</span></td>
    <td style="font-weight:700">${log.name}</td>
    <td style="font-size:12px;color:var(--text3)">${log.details||''}</td>
  </tr>`).join('');
}

function clearAuditLog() {
  confirm2('مسح سجل التعديلات؟', 'هيتمسح كل السجل!', () => {
    S.auditLog = [];
    saveData();
    renderAuditLog();
    toast('✓ تم مسح السجل', 'warn');
  });
}

// ============================================================
// LOCK SCREEN
// ============================================================
const LOCK_KEY     = 'malak_pin_v6';       // مفتاح الباسورد المشفر
const LOCK_ATT_KEY = 'malak_att_v6';       // مفتاح سجل المحاولات
const LOCK_SALT    = 'MALAK_SHOP_2025_SEC';// salt ثابت للـ hash

let lockAttempts = 0;
let lockCooldown = false;
let _lockCdInterval = null;

// ── SHA-256 تشفير حقيقي ──────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function hashPin(p) {
  return await sha256(LOCK_SALT + p + LOCK_SALT);
}

async function getPin() {
  const stored = localStorage.getItem(LOCK_KEY);
  if (stored) return stored;
  // أول تشغيل: احفظ الباسورد الافتراضي مشفراً وازيل الـ hint
  const h = await hashPin('1234');
  localStorage.setItem(LOCK_KEY, h);
  _lockSetFirstRunHint();
  return h;
}

function _lockSetFirstRunHint() {
  // لو أول مرة يشغل: نوضح إنه لازم يغير الباسورد
  const hintEl = document.getElementById('lock-hint-text');
  if (hintEl && !localStorage.getItem('malak_pin_changed')) {
    hintEl.textContent = '⚠️ غيّر الباسورد من الإعدادات';
    hintEl.style.color = 'var(--amber)';
  }
}

// ── تتبع المحاولات الفاشلة مع وقت ──────────────────────────
function _loadAttempts() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCK_ATT_KEY) || '{}');
    // لو فات أكتر من 10 دقايق، نصفّي السجل
    if (d.until && Date.now() > d.until) {
      localStorage.removeItem(LOCK_ATT_KEY);
      return { count: 0, until: 0 };
    }
    return d;
  } catch { return { count: 0, until: 0 }; }
}

function _saveAttempts(count, until) {
  localStorage.setItem(LOCK_ATT_KEY, JSON.stringify({ count, until }));
}

function _clearAttempts() {
  localStorage.removeItem(LOCK_ATT_KEY);
  lockAttempts = 0;
}

// ── الـ cooldown بيزيد تدريجياً ──────────────────────────────
function _cooldownSeconds(attempts) {
  // 3 محاولات: 30 ثانية | 6 محاولات: 2 دقيقة | 9+: 10 دقايق
  if (attempts >= 9) return 600;
  if (attempts >= 6) return 120;
  if (attempts >= 3) return 30;
  return 0;
}

function lockInput() {
  const v = document.getElementById('lock-pin').value;
  document.querySelectorAll('.lock-dot').forEach((d,i) => {
    d.className = 'lock-dot' + (i < v.length ? ' on' : '');
  });
  document.getElementById('lock-err').textContent = '';
  if (v.length === 4) setTimeout(lockSubmit, 150);
}

function lockEye() {
  const inp = document.getElementById('lock-pin');
  const ico = document.getElementById('lock-eye-icon');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  ico.className = 'ti ti-eye' + (inp.type === 'password' ? '-off' : '');
}

async function lockSubmit() {
  if (lockCooldown) return;
  const pin = document.getElementById('lock-pin').value;
  if (!pin) return;

  // تحقق من cooldown محفوظ
  const att = _loadAttempts();
  if (att.until && Date.now() < att.until) {
    _startCooldownTimer(Math.ceil((att.until - Date.now()) / 1000));
    return;
  }

  const hashed  = await hashPin(pin);
  const correct = await getPin();

  if (hashed === correct) {
    _clearAttempts();
    document.getElementById('lock-screen').classList.add('out');
    // أخفي الـ hint لو غير الباسورد
    const hintEl = document.getElementById('lock-hint-text');
    if (hintEl && localStorage.getItem('malak_pin_changed')) {
      hintEl.textContent = 'محمي ومشفر ✓';
      hintEl.style.color = '';
    }
    setTimeout(() => {
      document.getElementById('lock-screen').style.display = 'none';
      setTimeout(showLateNotif, 600);
      setTimeout(checkTomorrowDue, 900);
      setTimeout(checkBackupReminder, 1500);
      scheduleAutoSync();
      _startAutoLock();
      _updatePrivacyIcon();
      loadAccentColor();
      const fabEl = document.getElementById('fab'); if (fabEl) fabEl.style.display = 'flex';
    }, 380);
    toast('أهلاً بيك 👋');
    ['topbar-lock','topbar-pin'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
  } else {
    lockAttempts = (att.count || 0) + 1;
    document.querySelectorAll('.lock-dot').forEach(d => d.className = 'lock-dot err');
    document.getElementById('lock-pin').value = '';
    setTimeout(() => document.querySelectorAll('.lock-dot').forEach(d => d.className = 'lock-dot'), 500);
    document.getElementById('lock-pin').focus();

    const cd = _cooldownSeconds(lockAttempts);
    if (cd > 0) {
      const until = Date.now() + cd * 1000;
      _saveAttempts(lockAttempts, until);
      _startCooldownTimer(cd);
    } else {
      _saveAttempts(lockAttempts, 0);
      const rem = 3 - (lockAttempts % 3);
      document.getElementById('lock-err').textContent = 'باسورد غلط! باقي ' + rem + ' محاولة قبل الإغلاق المؤقت';
    }
  }
}

function _startCooldownTimer(seconds) {
  lockCooldown = true;
  const btn = document.getElementById('lock-btn');
  const inp = document.getElementById('lock-pin');
  if (btn) btn.disabled = true;
  if (inp) inp.disabled = true;

  clearInterval(_lockCdInterval);
  let cd = seconds;
  const errEl = document.getElementById('lock-err');

  function _tick() {
    if (!errEl) return;
    const mins = Math.floor(cd / 60);
    const secs = cd % 60;
    const timeStr = mins > 0 ? `${mins} دقيقة ${secs} ثانية` : `${cd} ثانية`;
    errEl.innerHTML = `<i class="ti ti-lock" style="margin-left:4px"></i> مقفول لمدة ${timeStr}`;
    cd--;
    if (cd < 0) {
      clearInterval(_lockCdInterval);
      lockCooldown = false;
      lockAttempts = 0;
      if (btn) btn.disabled = false;
      if (inp) { inp.disabled = false; inp.value = ''; inp.focus(); }
      document.querySelectorAll('.lock-dot').forEach(d => d.className = 'lock-dot');
      errEl.textContent = '';
    }
  }
  _tick();
  _lockCdInterval = setInterval(_tick, 1000);
}

function lockNow() {
  const ls = document.getElementById('lock-screen');
  ls.style.display = 'flex'; ls.classList.remove('out');
  document.getElementById('lock-pin').value = '';
  document.querySelectorAll('.lock-dot').forEach(d => d.className = 'lock-dot');
  document.getElementById('lock-err').textContent = '';
  // تحقق من cooldown محفوظ
  const att = _loadAttempts();
  if (att.until && Date.now() < att.until) {
    _startCooldownTimer(Math.ceil((att.until - Date.now()) / 1000));
  } else {
    setTimeout(() => document.getElementById('lock-pin').focus(), 200);
  }
}

function changePin() {
  clearPinFields();
  openModal('modal-change-pin');
  setTimeout(() => { const el = document.getElementById('pin-old'); if (el) el.focus(); }, 200);
}

function clearPinFields() {
  ['pin-old','pin-new','pin-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

async function savePinChange() {
  const old = (document.getElementById('pin-old') || {}).value || '';
  const nw  = (document.getElementById('pin-new') || {}).value || '';
  const cf  = (document.getElementById('pin-confirm') || {}).value || '';
  if (!old) { toast('اكتب الباسورد الحالي', 'error'); return; }

  const correct = await getPin();
  const oldHash = await hashPin(old);
  if (oldHash !== correct) { toast('الباسورد الحالي غلط!', 'error'); return; }
  if (!nw || nw.length !== 4 || !/^\d+$/.test(nw)) { toast('لازم يكون 4 أرقام', 'error'); return; }
  if (nw === '1234') { toast('⚠️ اختار باسورد أقوى من 1234', 'warn'); return; }
  if (nw === '0000' || nw === '1111' || nw === '2222' || nw === '3333' || nw === '4444' || nw === '5555' || nw === '6666' || nw === '7777' || nw === '8888' || nw === '9999') {
    toast('⚠️ الباسورد ده سهل جداً، اختار تاني', 'warn'); return;
  }
  if (nw !== cf) { toast('الباسورد الجديد مش متطابق!', 'error'); return; }

  const newHash = await hashPin(nw);
  localStorage.setItem(LOCK_KEY, newHash);
  localStorage.setItem('malak_pin_changed', '1');
  closeModal('modal-change-pin');
  clearPinFields();
  // حدّث الـ hint
  const hintEl = document.getElementById('lock-hint-text');
  if (hintEl) { hintEl.textContent = 'محمي ومشفر ✓'; hintEl.style.color = 'var(--green)'; }
  toast('✓ تم تغيير الباسورد بنجاح 🔒');
}

function lockClock(){
  const el=document.getElementById('lock-clock');
  if(el){
    const n=new Date();
    el.textContent=n.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})+' · '+n.toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'});
  }
}

// ============================================================
// HELPERS
// ============================================================
function setHTML(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
function val(id){const el=document.getElementById(id);return el?el.value:'';}
function num(id){return parseFloat(val(id))||0;}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v;}
function nid(){return ++S.nid;}

function openModal(id){const el=document.getElementById(id);if(el)el.classList.add('open');}
function closeModal(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}

function buildChart(id, type, data, extra={}) {
  const el=document.getElementById(id);
  if(!el) return;
  if(charts[id]) charts[id].destroy();
  const opts={
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#8B9FC7',font:{size:11,family:'Cairo'},boxWidth:10}}},
    ...extra
  };
  if(type==='bar'||type==='line'){
    opts.scales={
      x:{grid:{display:false},ticks:{color:'#4A5A7A',font:{size:10,family:'Cairo'}}},
      y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#4A5A7A',font:{size:10,family:'Cairo'},callback:v=>v>=1000?(v/1000).toFixed(0)+'k':v}}
    };
  }
  charts[id]=new Chart(el, {type, data, options:opts});
}

let _balPanelOpen = true;

function toggleBalPanel() {
  _balPanelOpen = !_balPanelOpen;
  const body = document.getElementById('bal-panel-body');
  const chev = document.getElementById('bal-panel-chev');
  if (body) body.style.display = _balPanelOpen ? '' : 'none';
  if (chev) chev.style.transform = _balPanelOpen ? 'rotate(180deg)' : '';
}

function openEditBalances() {
  // navigate to daily page and populate fields
  nav('pg-daily');
  setVal('bal-inline-cash',  S.prevBalances.cash  || 0);
  setVal('bal-inline-insta', S.prevBalances.insta || 0);
  setVal('bal-inline-voda',  S.prevBalances.voda  || 0);
  _balPanelOpen = true;
  const body = document.getElementById('bal-panel-body');
  const chev = document.getElementById('bal-panel-chev');
  if (body) body.style.display = '';
  if (chev) chev.style.transform = 'rotate(180deg)';
  previewBalance();
  setTimeout(() => document.getElementById('bal-inline-cash')?.focus(), 100);
}

function closeDailBalPanel() {
  _balPanelOpen = false;
  const body = document.getElementById('bal-panel-body');
  const chev = document.getElementById('bal-panel-chev');
  if (body) body.style.display = 'none';
  if (chev) chev.style.transform = '';
}

function previewBalance() {
  const cash  = parseFloat(document.getElementById('bal-inline-cash')?.value)  || 0;
  const insta = parseFloat(document.getElementById('bal-inline-insta')?.value) || 0;
  const voda  = parseFloat(document.getElementById('bal-inline-voda')?.value)  || 0;
  const total = cash + insta + voda;

  // quick preview in header
  const qp = document.getElementById('bal-quick-preview');
  if (qp) qp.textContent = total > 0 ? `كاش: ${ar(cash)} · إنستا: ${ar(insta)} · فودافون: ${ar(voda)}` : '';

  const todayIn  = S.daily.filter(e=>e.date===todayStr&&e.type==='in').reduce((s,e)=>s+e.amt,0);
  const todayOut = S.daily.filter(e=>e.date===todayStr&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const closing  = total + todayIn - todayOut;

  const el = document.getElementById('bal-preview');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:8px;padding:8px 14px;text-align:center;flex:1;min-width:120px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:2px">إجمالي الافتتاحي</div>
        <div style="font-size:16px;font-weight:900;color:var(--green)">${ar(total)} ${_currency}</div>
      </div>
      <div style="background:var(--bbg);border:1px solid var(--bborder);border-radius:8px;padding:8px 14px;text-align:center;flex:1;min-width:120px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:2px">ختامي اليوم</div>
        <div style="font-size:16px;font-weight:900;color:var(--blue)">${ar(closing)} ${_currency}</div>
      </div>
    </div>`;
}

function saveInlineBalances() {
  S.prevBalances.cash  = parseFloat(document.getElementById('bal-inline-cash')?.value)  || 0;
  S.prevBalances.insta = parseFloat(document.getElementById('bal-inline-insta')?.value) || 0;
  S.prevBalances.voda  = parseFloat(document.getElementById('bal-inline-voda')?.value)  || 0;
  renderAll();
  toast('✓ تم تحديث الأرصدة الافتتاحية');
}

function saveBalances() {
  S.prevBalances.cash  = num('bal-cash');
  S.prevBalances.insta = num('bal-insta');
  S.prevBalances.voda  = num('bal-voda');
  closeModal('modal-balances');
  renderAll(); toast('✓ تم تحديث الأرصدة');
}

// ============================================================
// INIT
// ============================================================
// ============================================================
// THEME TOGGLE
// ============================================================
const THEME_KEY = 'malak_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'light' ? 'ti ti-moon' : 'ti ti-sun';
  }
  const btn = document.getElementById('topbar-theme');
  if (btn) btn.title = theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  toast(next === 'light' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي');
  updateThemeSettingLabel();
  _updateSidebarThemeBtn(next);
}

function _updateSidebarThemeBtn(theme) {
  const icon  = document.getElementById('sidebar-theme-icon');
  const label = document.getElementById('sidebar-theme-label');
  if (theme === 'light') {
    if (icon)  icon.className = 'ti ti-moon';
    if (label) label.textContent = 'داكن';
  } else {
    if (icon)  icon.className = 'ti ti-sun';
    if (label) label.textContent = 'فاتح';
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

document.addEventListener('DOMContentLoaded', () => {
  gateCheck();
  updateTopbarDate();
  setTimeout(() => _updateSidebarThemeBtn(localStorage.getItem('malak_theme_v1') || 'dark'), 100);
  loadTheme();
  loadAccentColor();
  // expose renderAll to window for Firebase real-time sync
  window.renderAll = renderAll;
  const loaded = loadData();
  // Migrate old paid[] format (0/1) to amount-based format
  (S.aqsat || []).forEach(c => {
    const inst = aqInst(c);
    if (!c.paid) c.paid = Array(c.months).fill(0);
    c.paid = c.paid.map(v => v === 1 ? inst : Number(v || 0));
  });

  // Wire lock screen events
  document.getElementById('lock-pin').addEventListener('input', lockInput);
  document.getElementById('lock-pin').addEventListener('keydown', e => { if(e.key==='Enter') lockSubmit(); });
  document.getElementById('lock-eye-btn').addEventListener('click', lockEye);
  document.getElementById('lock-btn').addEventListener('click', lockSubmit);

  // Lock clock
  lockClock();
  setInterval(lockClock, 1000);

  // تحقق من cooldown محفوظ عند التحميل
  const _attInit = _loadAttempts();
  if (_attInit.until && Date.now() < _attInit.until) {
    _startCooldownTimer(Math.ceil((_attInit.until - Date.now()) / 1000));
  }

  // أول تشغيل: اعرض hint تغيير الباسورد
  getPin().then(() => {
    const hintEl = document.getElementById('lock-hint-text');
    if (hintEl) {
      if (!localStorage.getItem('malak_pin_changed')) {
        hintEl.textContent = '⚠️ الباسورد الافتراضي 1234 — غيّره من الإعدادات';
        hintEl.style.color = 'var(--amber)';
      } else {
        hintEl.textContent = 'محمي ومشفر ✓';
        hintEl.style.color = 'var(--green)';
      }
    }
  });

  // Set today date in daily
  setVal('d-date', todayStr);

  // Init report filters
  initRepFilters();

  // Apply shop settings
  applyShopSettings();

  // Render everything
  renderAll();

  // Add topbar buttons
  const tr = document.querySelector('.topbar-right');
  if(tr) {
    const mkBtn = (id, icon, title, onclick, extra='') =>
      `<button id="${id}" class="btn btn-ghost btn-sm" title="${title}" style="display:none;${extra}" onclick="${onclick}"><i class="ti ${icon}"></i></button>`;

    const fileInput = document.createElement('input');
    fileInput.type='file'; fileInput.accept='.json'; fileInput.style.display='none';
    fileInput.onchange = e => importData(e.target.files[0]);
    tr.appendChild(fileInput);

    tr.insertAdjacentHTML('afterbegin',
      mkBtn('topbar-pin','ti-key','تغيير PIN','changePin()') +
      mkBtn('topbar-lock','ti-lock','قفل (L)','lockNow()') +
      `<button class="btn btn-ghost btn-sm" onclick="openBackupModal()" title="النسخ الاحتياطي" id="topbar-backup"><i class="ti ti-database"></i></button>` +
      `<button class="btn btn-ghost btn-sm" onclick="document.querySelector('input[type=file]').click()" title="استيراد"><i class="ti ti-upload"></i></button>` +
      `<button class="btn btn-ghost btn-sm" onclick="openEditBalances()" title="تعديل الأرصدة"><i class="ti ti-wallet"></i></button>` +
      `<button class="btn btn-ghost btn-sm" onclick="togglePrivacy()" title="إخفاء الأرقام"><i class="ti ti-eye"></i></button>` +
      `<button class="btn btn-ghost btn-sm" onclick="toggleTheme()" title="تغيير المظهر" id="topbar-theme"><i class="ti ti-sun" id="theme-icon"></i></button>` +
      mkBtn('topbar-reset','ti-refresh','ريست','resetData()','color:var(--red)')
    );
    // Re-apply theme so the icon reflects saved preference
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    _updatePrivacyIcon();
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
    const map={'1':'pg-today','2':'pg-home','3':'pg-daily','4':'pg-aqsat','5':'pg-bore','6':'pg-qorod','7':'pg-doyon','8':'pg-reports','9':'pg-recurring','0':'pg-calc'};
    if(map[e.key]) nav(map[e.key]);
    if(e.key==='l'||e.key==='L') lockNow();
    if(e.key==='Escape') document.querySelectorAll('.overlay.open,.modal.open').forEach(m=>m.classList.remove('open'));
  });

  // Enter key on lock pin
  const lockPin = document.getElementById('lock-pin');
  if(lockPin) lockPin.addEventListener('keydown', e => { if(e.key==='Enter') lockSubmit(); });

  // Focus lock input
  setTimeout(() => document.getElementById('lock-pin').focus(), 100);
});

function printReceiptFromSelect() {
  const id = parseInt(val('receipt-client') || 0);
  if (!id) { toast('اختر عميل أولاً', 'error'); return; }
  printReceipt(id);
}

// ============================================================
// PAYMENT MODAL
// ============================================================
let _payClientId = null;

function openPayment(id) {
  const c = S.aqsat.find(x => x.id === id);
  if (!c) return;
  if (aqDone(c)) { toast('العميل سدد الكل ✓', 'warn'); return; }
  _payClientId = id;

  const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c), gross = aqGross(c);
  const pct  = gross > 0 ? Math.round((gross - rem) / gross * 100) : 0;

  document.getElementById('pay-client-name').textContent = c.name + (c.item ? ' — ' + c.item : '');
  document.getElementById('pay-inst').textContent = ar(inst) + ' ' + _currency;
  document.getElementById('pay-rem').textContent  = ar(rem)  + ' ' + _currency;
  document.getElementById('pay-progress-txt').textContent = paid + '/' + c.months + ' شهر';
  document.getElementById('pay-progress-bar').style.width = pct + '%';
  document.getElementById('pay-custom-amt').value = '';
  document.getElementById('pay-note').value = '';
  document.getElementById('pay-date').value = todayStr;

  // Quick buttons: نص قسط، قسط كامل، قسطين، كل المتبقي
  const half = Math.round(inst / 2);
  const btns = [
    { label: 'نص قسط', val: half },
    { label: 'قسط كامل', val: inst },
    { label: 'قسطين', val: inst * 2 },
    { label: 'الكل', val: rem },
  ].filter(b => b.val > 0 && b.val <= rem);

  document.getElementById('pay-quick-btns').innerHTML = btns.map(b =>
    `<button class="pay-amount-btn" onclick="selectPayAmount(${b.val}, this)">${b.label}<br><span style="font-size:10px;opacity:.7">${ar(b.val)} ${_currency}</span></button>`
  ).join('');

  openModal('modal-payment');
  setTimeout(() => document.getElementById('pay-custom-amt').focus(), 200);
}

function selectPayAmount(val, btn) {
  document.getElementById('pay-custom-amt').value = val;
  document.querySelectorAll('.pay-amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function onPayAmountInput(val) {
  document.querySelectorAll('.pay-amount-btn').forEach(b => b.classList.remove('selected'));
  // highlight matching quick btn if exact match
  document.querySelectorAll('.pay-amount-btn').forEach(b => {
    const bVal = b.getAttribute('onclick').match(/selectPayAmount\((\d+)/)?.[1];
    if (bVal && parseInt(bVal) === parseInt(val)) b.classList.add('selected');
  });
}

function submitPayment() {
  const c   = S.aqsat.find(x => x.id === _payClientId);
  if (!c) return;
  const amt  = parseFloat(document.getElementById('pay-custom-amt').value) || 0;
  const src  = document.getElementById('pay-source').value;
  const note = document.getElementById('pay-note').value.trim();
  const payDate = document.getElementById('pay-date')?.value || todayStr;

  if (amt <= 0) { toast('اكتب المبلغ', 'error'); return; }
  const rem = aqRem(c);
  if (amt > rem + 0.01) { toast(`المبلغ أكبر من المتبقي (${ar(rem)} ${_currency})`, 'error'); return; }

  const inst = aqInst(c);

  // Distribute amount across unpaid months (oldest first)
  let remaining = amt;
  for (let i = 0; i < c.months && remaining > 0.01; i++) {
    const slotPaid = aqPaidAmt(c, i);
    const slotRem  = Math.max(0, inst - slotPaid);
    if (slotRem > 0) {
      const add = Math.min(remaining, slotRem);
      c.paid[i] = Math.round((slotPaid + add) * 100) / 100;
      remaining -= add;
    }
  }

  // Record payment in daily
  S.daily.push({
    id: nid(), date: payDate,
    name: 'تسديد: ' + c.name + (note ? ' — ' + note : ''),
    source: src, type: 'in', amt, note: note || (c.item || 'أقساط'), affect: 'aqsat'
  });

  // Log in client payments history
  c.payments = c.payments || [];
  c.payments.push({ date: payDate, amt, src, note, type: amt >= rem - 0.01 ? 'full' : 'partial' });

  closeModal('modal-payment');
  renderAll();

  const isFullyDone = aqDone(c);
  if (isFullyDone) {
    toast('🎉 تم السداد الكامل! مبروك', 'success');
    if (c.phone) setTimeout(() => { if (confirm('تبعت مبروك للعميل على واتساب؟')) waOpen(c.id, 'done'); }, 800);
  } else {
    const newRem = aqRem(c);
    toast(`✓ تم تسديد ${ar(amt)} ${_currency} · متبقي ${ar(newRem)} ${_currency}`);
  }
}

// ============================================================
// ACCENT COLOR SYSTEM
// ============================================================
const ACCENT_KEY = 'malak_accent';

const ACCENT_PRESETS = [
  { name: 'أزرق (افتراضي)', color: '#5B7FFF', dark: '#3A5CE5', light: '#7B9FFF' },
  { name: 'بنفسجي',          color: '#9B59B6', dark: '#7D3C98', light: '#BB8FCE' },
  { name: 'وردي',            color: '#E91E8C', dark: '#C2185B', light: '#F48FB1' },
  { name: 'أحمر',            color: '#E53935', dark: '#C62828', light: '#EF9A9A' },
  { name: 'برتقالي',         color: '#F57C00', dark: '#E65100', light: '#FFB74D' },
  { name: 'أصفر ذهبي',       color: '#F9A825', dark: '#F57F17', light: '#FFE082' },
  { name: 'أخضر',            color: '#2E7D32', dark: '#1B5E20', light: '#81C784' },
  { name: 'تيل',             color: '#00897B', dark: '#00695C', light: '#80CBC4' },
  { name: 'سماوي',           color: '#0288D1', dark: '#01579B', light: '#81D4FA' },
  { name: 'رمادي أنيق',      color: '#546E7A', dark: '#37474F', light: '#90A4AE' },
];

function applyAccentColor(hex, save) {
  if (!hex) return;
  // Derive darker and lighter variants
  const dark  = shadeColor(hex, -25);
  const light = shadeColor(hex, 30);
  const r = document.documentElement;
  r.style.setProperty('--accent',  hex);
  r.style.setProperty('--accent2', dark);
  r.style.setProperty('--accent3', light);
  // Update active swatch
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === hex);
  });
  const picker = document.getElementById('custom-color-picker');
  if (picker) picker.value = hex;
  if (save !== false) localStorage.setItem(ACCENT_KEY, hex);
}

function resetAccentColor() {
  localStorage.removeItem(ACCENT_KEY);
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent2');
  document.documentElement.style.removeProperty('--accent3');
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === '#5B7FFF');
  });
  const picker = document.getElementById('custom-color-picker');
  if (picker) picker.value = '#5B7FFF';
  localStorage.setItem(ACCENT_KEY, '#5B7FFF');
}

function loadAccentColor() {
  const saved = localStorage.getItem(ACCENT_KEY);
  if (saved) applyAccentColor(saved, false);
}

function shadeColor(hex, pct) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * pct / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * pct / 100)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * pct / 100)));
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function renderColorSwatches() {
  const container = document.getElementById('color-swatches');
  if (!container) return;
  const saved = localStorage.getItem(ACCENT_KEY) || '#5B7FFF';
  container.innerHTML = ACCENT_PRESETS.map(function(p) {
    var active = p.color === saved ? ' active' : '';
    return '<div class="color-swatch' + active + '" style="background:' + p.color + '" data-color="' + p.color + '" title="' + p.name + '" onclick="applyAccentColor(\'' + p.color + '\')"></div>';
  }).join('');
}

function updateThemeSettingLabel() {
  const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
  const lbl = document.getElementById('set-theme-label');
  const ico = document.getElementById('set-theme-icon');
  if (lbl) lbl.textContent = isDark ? 'داكن' : 'فاتح';
  if (ico) ico.className = isDark ? 'ti ti-moon' : 'ti ti-sun';
}

// ============================================================
// FAB QUICK ADD
// ============================================================
function toggleFab() {
  const fab  = document.getElementById('fab');
  const menu = document.getElementById('fab-menu');
  const back = document.getElementById('fab-backdrop');
  const open = menu.classList.contains('open');
  fab.classList.toggle('open', !open);
  menu.classList.toggle('open', !open);
  back.classList.toggle('open', !open);
}

function closeFab() {
  document.getElementById('fab').classList.remove('open');
  document.getElementById('fab-menu').classList.remove('open');
  document.getElementById('fab-backdrop').classList.remove('open');
}

function openFabEntry(type) {
  closeFab();
  document.getElementById('fab-entry-type').value = type;
  const isIn = type === 'in';
  document.getElementById('fab-entry-icon').className = isIn ? 'ti ti-arrow-down-circle' : 'ti ti-arrow-up-circle';
  document.getElementById('fab-entry-icon').style.color = isIn ? 'var(--green)' : 'var(--red)';
  document.getElementById('fab-entry-title').textContent = isIn ? 'وارد سريع' : 'صادر سريع';
  document.getElementById('fab-submit-btn').className = isIn ? 'btn btn-green' : 'btn btn-red';
  document.getElementById('fab-name').value = '';
  document.getElementById('fab-amt').value  = '';
  document.getElementById('fab-note').value = '';
  document.getElementById('modal-fab').classList.add('open');
  setTimeout(() => document.getElementById('fab-name').focus(), 300);
}

function submitFabEntry() {
  const type = document.getElementById('fab-entry-type').value;
  const name = document.getElementById('fab-name').value.trim();
  const amt  = parseFloat(document.getElementById('fab-amt').value) || 0;
  const src  = document.getElementById('fab-src').value;
  const note = document.getElementById('fab-note').value.trim();
  if (!name) { toast('اكتب البيان', 'error'); return; }
  if (amt <= 0) { toast('المبلغ لازم يكون أكبر من صفر', 'error'); return; }
  S.daily.push({ id: nid(), date: todayStr, name, source: src, type, amt, note, affect: '' });
  document.getElementById('modal-fab').classList.remove('open');
  renderAll();
  toast(`✓ ${type==='in'?'وارد':'صادر'}: ${name} · ${ar(amt)} ${_currency}`);
}

// Close FAB sheet on backdrop tap
document.addEventListener('click', e => {
  const sheet = document.getElementById('modal-fab');
  if (sheet && sheet.classList.contains('open') && e.target === sheet) {
    sheet.classList.remove('open');
  }
});

// Enter key in FAB inputs
['fab-name','fab-amt','fab-note'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if(e.key==='Enter') submitFabEntry(); });
});

// Enter key in slot payment inputs
['slot-custom-amt','slot-note'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if(e.key==='Enter') submitSlotPayment(); });
});

// ── Firebase helpers ──────────────────────────────────────────
function forceFbSync() {
  if (!window.fbSave) { toast('Firebase غير متصل بعد', 'warn'); return; }
  const payload = {
    nid: S.nid, prevBalances: S.prevBalances,
    aqsat: S.aqsat, bore: S.bore, qorod: S.qorod,
    doyon: S.doyon, daily: S.daily, recurring: S.recurring,
    auditLog: S.auditLog || [], savedAt: new Date().toISOString(),
  };
  window.fbSave(payload);
  toast('✓ جاري المزامنة مع Firebase...', 'warn');
}

function updateFbStatusSettings() {
  const el = document.getElementById('fb-status-settings');
  if (!el) return;
  if (window._fbReady) {
    el.innerHTML = '<i class="ti ti-cloud-check" style="color:var(--green);font-size:16px"></i> <span style="font-size:12px;color:var(--green);font-weight:700">متصل ✓</span>';
  } else {
    el.innerHTML = '<i class="ti ti-cloud-off" style="color:var(--red);font-size:16px"></i> <span style="font-size:12px;color:var(--red);font-weight:700">غير متصل</span>';
  }
}

// ── Site Gate ─────────────────────────────────────────────────
const GATE_KEY  = 'malak_gate_v1';
const GATE_HASH = '03b0bd366e8184f8d871c3a7c7cc26c73c25b54ff54c64b28b10b898242cdc8a'; // SHA-256 of 1948

async function gateSubmit() {
  const input = document.getElementById('gate-input');
  const errEl = document.getElementById('gate-err');
  const val   = input.value.trim();
  if (!val) return;
  const hashed = await sha256(val);
  if (hashed === GATE_HASH) {
    sessionStorage.setItem(GATE_KEY, '1');
    const gate = document.getElementById('site-gate');
    gate.classList.add('out');
    setTimeout(() => gate.style.display = 'none', 380);
    errEl.textContent = '';
  } else {
    errEl.textContent = 'كلمة المرور غلط!';
    input.value = '';
    input.focus();
    setTimeout(() => errEl.textContent = '', 2000);
  }
}

function gateCheck() {
  if (sessionStorage.getItem(GATE_KEY) === '1') {
    document.getElementById('site-gate').style.display = 'none';
  }
}

// ── Sidebar Navigation ────────────────────────────────────────
const PAGE_TITLES = {
  'pg-today':     'اليوم',
  'pg-home':      'الرئيسية',
  'pg-daily':     'اليومية',
  'pg-aqsat':     'الأقساط',
  'pg-bore':      'فلوس بره',
  'pg-qorod':     'قروض',
  'pg-doyon':     'ديون',
  'pg-reports':   'التقارير',
  'pg-overview':  'المركز المالي',
  'pg-recurring': 'المتكرر',
  'pg-calc':      'الحاسبة',
  'pg-settings':  'الإعدادات',
  'pg-aq-detail': 'تفاصيل العميل',
};

function sidebarNav(pageId, btn) {
  // navigate
  nav(pageId);
  // update sidebar active state
  document.querySelectorAll('.snav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // update topbar title
  const title = PAGE_TITLES[pageId] || '';
  const titleEl = document.getElementById('topbar-page-title');
  if (titleEl) titleEl.textContent = title;
  // update mobile bottom nav
  _updateMobileBottomNav(pageId);
  // close sidebar on mobile
  closeSidebar();
}

function _updateMobileBottomNav(pageId) {
  const map = {
    'pg-today': 'mbn-today',
    'pg-aqsat': 'mbn-aqsat',
    'pg-daily': 'mbn-daily',
    'pg-home':  'mbn-home',
  };
  document.querySelectorAll('.mbnav-item').forEach(b => b.classList.remove('active'));
  const activeId = map[pageId];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add('active');
  }
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// Set topbar date
function updateTopbarDate() {
  const el = document.getElementById('topbar-page-date');
  if (el) el.textContent = new Date().toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
}

// Sync sidebar active state with nav() calls
const _origNav = typeof nav === 'function' ? nav : null;
if (_origNav) {
  window.nav = function(pageId) {
    _origNav(pageId);
    // sync sidebar
    document.querySelectorAll('.snav-item').forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes(pageId)) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    const title = PAGE_TITLES[pageId] || '';
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = title;
  };
}

// ══════════════════════════════════════════════════════════════
//  CLIENT PROFILE — ملف العميل الكامل
// ══════════════════════════════════════════════════════════════

function openClientProfile(nameOrEl) {
  const name = (nameOrEl && nameOrEl.dataset && nameOrEl.dataset.n) ? nameOrEl.dataset.n : nameOrEl;
  if (!name) return;
  const nameLower = name.toLowerCase();

  // ── Gather all data for this person ───────────────────────
  const aqsatMatches  = S.aqsat.filter(c => c.name.toLowerCase() === nameLower);
  const dailyMatches  = S.daily.filter(e => e.name.toLowerCase() === nameLower).sort((a,b) => b.date.localeCompare(a.date));
  const boreMatches   = S.bore.filter(b => b.name.toLowerCase() === nameLower);
  const qorodMatches  = S.qorod.filter(q => q.name.toLowerCase() === nameLower);
  const doyonMatches  = S.doyon.filter(d => d.name.toLowerCase() === nameLower);

  const hasData = aqsatMatches.length || dailyMatches.length || boreMatches.length || qorodMatches.length || doyonMatches.length;
  if (!hasData) { toast('مفيش بيانات لهذا العميل', 'warn'); return; }

  // ── Header ─────────────────────────────────────────────────
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('cp-avatar').textContent = initials;
  document.getElementById('cp-name').textContent   = name;

  const phone = (aqsatMatches[0]?.phone || qorodMatches[0]?.phone || doyonMatches[0]?.phone || '');
  document.getElementById('cp-phone').innerHTML = phone
    ? `<i class="ti ti-phone" style="margin-left:4px"></i>${phone}`
    : '<i class="ti ti-user" style="margin-left:4px"></i>عميل';

  // ── Summary chips ──────────────────────────────────────────
  let chips = '';
  if (aqsatMatches.length)  chips += `<span style="background:rgba(0,212,200,.15);color:var(--teal);border:0.5px solid var(--tborder);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="ti ti-calendar-repeat" style="margin-left:4px"></i>${aqsatMatches.length} أقساط</span>`;
  if (doyonMatches.length)  chips += `<span style="background:rgba(255,176,32,.15);color:var(--amber);border:0.5px solid var(--aborder);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="ti ti-receipt" style="margin-left:4px"></i>${doyonMatches.length} ديون</span>`;
  if (qorodMatches.length)  chips += `<span style="background:rgba(255,77,106,.15);color:var(--red);border:0.5px solid var(--rborder);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="ti ti-coins" style="margin-left:4px"></i>${qorodMatches.length} قروض</span>`;
  if (dailyMatches.length)  chips += `<span style="background:rgba(32,208,104,.15);color:var(--green);border:0.5px solid var(--gborder);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="ti ti-file-invoice" style="margin-left:4px"></i>${dailyMatches.length} حركة</span>`;
  if (boreMatches.length)   chips += `<span style="background:rgba(56,189,255,.15);color:var(--blue);border:0.5px solid var(--bborder);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700"><i class="ti ti-arrow-up-circle" style="margin-left:4px"></i>${boreMatches.length} بره</span>`;
  document.getElementById('cp-chips').innerHTML = chips;

  // ── Build tabs ─────────────────────────────────────────────
  const tabs = [];
  if (aqsatMatches.length)  tabs.push({ id:'aqsat',  label:'الأقساط',   icon:'ti-calendar-repeat', color:'var(--teal)'  });
  if (doyonMatches.length)  tabs.push({ id:'doyon',  label:'الديون',    icon:'ti-receipt',          color:'var(--amber)' });
  if (qorodMatches.length)  tabs.push({ id:'qorod',  label:'القروض',    icon:'ti-coins',             color:'var(--red)'   });
  if (dailyMatches.length)  tabs.push({ id:'daily',  label:'اليومية',   icon:'ti-file-invoice',     color:'var(--green)' });
  if (boreMatches.length)   tabs.push({ id:'bore',   label:'فلوس بره',  icon:'ti-arrow-up-circle',  color:'var(--blue)'  });

  let tabsHtml = '';
  tabs.forEach((t, i) => {
    tabsHtml += `<button onclick="cpShowTab('${t.id}')" id="cp-tab-${t.id}"
      style="flex:1;padding:10px 8px;font-size:11px;font-weight:700;background:none;border:none;
             border-bottom:2px solid ${i===0 ? t.color : 'transparent'};
             color:${i===0 ? t.color : 'var(--text3)'};cursor:pointer;font-family:'Cairo',sans-serif;
             transition: background .15s, border-color .15s, color .15s, box-shadow .15s;white-space:nowrap">
      <i class="ti ${t.icon}" style="margin-left:4px"></i>${t.label}
    </button>`;
  });
  document.getElementById('cp-tabs').innerHTML = tabsHtml;

  // Store data for tab switching
  window._cpData = { aqsatMatches, dailyMatches, boreMatches, qorodMatches, doyonMatches, tabs };

  // Show first tab
  if (tabs.length) cpShowTab(tabs[0].id);

  openModal('modal-client-profile');
}

function cpShowTab(tabId) {
  const { aqsatMatches, dailyMatches, boreMatches, qorodMatches, doyonMatches, tabs } = window._cpData;
  let html = '';

  // Update tab styles
  tabs.forEach(t => {
    const btn = document.getElementById('cp-tab-' + t.id);
    if (!btn) return;
    if (t.id === tabId) {
      btn.style.borderBottomColor = t.color;
      btn.style.color = t.color;
    } else {
      btn.style.borderBottomColor = 'transparent';
      btn.style.color = 'var(--text3)';
    }
  });

  if (tabId === 'aqsat') {
    aqsatMatches.forEach(c => {
      const inst = aqInst(c), rem = aqRem(c), gross = aqGross(c), paid = gross - rem;
      const pct = gross > 0 ? Math.round((paid / gross) * 100) : 0;
      const done = aqDone(c), late = aqLate(c);
      const statusColor = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--teal)';
      const statusLabel = done ? 'مكتمل ✓' : late ? 'متأخر ⚠️' : 'نشط';
      html += `<div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:11px;background:${statusColor}22;color:${statusColor};padding:3px 10px;border-radius:20px;font-weight:700">${statusLabel}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text)">${c.item || 'قسط'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;text-align:center">
          <div style="background:var(--bg2);border-radius:8px;padding:8px">
            <div style="font-size:10px;color:var(--text3)">الإجمالي</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);direction:rtl">${ar(c.total)} ${_currency}</div>
          </div>
          <div style="background:var(--bg2);border-radius:8px;padding:8px">
            <div style="font-size:10px;color:var(--text3)">القسط</div>
            <div style="font-size:13px;font-weight:700;color:var(--teal);direction:rtl">${ar(inst)} ${_currency}</div>
          </div>
          <div style="background:var(--bg2);border-radius:8px;padding:8px">
            <div style="font-size:10px;color:var(--text3)">المتبقي</div>
            <div style="font-size:13px;font-weight:700;color:${rem > 0 ? 'var(--red)' : 'var(--green)'};direction:rtl">${ar(rem)} ${_currency}</div>
          </div>
        </div>
        <div style="background:var(--bg);border-radius:6px;height:6px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--teal));border-radius:6px;transition:width .5s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3)">
          <span>تم دفع ${pct}%</span>
          <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="closeModal('modal-client-profile');openClientDetail(${c.id})">
            <i class="ti ti-external-link"></i> التفاصيل
          </button>
        </div>
      </div>`;
    });
  }

  else if (tabId === 'doyon') {
    doyonMatches.forEach(d => {
      html += `<div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--amber);direction:rtl">${ar(d.remaining)} ${_currency}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text)">${d.name}</span>
        </div>
        <div style="font-size:11px;color:var(--text3)">${d.note || 'دين'} · فايدة/شهر: ${ar(d.monthlyInt)} ${_currency}</div>
      </div>`;
    });
  }

  else if (tabId === 'qorod') {
    qorodMatches.forEach(q => {
      html += `<div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--red);direction:rtl">${ar(q.remaining)} ${_currency}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text)">${q.name}</span>
        </div>
        <div style="font-size:11px;color:var(--text3)">${q.note || 'قرض'} · فايدة/شهر: ${ar(q.monthlyInt)} ${_currency}</div>
      </div>`;
    });
  }

  else if (tabId === 'daily') {
    html += `<div style="font-size:10px;color:var(--text3);margin-bottom:10px;text-align:center">آخر ${Math.min(dailyMatches.length, 20)} حركة</div>`;
    dailyMatches.slice(0, 20).forEach(e => {
      html += `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:6px;border:1px solid var(--border)">
        <div style="width:32px;height:32px;border-radius:8px;background:${e.type==='in'?'var(--gbg)':'var(--rbg)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ti-arrow-${e.type==='in'?'down':'up'}-circle" style="color:${e.type==='in'?'var(--green)':'var(--red)'};font-size:16px"></i>
        </div>
        <div style="flex:1;text-align:right">
          <div style="font-size:12px;font-weight:600;color:var(--text)">${e.name}</div>
          <div style="font-size:10px;color:var(--text3)">${fDate(e.date)}${e.note ? ' · ' + e.note : ''}</div>
        </div>
        <div style="font-size:12px;font-weight:700;color:${e.type==='in'?'var(--green)':'var(--red)'}">
          ${e.type==='in'?'+':'-'}${ar(e.amt)} ${_currency}
        </div>
      </div>`;
    });
  }

  else if (tabId === 'bore') {
    boreMatches.forEach(b => {
      html += `<div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:700;color:var(--blue);direction:rtl">${ar(b.amt)} ${_currency}</span>
          <span style="font-size:12px;color:var(--text)">${b.note || b.cat || 'فلوس بره'}</span>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">${fDate(b.date)}</div>
      </div>`;
    });
  }

  document.getElementById('cp-content').innerHTML = html || `<div class="empty"><i class="ti ti-inbox"></i><p>لا يوجد بيانات</p></div>`;
}

// ══════════════════════════════════════════════════════════════
//  EXPORT MONTHLY PDF — تصدير تقرير شهري
// ══════════════════════════════════════════════════════════════
async function exportMonthlyPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { toast('مكتبة PDF غير متاحة', 'error'); return; }

  toast('جاري تجهيز التقرير...', 'warn');

  const shopName  = getShopSettings().shopName || 'نظام المحل';
  const thisMonth = todayStr.slice(0, 7);
  const monthName = new Date(thisMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  const nowDate   = new Date().toLocaleDateString('ar-EG');

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 15;
  let y = MARGIN;

  // ── helpers ───────────────────────────────────────────────
  const addPage = () => { doc.addPage(); y = MARGIN; };
  const checkY  = (need = 10) => { if (y + need > H - 20) addPage(); };
  const rtlText = (text, x, yy, opts = {}) => {
    doc.text(String(text), x, yy, { align: 'right', ...opts });
  };
  const numFmt = (n) => Number(n || 0).toLocaleString('ar-EG');

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(shopName, W / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Monthly Report - ' + monthName, W / 2, 22, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y = 40;

  // ── Date line ────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Generated: ' + nowDate, MARGIN, y);
  doc.text('Month: ' + monthName, W - MARGIN, y, { align: 'right' });
  y += 10;

  // ── Section helper ────────────────────────────────────────
  const sectionTitle = (title, color = [30, 58, 138]) => {
    checkY(12);
    doc.setFillColor(...color);
    doc.rect(MARGIN, y, W - MARGIN * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, W - MARGIN - 2, y + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 12;
  };

  const row = (label, value, bold = false, color = null) => {
    checkY(8);
    if (color) doc.setTextColor(...color);
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(value), MARGIN + 2, y);
    doc.text(label, W - MARGIN - 2, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, y + 2, W - MARGIN, y + 2);
    y += 8;
  };

  // ── 1. Financial Summary ──────────────────────────────────
  const cashBal  = (S.prevBalances.cash||0)  + S.daily.filter(e=>e.source==='cash' &&e.type==='in').reduce((s,e)=>s+e.amt,0) - S.daily.filter(e=>e.source==='cash' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const instaBal = (S.prevBalances.insta||0) + S.daily.filter(e=>e.source==='insta'&&e.type==='in').reduce((s,e)=>s+e.amt,0) - S.daily.filter(e=>e.source==='insta'&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const vodaBal  = (S.prevBalances.voda||0)  + S.daily.filter(e=>e.source==='voda' &&e.type==='in').reduce((s,e)=>s+e.amt,0) - S.daily.filter(e=>e.source==='voda' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const totalBal = cashBal + instaBal + vodaBal;

  const monthIn  = S.daily.filter(e=>e.date.startsWith(thisMonth)&&e.type==='in').reduce((s,e)=>s+e.amt,0);
  const monthOut = S.daily.filter(e=>e.date.startsWith(thisMonth)&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const monthNet = monthIn - monthOut;

  sectionTitle('الملخص المالي - ' + monthName);
  row('إجمالي الوارد', numFmt(monthIn) + ' ' + _currency, true, [0, 128, 0]);
  row('إجمالي الصادر', numFmt(monthOut) + ' ' + _currency, true, [200, 0, 0]);
  row('صافي الشهر', numFmt(Math.abs(monthNet)) + ' ' + _currency + (monthNet >= 0 ? ' (ربح)' : ' (خسارة)'), true, monthNet >= 0 ? [0, 128, 0] : [200, 0, 0]);
  row('رصيد الكاش', numFmt(cashBal) + ' ' + _currency);
  row('رصيد إنستاباي', numFmt(instaBal) + ' ' + _currency);
  row('رصيد فودافون', numFmt(vodaBal) + ' ' + _currency);
  row('إجمالي الأرصدة', numFmt(totalBal) + ' ' + _currency, true);
  y += 4;

  // ── 2. Daily Transactions this month ─────────────────────
  const monthEntries = S.daily
    .filter(e => e.date.startsWith(thisMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  sectionTitle('حركات ' + monthName + ' (' + monthEntries.length + ' حركة)', [15, 80, 80]);

  if (monthEntries.length === 0) {
    checkY(8);
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text('لا توجد حركات هذا الشهر', W / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0); y += 10;
  } else {
    monthEntries.forEach(e => {
      const sign = e.type === 'in' ? '+' : '-';
      const color = e.type === 'in' ? [0, 128, 0] : [200, 0, 0];
      row(e.name + (e.note ? ' · ' + e.note : '') + ' · ' + fDate(e.date),
          sign + numFmt(e.amt) + ' ' + _currency, false, color);
    });
  }
  y += 4;

  // ── 3. Aqsat Summary ─────────────────────────────────────
  const activeAq = S.aqsat.filter(c => !aqDone(c));
  const lateAq   = S.aqsat.filter(aqLate);
  const totalAqRem = S.aqsat.reduce((s, c) => s + aqRem(c), 0);

  sectionTitle('ملخص الأقساط', [80, 15, 150]);
  row('عدد العملاء النشطين', activeAq.length);
  row('عدد المتأخرين', lateAq.length, false, lateAq.length > 0 ? [200, 0, 0] : [0, 128, 0]);
  row('إجمالي المتبقي', numFmt(totalAqRem) + ' ' + _currency, true);
  y += 4;

  if (lateAq.length > 0) {
    sectionTitle('المتأخرين في السداد', [180, 30, 30]);
    lateAq.forEach(c => {
      row(c.name + ' · ' + (c.item || 'قسط'), numFmt(aqInst(c)) + ' ' + _currency, false, [200, 0, 0]);
    });
    y += 4;
  }

  // ── 4. Aqsat paid this month ─────────────────────────────
  const paidThisMonth = S.aqsat.filter(c =>
    (c.paidDates || []).some(d => d && d.startsWith(thisMonth))
  );

  if (paidThisMonth.length > 0) {
    sectionTitle('دفعوا هذا الشهر (' + paidThisMonth.length + ')', [15, 100, 50]);
    paidThisMonth.forEach(c => {
      const amt = (c.paid || []).filter((_, i) =>
        c.paidDates?.[i]?.startsWith(thisMonth)
      ).reduce((s, p) => s + p, 0);
      row(c.name + ' · ' + (c.item || 'قسط'), numFmt(amt) + ' ' + _currency, false, [0, 128, 0]);
    });
    y += 4;
  }

  // ── 5. Loans & Debts ─────────────────────────────────────
  const activeQr = S.qorod.filter(q => q.status === 'active');
  const activeDy = S.doyon.filter(d => d.status === 'active');

  if (activeQr.length || activeDy.length) {
    sectionTitle('القروض والديون', [150, 50, 15]);
    if (activeQr.length) {
      activeQr.forEach(q => row(q.name + ' · قرض', numFmt(q.remaining) + ' ' + _currency, false, [200, 0, 0]));
    }
    if (activeDy.length) {
      activeDy.forEach(d => row(d.name + ' · دين', numFmt(d.remaining) + ' ' + _currency, false, [200, 100, 0]));
    }
    y += 4;
  }

  // ── Footer ────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(shopName + ' · ' + nowDate + ' · صفحة ' + i + ' من ' + pageCount, W / 2, H - 8, { align: 'center' });
  }

  const filename = shopName + '_' + thisMonth + '_report.pdf';
  doc.save(filename);
  toast('✓ تم تصدير التقرير: ' + filename);
}

// ══════════════════════════════════════════════════════════════
//  AUTOCOMPLETE — اقتراح الأسماء
// ══════════════════════════════════════════════════════════════

function getAllClientNames() {
  const names = new Set();
  S.aqsat.forEach(c  => names.add(c.name));
  S.doyon.forEach(d  => names.add(d.name));
  S.qorod.forEach(q  => names.add(q.name));
  S.bore.forEach(b   => names.add(b.name));
  S.daily.forEach(e  => { if(e.name) names.add(e.name); });
  return [...names].filter(Boolean).sort();
}

function autocompleteAqsat(inputId, dropdownId) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const q = input.value.trim();
  if (!q || q.length < 1) { dropdown.classList.remove('open'); return; }

  // Search in aqsat clients specifically for this input
  const matches = S.aqsat.filter(c =>
    c.name.includes(q) || c.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);

  if (!matches.length) { dropdown.classList.remove('open'); return; }

  dropdown.innerHTML = matches.map((c, i) => {
    const rem  = aqRem(c);
    const inst = aqInst(c);
    const late = aqLate(c);
    return `<div class="ac-item${i===0?' focused':''}"
      onclick="acSelectAqsat('${inputId}','${dropdownId}',${c.id})"
      data-id="${c.id}">
      <div>
        <div class="ac-item-name">${c.name}</div>
        <div class="ac-item-sub">${c.item||'قسط'} · قسط: ${ar(inst)} ${_currency}</div>
      </div>
      <div style="text-align:left">
        <div style="font-size:11px;font-weight:700;color:${late?'var(--red)':'var(--teal)'}">
          ${late?'⚠️ متأخر':'نشط'}
        </div>
        <div style="font-size:10px;color:var(--text3)">متبقي: ${ar(rem)} ${_currency}</div>
      </div>
    </div>`;
  }).join('');
  dropdown.classList.add('open');
}

function autocomplete(inputId, dropdownId, onSelect) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  const q = input.value.trim();
  if (!q || q.length < 1) { dropdown.classList.remove('open'); return; }

  const allNames = getAllClientNames();
  const matches  = allNames.filter(n =>
    n.includes(q) || n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  if (!matches.length) { dropdown.classList.remove('open'); return; }

  dropdown.innerHTML = matches.map((name, i) => `
    <div class="ac-item${i===0?' focused':''}"
      onclick="acSelect('${inputId}','${dropdownId}','${name.replace(/'/g,"\'")}')">
      <div class="ac-item-name">${name}</div>
    </div>
  `).join('');
  dropdown.classList.add('open');
}

function acSelect(inputId, dropdownId, name) {
  const input = document.getElementById(inputId);
  if (input) { input.value = name; input.focus(); }
  document.getElementById(dropdownId)?.classList.remove('open');
}

function acSelectAqsat(inputId, dropdownId, clientId) {
  const c = S.aqsat.find(x => x.id === clientId);
  if (!c) return;
  const input = document.getElementById(inputId);
  if (input) input.value = c.name;
  document.getElementById(dropdownId)?.classList.remove('open');

  // Update client info panel (for quick payment)
  const infoEl = document.getElementById('qp-client-info');
  if (infoEl) {
    const rem  = aqRem(c);
    const inst = aqInst(c);
    const late = aqLate(c);
    const done = aqDone(c);
    infoEl.style.display = 'block';
    infoEl.dataset.clientId = clientId;
    infoEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:700;
          background:${done?'var(--gbg)':late?'var(--rbg)':'var(--tbg,rgba(0,212,200,.1))'};
          color:${done?'var(--green)':late?'var(--red)':'var(--teal)'}">
          ${done?'مكتمل ✓':late?'متأخر ⚠️':'نشط'}
        </span>
        <span style="font-size:13px;font-weight:700;color:var(--text)">${c.name}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">
        <div style="background:var(--bg2);border-radius:8px;padding:8px">
          <div style="font-size:9px;color:var(--text3)">القسط</div>
          <div style="font-size:12px;font-weight:700;color:var(--teal);direction:rtl">${ar(inst)} ${_currency}</div>
        </div>
        <div style="background:var(--bg2);border-radius:8px;padding:8px">
          <div style="font-size:9px;color:var(--text3)">المتبقي</div>
          <div style="font-size:12px;font-weight:700;color:${rem>0?'var(--red)':'var(--green)'};direction:rtl">${ar(rem)} ${_currency}</div>
        </div>
        <div style="background:var(--bg2);border-radius:8px;padding:8px">
          <div style="font-size:9px;color:var(--text3)">الإجمالي</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);direction:rtl">${ar(c.total)} ${_currency}</div>
        </div>
      </div>
    `;
    // Auto-fill amount with installment amount
    const amtEl = document.getElementById('qp-amt');
    if (amtEl && !amtEl.value) amtEl.value = inst;
  }
}

function acKeydown(e, dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown || !dropdown.classList.contains('open')) return;
  const items = dropdown.querySelectorAll('.ac-item');
  const focused = dropdown.querySelector('.ac-item.focused');
  let idx = [...items].indexOf(focused);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (idx < items.length - 1) {
      focused?.classList.remove('focused');
      items[idx + 1].classList.add('focused');
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx > 0) {
      focused?.classList.remove('focused');
      items[idx - 1].classList.add('focused');
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    focused?.click();
  } else if (e.key === 'Escape') {
    dropdown.classList.remove('open');
  }
}

// Close autocomplete on outside click
document.addEventListener('click', e => {
  document.querySelectorAll('.ac-dropdown').forEach(d => {
    if (!d.parentElement?.contains(e.target)) d.classList.remove('open');
  });
});

// ══════════════════════════════════════════════════════════════
//  QUICK PAYMENT — دفعة قسط سريعة
// ══════════════════════════════════════════════════════════════

function openQuickPayment() {
  // reset
  const nameEl = document.getElementById('qp-name');
  const amtEl  = document.getElementById('qp-amt');
  const noteEl = document.getElementById('qp-note');
  const infoEl = document.getElementById('qp-client-info');
  if (nameEl) nameEl.value = '';
  if (amtEl)  amtEl.value  = '';
  if (noteEl) noteEl.value = '';
  if (infoEl) { infoEl.style.display = 'none'; infoEl.dataset.clientId = ''; }
  document.getElementById('qp-suggestions')?.classList.remove('open');
  openModal('modal-quick-payment');
  setTimeout(() => nameEl?.focus(), 300);
}

function submitQuickPayment() {
  const infoEl   = document.getElementById('qp-client-info');
  const clientId = parseInt(infoEl?.dataset?.clientId);
  const amt      = parseFloat(document.getElementById('qp-amt')?.value) || 0;
  const note     = document.getElementById('qp-note')?.value.trim() || '';

  if (!clientId) { toast('اختار عميل من القائمة', 'error'); return; }
  if (amt <= 0)  { toast('المبلغ لازم يكون أكبر من صفر', 'error'); return; }

  const c = S.aqsat.find(x => x.id === clientId);
  if (!c) { toast('عميل غير موجود', 'error'); return; }
  if (aqDone(c)) { toast('العميل سدد الكل بالفعل ✓', 'warn'); return; }

  // Record payment
  if (!c.paid)      c.paid      = [];
  if (!c.paidDates) c.paidDates = [];
  c.paid.push(amt);
  c.paidDates.push(payDate);

  // Add to daily
  S.daily.push({
    id: nid(), date: todayStr,
    name: c.name, source: 'cash',
    type: 'in', amt, note: note || 'دفعة قسط',
    affect: 'aqsat'
  });

  saveData();
  renderAll();
  closeModal('modal-quick-payment');
  toast(`✓ دفعة ${c.name}: ${ar(amt)} ${_currency}`);
  auditLog('pay', 'aqsat', c.name, `دفعة سريعة: ${amt}`);
}

// ══════════════════════════════════════════════════════════════
//  SMART ALERTS — نظام تنبيهات ذكي
// ══════════════════════════════════════════════════════════════

function renderSmartAlerts() {
  const banner = document.getElementById('smart-alerts-banner');
  if (!banner) return;

  const today    = todayStr;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // ── Gather data ──────────────────────────────────────────
  const lateList     = S.aqsat.filter(aqLate);
  const dueToday     = todayDue();
  const dueTomorrow  = S.aqsat.filter(c => {
    if (aqDone(c) || !c.price) return false;
    const now      = new Date();
    const _startS  = (c.startDate||c.startMonth||'2024-01').slice(0,7);
    const parts    = _startS.split('-');
    const sy = parseInt(parts[0]), sm = parseInt(parts[1]);
    const startIdx = (sy - 2020) * 12 + sm;
    const tomDate  = new Date(tomorrowStr);
    const tomIdx   = (tomDate.getFullYear() - 2020) * 12 + (tomDate.getMonth() + 1);
    const expected = Math.min(tomIdx - startIdx, c.months);
    return aqPaidCount(c) < expected;
  }).filter(c => !aqLate(c));

  const paidToday = S.aqsat.filter(c =>
    (c.paidDates||[]).some(d => d === today)
  );

  // ── Week net ──────────────────────────────────────────────
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekIn  = S.daily.filter(e => e.date >= weekStartStr && e.date <= today && e.type === 'in').reduce((s,e) => s+e.amt, 0);
  const weekOut = S.daily.filter(e => e.date >= weekStartStr && e.date <= today && e.type === 'out').reduce((s,e) => s+e.amt, 0);
  const weekNet = weekIn - weekOut;

  // ── Build alerts ──────────────────────────────────────────
  let alerts = '';

  // 1. Late clients
  if (lateList.length) {
    const withPhone = lateList.filter(c => c.phone);
    alerts += `
    <div class="smart-alert late" onclick="_toggleAlertDetail('al-late')">
      <div class="sa-header">
        <div class="sa-right">
          <div class="sa-icon" style="background:var(--rbg);color:var(--red)"><i class="ti ti-alert-circle"></i></div>
          <div>
            <div class="sa-title">${lateList.length} عميل متأخر في السداد</div>
            <div class="sa-sub">اضغط للتفاصيل ${withPhone.length ? '· ' + withPhone.length + ' برقم تليفون' : ''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${withPhone.length ? `<button class="sa-wa-btn" onclick="event.stopPropagation();saSendAllLate()" title="إرسال تذكير للكل"><i class="ti ti-brand-whatsapp"></i> الكل</button>` : ''}
          <i class="ti ti-chevron-down sa-chevron" id="al-late-chevron" style="color:var(--text3);transition:transform .2s"></i>
        </div>
      </div>
      <div class="sa-detail" id="al-late" style="display:none">
        ${lateList.map(c => `
          <div class="sa-row">
            <div class="sa-av" style="background:var(--rbg);color:var(--red)">${c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="sa-info">
              <div class="sa-name">${c.name}</div>
              <div class="sa-amount" style="color:var(--red)">${ar(aqInst(c))} ${_currency} · متبقي ${ar(aqRem(c))} ${_currency}</div>
            </div>
            ${c.phone
              ? `<button class="sa-wa-btn" onclick="event.stopPropagation();waOpen(${c.id},'late')"><i class="ti ti-brand-whatsapp"></i></button>`
              : `<span style="font-size:10px;color:var(--text3)">بدون رقم</span>`}
          </div>`).join('')}
      </div>
    </div>`;
  }

  // 2. Due today
  if (dueToday.length) {
    const withPhone = dueToday.filter(c => c.phone);
    alerts += `
    <div class="smart-alert due" onclick="_toggleAlertDetail('al-due')">
      <div class="sa-header">
        <div class="sa-right">
          <div class="sa-icon" style="background:var(--abg);color:var(--amber)"><i class="ti ti-bell"></i></div>
          <div>
            <div class="sa-title">${dueToday.length} قسط مستحق اليوم</div>
            <div class="sa-sub">اضغط للتفاصيل ${withPhone.length ? '· ' + withPhone.length + ' برقم تليفون' : ''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${withPhone.length ? `<button class="sa-wa-btn" onclick="event.stopPropagation();waSendAll()" style="background:var(--abg);color:var(--amber);border-color:var(--aborder)" title="تذكير الكل"><i class="ti ti-brand-whatsapp"></i> الكل</button>` : ''}
          <i class="ti ti-chevron-down sa-chevron" id="al-due-chevron" style="color:var(--text3);transition:transform .2s"></i>
        </div>
      </div>
      <div class="sa-detail" id="al-due" style="display:none">
        ${dueToday.map(c => `
          <div class="sa-row">
            <div class="sa-av" style="background:var(--abg);color:var(--amber)">${c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="sa-info">
              <div class="sa-name">${c.name}</div>
              <div class="sa-amount" style="color:var(--amber)">${ar(aqInst(c))} ${_currency}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="sa-pay-btn" onclick="event.stopPropagation();_saQuickPay(${c.id})"><i class="ti ti-credit-card"></i> دفع</button>
              ${c.phone ? `<button class="sa-wa-btn" onclick="event.stopPropagation();waOpen(${c.id},'due')"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // 3. Due tomorrow
  if (dueTomorrow.length && !dueToday.length) {
    alerts += `
    <div class="smart-alert tomorrow" onclick="_toggleAlertDetail('al-tom')">
      <div class="sa-header">
        <div class="sa-right">
          <div class="sa-icon" style="background:var(--bbg);color:var(--blue)"><i class="ti ti-calendar-event"></i></div>
          <div>
            <div class="sa-title">${dueTomorrow.length} قسط مستحق غداً</div>
            <div class="sa-sub">يفضل تذكرهم اليوم</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <i class="ti ti-chevron-down sa-chevron" id="al-tom-chevron" style="color:var(--text3);transition:transform .2s"></i>
        </div>
      </div>
      <div class="sa-detail" id="al-tom" style="display:none">
        ${dueTomorrow.map(c => `
          <div class="sa-row">
            <div class="sa-av" style="background:var(--bbg);color:var(--blue)">${c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="sa-info">
              <div class="sa-name">${c.name}</div>
              <div class="sa-amount" style="color:var(--blue)">${ar(aqInst(c))} ${_currency} · غداً</div>
            </div>
            ${c.phone ? `<button class="sa-wa-btn" onclick="event.stopPropagation();waOpen(${c.id},'tomorrow')" style="background:var(--bbg);color:var(--blue);border-color:var(--bborder)"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
  }

  // 4. Paid today (green good news)
  if (paidToday.length) {
    const totalPaidAmt = paidToday.reduce((s,c) => {
      const amt = (c.paid||[]).filter((_,i) => c.paidDates?.[i] === today).reduce((ss,p) => ss+p, 0);
      return s + amt;
    }, 0);
    alerts += `
    <div class="smart-alert paid">
      <div class="sa-header">
        <div class="sa-right">
          <div class="sa-icon" style="background:var(--gbg);color:var(--green)"><i class="ti ti-circle-check"></i></div>
          <div>
            <div class="sa-title">${paidToday.length} عميل دفع اليوم 🎉</div>
            <div class="sa-sub">إجمالي: ${ar(totalPaidAmt)} ${_currency}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // 5. Week net summary
  alerts += `
  <div class="smart-alert week" style="cursor:default">
    <div class="sa-header">
      <div class="sa-right">
        <div class="sa-icon" style="background:${weekNet>=0?'var(--gbg)':'var(--rbg)'};color:${weekNet>=0?'var(--green)':'var(--red)'}">
          <i class="ti ti-trending-${weekNet>=0?'up':'down'}"></i>
        </div>
        <div>
          <div class="sa-title">صافي الأسبوع</div>
          <div class="sa-sub">وارد ${ar(weekIn)} · صادر ${ar(weekOut)}</div>
        </div>
      </div>
      <div style="font-size:16px;font-weight:900;color:${weekNet>=0?'var(--green)':'var(--red)'};direction:rtl">
        ${weekNet>=0?'+':''}${ar(weekNet)} ${_currency}
      </div>
    </div>
  </div>`;

  // All good message
  if (!lateList.length && !dueToday.length) {
    alerts = `
    <div class="smart-alert all-good" style="cursor:default">
      <div class="sa-header">
        <div class="sa-right">
          <div class="sa-icon" style="background:var(--gbg);color:var(--green)"><i class="ti ti-mood-happy"></i></div>
          <div>
            <div class="sa-title">كل شيء تمام! 🎉</div>
            <div class="sa-sub">مفيش أقساط متأخرة أو مستحقة اليوم</div>
          </div>
        </div>
      </div>
    </div>` + alerts;
  }

  banner.innerHTML = alerts;
}

function _toggleAlertDetail(id) {
  const el  = document.getElementById(id);
  const chv = document.getElementById(id + '-chevron');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (chv) chv.style.transform = open ? '' : 'rotate(180deg)';
}

function saSendAllLate() {
  const late = S.aqsat.filter(aqLate).filter(c => c.phone);
  if (!late.length) { toast('مفيش أرقام للمتأخرين', 'warn'); return; }
  late.forEach((c, i) => setTimeout(() => waOpen(c.id, 'late'), i * 700));
  toast(`✓ هيتفتح واتساب لـ ${late.length} عميل`);
}

function _saQuickPay(clientId) {
  openQuickPayment();
  setTimeout(() => {
    const c = S.aqsat.find(x => x.id === clientId);
    if (!c) return;
    const nameEl = document.getElementById('qp-name');
    if (nameEl) nameEl.value = c.name;
    acSelectAqsat('qp-name', 'qp-suggestions', clientId);
  }, 350);
}

// ══════════════════════════════════════════════════════════════
//  SETTINGS PIN PROTECTION
// ══════════════════════════════════════════════════════════════

// ============================================================
// SETTINGS PAGE
// ============================================================
const SHOP_SETTINGS_KEY = 'malak_shop_settings_v1';

function getShopSettings() {
  try { return JSON.parse(localStorage.getItem(SHOP_SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}

function saveShopSettings() {
  const s = getShopSettings();
  s.shopName = val('set-shop-name').trim() || 'نظام المحل';
  s.currency  = val('set-currency') || 'ج';
  s.phone     = val('set-phone').trim();
  localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify(s));
  // update topbar logo name and lock title
  const logoName = document.querySelector('.logo-name');
  if(logoName) logoName.textContent = s.shopName;
  const lockTitle = document.querySelector('.lock-title');
  if(lockTitle) lockTitle.textContent = s.shopName;
  // update currency global and re-render
  _currency = s.currency || 'ج';
  renderAll();
  toast('✓ تم حفظ الإعدادات');
}

function renderSettings() {
  setTimeout(updateFbStatusSettings, 100);
  renderColorSwatches();
  updateThemeSettingLabel();
  const s = getShopSettings();
  setVal('set-shop-name', s.shopName || 'نظام المحل');
  setVal('set-currency',  s.currency || 'ج');
  setVal('set-phone',     s.phone    || '');

  // backup sub text
  const meta     = getBackupMeta();
  const backupSub = document.getElementById('set-backup-sub');
  if(backupSub) {
    if(!meta.lastBackup) {
      backupSub.textContent = '⚠ لم تعمل نسخة احتياطية قط!';
      backupSub.style.color = 'var(--red)';
    } else {
      const diffDays = Math.floor((Date.now() - new Date(meta.lastBackup).getTime()) / 864e5);
      backupSub.textContent = diffDays === 0 ? 'آخر نسخة: اليوم ✓' : `آخر نسخة: منذ ${diffDays} ${diffDays===1?'يوم':'أيام'}`;
      backupSub.style.color = diffDays >= 7 ? 'var(--red)' : diffDays >= 3 ? 'var(--amber)' : 'var(--green)';
    }
  }

  // data stats
  const statsEl = document.getElementById('set-data-stats');
  if(statsEl) {
    statsEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
      ${[
        {label:'عملاء الأقساط', val: S.aqsat.length,    color:'var(--teal)'},
        {label:'حركات اليومية', val: S.daily.length,    color:'var(--green)'},
        {label:'فلوس بره',      val: S.bore.length,     color:'var(--blue)'},
        {label:'قروض',          val: S.qorod.length,    color:'var(--red)'},
        {label:'ديون',          val: S.doyon.length,    color:'var(--amber)'},
        {label:'سجل التعديلات', val: (S.auditLog||[]).length, color:'var(--purple)'},
      ].map(item => `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--rsm);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:900;color:${item.color}">${item.val}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px">${item.label}</div>
      </div>`).join('')}
    </div>`;
  }

  // storage size
  const sizeEl = document.getElementById('set-storage-size');
  if(sizeEl) {
    const kb = ((localStorage.getItem(STORE_KEY)||'').length / 1024).toFixed(1);
    sizeEl.textContent = kb + ' KB';
  }
}

// Apply shop name on load
function applyShopSettings() {
  const s = getShopSettings();
  if(s.shopName) {
    const logoName = document.querySelector('.logo-name');
    if(logoName) logoName.textContent = s.shopName;
    const lockTitle = document.querySelector('.lock-title');
    if(lockTitle) lockTitle.textContent = s.shopName;
  }
}

