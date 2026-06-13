// ============================================================
// TODAY PAGE
// ============================================================
function todayDue() {
  var now = new Date();
  return S.aqsat.filter(function(c) {
    if (aqDone(c) || !c.price) return false;
    if (aqPaidCount(c) >= c.months) return false;

    // Parse start date
    var startStr   = c.startDate || ((c.startMonth || todayStr.slice(0,7)) + '-01');
    var startD     = new Date(startStr);

    // First installment due = 1 month after purchase
    var firstDue   = new Date(startD);
    firstDue.setMonth(firstDue.getMonth() + 1);

    // Count how many installments due by END of today
    var expected   = 0;
    var dueDate    = new Date(firstDue);
    while (dueDate <= now && expected < c.months) {
      expected++;
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Due TODAY = exactly one more expected than paid, and next due is today
    var paid       = aqPaidCount(c);
    var nextDue    = new Date(firstDue);
    nextDue.setMonth(nextDue.getMonth() + paid);

    return (
      paid < expected && paid < c.months &&
      nextDue.getDate()    === now.getDate() &&
      nextDue.getMonth()   === now.getMonth() &&
      nextDue.getFullYear()=== now.getFullYear()
    );
  });
}

function renderToday() {
  // date
  const dEl = document.getElementById('today-date');
  renderSmartAlerts();
  if (dEl) dEl.textContent = new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // balances
  const bal = (src, type) => S.daily.filter(e => e.date === todayStr && e.source === src && e.type === type).reduce((s,e) => s+e.amt, 0);
  const cashNet  = bal('cash','in')  - bal('cash','out');
  const instaNet = bal('insta','in') - bal('insta','out');
  const vodaNet  = bal('voda','in')  - bal('voda','out');

  setHTML('today-bal', `
    <div class="mcard g">
      <div class="mcard-label ct"><i class="ti ti-cash"></i> كاش اليوم</div>
      <div class="mcard-val cg">${cashNet>=0?'+':''}${ar(cashNet)} ${_currency}</div>
      <div class="mcard-sub">رصيد الآن: ${ar((S.prevBalances.cash||0)+cashNet)} ${_currency}</div>
    </div>
    <div class="mcard p">
      <div class="mcard-label cp"><i class="ti ti-device-mobile"></i> إنستا اليوم</div>
      <div class="mcard-val cp">${instaNet>=0?'+':''}${ar(instaNet)} ${_currency}</div>
      <div class="mcard-sub">رصيد الآن: ${ar((S.prevBalances.insta||0)+instaNet)} ${_currency}</div>
    </div>
    <div class="mcard t">
      <div class="mcard-label ct"><i class="ti ti-wifi"></i> فودافون اليوم</div>
      <div class="mcard-val ct">${vodaNet>=0?'+':''}${ar(vodaNet)} ${_currency}</div>
      <div class="mcard-sub">رصيد الآن: ${ar((S.prevBalances.voda||0)+vodaNet)} ${_currency}</div>
    </div>
  `);

  // due today
  const due = todayDue();
  setHTML('today-due-count', due.length ? `<span class="badge badge-a">${due.length}</span>` : '');
  setHTML('today-due', due.length ? due.map(c => clientTodayCard(c,'due')).join('') : '<div class="today-empty"><i class="ti ti-check-circle" style="font-size:26px;color:var(--green);display:block;margin-bottom:8px"></i>مفيش أقساط مستحقة اليوم 🎉</div>');

  // late
  const late = S.aqsat.filter(aqLate);
  setHTML('today-late-count', late.length ? `<span class="badge badge-r">${late.length}</span>` : '');
  setHTML('today-late', late.length ? late.map(c => clientTodayCard(c,'late')).join('') : '<div class="today-empty"><i class="ti ti-thumb-up" style="font-size:26px;color:var(--teal);display:block;margin-bottom:8px"></i>مفيش متأخرين 👍</div>');

  // recent 10
  const recent = [...S.daily].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10);
  setHTML('today-recent', recent.length ? recent.map(e => `
    <div class="feed-item">
      <div class="feed-dot" style="background:${e.type==='in'?'var(--gbg)':'var(--rbg)'};color:${e.type==='in'?'var(--green)':'var(--red)'}">
        <i class="ti ti-arrow-${e.type==='in'?'down':'up'}-circle"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</div>
        <div style="font-size:11px;color:var(--text3)">${fDate(e.date)} · ${SRC_LABELS[e.source]}</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:${e.type==='in'?'var(--green)':'var(--red)'};white-space:nowrap">${e.type==='in'?'+':'-'}${ar(e.amt)} ${_currency}</div>
      <button onclick="delTodayEntry(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px 6px;border-radius:6px;margin-right:2px;font-size:15px;line-height:1" title="حذف" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">
        <i class="ti ti-trash"></i>
      </button>
    </div>`).join('') : '<div class="today-empty">لا توجد حركات</div>');
}

function clientTodayCard(c, type) {
  const inst = aqInst(c), rem = aqRem(c);
  const initials = c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);
  const color = type==='due' ? 'linear-gradient(135deg,var(--amber),#f97316)' : 'linear-gradient(135deg,var(--red),#e11d48)';
  return `<div class="today-card ${type}">
    <div class="today-av" style="background:${color}">${initials}</div>
    <div class="today-info">
      <div class="today-name">${c.name}</div>
      <div class="today-sub">${c.item||'أقساط'} · ${aqPaidCount(c)}/${c.months} · متبقي ${ar(rem)} ${_currency}</div>
    </div>
    <div class="today-amt" style="color:${type==='due'?'var(--amber)':'var(--red)'}">${ar(inst)} ${_currency}</div>
    ${c.phone
      ? `<button class="wa-btn" onclick="waOpen(${c.id},'${type}')"><i class="ti ti-brand-whatsapp"></i>${type==='late'?' تذكير':''}</button>`
      : `<span class="badge badge-x" title="مفيش رقم"><i class="ti ti-phone-off"></i></span>`}
  </div>`;
}

function tqAdd(type) {
  const name = val('tq-name'), amt = num('tq-amt'), src = val('tq-src');
  if (!name || !amt) { toast('اكتب البيان والمبلغ', 'error'); return; }
  if (amt <= 0) { toast('المبلغ لازم يكون أكبر من صفر', 'error'); return; }
  S.daily.push({ id:nid(), date:todayStr, name, source:src, type, amt, note:'', affect:'' });
  setVal('tq-name',''); setVal('tq-amt','');
  renderAll();
  toast(`✓ ${type==='in'?'وارد':'صادر'}: ${name}`);
}

function delTodayEntry(id) {
  const e = S.daily.find(x => x.id === id);
  if (!e) return;
  confirm2(`حذف "${e.name}"؟`, `${e.type==='in'?'وارد':'صادر'} ${ar(e.amt)} ${_currency}`, () => {
    S.daily = S.daily.filter(x => x.id !== id);
    saveData(); renderAll();
    toast('تم الحذف', 'warn');
  });
}

function waSendAll() {
  const due = todayDue().filter(c => c.phone);
  if (!due.length) { toast('مفيش أرقام محفوظة للمستحقين', 'warn'); return; }
  due.forEach((c,i) => setTimeout(() => waOpen(c.id,'due'), i*700));
  toast(`✓ هيتفتح واتساب لـ ${due.length} عميل`);
}

// WhatsApp message templates
const WA_TEMPLATES = {
  late: (c, inst, rem, paid) =>
    `السلام عليكم ورحمة الله 🌸\n*${c.name}*، عايزين نذكرك بالأقساط المتأخرة 🙏\n\n📦 السلعة: ${c.item||'أقساط'}\n💰 القسط: *${ar(inst)} ${_currency}*\n📅 المسدد: ${paid} من ${c.months}\n⏳ المتبقي: *${ar(rem)} ${_currency}*\n\nيارب تكون بخير 🤝`,
  due: (c, inst, rem, paid) =>
    `السلام عليكم ورحمة الله 🌸\n*${c.name}*، تذكير بقسط هذا الشهر 📅\n\n📦 السلعة: ${c.item||'أقساط'}\n💰 القسط: *${ar(inst)} ${_currency}*\n✅ المسدد: ${paid} من ${c.months} شهر\n📊 المتبقي: *${ar(rem)} ${_currency}*\n\nشكراً لتعاملكم معنا 🙏`,
  paid: (c, inst, rem, paid) =>
    `السلام عليكم ورحمة الله 🌸\n*${c.name}*، تم تسجيل دفع القسط بنجاح ✅\n\n📦 السلعة: ${c.item||'أقساط'}\n💰 المبلغ المدفوع: *${ar(inst)} ${_currency}*\n📊 المسدد: ${paid} من ${c.months} شهر\n${rem<=0?'🎉 تم سداد جميع الأقساط! شكراً جزيلاً 🙏':`⏳ المتبقي: *${ar(rem)} ${_currency}*\n\nشكراً لتعاملكم معنا 🙏`}`,
  tomorrow: (c, inst, rem, paid) =>
    `السلام عليكم ورحمة الله 🌸\n*${c.name}*، نذكرك بلطف أن موعد قسطك *غداً* 📅\n\n📦 السلعة: ${c.item||'أقساط'}\n💰 القسط: *${ar(inst)} ${_currency}*\n✅ المسدد: ${paid} من ${c.months} شهر\n📊 المتبقي: *${ar(rem)} ${_currency}*\n\nشكراً لتعاونكم 🙏`,
  done: (c, inst, rem, paid) =>
    `السلام عليكم ورحمة الله 🌸\n🎉 مبروك يا *${c.name}*!\n\nتم سداد جميع أقساط *${c.item||'الأقساط'}* بالكامل ✅\nإجمالي ما دفعته: *${ar(aqGross(c))} ${_currency}*\n\nشكراً لثقتكم ومعاملتكم الطيبة 🙏\nنتمنى دوام التعامل معكم 💛`,
};

let _waCurrentId = null, _waCurrentType = null;

function waOpen(id, type='due') {
  const c = S.aqsat.find(x => x.id === id);
  if (!c || !c.phone) { toast('مفيش رقم تليفون', 'warn'); return; }
  _waCurrentId   = id;
  _waCurrentType = type;
  const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c);
  const tpl  = WA_TEMPLATES[type] || WA_TEMPLATES.due;

  // populate modal
  document.getElementById('wa-modal-name').textContent  = c.name;
  setTimeout(() => { const t=document.getElementById('wa-msg-text'); if(t) document.getElementById('wa-char-count').textContent = t.value.length + ' حرف'; }, 50);
  document.getElementById('wa-modal-phone').textContent = c.phone;
  document.getElementById('wa-msg-text').value = tpl(c, inst, rem, paid);

  // highlight active template button
  document.querySelectorAll('.wa-tpl-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('wa-tpl-' + type);
  if (activeBtn) activeBtn.classList.add('active');

  openModal('modal-wa');
}

function waSwitchTemplate(type) {
  const c = S.aqsat.find(x => x.id === _waCurrentId);
  if (!c) return;
  _waCurrentType = type;
  const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c);
  const tpl  = WA_TEMPLATES[type] || WA_TEMPLATES.due;
  document.getElementById('wa-msg-text').value = tpl(c, inst, rem, paid);
  document.querySelectorAll('.wa-tpl-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('wa-tpl-' + type);
  if (btn) btn.classList.add('active');
}

function waSendMsg() {
  const c = S.aqsat.find(x => x.id === _waCurrentId);
  if (!c) return;
  const msg   = document.getElementById('wa-msg-text').value.trim();
  const phone = c.phone.replace(/[^0-9]/g,'').replace(/^0/,'20');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  closeModal('modal-wa');
}

function waSendWithReceipt() {
  const c = S.aqsat.find(x => x.id === _waCurrentId);
  if (!c) return;
  waSendMsg();
  setTimeout(() => printReceipt(_waCurrentId), 500);
}

// ============================================================
// HOME PAGE
// ============================================================
function renderHome() {
  const today = todayStr;
  const now   = new Date();
  const thisMonth = today.slice(0, 7); // YYYY-MM

  // ── Balances ──────────────────────────────────────────────
  const cashBal  = (S.prevBalances.cash||0)  + S.daily.filter(e=>e.source==='cash' &&e.type==='in').reduce((s,e)=>s+e.amt,0)  - S.daily.filter(e=>e.source==='cash' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const instaBal = (S.prevBalances.insta||0) + S.daily.filter(e=>e.source==='insta'&&e.type==='in').reduce((s,e)=>s+e.amt,0) - S.daily.filter(e=>e.source==='insta'&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const vodaBal  = (S.prevBalances.voda||0)  + S.daily.filter(e=>e.source==='voda' &&e.type==='in').reduce((s,e)=>s+e.amt,0)  - S.daily.filter(e=>e.source==='voda' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const totalBal = cashBal + instaBal + vodaBal;

  // ── Aqsat ─────────────────────────────────────────────────
  const totalAqRem = S.aqsat.reduce((s,c)=>s+aqRem(c),0);
  const monthAq    = S.aqsat.filter(c=>!aqDone(c)&&c.price>0).reduce((s,c)=>s+aqInst(c),0);
  const lateCount  = S.aqsat.filter(aqLate).length;
  const activeAq   = S.aqsat.filter(c=>!aqDone(c)).length;

  // ── Other ─────────────────────────────────────────────────
  const totalQr = S.qorod.filter(q=>q.status==='active').reduce((s,q)=>s+q.remaining,0);
  const totalDy = S.doyon.filter(d=>d.status==='active').reduce((s,d)=>s+d.remaining,0);
  const totalBore = S.bore.reduce((s,b)=>s+b.amt,0);

  // ── Monthly ───────────────────────────────────────────────
  const monthlyIn  = S.daily.filter(e=>e.date.startsWith(thisMonth)&&e.type==='in').reduce((s,e)=>s+e.amt,0);
  const monthlyOut = S.daily.filter(e=>e.date.startsWith(thisMonth)&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const monthlyNet = monthlyIn - monthlyOut;

  // ── KPI Cards ─────────────────────────────────────────────
  setHTML('home-metrics', `
    <div class="mcard g"><div class="mcard-label cg"><i class="ti ti-wallet"></i> إجمالي الأرصدة</div><div class="mcard-val cg">${ar(totalBal)} ${_currency}</div><div class="mcard-sub">كاش ${ar(cashBal)} · إنستا ${ar(instaBal)}</div></div>
    <div class="mcard t"><div class="mcard-label ct"><i class="ti ti-calendar-repeat"></i> متبقي الأقساط</div><div class="mcard-val ct">${ar(totalAqRem)} ${_currency}</div><div class="mcard-sub">شهرياً: ${ar(monthAq)} ${_currency} · ${activeAq} عميل نشط</div></div>
    <div class="mcard ${monthlyNet>=0?'g':'r'}"><div class="mcard-label c${monthlyNet>=0?'g':'r'}"><i class="ti ti-trending-${monthlyNet>=0?'up':'down'}"></i> صافي الشهر</div><div class="mcard-val c${monthlyNet>=0?'g':'r'}">${ar(Math.abs(monthlyNet))} ${_currency}</div><div class="mcard-sub">وارد ${ar(monthlyIn)} · صادر ${ar(monthlyOut)}</div></div>
    <div class="mcard ${lateCount?'r':'g'}"><div class="mcard-label c${lateCount?'r':'g'}"><i class="ti ti-alert-${lateCount?'circle':'check'}"></i> ${lateCount?'متأخرين':'كل شيء تمام'}</div><div class="mcard-val c${lateCount?'r':'g'}">${lateCount ? lateCount+' عملاء' : '✓'}</div><div class="mcard-sub">${lateCount?'يحتاج متابعة':'لا توجد أقساط متأخرة'}</div></div>
    <div class="mcard r"><div class="mcard-label cr"><i class="ti ti-coins"></i> قروض + ديون</div><div class="mcard-val cr">${ar(totalQr+totalDy)} ${_currency}</div><div class="mcard-sub">قروض ${ar(totalQr)} · ديون ${ar(totalDy)}</div></div>
    <div class="mcard b"><div class="mcard-label cb"><i class="ti ti-arrow-up-circle"></i> فلوس بره</div><div class="mcard-val cb">${ar(totalBore)} ${_currency}</div><div class="mcard-sub">${S.bore.length} بند</div></div>
  `);

  // ── Week Chart ────────────────────────────────────────────
  const days7=[],inD=[],outD=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=d.toISOString().split('T')[0];
    days7.push(sDate(k));
    inD.push(S.daily.filter(e=>e.date===k&&e.type==='in').reduce((s,e)=>s+e.amt,0));
    outD.push(S.daily.filter(e=>e.date===k&&e.type==='out').reduce((s,e)=>s+e.amt,0));
  }
  buildChart('home-chart','bar',{
    labels:days7,
    datasets:[
      {label:'وارد',data:inD,backgroundColor:'rgba(32,208,104,.75)',borderRadius:6},
      {label:'صادر',data:outD,backgroundColor:'rgba(255,77,106,.75)',borderRadius:6}
    ]
  });

  // ── Who Paid Today / Late ─────────────────────────────────
  window._homePaidTab = window._homePaidTab || 'late';
  homePaidTab(window._homePaidTab);

  // ── Monthly Summary ───────────────────────────────────────
  const monthName = new Date(thisMonth+'-01').toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  const monthAqPaid = S.aqsat.reduce((s,c)=>{
    const mp = (c.paid||[]).filter((_,i)=>{
      const pd = c.paidDates?.[i];
      return pd && pd.startsWith(thisMonth);
    });
    return s + mp.reduce((ss,p)=>ss+p,0);
  },0);

  const monthDailyRows = S.daily.filter(e=>e.date.startsWith(thisMonth));
  const byCat = {};
  monthDailyRows.forEach(e=>{
    const cat = e.affect||'other';
    if(!byCat[cat]) byCat[cat]={in:0,out:0};
    byCat[cat][e.type] += e.amt;
  });

  const CAT_NAMES = {aqsat:'أقساط',doyon:'ديون',qorod:'قروض',bore:'بره',masarif:'مصاريف',other:'أخرى'};
  let catRows = '';
  Object.entries(byCat).sort((a,b)=>(b[1].in+b[1].out)-(a[1].in+a[1].out)).forEach(([cat,v])=>{
    catRows += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span>${v.in>0?`<span style='color:var(--green)'>+${ar(v.in)}</span>`:''} ${v.out>0?`<span style='color:var(--red)'>-${ar(v.out)}</span>`:''} ${_currency}</span>
      <span style="color:var(--text2)">${CAT_NAMES[cat]||cat}</span>
    </div>`;
  });

  setHTML('home-monthly-summary', `
    <div style="text-align:center;margin-bottom:10px;font-size:11px;color:var(--text3);font-weight:700">${monthName}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--green)">وارد</div>
        <div style="font-size:15px;font-weight:800;color:var(--green);direction:rtl">${ar(monthlyIn)} ${_currency}</div>
      </div>
      <div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--red)">صادر</div>
        <div style="font-size:15px;font-weight:800;color:var(--red);direction:rtl">${ar(monthlyOut)} ${_currency}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-align:right;font-weight:700">تفصيلة التصنيفات</div>
    ${catRows || '<div style="font-size:11px;color:var(--text3);text-align:center;padding:8px">لا توجد بيانات هذا الشهر</div>'}
  `);

  // ── Recent Activity ───────────────────────────────────────
  const recent = [...S.daily].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  let recentHtml = '';
  recent.forEach(e => {
    recentHtml += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="width:28px;height:28px;border-radius:8px;background:${e.type==='in'?'var(--gbg)':'var(--rbg)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-arrow-${e.type==='in'?'down':'up'}-circle" style="font-size:14px;color:${e.type==='in'?'var(--green)':'var(--red)'}"></i>
      </div>
      <div style="flex:1;text-align:right;min-width:0">
        <div style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</div>
        <div style="font-size:9px;color:var(--text3)">${fDate(e.date)}</div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${e.type==='in'?'var(--green)':'var(--red)'}">
        ${e.type==='in'?'+':'-'}${ar(e.amt)} ${_currency}
      </div>
    </div>`;
  });
  setHTML('home-recent-activity', recentHtml || '<div class="empty" style="padding:20px"><i class="ti ti-inbox"></i><p>لا توجد حركات</p></div>');
}

function homePaidTab(tab) {
  window._homePaidTab = tab;
  const lateBtn = document.getElementById('hpt-late');
  const paidBtn = document.getElementById('hpt-paid');
  if (lateBtn) { lateBtn.style.background = tab==='late'?'var(--rbg)':'transparent'; lateBtn.style.opacity = tab==='late'?'1':'0.5'; }
  if (paidBtn) { paidBtn.style.background = tab==='paid'?'var(--gbg)':'transparent'; paidBtn.style.opacity = tab==='paid'?'1':'0.5'; }

  const today = todayStr;
  let html = '';

  if (tab === 'late') {
    const lateList = S.aqsat.filter(aqLate);
    if (!lateList.length) {
      html = '<div style="text-align:center;padding:20px;font-size:12px;color:var(--green)"><i class="ti ti-circle-check" style="font-size:20px;display:block;margin-bottom:6px"></i>لا يوجد متأخرين 🎉</div>';
    } else {
      lateList.forEach(c => {
        const initials = c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);
        html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openClientProfile(this.dataset.n)" data-n="${c.name}">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--rbg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--red);flex-shrink:0">${initials}</div>
          <div style="flex:1;text-align:right">
            <div style="font-size:11px;font-weight:600;color:var(--text)">${c.name}</div>
            <div style="font-size:9px;color:var(--text3)">${c.item||'قسط'} · ${ar(aqInst(c))} ${_currency}</div>
          </div>
          <div style="font-size:9px;color:var(--red);font-weight:700">متأخر ⚠️</div>
        </div>`;
      });
    }
  } else {
    const paidToday = S.aqsat.filter(c => (c.paidDates||[]).some(d=>d===today));
    if (!paidToday.length) {
      html = '<div style="text-align:center;padding:20px;font-size:12px;color:var(--text3)"><i class="ti ti-calendar" style="font-size:20px;display:block;margin-bottom:6px"></i>لا يوجد دفعات اليوم</div>';
    } else {
      paidToday.forEach(c => {
        const initials = c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);
        const todayPaid = (c.paid||[]).filter((_,i)=>c.paidDates?.[i]===today).reduce((s,p)=>s+p,0);
        html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openClientProfile(this.dataset.n)" data-n="${c.name}">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--gbg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--green);flex-shrink:0">${initials}</div>
          <div style="flex:1;text-align:right">
            <div style="font-size:11px;font-weight:600;color:var(--text)">${c.name}</div>
            <div style="font-size:9px;color:var(--text3)">${c.item||'قسط'}</div>
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--green)">+${ar(todayPaid)} ${_currency}</div>
        </div>`;
      });
    }
  }
  setHTML('home-paid-list', html);
}

// ============================================================
// OVERVIEW PAGE — المركز المالي الكامل
// ============================================================
function renderOverview() {
  const el = document.getElementById('ov-content');
  if (!el) return;
  const upd = document.getElementById('ov-last-update');
  if (upd) upd.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG');

  // ── الأرصدة الفعلية ─────────────────────────────────────────
  const cashBal  = (S.prevBalances.cash||0)  + S.daily.filter(e=>e.source==='cash' &&e.type==='in').reduce((s,e)=>s+e.amt,0)  - S.daily.filter(e=>e.source==='cash' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const instaBal = (S.prevBalances.insta||0) + S.daily.filter(e=>e.source==='insta'&&e.type==='in').reduce((s,e)=>s+e.amt,0) - S.daily.filter(e=>e.source==='insta'&&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const vodaBal  = (S.prevBalances.voda||0)  + S.daily.filter(e=>e.source==='voda' &&e.type==='in').reduce((s,e)=>s+e.amt,0)  - S.daily.filter(e=>e.source==='voda' &&e.type==='out').reduce((s,e)=>s+e.amt,0);
  const totalCash = cashBal + instaBal + vodaBal;

  // ── الأقساط ─────────────────────────────────────────────────
  const activeAq   = S.aqsat.filter(c => !aqDone(c) && c.price > 0);
  const doneAq     = S.aqsat.filter(c => aqDone(c));
  const aqTotalRem = activeAq.reduce((s,c) => s + aqRem(c), 0);
  const aqMonthly  = activeAq.reduce((s,c) => s + aqInst(c), 0);
  const aqLateList = S.aqsat.filter(aqLate);
  const aqAllInt   = S.aqsat.filter(c=>c.price>0).reduce((s,c) => s + aqTotalInt(c), 0);
  const aqTotalCollected = S.aqsat.reduce((s,c) => s + (c.paid||[]).reduce((ss,p)=>ss+p,0), 0);
  const aqTotalGross = S.aqsat.filter(c=>c.price>0).reduce((s,c) => s + aqGross(c), 0);
  const aqTotalPaid = aqTotalGross - aqTotalRem;

  // ── فلوس بره ────────────────────────────────────────────────
  const boreTotalAmt = S.bore.reduce((s,b) => s + b.amt, 0);
  const boreByCat = {};
  S.bore.forEach(b => { boreByCat[b.cat] = (boreByCat[b.cat]||0) + b.amt; });

  // ── قروض ليك ────────────────────────────────────────────────
  const activeQr     = S.qorod.filter(q => q.status === 'active');
  const qrTotalOrig  = activeQr.reduce((s,q) => s + q.original, 0);
  const qrTotalRem   = activeQr.reduce((s,q) => s + q.remaining, 0);
  const qrMonthlyInt = activeQr.reduce((s,q) => s + (q.monthlyInt||0), 0);
  const qrAllDue     = activeQr.reduce((s,q) => s + qrTotalDue(q), 0);
  const qrIntCollected = S.qorod.reduce((s,q) => s + (q.payments||[]).reduce((ss,p)=>ss+p.amt,0), 0);

  // ── ديون عليك ───────────────────────────────────────────────
  const activeDy     = S.doyon.filter(d => d.status === 'active');
  const dyTotalOrig  = activeDy.reduce((s,d) => s + d.original, 0);
  const dyTotalRem   = activeDy.reduce((s,d) => s + d.remaining, 0);
  const dyMonthlyInt = activeDy.reduce((s,d) => s + (d.monthlyInt||0), 0);
  const dyTotalDueAmt= activeDy.reduce((s,d) => s + dyTotalDue(d), 0);
  const dyIntPaid    = S.doyon.reduce((s,d) => s + (d.payments||[]).reduce((ss,p)=>ss+p.amt,0), 0);

  // ── هامش الربح ──────────────────────────────────────────────
  // الدخل: أقساط محصّلة + فوايد قروض محصّلة
  // الخروج: فوايد ديون مدفوعة
  const totalIncome  = aqTotalPaid + qrIntCollected;
  const totalExpense = dyIntPaid;
  const netProfit    = totalIncome - totalExpense;

  // الدخل الشهري المتوقع
  const monthlyIncome  = aqMonthly + qrMonthlyInt;
  const monthlyExpense = dyMonthlyInt;
  const monthlyNet     = monthlyIncome - monthlyExpense;

  // ── الأصول vs الالتزامات ────────────────────────────────────
  const totalAssets      = totalCash + aqTotalRem + boreTotalAmt + qrTotalRem;
  const totalLiabilities = dyTotalRem;
  const netWorth         = totalAssets - totalLiabilities;

  // ── Render ──────────────────────────────────────────────────
  el.innerHTML = `

  <!-- ① صافي المركز المالي - البطاقة الكبيرة -->
  <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--accent)22,var(--bg2));border:2px solid var(--accent)44">
    <div style="text-align:center;padding:8px 0 16px">
      <div style="font-size:12px;color:var(--text3);font-weight:700;margin-bottom:6px">صافي المركز المالي (الأصول — الالتزامات)</div>
      <div style="font-size:36px;font-weight:900;color:${netWorth>=0?'var(--accent)':'var(--red)'};line-height:1">${ar(netWorth)} ${_currency}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:6px">أصول: ${ar(totalAssets)} ${_currency} &nbsp;·&nbsp; التزامات: ${ar(totalLiabilities)} ${_currency}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;border-top:1px solid var(--border);padding-top:14px">
      <div style="text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">دخل شهري متوقع</div>
        <div style="font-size:18px;font-weight:900;color:var(--green)">${ar(monthlyIncome)} ${_currency}</div>
      </div>
      <div style="text-align:center;border-right:1px solid var(--border);border-left:1px solid var(--border)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">مصروف شهري</div>
        <div style="font-size:18px;font-weight:900;color:var(--red)">${ar(monthlyExpense)} ${_currency}</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">صافي شهري</div>
        <div style="font-size:18px;font-weight:900;color:${monthlyNet>=0?'var(--green)':'var(--red)'}">${monthlyNet>=0?'+':''}${ar(monthlyNet)} ${_currency}</div>
      </div>
    </div>
  </div>

  <!-- ② الأرصدة الفعلية -->
  <div class="ov-section">
    <div class="ov-section-title" onclick="nav('pg-daily')">
      <i class="ti ti-wallet" style="color:var(--green)"></i> الأرصدة الفعلية
      <span class="ov-total" style="color:var(--green)">${ar(totalCash)} ${_currency}</span>
      <i class="ti ti-chevron-left ov-arrow"></i>
    </div>
    <div class="ov-row-grid">
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">💵 كاش</div>
        <div class="ov-stat-val" style="color:var(--green)">${ar(cashBal)} ${_currency}</div>
        <div class="ov-stat-pct">${totalCash>0?Math.round(cashBal/totalCash*100):0}%</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--tborder)">
        <div class="ov-stat-label">📱 إنستا</div>
        <div class="ov-stat-val" style="color:var(--teal)">${ar(instaBal)} ${_currency}</div>
        <div class="ov-stat-pct">${totalCash>0?Math.round(instaBal/totalCash*100):0}%</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--pborder)">
        <div class="ov-stat-label">📡 فودافون</div>
        <div class="ov-stat-val" style="color:var(--purple)">${ar(vodaBal)} ${_currency}</div>
        <div class="ov-stat-pct">${totalCash>0?Math.round(vodaBal/totalCash*100):0}%</div>
      </div>
    </div>
  </div>

  <!-- ③ الأقساط -->
  <div class="ov-section">
    <div class="ov-section-title" onclick="nav('pg-aqsat')">
      <i class="ti ti-calendar-repeat" style="color:var(--teal)"></i> أقساط العملاء
      <span class="ov-total" style="color:var(--teal)">${ar(aqTotalRem)} ${_currency} متبقي</span>
      <i class="ti ti-chevron-left ov-arrow"></i>
    </div>
    <div class="ov-row-grid">
      <div class="ov-stat-box" style="border-color:var(--tborder)">
        <div class="ov-stat-label">عملاء نشطين</div>
        <div class="ov-stat-val" style="color:var(--teal)">${activeAq.length}</div>
        <div class="ov-stat-pct">${doneAq.length} منتهي</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--tborder)">
        <div class="ov-stat-label">قسط شهري</div>
        <div class="ov-stat-val" style="color:var(--teal)">${ar(aqMonthly)} ${_currency}</div>
        <div class="ov-stat-pct">دخل ثابت</div>
      </div>
      <div class="ov-stat-box" style="border-color:${aqLateList.length?'var(--rborder)':'var(--gborder)'}">
        <div class="ov-stat-label">متأخرين</div>
        <div class="ov-stat-val" style="color:${aqLateList.length?'var(--red)':'var(--green)'}">${aqLateList.length}</div>
        <div class="ov-stat-pct">${aqLateList.length?ar(aqLateList.reduce((s,c)=>s+aqInst(c),0))+' '+_currency:'✓ لا تأخير'}</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">محصّل لحد الآن</div>
        <div class="ov-stat-val" style="color:var(--green)">${ar(aqTotalPaid)} ${_currency}</div>
        <div class="ov-stat-pct">من ${ar(aqTotalGross)} ${_currency}</div>
      </div>
    </div>
    ${aqLateList.length ? `
    <div style="margin-top:8px;padding:8px 12px;background:var(--rbg);border-radius:8px;font-size:12px;color:var(--red)">
      <b>متأخرين:</b> ${aqLateList.map(c=>c.name).join(' · ')}
    </div>` : ''}
  </div>

  <!-- ④ فلوس بره -->
  <div class="ov-section">
    <div class="ov-section-title" onclick="nav('pg-bore')">
      <i class="ti ti-arrow-up-circle" style="color:var(--blue)"></i> فلوس بره
      <span class="ov-total" style="color:var(--blue)">${ar(boreTotalAmt)} ${_currency}</span>
      <i class="ti ti-chevron-left ov-arrow"></i>
    </div>
    <div class="ov-row-grid">
      ${Object.entries(boreByCat).map(([cat,amt]) => `
      <div class="ov-stat-box" style="border-color:var(--bborder)">
        <div class="ov-stat-label">${cat}</div>
        <div class="ov-stat-val" style="color:var(--blue)">${ar(amt)} ${_currency}</div>
        <div class="ov-stat-pct">${boreTotalAmt>0?Math.round(amt/boreTotalAmt*100):0}%</div>
      </div>`).join('')}
      ${S.bore.length===0?`<div style="color:var(--text3);font-size:12px;padding:8px">لا توجد بنود</div>`:''}
    </div>
    <div class="ov-items-list">
      ${S.bore.slice(0,5).map(b=>`
      <div class="ov-item-row" onclick="openBoreDetail(${b.id})">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <div style="font-weight:800;font-size:13px">${b.name}</div>
          <span style="font-size:10px;color:var(--text3);background:var(--bg3);padding:1px 6px;border-radius:10px">${b.cat}</span>
        </div>
        <div style="font-weight:900;color:var(--blue)">${ar(b.amt)} ${_currency}</div>
      </div>`).join('')}
      ${S.bore.length>5?`<div style="font-size:11px;color:var(--text3);text-align:center;padding:6px;cursor:pointer" onclick="nav('pg-bore')">+${S.bore.length-5} بنود أخرى →</div>`:''}
    </div>
  </div>

  <!-- ⑤ قروض ليك -->
  <div class="ov-section">
    <div class="ov-section-title" onclick="nav('pg-qorod')">
      <i class="ti ti-coins" style="color:var(--green)"></i> قروض ليك (بتاخد فايدة)
      <span class="ov-total" style="color:var(--green)">${ar(qrTotalRem)} ${_currency} متبقي</span>
      <i class="ti ti-chevron-left ov-arrow"></i>
    </div>
    <div class="ov-row-grid">
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">أصل القروض</div>
        <div class="ov-stat-val" style="color:var(--green)">${ar(qrTotalOrig)} ${_currency}</div>
        <div class="ov-stat-pct">${activeQr.length} قرض</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">فايدة/شهر</div>
        <div class="ov-stat-val" style="color:var(--green)">${ar(qrMonthlyInt)} ${_currency}</div>
        <div class="ov-stat-pct">دخل ثابت</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">مستحق الآن</div>
        <div class="ov-stat-val" style="color:${qrAllDue>0?'var(--amber)':'var(--green)'}">${ar(qrAllDue)} ${_currency}</div>
        <div class="ov-stat-pct">فوايد + أصل</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--gborder)">
        <div class="ov-stat-label">فوايد محصّلة</div>
        <div class="ov-stat-val" style="color:var(--green)">${ar(qrIntCollected)} ${_currency}</div>
        <div class="ov-stat-pct">إجمالي</div>
      </div>
    </div>
    <div class="ov-items-list">
      ${activeQr.slice(0,5).map(q=>`
      <div class="ov-item-row" onclick="openQrDetailPage(${q.id})">
        <div style="flex:1">
          <div style="font-weight:800;font-size:13px">${q.name}</div>
          <div style="font-size:11px;color:var(--text3)">فايدة ${ar(q.monthlyInt)} ${_currency}/شهر</div>
        </div>
        <div style="text-align:left">
          <div style="font-weight:900;color:var(--green);font-size:13px">${ar(q.remaining)} ${_currency}</div>
          <div style="font-size:10px;color:var(--text3)">مستحق: ${ar(qrTotalDue(q))} ${_currency}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ⑥ ديون عليك -->
  <div class="ov-section">
    <div class="ov-section-title" onclick="nav('pg-doyon')">
      <i class="ti ti-receipt" style="color:var(--red)"></i> ديون عليك (بتدفع فايدة)
      <span class="ov-total" style="color:var(--red)">${ar(dyTotalRem)} ${_currency} متبقي</span>
      <i class="ti ti-chevron-left ov-arrow"></i>
    </div>
    <div class="ov-row-grid">
      <div class="ov-stat-box" style="border-color:var(--rborder)">
        <div class="ov-stat-label">أصل الديون</div>
        <div class="ov-stat-val" style="color:var(--red)">${ar(dyTotalOrig)} ${_currency}</div>
        <div class="ov-stat-pct">${activeDy.length} دين</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--rborder)">
        <div class="ov-stat-label">فايدة/شهر</div>
        <div class="ov-stat-val" style="color:var(--red)">${ar(dyMonthlyInt)} ${_currency}</div>
        <div class="ov-stat-pct">مصروف ثابت</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--rborder)">
        <div class="ov-stat-label">مستحق عليك</div>
        <div class="ov-stat-val" style="color:var(--red)">${ar(dyTotalDueAmt)} ${_currency}</div>
        <div class="ov-stat-pct">فوايد + أصل</div>
      </div>
      <div class="ov-stat-box" style="border-color:var(--rborder)">
        <div class="ov-stat-label">فوايد مدفوعة</div>
        <div class="ov-stat-val" style="color:var(--amber)">${ar(dyIntPaid)} ${_currency}</div>
        <div class="ov-stat-pct">إجمالي</div>
      </div>
    </div>
    <div class="ov-items-list">
      ${activeDy.slice(0,5).map(d=>`
      <div class="ov-item-row" onclick="openDyDetail(${d.id})">
        <div style="flex:1">
          <div style="font-weight:800;font-size:13px">${d.name}</div>
          <div style="font-size:11px;color:var(--text3)">فايدة ${ar(d.monthlyInt)} ${_currency}/شهر</div>
        </div>
        <div style="text-align:left">
          <div style="font-weight:900;color:var(--red);font-size:13px">${ar(d.remaining)} ${_currency}</div>
          <div style="font-size:10px;color:var(--text3)">مستحق: ${ar(dyTotalDue(d))} ${_currency}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ⑦ هامش الربح -->
  <div class="ov-section" style="border-color:${netProfit>=0?'var(--gborder)':'var(--rborder)'}">
    <div class="ov-section-title">
      <i class="ti ti-trending-up" style="color:${netProfit>=0?'var(--green)':'var(--red)'}"></i> هامش الربح
      <span class="ov-total" style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${netProfit>=0?'+':''}${ar(netProfit)} ${_currency}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">📥 إجمالي الدخل</div>
        <div style="font-size:20px;font-weight:900;color:var(--green)">${ar(totalIncome)} ${_currency}</div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">
          <div style="display:flex;justify-content:space-between"><span>أقساط محصّلة</span><span style="color:var(--green)">${ar(aqTotalPaid)} ${_currency}</span></div>
          <div style="display:flex;justify-content:space-between"><span>فوايد قروض</span><span style="color:var(--green)">${ar(qrIntCollected)} ${_currency}</span></div>
        </div>
      </div>
      <div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:10px;padding:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">📤 إجمالي المصاريف</div>
        <div style="font-size:20px;font-weight:900;color:var(--red)">${ar(totalExpense)} ${_currency}</div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">
          <div style="display:flex;justify-content:space-between"><span>فوايد ديون</span><span style="color:var(--red)">${ar(dyIntPaid)} ${_currency}</span></div>
        </div>
      </div>
    </div>
    <div style="background:${netProfit>=0?'var(--gbg)':'var(--rbg)'};border:2px solid ${netProfit>=0?'var(--gborder)':'var(--rborder)'};border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:12px;color:var(--text3);margin-bottom:4px">صافي الربح الكلي</div>
      <div style="font-size:28px;font-weight:900;color:${netProfit>=0?'var(--green)':'var(--red)'}">${netProfit>=0?'+':''}${ar(netProfit)} ${_currency}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:6px">
        صافي شهري متوقع: <b style="color:${monthlyNet>=0?'var(--green)':'var(--red)'}">${monthlyNet>=0?'+':''}${ar(monthlyNet)} ${_currency}</b>
      </div>
    </div>
  </div>`;
}

// ============================================================
// DAILY PAGE
// ============================================================
function renderDaily() {
  const dateEl     = document.getElementById('d-date');
  const date       = dateEl ? dateEl.value || todayStr : todayStr;

  // always sync balance fields with current saved values
  const cashEl  = document.getElementById('bal-inline-cash');
  const instaEl = document.getElementById('bal-inline-insta');
  const vodaEl  = document.getElementById('bal-inline-voda');
  if (cashEl  && document.activeElement !== cashEl)  cashEl.value  = S.prevBalances.cash  || 0;
  if (instaEl && document.activeElement !== instaEl) instaEl.value = S.prevBalances.insta || 0;
  if (vodaEl  && document.activeElement !== vodaEl)  vodaEl.value  = S.prevBalances.voda  || 0;
  previewBalance();

  const src        = val('d-src') || 'all';
  const typeFilter = val('d-type-filter') || 'all';
  const affFilter  = document.getElementById('d-affect-filter')?.value ?? 'all';
  const search     = (val('d-search') || '').trim().toLowerCase();

  const AFFECT_LABELS = { aqsat:'📅 أقساط', doyon:'🤝 ديون', qorod:'🏦 قروض', bore:'🌍 بره', masarif:'🧾 مصاريف', '':'❓ غير مصنف' };
  const AFFECT_COLORS = { aqsat:'var(--teal)', doyon:'var(--amber)', qorod:'var(--blue)', bore:'var(--green)', masarif:'var(--text3)', '':'var(--text3)' };
  const AFFECT_BG    = { aqsat:'var(--bbg)', doyon:'var(--abg)', qorod:'rgba(56,189,255,.12)', bore:'var(--gbg)', masarif:'var(--bg3)', '':'var(--bg3)' };

  // ── Search mode: across ALL dates ────────────────────────────
  const isSearchMode = search.length >= 2;
  const allEntries   = S.daily.filter(e => e.date === date);
  const affMatch     = e => affFilter === 'all' || (e.affect || '') === affFilter;

  let entries;
  if (isSearchMode) {
    entries = S.daily.filter(e => {
      return (src === 'all' || e.source === src) &&
             (typeFilter === 'all' || e.type === typeFilter) &&
             affMatch(e) &&
             (e.name.toLowerCase().includes(search) ||
              String(e.amt).includes(search) ||
              (e.note||'').toLowerCase().includes(search) ||
              e.date.includes(search));
    }).sort((a,b) => b.date.localeCompare(a.date));
  } else {
    entries = S.daily.filter(e =>
      e.date === date &&
      (src === 'all' || e.source === src) &&
      (typeFilter === 'all' || e.type === typeFilter) &&
      affMatch(e)
    );
  }

  const inSum  = entries.filter(e=>e.type==='in').reduce((s,e)=>s+e.amt,0);
  const outSum = entries.filter(e=>e.type==='out').reduce((s,e)=>s+e.amt,0);

  const prevDayEntries = S.daily.filter(e => e.date < date);
  const srcList = src === 'all' ? ['cash','insta','voda'] : [src];

  const openBal = srcList.reduce((total, s) => {
    const base    = S.prevBalances[s] || 0;
    const prevIn  = prevDayEntries.filter(e=>e.source===s&&e.type==='in').reduce((a,e)=>a+e.amt,0);
    const prevOut = prevDayEntries.filter(e=>e.source===s&&e.type==='out').reduce((a,e)=>a+e.amt,0);
    return total + base + prevIn - prevOut;
  }, 0);

  const todayNet = srcList.reduce((total, s) => {
    const todayIn  = allEntries.filter(e=>e.source===s&&e.type==='in').reduce((a,e)=>a+e.amt,0);
    const todayOut = allEntries.filter(e=>e.source===s&&e.type==='out').reduce((a,e)=>a+e.amt,0);
    return total + todayIn - todayOut;
  }, 0);
  const closeBal = openBal + todayNet;

  // ── ملخص التصنيف إذا في فلتر ──────────────────────────────
  const affSummary = affFilter !== 'all' ? `
    <div style="background:${AFFECT_BG[affFilter]};border:1px solid ${AFFECT_COLORS[affFilter]}33;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span style="font-weight:700;color:${AFFECT_COLORS[affFilter]}">${AFFECT_LABELS[affFilter]}</span>
      <span style="font-size:12px;color:var(--text2)">وارد: <b style="color:var(--green)">${ar(inSum)} ${_currency}</b></span>
      <span style="font-size:12px;color:var(--text2)">صادر: <b style="color:var(--red)">${ar(outSum)} ${_currency}</b></span>
      <span style="font-size:12px;color:var(--text2)">صافي: <b style="color:${inSum-outSum>=0?'var(--green)':'var(--red)'}">${inSum-outSum>=0?'+':''}${ar(inSum-outSum)} ${_currency}</b></span>
      <span style="font-size:12px;color:var(--text3)">${entries.length} حركة</span>
    </div>` : '';
  setHTML('d-affect-summary', affSummary);

  // ── Summary cards ──────────────────────────────────────────
  setHTML('d-summary', `
    <div class="mcard b">
      <div class="mcard-label cb"><i class="ti ti-wallet"></i> رصيد الافتتاحي</div>
      <div class="mcard-val cb">${ar(openBal)} ${_currency}</div>
      <div class="mcard-sub">${src==='all'?'كاش + إنستا + فودافون':SRC_LABELS[src]}</div>
    </div>
    <div class="mcard g">
      <div class="mcard-label cg"><i class="ti ti-arrow-down-circle"></i> وارد اليوم</div>
      <div class="mcard-val cg">+${ar(inSum)} ${_currency}</div>
      <div class="mcard-sub">${entries.filter(e=>e.type==='in').length} عملية</div>
    </div>
    <div class="mcard r">
      <div class="mcard-label cr"><i class="ti ti-arrow-up-circle"></i> صادر اليوم</div>
      <div class="mcard-val cr">-${ar(outSum)} ${_currency}</div>
      <div class="mcard-sub">${entries.filter(e=>e.type==='out').length} عملية</div>
    </div>
    <div class="mcard ${closeBal>=openBal?'g':'r'}">
      <div class="mcard-label ${closeBal>=openBal?'cg':'cr'}"><i class="ti ti-wallet-off"></i> رصيد الختامي</div>
      <div class="mcard-val ${closeBal>=openBal?'cg':'cr'}">${ar(closeBal)} ${_currency}</div>
      <div class="mcard-sub">صافي اليوم: ${inSum-outSum>=0?'+':''}${ar(inSum-outSum)} ${_currency}</div>
    </div>
  `);

  // ── Rows ────────────────────────────────────────────────────
  const sorted = entries.sort((a,b) => a.id - b.id);
  let runBal = openBal;
  const rows = sorted.map(e => {
    runBal += e.type === 'in' ? e.amt : -e.amt;
    const af      = e.affect || '';
    const afLbl   = AFFECT_LABELS[af] || '';
    const afClr   = AFFECT_COLORS[af] || 'var(--text3)';
    const afBg    = AFFECT_BG[af]    || 'var(--bg3)';
    const afBadge = afLbl
      ? `<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:${afBg};color:${afClr};border:1px solid ${afClr}33;white-space:nowrap">${afLbl}</span>`
      : '';
    const nameHl = isSearchMode ? hlDailySearch(e.name, search) : e.name;
    return `<tr id="entry-row-${e.id}">
      <td style="font-weight:700;cursor:pointer" onclick="openEditEntry(${e.id})" title="اضغط للتعديل">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${nameHl} ${afBadge}</div>
        ${e.note?`<div style="font-size:11px;color:var(--text3)">${isSearchMode?hlDailySearch(e.note,search):e.note}</div>`:''}
        ${isSearchMode?`<div style="font-size:10px;color:var(--accent3);margin-top:2px">📅 ${fDate(e.date)}</div>`:''}
      </td>
      <td><span class="badge ${SRC_BADGE[e.source]}">${SRC_LABELS[e.source]}</span></td>
      <td><span class="badge ${e.type==='in'?'badge-g':'badge-r'}">${e.type==='in'?'وارد':'صادر'}</span></td>
      <td style="font-weight:800;color:${e.type==='in'?'var(--green)':'var(--red)'};white-space:nowrap">${e.type==='in'?'+':'-'}${ar(e.amt)} ${_currency}</td>
      <td style="white-space:nowrap;color:${runBal>=0?'var(--teal)':'var(--red)'};font-weight:700;font-size:13px">${isSearchMode?'—':ar(runBal)+' '+_currency}</td>
      <td style="display:flex;gap:4px">
        <button class="icon-btn edit" onclick="openEditEntry(${e.id})"><i class="ti ti-edit"></i><span>تعديل</span></button>
        <button class="icon-btn" onclick="delEntry(${e.id})"><i class="ti ti-trash"></i><span>حذف</span></button>
      </td>
    </tr>`;
  }).join('');

  const openRow  = `<tr style="background:rgba(56,189,255,.05)">
    <td colspan="3" style="font-size:12px;font-weight:700;color:var(--blue)"><i class="ti ti-flag"></i> رصيد افتتاحي</td>
    <td></td><td style="font-weight:800;color:var(--blue);white-space:nowrap">${ar(openBal)} ${_currency}</td><td></td></tr>`;
  const closeRow = sorted.length ? `<tr style="background:rgba(32,208,104,.05);border-top:2px solid var(--border)">
    <td colspan="3" style="font-size:12px;font-weight:700;color:${closeBal>=openBal?'var(--green)':'var(--red)'}"><i class="ti ti-flag-check"></i> رصيد ختامي</td>
    <td></td><td style="font-weight:900;font-size:15px;color:${closeBal>=openBal?'var(--green)':'var(--red)'};white-space:nowrap">${ar(closeBal)} ${_currency}</td><td></td></tr>` : '';

  const searchMode2 = search.length >= 2;
  const infoRow = searchMode2 && entries.length ? `<tr style="background:rgba(91,127,255,.06)">
    <td colspan="6" style="font-size:12px;color:var(--accent);font-weight:700;padding:8px 13px">
      <i class="ti ti-search" style="margin-left:6px"></i>نتايج البحث: ${entries.length} حركة · وارد: ${ar(inSum)} ${_currency} · صادر: ${ar(outSum)} ${_currency}
    </td></tr>` : '';

  if (searchMode2) {
    setHTML('d-tbody', infoRow + (rows || `<tr><td colspan="6"><div class="empty"><i class="ti ti-search-off"></i><p>مفيش نتايج</p></div></td></tr>`));
  } else {
    setHTML('d-tbody', openRow + (rows || `<tr><td colspan="6"><div class="empty"><i class="ti ti-inbox"></i><p>لا توجد حركات</p></div></td></tr>`) + closeRow);
  }
}

function hlDailySearch(text, q) {
  if(!q||!text) return text||'';
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
  return String(text).replace(re, m=>`<mark style="background:rgba(91,127,255,.35);color:var(--text);border-radius:3px;padding:0 2px">${m}</mark>`);
}

function clearDailyFilters() {
  setVal('d-search','');
  setVal('d-src','all');
  setVal('d-type-filter','all');
  setVal('d-date', todayStr);
  const af = document.getElementById('d-affect-filter');
  if (af) af.value = 'all';
  renderAll();
  toast('تم مسح الفلاتر');
}

function addEntry(type) {
  const name=val('d-name'), src=val('d-src-add')||'cash', amt=num('d-amt'), note=val('d-note');
  const date=val('d-date')||todayStr;
  const affect = val('d-affect-add') || '';
  if(!name||!amt){toast('اكتب البيان والمبلغ','error');return;}
  if(amt<=0){toast('المبلغ لازم يكون أكبر من صفر','error');return;}
  S.daily.push({id:nid(),date,name,source:src,type,amt,note,affect});
  setVal('d-name',''); setVal('d-amt',''); setVal('d-note','');
  renderAll(); toast(`✓ تم إضافة ${type==='in'?'وارد':'صادر'}`);
}

function delEntry(id) {
  const e = S.daily.find(x=>x.id===id);
  confirm2('حذف الحركة؟','مش هترجع تاني!', ()=>{
    if(e) auditLog('delete','daily',e.name,`${e.type==='in'?'وارد':'صادر'} ${ar(e.amt)} ${_currency}`);
    S.daily = S.daily.filter(x=>x.id!==id);
    saveData(); renderAll(); toast('تم الحذف','warn');
  });
}

function openEditEntry(id) {
  const e = S.daily.find(x => x.id === id);
  if(!e) return;
  document.getElementById('edit-entry-id').value = id;
  setVal('edit-entry-name', e.name);
  setVal('edit-entry-amt',  e.amt);
  setVal('edit-entry-src',  e.source);
  setVal('edit-entry-type', e.type);
  setVal('edit-entry-date', e.date);
  setVal('edit-entry-note', e.note || '');
  openModal('modal-edit-entry');
  setTimeout(() => document.getElementById('edit-entry-name').focus(), 150);
}

function saveEditEntry() {
  const id   = parseInt(document.getElementById('edit-entry-id').value);
  const name = val('edit-entry-name').trim();
  const amt  = parseFloat(val('edit-entry-amt')) || 0;
  const src  = val('edit-entry-src')  || 'cash';
  const type = val('edit-entry-type') || 'in';
  const date = val('edit-entry-date') || todayStr;
  const note = val('edit-entry-note').trim();

  if(!name)    { toast('اكتب البيان', 'error'); return; }
  if(!amt)     { toast('اكتب المبلغ', 'error'); return; }

  const e = S.daily.find(x => x.id === id);
  if(!e) return;

  e.name   = name;
  e.amt    = amt;
  e.source = src;
  e.type   = type;
  e.date   = date;
  e.note   = note;

  auditLog('edit','daily',name,`${type==='in'?'وارد':'صادر'} ${ar(amt)} ${_currency} — ${date}`);
  closeModal('modal-edit-entry');
  renderAll();
  toast('✓ تم التعديل');

  // highlight the edited row briefly
  setTimeout(() => {
    const row = document.getElementById('entry-row-' + id);
    if(row) {
      row.style.transition = 'background .3s';
      row.style.background = 'rgba(91,127,255,.15)';
      setTimeout(() => { row.style.background = ''; }, 1200);
    }
  }, 100);
}

// ============================================================
// AQSAT PAGE
// ============================================================
// ── Bulk select state ────────────────────────────────────────
let _bulkMode = false;
let _selectedIds = new Set();

function getVisibleAqsatList() {
  const filter = val('aq-filter') || 'all';
  const search = (val('aq-search') || '').toLowerCase();
  const sort   = val('aq-sort')   || 'smart';

  let list = S.aqsat;
  if (filter === 'active') list = list.filter(c => !aqDone(c));
  else if (filter === 'late') list = list.filter(aqLate);
  else if (filter === 'done') list = list.filter(aqDone);
  if (search) list = list.filter(c =>
    c.name.toLowerCase().includes(search) ||
    (c.item||'').toLowerCase().includes(search) ||
    (c.phone||'').includes(search)
  );

  // Pre-calculate values once for sorting efficiency
  const now = new Date();
  const meta = list.map(c => {
    const late = aqLate(c);
    const done = aqDone(c);
    const rem  = aqRem(c);
    const inst = aqInst(c);
    const gross = aqGross(c);
    const pct  = gross > 0 ? (gross - rem) / gross : (done ? 1 : 0);
    // Day-based expected
    const _glStartD = new Date(c.startDate || ((c.startMonth||'2024-01')+'-01'));
    const _glFirstD = new Date(_glStartD); _glFirstD.setMonth(_glFirstD.getMonth()+1);
    var expected = 0; var _glDue = new Date(_glFirstD);
    while(_glDue <= now && expected < c.months){ expected++; _glDue.setMonth(_glDue.getMonth()+1); }
    const lateMonths = late ? Math.max(0, expected - aqPaidCount(c)) : 0;
    return { c, late, done, rem, inst, gross, pct, lateMonths };
  });

  const sorted = [...meta].sort((a, b) => {
    switch (sort) {
      case 'smart': {
        // متأخر > مستحق اليوم > نشط > منتهي
        const pri = m => m.done ? 4 : m.late ? 1 : 2;
        const pa = pri(a), pb = pri(b);
        if (pa !== pb) return pa - pb;
        if (pa === 1) return b.lateMonths - a.lateMonths; // أكثر تأخيراً أول
        return 0;
      }
      case 'name':      return a.c.name.localeCompare(b.c.name, 'ar');
      case 'rem_desc':  return b.rem - a.rem;
      case 'rem_asc':   return a.rem - b.rem;
      case 'inst_desc': return b.inst - a.inst;
      case 'date_desc': return b.c.id - a.c.id;
      case 'pct_asc':   return a.pct - b.pct;
      default:          return 0;
    }
  });

  return sorted.map(m => m.c);
}

function toggleBulkMode() {
  _bulkMode = !_bulkMode;
  _selectedIds.clear();
  renderAqsat();
}

function toggleSelectClient(id, e) {
  e.stopPropagation();
  if(_selectedIds.has(id)) _selectedIds.delete(id);
  else _selectedIds.add(id);
  const card = document.getElementById('cl-' + id);
  if(card) {
    card.classList.toggle('cl-selected', _selectedIds.has(id));
    const chk = card.querySelector('.cl-checkbox i');
    if(chk) { chk.className = _selectedIds.has(id) ? 'ti ti-check' : ''; }
  }
  _renderBulkBar();
}

function _selectAllVisible() {
  const visible = getVisibleAqsatList();
  if(_selectedIds.size === visible.length) {
    _selectedIds.clear();
  } else {
    visible.forEach(c => _selectedIds.add(c.id));
  }
  visible.forEach(c => {
    const card = document.getElementById('cl-' + c.id);
    if(card) {
      card.classList.toggle('cl-selected', _selectedIds.has(c.id));
      const chk = card.querySelector('.cl-checkbox i');
      if(chk) chk.className = _selectedIds.has(c.id) ? 'ti ti-check' : '';
    }
  });
  _renderBulkBar();
}

function _deleteSelected() {
  if(!_selectedIds.size) return;
  confirm2(
    `حذف ${_selectedIds.size} عميل؟`,
    'هيتمسحوا مع كل بياناتهم! مفيش رجوع.',
    () => {
      S.aqsat = S.aqsat.filter(c => !_selectedIds.has(c.id));
    saveData();
      _selectedIds.clear();
      _bulkMode = false;
      renderAll();
      toast(`✓ تم الحذف`, 'warn');
    }
  );
}

function _renderBulkBar() {
  const bar = document.getElementById('aq-bulk-bar');
  if(!bar) return;
  const visible = getVisibleAqsatList();
  const allChk  = _selectedIds.size > 0 && _selectedIds.size === visible.length;
  bar.className = _bulkMode ? 'active' : '';
  bar.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="toggleBulkMode()" style="${_bulkMode?'border-color:var(--accent);color:var(--accent)':''}">
      <i class="ti ti-${_bulkMode?'x':'checkbox'}"></i>
      ${_bulkMode ? 'إلغاء التحديد' : 'تحديد متعدد'}
    </button>
    ${_bulkMode ? `
      <button class="btn btn-ghost btn-sm" onclick="_selectAllVisible()">
        <i class="ti ti-${allChk?'square-minus':'select-all'}"></i>
        ${allChk ? 'إلغاء الكل' : 'تحديد الكل'} (${visible.length})
      </button>
      ${_selectedIds.size ? `
        <span class="bulk-count-badge"><i class="ti ti-check"></i> ${_selectedIds.size} محدد</span>
        <button class="btn btn-sm" onclick="_deleteSelected()" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder);margin-right:auto">
          <i class="ti ti-trash"></i> حذف المحددين (${_selectedIds.size})
        </button>
      ` : `<span style="font-size:12px;color:var(--text3)"><i class="ti ti-hand-click" style="margin-left:4px"></i>انقر على عميل لتحديده</span>`}
    ` : ''}
  `;
}

function renderAqsat() {
  const filter = val('aq-filter')||'all';
  const search = (val('aq-search')||'').toLowerCase();
  const active = S.aqsat.filter(c=>!aqDone(c)&&c.price>0);
  const late   = S.aqsat.filter(aqLate);
  const totalRem  = S.aqsat.reduce((s,c)=>s+aqRem(c),0);
  const monthDue  = active.reduce((s,c)=>s+aqInst(c),0);
  const totalGross= S.aqsat.filter(c=>c.price>0).reduce((s,c)=>s+aqGross(c),0);
  // إجمالي باقي الأصل لكل العملاء
  const totalPrincipalRem = S.aqsat.filter(c=>c.price>0&&!aqDone(c)).reduce((s,c)=>{
    const pr = c.price - c.down;
    const gnd = aqGross(c);
    const paid3 = (c.paid||[]).reduce((a,b)=>a+b,0);
    const ratio = gnd > 0 ? pr / gnd : 0;
    return s + Math.max(0, pr - Math.min(pr, Math.round(paid3 * ratio)));
  }, 0);

  setHTML('aq-metrics',`
    <div class="mcard t"><div class="mcard-label ct"><i class="ti ti-users"></i> إجمالي العملاء</div><div class="mcard-val ct">${S.aqsat.length}</div><div class="mcard-sub">نشط: ${active.length} · منتهي: ${S.aqsat.filter(aqDone).length}</div></div>
    <div class="mcard g"><div class="mcard-label cg"><i class="ti ti-cash"></i> متبقي الأقساط</div><div class="mcard-val cg">${ar(totalRem)} ${_currency}</div><div class="mcard-sub">شهرياً: ${ar(monthDue)} ${_currency}</div></div>
    <div class="mcard" style="border-color:var(--pborder)"><div class="mcard-label cp"><i class="ti ti-building-bank"></i> إجمالي باقي الأصل</div><div class="mcard-val cp">${ar(totalPrincipalRem)} ${_currency}</div><div class="mcard-sub">من كل العملاء النشطين</div></div>
    <div class="mcard r"><div class="mcard-label cr"><i class="ti ti-alert-circle"></i> متأخرين</div><div class="mcard-val cr">${late.length}</div><div class="mcard-sub">${ar(late.reduce((s,c)=>s+aqInst(c),0))} ${_currency} متأخر</div></div>
    <div class="mcard b"><div class="mcard-label cb"><i class="ti ti-percentage"></i> إجمالي الفوايد</div><div class="mcard-val cb">${ar(S.aqsat.filter(c=>c.price>0).reduce((s,c)=>s+aqTotalInt(c),0))} ${_currency}</div><div class="mcard-sub">من ${ar(totalGross)} ${_currency} إجمالي</div></div>
  `);

  const list = getVisibleAqsatList();
  setHTML('aq-list', list.length ? list.map(aqCard).join('') : '<div class="empty"><i class="ti ti-search"></i><p>لا توجد نتائج</p></div>');

  // sync selection state on re-render
  list.forEach(c => {
    const card = document.getElementById('cl-' + c.id);
    if(card) card.classList.toggle('cl-selected', _selectedIds.has(c.id));
  });

  _renderBulkBar();
}

function aqCard(c) {
  const inst=aqInst(c), rem=aqRem(c), paid=aqPaidCount(c), gross=aqGross(c);
  const done=aqDone(c), late=aqLate(c);
  // باقي الأصل
  const principal2   = c.price > 0 ? (c.price - c.down) : 0;
  const totalPaidAmt3 = (c.paid||[]).reduce((s,p)=>s+p,0);
  const grossNoDown2  = gross - c.down;
  const principalRatio2 = grossNoDown2 > 0 ? principal2 / grossNoDown2 : 0;
  const principalPaid2  = Math.min(principal2, Math.round(totalPaidAmt3 * principalRatio2));
  const principalRem2   = Math.max(0, principal2 - principalPaid2);
  const pct = gross>0 ? Math.round((gross-rem)/gross*100) : (c.note?50:0);
  const initials = c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);
  const colors = ['linear-gradient(135deg,#5B7FFF,#3A5CE5)','linear-gradient(135deg,#00D4C8,#0891B2)','linear-gradient(135deg,#B07FFF,#7C3AED)','linear-gradient(135deg,#FFB020,#EA580C)','linear-gradient(135deg,#20D068,#059669)','linear-gradient(135deg,#FF4D6A,#BE123C)'];
  const col = colors[c.id % colors.length];
  // Day-based expected count (same logic as aqLate)
  const _startStr2 = c.startDate || ((c.startMonth||'2024-01') + '-01');
  const _startD2   = new Date(_startStr2);
  const _firstDue2 = new Date(_startD2);
  _firstDue2.setMonth(_firstDue2.getMonth() + 1);
  const now2 = new Date();
  var expected2 = 0;
  var _due2 = new Date(_firstDue2);
  while (_due2 <= now2 && expected2 < c.months) { expected2++; _due2.setMonth(_due2.getMonth() + 1); }
  const lateM = late ? Math.max(0, expected2 - paid) : 0;
  const lateBadge = lateM > 1 ? ` <span class="badge" style="background:rgba(255,77,106,.18);color:var(--red);border:1px solid var(--rborder);font-size:10px">${lateM} شهر</span>` : '';
  // Calculate next due date
  const _nextDueDate = (function() {
    if (done) return null;
    var nd = new Date(_firstDue2);
    nd.setMonth(nd.getMonth() + paid);
    return nd;
  })();
  const _nextDueStr = _nextDueDate ? _nextDueDate.toLocaleDateString('ar-EG', {day:'numeric',month:'long'}) : '';
  const _daysUntil  = _nextDueDate ? Math.ceil((_nextDueDate - now2) / (1000*60*60*24)) : null;
  const _dueLabel   = _daysUntil !== null
    ? (_daysUntil === 0 ? ' · <span style="color:var(--amber)">اليوم!</span>'
      : _daysUntil > 0 ? ` · <span style="color:var(--text3);font-size:10px">بعد ${_daysUntil} يوم</span>`
      : '')
    : '';
  const statusBadge = done
    ? '<span class="badge badge-g"><i class="ti ti-check"></i> مكتمل</span>'
    : late
    ? `<span class="badge badge-r"><i class="ti ti-clock"></i> متأخر</span>${lateBadge}`
    : `<span class="badge badge-b"><i class="ti ti-loader"></i> نشط</span>${_dueLabel}`;

  // Calculate slotNow using day-based logic
  const _instStartStr = c.startDate || ((c.startMonth||'2024-01') + '-01');
  const _instStartD   = new Date(_instStartStr);
  const _instFirstDue = new Date(_instStartD);
  _instFirstDue.setMonth(_instFirstDue.getMonth() + 1);
  const _instNow = new Date();
  var _instExpected = 0;
  var _instDue = new Date(_instFirstDue);
  while (_instDue <= _instNow && _instExpected < c.months) {
    _instExpected++;
    _instDue.setMonth(_instDue.getMonth() + 1);
  }
  const _slotNow = _instExpected; // number of slots that should be paid by now

  const instBoxes = c.price>0 ? Array.from({length:c.months},function(_,i){
    var paidAmt = aqPaidAmt(c,i);
    var inst2   = aqInst(c);
    var full    = aqSlotDone(c,i);
    var partial = paidAmt > 0 && !full;
    var overdue = !full && i < _slotNow;
    var current = i === _slotNow && !full;
    var pct     = inst2 > 0 ? Math.min(100, Math.round(paidAmt/inst2*100)) : 0;
    var bgColor = full?'var(--gbg)':partial?'var(--abg)':overdue?'var(--rbg)':current?'var(--bbg)':'var(--bg3)';
    var bdrColor= full?'var(--gborder)':partial?'var(--aborder)':overdue?'var(--rborder)':current?'var(--bborder)':'var(--border)';
    var txtColor= full?'var(--green)':partial?'var(--amber)':overdue?'var(--red)':current?'var(--blue)':'var(--text3)';
    var icon    = full?'ti-check':partial?'ti-circle-half':overdue?'ti-alert-circle':current?'ti-clock':'ti-circle';
    var label   = partial ? (ar(paidAmt)+' '+_currency) : String(i+1);
    var pbar    = partial ? '<div style="position:absolute;bottom:0;left:0;width:'+pct+'%;height:3px;background:var(--amber);border-radius:0 0 0 4px"></div>' : '';
    var t       = 'شهر '+(i+1)+' · القسط: '+ar(inst2)+' '+_currency+' · مدفوع: '+ar(paidAmt)+' '+_currency+(partial?' (جزئي)':full?' (مكتمل)':'');
    return '<div class="inst-box" onclick="openSlotPayment('+c.id+','+i+')" title="'+t+'" style="background:'+bgColor+';border:1.5px solid '+bdrColor+';position:relative;overflow:hidden;cursor:pointer">'+pbar+'<i class="ti '+icon+'" style="font-size:11px;color:'+txtColor+'"></i><span style="font-size:9px;color:'+txtColor+';font-weight:'+(partial||full?'800':'400')+'">'+label+'</span></div>';
  }).join('') : '';

  return `<div class="cl-card ${_selectedIds.has(c.id)?'cl-selected':''}" id="cl-${c.id}">
    <div class="cl-hdr" onclick="_bulkMode ? toggleSelectClient(${c.id}, event) : openClientDetail(${c.id})">
      ${_bulkMode ? `<div class="cl-checkbox" onclick="toggleSelectClient(${c.id}, event)"><i class="ti ${_selectedIds.has(c.id)?'ti-check':''}"></i></div>` : ''}
      <div class="cl-av" style="background:${col}">${initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${c.name} ${statusBadge}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${c.item||''} ${c.phone?'· 📞':''}</div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div style="font-size:16px;font-weight:900;color:${done?'var(--green)':late?'var(--red)':'var(--teal)'}">${done?'✓ منتهي':ar(rem)+' '+_currency}</div>
        <div style="font-size:11px;color:var(--text3)">${paid}/${c.months} شهر · ${pct}%</div>
        ${c.price>0&&!done?`<div style="font-size:11px;color:var(--purple);font-weight:700;margin-top:2px">أصل: ${ar(principalRem2)} ${_currency}</div>`:''}
      </div>
      <i class="ti ti-chevron-down" style="color:var(--text3);margin-right:8px;font-size:16px;transition:transform .2s" id="chev-${c.id}"></i>
    </div>
    <div class="cl-body" id="cl-body-${c.id}" style="display:none">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:14px;font-size:12px">
        ${c.price>0?`<div><span style="color:var(--text3)">السعر:</span> <b>${ar(c.price)} ${_currency}</b></div>
        <div><span style="color:var(--text3)">المقدم:</span> <b>${ar(c.down)} ${_currency}</b></div>
        <div><span style="color:var(--text3)">الفايدة:</span> <b>${c.rate}%</b></div>
        <div><span style="color:var(--text3)">القسط:</span> <b class="ct">${ar(inst)} ${_currency}</b></div>
        <div><span style="color:var(--text3)">الإجمالي:</span> <b>${ar(gross)} ${_currency}</b></div>
        <div><span style="color:var(--text3)">المتبقي:</span> <b class="${done?'cg':'cr'}">${ar(rem)} ${_currency}</b></div>
        ${c.price>0?`<div style="background:var(--pbg);border:1px solid var(--pborder);border-radius:6px;padding:4px 8px"><span style="color:var(--purple);font-weight:700">باقي الأصل:</span> <b style="color:var(--purple)">${done?'✓':ar(principalRem2)+' '+_currency}</b></div>`:''}`:''}
        ${c.note?`<div style="grid-column:1/-1"><span style="color:var(--text3)">ملاحظة:</span> <b>${c.note}</b></div>`:''}
        ${c.phone?`<div><span style="color:var(--text3)">التليفون:</span> <b>${c.phone}</b></div>`:''}
        ${(c.startDate||c.startMonth)?`<div><span style="color:var(--text3)">تاريخ الشراء:</span> <b>${c.startDate||c.startMonth}</b></div>`:''}
      </div>
      ${c.price>0?`<div style="margin-top:12px;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px">الأشهر</div><div class="inst-grid">${instBoxes}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        ${!done?`<button class="btn btn-sm" style="background:linear-gradient(135deg,var(--green),#059669);color:#fff;font-weight:900;border:none;padding:8px 16px" onclick="openPayment(${c.id})"><i class="ti ti-cash"></i> تسديد</button>`:''}
        ${c.phone?`<button class="wa-btn" onclick="waOpen(${c.id},'${aqLate(c)?'late':'due'}')"><i class="ti ti-brand-whatsapp"></i> واتساب</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="openEditAq(${c.id})"><i class="ti ti-edit"></i> تعديل</button>
        <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder)" onclick="delAq(${c.id})"><i class="ti ti-trash"></i> حذف</button>
        <button class="btn btn-sm" style="background:var(--abg);color:var(--amber);border:1px solid var(--aborder)" onclick="printReceipt(${c.id})"><i class="ti ti-printer"></i> إيصال</button>
        <button class="btn btn-sm" style="background:rgba(224,92,42,.12);color:#e05c2a;border:1px solid rgba(224,92,42,.3)" onclick="exportClientPDF(${c.id})"><i class="ti ti-file-type-pdf"></i> كشف PDF</button>
      </div>
    </div>
  </div>`;
}

function toggleCard(id) {
  const body = document.getElementById('cl-body-'+id);
  const chev = document.getElementById('chev-'+id);
  if(!body) return;
  const open = body.style.display==='none';
  body.style.display = open ? 'block' : 'none';
  if(chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}

// Legacy togglePaid — now opens slot payment modal instead
function togglePaid(cId, slot) {
  openSlotPayment(cId, slot);
}

// Slot-specific payment modal
let _slotCId = null, _slotIdx = null, _slotSrc = 'cash';

function slotSetSrc(src) {
  _slotSrc = src;
  ['cash','insta','voda'].forEach(s => {
    const el = document.getElementById('ssrc-'+s);
    if(el) el.classList.toggle('active', s===src);
  });
}

function openSlotPayment(cId, slotIdx) {
  const c = S.aqsat.find(x => x.id === cId);
  if (!c) return;
  _slotCId = cId; _slotIdx = slotIdx;
  const inst     = aqInst(c);
  const paidAmt  = aqPaidAmt(c, slotIdx);
  const rem      = Math.max(0, inst - paidAmt);
  const full     = aqSlotDone(c, slotIdx);
  const startStr = (c.startDate||c.startMonth||'2024-01').slice(0,7);
  const [sy, sm] = startStr.split('-').map(Number);
  const slotDate = new Date(2020 + Math.floor(((sy-2020)*12+sm+slotIdx)/12), ((sy-2020)*12+sm+slotIdx)%12, 1);
  const monthLabel = slotDate.toLocaleDateString('ar-EG', {month:'long', year:'numeric'});

  document.getElementById('slot-title').textContent    = monthLabel + ' — شهر ' + (slotIdx+1);
  document.getElementById('slot-inst').textContent     = ar(inst) + ' ' + _currency;
  document.getElementById('slot-paid').textContent     = ar(paidAmt) + ' ' + _currency;
  document.getElementById('slot-rem').textContent      = ar(rem) + ' ' + _currency;
  document.getElementById('slot-status').textContent   = full ? 'مكتمل ✓' : paidAmt > 0 ? 'جزئي' : 'غير مدفوع';
  document.getElementById('slot-status').style.color   = full ? 'var(--green)' : paidAmt > 0 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('slot-pbar').style.width     = (inst > 0 ? Math.min(100, Math.round(paidAmt/inst*100)) : 0) + '%';
  document.getElementById('slot-custom-amt').value     = '';
  document.getElementById('slot-note').value           = '';
  setVal('slot-pay-date', todayStr);
  slotSetSrc('cash');

  // ── سجل الدفعات لهذا الشهر مع زرار حذف لكل دفعة ────────────
  const slotPayments = (c.payments || []).filter(p => p.slot === slotIdx);
  const histWrap = document.getElementById('slot-history-wrap');
  const histEl   = document.getElementById('slot-history');
  if (slotPayments.length > 0) {
    histWrap.style.display = 'block';
    const srcLabels = { cash:'💵 كاش', insta:'📱 إنستا', voda:'📡 فودافون' };
    histEl.innerHTML = slotPayments.map((p, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:${i<slotPayments.length-1?'1px solid var(--border)':'none'}">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800;color:var(--green)">+${ar(p.amt)} ${_currency}</div>
          <div style="font-size:11px;color:var(--text3)">
            ${p.date||'—'} · ${srcLabels[p.src]||p.src||''}
            ${p.note?` · ${p.note}`:''}
          </div>
        </div>
        <span style="background:var(--${p.type==='full'?'g':'a'}bg);color:var(--${p.type==='full'?'green':'amber'});border:1px solid var(--${p.type==='full'?'g':'a'}border);padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700">${p.type==='full'?'كامل':'جزئي'}</span>
        <button onclick="deleteSlotPayment(${cId},${slotIdx},${i})"
                style="background:var(--rbg);border:1px solid var(--rborder);color:var(--red);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px"
                title="حذف هذه الدفعة">
          <i class="ti ti-trash"></i>
        </button>
      </div>`).join('');
  } else {
    histWrap.style.display = 'none';
  }

  // ── أزرار الدفع السريع ───────────────────────────────────────
  const submitBtn = document.getElementById('slot-submit-btn');
  const paySection = document.getElementById('slot-pay-section');
  if (full) {
    document.getElementById('slot-quick-btns').innerHTML =
      '<div style="font-size:12px;color:var(--green);padding:4px 0"><i class="ti ti-check-circle"></i> هذا الشهر مسدد بالكامل</div>';
    submitBtn.style.display = 'none';
    document.getElementById('slot-custom-amt').disabled = true;
  } else {
    submitBtn.style.display = '';
    document.getElementById('slot-custom-amt').disabled = false;
    const btns = [];
    if (rem > 0 && rem < inst) btns.push({ label:'الباقي', val:rem });
    btns.push({ label:'القسط كامل', val:inst });
    if (inst > 0) btns.push({ label:'نص قسط', val:Math.round(inst/2) });
    document.getElementById('slot-quick-btns').innerHTML = btns
      .filter(b => b.val > 0 && b.val <= inst)
      .map(b => `<button class="pay-amount-btn" onclick="selectSlotAmt(${b.val},this)">${b.label}<br><span style="font-size:10px;opacity:.7">${ar(b.val)} ${_currency}</span></button>`)
      .join('');
  }

  document.getElementById('slot-undo-btn').style.display = paidAmt > 0 ? 'inline-flex' : 'none';
  openModal('modal-slot-payment');
  if (!full) setTimeout(() => document.getElementById('slot-custom-amt').focus(), 200);
}

function selectSlotAmt(val, btn) {
  document.getElementById('slot-custom-amt').value = val;
  document.querySelectorAll('#slot-quick-btns .pay-amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function submitSlotPayment() {
  const c   = S.aqsat.find(x => x.id === _slotCId);
  if (!c) return;
  const inst    = aqInst(c);
  const paidAmt = aqPaidAmt(c, _slotIdx);
  const amt     = parseFloat(document.getElementById('slot-custom-amt').value) || 0;
  const src     = _slotSrc || 'cash';
  const note    = document.getElementById('slot-note').value.trim();
  const date    = val('slot-pay-date') || todayStr;
  const maxPay  = Math.round((inst - paidAmt) * 100) / 100;

  if (amt <= 0) { toast('اكتب المبلغ', 'error'); return; }
  if (amt > maxPay + 0.01) {
    toast('المبلغ أكبر من المتبقي (' + ar(maxPay) + ' ج)', 'error'); return;
  }

  c.paid[_slotIdx] = Math.round((paidAmt + amt) * 100) / 100;

  const dailyId = nid();
  S.daily.push({
    id: dailyId, date,
    name: 'قسط شهر ' + (_slotIdx + 1) + ': ' + c.name + (note ? ' — ' + note : ''),
    source: src, type: 'in', amt,
    note: note || (c.item || 'أقساط'),
    affect: 'aqsat'
  });

  c.payments = c.payments || [];
  c.payments.push({
    slot: _slotIdx, date, amt, src, note, dailyId,
    type: aqSlotDone(c, _slotIdx) ? 'full' : 'partial'
  });

  auditLog('pay', 'aqsat', c.name,
    'شهر ' + (_slotIdx + 1) + ' · ' + ar(amt) + ' ج · ' + (aqSlotDone(c,_slotIdx) ? 'كامل' : 'جزئي'));

  closeModal('modal-slot-payment');
  renderAll();
  if (document.getElementById('pg-aq-detail')?.classList.contains('active')) renderClientDetail(c);

  const allDone = aqDone(c);
  if (allDone) {
    toast('🎉 تم السداد الكامل! مبروك');
    if (c.phone) setTimeout(() => { if (confirm('تبعت مبروك للعميل على واتساب؟')) waOpen(c.id, 'done'); }, 800);
  } else if (aqSlotDone(c, _slotIdx)) {
    toast('✓ قسط شهر ' + (_slotIdx + 1) + ' مكتمل — متبقي ' + ar(aqRem(c)) + ' ' + _currency);
  } else {
    toast('✓ تم تسجيل ' + ar(amt) + ' ج — باقي هذا الشهر ' + ar(inst - c.paid[_slotIdx]) + ' ' + _currency, 'warn');
  }
}

/* حذف دفعة بعينها من الشهر */
function deleteSlotPayment(cId, slotIdx, payIdx) {
  const c = S.aqsat.find(x => x.id === cId);
  if (!c) return;
  const slotPayments = (c.payments || []).filter(p => p.slot === slotIdx);
  const p = slotPayments[payIdx];
  if (!p) return;

  confirm2(
    `حذف دفعة ${ar(p.amt)} ${_currency}؟`,
    `${p.date||''} — هتتمسح من اليومية كمان`,
    () => {
      // امسح من اليومية
      if (p.dailyId) S.daily = S.daily.filter(e => e.id !== p.dailyId);

      // امسح من سجل الدفعات (بالـ index الفعلي في c.payments)
      const realIdx = (c.payments||[]).findIndex(x =>
        x.slot === slotIdx && x.amt === p.amt && x.date === p.date && x.src === p.src
      );
      if (realIdx >= 0) c.payments.splice(realIdx, 1);

      // حدّث قيمة الـ slot
      c.paid[slotIdx] = Math.max(0, Math.round((c.paid[slotIdx] - p.amt) * 100) / 100);

      renderAll();

      // لو الصفحة مفتوحة — حدّثها فوراً
      const detailPage = document.getElementById('pg-aq-detail');
      if (detailPage && detailPage.classList.contains('active')) {
        renderClientDetail(c);
      }

      toast(`↩ تم حذف الدفعة ${ar(p.amt)} ${_currency}`, 'warn');
    }
  );
}

function undoSlotPayment() {
  const c = S.aqsat.find(x => x.id === _slotCId);
  if (!c) return;
  const paidAmt = aqPaidAmt(c, _slotIdx);
  if (!paidAmt) return;

  // اجمع كل الدفعات اللي اتسجلت لهذا الـ slot
  const slotPayments = (c.payments || []).filter(p => p.slot === _slotIdx);
  const totalToRemove = slotPayments.reduce((s, p) => s + (p.amt || 0), 0);

  confirm2(
    'إلغاء دفع الشهر ' + (_slotIdx + 1) + '؟',
    'سيتم حذف ' + ar(paidAmt) + ' ج ومسح ' + slotPayments.length + ' سجل من اليومية',
    () => {
      // امسح من اليومية كل الإدخالات المرتبطة بهذا الـ slot
      const idsToRemove = new Set(slotPayments.map(p => p.dailyId).filter(Boolean));

      // للمدفوعات القديمة اللي معندهاش dailyId — نمسح من اليومية بالاسم والمبلغ
      const oldPayments = slotPayments.filter(p => !p.dailyId);
      S.daily = S.daily.filter(e => {
        if (idsToRemove.has(e.id)) return false;
        if (oldPayments.some(p => e.affect === 'aqsat' && e.amt === p.amt && e.date === p.date)) return false;
        return true;
      });

      // امسح من سجل الدفعات
      c.payments = (c.payments || []).filter(p => p.slot !== _slotIdx);

      // صفّر قيمة الـ slot
      c.paid[_slotIdx] = 0;

      auditLog('undo', 'aqsat', c.name, 'إلغاء شهر ' + (_slotIdx + 1) + ' · ' + ar(paidAmt) + ' ' + _currency);

      closeModal('modal-slot-payment');
      renderAll();
      // لو الـ user في صفحة تفصيل العميل — حدّثها
      if (document.getElementById('pg-aq-detail')?.classList.contains('active')) {
        renderClientDetail(c);
      }
      toast('↩ تم إلغاء دفع الشهر ' + (_slotIdx + 1) + ' ومسحه من اليومية', 'warn');
    }
  );
}

function openAddAq() {
  setVal('aq-name',''); setVal('aq-phone',''); setVal('aq-item','');
  setVal('aq-price',''); setVal('aq-down',''); setVal('aq-rate','30');
  setVal('aq-months','10'); setVal('aq-start', todayStr); setVal('aq-note','');
  openModal('modal-aq');
}

function openEditAq(id) {
  const c = S.aqsat.find(x=>x.id===id);
  if(!c) return;
  document.getElementById('modal-aq').dataset.editId = id;
  setVal('aq-name',c.name); setVal('aq-phone',c.phone||''); setVal('aq-item',c.item||'');
  setVal('aq-price',c.price||''); setVal('aq-down',c.down||''); setVal('aq-rate',c.rate||30);
  setVal('aq-months',c.months||10); setVal('aq-start',c.startDate||c.startMonth||todayStr); setVal('aq-note',c.note||'');
  openModal('modal-aq');
}

function saveAq() {
  const name = val('aq-name');
  if (!name) { toast('اكتب اسم العميل','error'); return; }
  const phone = val('aq-phone');
  if (phone && !/^(01[0-9]{9})$/.test(phone.replace(/\s/g,''))) {
    toast('رقم التليفون غير صحيح','warn');
  }
  const data = {
    name, phone, item: val('aq-item'),
    price:      num('aq-price'),
    down:       num('aq-down'),
    rate:       num('aq-rate') || 30,
    months:     num('aq-months') || 10,
    startDate:  val('aq-start') || todayStr,
    startMonth: (val('aq-start') || todayStr).slice(0,7),
    note:       val('aq-note'),
    payments:   [],
  };

  const editId = parseInt(document.getElementById('modal-aq').dataset.editId || 0);

  if (editId) {
    const c = S.aqsat.find(x => x.id === editId);
    if (!c) return;

    // Detect financial changes
    const priceChanged  = data.price   !== c.price;
    const rateChanged   = data.rate    !== c.rate;
    const monthsChanged = data.months  !== c.months;
    const downChanged   = data.down    !== c.down;
    const financialChanged = priceChanged || rateChanged || monthsChanged || downChanged;

    const oldInst  = aqInst(c);
    const newInst  = c.price > 0
      ? Math.round((data.price - data.down) * (1 + data.rate/100) / data.months)
      : 0;
    const paidCount = (c.paid||[]).filter(p => p > 0).length;

    if (financialChanged && paidCount > 0) {
      // Show recalc dialog
      _pendingEditData  = data;
      _pendingEditId    = editId;
      _pendingOldInst   = oldInst;
      _pendingNewInst   = newInst;

      const changes = [];
      if (priceChanged)  changes.push(`السعر: ${ar(c.price)} ← ${ar(data.price)} ${_currency}`);
      if (downChanged)   changes.push(`المقدم: ${ar(c.down)} ← ${ar(data.down)} ${_currency}`);
      if (rateChanged)   changes.push(`الفايدة: ${c.rate}% ← ${data.rate}%`);
      if (monthsChanged) changes.push(`الشهور: ${c.months} ← ${data.months}`);

      setHTML('recalc-changes', changes.map(ch =>
        `<div style="padding:4px 0;font-size:13px;font-weight:700;color:var(--amber)">${ch}</div>`
      ).join(''));
      document.getElementById('recalc-old-inst').textContent = ar(oldInst) + ' ' + _currency;
      document.getElementById('recalc-new-inst').textContent = ar(newInst) + ' ' + _currency;
      document.getElementById('recalc-paid-count').textContent = paidCount + ' شهر مدفوع';

      closeModal('modal-aq');
      openModal('modal-recalc');
      return;
    }

    // No financial change — just update
    _applyAqEdit(c, data, 'keep');

  } else {
    const months = data.months;
    S.aqsat.push({ id:nid(), ...data, paid: Array(months).fill(0) });
  }

  delete document.getElementById('modal-aq').dataset.editId;
  closeModal('modal-aq');
  renderAll();
  toast('✓ تم الحفظ');
}

// pending edit state
let _pendingEditData = null, _pendingEditId = null;
let _pendingOldInst = 0, _pendingNewInst = 0;

/* تطبيق التعديل بعد اختيار المستخدم */
function applyRecalc(mode) {
  const c = S.aqsat.find(x => x.id === _pendingEditId);
  if (!c) { closeModal('modal-recalc'); return; }
  _applyAqEdit(c, _pendingEditData, mode);
  closeModal('modal-recalc');
  delete document.getElementById('modal-aq').dataset.editId;
  renderAll();
  const modeLabel = mode === 'keep'
    ? 'تم الحفظ مع الاحتفاظ بالمدفوع'
    : mode === 'reset'
      ? 'تم الحفظ مع إعادة الحساب من الصفر'
      : 'تم الحفظ مع تعديل الشهور المتبقية فقط';
  toast('✓ ' + modeLabel);
}

function _applyAqEdit(c, data, mode) {
  const oldPaid   = c.paid   || [];
  const oldPayments = c.payments || [];
  const newMonths = data.months;

  if (mode === 'reset') {
    // صفّر كل المدفوع — ابدأ من الصفر
    data.paid     = Array(newMonths).fill(0);
    data.payments = [];
    auditLog('edit', 'aqsat', data.name, `إعادة حساب كاملة — القسط: ${ar(_pendingNewInst)} ${_currency}`);

  } else if (mode === 'adjust') {
    // احتفظ بالشهور المدفوعة، صفّر الباقي
    const paidMonths = oldPaid.filter(p => p > 0).length;
    const newArr = Array(newMonths).fill(0);
    // ضع قيم المدفوع القديمة في الشهور الأولى (بالنسب الجديدة)
    for (let i = 0; i < Math.min(paidMonths, newMonths); i++) {
      newArr[i] = _pendingNewInst; // اعتبرهم مكتملين بالقسط الجديد
    }
    data.paid     = newArr;
    data.payments = oldPayments.filter(p => p.slot < paidMonths);
    auditLog('edit', 'aqsat', data.name, `تعديل — ${paidMonths} شهر محفوظ بالقسط الجديد ${ar(_pendingNewInst)} ${_currency}`);

  } else {
    // keep — احتفظ بكل المدفوع كما هو
    if (newMonths > oldPaid.length) {
      data.paid = [...oldPaid, ...Array(newMonths - oldPaid.length).fill(0)];
    } else {
      data.paid = oldPaid.slice(0, newMonths);
    }
    data.payments = oldPayments;
    auditLog('edit', 'aqsat', data.name, `تعديل بيانات — المدفوع محفوظ`);
  }

  Object.assign(c, data);
}

function delAq(id) {
  const c = S.aqsat.find(x=>x.id===id);
  confirm2('حذف العميل؟','هيتمسح مع كل بياناته!', ()=>{
    if(c) auditLog('delete','aqsat',c.name,`متبقي: ${ar(aqRem(c))} ${_currency}`);
    S.aqsat=S.aqsat.filter(x=>x.id!==id);
    saveData(); renderAll(); toast('تم الحذف','warn');
  });
}

// ============================================================
// كشف حساب العميل PDF
// ============================================================
async function exportClientPDF(id) {
  const c = S.aqsat.find(x => x.id === id);
  if (!c) return;

  toast('⏳ جاري إنشاء كشف الحساب...', 'warn');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const inst    = aqInst(c);
  const rem     = aqRem(c);
  const paid    = aqPaidCount(c);
  const gross   = aqGross(c);
  const totalPd = gross - rem;
  const pct     = gross > 0 ? Math.round(totalPd / gross * 100) : 0;
  const done    = aqDone(c);
  const late    = aqLate(c);
  const shopName = (getShopSettings().shopName) || 'نظام المحل';

  // ── خلفية رمادية فاتحة ──────────────────────────────────────
  doc.setFillColor(247, 248, 250);
  doc.rect(0, 0, W, H, 'F');

  // ── هيدر أزرق غامق ──────────────────────────────────────────
  doc.setFillColor(30, 41, 70);
  doc.rect(0, 0, W, 42, 'F');

  // شريط لوني سفلي للهيدر
  doc.setFillColor(91, 127, 255);
  doc.rect(0, 39, W, 3, 'F');

  // اسم المحل
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, W / 2, 16, { align: 'center' });

  // عنوان الكشف
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 195, 230);
  doc.text('Account Statement - كشف حساب عميل', W / 2, 25, { align: 'center' });

  // تاريخ الإصدار
  const nowDate = new Date().toLocaleDateString('en-GB');
  doc.setFontSize(9);
  doc.setTextColor(140, 160, 200);
  doc.text('Issue Date: ' + nowDate, W / 2, 34, { align: 'center' });

  // ── بطاقة بيانات العميل ──────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  _pdfRoundRect(doc, 14, 48, W - 28, 40, 4);
  doc.setFillColor(255, 255, 255);
  doc.rect(14, 48, W - 28, 40, 'F');

  // أيقونة دائرة الاسم
  const statusColor = done ? [16, 185, 129] : late ? [239, 68, 68] : [91, 127, 255];
  doc.setFillColor(...statusColor);
  doc.circle(27, 68, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const initials = c.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  doc.text(initials, 27, 71, { align: 'center' });

  // اسم العميل
  doc.setTextColor(20, 30, 60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(c.name, W - 40, 61, { align: 'right' });

  // معلومات إضافية
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 115, 145);
  const sub = [c.item, c.phone, (c.startDate||c.startMonth) ? 'تاريخ الشراء: ' + (c.startDate||c.startMonth||'') : ''].filter(Boolean).join('  |  ');
  doc.text(sub, W - 40, 70, { align: 'right' });

  // باج الحالة
  const statusLabel = done ? 'COMPLETED' : late ? 'OVERDUE' : 'ACTIVE';
  doc.setFillColor(...statusColor.map(v => Math.min(255, v + 180)));
  doc.roundedRect(W - 42, 74, 28, 8, 2, 2, 'F');
  doc.setTextColor(...statusColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, W - 28, 79, { align: 'center' });

  // ── ملخص مالي — 4 بطاقات ───────────────────────────────────
  const cards = [
    { label: 'Total Value', val: ar(gross) + ' EGP',  color: [91, 127, 255],  bg: [237, 242, 255] },
    { label: 'Monthly Inst.', val: ar(inst) + ' EGP', color: [0, 188, 175],   bg: [232, 252, 250] },
    { label: 'Paid So Far',   val: ar(totalPd) + ' EGP', color: [16, 185, 129], bg: [232, 249, 242] },
    { label: 'Remaining',     val: ar(rem) + ' EGP',  color: done ? [16,185,129] : [239, 68, 68], bg: done ? [232,249,242] : [254,236,236] },
  ];
  const cw = (W - 28 - 9) / 4;
  cards.forEach((card, i) => {
    const x = 14 + i * (cw + 3);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, 95, cw, 22, 3, 3, 'F');
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, 95, cw, 22, 3, 3, 'S');
    doc.setTextColor(...card.color);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + cw / 2, 102, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(card.val, x + cw / 2, 109, { align: 'center' });
  });

  // ── شريط تقدم ────────────────────────────────────────────────
  doc.setFillColor(220, 225, 235);
  doc.roundedRect(14, 122, W - 28, 6, 3, 3, 'F');
  if (pct > 0) {
    doc.setFillColor(...statusColor);
    doc.roundedRect(14, 122, (W - 28) * pct / 100, 6, 3, 3, 'F');
  }
  doc.setTextColor(60, 80, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Progress: ' + pct + '%   (' + paid + ' of ' + c.months + ' months)', 14, 136);

  // ── جدول الأقساط ────────────────────────────────────────────
  doc.setFillColor(30, 41, 70);
  doc.rect(14, 140, W - 28, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const cols = { num: 14, month: 24, amount: 72, paid: 110, status: 145, date: 172 };
  doc.text('#',           cols.num + 2,  146);
  doc.text('Month',       cols.month,    146);
  doc.text('Installment', cols.amount,   146);
  doc.text('Paid',        cols.paid,     146);
  doc.text('Status',      cols.status,   146);
  doc.text('Note',        cols.date,     146);

  // صفوف الجدول
  let y = 149;
  const rowH = 9;
  const months = Array.from({ length: c.months }, (_, i) => i);

  months.forEach((i) => {
    if (y + rowH > H - 20) {
      doc.addPage();
      doc.setFillColor(247, 248, 250);
      doc.rect(0, 0, W, H, 'F');
      // هيدر صفحة تانية
      doc.setFillColor(30, 41, 70);
      doc.rect(14, 10, W - 28, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('#',           cols.num + 2,  16);
      doc.text('Month',       cols.month,    16);
      doc.text('Installment', cols.amount,   16);
      doc.text('Paid',        cols.paid,     16);
      doc.text('Status',      cols.status,   16);
      doc.text('Note',        cols.date,     16);
      y = 19;
    }

    const paidAmt   = aqPaidAmt(c, i);
    const slotDone  = aqSlotDone(c, i);
    const partial   = paidAmt > 0 && !slotDone;
    const now2 = new Date();
    // Day-based slotNow
    const _cdStartD = new Date(c.startDate || ((c.startMonth||'2024-01')+'-01'));
    const _cdFirstD = new Date(_cdStartD); _cdFirstD.setMonth(_cdFirstD.getMonth()+1);
    var slotNow = 0; var _cdDue = new Date(_cdFirstD);
    while(_cdDue <= now2 && slotNow < c.months){ slotNow++; _cdDue.setMonth(_cdDue.getMonth()+1); }
    const overdue   = !slotDone && i < _slotNow;
    const isCurrent = i === _slotNow && !slotDone;

    // حساب تاريخ الشهر
    const slotDate = new Date(sy2, sm2 - 1 + i);
    const monthLabel = slotDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

    // لون الصف
    const rowBg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 253];
    doc.setFillColor(...rowBg);
    doc.rect(14, y, W - 28, rowH, 'F');

    // لون الحالة
    let stColor, stLabel, stBg;
    if (slotDone)       { stColor = [16,185,129]; stBg = [232,249,242]; stLabel = 'Paid'; }
    else if (partial)   { stColor = [245,158,11];  stBg = [254,243,199]; stLabel = 'Partial'; }
    else if (overdue)   { stColor = [239,68,68];   stBg = [254,236,236]; stLabel = 'Overdue'; }
    else if (isCurrent) { stColor = [91,127,255];  stBg = [237,242,255]; stLabel = 'Current'; }
    else                { stColor = [148,163,184]; stBg = [241,245,249]; stLabel = 'Pending'; }

    doc.setTextColor(40, 55, 90);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(i + 1),       cols.num + 2, y + 6);
    doc.text(monthLabel,          cols.month,   y + 6);
    doc.text(ar(inst) + ' EGP',   cols.amount,  y + 6);
    doc.text(ar(paidAmt) + ' EGP', cols.paid,   y + 6);

    // باج الحالة
    doc.setFillColor(...stBg);
    doc.roundedRect(cols.status, y + 1.5, 22, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...stColor);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(stLabel, cols.status + 11, y + 6, { align: 'center' });

    // ملاحظة جزئي
    if (partial) {
      doc.setTextColor(100, 115, 145);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Remaining: ' + ar(inst - paidAmt), cols.date, y + 6);
    } else if (isCurrent) {
      doc.setTextColor(91, 127, 255);
      doc.setFontSize(7);
      doc.text('Due Now', cols.date, y + 6);
    }

    // خط فاصل خفيف
    doc.setDrawColor(220, 228, 240);
    doc.setLineWidth(0.2);
    doc.line(14, y + rowH, W - 14, y + rowH);

    y += rowH;
  });

  // ── سطر الإجمالي ────────────────────────────────────────────
  if (y + 12 < H - 20) {
    doc.setFillColor(30, 41, 70);
    doc.rect(14, y, W - 28, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAID:', cols.amount, y + 7.5);
    doc.text(ar(totalPd) + ' EGP', cols.paid, y + 7.5);
    doc.setTextColor(done ? '#6EF7C8' : '#FCA5A5');
    doc.text('REMAINING: ' + (done ? 'CLEARED' : ar(rem) + ' EGP'), cols.status - 5, y + 7.5);
    y += 14;
  }

  // ── سجل الدفعات الفعلية ─────────────────────────────────────
  const payments = (c.payments || []).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  if (payments.length > 0) {
    // هيدر القسم
    if (y + 14 > H - 20) { doc.addPage(); doc.setFillColor(247,248,250); doc.rect(0,0,W,H,'F'); y = 14; }
    y += 6;
    doc.setFillColor(91, 127, 255);
    doc.rect(14, y, W - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', 16, y + 5.5);
    doc.text('Date', 80, y + 5.5);
    doc.text('Amount', 115, y + 5.5);
    doc.text('Method', 148, y + 5.5);
    doc.text('Type', 178, y + 5.5);
    y += 8;

    const srcMap = { cash: 'Cash', insta: 'InstaPay', voda: 'Vodafone' };
    payments.slice(0, 20).forEach((p, i) => {
      if (y + 8 > H - 20) {
        doc.addPage();
        doc.setFillColor(247,248,250); doc.rect(0,0,W,H,'F');
        doc.setFillColor(91,127,255); doc.rect(14,10,W-28,8,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text('PAYMENT HISTORY (cont.)', 16, 15.5);
        doc.text('Date',115,15.5); doc.text('Amount',145,15.5); doc.text('Method',170,15.5);
        y = 18;
      }
      const [sy2, sm2] = ((c.startDate||c.startMonth||'2024-01').slice(0,7)).split('-').map(Number);
      const mi = (sm2 - 1 + (p.slot||0)) % 12;
      const yr2 = sy2 + Math.floor((sm2 - 1 + (p.slot||0)) / 12);
      const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const rowBg = i % 2 === 0 ? [255,255,255] : [248,250,253];
      doc.setFillColor(...rowBg); doc.rect(14, y, W-28, 8, 'F');
      doc.setTextColor(40,55,90); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      doc.text('Month ' + (( p.slot||0)+1) + ' · ' + mNames[mi] + ' ' + yr2, 16, y + 5.5);
      doc.text(p.date||'—', 80, y + 5.5);
      doc.text(ar(p.amt) + ' EGP', 115, y + 5.5);
      doc.text(srcMap[p.src]||p.src||'—', 148, y + 5.5);
      const tColor = p.type==='full' ? [16,185,129] : [245,158,11];
      const tBg    = p.type==='full' ? [232,249,242] : [254,243,199];
      doc.setFillColor(...tBg); doc.roundedRect(175, y+1.5, 20, 5, 1.5, 1.5, 'F');
      doc.setTextColor(...tColor); doc.setFontSize(6.5); doc.setFont('helvetica','bold');
      doc.text(p.type==='full'?'Full':'Partial', 185, y + 5.5, {align:'center'});
      doc.setDrawColor(220,228,240); doc.setLineWidth(0.2); doc.line(14, y+8, W-14, y+8);
      y += 8;
    });
    if (payments.length > 20) {
      doc.setTextColor(100,115,145); doc.setFontSize(7.5); doc.setFont('helvetica','italic');
      doc.text('... and ' + (payments.length - 20) + ' more payments', 16, y + 5);
      y += 8;
    }
  }

  // ── ملاحظات العميل ──────────────────────────────────────────
  if (c.clientNotes && c.clientNotes.trim()) {
    if (y + 20 > H - 20) { doc.addPage(); doc.setFillColor(247,248,250); doc.rect(0,0,W,H,'F'); y = 14; }
    y += 6;
    doc.setFillColor(237, 242, 255);
    doc.roundedRect(14, y, W-28, 5, 2, 2, 'F');
    doc.setTextColor(91, 127, 255);
    doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text('NOTES', 16, y + 3.5);
    y += 7;
    doc.setFillColor(255,255,255); doc.roundedRect(14, y, W-28, 14, 2, 2, 'F');
    doc.setDrawColor(200,210,230); doc.setLineWidth(0.3); doc.roundedRect(14, y, W-28, 14, 2, 2, 'S');
    doc.setTextColor(60,80,120); doc.setFontSize(8); doc.setFont('helvetica','normal');
    const noteLines = doc.splitTextToSize(c.clientNotes.trim(), W-36);
    doc.text(noteLines.slice(0,3), 18, y + 5);
    y += 16;
  }

  // ── فوتر ────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 70);
  doc.rect(0, H - 16, W, 16, 'F');
  doc.setTextColor(140, 160, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(shopName + ' · Generated ' + nowDate + ' · Confidential', W / 2, H - 6, { align: 'center' });

  // ── حفظ الملف ───────────────────────────────────────────────
  const filename = 'kashf_' + c.name.replace(/\s+/g, '_') + '_' + nowDate.replace(/\//g, '-') + '.pdf';
  doc.save(filename);
  toast('✓ تم تحميل كشف الحساب PDF');
}

// helper: rounded rect (jsPDF built-in roundedRect takes different args)
function _pdfRoundRect(doc, x, y, w, h, r) {
  doc.setDrawColor(220, 228, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, r, r, 'S');
}

function printReceipt(id) {
  const c = S.aqsat.find(x=>x.id===id);
  if(!c) return;
  const inst=aqInst(c), rem=aqRem(c), paid=aqPaidCount(c), gross=aqGross(c);
  const pct = gross>0?Math.round(paid*inst/gross*100):0;
  const win = window.open('','_blank','width=420,height=650');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
  <style>body{font-family:Cairo,sans-serif;background:#fff;color:#000;padding:24px;direction:rtl;font-size:13px}
  .hdr{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:14px;margin-bottom:14px}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}
  .total{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #333;font-size:16px;font-weight:800;margin-top:8px}
  .foot{text-align:center;margin-top:16px;font-size:11px;color:#666;border-top:1px dashed #ccc;padding-top:12px}
  </style></head><body>
  <div class="hdr"><div style="font-size:22px;font-weight:900">🏪 نظام المحل</div><div style="font-size:12px;color:#666;margin-top:4px">إيصال قسط · ${fDate(todayStr)}</div></div>
  <div class="row"><span>اسم العميل</span><b>${c.name}</b></div>
  ${c.phone?`<div class="row"><span>التليفون</span><b>${c.phone}</b></div>`:''}
  ${c.item?`<div class="row"><span>السلعة</span><b>${c.item}</b></div>`:''}
  ${c.price?`<div class="row"><span>السعر الأصلي</span><b>${ar(c.price)} ${_currency}</b></div>`:''}
  ${c.price?`<div class="row"><span>المقدم</span><b>${ar(c.down)} ${_currency}</b></div>`:''}
  ${c.price?`<div class="row"><span>إجمالي بالفايدة (${c.rate}%)</span><b>${ar(gross)} ${_currency}</b></div>`:''}
  ${c.price?`<div class="row"><span>القسط الشهري</span><b>${ar(inst)} ${_currency}</b></div>`:''}
  <div class="row"><span>الأشهر المسددة</span><b>${paid} من ${c.months}</b></div>
  <div class="total"><span>المتبقي</span><b style="color:${rem>0?'red':'green'}">${rem>0?ar(rem)+' '+_currency:'مكتمل ✓'}</b></div>
  <div style="text-align:center;margin-top:10px;font-size:12px;color:#666">نسبة السداد: <b>${pct}%</b></div>
  <div class="foot">شكراً لتعاملكم معنا 🙏<br>نظام المحل PRO</div>
  </body></html>`);
  win.document.close();
  setTimeout(()=>{win.print();win.close();},400);
}

// ── Tomorrow Due Reminder ─────────────────────────────────────
function checkTomorrowDue() {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const [ty, tm] = [tomorrow.getFullYear(), tomorrow.getMonth() + 1];

  const tomorrowClients = S.aqsat.filter(c => {
    if (aqDone(c) || aqLate(c)) return false;
    const startStr = (c.startDate||c.startMonth||'2024-01').slice(0,7);
  const [sy, sm] = startStr.split('-').map(Number);
    const slot = (ty - 2020) * 12 + tm - ((sy - 2020) * 12 + sm);
    return slot >= 0 && slot < c.months && !c.paid[slot];
  });

  if (!tomorrowClients.length) return;

  const names = tomorrowClients.slice(0, 3).map(c => c.name).join('، ');
  const more  = tomorrowClients.length > 3 ? ` و${tomorrowClients.length - 3} آخرين` : '';

  // Show as a dismissable banner
  const banner = document.createElement('div');
  banner.id = 'tomorrow-banner';
  banner.style.cssText = `position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:650;background:linear-gradient(135deg,var(--abg),rgba(255,176,32,.08));border:1px solid var(--aborder);border-radius:12px;padding:10px 16px;display:flex;align-items:center;gap:10px;box-shadow:var(--sh);max-width:480px;width:calc(100% - 40px);font-family:'Cairo',sans-serif;animation:slideDown .4s cubic-bezier(.34,1.2,.64,1)`;
  banner.innerHTML = `
    <i class="ti ti-bell" style="color:var(--amber);font-size:20px;flex-shrink:0"></i>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:800;color:var(--amber)">تذكير — قسط غداً</div>
      <div style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${names}${more}</div>
    </div>
    <button onclick="sendTomorrowWa()" style="background:rgba(37,211,102,.15);border:1px solid #25D366;color:#25D366;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;font-family:'Cairo',sans-serif">واتساب</button>
    <button onclick="document.getElementById('tomorrow-banner').remove()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:18px;padding:0 4px">×</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => { if(banner.parentNode) banner.style.opacity='0'; banner.style.transition='opacity .5s'; setTimeout(()=>banner.remove(),500); }, 8000);

  window._tomorrowClients = tomorrowClients;
}

function sendTomorrowWa() {
  const clients = window._tomorrowClients || [];
  if (!clients.length) return;
  document.getElementById('tomorrow-banner')?.remove();
  clients.filter(c=>c.phone).forEach((c,i) => setTimeout(() => waOpen(c.id, 'tomorrow'), i * 300));
  if (!clients.filter(c=>c.phone).length) toast('مفيش أرقام محفوظة للعملاء', 'warn');
}

// ============================================================
// LATE CLIENTS NOTIFICATION
// ============================================================
function showLateNotif() {
  const late = S.aqsat.filter(aqLate);
  const due  = todayDue();
  if(!late.length && !due.length) return;

  const colors = ['linear-gradient(135deg,#5B7FFF,#3A5CE5)','linear-gradient(135deg,#00D4C8,#0891B2)','linear-gradient(135deg,#B07FFF,#7C3AED)','linear-gradient(135deg,#FFB020,#EA580C)','linear-gradient(135deg,#20D068,#059669)','linear-gradient(135deg,#FF4D6A,#BE123C)'];

  // Summary text
  const summary = [];
  if(late.length) summary.push(`${late.length} عميل متأخر`);
  if(due.length)  summary.push(`${due.length} قسط مستحق اليوم`);
  document.getElementById('notif-summary').textContent = summary.join(' · ');

  // Stats bar
  const lateRem  = late.reduce((s,c) => s + aqInst(c), 0);
  const dueRem   = due.filter(d => !late.find(l=>l.id===d.id)).reduce((s,c) => s + aqInst(c), 0);
  const statsEl  = document.getElementById('notif-stats');
  if(statsEl) {
    statsEl.innerHTML = [
      late.length  ? `<div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:8px;padding:8px 12px;flex:1;text-align:center"><div style="font-size:11px;color:var(--text3);margin-bottom:2px">متأخرين</div><div style="font-size:18px;font-weight:900;color:var(--red)">${late.length} عميل</div><div style="font-size:11px;color:var(--text3)">${ar(lateRem)} ${_currency}</div></div>` : '',
      due.filter(d=>!late.find(l=>l.id===d.id)).length ? `<div style="background:var(--abg);border:1px solid var(--aborder);border-radius:8px;padding:8px 12px;flex:1;text-align:center"><div style="font-size:11px;color:var(--text3);margin-bottom:2px">مستحق اليوم</div><div style="font-size:18px;font-weight:900;color:var(--amber)">${due.filter(d=>!late.find(l=>l.id===d.id)).length} عميل</div><div style="font-size:11px;color:var(--text3)">${ar(dueRem)} ${_currency}</div></div>` : '',
      `<div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:8px;padding:8px 12px;flex:1;text-align:center"><div style="font-size:11px;color:var(--text3);margin-bottom:2px">إجمالي متوقع</div><div style="font-size:18px;font-weight:900;color:var(--green)">${ar(lateRem+dueRem)} ${_currency}</div><div style="font-size:11px;color:var(--text3)">مجموع الأقساط</div></div>`,
    ].join('');
  }

  // Build list — late first, then due-only
  const allItems = [
    ...late.map(c => ({ c, type: 'late' })),
    ...due.filter(d => !late.find(l => l.id === d.id)).map(c => ({ c, type: 'due' }))
  ];

  const html = allItems.slice(0, 15).map(({ c, type }) => {
    const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c);
    const initials = c.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);
    const col = colors[c.id % colors.length];
    const lateMonths = type==='late' ? (() => {
      const now=new Date(), [sy,sm]=((c.startDate||c.startMonth||'2024-01').slice(0,7)).split('-').map(Number);
      // Day-based
      var _nExp=0, _nDue=new Date(c.startDate||((c.startMonth||'2024-01')+'-01'));
      _nDue.setMonth(_nDue.getMonth()+1);
      while(_nDue<=now&&_nExp<c.months){_nExp++;_nDue.setMonth(_nDue.getMonth()+1);}
      const expected=_nExp;
      return Math.max(0, expected - paid);
    })() : 0;
    return `<div class="notif-item ${type}" onclick="closeNotif();openClientDetail(${c.id})" style="cursor:pointer">
      <div class="notif-av" style="background:${col}">${initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
        <div style="font-size:11px;color:var(--text3)">${c.item||'أقساط'} · ${paid}/${c.months} شهر${lateMonths>1?' · <span style="color:var(--red);font-weight:700">'+lateMonths+' أشهر متأخرة</span>':''}</div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div style="font-size:14px;font-weight:900;color:${type==='late'?'var(--red)':'var(--amber)'}">${ar(inst)} ${_currency}</div>
        <div style="font-size:10px;color:var(--text3)">${type==='late'?'متأخر':'مستحق اليوم'}</div>
      </div>
      ${c.phone ? `<button class="wa-btn" onclick="waOpen(${c.id},'${type}');event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
    </div>`;
  }).join('');

  document.getElementById('notif-list').innerHTML = html + (allItems.length > 15 ? `<div style="text-align:center;padding:8px;font-size:12px;color:var(--text3)">و ${allItems.length-15} آخرين...</div>` : '');
  document.getElementById('notif-overlay').classList.add('open');

  // Play alert sound
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 550, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i*0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.15 + 0.25);
      osc.start(ctx.currentTime + i*0.15);
      osc.stop(ctx.currentTime + i*0.15 + 0.25);
    });
  } catch(e) {}
}

function notifWaSendAll() {
  const late = S.aqsat.filter(aqLate);
  const due  = todayDue();
  const allWithPhone = [...late, ...due.filter(d=>!late.find(l=>l.id===d.id))].filter(c=>c.phone);
  if(!allWithPhone.length){ toast('مفيش أرقام محفوظة','warn'); return; }
  allWithPhone.forEach((c,i) => setTimeout(()=>waOpen(c.id, late.find(l=>l.id===c.id)?'late':'due'), i*700));
  toast(`✓ هيتفتح واتساب لـ ${allWithPhone.length} عميل`);
  closeNotif();
}

function closeNotif() {
  document.getElementById('notif-overlay').classList.remove('open');
}

// ============================================================
// BORE PAGE
// ============================================================
// ── Bore bulk state ───────────────────────────────────────────
let _brSel = new Set();

function _brRenderBar() {
  const bar = document.getElementById('br-bulk-bar');
  if(!bar) return;
  const search = (val('br-search')||'').toLowerCase();
  const cat = val('br-cat')||'all';
  let list = S.bore;
  if(cat!=='all') list=list.filter(b=>b.cat===cat);
  if(search) list=list.filter(b=>b.name.toLowerCase().includes(search));
  const allChk = _brSel.size > 0 && _brSel.size === list.length;
  bar.className = _brSel.size ? 'bulk-table-bar active' : 'bulk-table-bar';
  bar.innerHTML = _brSel.size ? `
    <span class="bulk-count-badge"><i class="ti ti-check"></i> ${_brSel.size} محدد</span>
    <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder)" onclick="_brDeleteSelected()">
      <i class="ti ti-trash"></i> حذف المحددين (${_brSel.size})
    </button>
    <button class="btn btn-ghost btn-sm" onclick="_brSel.clear();renderBore()">
      <i class="ti ti-x"></i> إلغاء
    </button>
  ` : '';
}

function _brSelectAll(chk) {
  const search = (val('br-search')||'').toLowerCase();
  const cat = val('br-cat')||'all';
  let list = S.bore;
  if(cat!=='all') list=list.filter(b=>b.cat===cat);
  if(search) list=list.filter(b=>b.name.toLowerCase().includes(search));
  if(chk.checked) list.forEach(b => _brSel.add(b.id));
  else _brSel.clear();
  renderBore();
}

function _brToggleRow(id, el) {
  if(el.checked) _brSel.add(id); else _brSel.delete(id);
  const row = el.closest('tr');
  if(row) row.classList.toggle('tr-selected', el.checked);
  _brRenderBar();
  // sync header checkbox
  const search = (val('br-search')||'').toLowerCase();
  const cat = val('br-cat')||'all';
  let list = S.bore;
  if(cat!=='all') list=list.filter(b=>b.cat===cat);
  if(search) list=list.filter(b=>b.name.toLowerCase().includes(search));
  const allChk = document.getElementById('br-chk-all');
  if(allChk) allChk.checked = list.length > 0 && list.every(b => _brSel.has(b.id));
}

function _brDeleteSelected() {
  if(!_brSel.size) return;
  confirm2(`حذف ${_brSel.size} بند؟`, 'مفيش رجوع!', () => {
    S.bore = S.bore.filter(b => !_brSel.has(b.id));
    saveData();
    _brSel.clear();
    renderAll(); toast('✓ تم الحذف', 'warn');
  });
}

// ============================================================
// BORE PAGE  v2  —  فلوس بره
// ============================================================
let _brAddOpen = true;

const BR_CAT_COLOR = {
  'قرض أعطيته': 'var(--blue)',
  'بضاعة':       'var(--teal)',
  'جمعية':       'var(--purple)',
  'مصاريف':      'var(--amber)',
  'أخرى':        'var(--text3)',
};
const BR_CAT_BG = {
  'قرض أعطيته': 'var(--bbg)',
  'بضاعة':       'var(--tbg)',
  'جمعية':       'var(--pbg)',
  'مصاريف':      'var(--abg)',
  'أخرى':        'var(--bg3)',
};

function brToggleAdd() {
  const card = document.getElementById('br-add-card');
  if (!card) return;
  const open = card.style.display === 'none' || card.style.display === '';
  card.style.display = open ? 'block' : 'none';
  if (open) setTimeout(() => document.getElementById('br-name')?.focus(), 150);
}

// ── Render list ───────────────────────────────────────────────
function renderBore() {
  const search = (val('br-search')||'').toLowerCase();
  const cat    = val('br-cat') || 'all';

  const total  = S.bore.reduce((s,b) => s+b.amt, 0);
  const bycat  = {};
  S.bore.forEach(b => { bycat[b.cat] = (bycat[b.cat]||0) + b.amt; });

  // ── KPI Strip ─────────────────────────────────────────────
  const catCards = Object.entries(bycat)
    .sort((a,b) => b[1]-a[1])
    .map(([c,v]) => `
      <div style="background:${BR_CAT_BG[c]||'var(--bg3)'};border:1px solid ${BR_CAT_COLOR[c]||'var(--border)'}44;
           border-radius:10px;padding:10px 14px;cursor:pointer;transition:all .15s"
           onclick="setVal('br-cat','${c}');renderBore()">
        <div style="font-size:9px;color:${BR_CAT_COLOR[c]||'var(--text3)'};font-weight:700;margin-bottom:3px;text-transform:uppercase">${c}</div>
        <div style="font-size:15px;font-weight:900;color:${BR_CAT_COLOR[c]||'var(--text)'};direction:rtl">${ar(v)} ${_currency}</div>
      </div>`).join('');

  setHTML('br-total', `
    <div class="grid2" style="margin-bottom:12px">
      <div class="mcard b" style="display:flex;align-items:center;gap:14px">
        <div style="width:42px;height:42px;background:var(--bbg);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ti-arrow-up-circle" style="font-size:20px;color:var(--blue)"></i>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);font-weight:700">إجمالي فلوس بره</div>
          <div style="font-size:22px;font-weight:900;color:var(--blue);direction:rtl">${ar(total)} ${_currency}</div>
          <div style="font-size:10px;color:var(--text3)">${S.bore.length} بند مسجّل</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${catCards || '<div style="font-size:11px;color:var(--text3);padding:10px">لا توجد بنود</div>'}
      </div>
    </div>
  `);

  // ── Filter list ────────────────────────────────────────────
  let list = [...S.bore];
  if (cat !== 'all') list = list.filter(b => b.cat === cat);
  if (search) list = list.filter(b => b.name.toLowerCase().includes(search));
  list.sort((a,b) => (b.date||'').localeCompare(a.date||''));

  if (!list.length) {
    setHTML('br-list', `<div class="empty" style="margin-top:20px"><i class="ti ti-inbox"></i><p>لا توجد بنود</p></div>`);
    return;
  }

  // ── Render cards ───────────────────────────────────────────
  const cards = list.map(b => {
    const color    = BR_CAT_COLOR[b.cat] || 'var(--blue)';
    const bg       = BR_CAT_BG[b.cat]   || 'var(--bg3)';
    const initials = b.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const logCount = (b.log||[]).length;

    return `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;
         padding:14px;margin-bottom:8px;border-right:3px solid ${color};
         cursor:pointer;transition:all .15s"
         onclick="openBoreDetail(${b.id})">

      <!-- Top row -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:36px;height:36px;border-radius:10px;background:${bg};
             color:${color};display:flex;align-items:center;justify-content:center;
             font-size:13px;font-weight:800;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text)">${b.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">
            <span style="background:${bg};color:${color};border:1px solid ${color}33;
              border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">${b.cat}</span>
            <span style="font-size:10px;color:var(--text3)">
              <i class="ti ti-calendar" style="font-size:9px"></i> ${b.date ? fDate(b.date) : '—'}
            </span>
            ${logCount ? `<span style="font-size:10px;color:var(--text3)">${logCount} تعديل</span>` : ''}
          </div>
        </div>
        <div style="text-align:left;flex-shrink:0">
          <div style="font-size:18px;font-weight:900;color:${color};direction:rtl">${ar(b.amt)}</div>
          <div style="font-size:10px;color:var(--text3);text-align:center">${_currency}</div>
        </div>
      </div>

      ${b.note ? `
      <div style="font-size:11px;color:var(--text3);padding:7px 10px;
           background:var(--bg3);border-radius:8px;border-right:2px solid ${color}44;
           margin-bottom:10px">${b.note}</div>` : ''}

      <!-- Actions -->
      <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openEditBore(${b.id})" style="flex:1;font-size:11px">
          <i class="ti ti-edit"></i> تعديل
        </button>
        <button class="btn btn-ghost btn-sm" onclick="openBoreDetail(${b.id})" style="flex:1;font-size:11px">
          <i class="ti ti-history"></i> السجل
        </button>
        <button class="btn btn-ghost btn-sm" onclick="delBore(${b.id})" style="color:var(--red);border-color:var(--rborder);font-size:11px">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  setHTML('br-list', cards);
}

// ── Add ───────────────────────────────────────────────────────
function addBore() {
  const name = val('br-name'), amt = num('br-amt');
  if (!name||!amt) { toast('اكتب الاسم والمبلغ','error'); return; }
  S.bore.push({
    id: nid(), name, amt,
    cat:  val('br-cat-add') || 'قرض أعطيته',
    note: val('br-note'),
    date: val('br-date-add') || todayStr,
    log:  []
  });
  ['br-name','br-amt','br-note','br-date-add'].forEach(id=>setVal(id,''));
  // close form after adding
  const card = document.getElementById('br-add-card');
  if (card) card.style.display = 'none';
  saveData();
  renderAll();
  toast('✓ تم الإضافة');
}

// ── Edit modal ────────────────────────────────────────────────
function openEditBore(id) {
  const b = S.bore.find(x=>x.id===id);
  if (!b) return;
  document.getElementById('edit-br-id').value  = id;
  document.getElementById('edit-br-name').textContent = b.name;
  document.getElementById('edit-br-cur').textContent  = ar(b.amt) + ' ' + _currency;
  setVal('edit-br-amt',  b.amt);
  setVal('edit-br-date', todayStr);
  setVal('edit-br-note-e', '');
  openModal('modal-edit-bore');
}

function saveEditBore() {
  const id   = parseInt(document.getElementById('edit-br-id').value);
  const newAmt = num('edit-br-amt');
  const note   = val('edit-br-note-e');
  const date   = val('edit-br-date') || todayStr;
  if (!newAmt) { toast('اكتب المبلغ الجديد','error'); return; }
  const b = S.bore.find(x=>x.id===id);
  if (!b) return;
  const oldAmt = b.amt;
  if (!b.log) b.log = [];
  b.log.push({ date, oldAmt, newAmt, diff: newAmt - oldAmt, note });
  b.amt = newAmt;
  saveData();
  closeModal('modal-edit-bore');
  renderAll();
  if (document.getElementById('pg-br-detail').classList.contains('active')) openBoreDetail(id);
  toast(`✓ تم تحديث ${b.name} من ${ar(oldAmt)} إلى ${ar(newAmt)} ${_currency}`);
}

// ── Detail page ───────────────────────────────────────────────
function openBoreDetail(id) {
  const b = S.bore.find(x=>x.id===id);
  if (!b) return;
  const color    = BR_CAT_COLOR[b.cat] || 'var(--blue)';
  const bg       = BR_CAT_BG[b.cat]   || 'var(--bg3)';
  const initials = b.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const log      = b.log || [];

  const logRows = log.length
    ? [...log].reverse().map((l, i, arr) => {
        const diff    = l.newAmt - l.oldAmt;
        const isInc   = diff >= 0;
        return `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)${i===0?';background:var(--bbg)22;margin:-1px -2px;padding:14px;border-radius:10px;border:1px solid ${color}22':''}">
          <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <div style="width:38px;height:38px;border-radius:50%;background:${isInc?'var(--gbg)':'var(--rbg)'};display:flex;align-items:center;justify-content:center;color:${isInc?'var(--green)':'var(--red)'};font-size:15px;border:1.5px solid ${isInc?'var(--gborder)':'var(--rborder)'}">
              <i class="ti ti-arrow-${isInc?'up':'down'}-circle"></i>
            </div>
            ${i < arr.length-1 ? `<div style="width:1px;flex:1;min-height:16px;background:var(--border);margin-top:4px"></div>` : ''}
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:900;font-size:15px;color:${isInc?'var(--green)':'var(--red)'}">${isInc?'+':''}${ar(diff)} ${_currency}</span>
              <span style="background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:20px;font-size:10px;color:var(--text3)">${ar(l.oldAmt)} → ${ar(l.newAmt)} ${_currency}</span>
              <span style="background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:20px;font-size:10px;color:var(--text3)">#${arr.length-i}</span>
            </div>
            <div style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px">
              <i class="ti ti-calendar" style="font-size:12px"></i>
              <span style="font-weight:600">${l.date}</span>
            </div>
            ${l.note?`<div style="font-size:11px;color:var(--text3);margin-top:4px;padding:5px 8px;background:var(--bg3);border-radius:6px;border-right:2px solid var(--border)">${l.note}</div>`:''}
          </div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:40px 0">
        <i class="ti ti-history" style="font-size:40px;color:var(--text3);display:block;margin-bottom:10px"></i>
        <div style="color:var(--text3);font-size:13px">لا توجد تعديلات مسجلة</div>
       </div>`;

  setHTML('br-detail-content',`
    <div class="page-header">
      <button class="btn btn-ghost btn-sm" onclick="nav('pg-bore')">
        <i class="ti ti-arrow-right"></i> رجوع
      </button>
      <button class="btn btn-sm" style="background:${bg};color:${color};border:1px solid ${color}44;font-weight:800" onclick="openEditBore(${b.id})">
        <i class="ti ti-edit"></i> تعديل المبلغ
      </button>
    </div>

    <!-- Profile card -->
    <div class="card" style="margin-bottom:16px;border-right:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="width:58px;height:58px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:${color};flex-shrink:0;border:2px solid ${color}44">${initials}</div>
        <div style="flex:1">
          <div style="font-size:20px;font-weight:900">${b.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap">
            <span style="background:${bg};color:${color};border:1px solid ${color}44;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${b.cat}</span>
            <span><i class="ti ti-calendar" style="font-size:11px"></i> ${b.date||'—'}</span>
          </div>
        </div>
        <div style="text-align:left">
          <div style="font-size:26px;font-weight:900;color:${color};line-height:1">${ar(b.amt)}</div>
          <div style="font-size:11px;color:var(--text3)">جنيه</div>
        </div>
      </div>

      ${b.note?`<div style="background:var(--bg3);border-right:3px solid ${color}55;border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text3);margin-bottom:12px">${b.note}</div>`:''}

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">المبلغ الحالي</div>
          <div style="font-weight:900;color:${color};font-size:16px">${ar(b.amt)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">عدد التعديلات</div>
          <div style="font-weight:900;color:var(--purple);font-size:16px">${log.length}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">تاريخ الإضافة</div>
          <div style="font-weight:900;color:var(--teal);font-size:13px">${b.date||'—'}</div>
        </div>
      </div>
    </div>

    <!-- Log -->
    <div class="card">
      <div class="card-title">
        <i class="ti ti-history" style="color:${color}"></i>
        سجل التعديلات
        <span style="background:var(--bg3);color:var(--text3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;margin-right:auto">${log.length} تعديل</span>
      </div>
      ${logRows}
    </div>

    <!-- Danger -->
    <div style="margin-top:14px">
      <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder)" onclick="delBore(${b.id},true)">
        <i class="ti ti-trash"></i> حذف البند
      </button>
    </div>
  `);
  nav('pg-br-detail');
}

// ── Delete ────────────────────────────────────────────────────
function delBore(id, goBack) {
  const b = S.bore.find(x=>x.id===id);
  confirm2('حذف البند؟','',()=>{
    if(b) auditLog('delete','bore',b.name,`${ar(b.amt)} ${_currency}`);
    S.bore = S.bore.filter(x=>x.id!==id);
    saveData();
    if (goBack) nav('pg-bore');
    renderAll();
    toast('تم الحذف','warn');
  });
}

// ── backward compat ───────────────────────────────────────────
function openEditBoreOld(id) { openEditBore(id); }

// ============================================================
// QOROD PAGE  v3  —  قروض ليك بره (فايدة ثابتة شهرية)
// ============================================================

let _qrAddOpen = true;
let _qrPayType = 'interest';
let _qrWaId    = null;

/* شهور مضت من تاريخ البداية */
function qrMonthsElapsed(q) {
  if (!q.startDate) return 0;
  const s = new Date(q.startDate);
  const n = new Date();
  return Math.max(0, (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth()));
}

/* إجمالي الفايدة المتراكمة من البداية */
function qrAccumulated(q) {
  return (q.monthlyInt || 0) * qrMonthsElapsed(q);
}

/* إجمالي ما تم تحصيله من فايدة */
function qrIntCollected(q) {
  return (q.payments||[]).reduce((s,p) => s + (p.intPart || (p.type==='interest'?p.amt:0)), 0);
}

/* فايدة مستحقة لم تُدفع بعد */
function qrIntDue(q) {
  return Math.max(0, qrAccumulated(q) - qrIntCollected(q));
}

/* إجمالي المستحق الآن (فايدة + أصل) */
function qrTotalDue(q) {
  const paid = (q.payments||[]).reduce((s,p) => s + p.amt, 0);
  return Math.max(0, q.remaining + qrAccumulated(q) - paid);
}

/* هل متأخر؟ (مرّ 35 يوم بدون دفع) */
function qrIsLate(q) {
  if (q.status !== 'active' || !q.monthlyInt) return false;
  if (!(q.payments||[]).length) {
    if (!q.startDate) return false;
    return (new Date() - new Date(q.startDate)) / 86400000 > 35;
  }
  const last = q.payments[q.payments.length-1].date;
  return (new Date() - new Date(last)) / 86400000 > 35;
}

/* toggle add form */
function qrToggleAddForm() {
  _qrAddOpen = !_qrAddOpen;
  const body = document.getElementById('qr-add-body');
  const chev = document.getElementById('qr-add-chevron');
  if (body) body.style.display = _qrAddOpen ? '' : 'none';
  if (chev) chev.style.transform = _qrAddOpen ? 'rotate(180deg)' : '';
}

/* نوع الدفعة */
function qrSetPayType(t) {
  _qrPayType = t;
  ['interest','principal','both'].forEach(x => {
    const el = document.getElementById('qrpt-'+x);
    if (el) el.classList.toggle('active', x===t);
  });
  qrPayPreview();
}

/* preview */
function qrPayPreview() {
  const amt = num('pay-qr-amt');
  const id  = parseInt(document.getElementById('pay-qr-id').value);
  const q   = S.qorod.find(x => x.id === id);
  const el  = document.getElementById('pay-qr-preview');
  if (!el || !q || !amt) { if(el) el.textContent=''; return; }
  const intDue = qrIntDue(q);
  if (_qrPayType === 'interest') {
    el.textContent = `من الفايدة المستحقة (${ar(intDue)} ${_currency})`;
    el.style.color = 'var(--amber)';
  } else if (_qrPayType === 'principal') {
    el.textContent = `الأصل سيصبح: ${ar(Math.max(0, q.remaining - amt))} ${_currency}`;
    el.style.color = 'var(--blue)';
  } else {
    const ip = Math.min(amt, intDue);
    const pp = Math.max(0, amt - ip);
    el.textContent = `فايدة: ${ar(ip)} ${_currency}  •  أصل: ${ar(pp)} ${_currency}`;
    el.style.color = 'var(--green)';
  }
}

// ── Render list ───────────────────────────────────────────────
function renderQorod() {
  const search  = (val('qr-search')||'').toLowerCase();
  const fStatus = val('qr-filter-status') || 'all';

  let list = S.qorod;
  if (fStatus === 'active') list = list.filter(q => q.status === 'active');
  else if (fStatus === 'late') list = list.filter(qrIsLate);
  else if (fStatus === 'done') list = list.filter(q => q.status === 'done');
  if (search) list = list.filter(q => q.name.toLowerCase().includes(search));

  const active     = S.qorod.filter(q => q.status === 'active');
  const totalOrig  = active.reduce((s,q) => s + q.original, 0);
  const totalRem   = active.reduce((s,q) => s + q.remaining, 0);
  const totalDue   = active.reduce((s,q) => s + qrTotalDue(q), 0);
  const totalInt   = active.reduce((s,q) => s + (q.monthlyInt||0), 0);
  const lateCount  = active.filter(qrIsLate).length;

  setHTML('qr-metrics',`
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label" style="color:var(--green)"><i class="ti ti-coins"></i> إجمالي القروض</div>
      <div class="mcard-val" style="color:var(--green)">${ar(totalOrig)} ${_currency}</div>
      <div class="mcard-sub">${active.length} قرض نشط</div>
    </div>
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label" style="color:var(--blue)"><i class="ti ti-wallet"></i> الأصل المتبقي</div>
      <div class="mcard-val" style="color:var(--blue)">${ar(totalRem)} ${_currency}</div>
      <div class="mcard-sub">من ${ar(totalOrig)} ${_currency} أصلي</div>
    </div>
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label cr"><i class="ti ti-cash"></i> إجمالي مستحق</div>
      <div class="mcard-val cr">${ar(totalDue)} ${_currency}</div>
      <div class="mcard-sub" style="color:${lateCount?'var(--red)':'var(--green)'}">${lateCount ? '⚠️ '+lateCount+' متأخر' : '✓ لا تأخير'}</div>
    </div>
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label" style="color:var(--purple)"><i class="ti ti-percentage"></i> فايدة/شهر</div>
      <div class="mcard-val" style="color:var(--purple)">${ar(totalInt)} ${_currency}</div>
      <div class="mcard-sub">دخل شهري ثابت</div>
    </div>
  `);

  // banner
  const lateList = active.filter(qrIsLate);
  const banner = document.getElementById('qr-late-banner');
  if (banner) banner.innerHTML = lateList.length ? `
    <div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
      <i class="ti ti-alert-triangle" style="color:var(--red);font-size:18px;flex-shrink:0"></i>
      <span style="color:var(--red);font-weight:800;font-size:13px;flex:1">${lateList.length} قرض متأخر</span>
      <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder);flex-shrink:0" onclick="document.getElementById('qr-filter-status').value='late';renderQorod()">
        عرض المتأخرين
      </button>
    </div>` : '';

  if (!list.length) {
    setHTML('qr-list', `<div class="empty" style="margin-top:40px"><i class="ti ti-inbox"></i><p>لا توجد قروض</p></div>`);
    return;
  }

  const cards = list.map(q => {
    const intDue    = qrIntDue(q);
    const totalDueQ = qrTotalDue(q);
    const paid      = (q.payments||[]).reduce((s,p) => s + p.amt, 0);
    const accum     = qrAccumulated(q);
    const pct       = q.original > 0 ? Math.min(100, Math.round(paid * 100 / (q.original + accum))) : 0;
    const late      = qrIsLate(q);
    const done      = q.status === 'done';
    const lastPay   = (q.payments||[]).length ? q.payments[q.payments.length-1] : null;
    const sColor    = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--blue)';
    const sLabel    = done ? 'منتهي' : late ? 'متأخر' : 'نشط';
    const sIcon     = done ? 'ti-circle-check' : late ? 'ti-alert-triangle' : 'ti-activity';
    const initials  = q.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const months    = qrMonthsElapsed(q);

    return `
    <div class="qr-card-v2" onclick="openQrDetailPage(${q.id})" style="border-right:3px solid ${sColor}">

      <!-- Row 1: avatar + name + badge + amount -->
      <div class="qr-card-top">
        <div class="qr-avatar" style="background:${sColor}22;color:${sColor};border:1.5px solid ${sColor}44">${initials}</div>
        <div class="qr-card-info">
          <div class="qr-card-name">${q.name}</div>
          <div class="qr-card-meta">
            <span class="qr-badge" style="background:${sColor}18;color:${sColor};border-color:${sColor}44">
              <i class="ti ${sIcon}"></i> ${sLabel}
            </span>
            ${months > 0 ? `<span style="color:var(--text3)">${months} شهر</span>` : ''}
            ${q.note ? `<span style="color:var(--text3)">· ${q.note}</span>` : ''}
          </div>
        </div>
        <div class="qr-card-due" onclick="event.stopPropagation();openPayQr(${q.id})">
          <div style="font-size:18px;font-weight:900;color:${totalDueQ>0?'var(--red)':'var(--green)'};line-height:1">${ar(totalDueQ)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">ج مستحق</div>
        </div>
        <i class="ti ti-chevron-left qr-chevron"></i>
      </div>

      <!-- Row 2: key numbers -->
      <div class="qr-card-nums">
        <div class="qr-num">
          <span class="qr-num-label">الأصل</span>
          <span class="qr-num-val" style="color:var(--blue)">${ar(q.original)}</span>
        </div>
        <div class="qr-num-sep"></div>
        <div class="qr-num">
          <span class="qr-num-label">المتبقي</span>
          <span class="qr-num-val" style="color:var(--amber)">${ar(q.remaining)}</span>
        </div>
        <div class="qr-num-sep"></div>
        <div class="qr-num">
          <span class="qr-num-label">فايدة/شهر</span>
          <span class="qr-num-val" style="color:var(--purple)">${ar(q.monthlyInt||0)}</span>
        </div>
        <div class="qr-num-sep"></div>
        <div class="qr-num">
          <span class="qr-num-label">فايدة مستحقة</span>
          <span class="qr-num-val" style="color:${intDue>0?'var(--red)':'var(--green)'}">${ar(intDue)}</span>
        </div>
        <div class="qr-num-sep"></div>
        <div class="qr-num">
          <span class="qr-num-label">محصّل</span>
          <span class="qr-num-val" style="color:var(--green)">${ar(paid)}</span>
        </div>
      </div>

      <!-- Row 3: progress -->
      <div class="qr-progress-wrap">
        <div class="qr-progress-bar" style="width:${pct}%;background:${sColor}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:10px">
        <span>${lastPay ? `آخر دفعة ${lastPay.date}` : 'لا توجد دفعات'}</span>
        <span>${pct}% مسدّد</span>
      </div>

      <!-- Row 4: action buttons -->
      <div class="qr-card-actions" onclick="event.stopPropagation()">
        <button class="qr-action-btn qr-action-primary" onclick="openPayQr(${q.id})">
          <i class="ti ti-arrow-down-circle"></i> تحصيل
        </button>
        ${q.phone ? `<button class="qr-action-btn qr-action-wa" onclick="openQrWa(${q.id})">
          <i class="ti ti-brand-whatsapp"></i>
        </button>` : ''}
        <button class="qr-action-btn qr-action-ghost" onclick="openQrDetailPage(${q.id})">
          <i class="ti ti-history"></i> السجل
        </button>
        <button class="qr-action-btn qr-action-danger" onclick="delQr(${q.id})" style="margin-right:auto">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  setHTML('qr-list', cards);
}

// ── Add ───────────────────────────────────────────────────────
function addQorod() {
  const name  = val('qr-name');
  if (!name) { toast('اكتب الاسم', 'error'); return; }
  S.qorod.push({
    id: nid(), name,
    phone:      val('qr-phone'),
    original:   num('qr-orig'),
    remaining:  num('qr-orig'),
    loanType:   'fixed',
    monthlyInt: num('qr-monthly-fixed'),
    ratePct: 0, intPaid: 0, payments: [],
    status: 'active',
    note: val('qr-note'),
    startDate: val('qr-start-date') || todayStr
  });
  ['qr-name','qr-phone','qr-orig','qr-monthly-fixed','qr-note','qr-start-date'].forEach(id=>setVal(id,''));
  saveData();
  renderAll();
  toast('✓ تم إضافة القرض');
}

// ── Detail page ───────────────────────────────────────────────
function openQrDetailPage(id) {
  const q = S.qorod.find(x => x.id === id);
  if (!q) return;

  const intDue    = qrIntDue(q);
  const accum     = qrAccumulated(q);
  const totalDueQ = qrTotalDue(q);
  const paid      = (q.payments||[]).reduce((s,p)=>s+p.amt,0);
  const pct       = q.original > 0 ? Math.min(100,Math.round(paid*100/(q.original+accum))) : 0;
  const late      = qrIsLate(q);
  const done      = q.status === 'done';
  const sColor    = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--amber)';
  const months    = qrMonthsElapsed(q);
  const initials  = q.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2);

  // payments history
  // index in original array (not reversed) for edit/delete targeting
  const payRows = (q.payments||[]).length
    ? [...q.payments].map((p,origIdx)=>({p,origIdx})).reverse().map(({p,origIdx}) => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--gbg);display:flex;align-items:center;justify-content:center;color:var(--green);font-size:18px;flex-shrink:0">
          <i class="ti ti-arrow-down-circle"></i>
        </div>
        <div style="flex:1">
          <div style="font-weight:900;font-size:14px">${ar(p.amt)} ${_currency}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${p.date} &nbsp;·&nbsp;
            ${p.src==='insta'?'📱 إنستا':p.src==='voda'?'📡 فودافون':'💵 كاش'} &nbsp;·&nbsp;
            <span style="color:${p.type==='interest'?'var(--amber)':p.type==='principal'?'var(--blue)':'var(--green)'}">
              ${p.type==='interest'?'فايدة':p.type==='principal'?'أصل':'فايدة+أصل'}
            </span>
          </div>
          ${p.note?`<div style="font-size:11px;color:var(--text3);margin-top:2px">${p.note}</div>`:''}
        </div>
        ${(p.intPart||p.prinPart) ? `
        <div style="text-align:left;font-size:11px;color:var(--text3);flex-shrink:0">
          ${p.intPart?`<div>فايدة: <b style="color:var(--amber)">${ar(p.intPart)} ${_currency}</b></div>`:''}
          ${p.prinPart?`<div>أصل: <b style="color:var(--blue)">${ar(p.prinPart)} ${_currency}</b></div>`:''}
        </div>` : ''}
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="icon-btn edit" title="تعديل" onclick="openEditQrPayment(${q.id},${origIdx})">
            <i class="ti ti-edit"></i>
          </button>
          <button class="icon-btn" title="حذف" onclick="delQrPayment(${q.id},${origIdx})">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>`).join('')
    : `<div style="text-align:center;color:var(--text3);padding:30px 0"><i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:8px"></i>لا توجد دفعات مسجلة</div>`;

  const html = `
  <div class="page-header">
    <button class="btn btn-ghost btn-sm" onclick="nav('pg-qorod')">
      <i class="ti ti-arrow-right"></i> رجوع
    </button>
    <div style="display:flex;gap:8px">
      ${q.phone ? `<button class="btn btn-sm" style="background:#25D36622;color:#25D366;border:1px solid #25D36655" onclick="openQrWa(${q.id})">
        <i class="ti ti-brand-whatsapp"></i> واتساب
      </button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="openEditQr(${q.id})">
        <i class="ti ti-edit"></i> تعديل
      </button>
      ${!done ? `<button class="btn btn-green btn-sm" onclick="openPayQr(${q.id})">
        <i class="ti ti-arrow-down-circle"></i> تحصيل دفعة
      </button>` : ''}
    </div>
  </div>

  <!-- Profile card -->
  <div class="card" style="margin-bottom:16px;border-right:4px solid ${sColor}">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${sColor}88,${sColor}33);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#fff;flex-shrink:0;border:2px solid ${sColor}">${initials}</div>
      <div>
        <div style="font-size:20px;font-weight:900">${q.name}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">
          ${q.phone ? `<a href="tel:${q.phone}" style="color:var(--blue)">${q.phone}</a>` : 'بدون رقم'}
          ${q.startDate ? ' &nbsp;·&nbsp; بداية: '+q.startDate : ''}
          ${q.note ? ' &nbsp;·&nbsp; '+q.note : ''}
        </div>
      </div>
      <div style="margin-right:auto;text-align:left">
        <span style="background:${sColor}22;color:${sColor};border:1px solid ${sColor}55;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:800">
          ${done?'✅ منتهي':late?'⚠️ متأخر':'🟢 نشط'}
        </span>
      </div>
    </div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">المبلغ الأصلي</div>
        <div style="font-weight:900;color:var(--blue);font-size:15px">${ar(q.original)} ${_currency}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">الأصل المتبقي</div>
        <div style="font-weight:900;color:var(--amber);font-size:15px">${ar(q.remaining)} ${_currency}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة/شهر</div>
        <div style="font-weight:900;color:var(--purple);font-size:15px">${ar(q.monthlyInt||0)} ${_currency}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">شهور مضت</div>
        <div style="font-weight:900;color:var(--teal);font-size:15px">${months}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة متراكمة</div>
        <div style="font-weight:900;color:var(--amber);font-size:15px">${ar(accum)} ${_currency}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة مستحقة</div>
        <div style="font-weight:900;color:${intDue>0?'var(--red)':'var(--green)'};font-size:15px">${ar(intDue)} ${_currency}</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">إجمالي محصّل</div>
        <div style="font-weight:900;color:var(--green);font-size:15px">${ar(paid)} ${_currency}</div>
      </div>
      <div style="background:${sColor}22;border:1px solid ${sColor}55;border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:10px;color:${sColor};margin-bottom:4px;font-weight:700">إجمالي مستحق الآن</div>
        <div style="font-weight:900;color:${sColor};font-size:17px">${ar(totalDueQ)} ${_currency}</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div style="margin-bottom:6px;display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
      <span>نسبة السداد</span><span>${pct}%</span>
    </div>
    <div style="height:8px;background:var(--bg3);border-radius:6px;overflow:hidden;margin-bottom:8px">
      <div style="height:100%;width:${pct}%;background:${sColor};border-radius:6px;transition:width .5s"></div>
    </div>
  </div>

  <!-- Payments history -->
  <div class="card">
    <div class="card-title">
      <i class="ti ti-history" style="color:var(--teal)"></i>
      سجل الدفعات
      <span style="background:var(--bg3);color:var(--text3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;margin-right:auto">${(q.payments||[]).length} دفعة</span>
    </div>
    ${payRows}
  </div>

  <!-- Danger zone -->
  <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
    ${!done ? `<button class="btn btn-sm" style="background:var(--gbg);color:var(--green);border:1px solid var(--gborder)" onclick="qrMarkDone(${q.id});nav('pg-qorod')">
      <i class="ti ti-check"></i> تأكيد الإنهاء
    </button>` : ''}
    <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder)" onclick="delQr(${q.id},true)">
      <i class="ti ti-trash"></i> حذف القرض
    </button>
  </div>`;

  setHTML('qr-detail-content', html);
  nav('pg-qr-detail');
}

// ── Open pay modal ────────────────────────────────────────────
function openPayQr(id) {
  const q = S.qorod.find(x => x.id === id);
  if (!q) return;

  document.getElementById('pay-qr-id').value = id;
  document.getElementById('pay-qr-name-lbl').textContent = q.name;
  document.getElementById('pay-qr-orig-lbl').textContent  = ar(q.remaining) + ' ' + _currency;
  const intDue = qrIntDue(q);
  document.getElementById('pay-qr-accum-lbl').textContent = ar(qrAccumulated(q)) + ' ' + _currency;
  document.getElementById('pay-qr-due-lbl').textContent   = ar(qrTotalDue(q)) + ' ' + _currency;

  const paid = (q.payments||[]).reduce((s,p)=>s+p.amt,0);
  const pct  = q.original>0 ? Math.min(100,Math.round(paid*100/(q.original+qrAccumulated(q)))) : 0;
  document.getElementById('pay-qr-pbar').style.width = pct+'%';

  const quickAmts = [];
  if (q.monthlyInt) quickAmts.push({lbl:`فايدة شهر ${ar(q.monthlyInt)} ${_currency}`, amt: q.monthlyInt});
  if (intDue > 0 && intDue !== q.monthlyInt) quickAmts.push({lbl:`كل الفايدة ${ar(intDue)} ${_currency}`, amt: intDue});
  if (q.remaining > 0) quickAmts.push({lbl:`الأصل ${ar(q.remaining)} ${_currency}`, amt: q.remaining});
  const td = qrTotalDue(q);
  if (td > 0 && td !== intDue && td !== q.remaining) quickAmts.push({lbl:`الكل ${ar(td)} ${_currency}`, amt: td});

  setHTML('pay-qr-quick', quickAmts.map(x=>`
    <button class="btn btn-ghost btn-sm" onclick="setVal('pay-qr-amt','${x.amt}');qrPayPreview()">${x.lbl}</button>
  `).join(''));

  setVal('pay-qr-amt',''); setVal('pay-qr-note','');
  setVal('pay-qr-date', todayStr);
  _qrPayType = 'interest';
  qrSetPayType('interest');
  openModal('modal-pay-qr');
}

// ── Save pay ──────────────────────────────────────────────────
function savePayQr() {
  const id   = parseInt(document.getElementById('pay-qr-id').value);
  const amt  = num('pay-qr-amt');
  const src  = val('pay-qr-src') || 'cash';
  const note = val('pay-qr-note');
  if (!amt) { toast('اكتب المبلغ','error'); return; }
  const q = S.qorod.find(x => x.id === id);
  if (!q) return;

  const intDue = qrIntDue(q);
  let intPart = 0, prinPart = 0;

  if (_qrPayType === 'interest')        { intPart = amt; }
  else if (_qrPayType === 'principal')  { prinPart = amt; }
  else { intPart = Math.min(amt, intDue); prinPart = Math.max(0, amt - intPart); }

  q.intPaid   = (q.intPaid||0) + intPart;
  q.remaining = Math.max(0, q.remaining - prinPart);
  const payDate = val('pay-qr-date') || todayStr;
  q.payments.push({date:payDate, amt, type:_qrPayType, intPart, prinPart, src, note});
  if (q.remaining <= 0) q.status = 'done';

  S.daily.push({
    id: nid(), date: payDate,
    name: (intPart&&prinPart?'فايدة+أصل':intPart?'فايدة':'أصل')+' قرض: '+q.name,
    source: src, type: 'in', amt, note, affect: 'qorod'
  });

  closeModal('modal-pay-qr');
  renderAll();
  // if we're on the detail page, refresh it
  if (document.getElementById('pg-qr-detail').classList.contains('active')) openQrDetailPage(id);
  toast(`✓ تم تسجيل ${ar(amt)} ${_currency} من ${q.name}`);
}

// ── WhatsApp ──────────────────────────────────────────────────
function openQrWa(id) {
  const q = S.qorod.find(x => x.id === id);
  if (!q) return;
  if (!q.phone) { toast('مفيش رقم محفوظ','warn'); return; }
  _qrWaId = id;
  const shop = getShopSettings().shopName || 'نظام المحل';
  const msg  =
`السلام عليكم ${q.name} 👋
من ${shop}

💰 تذكير بالقرض:
• الأصل المتبقي: ${ar(q.remaining)} ${_currency}
• الفايدة المستحقة: ${ar(qrIntDue(q))} ${_currency}
• ━━━━━━━━━━━━━
• إجمالي المستحق: *${ar(qrTotalDue(q))} ${_currency}*

يرجى التواصل لتسوية المستحقات.
شكراً 🙏`;

  document.getElementById('qr-wa-name').textContent  = q.name;
  document.getElementById('qr-wa-phone').textContent = q.phone;
  document.getElementById('qr-wa-text').value = msg;
  document.getElementById('qr-wa-chars').textContent = msg.length+' حرف';
  openModal('modal-qr-wa');
}

function qrWaSend() {
  const q = S.qorod.find(x => x.id === _qrWaId);
  if (!q||!q.phone) return;
  const msg = document.getElementById('qr-wa-text').value;
  window.open(`https://wa.me/2${q.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');
  closeModal('modal-qr-wa');
  toast('✓ تم فتح واتساب');
}

function qrWaSendAll() {
  const list = S.qorod.filter(q => q.status==='active' && qrIsLate(q) && q.phone);
  if (!list.length) { toast('مفيش متأخرين عندهم رقم','warn'); return; }
  list.forEach((q,i) => setTimeout(()=>openQrWa(q.id), i*800));
  toast(`✓ هيتفتح واتساب لـ ${list.length} شخص`);
}

// ── Mark done ─────────────────────────────────────────────────
function qrMarkDone(id) {
  const q = S.qorod.find(x => x.id === id);
  if (!q) return;
  confirm2(`إنهاء قرض ${q.name}؟`, 'سيُحفظ في السجل كمنتهي', () => {
    q.status = 'done';
    renderAll();
    toast(`✓ تم إنهاء قرض ${q.name}`);
  });
}

// ── Delete ────────────────────────────────────────────────────
function delQr(id, goBack) {
  const q = S.qorod.find(x => x.id === id);
  confirm2('حذف القرض؟','', () => {
    if (q) auditLog('delete','qorod',q.name,`أصلي: ${ar(q.original)} ${_currency}`);
    S.qorod = S.qorod.filter(x => x.id !== id);
    saveData();
    if (goBack) nav('pg-qorod');
    renderAll();
    toast('تم الحذف','warn');
  });
}

// ── Edit / Delete a single payment ───────────────────────────
function openEditQrPayment(qid, idx) {
  const q = S.qorod.find(x => x.id === qid);
  if (!q) return;
  const p = q.payments[idx];
  if (!p) return;
  document.getElementById('eqrp-qid').value = qid;
  document.getElementById('eqrp-idx').value = idx;
  setVal('eqrp-amt',  p.amt);
  setVal('eqrp-date', p.date || todayStr);
  setVal('eqrp-type', p.type || 'interest');
  setVal('eqrp-src',  p.src  || 'cash');
  setVal('eqrp-note', p.note || '');
  openModal('modal-edit-qr-payment');
}

function saveEditQrPayment() {
  const qid  = parseInt(document.getElementById('eqrp-qid').value);
  const idx  = parseInt(document.getElementById('eqrp-idx').value);
  const amt  = parseFloat(val('eqrp-amt'))  || 0;
  const date = val('eqrp-date') || todayStr;
  const type = val('eqrp-type') || 'interest';
  const src  = val('eqrp-src')  || 'cash';
  const note = val('eqrp-note').trim();
  if (!amt) { toast('اكتب المبلغ', 'error'); return; }

  const q = S.qorod.find(x => x.id === qid);
  if (!q) return;
  const p = q.payments[idx];
  if (!p) return;

  // reverse old principal effect on q.remaining
  const oldPrinPart = p.prinPart || 0;
  const newPrinPart = type === 'principal' ? amt : type === 'both' ? Math.max(0, amt - (p.intPart||0)) : 0;
  q.remaining = Math.max(0, q.remaining + oldPrinPart - newPrinPart);

  // update payment record
  p.amt      = amt;
  p.date     = date;
  p.type     = type;
  p.src      = src;
  p.note     = note;
  p.intPart  = type === 'interest' ? amt : type === 'both' ? Math.min(amt, q.monthlyInt||0) : 0;
  p.prinPart = newPrinPart;

  if (q.remaining <= 0) q.status = 'done';
  else if (q.status === 'done') q.status = 'active';

  closeModal('modal-edit-qr-payment');
  saveData();
  renderAll();
  openQrDetailPage(qid);
  toast('✓ تم تعديل الدفعة');
}

function delQrPayment(qid, idx) {
  const q = S.qorod.find(x => x.id === qid);
  if (!q) return;
  const p = q.payments[idx];
  if (!p) return;
  confirm2(`حذف دفعة ${ar(p.amt)} ${_currency}؟`, 'سيتم استرجاع الأصل إن وُجد', () => {
    // restore principal
    q.remaining = Math.min(q.original, q.remaining + (p.prinPart || 0));
    q.intPaid   = Math.max(0, (q.intPaid||0) - (p.intPart||0));
    q.payments.splice(idx, 1);
    if (q.remaining > 0 && q.status === 'done') q.status = 'active';
    saveData();
    renderAll();
    openQrDetailPage(qid);
    toast('تم حذف الدفعة', 'warn');
  });
}

// backward compat
function openQrDetail(id) { openQrDetailPage(id); }

// ============================================================
// DOYON PAGE  v2  —  ديون عليك
// ============================================================
let _dyAddOpen = true;

function dyToggleAdd() {
  const card = document.getElementById('dy-add-card');
  if (!card) return;
  const open = card.style.display === 'none' || card.style.display === '';
  card.style.display = open ? 'block' : 'none';
  if (open) {
    setVal('dy-date', todayStr);
    setTimeout(() => document.getElementById('dy-name')?.focus(), 150);
  }
}

/* شهور مضت */
function dyMonths(d) {
  if (!d.startDate) return 0;
  const s = new Date(d.startDate), n = new Date();
  return Math.max(0, (n.getFullYear()-s.getFullYear())*12 + (n.getMonth()-s.getMonth()));
}

/* فايدة متراكمة */
function dyAccum(d) { return (d.monthlyInt||0) * dyMonths(d); }

/* فايدة محصّلة */
function dyIntCollected(d) {
  return (d.payments||[]).reduce((s,p) => s + (p.type==='interest' ? p.amt : 0), 0);
}

/* فايدة مستحقة */
function dyIntDue(d) { return Math.max(0, dyAccum(d) - dyIntCollected(d)); }

/* إجمالي مستحق */
function dyTotalDue(d) {
  const paid = (d.payments||[]).reduce((s,p)=>s+p.amt,0);
  return Math.max(0, d.remaining + dyAccum(d) - paid);
}

/* متأخر؟ */
function dyIsLate(d) {
  if (d.status !== 'active' || !d.monthlyInt) return false;
  if (!(d.payments||[]).length) {
    if (!d.startDate) return false;
    return (new Date() - new Date(d.startDate)) / 86400000 > 35;
  }
  return (new Date() - new Date(d.payments[d.payments.length-1].date)) / 86400000 > 35;
}

// ── Render list ───────────────────────────────────────────────
function renderDoyon() {
  const search  = (val('dy-search')||'').toLowerCase();
  const fStatus = val('dy-filter-status') || 'all';

  const active  = S.doyon.filter(d => d.status === 'active');
  const done    = S.doyon.filter(d => d.status === 'done');
  const totalR  = active.reduce((s,d) => s + d.remaining, 0);
  const totalI  = active.reduce((s,d) => s + (d.monthlyInt||0), 0);
  const totalDue= active.reduce((s,d) => s + dyTotalDue(d), 0);
  const lateN   = active.filter(dyIsLate).length;

  // ── KPI Cards ──────────────────────────────────────────────
  setHTML('dy-metrics', `
    <div class="grid2" style="margin-bottom:10px">
      <div style="background:var(--abg);border:1.5px solid var(--aborder);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;background:var(--amber);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ti-arrow-badge-down" style="font-size:22px;color:#fff"></i>
        </div>
        <div>
          <div style="font-size:10px;color:var(--amber);font-weight:700">إجمالي ما عليّ</div>
          <div style="font-size:22px;font-weight:900;color:var(--amber);direction:rtl">${ar(totalR)} ${_currency}</div>
          <div style="font-size:10px;color:var(--text3)">${active.length} دين نشط · ${done.length} منتهي</div>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="text-align:center;background:var(--bg3);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--text3);margin-bottom:2px">فايدة شهرية</div>
          <div style="font-size:15px;font-weight:800;color:var(--purple,#a855f7);direction:rtl">${ar(totalI)} ${_currency}</div>
        </div>
        <div style="text-align:center;background:${totalDue>0?'var(--rbg)':'var(--gbg)'};border-radius:8px;padding:10px;border:1px solid ${totalDue>0?'var(--rborder)':'var(--gborder)'}">
          <div style="font-size:10px;color:var(--text3);margin-bottom:2px">مستحق الآن</div>
          <div style="font-size:15px;font-weight:800;color:${totalDue>0?'var(--red)':'var(--green)'};direction:rtl">${ar(totalDue)} ${_currency}</div>
        </div>
      </div>
    </div>
    ${lateN ? `<div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--red);font-weight:700">
      <i class="ti ti-alert-triangle" style="font-size:16px"></i> عندك ${lateN} دين متأخر في الفايدة — لازم تدفع!
    </div>` : ''}
  `);

  // ── Filter ─────────────────────────────────────────────────
  let list = [...S.doyon];
  if (fStatus === 'active') list = list.filter(d => d.status === 'active');
  else if (fStatus === 'done') list = list.filter(d => d.status === 'done');
  if (search) list = list.filter(d => d.name.toLowerCase().includes(search));

  if (!list.length) {
    setHTML('dy-list', `<div class="empty" style="margin-top:30px"><i class="ti ti-inbox"></i><p>لا توجد ديون</p></div>`);
    return;
  }

  // ── Cards ──────────────────────────────────────────────────
  const cards = list.map(d => {
    const accum    = dyAccum(d);
    const intDue   = dyIntDue(d);
    const totalDueD= dyTotalDue(d);
    const paid     = (d.payments||[]).reduce((s,p)=>s+p.amt,0);
    const late     = dyIsLate(d);
    const isDone   = d.status === 'done';
    const months   = dyMonths(d);
    const lastPay  = (d.payments||[]).slice(-1)[0] || null;
    const initials = d.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const sColor   = isDone ? 'var(--green)' : late ? 'var(--red)' : 'var(--amber)';
    const sLabel   = isDone ? '✓ منتهي' : late ? '⚠️ متأخر' : '● نشط';

    return `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;
         margin-bottom:10px;overflow:hidden;border-right:4px solid ${sColor}">

      <!-- ── Top: Avatar + Name + Status + Amount ── -->
      <div style="padding:14px 14px 10px;display:flex;align-items:center;gap:10px;cursor:pointer"
           onclick="openDyDetail(${d.id})">
        <div style="width:40px;height:40px;border-radius:11px;background:${sColor}22;
             color:${sColor};display:flex;align-items:center;justify-content:center;
             font-size:14px;font-weight:900;flex-shrink:0;border:1.5px solid ${sColor}44">
          ${initials}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:800;color:var(--text)">${d.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">
            <span style="font-size:10px;font-weight:700;color:${sColor}">${sLabel}</span>
            ${months > 0 ? `<span style="font-size:10px;color:var(--text3)">${months} شهر</span>` : ''}
            ${d.phone ? `<span style="font-size:10px;color:var(--text3)"><i class="ti ti-phone" style="font-size:9px"></i> ${d.phone}</span>` : ''}
          </div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:10px;color:var(--text3);margin-bottom:2px">المتبقي</div>
          <div style="font-size:17px;font-weight:900;color:var(--amber);direction:rtl">${ar(d.remaining)}</div>
          <div style="font-size:9px;color:var(--text3)">${_currency}</div>
        </div>
      </div>

      <!-- ── Stats Row ── -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
        <div style="background:var(--bg2);padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text3)">الأصلي</div>
          <div style="font-size:12px;font-weight:700;color:var(--amber);direction:rtl">${ar(d.original)}</div>
        </div>
        <div style="background:var(--bg2);padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text3)">فايدة/شهر</div>
          <div style="font-size:12px;font-weight:700;color:var(--purple,#a855f7);direction:rtl">${ar(d.monthlyInt||0)}</div>
        </div>
        <div style="background:${intDue>0?'var(--rbg)':'var(--bg2)'};padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text3)">فايدة مستحقة</div>
          <div style="font-size:12px;font-weight:700;color:${intDue>0?'var(--red)':'var(--green)'};direction:rtl">${ar(intDue)}</div>
        </div>
        <div style="background:var(--bg2);padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--text3)">تم دفعه</div>
          <div style="font-size:12px;font-weight:700;color:var(--green);direction:rtl">${ar(paid)}</div>
        </div>
      </div>

      ${d.note ? `
      <div style="padding:8px 14px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);
           background:var(--bg3);display:flex;align-items:center;gap:6px">
        <i class="ti ti-notes" style="font-size:12px"></i> ${d.note}
      </div>` : ''}

      ${lastPay ? `
      <div style="padding:7px 14px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);
           display:flex;align-items:center;gap:6px">
        <i class="ti ti-clock" style="font-size:11px;color:var(--green)"></i>
        آخر دفعة: <b style="color:var(--green)">${ar(lastPay.amt)} ${_currency}</b>
        <span>— ${fDate(lastPay.date)}</span>
      </div>` : `
      <div style="padding:7px 14px;font-size:11px;color:var(--red);border-bottom:1px solid var(--border);
           display:flex;align-items:center;gap:6px">
        <i class="ti ti-alert-circle" style="font-size:11px"></i> لم تدفع أي دفعة بعد
      </div>`}

      <!-- ── Actions ── -->
      <div style="padding:10px 14px;display:flex;gap:8px" onclick="event.stopPropagation()">
        <button class="btn btn-sm" style="flex:1;background:var(--abg);color:var(--amber);border:1px solid var(--aborder);font-weight:700"
          onclick="openPayDy(${d.id})">
          <i class="ti ti-arrow-down-circle"></i> دفع فايدة
        </button>
        <button class="btn btn-sm" style="flex:1;background:var(--bbg);color:var(--blue);border:1px solid var(--bborder);font-weight:700"
          onclick="openPayDy(${d.id})">
          <i class="ti ti-wallet"></i> سداد جزئي
        </button>
        <button class="btn btn-ghost btn-sm" onclick="openDyDetail(${d.id})">
          <i class="ti ti-history"></i> السجل
        </button>
        ${!isDone ? `<button class="btn btn-ghost btn-sm" style="color:var(--green)" onclick="dyMarkDone(${d.id})">
          <i class="ti ti-check"></i>
        </button>` : ''}
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="delDy(${d.id})">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  setHTML('dy-list', cards);
}

// ── Add ───────────────────────────────────────────────────────
function addDoyon(){
  const name = val('dy-name');
  if(!name){toast('اكتب الاسم','error');return;}
  const orig = num('dy-orig');
  S.doyon.push({
    id:nid(), name,
    phone:     val('dy-phone'),
    original:  orig,
    remaining: orig,
    monthlyInt: num('dy-monthly'),
    intPaid:0, payments:[], status:'active',
    note:      val('dy-note'),
    startDate: val('dy-date') || todayStr
  });
  ['dy-name','dy-phone','dy-orig','dy-monthly','dy-note','dy-date'].forEach(id=>setVal(id,''));
  saveData();
  renderAll();
  toast('✓ تم إضافة الدين');
}

let _dySrc = 'cash';

function dySetSrc(src) {
  _dySrc = src;
  ['cash','insta','voda'].forEach(s => {
    const el = document.getElementById('dysrc-'+s);
    if (el) el.classList.toggle('active', s === src);
  });
}

// ── Pay modal ─────────────────────────────────────────────────
function openPayDy(id){
  const d = S.doyon.find(x=>x.id===id);
  if (!d) return;
  document.getElementById('pay-dy-id').value = id;
  const intDue = dyIntDue(d);
  setHTML('pay-dy-label',`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--abg);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:var(--amber);border:1.5px solid var(--aborder);flex-shrink:0">
        ${d.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()}
      </div>
      <div>
        <div style="font-weight:900;font-size:15px">${d.name}</div>
        <div style="font-size:11px;color:var(--text3)">${d.startDate||''} ${d.phone?'· '+d.phone:''}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
      <div style="background:var(--bg2);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">الأصل المتبقي</div>
        <div style="font-weight:800;color:var(--amber);font-size:13px">${ar(d.remaining)} ${_currency}</div>
      </div>
      <div style="background:var(--bg2);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">فايدة متراكمة</div>
        <div style="font-weight:800;color:var(--amber);font-size:13px">${ar(dyAccum(d))} ${_currency}</div>
      </div>
      <div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:8px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--red)">مستحق الآن</div>
        <div style="font-weight:900;color:var(--red);font-size:13px">${ar(dyTotalDue(d))} ${_currency}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">دفع سريع:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${d.monthlyInt?`<button class="btn btn-ghost btn-sm" onclick="setVal('pay-dy-amt','${d.monthlyInt}')">فايدة شهر · ${ar(d.monthlyInt)} ${_currency}</button>`:''}
      ${intDue>0&&intDue!==d.monthlyInt?`<button class="btn btn-ghost btn-sm" onclick="setVal('pay-dy-amt','${intDue}')">كل الفايدة · ${ar(intDue)} ${_currency}</button>`:''}
      ${d.remaining>0?`<button class="btn btn-ghost btn-sm" onclick="setVal('pay-dy-amt','${d.remaining}')">الأصل كامل · ${ar(d.remaining)} ${_currency}</button>`:''}
    </div>
  `);
  setVal('pay-dy-amt','');
  setVal('pay-dy-note-f','');
  setVal('pay-dy-date-f', todayStr);
  dySetSrc('cash');
  setVal('pay-dy-date-f', todayStr);
  _dyPayType = 'interest';
  dySetPayType('interest');
  openModal('modal-pay-dy');
  setTimeout(() => document.getElementById('pay-dy-amt')?.focus(), 300);
}

// ── Doyon Pay Type ────────────────────────────────────────────
let _dyPayType = 'interest';

function dySetPayType(type) {
  _dyPayType = type;
  const intBtn  = document.getElementById('dy-type-interest');
  const prinBtn = document.getElementById('dy-type-principal');
  const hint    = document.getElementById('dy-pay-hint');
  const hintTxt = document.getElementById('dy-pay-hint-text');

  if (type === 'interest') {
    if (intBtn)  { intBtn.style.borderColor  = 'var(--aborder)'; intBtn.style.background = 'var(--abg)'; intBtn.style.color = 'var(--amber)'; }
    if (prinBtn) { prinBtn.style.borderColor = 'var(--border)';  prinBtn.style.background = 'var(--bg3)'; prinBtn.style.color = 'var(--text3)'; }
    if (hint)    hint.style.borderColor = 'var(--aborder)', hint.style.background = 'var(--abg)';
    if (hintTxt) hintTxt.style.color = 'var(--amber)', hintTxt.textContent = 'دفع الفايدة المستحقة فقط — الأصل مش بيتغير';
    // auto-fill with due interest
    const id = parseInt(document.getElementById('pay-dy-id')?.value);
    if (id) {
      const d = S.doyon.find(x => x.id === id);
      if (d) {
        const due = dyIntDue(d);
        const amtEl = document.getElementById('pay-dy-amt');
        if (due > 0) {
          amtEl.value = due;
          amtEl.max = due;
          amtEl.style.borderColor = 'var(--aborder)';
        } else {
          amtEl.value = '';
          amtEl.max = '';
          amtEl.placeholder = 'مفيش فايدة مستحقة';
          amtEl.style.borderColor = 'var(--gborder)';
        }
      }
    }
  } else {
    if (prinBtn) { prinBtn.style.borderColor = 'var(--bborder)'; prinBtn.style.background = 'var(--bbg)'; prinBtn.style.color = 'var(--blue)'; }
    if (intBtn)  { intBtn.style.borderColor  = 'var(--border)';  intBtn.style.background = 'var(--bg3)'; intBtn.style.color = 'var(--text3)'; }
    if (hint)    hint.style.borderColor = 'var(--bborder)', hint.style.background = 'var(--bbg)';
    const amtElP = document.getElementById('pay-dy-amt');
    const idP = parseInt(document.getElementById('pay-dy-id')?.value);
    const dP  = S.doyon.find(x => x.id === idP);
    if (hintTxt && dP) hintTxt.style.color = 'var(--blue)', hintTxt.textContent = 'سداد من الأصل — متبقي ' + ar(dP.remaining) + ' ' + _currency;
    else if (hintTxt) hintTxt.style.color = 'var(--blue)', hintTxt.textContent = 'سداد جزء من الأصل — هينزل من المبلغ الأساسي مباشرة';
    if (amtElP) { amtElP.value = ''; amtElP.max = dP ? dP.remaining : ''; amtElP.placeholder = '0'; amtElP.style.borderColor = ''; }
  }
  document.getElementById('pay-dy-amt')?.focus();
}

function savePayDy(){
  const id   = parseInt(document.getElementById('pay-dy-id').value);
  const amt  = num('pay-dy-amt');
  const src  = _dySrc || 'cash';
  const note = val('pay-dy-note-f');
  const date = val('pay-dy-date-f') || todayStr;
  const type = _dyPayType || 'interest';

  if (!amt) { toast('اكتب المبلغ', 'error'); return; }
  const d = S.doyon.find(x => x.id === id);
  if (!d) return;

  if (type === 'interest') {
    // فايدة فقط - مش بتنزل من الأصل
    const maxInt = dyIntDue(d);
    if (maxInt <= 0) { toast('مفيش فايدة مستحقة دلوقتي', 'warn'); return; }
    const actualInt = Math.min(amt, maxInt);
    if (amt > maxInt) toast(`تنبيه: تم تعديل المبلغ للفايدة المستحقة فقط: ${ar(actualInt)} ${_currency}`, 'warn');
    d.intPaid = (d.intPaid || 0) + actualInt;
    d.payments.push({ date, amt: actualInt, type: 'interest', src, note });
    S.daily.push({ id: nid(), date, name: 'فايدة دين: ' + d.name, source: src, type: 'out', amt: actualInt, note, affect: 'doyon' });
    toast(`✓ تم تسجيل فايدة ${ar(actualInt)} ${_currency} لـ ${d.name}`);
  } else {
    // سداد من الأصل - بينزل من remaining وتتغير الفايدة بنفس النسبة
    if (amt > d.remaining) {
      toast(`المبلغ أكبر من الأصل المتبقي! الحد الأقصى: ${ar(d.remaining)} ${_currency}`, 'error');
      document.getElementById('pay-dy-amt').value = d.remaining;
      document.getElementById('pay-dy-amt').style.borderColor = 'var(--red)';
      setTimeout(() => { if(document.getElementById('pay-dy-amt')) document.getElementById('pay-dy-amt').style.borderColor = ''; }, 2000);
      return;
    }
    const actualAmt  = amt;
    const oldRemain  = d.remaining;
    const oldInt     = d.monthlyInt || 0;

    d.remaining = Math.max(0, d.remaining - actualAmt);

    // تغيير الفايدة بنفس نسبة تغيير الأصل
    if (oldRemain > 0 && oldInt > 0) {
      const ratio      = actualAmt / oldRemain;          // نسبة اللي اتدفع
      const intReduce  = Math.round(oldInt * ratio);     // قدر تخفيض الفايدة
      const newInt     = Math.max(0, oldInt - intReduce);
      d.monthlyInt     = newInt;
    }

    d.payments.push({ date, amt: actualAmt, type: 'principal', src, note,
                      oldInt: oldInt, newInt: d.monthlyInt });
    S.daily.push({ id: nid(), date, name: 'سداد أصل دين: ' + d.name,
                   source: src, type: 'out', amt: actualAmt, note, affect: 'doyon' });

    if (d.remaining <= 0) {
      d.status = 'done';
      d.monthlyInt = 0;
      toast(`🎉 تم سداد دين ${d.name} بالكامل!`);
    } else {
      toast(`✓ سداد ${ar(actualAmt)} ${_currency} · متبقي ${ar(d.remaining)} ${_currency} · فايدة جديدة ${ar(d.monthlyInt)} ${_currency}/شهر`);
    }
  }

  saveData();
  closeModal('modal-pay-dy');
  renderAll();
  if (document.getElementById('pg-dy-detail')?.classList.contains('active')) openDyDetail(id);
}

// ── Detail page ───────────────────────────────────────────────
function openDyDetail(id) {
  const d = S.doyon.find(x => x.id === id);
  if (!d) return;
  const accum   = dyAccum(d);
  const intDue  = dyIntDue(d);
  const totalDueD = dyTotalDue(d);
  const paid    = (d.payments||[]).reduce((s,p)=>s+p.amt,0);
  const months  = dyMonths(d);
  const done    = d.status === 'done';
  const late    = dyIsLate(d);
  const sColor  = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--amber)';
  const initials= d.name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const payRows = (d.payments||[]).length
    ? [...d.payments].reverse().map((p, i, arr) => {
        const srcLabel = p.src==='insta' ? '📱 إنستا' : p.src==='voda' ? '📡 فودافون' : '💵 كاش';
        const isToday  = p.date === todayStr;
        return `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)${i===0?';background:var(--gbg)22;margin:-1px -2px;padding:14px;border-radius:10px;border:1px solid var(--gborder)33':''}">
          <!-- Icon + line -->
          <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <div style="width:38px;height:38px;border-radius:50%;
              background:${p.type==='principal'?'var(--bbg)':'var(--abg)'};
              display:flex;align-items:center;justify-content:center;
              color:${p.type==='principal'?'var(--blue)':'var(--amber)'};
              font-size:16px;border:1.5px solid ${p.type==='principal'?'var(--bborder)':'var(--aborder)'}">
              <i class="ti ti-${p.type==='principal'?'wallet':'coins'}"></i>
            </div>
            ${i < arr.length-1 ? `<div style="width:1px;height:100%;min-height:16px;background:var(--border);margin-top:4px"></div>` : ''}
          </div>
          <!-- Content -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:900;font-size:15px;color:var(--amber)">${ar(p.amt)} ${_currency}</span>
              ${isToday ? `<span style="background:var(--gbg);color:var(--green);border:1px solid var(--gborder);padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700">اليوم</span>` : ''}
              <span style="background:${p.type==='principal'?'var(--bbg)':'var(--abg)'};
                color:${p.type==='principal'?'var(--blue)':'var(--amber)'};
                border:1px solid ${p.type==='principal'?'var(--bborder)':'var(--aborder)'};
                padding:1px 8px;border-radius:20px;font-size:10px;font-weight:700">
                ${p.type==='principal'?'سداد أصل':'فايدة'}
              </span>
              <span style="background:var(--bg3);border:1px solid var(--border);padding:1px 7px;border-radius:20px;font-size:10px;color:var(--text3)">${srcLabel}</span>
            </div>
            <div style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px">
              <i class="ti ti-calendar" style="font-size:12px"></i>
              <span style="font-weight:600">${p.date}</span>
            </div>
            ${p.note ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;padding:5px 8px;background:var(--bg3);border-radius:6px;border-right:2px solid var(--border)">${p.note}</div>` : ''}
          </div>
          <!-- Amount highlight -->
          <div style="text-align:left;flex-shrink:0">
            <div style="font-size:12px;color:var(--text3)">#${arr.length - i}</div>
          </div>
        </div>`
      }).join('')
    : `<div style="text-align:center;padding:40px 0">
        <i class="ti ti-inbox" style="font-size:40px;color:var(--text3);display:block;margin-bottom:10px"></i>
        <div style="color:var(--text3);font-size:13px">لا توجد دفعات مسجلة بعد</div>
       </div>`;

  const totalCollected = paid;
  const pct = d.original > 0 ? Math.min(100, Math.round(totalCollected*100/(d.original+accum))) : 0;

  setHTML('dy-detail-content',`
    <div class="page-header">
      <button class="btn btn-ghost btn-sm" onclick="nav('pg-doyon')">
        <i class="ti ti-arrow-right"></i> رجوع
      </button>
      <button class="btn btn-sm" style="background:var(--abg);color:var(--amber);border:1px solid var(--aborder);font-weight:800" onclick="openPayDy(${d.id})">
        <i class="ti ti-arrow-down-circle"></i> استلام فايدة
      </button>
    </div>

    <!-- Profile -->
    <div class="card" style="margin-bottom:16px;border-right:4px solid ${sColor}">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="width:58px;height:58px;border-radius:50%;background:${sColor}22;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:${sColor};flex-shrink:0;border:2px solid ${sColor}55">${initials}</div>
        <div style="flex:1">
          <div style="font-size:20px;font-weight:900">${d.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">
            ${d.phone?`<a href="tel:${d.phone}" style="color:var(--blue)">${d.phone}</a> &nbsp;·&nbsp; `:'' }
            ${d.startDate?`من ${d.startDate}`:''} ${months?`(${months} شهر)`:''}
            ${d.note?` &nbsp;·&nbsp; ${d.note}`:''}
          </div>
        </div>
        <span style="background:${sColor}22;color:${sColor};border:1px solid ${sColor}55;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:800">
          ${done?'✅ منتهي':late?'⚠️ متأخر':'🟢 نشط'}
        </span>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">الأصلي</div>
          <div style="font-weight:900;color:var(--amber);font-size:15px">${ar(d.original)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">المتبقي</div>
          <div style="font-weight:900;color:var(--amber);font-size:15px">${ar(d.remaining)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة/شهر</div>
          <div style="font-weight:900;color:var(--purple);font-size:15px">${ar(d.monthlyInt||0)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">شهور مضت</div>
          <div style="font-weight:900;color:var(--teal);font-size:15px">${months}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة متراكمة</div>
          <div style="font-weight:900;color:var(--amber);font-size:15px">${ar(accum)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">فايدة مستحقة</div>
          <div style="font-weight:900;color:${intDue>0?'var(--red)':'var(--green)'};font-size:15px">${ar(intDue)} ${_currency}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">إجمالي محصّل</div>
          <div style="font-weight:900;color:var(--green);font-size:15px">${ar(paid)} ${_currency}</div>
        </div>
        <div style="background:${sColor}18;border:1px solid ${sColor}44;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:${sColor};font-weight:700;margin-bottom:4px">إجمالي مستحق</div>
          <div style="font-weight:900;color:${sColor};font-size:17px">${ar(totalDueD)} ${_currency}</div>
        </div>
      </div>

      <!-- Progress -->
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
        <span>نسبة السداد</span><span>${pct}%</span>
      </div>
      <div style="height:7px;background:var(--bg3);border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${sColor};border-radius:6px;transition:width .5s"></div>
      </div>
    </div>

    <!-- Payments history -->
    <div class="card">
      <div class="card-title">
        <i class="ti ti-history" style="color:var(--amber)"></i>
        سجل استلام الفوايد
        <span style="background:var(--bg3);color:var(--text3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;margin-right:auto">${(d.payments||[]).length} دفعة</span>
      </div>
      ${payRows}
    </div>

    <!-- Danger -->
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      ${!done?`<button class="btn btn-sm" style="background:var(--gbg);color:var(--green);border:1px solid var(--gborder)" onclick="dyMarkDone(${d.id});nav('pg-doyon')">
        <i class="ti ti-check"></i> تأكيد الإنهاء
      </button>`:''}
      <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder)" onclick="delDy(${d.id},true)">
        <i class="ti ti-trash"></i> حذف الدين
      </button>
    </div>
  `);
  nav('pg-dy-detail');
}

// ── Mark done ─────────────────────────────────────────────────
function dyMarkDone(id) {
  const d = S.doyon.find(x=>x.id===id);
  if (!d) return;
  confirm2(`إنهاء دين ${d.name}؟`, '', () => {
    d.status = 'done';
    renderAll();
    toast(`✓ تم إنهاء دين ${d.name}`);
  });
}

// ── Delete ────────────────────────────────────────────────────
function delDy(id, goBack){
  const d = S.doyon.find(x=>x.id===id);
  confirm2('حذف الدين؟','',()=>{
    if(d) auditLog('delete','doyon',d.name,`أصلي: ${ar(d.original)} ${_currency}`);
    S.doyon = S.doyon.filter(x=>x.id!==id);
    saveData();
    if(goBack) nav('pg-doyon');
    renderAll();
    toast('تم الحذف','warn');
  });
}

// ── backward compat ───────────────────────────────────────────

// ============================================================
// REPORTS PAGE
// ============================================================
function renderReports() {
  const y  = parseInt(val('rep-year')  || new Date().getFullYear());
  const mv = val('rep-month') || String(new Date().getMonth()+1);
  const m  = mv==='all' ? null : parseInt(mv);

  const filtered = S.daily.filter(e=>{
    const d=new Date(e.date+'T12:00');
    return d.getFullYear()===y && (m===null||d.getMonth()+1===m);
  });
  const totalIn  = filtered.filter(e=>e.type==='in').reduce((s,e)=>s+e.amt,0);
  const totalOut = filtered.filter(e=>e.type==='out').reduce((s,e)=>s+e.amt,0);
  const net      = totalIn-totalOut;

  setHTML('rep-kpis',`
    <div class="mcard g"><div class="mcard-label cg"><i class="ti ti-arrow-down-circle"></i> وارد</div><div class="mcard-val cg">${ar(totalIn)} ${_currency}</div><div class="mcard-sub">${filtered.filter(e=>e.type==='in').length} عملية</div></div>
    <div class="mcard r"><div class="mcard-label cr"><i class="ti ti-arrow-up-circle"></i> صادر</div><div class="mcard-val cr">${ar(totalOut)} ${_currency}</div><div class="mcard-sub">${filtered.filter(e=>e.type==='out').length} عملية</div></div>
    <div class="mcard ${net>=0?'g':'r'}"><div class="mcard-label ${net>=0?'cg':'cr'}"><i class="ti ti-scale"></i> صافي</div><div class="mcard-val ${net>=0?'cg':'cr'}">${net>=0?'+':''}${ar(net)} ${_currency}</div></div>
    <div class="mcard b"><div class="mcard-label cb"><i class="ti ti-calendar-repeat"></i> أقساط محصلة</div><div class="mcard-val cb">${ar(S.aqsat.reduce((s,c)=>{return s+(c.payments||[]).filter(p=>{const d=new Date((p.date||todayStr)+'T12:00');return d.getFullYear()===y&&(m===null||d.getMonth()+1===m);}).reduce((a,p)=>a+p.amt,0);},0))} ج</div></div>
  `);

  // monthly chart
  const mLabels=Array.from({length:12},(_,i)=>new Date(y,i,1).toLocaleDateString('ar-EG',{month:'short'}));
  const mIn=Array.from({length:12},(_,i)=>S.daily.filter(e=>{const d=new Date(e.date+'T12:00');return d.getFullYear()===y&&d.getMonth()===i&&e.type==='in';}).reduce((s,e)=>s+e.amt,0));
  const mOut=Array.from({length:12},(_,i)=>S.daily.filter(e=>{const d=new Date(e.date+'T12:00');return d.getFullYear()===y&&d.getMonth()===i&&e.type==='out';}).reduce((s,e)=>s+e.amt,0));
  buildChart('rep-monthly','bar',{labels:mLabels,datasets:[{label:'وارد',data:mIn,backgroundColor:'rgba(32,208,104,.7)',borderRadius:5},{label:'صادر',data:mOut,backgroundColor:'rgba(255,77,106,.7)',borderRadius:5}]});

  // source pie
  const srcIn={cash:0,insta:0,voda:0};
  filtered.filter(e=>e.type==='in').forEach(e=>{srcIn[e.source]=(srcIn[e.source]||0)+e.amt;});
  buildChart('rep-src','doughnut',{labels:['💵 كاش','📱 إنستا','📡 فودافون'],datasets:[{data:[srcIn.cash,srcIn.insta,srcIn.voda],backgroundColor:['rgba(32,208,104,.8)','rgba(176,127,255,.8)','rgba(0,212,200,.8)'],borderWidth:0,hoverOffset:8}]},{cutout:'65%'});

  // log
  const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  setHTML('rep-log-count',`${sorted.length} حركة`);
  renderAuditLog();
  setHTML('rep-tbody', sorted.length ? sorted.map((e,i)=>`<tr>
    <td style="color:var(--text3);font-size:11px">${i+1}</td>
    <td style="font-size:11px;color:var(--text3)">${fDate(e.date)}</td>
    <td style="font-weight:700">${e.name}</td>
    <td><span class="badge ${SRC_BADGE[e.source]}">${SRC_LABELS[e.source]}</span></td>
    <td><span class="badge ${e.type==='in'?'badge-g':'badge-r'}">${e.type==='in'?'وارد':'صادر'}</span></td>
    <td style="font-weight:800;color:${e.type==='in'?'var(--green)':'var(--red)'}">${e.type==='in'?'+':'-'}${ar(e.amt)} ${_currency}</td>
  </tr>`).join('') : `<tr><td colspan="6"><div class="empty"><i class="ti ti-inbox"></i><p>لا توجد حركات</p></div></td></tr>`);
}

function initRepFilters() {
  const yr=document.getElementById('rep-year');
  if(yr&&!yr.options.length){
    const now=new Date().getFullYear();
    for(let y=now;y>=now-3;y--){const o=document.createElement('option');o.value=y;o.textContent=y;yr.appendChild(o);}
    yr.value=now;
  }
  const mr=document.getElementById('rep-month');
  if(mr&&!mr.value) mr.value=String(new Date().getMonth()+1);
}

// ============================================================
// RECURRING PAGE
// ============================================================
function renderRecurring() {
  if(!S.recurring) S.recurring=[];
  const due=S.recurring.filter(recDue);
  const totalOut=S.recurring.filter(r=>r.active&&r.type==='out').reduce((s,r)=>s+r.amt,0);
  const totalIn=S.recurring.filter(r=>r.active&&r.type==='in').reduce((s,r)=>s+r.amt,0);

  setHTML('rec-metrics',`
    <div class="mcard t"><div class="mcard-label ct"><i class="ti ti-repeat"></i> البنود</div><div class="mcard-val ct">${S.recurring.length}</div><div class="mcard-sub">${S.recurring.filter(r=>r.active).length} نشط · ${due.length} مستحق</div></div>
    <div class="mcard r"><div class="mcard-label cr"><i class="ti ti-arrow-up-circle"></i> صادر دوري</div><div class="mcard-val cr">${ar(totalOut)} ${_currency}</div></div>
    <div class="mcard g"><div class="mcard-label cg"><i class="ti ti-arrow-down-circle"></i> وارد دوري</div><div class="mcard-val cg">${ar(totalIn)} ${_currency}</div></div>
  `);

  if(due.length){
    setHTML('rec-banner',`<div style="background:var(--abg);border:1px solid var(--aborder);border-radius:var(--r);padding:14px 18px;display:flex;align-items:center;gap:14px;margin-bottom:14px">
      <i class="ti ti-bell-ringing" style="font-size:24px;color:var(--amber);flex-shrink:0"></i>
      <div style="flex:1"><div style="font-weight:800;color:var(--amber);margin-bottom:4px">${due.length} بند مستحق اليوم</div>
      <div style="font-size:12px;color:var(--text2)">${due.map(r=>r.name).join(' · ')}</div></div>
      <button class="btn btn-primary btn-sm" onclick="recApplyAll()"><i class="ti ti-check"></i> تطبيق الكل</button>
    </div>`);
  } else { setHTML('rec-banner',''); }

  const freqL={daily:'يومي',weekly:'أسبوعي',monthly:'شهري'};
  const rows=S.recurring.map((r,i)=>`<tr style="${!r.active?'opacity:.5':''}">
    <td style="font-weight:700">${r.name}</td>
    <td style="font-weight:800;color:${r.type==='in'?'var(--green)':'var(--red)'}">${r.type==='in'?'+':'-'}${ar(r.amt)} ${_currency}</td>
    <td><span class="badge ${r.type==='in'?'badge-g':'badge-r'}">${r.type==='in'?'وارد':'صادر'}</span></td>
    <td><span class="badge badge-b">${freqL[r.freq]}</span></td>
    <td style="font-size:11px;color:var(--text3)">${r.lastApplied?fDate(r.lastApplied):'لم يُطبق'}</td>
    <td>${recDue(r)?'<span class="badge badge-a"><i class="ti ti-bell"></i> مستحق</span>':r.active?'<span class="badge badge-g">نشط</span>':'<span class="badge badge-x">متوقف</span>'}</td>
    <td style="display:flex;gap:4px">
      ${r.active?`<button class="btn btn-green btn-sm" onclick="recApply(${r.id})"><i class="ti ti-check"></i></button>`:''}
      <button class="icon-btn ${r.active?'':'edit'}" onclick="recToggle(${r.id})"><i class="ti ti-${r.active?'pause':'play'}"></i><span>${r.active?'إيقاف':'تفعيل'}</span></button>
      <button class="icon-btn" onclick="recDel(${r.id})"><i class="ti ti-trash"></i><span>حذف</span></button>
    </td>
  </tr>`).join('');
  setHTML('rec-tbody',rows||`<tr><td colspan="7"><div class="empty"><i class="ti ti-repeat-off"></i><p>لا توجد بنود</p></div></td></tr>`);
}

function recDue(r){
  if(!r.active) return false;
  if(!r.lastApplied) return true;
  const diff=Math.floor((new Date()-new Date(r.lastApplied+'T12:00'))/(864e5));
  return r.freq==='daily'?diff>=1:r.freq==='weekly'?diff>=7:diff>=28;
}

function addRec(){
  const name=val('rec-name'),amt=num('rec-amt'),type=val('rec-type')||'out',src=val('rec-src')||'cash',freq=val('rec-freq')||'monthly';
  if(!name||!amt){toast('اكتب البيان والمبلغ','error');return;}
  S.recurring.push({id:nid(),name,amt,type,src,freq,lastApplied:null,active:true});
  setVal('rec-name','');setVal('rec-amt','');
  renderAll();toast('✓ تم الإضافة');
}

function recApply(id){
  const r=S.recurring.find(x=>x.id===id);
  if(!r) return;
  S.daily.push({id:nid(),date:todayStr,name:r.name+' (متكرر)',source:r.src,type:r.type,amt:r.amt,note:'تطبيق تلقائي',affect:''});
  r.lastApplied=todayStr;
  renderAll();toast(`✓ تم تطبيق "${r.name}"`);
}

function recApplyAll(){S.recurring.filter(recDue).forEach(r=>recApply(r.id));}
function recToggle(id){const r=S.recurring.find(x=>x.id===id);if(r){r.active=!r.active;renderAll();}}
function recDel(id){confirm2('حذف البند؟','',()=>{S.recurring=S.recurring.filter(x=>x.id!==id);renderAll();toast('تم الحذف','warn');});}

// ============================================================
// CALCULATOR PAGE
// ============================================================
function renderCalc() {
  calcInst();
  calcCompare();
  calcObligations();
  // populate receipt client select
  const sel=document.getElementById('receipt-client');
  if(sel){
    const cur=sel.value;
    sel.innerHTML='<option value="">— اختر عميل —</option>'+S.aqsat.filter(c=>!aqDone(c)).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    if(cur) sel.value=cur;
  }
}

function calcInst(){
  const price=num('c-price'),down=num('c-down'),rate=num('c-rate')||30,months=num('c-months')||10;
  const el=document.getElementById('calc-inst-result');
  if(!el) return;
  if(!price){el.innerHTML='';return;}
  const base=Math.max(0,price-down);
  const interest=Math.round(base*rate/100);
  const gross=base+interest;
  const inst=Math.round(gross/months);
  el.innerHTML=`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:16px;display:grid;gap:8px">
    <div class="stat-line"><span class="c2">المبلغ بعد المقدم</span><b>${ar(base)} ${_currency}</b></div>
    <div class="stat-line"><span class="c2">الفايدة (${rate}%)</span><b class="ca">${ar(interest)} ${_currency}</b></div>
    <div class="stat-line"><span class="c2">الإجمالي</span><b class="cb">${ar(gross)} ${_currency}</b></div>
    <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid var(--accent);margin-top:4px">
      <span style="font-size:15px;font-weight:800">القسط الشهري</span>
      <span style="font-size:24px;font-weight:900;color:var(--teal)">${ar(inst)} ${_currency}</span>
    </div>
    <div style="text-align:center;font-size:11px;color:var(--text3)">ربح صافي: ${ar(interest)} ${_currency} على ${months} شهر</div>
  </div>`;
}

function calcCompare(){
  const amt=num('c-cmp-amt'),months=num('c-cmp-months')||10;
  const el=document.getElementById('calc-cmp-result');
  if(!el||!amt){if(el)el.innerHTML='';return;}
  const rates=[10,15,20,25,30,35,40];
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
    ${rates.map(r=>{
      const int=Math.round(amt*r/100),gross=amt+int,inst=Math.round(gross/months);
      return `<div style="background:var(--bg3);border:1px solid ${r===30?'var(--accent)':'var(--border)'};border-radius:var(--rsm);padding:12px;text-align:center;${r===30?'box-shadow:0 0 0 2px rgba(91,127,255,.25)':''}">
        <div style="font-size:10px;color:var(--text3);margin-bottom:4px">${r}% فايدة</div>
        <div style="font-size:17px;font-weight:900;color:var(--teal)">${ar(inst)} ${_currency}</div>
        <div style="font-size:10px;color:var(--amber);margin-top:2px">+${ar(int)} ${_currency}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function calcObligations(){
  const el=document.getElementById('calc-obligations');
  if(!el) return;
  const monthlyAq=S.aqsat.filter(c=>!aqDone(c)&&c.price>0).reduce((s,c)=>s+aqInst(c),0);
  const monthlyQr=S.qorod.filter(q=>q.status==='active').reduce((s,q)=>s+q.monthlyInt,0);
  const monthlyDy=S.doyon.filter(d=>d.status==='active').reduce((s,d)=>s+d.monthlyInt,0);
  const monthlyRec=(S.recurring||[]).filter(r=>r.active&&r.type==='out'&&r.freq==='monthly').reduce((s,r)=>s+r.amt,0);
  const totalObl=monthlyQr+monthlyDy+monthlyRec;
  const items=[
    {label:'أقساط متوقعة (وارد)',amt:monthlyAq,color:'var(--green)',icon:'ti-calendar-repeat'},
    {label:'فوايد قروض',amt:monthlyQr,color:'var(--red)',icon:'ti-coins'},
    {label:'فوايد ديون',amt:monthlyDy,color:'var(--amber)',icon:'ti-receipt'},
    {label:'مصاريف ثابتة',amt:monthlyRec,color:'var(--purple)',icon:'ti-repeat'},
  ];
  el.innerHTML=items.map(it=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--rsm);margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:34px;height:34px;background:${it.color}22;border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ${it.icon}" style="color:${it.color};font-size:16px"></i>
      </div>
      <span style="font-size:13px;font-weight:700">${it.label}</span>
    </div>
    <span style="font-size:18px;font-weight:900;color:${it.color}">${ar(it.amt)} ${_currency}</span>
  </div>`).join('')+
  `<div style="display:flex;justify-content:space-between;padding:14px 16px;background:var(--rbg);border:1px solid var(--rborder);border-radius:var(--rsm);margin-top:4px">
    <span style="font-size:14px;font-weight:800;color:var(--red)">إجمالي الالتزامات</span>
    <span style="font-size:20px;font-weight:900;color:var(--red)">${ar(totalObl)} ${_currency}</span>
  </div>
  <div style="display:flex;justify-content:space-between;padding:14px 16px;background:${monthlyAq>totalObl?'var(--gbg)':'var(--rbg)'};border:1px solid ${monthlyAq>totalObl?'var(--gborder)':'var(--rborder)'};border-radius:var(--rsm);margin-top:8px;font-size:13px;font-weight:700;color:${monthlyAq>totalObl?'var(--green)':'var(--red)'};text-align:center;justify-content:center">
    ${monthlyAq>totalObl?'✓ ممتاز! الوارد أكبر من الالتزامات بـ '+ar(monthlyAq-totalObl)+' '+_currency:'⚠ الالتزامات أكبر من الوارد بـ '+ar(totalObl-monthlyAq)+' '+_currency}
  </div>`;
}

function receiptPreview(){
  const id=parseInt(val('receipt-client')||0);
  const el=document.getElementById('receipt-preview');
  if(!el) return;
  if(!id){el.innerHTML='';return;}
  const c=S.aqsat.find(x=>x.id===id);
  if(!c){el.innerHTML='';return;}
  const inst=aqInst(c),rem=aqRem(c),paid=aqPaidCount(c),gross=aqGross(c);
  el.innerHTML=`<div class="receipt-box">
    <div class="receipt-hdr"><div style="font-size:20px;font-weight:900">🏪 نظام المحل</div><div style="font-size:11px;color:var(--text3)">${fDate(todayStr)}</div></div>
    <div class="receipt-row"><span class="c2">العميل</span><b>${c.name}</b></div>
    ${c.item?`<div class="receipt-row"><span class="c2">السلعة</span><b>${c.item}</b></div>`:''}
    ${c.price?`<div class="receipt-row"><span class="c2">القسط</span><b class="ct">${ar(inst)} ${_currency}</b></div>`:''}
    <div class="receipt-row"><span class="c2">المسدد</span><b>${paid} من ${c.months} شهر</b></div>
    <div class="receipt-total"><span>المتبقي</span><b style="color:${rem>0?'var(--red)':'var(--green)'}">${rem>0?ar(rem)+' '+_currency:'مكتمل ✓'}</b></div>
    <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text3)">شكراً لتعاملكم معنا 🙏</div>
  </div>`;
}

// ============================================================
// CLIENT DETAIL PAGE
// ============================================================
function openClientDetail(id) {
  const c = S.aqsat.find(x => x.id === id);
  if (!c) return;

  // Render the detail page
  renderClientDetail(c);

  // Navigate to it (without adding to PAGES array — handled manually)
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
  // Keep aqsat tab highlighted
  const aqIdx = PAGES.indexOf('pg-aqsat');
  const tabs = document.querySelectorAll('.ntab');
  if (tabs[aqIdx]) tabs[aqIdx].classList.add('active');
  document.getElementById('pg-aq-detail').classList.add('active');
}

function renderClientDetail(c) {
  const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c);
  const gross = aqGross(c), done = aqDone(c), late = aqLate(c);
  const pct = gross > 0 ? Math.round(paid * inst / gross * 100) : 0;
  const totalInt = aqTotalInt(c);
  // المتبقي من الأصل (المبلغ الممول قبل الفايدة)
  const principal   = c.price > 0 ? (c.price - c.down) : 0;          // الأصل الكلي
  const totalPaidAmt2 = (c.paid||[]).reduce((s,p)=>s+p,0);            // كل اللي اتدفع فعلاً
  const grossNoDown = gross - c.down;                                  // إجمالي الأقساط بدون مقدم
  // نسبة الأصل من إجمالي الأقساط عشان نحسب كم اتدفع من الأصل
  const principalRatio = grossNoDown > 0 ? principal / grossNoDown : 0;
  const principalPaid  = Math.min(principal, Math.round(totalPaidAmt2 * principalRatio));
  const principalRem   = Math.max(0, principal - principalPaid);
  const initials = c.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['linear-gradient(135deg,#5B7FFF,#3A5CE5)','linear-gradient(135deg,#00D4C8,#0891B2)','linear-gradient(135deg,#B07FFF,#7C3AED)','linear-gradient(135deg,#FFB020,#EA580C)','linear-gradient(135deg,#20D068,#059669)','linear-gradient(135deg,#FF4D6A,#BE123C)'];
  const col = colors[c.id % colors.length];
  const sColor = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--teal)';

  // ── تحليل سلوك الدفع ───────────────────────────────────────
  const payments = (c.payments || []).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const totalPaidAmt = (c.paid||[]).reduce((s,p) => s+p, 0);
  const onTimeCount  = payments.filter(p => p.type === 'full').length;
  const partialCount = payments.filter(p => p.type === 'partial').length;
  const payRate = paid > 0 ? Math.round(onTimeCount / Math.max(paid,1) * 100) : 0;
  const behaviorLabel = payRate >= 80 ? '⭐ ممتاز' : payRate >= 50 ? '👍 جيد' : paid === 0 ? '—' : '⚠️ يتأخر';
  const behaviorColor = payRate >= 80 ? 'var(--green)' : payRate >= 50 ? 'var(--amber)' : 'var(--red)';

  // ── تنبيه ذكي مخصص ────────────────────────────────────────
  const now = new Date();
  // Day-based slotNow for card
  const _csStartD = new Date(c.startDate || ((c.startMonth||'2024-01')+'-01'));
  const _csFirstD = new Date(_csStartD); _csFirstD.setMonth(_csFirstD.getMonth()+1);
  const now = new Date();
  var slotNow = 0; var _csDue = new Date(_csFirstD);
  while(_csDue <= now && slotNow < c.months){ slotNow++; _csDue.setMonth(_csDue.getMonth()+1); }
  const lateMonths = late ? Math.max(0, Math.min(slotNow, c.months-1) - paid + 1) : 0;

  let alertHTML = '';
  if (done) {
    alertHTML = `<div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <i class="ti ti-trophy" style="color:var(--green);font-size:22px;flex-shrink:0"></i>
      <div><div style="font-weight:800;color:var(--green)">🎉 تم السداد الكامل!</div>
      <div style="font-size:12px;color:var(--text3)">العميل سدّد كل الأقساط البالغة ${ar(gross)} ${_currency}</div></div>
    </div>`;
  } else if (late) {
    alertHTML = `<div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="ti ti-alert-triangle" style="color:var(--red);font-size:22px;flex-shrink:0"></i>
        <div><div style="font-weight:800;color:var(--red)">متأخر ${lateMonths} ${lateMonths===1?'شهر':'شهور'}</div>
        <div style="font-size:12px;color:var(--text3)">المبلغ المتأخر: ${ar(lateMonths * inst)} ${_currency}</div></div>
      </div>
      ${c.phone ? `<button class="wa-btn" onclick="waOpen(${c.id},'late')"><i class="ti ti-brand-whatsapp"></i> تذكير</button>` : ''}
    </div>`;
  } else {
    // النهارده مستحق؟
    const isDueToday = !aqSlotDone(c, slotNow) && slotNow < c.months;
    if (isDueToday) {
      alertHTML = `<div style="background:var(--abg);border:1px solid var(--aborder);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ti-clock" style="color:var(--amber);font-size:22px;flex-shrink:0"></i>
          <div><div style="font-weight:800;color:var(--amber)">قسط هذا الشهر مستحق</div>
          <div style="font-size:12px;color:var(--text3)">${ar(inst)} ${_currency} — الشهر ${slotNow+1}</div></div>
        </div>
        <button class="btn btn-sm" style="background:var(--abg);color:var(--amber);border:1px solid var(--aborder)" onclick="openSlotPayment(${c.id},${slotNow})">
          <i class="ti ti-arrow-down-circle"></i> تسديد
        </button>
      </div>`;
    }
  }

  // ── Progress bar ───────────────────────────────────────────
  const progressBar = `
    <div style="margin:16px 0 4px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3);margin-bottom:6px">
        <span>التقدم في السداد</span>
        <span style="font-weight:900;color:${sColor}">${pct}%</span>
      </div>
      <div style="background:var(--bg3);border-radius:40px;height:10px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:40px;transition:width .6s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:5px">
        <span>${paid} من ${c.months} شهر مسدد</span>
        <span>متبقي: <b style="color:${sColor}">${ar(rem)} ${_currency}</b></span>
      </div>
    </div>`;

  // ── Installment boxes ──────────────────────────────────────
  const instBoxes = c.price > 0 ? Array.from({length: c.months}, (_, i) => {
    // Day-based slotNow2
    var slotNow2=0; var _s2d=new Date(c.startDate||((c.startMonth||'2024-01')+'-01'));
    _s2d.setMonth(_s2d.getMonth()+1);
    while(_s2d<=now&&slotNow2<c.months){slotNow2++;_s2d.setMonth(_s2d.getMonth()+1);}
    const paidAmt  = aqPaidAmt(c, i);
    const instAmt  = aqInst(c);
    const full     = aqSlotDone(c, i);
    const partial  = paidAmt > 0 && !full;
    const overdue  = !full && i < _slotNow2;
    const current  = i === _slotNow2 && !full;
    const pctSlot  = instAmt > 0 ? Math.min(100, Math.round(paidAmt / instAmt * 100)) : 0;
    const label    = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthIdx = (sm - 1 + i) % 12;
    const yr       = sy + Math.floor((sm - 1 + i) / 12);
    const bgColor  = full?'var(--gbg)':partial?'var(--abg)':overdue?'var(--rbg)':current?'var(--bbg)':'var(--bg3)';
    const bdrColor = full?'var(--gborder)':partial?'var(--aborder)':overdue?'var(--rborder)':current?'var(--bborder)':'var(--border)';
    const txtColor = full?'var(--green)':partial?'var(--amber)':overdue?'var(--red)':current?'var(--blue)':'var(--text3)';
    const icon     = full?'check-circle':partial?'circle-half':overdue?'alert-circle':current?'clock':'circle';
    const amtLabel = partial ? ar(paidAmt)+'/'+ar(instAmt) : ar(instAmt)+' '+_currency;
    const pbar     = partial ? `<div style="position:absolute;bottom:0;left:0;width:${pctSlot}%;height:3px;background:var(--amber);border-radius:0"></div>` : '';
    return `<div class="inst-box" onclick="openSlotPayment(${c.id},${i})"
      style="background:${bgColor};border:1.5px solid ${bdrColor};position:relative;overflow:hidden;cursor:pointer;min-width:72px;flex:1">
      ${pbar}
      <i class="ti ti-${icon}" style="font-size:18px;color:${txtColor}"></i>
      <span style="font-size:10px;font-weight:700;color:${txtColor}">${label[monthIdx]}</span>
      <span style="font-size:9px;color:var(--text3)">${yr}</span>
      <span style="font-size:10px;font-weight:800;color:${txtColor}">${amtLabel}</span>
    </div>`;
  }).join('') : '';

  // ── Payment history ────────────────────────────────────────
  const srcLabels = { cash: '💵 كاش', insta: '📱 إنستا', voda: '📡 فودافون' };
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const payHistory = payments.length ? payments.map((p, idx, arr) => {
    const mi = (sm - 1 + (p.slot||0)) % 12;
    const yr2 = sy + Math.floor((sm - 1 + (p.slot||0)) / 12);
    const slotLabel = p.slot !== undefined ? `شهر ${p.slot+1} · ${monthNames[mi]} ${yr2}` : 'دفعة';
    const isFirst = idx === 0;
    return `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:${idx<arr.length-1?'1px solid var(--border)':'none'}${isFirst?';background:var(--gbg)22;margin:-1px -2px;padding:12px;border-radius:10px;border:1px solid var(--gborder)22':''}">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--gbg);display:flex;align-items:center;justify-content:center;color:var(--green);font-size:15px;border:1.5px solid var(--gborder)">
          <i class="ti ti-cash"></i>
        </div>
        ${idx < arr.length-1 ? `<div style="width:1px;flex:1;min-height:12px;background:var(--border);margin-top:4px"></div>` : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
          <span style="font-weight:800;font-size:14px;color:var(--green)">+${ar(p.amt)} ${_currency}</span>
          ${p.type==='full'?'<span style="font-size:10px;background:var(--gbg);color:var(--green);padding:1px 7px;border-radius:20px;border:1px solid var(--gborder)">كامل</span>':p.type==='partial'?'<span style="font-size:10px;background:var(--abg);color:var(--amber);padding:1px 7px;border-radius:20px;border:1px solid var(--aborder)">جزئي</span>':''}
          ${isFirst?'<span style="font-size:10px;background:var(--bbg);color:var(--blue);padding:1px 7px;border-radius:20px;border:1px solid var(--bborder)">الأخيرة</span>':''}
        </div>
        <div style="font-size:12px;color:var(--text3)">${slotLabel}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">
          <i class="ti ti-calendar" style="font-size:10px"></i> ${fDate(p.date||todayStr)}
          ${p.src?' · '+(srcLabels[p.src]||p.src):''}
          ${p.note?` · ${p.note}`:''}
        </div>
      </div>
      <button onclick="deleteSlotPayment(${c.id},${p.slot||0},${(c.payments||[]).filter(x=>x.slot===(p.slot||0)).indexOf(p)})"
        style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px;border-radius:6px;font-size:14px;flex-shrink:0"
        onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'" title="حذف">
        <i class="ti ti-trash"></i>
      </button>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:30px 0;color:var(--text3)"><i class="ti ti-inbox" style="font-size:36px;display:block;margin-bottom:8px"></i>لا توجد مدفوعات</div>`;

  // ── Notes section ──────────────────────────────────────────
  const notes = c.clientNotes || '';

  const el = document.getElementById('pg-aq-detail');
  el.innerHTML = `
  <!-- Header -->
  <div class="page-header">
    <button class="btn btn-ghost btn-sm" onclick="nav('pg-aqsat')">
      <i class="ti ti-arrow-right"></i> رجوع
    </button>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${c.phone ? `<button class="wa-btn" style="padding:6px 12px;font-size:12px" onclick="waOpen(${c.id},'${late?'late':'due'}')"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="openEditAq(${c.id});nav('pg-aqsat')"><i class="ti ti-edit"></i></button>
      <button class="btn btn-sm" style="background:var(--abg);color:var(--amber);border:1px solid var(--aborder);font-size:12px" onclick="printReceipt(${c.id})"><i class="ti ti-printer"></i> إيصال</button>
      <button class="btn btn-sm" style="background:rgba(224,92,42,.12);color:#e05c2a;border:1px solid rgba(224,92,42,.3);font-size:12px" onclick="exportClientPDF(${c.id})"><i class="ti ti-file-type-pdf"></i> PDF</button>
    </div>
  </div>

  ${alertHTML}

  <!-- Hero -->
  <div class="card" style="margin-bottom:16px;border-right:4px solid ${sColor}">
    <div style="display:flex;align-items:center;gap:16px">
      <div style="width:64px;height:64px;border-radius:18px;background:${col};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.25)">
        ${initials}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:20px;font-weight:900;margin-bottom:4px">${c.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${done?'<span class="badge badge-g"><i class="ti ti-check"></i> مكتمل</span>':late?'<span class="badge badge-r"><i class="ti ti-clock"></i> متأخر</span>':'<span class="badge badge-b"><i class="ti ti-loader"></i> نشط</span>'}
          <span style="font-size:12px;color:var(--text3)"><i class="ti ti-package" style="font-size:11px"></i> ${c.item||'—'}</span>
          ${c.phone?`<a href="tel:${c.phone}" style="font-size:12px;color:var(--blue);text-decoration:none"><i class="ti ti-phone" style="font-size:11px"></i> ${c.phone}</a>`:''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">تاريخ الشراء: ${c.startDate||c.startMonth||'—'} · ${c.months} شهر</div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div style="font-size:10px;color:var(--text3)">سلوك الدفع</div>
        <div style="font-size:16px;font-weight:900;color:${behaviorColor}">${behaviorLabel}</div>
        <div style="font-size:10px;color:var(--text3)">${payRate}% في الموعد</div>
      </div>
    </div>
    ${progressBar}
  </div>

  <!-- KPIs -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:16px">
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label ct"><i class="ti ti-cash"></i> القسط</div>
      <div class="mcard-val ct">${ar(inst)} ${_currency}</div>
      <div class="mcard-sub">شهرياً</div>
    </div>
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label" style="color:${sColor}"><i class="ti ti-wallet"></i> المتبقي</div>
      <div class="mcard-val" style="color:${sColor}">${done?'✓':ar(rem)+' '+_currency}</div>
      <div class="mcard-sub">${paid}/${c.months} شهر</div>
    </div>
    ${c.price > 0 ? `<div class="mcard" style="background:var(--bg2);border-color:var(--pborder)">
      <div class="mcard-label cp"><i class="ti ti-building-bank"></i> باقي الأصل</div>
      <div class="mcard-val cp">${done?'✓':ar(principalRem)+' '+_currency}</div>
      <div class="mcard-sub">من ${ar(principal)} ${_currency} أصل</div>
    </div>` : ''}
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label ca"><i class="ti ti-percentage"></i> الفايدة</div>
      <div class="mcard-val ca">${ar(totalInt)} ${_currency}</div>
      <div class="mcard-sub">${c.rate}%</div>
    </div>
    <div class="mcard" style="background:var(--bg2)">
      <div class="mcard-label cb"><i class="ti ti-report-money"></i> الإجمالي</div>
      <div class="mcard-val cb">${ar(gross)} ${_currency}</div>
      <div class="mcard-sub">بالفايدة</div>
    </div>
  </div>

  <!-- Main grid -->
  <div class="grid2" style="margin-bottom:14px">

    <!-- التفاصيل المالية -->
    <div class="card">
      <div class="card-title"><i class="ti ti-report-money" style="color:var(--accent)"></i> التفاصيل المالية</div>
      ${c.price > 0 ? `
      <div class="stat-line"><span class="c2">السعر</span><b>${ar(c.price)} ${_currency}</b></div>
      <div class="stat-line"><span class="c2">المقدم</span><b>${ar(c.down)} ${_currency}</b></div>
      <div class="stat-line"><span class="c2">الممول</span><b>${ar(c.price-c.down)} ${_currency}</b></div>
      <div class="stat-line"><span class="c2">الفايدة</span><b class="ca">${c.rate}%  ·  ${ar(totalInt)} ${_currency}</b></div>
      <div class="stat-line"><span class="c2">الإجمالي</span><b class="cb">${ar(gross)} ${_currency}</b></div>
      <div class="stat-line" style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">
        <span class="c2">محصّل لحد الآن</span>
        <b style="color:var(--green);font-size:15px">${ar(totalPaidAmt)} ${_currency}</b>
      </div>
      <div class="stat-line"><span class="c2">متبقي (بالفايدة)</span><b style="color:${sColor}">${ar(rem)} ${_currency}</b></div>
      <div class="stat-line" style="background:var(--pbg);border:1px solid var(--pborder);border-radius:8px;padding:8px 10px;margin-top:6px">
        <span style="color:var(--purple);font-weight:700"><i class="ti ti-building-bank" style="font-size:13px"></i> باقي الأصل</span>
        <b style="color:var(--purple);font-size:15px">${done ? '✓ مسدد' : ar(principalRem) + ' ' + _currency}</b>
      </div>
      ` : `<div class="today-empty">${c.note||'—'}</div>`}
    </div>

    <!-- ملاحظات العميل -->
    <div class="card">
      <div class="card-title"><i class="ti ti-notes" style="color:var(--purple)"></i> ملاحظات خاصة</div>
      <textarea id="client-notes-${c.id}"
        style="width:100%;min-height:120px;resize:vertical;background:var(--bg3);color:var(--text);border:1.5px solid var(--border);border-radius:var(--rsm);padding:10px;font-family:'Cairo',sans-serif;font-size:13px;line-height:1.8;direction:rtl"
        placeholder="مثال: بيدفع في أول الشهر · عنده جهاز تاني عندي · يتصل به على موبايل التاني..."
        oninput="saveClientNote(${c.id})">${notes}</textarea>
      <div style="font-size:11px;color:var(--text3);margin-top:6px;display:flex;align-items:center;gap:6px">
        <i class="ti ti-device-floppy" style="color:var(--green)"></i>
        بتتحفظ تلقائياً
      </div>

      <!-- إحصائيات سلوك الدفع -->
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:11px;font-weight:800;color:var(--text3);margin-bottom:10px">📊 سلوك الدفع</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:var(--gbg);border:1px solid var(--gborder);border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:18px;font-weight:900;color:var(--green)">${onTimeCount}</div>
            <div style="font-size:10px;color:var(--text3)">قسط كامل</div>
          </div>
          <div style="background:var(--abg);border:1px solid var(--aborder);border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:18px;font-weight:900;color:var(--amber)">${partialCount}</div>
            <div style="font-size:10px;color:var(--text3)">دفع جزئي</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:18px;font-weight:900;color:${behaviorColor}">${payRate}%</div>
            <div style="font-size:10px;color:var(--text3)">في الموعد</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:18px;font-weight:900;color:var(--text)">${payments.length}</div>
            <div style="font-size:10px;color:var(--text3)">إجمالي دفعات</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- سجل المدفوعات -->
  <div class="card" style="margin-bottom:14px">
    <div class="card-title">
      <i class="ti ti-history" style="color:var(--green)"></i> سجل المدفوعات
      <span style="background:var(--bg3);color:var(--text3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;margin-right:auto">${payments.length} دفعة</span>
    </div>
    ${payHistory}
  </div>

  <!-- جدول الأقساط -->
  ${c.price > 0 ? `
  <div class="card">
    <div class="card-title">
      <i class="ti ti-calendar-repeat" style="color:var(--teal)"></i> جدول الأقساط
      <div style="margin-right:auto;display:flex;gap:8px;font-size:11px;flex-wrap:wrap">
        <span style="color:var(--green)"><i class="ti ti-check-circle"></i> مسدد (${paid})</span>
        <span style="color:var(--red)"><i class="ti ti-alert-circle"></i> متأخر</span>
        <span style="color:var(--blue)"><i class="ti ti-clock"></i> الحالي</span>
        <span style="color:var(--text3)"><i class="ti ti-circle"></i> قادم</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px">
      ${instBoxes}
    </div>
  </div>` : ''}
  `;
}

function saveClientNote(id) {
  const c = S.aqsat.find(x => x.id === id);
  if (!c) return;
  const el = document.getElementById('client-notes-' + id);
  if (el) {
    c.clientNotes = el.value;
    saveData();
  }
}

function togglePaidDetail(cId, slot) {
  openSlotPayment(cId, slot);
}

function _togglePaidDetailLegacy(cId, slot) {
  const c = S.aqsat.find(x => x.id === cId);
  if (!c) return;
  const wasPaid = aqPaidAmt(c, slot);
  c.paid[slot] = wasPaid ? 0 : aqInst(c);

  if (c.paid[slot]) {
    const inst = aqInst(c);
    c.payments = c.payments || [];
    c.payments.push({ date: todayStr, amt: inst, type: 'installment' });
    // أضف للاليومية تلقائياً
    S.daily.push({
      id: nid(), date: todayStr,
      name: 'قسط ' + (slot+1) + ': ' + c.name,
      source: 'cash', type: 'in',
      amt: inst, note: c.item || 'أقساط', affect: 'aqsat'
    });
    renderClientDetail(c);
    saveData();
    toast('✓ تم تسجيل القسط وإضافته لليومية كاش', 'success');
  } else {
    renderClientDetail(c);
    saveData();
    toast('تم إلغاء القسط', 'warn');
  }
}

function _buildSlotOptions(c) {
  const mNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const [sy, sm] = ((c.startDate||c.startMonth||'2024-01').slice(0,7)).split('-').map(Number);
  return Array.from({length: c.months}, (_, i) => {
    const mi   = (sm - 1 + i) % 12;
    const yr2  = sy + Math.floor((sm - 1 + i) / 12);
    const paid = aqPaidAmt(c, i);
    const full = aqSlotDone(c, i);
    const tag  = full ? ' ✓' : paid > 0 ? ' (جزئي)' : '';
    return `<option value="${i}"${full ? ' disabled' : ''}>شهر ${i+1} · ${mNames[mi]} ${yr2}${tag}</option>`;
  }).join('');
}

function addManualPayment(cId) {
  const sel = document.getElementById('manual-pay-slot-' + cId);
  if (!sel) return;
  const slot = parseInt(sel.value);
  openSlotPayment(cId, slot);
}

