import { FOODS, FOOD_ORDER, SETS, DINNERS, SLOTS, GOAL } from './presets.js';
import { firebaseConfig, isConfigured } from './firebase-config.js';

/* ========== 状態 ========== */
const LS_DATA = 'mealLog.data.v2';
const LS_LOCAL = 'mealLog.localOnly';
const CDN = 'https://www.gstatic.com/firebasejs/10.12.5/';

const state = { days: {}, custom: [] };
let cur = keyOf(new Date());
let fb = null;            // Firebase（Firestore）への参照
let unsubDays = null, unsubCustom = null;
const pendingDays = new Set();
let pendingCustom = false;
const uploading = new Map();     // アップロード中のプレースホルダ
const photoCache = new Map();    // 写真ID -> dataURL
const photoLoading = new Set();  // 取得中の日付

const $ = (id) => document.getElementById(id);
const WD = ['日', '月', '火', '水', '木', '金', '土'];

/* ========== 日付ユーティリティ ========== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseKey(s) { const a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
function todayKey() { return keyOf(new Date()); }
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function r1(n) { return Math.round(n * 10) / 10; }

function day(k) {
  if (!state.days[k]) {
    state.days[k] = { date: k, items: [], photos: [], lunchNote: '', weight: null, fat: null, training: { upper: false, lower: false } };
  }
  const d = state.days[k];
  if (!Array.isArray(d.items)) d.items = [];
  if (!Array.isArray(d.photos)) d.photos = [];
  if (typeof d.lunchNote !== 'string') d.lunchNote = '';
  if (!d.training || typeof d.training !== 'object') d.training = { upper: false, lower: false };
  return d;
}

/* ========== 保存 ========== */
function saveLocal() {
  try { localStorage.setItem(LS_DATA, JSON.stringify(state)); }
  catch (e) { toast('端末の保存容量がいっぱいです'); }
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o.days) state.days = o.days;
    if (o.custom) state.custom = o.custom;
  } catch (e) { /* 壊れていたら無視 */ }
}
async function saveDay(k) {
  saveLocal();
  const d = state.days[k];
  if (!d) return;
  if (!fb) { pendingDays.add(k); return; }
  try {
    await fb.setDoc(fb.doc(fb.db, 'users', fb.uid, 'days', k), {
      date: d.date, items: d.items, photos: d.photos,
      lunchNote: d.lunchNote, weight: d.weight, fat: d.fat,
      training: d.training || { upper: false, lower: false },
      updatedAt: Date.now()
    });
    pendingDays.delete(k);
  } catch (e) { pendingDays.add(k); toast('保存できませんでした'); }
}
async function saveCustom() {
  saveLocal();
  if (!fb) { pendingCustom = true; return; }
  try {
    await fb.setDoc(fb.doc(fb.db, 'users', fb.uid, 'config', 'custom'), { list: state.custom });
    pendingCustom = false;
  } catch (e) { pendingCustom = true; }
}
let noteTimer = null;
function saveDayDebounced(k) {
  saveLocal();
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => saveDay(k), 700);
}

/* ========== 集計 ========== */
function totals(d) {
  let k = 0, p = 0;
  if (d) for (const it of d.items) { k += (+it.k || 0); p += (+it.p || 0); }
  return { k, p };
}
function slotTotals(d, slot) {
  let k = 0, p = 0;
  if (d) for (const it of d.items) if (it.slot === slot) { k += (+it.k || 0); p += (+it.p || 0); }
  return { k, p };
}
function rangeTotals(from, to) {
  let k = 0, p = 0, n = 0;
  const c = new Date(from.getTime());
  while (c <= to) {
    const d = state.days[keyOf(c)];
    if (d && d.items && d.items.length) { const t = totals(d); k += t.k; p += t.p; n++; }
    c.setDate(c.getDate() + 1);
  }
  return { k, p, n };
}
function recordedKeys() {
  return Object.keys(state.days).filter(k => {
    const d = state.days[k];
    return d && ((d.items && d.items.length) || d.weight != null || d.fat != null ||
      (d.photos && d.photos.length) || (d.training && (d.training.upper || d.training.lower)));
  }).sort();
}

/* ========== 描画 ========== */
function render() {
  const d = parseKey(cur);
  $('dmain').textContent = `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）` + (cur === todayKey() ? ' 今日' : '');
  $('dpick').value = cur;

  const dd = state.days[cur];
  const t = totals(dd);
  $('dayK').innerHTML = Math.round(t.k) + '<small>kcal</small>';
  $('dayP').innerHTML = r1(t.p) + '<small>g</small>';
  $('barK').style.width = Math.min(100, t.k / GOAL.kcal * 100) + '%';
  $('barP').style.width = Math.min(100, t.p / GOAL.protein * 100) + '%';

  renderSlots();
  renderTraining();

  const w = $('wIn'), f = $('fIn');
  if (document.activeElement !== w) w.value = (dd && dd.weight != null) ? dd.weight : '';
  if (document.activeElement !== f) f.value = (dd && dd.fat != null) ? dd.fat : '';

  renderSummary();
  ensurePhotos(cur);
}

function chip(label, sub, cls, fn) {
  const b = document.createElement('button');
  b.className = 'chip' + (cls ? ' ' + cls : '');
  const t = document.createElement('b'); t.textContent = label; b.appendChild(t);
  if (sub) { const s = document.createElement('span'); s.textContent = sub; b.appendChild(s); }
  b.addEventListener('click', fn);
  return b;
}
function sumOf(ids) {
  let k = 0, p = 0;
  ids.forEach(id => { k += FOODS[id].k; p += FOODS[id].p; });
  return Math.round(k) + 'kcal / P' + r1(p);
}

function renderSlots() {
  const host = $('slots');
  host.innerHTML = '';
  const dd = state.days[cur];

  for (const slot of SLOTS) {
    const card = document.createElement('div');
    card.className = 'slot';

    const head = document.createElement('div');
    head.className = 'slothead';
    const st = slotTotals(dd, slot.id);
    head.innerHTML = `<div class="sname">${slot.name}</div><div class="ssum">${Math.round(st.k)}kcal ／ P${r1(st.p)}</div>`;
    card.appendChild(head);

    // 写真
    const photos = (dd && dd.photos ? dd.photos : []).filter(p => p.slot === slot.id);
    const pending = [...uploading.values()].filter(u => u.slot === slot.id);
    if (photos.length || pending.length) {
      const strip = document.createElement('div');
      strip.className = 'photos';
      photos.forEach(p => {
        const box = document.createElement('div'); box.className = 'ph';
        const src = photoSrc(p);
        const img = document.createElement('img'); img.alt = '食事の写真'; img.loading = 'lazy';
        if (src) { img.src = src; img.addEventListener('click', () => openViewer(src)); }
        else { box.classList.add('up'); }
        const del = document.createElement('button'); del.textContent = '×'; del.setAttribute('aria-label', '写真を削除');
        del.addEventListener('click', () => removePhoto(p.id));
        box.appendChild(img); box.appendChild(del);
        if (!src) { const s2 = document.createElement('div'); s2.className = 'spin'; s2.textContent = '読み込み中'; box.appendChild(s2); }
        strip.appendChild(box);
      });
      pending.forEach(() => {
        const box = document.createElement('div'); box.className = 'ph up';
        box.innerHTML = '<img alt=""><div class="spin">送信中</div>';
        strip.appendChild(box);
      });
      card.appendChild(strip);
    }

    // 昼食のメモ
    if (slot.id === 'lunch') {
      const ta = document.createElement('textarea');
      ta.className = 'memo';
      ta.placeholder = '食べたもののメモ（例：鮭の塩焼き、ひじき煮、味噌汁、ごはん少なめ）';
      ta.value = dd ? (dd.lunchNote || '') : '';
      ta.addEventListener('input', e => { day(cur).lunchNote = e.target.value; saveDayDebounced(cur); });
      ta.addEventListener('blur', () => saveDay(cur));
      card.appendChild(ta);
    }

    // 項目
    const items = (dd && dd.items ? dd.items : []).filter(it => it.slot === slot.id);
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'slotempty'; e.textContent = '記録なし';
      card.appendChild(e);
    } else {
      items.forEach(it => {
        const row = document.createElement('div'); row.className = 'row';
        const n = document.createElement('div'); n.className = 'n'; n.textContent = it.n;
        const k = document.createElement('div'); k.className = 'k'; k.textContent = Math.round(it.k) + 'kcal';
        const p = document.createElement('div'); p.className = 'p'; p.textContent = 'P' + r1(it.p);
        const b = document.createElement('button'); b.className = 'del'; b.textContent = '×'; b.setAttribute('aria-label', '削除');
        b.addEventListener('click', () => { removeItem(it.id); });
        row.append(n, k, p, b);
        card.appendChild(row);
      });
    }

    // 操作
    const act = document.createElement('div'); act.className = 'slotact';
    SETS.filter(s => s.slot === slot.id).forEach(s => {
      act.appendChild(chip(s.name, sumOf(s.items), 'key', () => addMany(s.items, slot.id, s.name)));
    });
    if (slot.id === 'dinner') {
      DINNERS.forEach(s => act.appendChild(chip(s.name, sumOf(s.items), 'key', () => addMany(s.items, slot.id, s.name))));
    }
    act.appendChild(chip('＋ 追加', '', 'add', () => openSheet(slot)));
    act.appendChild(chip('📷 写真', '', 'add', () => pickPhoto(slot.id)));
    card.appendChild(act);

    host.appendChild(card);
  }
}

function trainLabel(d) {
  if (!d || !d.training) return '';
  const t = d.training;
  return (t.upper ? '上' : '') + (t.lower ? '下' : '');
}
function trainCount(from, to) {
  let up = 0, low = 0, days = 0;
  const c = new Date(from.getTime());
  while (c <= to) {
    const d = state.days[keyOf(c)];
    if (d && d.training && (d.training.upper || d.training.lower)) {
      days++;
      if (d.training.upper) up++;
      if (d.training.lower) low++;
    }
    c.setDate(c.getDate() + 1);
  }
  return { up, low, days };
}
function ensureTrainBox() {
  let box = document.getElementById('trainBox');
  if (box) return box;
  const h = document.createElement('h2');
  h.textContent = 'トレーニング';
  box = document.createElement('div');
  box.id = 'trainBox';
  box.className = 'sum';
  box.innerHTML =
    '<div style="display:flex;gap:20px">' +
    '<label class="opt" style="margin:0;font-size:15px;color:var(--text)"><input type="checkbox" id="tUpper">上半身</label>' +
    '<label class="opt" style="margin:0;font-size:15px;color:var(--text)"><input type="checkbox" id="tLower">下半身</label>' +
    '</div>';
  const slots = $('slots');
  slots.insertAdjacentElement('afterend', box);
  box.insertAdjacentElement('beforebegin', h);
  $('tUpper').addEventListener('change', e => setTraining('upper', e.target.checked));
  $('tLower').addEventListener('change', e => setTraining('lower', e.target.checked));
  return box;
}
function setTraining(key, val) {
  day(cur).training[key] = val;
  saveDay(cur);
  renderSummary();
}
function renderTraining() {
  ensureTrainBox();
  const d = state.days[cur];
  $('tUpper').checked = !!(d && d.training && d.training.upper);
  $('tLower').checked = !!(d && d.training && d.training.lower);
}

function renderSummary() {
  const d = parseKey(cur);
  const ws = weekStart(d), we = new Date(ws.getTime()); we.setDate(we.getDate() + 6);
  const w = rangeTotals(ws, we);
  $('wRange').textContent = fmtMD(ws) + ' 〜 ' + fmtMD(we);
  $('wK').innerHTML = Math.round(w.k) + '<small>kcal</small>';
  $('wP').innerHTML = Math.round(w.p) + '<small>g</small>';
  $('wKa').innerHTML = (w.n ? Math.round(w.k / w.n) : 0) + '<small>kcal</small>';
  $('wPa').innerHTML = (w.n ? Math.round(w.p / w.n) : 0) + '<small>g</small>';
  const wt = trainCount(ws, we);
  $('wDays').textContent = `記録 ${w.n} 日 ／ トレーニング ${wt.days} 日（上半身 ${wt.up}・下半身 ${wt.low}）`;

  const ms = new Date(d.getFullYear(), d.getMonth(), 1);
  const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const m = rangeTotals(ms, me);
  $('mRange').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  $('mK').innerHTML = Math.round(m.k) + '<small>kcal</small>';
  $('mP').innerHTML = Math.round(m.p) + '<small>g</small>';
  $('mKa').innerHTML = (m.n ? Math.round(m.k / m.n) : 0) + '<small>kcal</small>';
  $('mPa').innerHTML = (m.n ? Math.round(m.p / m.n) : 0) + '<small>g</small>';
  const mt = trainCount(ms, me);
  $('mDays').textContent = `記録 ${m.n} 日 ／ トレーニング ${mt.days} 日（上半身 ${mt.up}・下半身 ${mt.low}）`;

  renderHistory();
  renderChart();
}

function renderHistory() {
  const tb = $('hist'); tb.innerHTML = '';
  const keys = recordedKeys().reverse().slice(0, 21);
  if (!keys.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">記録がありません</td></tr>';
    return;
  }
  keys.forEach(k => {
    const d = state.days[k], t = totals(d), dt = parseKey(k);
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${fmtMD(dt)}（${WD[dt.getDay()]}）${trainLabel(d) ? ' ' + trainLabel(d) : ''}${d.photos && d.photos.length ? ' 📷' : ''}</td>` +
      `<td class="k">${Math.round(t.k)}</td>` +
      `<td class="p">${r1(t.p)}</td>` +
      `<td>${d.weight != null ? d.weight : '—'}</td>` +
      `<td>${d.fat != null ? d.fat : '—'}</td>`;
    tr.addEventListener('click', () => { cur = k; render(); showPage('log'); window.scrollTo(0, 0); });
    tb.appendChild(tr);
  });
}

function renderChart() {
  const svg = $('chart');
  const pts = recordedKeys().filter(k => state.days[k].weight != null).slice(-40);
  if (pts.length < 2) {
    svg.innerHTML = '';
    $('chartNote').textContent = pts.length ? '体重の記録が2日分たまるとグラフが表示されます。' : '体重を記録するとグラフが表示されます。';
    return;
  }
  const W = 340, H = 150, PL = 8, PR = 8, PT = 12, PB = 18;
  const ws = pts.map(k => +state.days[k].weight);
  const fs = pts.map(k => state.days[k].fat == null ? null : +state.days[k].fat);
  let wmin = Math.min(...ws), wmax = Math.max(...ws);
  if (wmax - wmin < 1) { wmin -= 0.5; wmax += 0.5; }
  const fv = fs.filter(v => v != null);
  let fmin = fv.length ? Math.min(...fv) : 0, fmax = fv.length ? Math.max(...fv) : 1;
  if (fmax - fmin < 1) { fmin -= 0.5; fmax += 0.5; }
  const x = i => PL + i * (W - PL - PR) / (pts.length - 1);
  const yw = v => PT + (wmax - v) / (wmax - wmin) * (H - PT - PB);
  const yf = v => PT + (fmax - v) / (fmax - fmin) * (H - PT - PB);

  let s = `<line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="var(--line)"/>`;
  s += `<polyline points="${ws.map((v, i) => x(i) + ',' + yw(v)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
  let seg = [];
  fs.forEach((v, i) => {
    if (v == null) {
      if (seg.length > 1) s += `<polyline points="${seg.join(' ')}" fill="none" stroke="var(--kcal)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
      seg = [];
    } else seg.push(x(i) + ',' + yf(v));
  });
  if (seg.length > 1) s += `<polyline points="${seg.join(' ')}" fill="none" stroke="var(--kcal)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${x(pts.length - 1)}" cy="${yw(ws[ws.length - 1])}" r="3" fill="var(--accent)"/>`;
  s += `<text x="${PL}" y="10" fill="var(--muted)" font-size="9">${wmax.toFixed(1)}kg</text>`;
  s += `<text x="${PL}" y="${H - PB + 13}" fill="var(--muted)" font-size="9">${wmin.toFixed(1)}kg</text>`;
  svg.innerHTML = s;

  const first = ws[0], last = ws[ws.length - 1], diff = r1(last - first);
  $('chartNote').textContent =
    `${fmtMD(parseKey(pts[0]))} ${first}kg → ${fmtMD(parseKey(pts[pts.length - 1]))} ${last}kg（${diff > 0 ? '+' : ''}${diff}kg）`;
}

/* ========== 操作 ========== */
function addMany(ids, slot, label) {
  const d = day(cur);
  ids.forEach(id => {
    const f = FOODS[id];
    if (f) d.items.push({ id: uid(), slot, n: f.n, k: f.k, p: f.p });
  });
  saveDay(cur); render(); toast(label + ' を追加');
}
function addOne(name, k, p, slot) {
  day(cur).items.push({ id: uid(), slot, n: name, k, p });
  saveDay(cur); render(); toast(name + ' を追加');
}
function removeItem(itemId) {
  const d = day(cur);
  d.items = d.items.filter(x => x.id !== itemId);
  saveDay(cur); render();
}

/* ========== 追加シート ========== */
let sheetSlot = null;
function openSheet(slot) {
  sheetSlot = slot;
  $('sheetTitle').textContent = slot.name + 'に追加';
  $('sheetSearch').value = '';
  $('cName').value = ''; $('cK').value = ''; $('cP').value = ''; $('cSave').checked = false;
  renderSheetList('');
  $('sheet').hidden = false;
}
function closeSheet() { $('sheet').hidden = true; }
function renderSheetList(q) {
  const host = $('sheetList'); host.innerHTML = '';
  const query = q.trim().toLowerCase();
  const push = (name, k, p, onDel) => {
    if (query && !name.toLowerCase().includes(query)) return;
    const b = chip(name, Math.round(k) + 'kcal/P' + r1(p), '', () => {
      addOne(name, k, p, sheetSlot.id); closeSheet();
    });
    if (onDel) b.addEventListener('contextmenu', e => { e.preventDefault(); onDel(); });
    host.appendChild(b);
  };
  FOOD_ORDER.forEach(id => { const f = FOODS[id]; push(f.n, f.k, f.p); });
  state.custom.forEach((c, i) => push(c.n, c.k, c.p, () => {
    if (confirm(`「${c.n}」を登録から削除しますか？`)) {
      state.custom.splice(i, 1); saveCustom(); renderSheetList($('sheetSearch').value);
    }
  }));
}

/* ========== 写真 ========== */
function pickPhoto(slot) {
  const input = $('photoInput');
  input.dataset.slot = slot;
  input.value = '';
  input.click();
}
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('画像を読み込めません')); };
    img.src = url;
  });
}
// 長辺と画質を落としながら、1枚あたり約700KB以下のJPEGに収める
async function compressToLimit(file) {
  const img = await loadImage(file);
  let max = 900, q = 0.62, url = '';
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    url = cv.toDataURL('image/jpeg', q);
    if (url.length < 700 * 1024) return url;
    max = Math.round(max * 0.8);
    q = Math.max(0.35, q - 0.07);
  }
  return url;
}
function photoSrc(p) { return p.url || photoCache.get(p.id) || ''; }

// 表示中の日の写真をまとめて取得（写真は days とは別のドキュメントに保存）
async function ensurePhotos(dateKey) {
  if (!fb) return;
  const d = state.days[dateKey];
  if (!d || !d.photos || !d.photos.length) return;
  const missing = d.photos.filter(p => !p.url && !photoCache.has(p.id));
  if (!missing.length || photoLoading.has(dateKey)) return;
  photoLoading.add(dateKey);
  try {
    const snap = await fb.getDocs(fb.query(
      fb.collection(fb.db, 'users', fb.uid, 'photos'),
      fb.where('date', '==', dateKey)
    ));
    snap.forEach(ds => { const v = ds.data(); if (v && v.data) photoCache.set(ds.id, v.data); });
  } catch (e) { console.error(e); }
  finally { photoLoading.delete(dateKey); renderSlots(); }
}

async function handlePhoto(file, slot) {
  const tmp = uid();
  const dateKey = cur;
  uploading.set(tmp, { slot });
  renderSlots();
  try {
    const dataUrl = await compressToLimit(file);
    if (fb) {
      await fb.setDoc(fb.doc(fb.db, 'users', fb.uid, 'photos', tmp),
        { date: dateKey, slot, data: dataUrl, createdAt: Date.now() });
      photoCache.set(tmp, dataUrl);
      day(dateKey).photos.push({ id: tmp, slot });
      await saveDay(dateKey);
    } else {
      day(dateKey).photos.push({ id: tmp, slot, url: dataUrl });
      saveDay(dateKey);
    }
    toast('写真を追加しました');
  } catch (e) {
    console.error(e);
    toast('写真を追加できませんでした');
  } finally {
    uploading.delete(tmp);
    render();
  }
}

async function removePhoto(photoId) {
  if (!confirm('この写真を削除しますか？')) return;
  const d = day(cur);
  const ph = d.photos.find(p => p.id === photoId);
  d.photos = d.photos.filter(p => p.id !== photoId);
  photoCache.delete(photoId);
  await saveDay(cur);
  render();
  if (fb && ph && !ph.url) {
    try { await fb.deleteDoc(fb.doc(fb.db, 'users', fb.uid, 'photos', photoId)); } catch (e) { /* 既に無い場合など */ }
  }
}
function openViewer(url) { $('viewerImg').src = url; $('viewer').hidden = false; }

/* ========== 表示切替・トースト ========== */
let toastTimer;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1400);
}
function showPage(p) {
  document.querySelectorAll('section.page').forEach(s => s.classList.toggle('on', s.id === 'pg-' + p));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.pg === p));
}

/* ========== Firebase ========== */
async function initFirebase() {
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import(CDN + 'firebase-app.js'),
    import(CDN + 'firebase-auth.js'),
    import(CDN + 'firebase-firestore.js')
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  await authMod.setPersistence(auth, authMod.browserLocalPersistence);

  authMod.onAuthStateChanged(auth, user => {
    if (user) {
      $('login').hidden = true;
      $('logout').hidden = false;
      fb = {
        db: fsMod.getFirestore(app),
        uid: user.uid,
        doc: fsMod.doc, setDoc: fsMod.setDoc, deleteDoc: fsMod.deleteDoc,
        collection: fsMod.collection, query: fsMod.query, where: fsMod.where,
        orderBy: fsMod.orderBy, limit: fsMod.limit,
        getDocs: fsMod.getDocs, onSnapshot: fsMod.onSnapshot
      };
      $('syncNote').textContent = `同期中（${user.email}）`;
      flushPending();
      startSync();
    } else {
      fb = null;
      if (unsubDays) { unsubDays(); unsubDays = null; }
      if (unsubCustom) { unsubCustom(); unsubCustom = null; }
      if (localStorage.getItem(LS_LOCAL) === '1') {
        $('login').hidden = true;
        $('syncNote').textContent = 'この端末だけに保存しています。';
      } else {
        $('login').hidden = false;
      }
    }
  });

  $('lgBtn').addEventListener('click', async () => {
    $('lgErr').hidden = true;
    try {
      await authMod.signInWithEmailAndPassword(auth, $('lgEmail').value.trim(), $('lgPass').value);
      localStorage.removeItem(LS_LOCAL);
    } catch (e) {
      $('lgErr').textContent = 'ログインできませんでした（' + (e.code || 'error') + '）';
      $('lgErr').hidden = false;
    }
  });
  $('logout').addEventListener('click', async () => {
    if (confirm('ログアウトしますか？')) { localStorage.setItem(LS_LOCAL, '0'); await authMod.signOut(auth); location.reload(); }
  });
}
function flushPending() {
  [...pendingDays].forEach(k => saveDay(k));
  if (pendingCustom) saveCustom();
}
function startSync() {
  const daysCol = fb.collection(fb.db, 'users', fb.uid, 'days');
  unsubDays = fb.onSnapshot(fb.query(daysCol, fb.orderBy('date', 'desc'), fb.limit(500)), snap => {
    snap.forEach(docSnap => {
      const v = docSnap.data() || {};
      state.days[docSnap.id] = {
        date: v.date || docSnap.id,
        items: Array.isArray(v.items) ? v.items : [],
        photos: Array.isArray(v.photos) ? v.photos : [],
        lunchNote: typeof v.lunchNote === 'string' ? v.lunchNote : '',
        weight: v.weight === undefined ? null : v.weight,
        fat: v.fat === undefined ? null : v.fat,
        training: (v.training && typeof v.training === 'object') ? v.training : { upper: false, lower: false }
      };
    });
    saveLocal(); render();
  }, err => { console.error(err); $('syncNote').textContent = '同期エラー：この端末に保存しています。'; });

  unsubCustom = fb.onSnapshot(fb.doc(fb.db, 'users', fb.uid, 'config', 'custom'), docSnap => {
    const v = docSnap.data();
    if (v && Array.isArray(v.list)) { state.custom = v.list; saveLocal(); }
  }, () => {});
}

/* ========== イベント ========== */
$('prev').addEventListener('click', () => { const d = parseKey(cur); d.setDate(d.getDate() - 1); cur = keyOf(d); render(); });
$('next').addEventListener('click', () => { const d = parseKey(cur); d.setDate(d.getDate() + 1); cur = keyOf(d); render(); });
$('dpick').addEventListener('change', e => { if (e.target.value) { cur = e.target.value; render(); } });

$('sheetSearch').addEventListener('input', e => renderSheetList(e.target.value));
$('sheetClose').addEventListener('click', closeSheet);
$('sheetBg').addEventListener('click', closeSheet);
$('cAdd').addEventListener('click', () => {
  const n = $('cName').value.trim();
  if (!n) { toast('名前を入力してください'); return; }
  let k = parseFloat($('cK').value); if (isNaN(k)) k = 0;
  let p = parseFloat($('cP').value); if (isNaN(p)) p = 0;
  if ($('cSave').checked) { state.custom.push({ n, k, p }); saveCustom(); }
  addOne(n, k, p, sheetSlot.id);
  closeSheet();
});

$('photoInput').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (file) handlePhoto(file, e.target.dataset.slot || 'lunch');
});
$('viewerClose').addEventListener('click', () => { $('viewer').hidden = true; $('viewerImg').src = ''; });

function bodyChange(field, el) {
  const v = el.value.trim();
  day(cur)[field] = v === '' ? null : parseFloat(v);
  saveDay(cur); renderSummary();
}
$('wIn').addEventListener('change', e => bodyChange('weight', e.target));
$('fIn').addEventListener('change', e => bodyChange('fat', e.target));

document.querySelectorAll('nav.tabs button').forEach(b => {
  b.addEventListener('click', () => { showPage(b.dataset.pg); window.scrollTo(0, 0); });
});
$('lgSkip').addEventListener('click', () => {
  localStorage.setItem(LS_LOCAL, '1');
  $('login').hidden = true;
  $('syncNote').textContent = 'この端末だけに保存しています。';
});

/* ========== 起動 ========== */
loadLocal();
render();

if (isConfigured) {
  initFirebase().catch(err => {
    console.error(err);
    $('login').hidden = true;
    $('syncNote').textContent = 'Firebaseに接続できません。この端末に保存しています。';
  });
} else {
  $('login').hidden = true;
  $('syncNote').textContent = 'オフラインモード（js/firebase-config.js を設定すると同期されます）。';
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
