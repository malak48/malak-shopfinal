// ============================================================
// GLOBAL SEARCH
// ============================================================
function openSearch() {
  const overlay = document.getElementById('search-overlay');
  overlay.style.display = 'flex';
  setTimeout(() => {
    const inp = document.getElementById('global-search-input');
    inp.value = '';
    inp.focus();
    setHTML('search-results', '');
    setHTML('search-hint', 'اكتب للبحث · <kbd style="background:var(--bg3);border:1px solid var(--border);padding:2px 7px;border-radius:4px;font-size:11px">Esc</kbd> للإغلاق');
  }, 50);
}

function closeSearch() {
  document.getElementById('search-overlay').style.display = 'none';
}

function globalSearch(q) {
  q = (q || '').trim();
  const res = document.getElementById('search-results');
  const hint = document.getElementById('search-hint');

  if (!q || q.length < 2) {
    setHTML('search-results', '');
    if (hint) hint.style.display = '';
    return;
  }
  if (hint) hint.style.display = 'none';

  const ql = q.toLowerCase();
  const results = [];

  // ── Search Aqsat ──────────────────────────────────────────
  S.aqsat.forEach(c => {
    const match =
      c.name.toLowerCase().includes(ql) ||
      (c.phone || '').includes(q) ||
      (c.item || '').toLowerCase().includes(ql) ||
      String(aqInst(c)).includes(q) ||
      String(aqRem(c)).includes(q) ||
      (c.note || '').toLowerCase().includes(ql);
    if (!match) return;

    const inst = aqInst(c), rem = aqRem(c);
    const done = aqDone(c), late = aqLate(c);
    const initials = c.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2);
    const statusColor = done ? 'var(--green)' : late ? 'var(--red)' : 'var(--blue)';
    const statusLabel = done ? 'مكتمل' : late ? 'متأخر' : 'نشط';

    results.push({
      section: 'aqsat',
      priority: c.name.toLowerCase().startsWith(ql) ? 0 : 1,
      html: `<div class="search-result-item" onclick="closeSearch();openClientProfile(this.dataset.n)" data-n="${c.name}">
        <div class="search-res-icon" style="background:linear-gradient(135deg,var(--teal),var(--blue))">
          <span style="font-size:12px;font-weight:900;color:#fff">${initials}</span>
        </div>
        <div class="search-res-body">
          <div class="search-res-title">${hlSearch(c.name, q)}
            <span class="badge" style="font-size:9px;background:${statusColor}22;color:${statusColor};border-color:${statusColor}44;margin-right:6px">${statusLabel}</span>
          </div>
          <div class="search-res-sub">${c.item ? hlSearch(c.item, q) + ' · ' : ''}${c.phone ? '📞 ' + hlSearch(c.phone, q) + ' · ' : ''}قسط: ${ar(inst)} ${_currency} · متبقي: ${ar(rem)} ${_currency}</div>
        </div>
        <div class="search-res-tag"><i class="ti ti-calendar-repeat"></i> أقساط</div>
      </div>`,
    });
  });

  // ── Search Daily ──────────────────────────────────────────
  const dailyMatches = S.daily.filter(e =>
    e.name.toLowerCase().includes(ql) ||
    String(e.amt).includes(q) ||
    (e.note || '').toLowerCase().includes(ql) ||
    e.date.includes(q)
  ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  dailyMatches.forEach(e => {
    results.push({
      section: 'daily',
      priority: 2,
      html: `<div class="search-result-item" onclick="closeSearch();nav('pg-daily');setVal('d-date','${e.date}');renderAll()">
        <div class="search-res-icon" style="background:${e.type === 'in' ? 'var(--gbg)' : 'var(--rbg)'}">
          <i class="ti ti-arrow-${e.type === 'in' ? 'down' : 'up'}-circle" style="font-size:18px;color:${e.type === 'in' ? 'var(--green)' : 'var(--red)'}"></i>
        </div>
        <div class="search-res-body">
          <div class="search-res-title">${hlSearch(e.name, q)}</div>
          <div class="search-res-sub">${fDate(e.date)} · ${SRC_LABELS[e.source]}${e.note ? ' · ' + e.note : ''}</div>
        </div>
        <div class="search-res-amt" style="color:${e.type === 'in' ? 'var(--green)' : 'var(--red)'}">
          ${e.type === 'in' ? '+' : '-'}${ar(e.amt)} ${_currency}
        </div>
      </div>`,
    });
  });

  // ── Search Bore ───────────────────────────────────────────
  S.bore.filter(b =>
    b.name.toLowerCase().includes(ql) ||
    String(b.amt).includes(q) ||
    (b.note || '').toLowerCase().includes(ql) ||
    (b.cat || '').toLowerCase().includes(ql)
  ).forEach(b => {
    results.push({
      section: 'bore',
      priority: 3,
      html: `<div class="search-result-item" onclick="closeSearch();openClientProfile(this.dataset.n)" data-n="${b.name}">
        <div class="search-res-icon" style="background:var(--bbg)">
          <i class="ti ti-arrow-up-circle" style="font-size:18px;color:var(--blue)"></i>
        </div>
        <div class="search-res-body">
          <div class="search-res-title">${hlSearch(b.name, q)}</div>
          <div class="search-res-sub">${b.cat}${b.note ? ' · ' + b.note : ''} · ${fDate(b.date)}</div>
        </div>
        <div class="search-res-amt" style="color:var(--blue)">${ar(b.amt)} ${_currency}</div>
      </div>`,
    });
  });

  // ── Search Qorod ──────────────────────────────────────────
  S.qorod.filter(q2 =>
    q2.name.toLowerCase().includes(ql) ||
    String(q2.remaining).includes(q) ||
    (q2.note || '').toLowerCase().includes(ql)
  ).forEach(q2 => {
    results.push({
      section: 'qorod',
      priority: 3,
      html: `<div class="search-result-item" onclick="closeSearch();openClientProfile(this.dataset.n)" data-n="${q2.name}">
        <div class="search-res-icon" style="background:var(--rbg)">
          <i class="ti ti-coins" style="font-size:18px;color:var(--red)"></i>
        </div>
        <div class="search-res-body">
          <div class="search-res-title">${hlSearch(q2.name, q)}</div>
          <div class="search-res-sub">متبقي: ${ar(q2.remaining)} ${_currency} · فايدة/شهر: ${ar(q2.monthlyInt)} ${_currency}${q2.note ? ' · ' + q2.note : ''}</div>
        </div>
        <div class="search-res-tag"><i class="ti ti-coins"></i> قروض</div>
      </div>`,
    });
  });

  // ── Search Doyon ──────────────────────────────────────────
  S.doyon.filter(d =>
    d.name.toLowerCase().includes(ql) ||
    String(d.remaining).includes(q) ||
    (d.note || '').toLowerCase().includes(ql)
  ).forEach(d => {
    results.push({
      section: 'doyon',
      priority: 3,
      html: `<div class="search-result-item" onclick="closeSearch();openClientProfile(this.dataset.n)" data-n="${d.name}">
        <div class="search-res-icon" style="background:var(--abg)">
          <i class="ti ti-receipt" style="font-size:18px;color:var(--amber)"></i>
        </div>
        <div class="search-res-body">
          <div class="search-res-title">${hlSearch(d.name, q)}</div>
          <div class="search-res-sub">متبقي: ${ar(d.remaining)} ${_currency} · فايدة/شهر: ${ar(d.monthlyInt)} ${_currency}${d.note ? ' · ' + d.note : ''}</div>
        </div>
        <div class="search-res-tag"><i class="ti ti-receipt"></i> ديون</div>
      </div>`,
    });
  });

  // ── Render ────────────────────────────────────────────────
  if (!results.length) {
    res.innerHTML = `<div class="empty" style="padding:40px">
      <i class="ti ti-search-off"></i>
      <p>مفيش نتايج لـ "${q}"</p>
    </div>`;
    return;
  }

  results.sort((a, b) => a.priority - b.priority);

  // Group by section
  const sections = {
    aqsat: { label: 'الأقساط', icon: 'ti-calendar-repeat', color: 'var(--teal)' },
    daily: { label: 'اليومية', icon: 'ti-file-invoice',    color: 'var(--green)' },
    bore:  { label: 'فلوس بره',icon: 'ti-arrow-up-circle', color: 'var(--blue)'  },
    qorod: { label: 'قروض',    icon: 'ti-coins',            color: 'var(--red)'   },
    doyon: { label: 'ديون',    icon: 'ti-receipt',          color: 'var(--amber)' },
  };

  let html2 = '';
  let lastSection = null;
  results.forEach(r => {
    if (r.section !== lastSection) {
      const s = sections[r.section];
      html2 += `<div style="padding:10px 16px 6px;font-size:11px;font-weight:800;color:${s.color};text-transform:uppercase;letter-spacing:.6px;border-top:${lastSection ? '1px solid var(--border)' : 'none'}">
        <i class="ti ${s.icon}" style="margin-left:5px"></i>${s.label}
      </div>`;
      lastSection = r.section;
    }
    html2 += r.html;
  });

  html2 += `<div style="text-align:center;padding:10px;font-size:11px;color:var(--text3)">${results.length} نتيجة</div>`;
  res.innerHTML = html2;
}

function hlSearch(text, q) {
  if (!q || !text) return text || '';
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return String(text).replace(re, m => `<mark style="background:rgba(91,127,255,.35);color:var(--text);border-radius:3px;padding:0 2px">${m}</mark>`);
}

// ── Search keyboard shortcut ──────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    const so = document.getElementById('search-overlay');
    if (so && so.style.display !== 'none') closeSearch();
  }
});

// ============================================================
// EXCEL EXPORT
// ============================================================
function xlsxEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // escape XML special chars
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildXlsx(sheetName, headers, rows) {
  // Build a simple SpreadsheetML (XML-based) xlsx-compatible file
  const cols = headers.length;
  const colLetters = Array.from({length: cols}, (_, i) => String.fromCharCode(65 + i));

  const headerRow = colLetters.map((col, i) =>
    `<c r="${col}1" t="inlineStr" s="1"><is><t>${xlsxEscape(headers[i])}</t></is></c>`
  ).join('');

  const dataRows = rows.map((row, ri) => {
    const cells = colLetters.map((col, ci) => {
      const v = row[ci];
      const num = typeof v === 'number' || (typeof v === 'string' && !isNaN(v) && v !== '');
      if (num) return `<c r="${col}${ri+2}"><v>${v}</v></c>`;
      return `<c r="${col}${ri+2}" t="inlineStr"><is><t>${xlsxEscape(v)}</t></is></c>`;
    }).join('');
    return `<row r="${ri+2}">${cells}</row>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xlsxEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${headerRow}</row>
    ${dataRows}
  </sheetData>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts><font><b/><sz val="11"/></font><font><sz val="11"/></font></fonts>
  <fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const pkgRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  return { xml, sheet, styles, rels, contentTypes, pkgRels };
}

function downloadXlsx(filename, sheetName, headers, rows) {
  const parts = buildXlsx(sheetName, headers, rows);

  // Use a simple CSV-to-XLSX approach via data URI with tab-separated values
  // This produces a true .xlsx using SpreadsheetML embedded in a zip
  // Since we can't use JSZip here, we'll create an .xlsx via the XML directly
  // and save as .xls (SpreadsheetML) which Excel opens natively

  const tableXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Size="11"/>
      <Interior ss:Color="#1E2B45" ss:Pattern="Solid"/>
      <Font ss:Color="#EDF2FF" ss:Bold="1"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="In">
      <Font ss:Color="#20D068" ss:Bold="1"/>
    </Style>
    <Style ss:ID="Out">
      <Font ss:Color="#FF4D6A" ss:Bold="1"/>
    </Style>
    <Style ss:ID="Late">
      <Font ss:Color="#FF4D6A"/>
    </Style>
    <Style ss:ID="Done">
      <Font ss:Color="#20D068"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${xlsxEscape(sheetName)}">
    <Table>
      ${headers.map(h => `<Column ss:AutoFitWidth="1" ss:Width="120"/>`).join('')}
      <Row>
        ${headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xlsxEscape(h)}</Data></Cell>`).join('')}
      </Row>
      ${rows.map(row =>
        `<Row>${row.map((cell, ci) => {
          const v = cell === null || cell === undefined ? '' : cell;
          const isNum = typeof v === 'number';
          const style = row._style ? ` ss:StyleID="${row._style}"` : '';
          return `<Cell${style}><Data ss:Type="${isNum ? 'Number' : 'String'}">${xlsxEscape(v)}</Data></Cell>`;
        }).join('')}</Row>`
      ).join('')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob(['\uFEFF' + tableXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportDailyExcel() {
  const dateEl = document.getElementById('d-date');
  const date   = dateEl ? dateEl.value || todayStr : todayStr;
  const src    = val('d-src') || 'all';
  const entries = S.daily
    .filter(e => e.date === date && (src === 'all' || e.source === src))
    .sort((a, b) => a.id - b.id);

  if (!entries.length) { toast('مفيش بيانات للتصدير', 'warn'); return; }

  // Calculate opening balance
  const srcList = src === 'all' ? ['cash','insta','voda'] : [src];
  const prevDayEntries = S.daily.filter(e => e.date < date);
  let runBal = srcList.reduce((total, s) => {
    const base = S.prevBalances[s] || 0;
    const prevIn  = prevDayEntries.filter(e=>e.source===s&&e.type==='in').reduce((a,e)=>a+e.amt,0);
    const prevOut = prevDayEntries.filter(e=>e.source===s&&e.type==='out').reduce((a,e)=>a+e.amt,0);
    return total + base + prevIn - prevOut;
  }, 0);

  const headers = ['#', 'البيان', 'المصدر', 'النوع', 'المبلغ (ج)', 'الرصيد (ج)', 'ملاحظة'];

  const rows = [];
  // Opening row
  const openRow = ['—', 'رصيد افتتاحي', '—', '—', '', runBal, ''];
  openRow._style = 'Done';
  rows.push(openRow);

  entries.forEach((e, i) => {
    runBal += e.type === 'in' ? e.amt : -e.amt;
    const srcLabel = { cash:'كاش', insta:'إنستا', voda:'فودافون' }[e.source] || e.source;
    const row = [
      i + 1,
      e.name,
      srcLabel,
      e.type === 'in' ? 'وارد' : 'صادر',
      e.type === 'in' ? e.amt : -e.amt,
      runBal,
      e.note || '',
    ];
    row._style = e.type === 'in' ? 'In' : 'Out';
    rows.push(row);
  });

  const closeRow = ['—', 'رصيد ختامي', '—', '—', '', runBal, ''];
  closeRow._style = runBal >= 0 ? 'Done' : 'Late';
  rows.push(closeRow);

  downloadXlsx(`يومية_${date}.xls`, `يومية ${fDate(date)}`, headers, rows);
  toast('✓ تم تصدير اليومية');
}

function exportAqsatExcel() {
  if (!S.aqsat.length) { toast('مفيش بيانات للتصدير', 'warn'); return; }

  const headers = [
    '#', 'اسم العميل', 'التليفون', 'السلعة',
    'السعر (ج)', 'المقدم (ج)', 'الفايدة %', 'الإجمالي (ج)',
    'القسط (ج)', 'عدد الأشهر', 'المسدد', 'المتبقي (ج)',
    'الحالة', 'شهر البداية', 'ملاحظة'
  ];

  const rows = S.aqsat.map((c, i) => {
    const inst = aqInst(c), rem = aqRem(c), paid = aqPaidCount(c), gross = aqGross(c);
    const done = aqDone(c), late = aqLate(c);
    const status = done ? 'مكتمل' : late ? 'متأخر' : 'نشط';
    const row = [
      i + 1,
      c.name,
      c.phone || '',
      c.item || '',
      c.price || '',
      c.down || '',
      c.rate || '',
      gross || '',
      inst || '',
      c.months,
      paid,
      rem,
      status,
      c.startMonth || '',
      c.note || '',
    ];
    row._style = done ? 'Done' : late ? 'Late' : '';
    return row;
  });

  // Summary footer
  const totalRem  = S.aqsat.reduce((s,c) => s + aqRem(c), 0);
  const monthDue  = S.aqsat.filter(c=>!aqDone(c)&&c.price>0).reduce((s,c) => s + aqInst(c), 0);
  const lateCount = S.aqsat.filter(aqLate).length;
  rows.push([]);
  const sumRow = ['', 'الإجمالي', '', '', '', '', '', '', '', '', '', totalRem, `متأخر: ${lateCount}`, '', `شهري: ${monthDue} ج`];
  sumRow._style = 'Header';
  rows.push(sumRow);

  downloadXlsx(`أقساط_${todayStr}.xls`, 'الأقساط', headers, rows);
  toast('✓ تم تصدير الأقساط');
}

// ============================================================
// BACKUP SYSTEM
// ============================================================
const BACKUP_KEY      = 'malak_backup_meta_v1';
const BACKUP_HIST_KEY = 'malak_backup_hist_v1';

function getBackupMeta() {
  try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}'); }
  catch { return {}; }
}
function saveBackupMeta(meta) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(meta));
}

function getBackupHistory() {
  try { return JSON.parse(localStorage.getItem(BACKUP_HIST_KEY) || '[]'); }
  catch { return []; }
}

function recordBackupDone() {
  const now = new Date().toISOString();
  const meta = getBackupMeta();
  meta.lastBackup = now;
  meta.intervalDays = meta.intervalDays ?? 7;
  saveBackupMeta(meta);

  // save history (keep last 10)
  const hist = getBackupHistory();
  hist.unshift(now);
  localStorage.setItem(BACKUP_HIST_KEY, JSON.stringify(hist.slice(0, 10)));
}

// ============================================================
// GOOGLE SHEETS SYNC
// ============================================================
const SHEETS_URL_KEY   = 'malak_sheets_url_v1';
const SHEETS_META_KEY  = 'malak_sheets_meta_v1';
const AUTO_SYNC_KEY    = 'malak_auto_sync_v1';
let _syncInProgress    = false;
let _autoSyncTimer     = null;

function getSheetsUrl()  { return localStorage.getItem(SHEETS_URL_KEY) || ''; }
function getSheetsMeta() { try { return JSON.parse(localStorage.getItem(SHEETS_META_KEY)||'{}'); } catch { return {}; } }
function saveSheetsMeta(m) { localStorage.setItem(SHEETS_META_KEY, JSON.stringify(m)); }
function isAutoSync()    { return localStorage.getItem(AUTO_SYNC_KEY) === '1'; }

function validateSheetsUrl(url) {
  const btn = document.querySelector('[onclick="saveSheetsUrl()"]');
  if (!btn) return;
  const valid = url.includes('script.google.com/macros/s/');
  btn.style.opacity = valid ? '1' : '0.4';
}

function saveSheetsUrl() {
  const url = (document.getElementById('sheets-url-input')?.value || '').trim();
  if (!url.includes('script.google.com/macros/s/')) {
    toast('رابط غير صحيح — لازم يكون من Google Apps Script', 'error'); return;
  }
  localStorage.setItem(SHEETS_URL_KEY, url);
  refreshSheetsUI();
  toast('✓ تم حفظ الرابط');
}

function clearSheetsUrl() {
  confirm2('فصل Google Sheets؟', 'هتوقف المزامنة التلقائية', () => {
    localStorage.removeItem(SHEETS_URL_KEY);
    localStorage.removeItem(AUTO_SYNC_KEY);
    refreshSheetsUI();
    toast('تم الفصل', 'warn');
  });
}

function toggleAutoSync(on) {
  localStorage.setItem(AUTO_SYNC_KEY, on ? '1' : '0');
  if (on) { toast('✓ المزامنة التلقائية شغّالة'); scheduleAutoSync(); }
  else    { clearTimeout(_autoSyncTimer); toast('تم إيقاف المزامنة التلقائية', 'warn'); }
}

function scheduleAutoSync() {
  clearTimeout(_autoSyncTimer);
  if (!isAutoSync() || !getSheetsUrl()) return;
  _autoSyncTimer = setTimeout(() => {
    syncToSheets(true); // silent mode
    scheduleAutoSync();
  }, 5 * 60 * 1000); // كل 5 دقايق
}

async function testSheetsConnection() {
  const url = (document.getElementById('sheets-url-input')?.value || getSheetsUrl()).trim();
  if (!url) { toast('حط الرابط الأول', 'error'); return; }
  const btn = document.querySelector('[onclick="testSheetsConnection()"]');
  if (btn) { btn.innerHTML = '<i class="ti ti-loader"></i> جاري الاختبار...'; btn.disabled = true; }
  try {
    const res  = await fetch(url + '?action=ping', { method: 'GET' });
    const data = await res.json();
    if (data.ok) {
      toast('✓ الاتصال ناجح! Google Sheets جاهزة');
      setSyncDot('green');
      document.getElementById('sheets-sync-status').textContent = 'متصل ✓';
    } else {
      toast('فشل الاتصال: ' + (data.error||'خطأ غير معروف'), 'error');
    }
  } catch(e) {
    toast('تعذر الاتصال — تأكد من الرابط والصلاحيات', 'error');
    setSyncDot('red');
  } finally {
    if (btn) { btn.innerHTML = '<i class="ti ti-plug"></i> اختبار الاتصال'; btn.disabled = false; }
  }
}

async function syncToSheets(silent = false) {
  const url = getSheetsUrl();
  if (!url) { if (!silent) toast('حط رابط Google Sheets الأول', 'error'); return; }
  if (_syncInProgress) return;
  _syncInProgress = true;
  setSyncDot('amber');
  if (!silent) toast('جاري الرفع لـ Google Sheets...');
  try {
    const payload = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const res     = await fetch(url, {
      method: 'POST',
      body:   JSON.stringify({ action: 'save', payload, ts: new Date().toISOString() }),
    });
    const data = await res.json();
    if (data.ok) {
      const meta = getSheetsMeta();
      meta.lastSync = new Date().toISOString();
      meta.direction = 'upload';
      saveSheetsMeta(meta);
      setSyncDot('green');
      updateSheetsLastSync();
      recordBackupDone();
      if (!silent) toast('✓ تم الرفع لـ Google Sheets بنجاح');
    } else {
      setSyncDot('red');
      if (!silent) toast('فشل الرفع: ' + (data.error||'خطأ'), 'error');
    }
  } catch(e) {
    setSyncDot('red');
    if (!silent) toast('خطأ في الاتصال بـ Google Sheets', 'error');
  } finally {
    _syncInProgress = false;
  }
}

async function syncFromSheets() {
  const url = getSheetsUrl();
  if (!url) { toast('حط رابط Google Sheets الأول', 'error'); return; }
  if (_syncInProgress) return;
  _syncInProgress = true;
  setSyncDot('amber');
  toast('جاري التنزيل من Google Sheets...');
  try {
    const res  = await fetch(url + '?action=load');
    const data = await res.json();
    if (data.ok && data.payload) {
      // حفظ نسخة من الحالي قبل الاستبدال
      backupToLocalHistory();
      const raw = JSON.stringify(data.payload);
      showImportPreview(data.payload, raw);
      setSyncDot('green');
      toast('✓ تم تحميل البيانات — راجع التفاصيل وأكد الاستيراد');
    } else {
      setSyncDot('red');
      toast('مفيش بيانات محفوظة في Google Sheets', 'warn');
    }
  } catch(e) {
    setSyncDot('red');
    toast('خطأ في الاتصال بـ Google Sheets', 'error');
  } finally {
    _syncInProgress = false;
  }
}

function setSyncDot(color) {
  const dot = document.getElementById('sheets-sync-dot');
  if (!dot) return;
  const colors = { green: '#0F9D58', amber: '#F4B400', red: '#DB4437', gray: 'var(--text3)' };
  dot.style.background = colors[color] || colors.gray;
}

function updateSheetsLastSync() {
  const el   = document.getElementById('sheets-last-sync');
  const meta = getSheetsMeta();
  if (!el || !meta.lastSync) return;
  const d    = new Date(meta.lastSync);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  const ago  = diff < 1 ? 'الآن' : diff < 60 ? `منذ ${diff} دقيقة` : `منذ ${Math.floor(diff/60)} ساعة`;
  el.textContent = `آخر مزامنة: ${ago} (${meta.direction==='upload'?'↑ رفع':'↓ تنزيل'})`;
}

function refreshSheetsUI() {
  const url     = getSheetsUrl();
  const urlSect = document.getElementById('sheets-url-section');
  const actSect = document.getElementById('sheets-actions');
  const urlInp  = document.getElementById('sheets-url-input');
  const autoChk = document.getElementById('auto-sync-toggle');
  const status  = document.getElementById('sheets-sync-status');

  if (url) {
    if (urlSect) urlSect.style.display = 'none';
    if (actSect) actSect.style.display = 'block';
    if (status)  status.textContent = 'مفعّل ✓';
    setSyncDot('green');
    if (autoChk) autoChk.checked = isAutoSync();
    updateSheetsLastSync();
  } else {
    if (urlSect) urlSect.style.display = 'block';
    if (actSect) actSect.style.display = 'none';
    if (urlInp)  urlInp.value = '';
    if (status)  status.textContent = 'غير مفعّل';
    setSyncDot('gray');
  }
}

function openBackupModal() {
  renderBackupStatus();
  refreshSheetsUI();
  renderLocalBackupList();
  openModal('modal-backup');
}

// استدعاء المزامنة التلقائية عند saveData
function autoSyncIfEnabled() {
  if (isAutoSync() && getSheetsUrl() && !_syncInProgress) {
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer = setTimeout(() => syncToSheets(true), 3000);
  }
}

const LOCAL_BACKUP_KEY = 'malak_local_backups_v1';

function getLocalBackups() {
  try { return JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || '[]'); }
  catch { return []; }
}

function saveLocalBackups(arr) {
  localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(arr));
}

function backupToLocalHistory() {
  const data = localStorage.getItem(STORE_KEY) || '{}';
  const arr  = getLocalBackups();
  arr.unshift({ ts: new Date().toISOString(), size: data.length, data });
  saveLocalBackups(arr.slice(0, 5)); // keep last 5
  recordBackupDone();
  renderBackupStatus();
  toast('✓ تم الحفظ المحلي السريع');
}

function restoreLocalBackup(idx) {
  const arr = getLocalBackups();
  const bk  = arr[idx];
  if (!bk) return;
  const d = new Date(bk.ts);
  confirm2(
    'استعادة النسخة؟',
    `بتاريخ ${d.toLocaleString('ar-EG')} — هيتم استبدال كل البيانات الحالية`,
    () => {
      localStorage.setItem(STORE_KEY, bk.data);
      location.reload();
    }
  );
}

function deleteLocalBackup(idx) {
  const arr = getLocalBackups();
  arr.splice(idx, 1);
  saveLocalBackups(arr);
  renderBackupStatus();
  toast('تم الحذف', 'warn');
}

function renderLocalBackupList() {
  const el  = document.getElementById('local-backup-list');
  if (!el) return;
  const arr = getLocalBackups();
  if (!arr.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 0">لا توجد نسخ محلية — اضغط "حفظ محلي سريع"</div>';
    return;
  }
  el.innerHTML = arr.map((bk, i) => {
    const d    = new Date(bk.ts);
    const kb   = (bk.size / 1024).toFixed(1);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    const ago  = diff === 0 ? 'اليوم' : diff === 1 ? 'أمس' : `منذ ${diff} يوم`;
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:6px">
      <i class="ti ti-device-floppy" style="color:var(--teal);font-size:18px;flex-shrink:0"></i>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700">${d.toLocaleDateString('ar-EG', {weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        <div style="font-size:11px;color:var(--text3)">${ago} · ${kb} KB</div>
      </div>
      <button class="btn btn-sm" style="background:var(--gbg);color:var(--green);border:1px solid var(--gborder);font-size:11px" onclick="restoreLocalBackup(${i})">
        <i class="ti ti-restore"></i> استعادة
      </button>
      <button class="btn btn-sm" style="background:var(--rbg);color:var(--red);border:1px solid var(--rborder);font-size:11px;padding:5px 8px" onclick="deleteLocalBackup(${i})">
        <i class="ti ti-trash"></i>
      </button>
    </div>`;
  }).join('');
}

function previewImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      showImportPreview(parsed, e.target.result);
    } catch {
      toast('الملف تالف أو مش JSON صحيح', 'error');
    }
  };
  reader.readAsText(file);
}

async function importFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);
    showImportPreview(parsed, text);
  } catch {
    toast('الكليبورد فارغ أو البيانات مش صحيحة', 'error');
  }
}

function showImportPreview(parsed, raw) {
  const el = document.getElementById('import-preview');
  if (!el) return;

  const aqCount  = (parsed.aqsat  || []).length;
  const qrCount  = (parsed.qorod  || []).length;
  const dyCount  = (parsed.doyon  || []).length;
  const brCount  = (parsed.bore   || []).length;
  const daCount  = (parsed.daily  || []).length;
  const kb       = (raw.length / 1024).toFixed(1);
  const hasData  = aqCount + qrCount + dyCount + brCount + daCount > 0;

  if (!hasData) {
    toast('الملف ده مش فيه بيانات malak_shop', 'error');
    return;
  }

  el.style.display = 'block';
  el.innerHTML = `
    <div style="font-size:12px;font-weight:800;color:var(--green);margin-bottom:10px">
      <i class="ti ti-shield-check"></i> الملف سليم — معاه:
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${aqCount  ? `<span style="background:var(--tbg);color:var(--teal);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${aqCount} قسط</span>` : ''}
      ${qrCount  ? `<span style="background:var(--gbg);color:var(--green);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${qrCount} قرض</span>` : ''}
      ${dyCount  ? `<span style="background:var(--abg);color:var(--amber);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${dyCount} دين</span>` : ''}
      ${brCount  ? `<span style="background:var(--bbg);color:var(--blue);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${brCount} بند بره</span>` : ''}
      ${daCount  ? `<span style="background:var(--bg3);color:var(--text2);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${daCount} حركة يومية</span>` : ''}
      <span style="background:var(--bg3);color:var(--text3);padding:3px 10px;border-radius:20px;font-size:11px">${kb} KB</span>
    </div>
    <div style="background:var(--rbg);border:1px solid var(--rborder);border-radius:8px;padding:8px 12px;font-size:11px;color:var(--red);margin-bottom:12px">
      ⚠️ الاستيراد هيحل محل كل البيانات الحالية
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="confirmImport()">
      <i class="ti ti-check"></i> تأكيد الاستيراد
    </button>`;

  // حفظ البيانات مؤقتاً
  window._pendingImportData = raw;
}

function confirmImport() {
  if (!window._pendingImportData) return;
  confirm2(
    'تأكيد الاستيراد؟',
    'كل البيانات الحالية هتتاستبدل ومش هيبقى فيه رجوع',
    () => {
      // احفظ نسخة من الحالي الأول
      backupToLocalHistory();
      localStorage.setItem(STORE_KEY, window._pendingImportData);
      window._pendingImportData = null;
      toast('✓ تم الاستيراد — جاري إعادة التحميل...');
      setTimeout(() => location.reload(), 1200);
    }
  );
}

function shareBackupWA() {
  const data = localStorage.getItem(STORE_KEY) || '{}';
  const kb   = (data.length / 1024).toFixed(1);
  const msg  = `🗄️ *نسخة احتياطية - malak_shop*\n📅 ${new Date().toLocaleDateString('ar-EG')}\n💾 الحجم: ${kb} KB\n\n⬇️ البيانات (انسخها واحفظها):\n${data}`;
  if (msg.length > 65000) {
    // كبيرة — نسخ للكليبورد بدل واتساب
    navigator.clipboard.writeText(data).then(() => {
      toast('البيانات كبيرة للواتساب — اتنسخت للكليبورد، الصقها في أي مكان تاني', 'warn');
    });
    return;
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  recordBackupDone();
  toast('✓ تم فتح واتساب');
}

function exportDataNow() {
  const data = localStorage.getItem(STORE_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'malak_backup_' + todayStr + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  recordBackupDone();
  document.getElementById('backup-banner').classList.remove('show');
  renderBackupStatus();
  toast('✓ تم تنزيل النسخة الاحتياطية');
}

function copyBackupToClipboard() {
  const data = localStorage.getItem(STORE_KEY) || '{}';
  navigator.clipboard.writeText(data).then(() => {
    recordBackupDone();
    renderBackupStatus();
    toast('✓ تم نسخ البيانات للكليبورد');
  }).catch(() => toast('تعذر النسخ', 'error'));
}

function snoozeBackup() {
  const meta = getBackupMeta();
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + 1);
  meta.snoozeUntil = snoozeUntil.toISOString();
  saveBackupMeta(meta);
  document.getElementById('backup-banner').classList.remove('show');
  toast('هيذكرك بكره 👍');
}

function openAutoBackupSettings() {
  const panel = document.getElementById('auto-backup-settings');
  if(panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  const meta = getBackupMeta();
  const sel = document.getElementById('backup-interval-sel');
  if(sel) sel.value = String(meta.intervalDays ?? 7);
}

function saveBackupSettings() {
  const days = parseInt(document.getElementById('backup-interval-sel')?.value ?? 7);
  const meta = getBackupMeta();
  meta.intervalDays = days;
  saveBackupMeta(meta);
  toast(days === 0 ? 'تم إيقاف التذكير' : `✓ هيذكرك كل ${days} ${days===1?'يوم':'أيام'}`);
  renderBackupStatus();
}

function renderBackupStatus() {
  const card = document.getElementById('backup-status-card');
  const warn = document.getElementById('backup-danger-warn');
  if(!card) return;
  const meta = getBackupMeta();
  const data = localStorage.getItem(STORE_KEY) || '{}';
  const kb   = (data.length / 1024).toFixed(1);
  const parsed = (() => { try { return JSON.parse(data); } catch { return {}; } })();
  const counts = [
    `${(parsed.aqsat||[]).length} قسط`,
    `${(parsed.qorod||[]).length} قرض`,
    `${(parsed.doyon||[]).length} دين`,
  ].join(' · ');

  if(!meta.lastBackup) {
    if(warn) warn.style.display = 'block';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:13px;background:var(--rbg);border:1px solid var(--rborder);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--red);flex-shrink:0">
          <i class="ti ti-alert-circle"></i>
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;color:var(--red)">لم يتم عمل نسخة احتياطية بعد!</div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">${counts} · ${kb} KB</div>
        </div>
      </div>`;
    renderLocalBackupList();
    return;
  }

  if(warn) warn.style.display = 'none';
  const lastDate  = new Date(meta.lastBackup);
  const diffMs    = Date.now() - lastDate.getTime();
  const diffDays  = Math.floor(diffMs / 864e5);
  const diffHours = Math.floor(diffMs / 36e5);
  const interval  = meta.intervalDays ?? 7;
  const isOld     = interval > 0 && diffDays >= interval;
  const color     = isOld ? 'var(--red)' : diffDays >= 1 ? 'var(--amber)' : 'var(--green)';
  const icon      = isOld ? 'ti-alert-circle' : diffDays >= 1 ? 'ti-clock' : 'ti-circle-check';
  const iconBg    = isOld ? 'var(--rbg)' : diffDays >= 1 ? 'var(--abg)' : 'var(--gbg)';
  const iconBdr   = isOld ? 'var(--rborder)' : diffDays >= 1 ? 'var(--aborder)' : 'var(--gborder)';
  const timeStr   = diffHours < 1 ? 'منذ أقل من ساعة' : diffHours < 24 ? `منذ ${diffHours} ساعة` : `منذ ${diffDays} ${diffDays===1?'يوم':'أيام'}`;

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:13px;background:${iconBg};border:1px solid ${iconBdr};display:flex;align-items:center;justify-content:center;font-size:22px;color:${color};flex-shrink:0">
        <i class="ti ${icon}"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:800;color:${color}">آخر نسخة: ${timeStr}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">
          ${lastDate.toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div style="font-size:10px;color:var(--text3)">حجم البيانات</div>
        <div style="font-size:15px;font-weight:900;color:var(--teal)">${kb} KB</div>
        <div style="font-size:10px;color:var(--text3)">${counts}</div>
      </div>
    </div>`;

  // sync interval select
  const sel = document.getElementById('backup-interval-sel');
  if(sel) sel.value = String(interval);

  renderLocalBackupList();
}

function checkBackupReminder() {
  const meta = getBackupMeta();
  const interval = meta.intervalDays ?? 7;
  if(interval === 0) return;
  if(meta.snoozeUntil && new Date() < new Date(meta.snoozeUntil)) return;
  const banner = document.getElementById('backup-banner');
  const sub    = document.getElementById('backup-banner-sub');
  if(!banner) return;
  if(!meta.lastBackup) {
    if(sub) sub.textContent = 'لم تعمل نسخة احتياطية قط — بياناتك في خطر!';
    banner.classList.add('show');
    return;
  }
  const diffDays = Math.floor((Date.now() - new Date(meta.lastBackup).getTime()) / 864e5);
  if(diffDays >= interval) {
    if(sub) sub.textContent = `آخر نسخة كانت منذ ${diffDays} ${diffDays===1?'يوم':'أيام'} — وقت عمل نسخة جديدة`;
    banner.classList.add('show');
  }
}

