/**
 * Cheese Log: receives notes from the phone app and writes them into this Google Sheet.
 * One page (tab) per batch, plus an index tab "אצוות".
 *
 * Setup: change SECRET below to your own word, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Paste the web app URL and the same SECRET into the phone app.
 */
const SECRET = 'change-me';      // <-- change this, and type the same word in the app's settings
const FIRST_BATCH = 23;          // the first batch number

const INDEX = 'אצוות';
const INDEX_HEAD = ['אצווה', 'שם', 'תאריך', 'התחלה', 'סיום', 'משך (דקות)', 'חלב', 'משקל סופי', 'דירוג', 'הערות טעימה', 'עמוד', 'id', 'gid'];
const LOG_HEAD = ['תאריך ושעה', 'דקות', 'סוג', 'טמפ׳ (°C)', 'משקל / כמות', 'עדכון (כפי שנאמר)', 'הערות'];
const LOG_HEAD_ROW = 6;
const TYPES = { start: 'התחלה', note: 'עדכון', timer: 'טיימר', end: 'סיום', late: 'הערה מאוחרת' };

function doGet(e) { return respond_(e.parameter || {}); }
function doPost(e) { return respond_(JSON.parse(e.postData.contents || '{}')); }

function respond_(req) {
  let res;
  if (req.token !== SECRET) {
    res = { ok: false, error: 'wrong-key' };
  } else {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const cache = CacheService.getScriptCache();
      const seen = req.opId && cache.get('op_' + req.opId);
      if (seen) {
        res = JSON.parse(seen);                 // same note sent twice (retry): don't write it again
      } else {
        res = run_(req);
        if (req.opId) cache.put('op_' + req.opId, JSON.stringify(res), 21600);
      }
    } catch (err) {
      res = { ok: false, error: String(err && err.message || err) };
    } finally {
      lock.releaseLock();
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function run_(req) {
  switch (req.action) {
    case 'ping': indexSheet_(); return { ok: true };
    case 'list': return { ok: true, batches: listBatches_() };
    case 'start': return startBatch_(req);
    case 'row': return addRow_(req);
    case 'undo': return undo_(req);
    case 'name': return setName_(req);
    case 'end': return endBatch_(req);
    case 'delete': return deleteBatch_(req);
    default: return { ok: false, error: 'unknown-action' };
  }
}

// ---------- index ----------
function indexSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(INDEX);
  if (!sh) {
    sh = ss.insertSheet(INDEX, 0);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, INDEX_HEAD.length).setValues([INDEX_HEAD]).setFontWeight('bold').setBackground('#e8ebe5');
    sh.setFrozenRows(1);
    sh.hideColumns(12, 2);                     // id + gid are for the app only
    sh.getRange('C:C').setNumberFormat('dd.MM.yyyy');
    sh.getRange('D:E').setNumberFormat('HH:mm');
    const blank = ss.getSheets().find(s => /^(Sheet1|גיליון1)$/.test(s.getName()) && s.getLastRow() === 0);
    if (blank) ss.deleteSheet(blank);          // remove the empty default first tab
  }
  return sh;
}

function findIndexRow_(uid) {
  const sh = indexSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return null;
  const ids = sh.getRange(2, 12, n, 1).getValues();
  for (let i = 0; i < n; i++) if (ids[i][0] === uid) return i + 2;
  return null;
}

function batchSheet_(uid) {
  const row = findIndexRow_(uid);
  if (!row) throw new Error('batch-not-found');
  const gid = indexSheet_().getRange(row, 13).getValue();
  const sh = SpreadsheetApp.getActive().getSheets().find(s => s.getSheetId() === gid);
  if (!sh) throw new Error('batch-page-deleted');
  return { sh, row };
}

function listBatches_() {
  const sh = indexSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 13).getValues()
    .filter(r => r[11])
    .map(r => ({ uid: r[11], code: String(r[0]).replace('#', ''), name: String(r[1] || ''),
                 start: r[2] instanceof Date ? r[2].getTime() : null, ended: !!r[4] }))
    .reverse()
    .slice(0, 40);
}

// ---------- actions ----------
function startBatch_(req) {
  const existing = findIndexRow_(req.uid);
  if (existing) return { ok: true, code: String(indexSheet_().getRange(existing, 1).getValue()).replace('#', '') };

  const ss = SpreadsheetApp.getActive();
  const index = indexSheet_();
  const props = PropertiesService.getScriptProperties();
  const num = Number(props.getProperty('next') || FIRST_BATCH);
  props.setProperty('next', String(num + 1));

  const start = new Date(Number(req.ts));
  const tz = ss.getSpreadsheetTimeZone();
  const title = '#' + num + ' · ' + Utilities.formatDate(start, tz, 'dd.MM.yyyy');

  const sh = ss.insertSheet(title, 1);        // newest batch right after the index
  sh.setRightToLeft(true);
  sh.getRange('A1').setValue(title).setFontSize(16).setFontWeight('bold');
  sh.getRange('A2:H4').setValues([
    ['שם', req.name || '', '', 'חלב', '', '', 'משקל סופי', ''],
    ['התחלה', start, '', 'סיום', '', '', 'דירוג', ''],
    ['הערות טעימה', '', '', '', '', '', '', ''],
  ]);
  ['A2:A4', 'D2:D3', 'G2:G3'].forEach(a => sh.getRange(a).setFontColor('#5d675f'));
  sh.getRange('B3').setNumberFormat('dd.MM.yyyy HH:mm');
  sh.getRange('E3').setNumberFormat('dd.MM.yyyy HH:mm');
  sh.getRange('B4:H4').merge();
  sh.getRange(LOG_HEAD_ROW, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold').setBackground('#e8ebe5');
  sh.setFrozenRows(LOG_HEAD_ROW);
  sh.getRange('A:A').setNumberFormat('dd.MM.yyyy HH:mm');
  sh.setColumnWidth(1, 130); sh.setColumnWidth(6, 280); sh.setColumnWidth(7, 240);

  const q = "'" + title.replace(/'/g, "''") + "'!";
  const gid = sh.getSheetId();
  index.appendRow(['#' + num, '', start, start, '', '', '', '', '', '', '', req.uid, gid]);
  const r = index.getLastRow();
  index.getRange(r, 2).setFormula('=' + q + 'B2');
  index.getRange(r, 5).setFormula('=IF(' + q + 'E3="","",' + q + 'E3)');
  index.getRange(r, 6).setFormula('=IF(E' + r + '="","",ROUND((E' + r + '-D' + r + ')*1440))');
  index.getRange(r, 7).setFormula('=' + q + 'E2');
  index.getRange(r, 8).setFormula('=' + q + 'H2');
  index.getRange(r, 9).setFormula('=' + q + 'H3');
  index.getRange(r, 10).setFormula('=' + q + 'B4');
  index.getRange(r, 11).setFormula('=HYPERLINK("#gid=' + gid + '","פתח")');

  appendLog_(sh, start, { ts: req.ts, type: 'start', note: req.note || 'התחל', amount: req.amount || '', temp: req.temp });
  return { ok: true, code: String(num) };
}

function addRow_(req) {
  const { sh } = batchSheet_(req.uid);
  appendLog_(sh, sh.getRange('B3').getValue(), req);
  return { ok: true };
}

function appendLog_(sh, start, req) {
  const ts = new Date(Number(req.ts));
  const late = req.type === 'late';
  const minutes = late ? 'יום ' + Math.floor((ts - start) / 864e5) : Math.round((ts - start) / 60000);
  const temp = req.temp === undefined || req.temp === null || req.temp === '' ? '' : Number(req.temp);
  sh.appendRow([ts, minutes, TYPES[req.type] || req.type, temp, req.amount || '', req.note || '', '']);
}

function undo_(req) {
  const { sh } = batchSheet_(req.uid);
  const last = sh.getLastRow();
  if (last <= LOG_HEAD_ROW + 1) return { ok: false, error: 'nothing-to-undo' };
  sh.deleteRow(last);
  return { ok: true };
}

function setName_(req) {
  const { sh } = batchSheet_(req.uid);
  sh.getRange('B2').setValue(req.name || '');
  return { ok: true };
}

// Removes the batch's page and its index row. If it was the newest batch, its number is used again.
function deleteBatch_(req) {
  const row = findIndexRow_(req.uid);
  if (!row) return { ok: true, gone: true };          // already deleted
  const index = indexSheet_();
  const ss = SpreadsheetApp.getActive();
  const code = Number(String(index.getRange(row, 1).getValue()).replace('#', ''));
  const gid = index.getRange(row, 13).getValue();
  const sh = ss.getSheets().find(s => s.getSheetId() === gid);
  index.deleteRow(row);
  if (sh) ss.deleteSheet(sh);
  const props = PropertiesService.getScriptProperties();
  if (code && code === Number(props.getProperty('next')) - 1) props.setProperty('next', String(code));
  return { ok: true };
}

function endBatch_(req) {
  const { sh } = batchSheet_(req.uid);
  const end = new Date(Number(req.ts));
  appendLog_(sh, sh.getRange('B3').getValue(), { ts: req.ts, type: 'end', note: req.note || 'סיים הקלטה' });
  sh.getRange('E3').setValue(end);
  return { ok: true };
}
