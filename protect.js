// ========================================
// PROTECT (TenantShield) - Main Script
// ========================================

// Shared team database collections (see db.js). Records are files in data/<collection>/ when
// the site runs through `node server.js`, so they travel with git push / git pull.
const EVIDENCE = 'protect-evidence';
const COMPLAINTS = 'protect-complaints';

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initLocker();
  initComplaint();
  initLightbox();
  renderTimeline();
  updateSummary();
  await Promise.all([loadLockerFromStorage(), loadComplaints()]);
  renderTimeline();
  updateSummary();
  renderTracker();
});

// Escape user text before putting it into HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  // Parse YYYY-MM-DD as a local date (avoids timezone shifts)
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-IN', opts);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rupees(n) {
  return '₹' + Math.abs(Number(n)).toLocaleString('en-IN');
}


// ========================================
// TABS
// ========================================
function initTabs() {
  const tabs = [...document.querySelectorAll('.pr-tab')];
  const panels = document.querySelectorAll('.pr-panel');

  function select(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('pr-tab-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(p => p.classList.toggle('pr-panel-active', p.dataset.panel === tab.dataset.tab));
    if (focus) tab.focus();
    if (tab.dataset.tab === 'complaint') updateEvidenceHint();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });

  // Allow protect.html#complaint to open that tab directly
  const fromHash = tabs.find(t => '#' + t.dataset.tab === location.hash);
  if (fromHash) select(fromHash);
}

// ========================================
// EVIDENCE LOCKER
// ========================================
let lockerData = [];
let pendingPhotos = []; // array of data URLs

function initLocker() {
  const form = document.getElementById('pr-locker-form');
  const photoInput = document.getElementById('pr-ev-photos');

  document.getElementById('pr-ev-date').value = todayISO();
  document.getElementById('pr-ev-date').max = todayISO();

  photoInput.addEventListener('change', e => {
    handlePhotoUpload(e.target.files);
    e.target.value = ''; // lets the same photo be picked again
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    addEvidence();
  });

  document.getElementById('pr-filter-category').addEventListener('change', renderTimeline);
  document.getElementById('pr-sort-order').addEventListener('change', renderTimeline);
  document.getElementById('pr-load-sample').addEventListener('click', loadSampleData);
  document.getElementById('pr-export').addEventListener('click', exportLocker);
}

function handlePhotoUpload(files) {
  const imgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8);
  imgs.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => resizeImage(e.target.result, 800, resized => {
      pendingPhotos.push(resized);
      renderPendingPhotos();
    });
    reader.readAsDataURL(file);
  });
}

function renderPendingPhotos() {
  const preview = document.getElementById('pr-photo-preview');
  preview.innerHTML = '';
  pendingPhotos.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'pr-photo-item';
    item.innerHTML = `<img alt="Photo ${i + 1} to attach"><button type="button" class="pr-photo-remove" aria-label="Remove photo ${i + 1}">×</button>`;
    item.querySelector('img').src = src;
    item.querySelector('button').addEventListener('click', () => {
      pendingPhotos = pendingPhotos.filter(p => p !== src);
      renderPendingPhotos();
    });
    preview.appendChild(item);
  });
}

function resizeImage(dataUrl, maxWidth, callback) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxWidth / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL('image/jpeg', 0.8));
  };
  img.src = dataUrl;
}

function setFormMessage(id, text, kind = 'error') {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'pr-form-msg ' + kind;
  el.hidden = !text;
}

async function addEvidence() {
  const titleEl = document.getElementById('pr-ev-title');
  const date = document.getElementById('pr-ev-date').value;
  const category = document.getElementById('pr-ev-category').value;
  const title = titleEl.value.trim();
  const note = document.getElementById('pr-ev-note').value.trim();
  const amountRaw = document.getElementById('pr-ev-amount').value;

  if (!title) {
    titleEl.focus();
    titleEl.setAttribute('aria-invalid', 'true');
    return setFormMessage('pr-locker-msg', 'Add a short title so you can find this entry later.');
  }
  titleEl.removeAttribute('aria-invalid');

  let amount = amountRaw === '' ? null : Math.abs(parseFloat(amountRaw));
  // Money taken from you is stored as negative so it counts as disputed
  if (amount !== null && category === 'Deduction') amount = -amount;

  const user = window.TrustNestUser ? window.TrustNestUser() : null;
  let entry;
  try {
    entry = await TNDB.add(EVIDENCE, { date: date || todayISO(), category, title, note, amount, photos: [...pendingPhotos], addedBy: user ? user.name : null });
  } catch (e) {
    return setFormMessage('pr-locker-msg', e.message.includes('full')
      ? 'Storage is full. Remove a few photos or older entries and try again.'
      : 'Could not save. Check that the local server is running, then try again.');
  }
  lockerData.push(entry);

  document.getElementById('pr-locker-form').reset();
  document.getElementById('pr-ev-date').value = todayISO();
  pendingPhotos = [];
  renderPendingPhotos();
  setFormMessage('pr-locker-msg', 'Entry saved to your locker.', 'ok');
  setTimeout(() => setFormMessage('pr-locker-msg', ''), 2500);

  renderTimeline(entry.id);
  updateSummary();
}

function renderTimeline(highlightId) {
  const timeline = document.getElementById('pr-timeline');
  const filterCategory = document.getElementById('pr-filter-category').value;
  const sortOrder = document.getElementById('pr-sort-order').value;

  const filtered = lockerData
    .filter(e => !filterCategory || e.category === filterCategory)
    .sort((a, b) => (sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  document.getElementById('pr-export').disabled = lockerData.length === 0;
  document.getElementById('pr-load-sample').hidden = lockerData.length > 0;

  if (filtered.length === 0) {
    timeline.innerHTML = `
      <div class="pr-empty-timeline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
        <p>${filterCategory ? 'No entries in this category.' : 'No entries yet. Start with your move-in photos, or load a sample to see how it works.'}</p>
      </div>`;
    return;
  }

  const list = document.createElement('ul');
  list.className = 'pr-timeline-list';

  filtered.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'pr-timeline-item';
    li.style.setProperty('--cat', PR_CATEGORY_COLORS[entry.category] || 'var(--forest)');
    if (entry.category === 'Deduction') li.classList.add('pr-cat-alert');
    else if (entry.category === 'Maintenance complaint') li.classList.add('pr-cat-warning');
    if (entry.id === highlightId) li.classList.add('pr-new');

    const photos = entry.photos || [];
    const photosHtml = photos.length
      ? `<div class="pr-timeline-photos">${photos.map((p, i) => `<button type="button" class="pr-thumb" data-i="${i}" aria-label="Open photo ${i + 1} of ${photos.length}"><img src="${esc(p)}" alt=""></button>`).join('')}</div>`
      : '';

    const amountHtml = entry.amount !== null && entry.amount !== undefined
      ? `<div class="pr-timeline-amount ${entry.amount < 0 ? 'pr-negative' : 'pr-positive'}">${entry.amount < 0 ? '−' : ''}${rupees(entry.amount)}${entry.amount < 0 ? ' disputed' : ''}</div>`
      : '';

    li.innerHTML = `
      <div class="pr-timeline-date">${fmtDate(entry.date)}</div>
      <div class="pr-timeline-content">
        <span class="pr-timeline-category">${esc(entry.category)}</span>
        <div class="pr-timeline-title">${esc(entry.title)}</div>
        ${entry.note ? `<div class="pr-timeline-note">${esc(entry.note)}</div>` : ''}
        ${amountHtml}
        ${photosHtml}
      </div>
      <div class="pr-timeline-actions">
        <button type="button" class="pr-timeline-delete">Delete</button>
        <span class="pr-confirm" hidden>
          <span>Delete this entry?</span>
          <button type="button" class="pr-confirm-yes">Delete</button>
          <button type="button" class="pr-confirm-no">Keep</button>
        </span>
      </div>`;

    li.querySelectorAll('.pr-thumb').forEach(b => b.addEventListener('click', () => openLightbox(photos, +b.dataset.i)));

    const del = li.querySelector('.pr-timeline-delete');
    const confirmBox = li.querySelector('.pr-confirm');
    del.addEventListener('click', () => { del.hidden = true; confirmBox.hidden = false; li.querySelector('.pr-confirm-no').focus(); });
    li.querySelector('.pr-confirm-no').addEventListener('click', () => { confirmBox.hidden = true; del.hidden = false; del.focus(); });
    li.querySelector('.pr-confirm-yes').addEventListener('click', async () => {
      await TNDB.remove(EVIDENCE, entry.id).catch(() => {});
      lockerData = lockerData.filter(item => item.id !== entry.id);
      renderTimeline();
      updateSummary();
    });

    list.appendChild(li);
  });

  timeline.innerHTML = '';
  timeline.appendChild(list);
  const fresh = list.querySelector('.pr-new');
  if (fresh) fresh.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateSummary() {
  const count = lockerData.length;
  document.getElementById('pr-summary-count').textContent = count;
  const rangeEl = document.getElementById('pr-summary-range');
  const disputedEl = document.getElementById('pr-summary-disputed');

  if (count === 0) {
    rangeEl.textContent = '—';
    disputedEl.textContent = '₹0';
    return;
  }

  const dates = lockerData.map(e => e.date).sort();
  const first = fmtDate(dates[0], { day: 'numeric', month: 'short', year: '2-digit' });
  const last = fmtDate(dates[dates.length - 1], { day: 'numeric', month: 'short', year: '2-digit' });
  rangeEl.textContent = first === last ? first : `${first} – ${last}`;

  const disputed = lockerData
    .filter(e => e.amount !== null && e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  disputedEl.textContent = rupees(disputed);
}

async function loadSampleData() {
  const btn = document.getElementById('pr-load-sample');
  btn.disabled = true;
  // Samples keep fixed ids, so loading them twice never creates duplicates
  for (const s of PR_SAMPLE_LOCKER) await TNDB.update(EVIDENCE, s.id, s).catch(() => {});
  await loadLockerFromStorage();
  btn.disabled = false;
  renderTimeline();
  updateSummary();
}

function exportLocker() {
  if (lockerData.length === 0) return;
  const sorted = [...lockerData].sort((a, b) => a.date.localeCompare(b.date));
  const user = window.TrustNestUser ? window.TrustNestUser() : null;
  const disputed = sorted.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  const rows = sorted.map(entry => `
    <div class="entry">
      <div class="entry-date">${fmtDate(entry.date, { day: 'numeric', month: 'long', year: 'numeric' })}<span class="entry-category">${esc(entry.category)}</span></div>
      <div class="entry-title">${esc(entry.title)}</div>
      ${entry.note ? `<div class="entry-note">${esc(entry.note)}</div>` : ''}
      ${entry.amount !== null && entry.amount !== undefined ? `<div class="entry-amount ${entry.amount < 0 ? 'negative' : 'positive'}">${entry.amount < 0 ? 'Disputed: ' : 'Paid: '}${rupees(entry.amount)}</div>` : ''}
      ${(entry.photos || []).length ? `<div class="entry-photos">${entry.photos.map(p => `<img src="${esc(p)}" alt="">`).join('')}</div>` : ''}
    </div>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Evidence record${user ? ' – ' + esc(user.name) : ''}</title>
    <base href="${esc(location.href)}">
    <style>
      body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #222; }
      h1 { font-size: 26px; margin: 0 0 6px; color: #16261D; }
      .meta { color: #555; margin-bottom: 28px; font-size: 14px; line-height: 1.6; }
      .entry { padding: 16px 0; border-top: 1px solid #ddd; page-break-inside: avoid; }
      .entry-date { font-weight: bold; color: #1E3A2C; }
      .entry-category { display: inline-block; padding: 2px 8px; background: #E6EDE7; border-radius: 4px; font-size: 12px; margin-left: 8px; font-weight: normal; }
      .entry-title { font-size: 18px; margin: 6px 0; }
      .entry-note { color: #333; line-height: 1.6; }
      .entry-amount { font-weight: bold; margin-top: 6px; }
      .negative { color: #C0392B; } .positive { color: #2E7D4F; }
      .entry-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .entry-photos img { width: 180px; height: 130px; object-fit: cover; border-radius: 6px; }
    </style></head><body>
    <h1>Tenancy evidence record</h1>
    <div class="meta">${user ? `Tenant: ${esc(user.name)} (${esc(user.email)})<br>` : ''}${sorted.length} entries from ${fmtDate(sorted[0].date, { day: 'numeric', month: 'long', year: 'numeric' })} to ${fmtDate(sorted[sorted.length - 1].date, { day: 'numeric', month: 'long', year: 'numeric' })}${disputed ? `<br>Total amount disputed: ${rupees(disputed)}` : ''}<br>Exported from TrustNest on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    ${rows}
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    setFormMessage('pr-locker-msg', 'Your browser blocked the export window. Allow pop-ups for this page and try again.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function loadLockerFromStorage() {
  lockerData = await TNDB.list(EVIDENCE).catch(() => []);
}

// ========================================
// PHOTO LIGHTBOX
// ========================================
let lb = { photos: [], i: 0 };
function initLightbox() {
  const dlg = document.getElementById('pr-lightbox');
  dlg.querySelector('.pr-lb-close').addEventListener('click', () => dlg.close());
  dlg.querySelector('.pr-lb-prev').addEventListener('click', () => showLightbox(lb.i - 1));
  dlg.querySelector('.pr-lb-next').addEventListener('click', () => showLightbox(lb.i + 1));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') showLightbox(lb.i - 1);
    if (e.key === 'ArrowRight') showLightbox(lb.i + 1);
  });
}
function openLightbox(photos, i) {
  lb.photos = photos;
  showLightbox(i);
  document.getElementById('pr-lightbox').showModal();
}
function showLightbox(i) {
  const n = lb.photos.length;
  lb.i = (i + n) % n;
  const dlg = document.getElementById('pr-lightbox');
  dlg.querySelector('img').src = lb.photos[lb.i];
  dlg.querySelector('.pr-lb-count').textContent = n > 1 ? `${lb.i + 1} of ${n}` : '';
  dlg.querySelector('.pr-lb-prev').hidden = dlg.querySelector('.pr-lb-next').hidden = n < 2;
}

// ========================================
// COMPLAINT LETTER + TRACKER
// ========================================
let complaints = [];
const ISSUE = {
  deposit: {
    subject: 'Refund of security deposit',
    body: (d) => `I vacated the property on ${d.since} and handed over the keys. ${d.amount ? `My security deposit of ${d.amount} has` : 'My security deposit has'} not been returned to me so far.`
  },
  repairs: {
    subject: 'Repairs not carried out',
    body: (d) => `On ${d.since}, I informed you about a problem at the property that needs repair. It has still not been fixed, even though maintaining the property in a livable condition is the landlord's responsibility.`
  },
  deductions: {
    subject: 'Unfair deductions from my security deposit',
    body: (d) => `On ${d.since}, ${d.amount ? `${d.amount} was deducted` : 'money was deducted'} from my security deposit without a valid reason or any bill for repairs. Normal wear and tear cannot be charged to the tenant.`
  },
  harassment: {
    subject: 'Entry without notice and harassment',
    body: (d) => `Since ${d.since}, you have entered the property without giving me prior notice and have behaved in a way that disturbs my peaceful stay. As a tenant, I am entitled to reasonable notice before any visit.`
  }
};

function initComplaint() {
  const form = document.getElementById('pr-complaint-form');
  form.addEventListener('submit', e => { e.preventDefault(); generateLetter(); });
  form.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));
  document.getElementById('pr-copy-letter').addEventListener('click', copyLetter);
  document.getElementById('pr-print-letter').addEventListener('click', () => window.print());
  document.getElementById('pr-c-issue-date').max = todayISO();

  const user = window.TrustNestUser ? window.TrustNestUser() : null;
  if (user) document.getElementById('pr-c-your-name').value = user.name;

  const list = document.getElementById('pr-escalation-list');
  PR_ESCALATION_INFO.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
}

function updateEvidenceHint() {
  const el = document.getElementById('pr-evidence-hint');
  el.textContent = lockerData.length
    ? `${lockerData.length} entries from your evidence locker will be listed in the letter.`
    : 'Tip: add entries to your evidence locker first. They get listed in the letter as proof.';
}

async function generateLetter() {
  const v = id => document.getElementById(id).value.trim();
  const required = ['pr-c-your-name', 'pr-c-landlord-name', 'pr-c-address', 'pr-c-issue', 'pr-c-issue-date', 'pr-c-what-you-want'];
  const missing = required.filter(id => !v(id));
  required.forEach(id => document.getElementById(id).toggleAttribute('aria-invalid', missing.includes(id)));
  if (missing.length) {
    document.getElementById(missing[0]).focus();
    return setFormMessage('pr-complaint-msg', 'Fill in the highlighted fields to write your letter.');
  }
  setFormMessage('pr-complaint-msg', '');

  const yourName = v('pr-c-your-name');
  const landlordName = v('pr-c-landlord-name');
  const address = v('pr-c-address');
  const issue = v('pr-c-issue');
  const amountNum = parseFloat(v('pr-c-amount'));
  const days = Math.max(1, parseInt(v('pr-c-deadline'), 10) || 7);
  const want = v('pr-c-what-you-want').replace(/[.\s]+$/, '');

  const long = { day: 'numeric', month: 'long', year: 'numeric' };
  const today = new Date().toLocaleDateString('en-IN', long);
  const deadline = new Date(); deadline.setDate(deadline.getDate() + days);
  const deadlineText = deadline.toLocaleDateString('en-IN', long);
  const d = { since: fmtDate(v('pr-c-issue-date'), long), amount: amountNum > 0 ? rupees(amountNum) : '' };

  const evidence = [...lockerData].sort((a, b) => a.date.localeCompare(b.date));
  const shown = evidence.slice(0, 8);
  const evidenceHtml = evidence.length
    ? `<p>I have kept a dated record of this tenancy, including:</p>
       <ul>${shown.map(e => `<li>${fmtDate(e.date)}: ${esc(e.title)}${(e.photos || []).length ? ` (${e.photos.length} photo${e.photos.length > 1 ? 's' : ''})` : ''}</li>`).join('')}</ul>
       ${evidence.length > shown.length ? `<p>…and ${evidence.length - shown.length} more entries, available on request.</p>` : ''}`
    : '';

  const letter = `
    <p class="pr-l-right">${today}</p>
    <p>To,<br>${esc(landlordName)}<br>${esc(address)}</p>
    <p><strong>Subject: ${ISSUE[issue].subject}</strong></p>
    <p>Dear ${esc(landlordName)},</p>
    <p>I am a tenant at ${esc(address)}. ${esc(ISSUE[issue].body(d))}</p>
    ${evidenceHtml}
    <p>I request you to ${esc(want.charAt(0).toLowerCase() + want.slice(1))} within ${days} days of this letter, that is by <strong>${deadlineText}</strong>. If this is not resolved by then, I will have to approach the appropriate authority${issue === 'deposit' || issue === 'deductions' ? ', such as the Rent Authority or the civil court,' : ''} for a remedy.</p>
    <p>I hope we can settle this without any further action.</p>
    <p>Yours sincerely,<br>${esc(yourName)}</p>`;

  document.getElementById('pr-letter-doc').innerHTML = letter;
  document.getElementById('pr-letter-empty').hidden = true;
  document.getElementById('pr-letter-content').hidden = false;

  try {
    const saved = await TNDB.add(COMPLAINTS, {
      subject: ISSUE[issue].subject,
      landlord: landlordName,
      amount: amountNum > 0 ? amountNum : null,
      deadline: deadlineText,
      history: [{ status: 'Letter written', date: todayISO() }]
    });
    complaints.unshift(saved);
    renderTracker();
  } catch (e) { /* the letter still works without the tracker */ }

  document.getElementById('pr-letter-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const STATUSES = ['Letter written', 'Sent', 'Reminder sent', 'Escalated', 'Resolved'];

async function loadComplaints() {
  complaints = (await TNDB.list(COMPLAINTS).catch(() => [])).reverse(); // newest first
}

function renderTracker() {
  const card = document.getElementById('pr-tracker-card');
  const list = document.getElementById('pr-complaint-list');
  card.hidden = complaints.length === 0;
  list.innerHTML = '';

  complaints.forEach(c => {
    const current = c.history[c.history.length - 1].status;
    const idx = STATUSES.indexOf(current);
    const next = STATUSES[idx + 1];
    const item = document.createElement('div');
    item.className = 'pr-complaint-item' + (current === 'Resolved' ? ' pr-resolved' : '');
    item.innerHTML = `
      <div class="pr-complaint-header">
        <div class="pr-complaint-title">${esc(c.subject)}${c.amount ? ` · ${rupees(c.amount)}` : ''}</div>
        <span class="pr-complaint-status">${esc(current)}</span>
      </div>
      <div class="pr-complaint-details">To ${esc(c.landlord)} · Reply due by ${esc(c.deadline)}</div>
      <ol class="pr-steps">${STATUSES.map((s, i) => {
        const h = c.history.find(x => x.status === s);
        return `<li class="${i <= idx ? 'done' : ''}"><span>${s}</span>${h ? `<small>${fmtDate(h.date, { day: 'numeric', month: 'short' })}</small>` : ''}</li>`;
      }).join('')}</ol>
      <div class="pr-complaint-actions">
        ${next ? `<button type="button" class="btn btn-outline pr-advance">Mark as ${next.toLowerCase()}</button>` : ''}
        <button type="button" class="pr-remove">Remove</button>
      </div>`;
    const adv = item.querySelector('.pr-advance');
    if (adv) adv.addEventListener('click', async () => {
      c.history.push({ status: next, date: todayISO() });
      await TNDB.update(COMPLAINTS, c.id, { history: c.history }).catch(() => {});
      renderTracker();
    });
    item.querySelector('.pr-remove').addEventListener('click', async () => {
      await TNDB.remove(COMPLAINTS, c.id).catch(() => {});
      complaints = complaints.filter(x => x.id !== c.id);
      renderTracker();
    });
    list.appendChild(item);
  });
}

function copyLetter() {
  const text = document.getElementById('pr-letter-doc').innerText;
  const btn = document.getElementById('pr-copy-letter');
  navigator.clipboard.writeText(text)
    .then(() => { btn.textContent = 'Copied'; })
    .catch(() => { btn.textContent = 'Select the text to copy'; })
    .finally(() => setTimeout(() => (btn.textContent = 'Copy letter'), 2000));
}
